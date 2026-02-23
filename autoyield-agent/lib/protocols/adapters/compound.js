import { ethers } from 'ethers';
import { getProvider, approveToken } from '../../agentWallet.js';

const COMET_ABI = [
  'function getUtilization() view returns (uint256)',
  'function getSupplyRate(uint256 utilization) view returns (uint64)',
  'function supply(address asset, uint256 amount)',
  'function withdraw(address asset, uint256 amount)',
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
    return process.env.COMPOUND_COMET_ADDRESS;
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
    const erc20 = new ethers.Contract(usdcAddress, ERC20_ABI, signer.provider);
    const balance = await erc20.balanceOf(agentAddress);
    const comet = new ethers.Contract(this.getContractAddress(), COMET_ABI, signer);
    const tx = await comet.withdraw(usdcAddress, balance);
    return await tx.wait();
  },
};
