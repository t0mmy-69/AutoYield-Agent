// Radiant Capital adapter — Phase 2 (Arbitrum One)
// Radiant V2 uses a modified Aave V2 architecture built on LayerZero
// Contract addresses and full implementation pending Arbitrum mainnet deployment

export const radiantAdapter = {
  id: 'radiant',
  name: 'Radiant Capital',
  chain: 'arbitrum',
  color: '#FF6B35',
  website: 'https://radiant.capital',
  description: 'Omnichain money market built on LayerZero',
  category: 'lending',
  enabled: false, // Phase 2 — Arbitrum mainnet

  getContractAddress() {
    return process.env.RADIANT_POOL_ADDRESS || null;
  },

  async getAPR() {
    throw new Error('Radiant adapter not yet implemented — scheduled for Phase 2 (Arbitrum)');
  },

  async supply() {
    throw new Error('Radiant adapter not yet implemented — scheduled for Phase 2 (Arbitrum)');
  },

  async withdraw() {
    throw new Error('Radiant adapter not yet implemented — scheduled for Phase 2 (Arbitrum)');
  },
};
