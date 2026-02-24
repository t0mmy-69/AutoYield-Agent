import { getAllChains, setChainEnabled, deleteChain } from '../../lib/chains/configs.js';
import { getCredential } from '../../lib/credentials.js';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const chains = getAllChains().map(c => ({
      id: c.id,
      name: c.name,
      chainId: c.chainId,
      explorer: c.explorer,
      isTestnet: c.isTestnet,
      enabled: c.enabled,
      color: c.color,
      rpcConfigured: !!(process.env[c.rpcEnvVar] || getCredential(c.rpcEnvVar)),
      phase: c.enabled ? 'live' : 'upcoming',
    }));
    return res.status(200).json(chains);
  }

  if (req.method === 'PATCH') {
    const { id, enabled } = req.body || {};
    if (!id || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Required: id (string) and enabled (boolean)' });
    }
    setChainEnabled(id, enabled);
    return res.status(200).json({ success: true, id, enabled });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Required: id (string)' });
    deleteChain(id);
    return res.status(200).json({ success: true, id, deleted: true });
  }

  res.status(405).end();
}
