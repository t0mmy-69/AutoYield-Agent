import { ethers } from 'ethers';
import { getProvider, getProviderForChain, approveToken } from '../../agentWallet.js';
import { getCredential } from '../../credentials.js';

const POOL_ABI = [
  'function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
];

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
];

const ATOKEN_ABI = ['function balanceOf(address) view returns (uint256)'];

const RAY = BigInt('1000000000000000000000000000'); // 1e27

// AAVE V3 Sepolia uses its own test USDC — NOT Circle's Sepolia USDC (0x1c7D...)
// On mainnet both protocols share 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
const AAVE_SEPOLIA_USDC = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8';

/**
 * Shared APR calculation — used by both the static adapter and custom factory instances.
 * Returns the supply APR as a percentage (e.g. 3.14), or null if the call fails.
 */
export async function computeAaveAPR(poolAddress, usdcAddress, provider) {
  const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const data = await pool.getReserveData(usdcAddress);
  const rateRaw = BigInt(data.currentLiquidityRate.toString());
  const aprPct = Number((rateRaw * 10000n) / RAY) / 100;
  return parseFloat(aprPct.toFixed(4));
}

/**
 * Factory — create a fully-functional AAVE adapter from a custom config.
 * Used by the protocol registry for admin-registered protocol instances.
 */
export function createAaveAdapter(config) {
  const {
    id, name, chain, color = '#B6509E', website = 'https://aave.com',
    description = 'Decentralized non-custodial liquidity protocol',
    contractAddress, usdcAddress, enabled = true,
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
        return await computeAaveAPR(contractAddress, usdcAddress, provider);
      } catch (err) {
        console.error(`[AAVE custom adapter ${id} getAPR error]`, err?.message ?? err);
        return null;
      }
    },

    async resolveUsdc() {
      return usdcAddress;
    },

    async hasPosition({ signer }) {
      try {
        const pool = new ethers.Contract(contractAddress, POOL_ABI, signer.provider);
        const data = await pool.getReserveData(await this.resolveUsdc());
        const aToken = new ethers.Contract(data.aTokenAddress, ATOKEN_ABI, signer.provider);
        const bal = await aToken.balanceOf(await signer.getAddress());
        return bal > 0n;
      } catch { return false; }
    },

    async supply({ signer, usdcAddress: supplyUsdc, amount }) {
      const erc20 = new ethers.Contract(supplyUsdc, ERC20_ABI, signer);
      const decimals = await erc20.decimals();
      await approveToken(supplyUsdc, contractAddress, ethers.formatUnits(amount, decimals), signer);
      const pool = new ethers.Contract(contractAddress, POOL_ABI, signer);
      const agentAddress = await signer.getAddress();
      const tx = await pool.supply(supplyUsdc, amount, agentAddress, 0);
      return await tx.wait();
    },

    async withdraw({ signer, usdcAddress: withdrawUsdc }) {
      const agentAddress = await signer.getAddress();
      const pool = new ethers.Contract(contractAddress, POOL_ABI, signer);
      const tx = await pool.withdraw(withdrawUsdc, ethers.MaxUint256, agentAddress);
      return await tx.wait();
    },
  };
}

export const aaveAdapter = {
  id: 'aave',
  name: 'AAVE V3',
  chain: 'sepolia',
  color: '#B6509E',
  website: 'https://aave.com',
  description: 'Decentralized non-custodial liquidity protocol',
  category: 'lending',
  enabled: true,

  getContractAddress() {
    return getCredential('AAVE_POOL_ADDRESS') || '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951';
  },

  async getAPR() {
    try {
      const provider = getProvider();
      // AAVE Sepolia uses its own test USDC (0x94a9...).
      // AAVE_USDC_ADDRESS credential overrides this (e.g. for mainnet: 0xA0b8...).
      const usdcAddress =
        getCredential('AAVE_USDC_ADDRESS') ||
        AAVE_SEPOLIA_USDC;
      return await computeAaveAPR(this.getContractAddress(), usdcAddress, provider);
    } catch (err) {
      console.error('[AAVE getAPR error]', err?.message ?? err);
      return null; // never fake data — let UI show "APR unavailable"
    }
  },

  async resolveUsdc() {
    return getCredential('AAVE_USDC_ADDRESS') || AAVE_SEPOLIA_USDC;
  },

  async hasPosition({ signer }) {
    try {
      const pool = new ethers.Contract(this.getContractAddress(), POOL_ABI, signer.provider);
      const data = await pool.getReserveData(await this.resolveUsdc());
      const aToken = new ethers.Contract(data.aTokenAddress, ATOKEN_ABI, signer.provider);
      const bal = await aToken.balanceOf(await signer.getAddress());
      return bal > 0n;
    } catch { return false; }
  },

  async supply({ signer, usdcAddress, amount }) {
    const erc20 = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
    const decimals = await erc20.decimals();
    await approveToken(usdcAddress, this.getContractAddress(), ethers.formatUnits(amount, decimals), signer);
    const pool = new ethers.Contract(this.getContractAddress(), POOL_ABI, signer);
    const agentAddress = await signer.getAddress();
    const tx = await pool.supply(usdcAddress, amount, agentAddress, 0);
    return await tx.wait();
  },

  async withdraw({ signer, usdcAddress }) {
    const agentAddress = await signer.getAddress();
    const pool = new ethers.Contract(this.getContractAddress(), POOL_ABI, signer);
    const tx = await pool.withdraw(usdcAddress, ethers.MaxUint256, agentAddress);
    return await tx.wait();
  },
};
