import { getAllUsers, getAgentWallet, getUserState } from '../../../lib/db.js';

/**
 * GET /api/admin/agents
 * Returns all registered users with their agent wallets and current state.
 * Admin-only endpoint (no per-user auth required — same access level as /admin page).
 */
export default function handler(req, res) {
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
