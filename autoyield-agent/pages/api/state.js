import fs from 'fs';
import path from 'path';
import { getSigner, getUsdcBalance } from '../../lib/agentWallet.js';

const STATE_FILE = path.join(process.cwd(), 'data', 'state.json');

export function readState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

export function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const state = readState();
    const signer = getSigner();
    const agentAddress = await signer.getAddress();
    const usdcBalance = await getUsdcBalance(agentAddress);
    res.status(200).json({ ...state, agentAddress, usdcBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
