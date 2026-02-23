import { fetchAllAPRs } from '../../lib/aprFetcher.js';
import { appendSnapshot, getHistory } from '../../lib/aprHistory.js';
import { runDecisionEngine } from '../../lib/decisionEngine.js';
import { estimateGasCostUsd } from '../../lib/gasEstimator.js';
import { getSigner, getUsdcBalance } from '../../lib/agentWallet.js';
import { readState, writeState } from './state.js';
import { readRules } from './rules.js';
import { sendApprovalMessage } from '../../lib/telegramBot.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const signer = getSigner();
    const agentAddress = await signer.getAddress();
    const usdcBalance = await getUsdcBalance(agentAddress);

    const aprSnapshot = await fetchAllAPRs();
    const history = appendSnapshot(aprSnapshot);
    const state = readState();
    const rules = readRules();
    const gasCostUsd = await estimateGasCostUsd();

    const stateWithBalance = { ...state, userBalance: usdcBalance };
    const decision = runDecisionEngine({ state: stateWithBalance, aprSnapshot, history, rules, gasCostUsd });

    if (decision.action === 'ROTATE') {
      writeState({ ...state, pendingApproval: decision });

      if (rules.executionMode === 'telegram_approval') {
        await sendApprovalMessage(decision);
      }

      if (rules.executionMode === 'auto') {
        const { executeApproval } = await import('./approve.js');
        await executeApproval(decision, state, usdcBalance, signer);
      }
    }

    res.status(200).json({ decision, aprSnapshot, usdcBalance, gasCostUsd });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
