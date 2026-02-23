// Chain configurations — add new chains here as Phase 2/3 rolls out
// enabled: false means chain is registered but not yet active

export const CHAINS = {
  sepolia: {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcEnvVar: 'RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    enabled: true,
    color: '#627EEA',
    usdcEnvVar: 'USDC_ADDRESS',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcEnvVar: 'ARBITRUM_RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://arbiscan.io',
    isTestnet: false,
    enabled: false, // Phase 2
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
    enabled: false, // Phase 2
    color: '#FF0420',
    usdcEnvVar: 'OPTIMISM_USDC_ADDRESS',
  },
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcEnvVar: 'BASE_RPC_URL',
    nativeCurrency: { symbol: 'ETH', decimals: 18 },
    explorer: 'https://basescan.org',
    isTestnet: false,
    enabled: false, // Phase 2
    color: '#0052FF',
    usdcEnvVar: 'BASE_USDC_ADDRESS',
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
