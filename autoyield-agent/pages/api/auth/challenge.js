/**
 * POST /api/auth/challenge
 * Body: { address: "0x..." }
 * Returns: { nonce, message } — message is what the user should sign
 */
import { createChallenge } from '../../../lib/auth.js';
import { ethers } from 'ethers';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { address } = req.body;
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }
  try {
    const challenge = createChallenge(address);
    res.status(200).json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
