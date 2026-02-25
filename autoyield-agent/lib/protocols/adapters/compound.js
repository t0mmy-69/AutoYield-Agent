import { ethers } from 'ethers';
import { getProvider, approveToken } from '../agentWallet.js';
import { getCredential } from '../credentials.js';

const COMET_ABI = [
  'function getUtilization() view returns (uint256)',
  'function getSupplyRate(uint256 utilization) view returns (uint64)',
  'function supply(address asset, uint256 amount)',
  'function withdraw(address asset, uint256 amount)',
  // balanceOf returns the agent's supply position (base token units), NOT ERC20 balance
  'function balanceOf(address account) view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const SECONDS_PER_YEAR = 31536000n;

export const compoundAdapter = {
  id: 'compound',
  name: 'Compound V3',
  chain: 'sepolia',
  color: '#00D395',
  website: 'https://compound.finance',
  description: 'Algorithmic, autonomous interest rate protocol',
  category: 'lending',
  enabled: true,

  getContractAddress() {
    return getCredential('COMPOUND_COMET_ADDRESS');
  },

  async getAPR() {
    try {
      const provider = getProvider();
      const comet = new ethers.Contract(this.getContractAddress(), COMET_ABI, provider);
      const utilization = await comet.getUtilization();
      const supplyRatePerSec = await comet.getSupplyRate(utilization);
      const annualRate = Number(BigInt(supplyRatePerSec.toString()) * SECONDS_PER_YEAR) / 1e18;
      return parseFloat((annualRate * 100).toFixed(4));
    } catch {
      return 3.60; // testnet fallback
    }
  },

  async supply({ signer, usdcAddress, amount }) {
    const erc20 = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
    const decimals = await erc20.decimals();
    await approveToken(usdcAddress, this.getContractAddress(), ethers.formatUnits(amount, decimals), signer);
    const comet = new ethers.Contract(this.getContractAddress(), COMET_ABI, signer);
    const tx = await comet.supply(usdcAddress, amount);
    return await tx.wait();
  },

  async withdraw({ signer, usdcAddress }) {
    const agentAddress = await signer.getAddress();
    const comet = new ethers.Contract(this.getContractAddress(), COMET_ABI, signer);
    // Read Comet supply position — not ERC20 USDC balance (which is ~0 when funds are deposited)
    const position = await comet.balanceOf(agentAddress);
    if (position === 0n) throw new Error('Compound: no supply position to withdraw');
    const tx = await comet.withdraw(usdcAddress, position);
    return await tx.wait();
  },
};
