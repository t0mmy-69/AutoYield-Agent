import { getSigner, getUsdcBalance } from '../../lib/agentWallet.js';
import { getUserSigner, getUserUsdcBalance } from '../../lib/userWallet.js';
import { getSessionFromRequest } from '../../lib/auth.js';
import { executeRotation } from '../../lib/executor.js';
import { getAgentWallet } from '../../lib/db.js';
import { readStateForUser, writeStateForUser } from './state.js';
import { appendHistoryForUser } from './history.js';

export async function executeApproval(decision, state, usdcBalance, signer, userId = null) {
  const wallet = userId != null ? getAgentWallet(userId) : null;
  const chainId = wallet?.chain_id || 'sepolia';
  const result = await executeRotation({ from: decision.from, to: decision.to, signer, chainId });

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
  appendHistoryForUser(userId, historyEntry);

  writeStateForUser(userId, {
    ...state,
    currentProtocol: decision.to,
    lastMoveTimestamp: Date.now(),
    pendingApproval: null,
  });

  return { success: true, txHash: result.txHash, historyEntry };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = getSessionFromRequest(req);
  const userId = session?.userId ?? null;

  const { approved } = req.body;
  const state = readStateForUser(userId);

  if (!state.pendingApproval) {
    return res.status(400).json({ error: 'No pending approval' });
  }

  const decision = state.pendingApproval;

  // Security: check expiry
  if (decision.expiresAt && Date.now() > decision.expiresAt) {
    appendHistoryForUser(userId, { ...decision, action: 'NOOP', reason: 'Approval window expired.', executedAt: Date.now() });
    writeStateForUser(userId, { ...state, pendingApproval: null });
    return res.status(400).json({ error: 'Approval window has expired. Run /api/check again.' });
  }

  if (!approved) {
    appendHistoryForUser(userId, { ...decision, action: 'NOOP', reason: 'User rejected rotation.', executedAt: Date.now() });
    writeStateForUser(userId, { ...state, pendingApproval: null });
    return res.status(200).json({ success: true, action: 'rejected' });
  }

  try {
    let signer;
    if (userId != null) {
      signer = getUserSigner(userId);
    } else {
      signer = getSigner();
    }
    const usdcBalance = userId != null
      ? await getUserUsdcBalance(userId)
      : await getUsdcBalance(await signer.getAddress());

    const result = await executeApproval(decision, state, usdcBalance, signer, userId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
