import { ethers } from 'ethers';
import { approveToken } from './agentWallet.js';

// Minimal ABIs — only the functions we need
const AAVE_POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
];

const COMET_ABI = [
  'function supply(address asset, uint256 amount)',
  'function withdraw(address asset, uint256 amount)',
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
];

/**
 * Execute a rotation: withdraw from `from` protocol, supply to `to` protocol.
 * Returns { txHash, blockNumber, from, to, amount }
 */
export async function executeRotation({ from, to, signer }) {
  const agentAddress = await signer.getAddress();
  const usdcAddress = process.env.USDC_ADDRESS;

  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
  const decimals = await usdc.decimals();

  // Step 1: Withdraw all USDC from current protocol
  let withdrawTx;
  if (from === 'aave') {
    const aavePool = new ethers.Contract(process.env.AAVE_POOL_ADDRESS, AAVE_POOL_ABI, signer);
    // Withdraw max (pass uint256 max to withdraw all)
    const MAX_UINT = ethers.MaxUint256;
    withdrawTx = await aavePool.withdraw(usdcAddress, MAX_UINT, agentAddress);
  } else {
    const comet = new ethers.Contract(process.env.COMPOUND_COMET_ADDRESS, COMET_ABI, signer);
    const balance = await usdc.balanceOf(agentAddress);
    withdrawTx = await comet.withdraw(usdcAddress, balance);
  }

  const withdrawReceipt = await withdrawTx.wait();

  // Step 2: Get the received USDC balance
  const usdcBalance = await usdc.balanceOf(agentAddress);
  const amount = usdcBalance;

  if (amount === 0n) {
    throw new Error('No USDC available after withdrawal');
  }

  // Step 3: Approve target protocol to spend USDC
  let supplyTx;
  if (to === 'aave') {
    await approveToken(usdcAddress, process.env.AAVE_POOL_ADDRESS, ethers.formatUnits(amount, decimals), signer);
    const aavePool = new ethers.Contract(process.env.AAVE_POOL_ADDRESS, AAVE_POOL_ABI, signer);
    supplyTx = await aavePool.supply(usdcAddress, amount, agentAddress, 0);
  } else {
    await approveToken(usdcAddress, process.env.COMPOUND_COMET_ADDRESS, ethers.formatUnits(amount, decimals), signer);
    const comet = new ethers.Contract(process.env.COMPOUND_COMET_ADDRESS, COMET_ABI, signer);
    supplyTx = await comet.supply(usdcAddress, amount);
  }

  const supplyReceipt = await supplyTx.wait();

  return {
    withdrawTxHash: withdrawReceipt.hash,
    supplyTxHash: supplyReceipt.hash,
    txHash: supplyReceipt.hash, // primary reference
    blockNumber: supplyReceipt.blockNumber,
    from,
    to,
    amountUsdc: parseFloat(ethers.formatUnits(amount, decimals)).toFixed(2),
  };
}
