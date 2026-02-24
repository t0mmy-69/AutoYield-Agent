// Chain configurations
// enabled: true  = deposit supported on this chain
// Wallet connection works with ANY EVM network (no restriction)

export const CHAINS = {
  // ── Deposit-enabled testnets ─────────────────────────────────────────────
  sepolia: {
    id: 'sepolia',
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcEnvVar: 'RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    enabled: true,
    color: '#627EEA',
    usdcEnvVar: 'USDC_ADDRESS',
  },
  baseSepolia: {
    id: 'baseSepolia',
    name: 'Base Sepolia',
    chainId: 84532,
    rpcEnvVar: 'BASE_SEPOLIA_RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://sepolia.basescan.org',
    isTestnet: true,
    enabled: true,
    color: '#0052FF',
    usdcEnvVar: 'BASE_SEPOLIA_USDC_ADDRESS',
  },
  arbitrumSepolia: {
    id: 'arbitrumSepolia',
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcEnvVar: 'ARBITRUM_SEPOLIA_RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://sepolia.arbiscan.io',
    isTestnet: true,
    enabled: true,
    color: '#28A0F0',
    usdcEnvVar: 'ARBITRUM_SEPOLIA_USDC_ADDRESS',
  },

  // ── Mainnets (disabled — not yet live) ───────────────────────────────────
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcEnvVar: 'ETHEREUM_RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://etherscan.io',
    isTestnet: false,
    enabled: false,
    color: '#627EEA',
    usdcEnvVar: 'ETHEREUM_USDC_ADDRESS',
  },
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcEnvVar: 'BASE_RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://basescan.org',
    isTestnet: false,
    enabled: false,
    color: '#0052FF',
    usdcEnvVar: 'BASE_USDC_ADDRESS',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcEnvVar: 'ARBITRUM_RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://arbiscan.io',
    isTestnet: false,
    enabled: false,
    color: '#28A0F0',
    usdcEnvVar: 'ARBITRUM_USDC_ADDRESS',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcEnvVar: 'OPTIMISM_RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://optimistic.etherscan.io',
    isTestnet: false,
    enabled: false,
    color: '#FF0420',
    usdcEnvVar: 'OPTIMISM_USDC_ADDRESS',
  },
};

export function getChain(id) {
  return CHAINS[id] || null;
}

export function getAllChains() {
  return Object.values(CHAINS);
}

export function getEnabledChains() {
  return Object.values(CHAINS).filter(c => c.enabled);
}
