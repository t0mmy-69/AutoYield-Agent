/**
 * Per-user agent wallet management.
 * Each user gets a dedicated Ethereum wallet managed by the server (custody model).
 * Private keys are encrypted with AES-256-CBC before being stored in the DB.
 *
 * ⚠️  Custody note: the server holds the agent wallet keys.
 *     Users should only deposit funds they trust to an automated agent.
 */
import { ethers } from 'ethers';
import crypto from 'crypto';
import { saveAgentWallet, getAgentWallet } from './db.js';
import { getCredential } from './credentials.js';
import { CHAINS } from './chains/configs.js';

// 32-byte key derived from env var
function getEncKey() {
  const raw = process.env.WALLET_ENCRYPTION_KEY || 'autoyield-dev-encryption-key-32b!';
  return Buffer.from(raw.padEnd(32).slice(0, 32));
}

function encryptPrivateKey(privateKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncKey(), iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(privateKey)), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptPrivateKey(encryptedKey) {
  const [ivHex, encHex] = encryptedKey.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncKey(), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString();
}

/**
 * Generate a new random wallet for a user and store it encrypted in DB.
 * Returns { address }.
 */
export function createUserWallet(userId, chainId = 'sepolia') {
  const wallet = ethers.Wallet.createRandom();
  const encryptedKey = encryptPrivateKey(wallet.privateKey);
  saveAgentWallet(userId, wallet.address, encryptedKey, chainId);
  return { address: wallet.address };
}

/**
 * Get an ethers.Wallet (signer) for a user on a given chain.
 */
export function getUserSigner(userId, chainId = 'sepolia') {
  const row = getAgentWallet(userId);
  if (!row) throw new Error('No agent wallet found. Please log in again.');
  const privateKey = decryptPrivateKey(row.encrypted_key);
  const provider = getProviderForChain(chainId);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Get USDC balance for a user's agent wallet on a given chain.
 */
export async function getUserUsdcBalance(userId, chainId = 'sepolia') {
  const row = getAgentWallet(userId);
  if (!row) return 0;

  const chain = CHAINS[chainId];
  if (!chain) return 0;

  const usdcAddress = getCredential(chain.usdcEnvVar);
  if (!usdcAddress) return 0;

  const provider = getProviderForChain(chainId);
  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
  const [raw, decimals] = await Promise.all([usdc.balanceOf(row.address), usdc.decimals()]);
  return parseFloat(ethers.formatUnits(raw, decimals));
}

/**
 * Create a provider for a given chain using credentials.
 */
export function getProviderForChain(chainId = 'sepolia') {
  const chain = CHAINS[chainId];
  if (!chain) throw new Error(`Unknown chain: ${chainId}`);
  const rpcUrl = getCredential(chain.rpcEnvVar);
  if (!rpcUrl) throw new Error(`RPC URL not configured for chain: ${chainId}`);
  return new ethers.JsonRpcProvider(rpcUrl);
}
