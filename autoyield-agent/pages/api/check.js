import { fetchAllAPRs } from '../../lib/aprFetcher.js';
import { appendSnapshot, getHistory } from '../../lib/aprHistory.js';
import { runDecisionEngine } from '../../lib/decisionEngine.js';
import { estimateGasCostUsd } from '../../lib/gasEstimator.js';
import { getSigner, getUsdcBalance } from '../../lib/agentWallet.js';
import { getUserSigner, getUserUsdcBalance } from '../../lib/userWallet.js';
import { getSessionFromRequest } from '../../lib/auth.js';
import { readStateForUser, writeStateForUser } from './state.js';
import { readRulesForUser } from './rules.js';
import { sendApprovalMessage } from '../../lib/telegramBot.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const session = getSessionFromRequest(req);
    const userId = session?.userId ?? null;

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
      }
    }

    res.status(200).json({ decision, aprSnapshot, usdcBalance, gasCostUsd, userId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
