import fs from 'fs';
import path from 'path';
import { getSessionFromRequest } from '../../lib/auth.js';
import { getUserState, setUserState, getAgentWallet } from '../../lib/db.js';
import { getUserUsdcBalance } from '../../lib/userWallet.js';
import { getSigner, getUsdcBalance } from '../../lib/agentWallet.js';
import { DATA_DIR } from '../../lib/dataPath.js';

const STATE_FILE = path.join(DATA_DIR, 'state.json');

// ─── Global (admin/legacy) helpers ────────────────────────────────────────────

export function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { currentProtocol: 'aave', lastMoveTimestamp: null, pendingApproval: null };
  }
}

export function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Per-user helpers (used by check.js / approve.js) ─────────────────────────

export function readStateForUser(userId) {
  if (userId == null) return readState();
  return getUserState(userId);
}

export function writeStateForUser(userId, state) {
  if (userId == null) return writeState(state);
  setUserState(userId, state);
}

// ─── API handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const session = getSessionFromRequest(req);

    if (session) {
      // Per-user state from DB
      const { userId } = session;
      const state = getUserState(userId);
      const wallet = getAgentWallet(userId);
      const agentAddress = wallet?.address ?? null;
      let usdcBalance = 0;
      if (agentAddress) {
        try { usdcBalance = await getUserUsdcBalance(userId); } catch { /* RPC not configured */ }
      }
      return res.status(200).json({ ...state, agentAddress, usdcBalance, userId });
    }

    // Legacy global state (admin / single-user mode)
    const state = readState();
    let agentAddress = null;
    let usdcBalance = 0;
    if (process.env.AGENT_PRIVATE_KEY) {
      try {
        const signer = getSigner();
        agentAddress = await signer.getAddress();
        usdcBalance = await getUsdcBalance(agentAddress);
      } catch { /* RPC or key misconfigured */ }
    }
    res.status(200).json({ ...state, agentAddress, usdcBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
