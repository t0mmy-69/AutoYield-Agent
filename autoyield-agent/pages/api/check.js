import { fetchAllAPRs } from '../../lib/aprFetcher.js';
import { startScheduler } from '../../lib/scheduler.js';
import { appendSnapshot, getHistory } from '../../lib/aprHistory.js';
import { runDecisionEngine } from '../../lib/decisionEngine.js';
import { estimateGasCostUsd } from '../../lib/gasEstimator.js';
import { getSigner, getUsdcBalance } from '../../lib/agentWallet.js';
import { getUserSigner, getUserUsdcBalance } from '../../lib/userWallet.js';
import { getSessionFromRequest } from '../../lib/auth.js';
import { getAgentWallet } from '../../lib/db.js';
import { readStateForUser, writeStateForUser } from './state.js';
import { readRulesForUser } from './rules.js';
import { sendApprovalMessage } from '../../lib/telegramBot.js';

// Simple in-memory rate limiter: 1 manual check per user/IP per 60 seconds
const rateLimitMap = new Map(); // key → lastCalledMs
const RATE_LIMIT_MS = 60 * 1000;

function isRateLimited(key) {
  const last = rateLimitMap.get(key);
  if (last && Date.now() - last < RATE_LIMIT_MS) return true;
  rateLimitMap.set(key, Date.now());
  return false;
}

// Ensure the background scheduler is running (idempotent — safe to call on every request)
startScheduler();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const session = getSessionFromRequest(req);
    const userId = session?.userId ?? null;

    // Rate limit by userId (authenticated) or IP (unauthenticated)
    const rlKey = userId != null ? `user:${userId}` : `ip:${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`;
    if (isRateLimited(rlKey)) {
      return res.status(429).json({ error: 'Too many requests. Please wait 60 seconds between manual checks.' });
    }

    // Get signer + balance (per-user or global)
    let signer, usdcBalance, agentAddress;
    if (userId != null) {
      signer = getUserSigner(userId);
      agentAddress = await signer.getAddress();
      usdcBalance = await getUserUsdcBalance(userId);
    } else {
      signer = getSigner();
      agentAddress = await signer.getAddress();
      usdcBalance = await getUsdcBalance(agentAddress);
    }

    const aprSnapshot = await fetchAllAPRs();
    const history = appendSnapshot(aprSnapshot);
    const state = readStateForUser(userId);
    const rules = readRulesForUser(userId);
    const gasCostUsd = await estimateGasCostUsd();

    const stateWithBalance = { ...state, userBalance: usdcBalance };
    const decision = runDecisionEngine({ state: stateWithBalance, aprSnapshot, history, rules, gasCostUsd });

    if (decision.action === 'ROTATE') {
      // Add expiry for Telegram security (30 min window)
      const decisionWithExpiry = { ...decision, expiresAt: Date.now() + 30 * 60 * 1000, userId };
      writeStateForUser(userId, { ...state, pendingApproval: decisionWithExpiry });

      if (rules.executionMode === 'telegram_approval') {
        await sendApprovalMessage(decisionWithExpiry);
      }

      if (rules.executionMode === 'auto') {
        const { executeApproval } = await import('./approve.js');
        await executeApproval(decisionWithExpiry, state, usdcBalance, signer, userId);
        // chainId resolved inside executeApproval via getAgentWallet(userId)
      }
    }

    res.status(200).json({ decision, aprSnapshot, usdcBalance, gasCostUsd, userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
