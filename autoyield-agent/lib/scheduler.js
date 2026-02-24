/**
 * Background scheduler — runs /api/check for every registered user every N minutes.
 * Uses a singleton pattern so it starts once and persists across hot-reloads in dev.
 *
 * To start: import and call startScheduler() from _app.js or any API route.
 * The scheduler respects per-user rules.cooldownMinutes and uses scheduler_lock
 * to prevent overlapping runs for the same user.
 */
import { getAllUsers } from './db.js';
import { acquireSchedulerLock, releaseSchedulerLock } from './db.js';
import { fetchAllAPRs } from './aprFetcher.js';
import { appendSnapshot, getHistory } from './aprHistory.js';
import { runDecisionEngine } from './decisionEngine.js';
import { estimateGasCostUsd } from './gasEstimator.js';
import { getUserSigner, getUserUsdcBalance } from './userWallet.js';
import { readRulesForUser } from '../pages/api/rules.js';
import { readStateForUser, writeStateForUser } from '../pages/api/state.js';
import { appendHistoryForUser } from '../pages/api/history.js';
import { sendApprovalMessage } from './telegramBot.js';
import { executeRotation } from './executor.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

// Use global to survive Next.js hot module replacement
const globalKey = '__autoyield_scheduler__';

export function startScheduler() {
  if (global[globalKey]) return; // already running
  global[globalKey] = true;
  console.log('[Scheduler] Started — checking all users every 5 minutes');
  setInterval(runAllUsers, CHECK_INTERVAL_MS);
}

export async function runAllUsers() {
  const users = getAllUsers();
  for (const user of users) {
    runCheckForUser(user.id).catch(err =>
      console.error(`[Scheduler] user ${user.id} error:`, err.message)
    );
  }
}

export async function runCheckForUser(userId) {
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

    const usdcBalance = await getUserUsdcBalance(userId);
    const aprSnapshot = await fetchAllAPRs();
    const history = appendSnapshot(aprSnapshot);
    const state = readStateForUser(userId);
    const rules = readRulesForUser(userId);
    const gasCostUsd = await estimateGasCostUsd();

    const stateWithBalance = { ...state, userBalance: usdcBalance };
    const decision = runDecisionEngine({ state: stateWithBalance, aprSnapshot, history, rules, gasCostUsd });

    if (decision.action !== 'ROTATE') {
      return { userId, decision };
    }

    const decisionWithExpiry = { ...decision, expiresAt: Date.now() + 30 * 60 * 1000, userId };
    writeStateForUser(userId, { ...state, pendingApproval: decisionWithExpiry });

    if (rules.executionMode === 'auto') {
      const result = await executeRotation({ from: decision.from, to: decision.to, signer });
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
