import { getAllProtocols, setProtocolEnabled, deleteProtocol, addCustomProtocol } from '../../lib/protocols/index.js';
import { withAdminAuth } from '../../lib/auth.js';

function handler(req, res) {
  if (req.method === 'GET') {
    const protocols = getAllProtocols().map(p => ({
      id: p.id,
      name: p.name,
      chain: p.chain,
      color: p.color,
      website: p.website,
      description: p.description,
      category: p.category,
      enabled: p.enabled,
      custom: p.custom || false,
      type: p.type || null,
    }));
    return res.status(200).json(protocols);
  }

  if (req.method === 'POST') {
    // Register a new custom protocol instance
    const { id, type, name, chain, contractAddress, usdcAddress, marketId, color } = req.body || {};
    try {
      const entry = addCustomProtocol({ id, type, name, chain, contractAddress, usdcAddress, marketId, color });
      return res.status(201).json({ success: true, protocol: entry });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, enabled } = req.body;
    if (!id || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Required: id (string) and enabled (boolean)' });
    }
    setProtocolEnabled(id, enabled);
    return res.status(200).json({ success: true, id, enabled });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Required: id (string)' });
    deleteProtocol(id);
    return res.status(200).json({ success: true, id, deleted: true });
  }

  res.status(405).end();
}

// GET is public. POST/PATCH/DELETE are admin-only.
export default function protocolsHandler(req, res) {
  if (req.method === 'GET') return handler(req, res);
  return withAdminAuth(handler)(req, res);
}
