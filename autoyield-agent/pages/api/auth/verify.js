/**
 * POST /api/auth/verify
 * Body: { address, signature }
 * Returns: { token, user } — token is a Bearer session token
 */
import { verifyAndLogin } from '../../../lib/auth.js';
import { getAgentWallet } from '../../../lib/db.js';
import { createUserWallet } from '../../../lib/userWallet.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { address, signature } = req.body;
  if (!address || !signature) {
    return res.status(400).json({ error: 'address and signature are required' });
  }
  try {
    const { token, user } = await verifyAndLogin(address, signature);

    // Auto-create agent wallet on first login
    let wallet = getAgentWallet(user.id);
    if (!wallet) {
      wallet = createUserWallet(user.id);
    }

    res.status(200).json({
      token,
      user: { id: user.id, address: user.address },
      agentWallet: wallet.address,
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}
