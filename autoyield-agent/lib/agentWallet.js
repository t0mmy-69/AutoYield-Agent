import { ethers } from 'ethers';
import { getCredential } from './credentials.js';
import { CHAINS } from './chains/configs.js';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

export function getProvider() {
  return new ethers.JsonRpcProvider(getCredential('RPC_URL'));
}

/**
 * Returns a provider for the given chain ID.
 * Falls back to the default Sepolia provider if the chain RPC is not configured.
 */
export function getProviderForChain(chainId) {
  const chain = CHAINS[chainId];
  if (!chain) return getProvider();
  const rpcUrl = getCredential(chain.rpcEnvVar) || process.env[chain.rpcEnvVar];
  if (!rpcUrl) return getProvider();
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getSigner() {
  const provider = getProvider();
  return new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
}

export async function getUsdcBalance(address) {
  const provider = getProvider();
  const usdc = new ethers.Contract(getCredential('USDC_ADDRESS'), ERC20_ABI, provider);
  const decimals = await usdc.decimals();
  const raw = await usdc.balanceOf(address);
  return parseFloat(ethers.formatUnits(raw, decimals));
}

export async function approveToken(tokenAddress, spenderAddress, amount, signer) {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const decimals = await token.decimals();
  const amountRaw = ethers.parseUnits(amount.toString(), decimals);
  const tx = await token.approve(spenderAddress, amountRaw);
  await tx.wait();
  return tx.hash;
}
