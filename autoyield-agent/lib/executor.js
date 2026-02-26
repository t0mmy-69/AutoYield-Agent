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
 * Execute initial supply: resolve USDC per-protocol, then approve + supply.
 * No withdrawal step — agent has no active position.
 *
 * USDC resolution priority:
 *   - Adapter's resolveUsdc() method (protocol-specific):
 *       Aave  → AAVE_USDC_ADDRESS env || AAVE_SEPOLIA_USDC constant
 *       Compound → comet.baseToken() (reads on-chain, authoritative)
 *       Custom → config.usdcAddress stored in protocols.json
 */
export async function executeInitialSupply({ to, signer }) {
  const toAdapter = getProtocol(to);
  if (!toAdapter) throw new Error(`Unknown target protocol: "${to}"`);

  const agentAddress = await signer.getAddress();

  // Resolve the per-protocol USDC address (not the global chain-level one)
  if (!toAdapter.resolveUsdc) throw new Error(`Protocol "${to}" does not support resolveUsdc()`);
  const usdcAddress = await toAdapter.resolveUsdc({ signer });
  if (!usdcAddress) throw new Error(`Cannot resolve USDC address for protocol "${to}"`);

  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
  const decimals = await usdc.decimals();
  const amount = await usdc.balanceOf(agentAddress);
  if (amount === 0n) throw new Error('No idle USDC to supply');

  // Adapter handles approve + supply internally
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

/**
 * Check if the agent currently has a live on-chain position in a given protocol.
 * Delegates to the adapter's hasPosition() method.
 * Returns false if the adapter doesn't support it or if the RPC call fails.
 */
export async function checkOnchainPosition({ protocol, signer }) {
  const adapter = getProtocol(protocol);
  if (!adapter?.hasPosition) return false;
  try {
    return await adapter.hasPosition({ signer });
  } catch {
    return false;
  }
}
