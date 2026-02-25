/**
 * Background scheduler — runs /api/check for every registered user every N minutes.
 * Uses a singleton pattern so it starts once and persists across hot-reloads in dev.
 *
 * To start: import and call startScheduler() from _app.js or any API route.
 * The scheduler respects per-user rules.cooldownMinutes and uses scheduler_lock
 * to prevent overlapping runs for the same user.
 */
import { getAllUsers, getAgentWallet } from './db.js';
import { acquireSchedulerLock, releaseSchedulerLock } from './db.js';
import { fetchAllAPRs } from './aprFetcher.js';
import { appendSnapshot } from './aprHistory.js';
import { runDecisionEngine } from './decisionEngine.js';
import { estimateGasCostUsd } from './gasEstimator.js';
import { getUserSigner, getUserUsdcBalance } from './userWallet.js';
import { readRulesForUser } from '../pages/api/rules.js';
import { readStateForUser, writeStateForUser } from '../pages/api/state.js';
import { appendHistoryForUser } from '../pages/api/history.js';
import { sendApprovalMessage } from './telegramBot.js';
import { executeRotation } from './executor.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

// Use globals to survive Next.js hot module replacement
const globalKey = '__autoyield_scheduler__';
const statsKey = '__autoyield_scheduler_stats__';

export function startScheduler() {
  if (global[globalKey]) return; // already running
  global[globalKey] = true;
  global[statsKey] = { startedAt: Date.now(), lastRunAt: null, lastRunUsers: 0, totalRuns: 0 };
  console.log('[Scheduler] Started — checking all users every 5 minutes');
  setInterval(runAllUsers, CHECK_INTERVAL_MS);
}

export function getSchedulerStats() {
  return global[statsKey] ?? null;
}

export async function runAllUsers() {
  const users = getAllUsers();
  if (users.length === 0) return;

  const stats = global[statsKey];
  if (stats) {
    stats.lastRunAt = Date.now();
    stats.lastRunUsers = users.length;
    stats.totalRuns += 1;
  }

  // Fetch APRs and gas cost ONCE per cycle — shared across all users.
  // Avoids N redundant RPC + gas API calls when N users are registered.
  let aprSnapshot, history, gasCostUsd;
  try {
    [aprSnapshot, gasCostUsd] = await Promise.all([fetchAllAPRs(), estimateGasCostUsd()]);
    history = appendSnapshot(aprSnapshot);
  } catch (err) {
    console.error('[Scheduler] APR/gas fetch failed:', err.message);
    return;
  }

  for (const user of users) {
    runCheckForUser(user.id, aprSnapshot, history, gasCostUsd).catch(err =>
      console.error(`[Scheduler] user ${user.id} error:`, err.message)
    );
  }
}

/**
 * Run a decision check for a single user.
 * aprSnapshot / history / gasCostUsd can be pre-fetched (from runAllUsers)
 * or left undefined (fetched fresh when called standalone, e.g. tests).
 */
export async function runCheckForUser(userId, aprSnapshot, history, gasCostUsd) {
  // Prevent overlapping runs for same user (lock TTL = 4 min)
  if (!acquireSchedulerLock(userId)) {
    console.log(`[Scheduler] user ${userId} — lock held, skipping`);
    return { skipped: true, reason: 'lock_held' };
  }

  try {
    let signer;
    try {
      signer = getUserSigner(userId);
    } catch {
      return { skipped: true, reason: 'no_wallet' };
    }

    // Fetch fresh if not provided (standalone / direct call)
    if (!aprSnapshot) {
      [aprSnapshot, gasCostUsd] = await Promise.all([fetchAllAPRs(), estimateGasCostUsd()]);
      history = appendSnapshot(aprSnapshot);
    }

    const usdcBalance = await getUserUsdcBalance(userId);
    let state = readStateForUser(userId);
    const rules = readRulesForUser(userId);

    // Clear stale pending approval so it doesn't block new decisions indefinitely
    if (state.pendingApproval?.expiresAt && Date.now() > state.pendingApproval.expiresAt) {
      state = { ...state, pendingApproval: null };
      writeStateForUser(userId, state);
    }

    const stateWithBalance = { ...state, userBalance: usdcBalance };
    const decision = runDecisionEngine({ state: stateWithBalance, aprSnapshot, history, rules, gasCostUsd });

    if (decision.action !== 'ROTATE') {
      return { userId, decision };
    }

    // Don't overwrite a pending approval the user hasn't acted on yet
    if (state.pendingApproval?.expiresAt && Date.now() < state.pendingApproval.expiresAt) {
      return { userId, decision, pendingApproval: true, skipped: 'existing_pending' };
    }

    const decisionWithExpiry = { ...decision, expiresAt: Date.now() + 30 * 60 * 1000, userId };
    writeStateForUser(userId, { ...state, pendingApproval: decisionWithExpiry });

    if (rules.executionMode === 'auto') {
      // Pass chain-specific USDC address via chainId
      const wallet = getAgentWallet(userId);
      const chainId = wallet?.chain_id || 'sepolia';
      const result = await executeRotation({ from: decision.from, to: decision.to, signer, chainId });
      const historyEntry = {
        ...decision,
        action: 'ROTATE',
        executedAt: Date.now(),
        ...result,
      };
      appendHistoryForUser(userId, historyEntry);
      writeStateForUser(userId, {
        ...state,
        currentProtocol: decision.to,
        lastMoveTimestamp: Date.now(),
        pendingApproval: null,
      });
      return { userId, decision, executed: true, txHash: result.txHash };
    }

    // telegram_approval — send notification
    if (rules.executionMode === 'telegram_approval') {
      await sendApprovalMessage(decisionWithExpiry);
    }

    return { userId, decision, pendingApproval: true };
  } finally {
    releaseSchedulerLock(userId);
  }
}
