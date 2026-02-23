// Morpho Blue adapter — Phase 2 (Base / Ethereum Mainnet)
// Morpho optimizes lending yields through peer-to-peer matching on top of Aave/Compound
// Contract addresses and full implementation pending Base mainnet deployment

export const morphoAdapter = {
  id: 'morpho',
  name: 'Morpho Blue',
  chain: 'base',
  color: '#9747FF',
  website: 'https://morpho.org',
  description: 'Peer-to-peer lending layer on top of Aave and Compound',
  category: 'lending',
  enabled: false, // Phase 2 — Base mainnet

  getContractAddress() {
    return process.env.MORPHO_POOL_ADDRESS || null;
  },

  async getAPR() {
    throw new Error('Morpho adapter not yet implemented — scheduled for Phase 2 (Base)');
  },

  async supply() {
    throw new Error('Morpho adapter not yet implemented — scheduled for Phase 2 (Base)');
  },

  async withdraw() {
    throw new Error('Morpho adapter not yet implemented — scheduled for Phase 2 (Base)');
  },
};
