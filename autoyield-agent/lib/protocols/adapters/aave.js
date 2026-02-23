import { ethers } from 'ethers';
import { getProvider, approveToken } from '../../agentWallet.js';

const POOL_ABI = [
  'function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
];

const ERC20_ABI = ['function decimals() view returns (uint8)'];

const RAY = BigInt('1000000000000000000000000000'); // 1e27

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
    return process.env.AAVE_POOL_ADDRESS;
  },

  async getAPR() {
    try {
      const provider = getProvider();
      const pool = new ethers.Contract(this.getContractAddress(), POOL_ABI, provider);
      const data = await pool.getReserveData(process.env.USDC_ADDRESS);
      const rateRaw = BigInt(data.currentLiquidityRate.toString());
      const aprPct = Number((rateRaw * 10000n) / RAY) / 100;
      return parseFloat(aprPct.toFixed(4));
    } catch {
      return 4.20; // testnet fallback
    }
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
