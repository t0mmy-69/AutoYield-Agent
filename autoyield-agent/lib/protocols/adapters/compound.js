import { ethers } from 'ethers';
import { getProvider, getProviderForChain, approveToken } from '../../agentWallet.js';
import { getCredential } from '../../credentials.js';

const COMET_ABI = [
  'function getUtilization() view returns (uint256)',
  'function getSupplyRate(uint256 utilization) view returns (uint64)',
  'function supply(address asset, uint256 amount)',
  'function withdraw(address asset, uint256 amount)',
  // balanceOf returns the agent's supply position (base token units), NOT ERC20 balance
  'function balanceOf(address account) view returns (uint256)',
  // baseToken returns the underlying asset address (e.g. USDC) for this Comet deployment
  'function baseToken() view returns (address)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const SECONDS_PER_YEAR = 31536000n;

/**
 * Shared APR calculation — used by both the static adapter and custom factory instances.
 * Returns the supply APR as a percentage (e.g. 3.60), or null if the call fails.
 */
export async function computeCompoundAPR(cometAddress, provider) {
  const comet = new ethers.Contract(cometAddress, COMET_ABI, provider);
  const utilization = await comet.getUtilization();
  const supplyRatePerSec = await comet.getSupplyRate(utilization);
  const annualRate = Number(BigInt(supplyRatePerSec.toString()) * SECONDS_PER_YEAR) / 1e18;
  return parseFloat((annualRate * 100).toFixed(4));
}

/**
 * Factory — create a fully-functional Compound adapter from a custom config.
 * Used by the protocol registry for admin-registered protocol instances.
 */
export function createCompoundAdapter(config) {
  const {
    id, name, chain, color = '#00D395', website = 'https://compound.finance',
    description = 'Algorithmic, autonomous interest rate protocol',
    contractAddress, enabled = true,
  } = config;

  return {
    id, name, chain, color, website, description,
    category: 'lending',
    enabled,
    custom: true,

    getContractAddress() { return contractAddress; },

    async getAPR() {
      try {
        const provider = getProviderForChain(chain);
        return await computeCompoundAPR(contractAddress, provider);
      } catch (err) {
        console.error(`[Compound custom adapter ${id} getAPR error]`, err?.message ?? err);
        return null;
      }
    },

    async resolveUsdc({ signer }) {
      const comet = new ethers.Contract(contractAddress, COMET_ABI, signer.provider ?? signer);
      return await comet.baseToken();
    },

    async hasPosition({ signer }) {
      try {
        const comet = new ethers.Contract(contractAddress, COMET_ABI, signer.provider ?? signer);
        const bal = await comet.balanceOf(await signer.getAddress());
        return bal > 0n;
      } catch { return false; }
    },

    async supply({ signer, usdcAddress, amount }) {
      const erc20 = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
      const decimals = await erc20.decimals();
      await approveToken(usdcAddress, contractAddress, ethers.formatUnits(amount, decimals), signer);
      const comet = new ethers.Contract(contractAddress, COMET_ABI, signer);
      const tx = await comet.supply(usdcAddress, amount);
      return await tx.wait();
    },

    async withdraw({ signer, usdcAddress }) {
      const agentAddress = await signer.getAddress();
      const comet = new ethers.Contract(contractAddress, COMET_ABI, signer);
      const position = await comet.balanceOf(agentAddress);
      if (position === 0n) throw new Error('Compound: no supply position to withdraw');
      const tx = await comet.withdraw(usdcAddress, position);
      return await tx.wait();
    },
  };
}

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
    return getCredential('COMPOUND_COMET_ADDRESS') || '0xAec1F48e02Cfb822Be958b68C7957156EB3F0b6e';
  },

  async getAPR() {
    try {
      const provider = getProvider();
      return await computeCompoundAPR(this.getContractAddress(), provider);
    } catch (err) {
      console.error('[Compound getAPR error]', err?.message ?? err);
      return null; // never fake data — let UI show "APR unavailable"
    }
  },

  async resolveUsdc({ signer }) {
    const comet = new ethers.Contract(this.getContractAddress(), COMET_ABI, signer.provider ?? signer);
    return await comet.baseToken();
  },

  async hasPosition({ signer }) {
    try {
      const comet = new ethers.Contract(this.getContractAddress(), COMET_ABI, signer.provider ?? signer);
      const bal = await comet.balanceOf(await signer.getAddress());
      return bal > 0n;
    } catch { return false; }
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
