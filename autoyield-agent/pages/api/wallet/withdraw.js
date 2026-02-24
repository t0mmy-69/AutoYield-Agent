/**
 * POST /api/wallet/withdraw
 * Withdraw USDC from agent wallet to user's main wallet.
 * Body: { amount: string }
 */
import { withAuth } from '../../../lib/auth.js';
import { getUserSigner } from '../../../lib/userWallet.js';
import { getAgentWallet, getUserById } from '../../../lib/db.js';
import { CHAINS } from '../../../lib/chains/configs.js';
import { getCredential } from '../../../lib/credentials.js';
import { ethers } from 'ethers';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = req.session;
  const { amount } = req.body || {};

  const parsed = parseFloat(amount);
  if (!amount || isNaN(parsed) || parsed <= 0) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }

  const user = getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const wallet = getAgentWallet(userId);
  if (!wallet) return res.status(400).json({ error: 'No agent wallet found.' });

  const chainId = wallet.chain_id || 'sepolia';
  const chain = CHAINS[chainId];

  const usdcAddress = chain ? getCredential(chain.usdcEnvVar) : getCredential('USDC_ADDRESS');
  if (!usdcAddress) return res.status(400).json({ error: 'USDC address not configured for this chain.' });

  let signer;
  try {
    signer = getUserSigner(userId, chainId);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);

  let decimals;
  try {
    decimals = await usdc.decimals();
  } catch {
    decimals = 6n;
  }

  const amountWei = ethers.parseUnits(parsed.toString(), decimals);

  const balance = await usdc.balanceOf(wallet.address);
  if (balance < amountWei) {
    return res.status(400).json({ error: `Insufficient USDC balance. Agent has ${ethers.formatUnits(balance, decimals)} USDC.` });
  }

  try {
    const tx = await usdc.transfer(user.address, amountWei);
    const receipt = await tx.wait();
    return res.status(200).json({ success: true, txHash: receipt.hash, to: user.address, amount: parsed });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Transaction failed.' });
  }
});
