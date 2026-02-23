import { getSigner, getUsdcBalance } from '../../lib/agentWallet.js';
import { executeApproval } from './approve.js';
import { readState } from './state.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const state = readState();

  if (!state.pendingApproval) {
    return res.status(400).json({ error: 'No pending approval to execute' });
  }

  try {
    const signer = getSigner();
    const usdcBalance = await getUsdcBalance(await signer.getAddress());
    const result = await executeApproval(state.pendingApproval, state, usdcBalance, signer);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
