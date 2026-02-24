/**
 * GET /api/auth/me
 * Returns current user info + agent wallet address.
 */
import { withAuth } from '../../../lib/auth.js';
import { getUserById, getAgentWallet } from '../../../lib/db.js';
import { getUserUsdcBalance } from '../../../lib/userWallet.js';

export default withAuth(async function handler(req, res) {
  const { userId } = req.session;
  const user = getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const wallet = getAgentWallet(userId);
  let usdcBalance = 0;
  if (wallet) {
    try {
      usdcBalance = await getUserUsdcBalance(userId);
    } catch { /* ignore if RPC not configured yet */ }
  }

  res.status(200).json({
    id: user.id,
    address: user.address,
    agentWallet: wallet?.address ?? null,
    usdcBalance,
  });
});
