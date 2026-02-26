import { ethers } from 'ethers';
import { getProtocol } from './protocols/index.js';
import { CHAINS } from './chains/configs.js';
import { getCredential } from './credentials.js';

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
];

/**
 * Execute a rotation: withdraw from `from` protocol, supply to `to` protocol.
 * Uses the protocol adapter registry — supports any registered protocol.
 * Adding a new protocol only requires registering a new adapter.
 *
 * @param {string} chainId - Agent wallet chain (e.g. 'sepolia', 'baseSepolia').
 *   Used to resolve the correct chain-specific USDC contract address.
 */
export async function executeRotation({ from, to, signer, chainId = 'sepolia' }) {
  const fromAdapter = getProtocol(from);
  const toAdapter = getProtocol(to);

  if (!fromAdapter) throw new Error(`Unknown source protocol: "${from}"`);
  if (!toAdapter) throw new Error(`Unknown target protocol: "${to}"`);

  const agentAddress = await signer.getAddress();

  // Resolve chain-specific USDC address — falls back to global env for legacy/single-chain mode
  const chain = CHAINS[chainId];
  const usdcAddress = (chain ? getCredential(chain.usdcEnvVar) : null)
    || getCredential('USDC_ADDRESS')
    || process.env.USDC_ADDRESS;
  if (!usdcAddress) throw new Error(`USDC address not configured for chain: ${chainId}`);
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
  const decimals = await usdc.decimals();

  // Step 1: Withdraw all USDC from source protocol
  const withdrawReceipt = await fromAdapter.withdraw({ signer, usdcAddress });

  // Step 2: Confirm received balance
  const amount = await usdc.balanceOf(agentAddress);
  if (amount === 0n) throw new Error('No USDC available after withdrawal');

  // Step 3: Supply full balance to target protocol
  const supplyReceipt = await toAdapter.supply({ signer, usdcAddress, amount });

  return {
    withdrawTxHash: withdrawReceipt.hash,
    supplyTxHash: supplyReceipt.hash,
    txHash: supplyReceipt.hash,
    blockNumber: supplyReceipt.blockNumber,
    from,
    to,
    amountUsdc: parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2),
  };
}

/**
 * Execute initial supply: no withdrawal step — just supply idle USDC balance.
 * Used when agent has no active position and there's idle USDC to deploy.
 */
export async function executeInitialSupply({ to, signer, chainId = 'sepolia' }) {
  const toAdapter = getProtocol(to);
  if (!toAdapter) throw new Error(`Unknown target protocol: "${to}"`);

  const agentAddress = await signer.getAddress();

  const chain = CHAINS[chainId];
  const usdcAddress = (chain ? getCredential(chain.usdcEnvVar) : null)
    || getCredential('USDC_ADDRESS')
    || process.env.USDC_ADDRESS;
  if (!usdcAddress) throw new Error(`USDC address not configured for chain: ${chainId}`);

  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
  const decimals = await usdc.decimals();
  const amount = await usdc.balanceOf(agentAddress);
  if (amount === 0n) throw new Error('No USDC available to supply');

  const supplyReceipt = await toAdapter.supply({ signer, usdcAddress, amount });

  return {
    withdrawTxHash: null,
    supplyTxHash: supplyReceipt.hash,
    txHash: supplyReceipt.hash,
    blockNumber: supplyReceipt.blockNumber,
    from: null,
    to,
    amountUsdc: parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2),
  };
}
