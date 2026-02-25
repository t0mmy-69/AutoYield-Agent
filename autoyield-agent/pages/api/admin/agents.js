import { getAllUsers, getAgentWallet, getUserState } from '../../../lib/db.js';
import { withAdminAuth } from '../../../lib/auth.js';

/**
 * GET /api/admin/agents
 * Returns all registered users with their agent wallets and current state.
 * Protected by ADMIN_SECRET (x-admin-secret header or __admin cookie).
 */
function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const users = getAllUsers();
    const agents = users.map(user => {
      const wallet = getAgentWallet(user.id);
      const state = getUserState(user.id);
      return {
        userId: user.id,
        userAddress: user.address,
        createdAt: user.created_at,
        agentAddress: wallet?.address ?? null,
        chainId: wallet?.chain_id ?? null,
        currentProtocol: state?.currentProtocol ?? null,
        lastMoveTimestamp: state?.lastMoveTimestamp ?? null,
        hasPendingApproval: !!state?.pendingApproval,
      };
    });
    res.status(200).json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export default withAdminAuth(handler);
