import { getAllChains } from '../../lib/chains/configs.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const chains = getAllChains().map(c => ({
    id: c.id,
    name: c.name,
    chainId: c.chainId,
    explorer: c.explorer,
    isTestnet: c.isTestnet,
    enabled: c.enabled,
    color: c.color,
    rpcConfigured: !!process.env[c.rpcEnvVar],
    phase: c.enabled ? 'live' : 'upcoming',
  }));
  res.status(200).json(chains);
}
