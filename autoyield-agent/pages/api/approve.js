import { getSigner, getUsdcBalance } from '../../lib/agentWallet.js';
import { executeRotation } from '../../lib/executor.js';
import { readState, writeState } from './state.js';
import { appendHistory } from './history.js';

export async function executeApproval(decision, state, usdcBalance, signer) {
  const result = await executeRotation({ from: decision.from, to: decision.to, signer });

  const historyEntry = {
    ...decision,
    action: 'ROTATE',
    executedAt: Date.now(),
    txHash: result.txHash,
    withdrawTxHash: result.withdrawTxHash,
    supplyTxHash: result.supplyTxHash,
    amountUsdc: result.amountUsdc,
    blockNumber: result.blockNumber,
  };
  appendHistory(historyEntry);

  writeState({
    ...state,
    currentProtocol: decision.to,
    lastMoveTimestamp: Date.now(),
    pendingApproval: null,
  });

  return { success: true, txHash: result.txHash, historyEntry };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { approved } = req.body;
  const state = readState();

  if (!state.pendingApproval) {
    return res.status(400).json({ error: 'No pending approval' });
  }

  const decision = state.pendingApproval;

  if (!approved) {
    // Rejected — log NOOP to history, clear pending
    appendHistory({ ...decision, action: 'NOOP', reason: 'User rejected rotation.', executedAt: Date.now() });
    writeState({ ...state, pendingApproval: null });
    return res.status(200).json({ success: true, action: 'rejected' });
  }

  try {
    const signer = getSigner();
    const usdcBalance = await getUsdcBalance(await signer.getAddress());
    const result = await executeApproval(decision, state, usdcBalance, signer);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
