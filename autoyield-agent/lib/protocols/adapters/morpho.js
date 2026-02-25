import { ethers } from 'ethers';
import { getProvider, getProviderForChain, approveToken } from '../../agentWallet.js';
import { getCredential } from '../../credentials.js';

// Morpho Blue core — same address across all EVM chains (CREATE2 deterministic)
const MORPHO_BLUE_ADDRESS = '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb';

const MORPHO_ABI = [
  // Market state: totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee
  'function market(bytes32 id) view returns (uint128, uint128, uint128, uint128, uint128, uint128)',
  // Market params from id: loanToken, collateralToken, oracle, irm, lltv
  'function idToMarketParams(bytes32 id) view returns (address, address, address, address, uint256)',
  // User position: supplyShares, borrowShares, collateral
  'function position(bytes32 id, address user) view returns (uint256, uint128, uint128)',
  // Supply: pass assets > 0, shares = 0, data = '0x'
  'function supply(tuple(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, uint256 assets, uint256 shares, address onBehalfOf, bytes data) returns (uint256, uint256)',
  // Withdraw all: pass assets = 0, shares = supplyShares
  'function withdraw(tuple(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, uint256 assets, uint256 shares, address onBehalfOf, address receiver) returns (uint256, uint256)',
];

// AdaptiveCurveIRM — view function to get current borrow rate per second (WAD)
const IRM_ABI = [
  'function borrowRate(tuple(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv) marketParams, tuple(uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee) market) view returns (uint256)',
];

const ERC20_ABI = ['function decimals() view returns (uint8)'];

const WAD = BigInt('1000000000000000000'); // 1e18
const SECONDS_PER_YEAR = BigInt(31536000);

/**
 * Compute Morpho Blue supply APR for a given market.
 * Formula: supplyAPR = borrowAPR * utilization * (1 - fee)
 * All rates are in WAD (1e18 = 100%).
 * Returns APR as a percentage (e.g. 4.23), or null on failure.
 */
export async function computeMorphoAPR(morphoAddress, marketId, provider) {
  const morpho = new ethers.Contract(morphoAddress, MORPHO_ABI, provider);

  const [
    totalSupplyAssets, totalSupplyShares,
    totalBorrowAssets, totalBorrowShares,
    lastUpdate, fee,
  ] = await morpho.market(marketId);

  if (totalSupplyAssets === 0n) return 0;

  const [loanToken, collateralToken, oracle, irm, lltv] = await morpho.idToMarketParams(marketId);

  const marketParams = { loanToken, collateralToken, oracle, irm, lltv };
  const marketState = {
    totalSupplyAssets, totalSupplyShares,
    totalBorrowAssets, totalBorrowShares,
    lastUpdate, fee,
  };

  const irmContract = new ethers.Contract(irm, IRM_ABI, provider);
  const borrowRatePerSec = await irmContract.borrowRate(marketParams, marketState);

  const borrowAPR = BigInt(borrowRatePerSec.toString()) * SECONDS_PER_YEAR; // WAD per year
  const utilization = (totalBorrowAssets * WAD) / totalSupplyAssets; // WAD
  const supplyAPR = (borrowAPR * utilization / WAD) * (WAD - BigInt(fee.toString())) / WAD;

  return parseFloat((Number(supplyAPR) / Number(WAD) * 100).toFixed(4));
}

/**
 * Factory — create a Morpho Blue adapter from a custom config.
 * config.contractAddress = Morpho Blue core (default: deterministic address)
 * config.marketId = bytes32 market ID
 */
export function createMorphoAdapter(config) {
  const {
    id, name, chain, color = '#9747FF', website = 'https://morpho.org',
    description = 'Permissionless lending markets with isolated risk',
    contractAddress = MORPHO_BLUE_ADDRESS, marketId, enabled = true,
  } = config;

  if (!marketId) throw new Error('Morpho adapter requires a marketId (bytes32)');

  return {
    id, name, chain, color, website, description,
    category: 'lending',
    enabled,
    custom: true,

    getContractAddress() { return contractAddress; },

    async getAPR() {
      try {
        const provider = getProviderForChain(chain);
        return await computeMorphoAPR(contractAddress, marketId, provider);
      } catch (err) {
        console.error(`[Morpho custom adapter ${id} getAPR error]`, err?.message ?? err);
        return null;
      }
    },

    async supply({ signer, usdcAddress, amount }) {
      const morpho = new ethers.Contract(contractAddress, MORPHO_ABI, signer);
      const [loanToken, collateralToken, oracle, irm, lltv] = await morpho.idToMarketParams(marketId);
      const marketParams = { loanToken, collateralToken, oracle, irm, lltv };

      const erc20 = new ethers.Contract(loanToken, ERC20_ABI, signer);
      const decimals = await erc20.decimals();
      await approveToken(loanToken, contractAddress, ethers.formatUnits(amount, decimals), signer);

      const agentAddress = await signer.getAddress();
      const tx = await morpho.supply(marketParams, amount, 0n, agentAddress, '0x');
      return await tx.wait();
    },

    async withdraw({ signer }) {
      const morpho = new ethers.Contract(contractAddress, MORPHO_ABI, signer);
      const [loanToken, collateralToken, oracle, irm, lltv] = await morpho.idToMarketParams(marketId);
      const marketParams = { loanToken, collateralToken, oracle, irm, lltv };

      const agentAddress = await signer.getAddress();
      const [supplyShares] = await morpho.position(marketId, agentAddress);
      if (supplyShares === 0n) throw new Error('Morpho: no supply position to withdraw');

      const tx = await morpho.withdraw(marketParams, 0n, supplyShares, agentAddress, agentAddress);
      return await tx.wait();
    },
  };
}

// Built-in placeholder — disabled until user adds a specific market via custom protocol
export const morphoAdapter = {
  id: 'morpho',
  name: 'Morpho Blue',
  chain: 'sepolia',
  color: '#9747FF',
  website: 'https://morpho.org',
  description: 'Permissionless lending markets with isolated risk',
  category: 'lending',
  enabled: false,

  getContractAddress() {
    return MORPHO_BLUE_ADDRESS;
  },

  async getAPR() {
    return null; // No default market — add a custom Morpho protocol with a specific marketId
  },

  async supply() {
    throw new Error('Morpho built-in adapter has no default market. Add a custom Morpho protocol with a specific marketId.');
  },

  async withdraw() {
    throw new Error('Morpho built-in adapter has no default market. Add a custom Morpho protocol with a specific marketId.');
  },
};
