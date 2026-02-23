import { getAllProtocols, setProtocolEnabled } from '../../lib/protocols/index.js';

export default function handler(req, res) {
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
    }));
    return res.status(200).json(protocols);
  }

  if (req.method === 'PATCH') {
    const { id, enabled } = req.body;
    if (!id || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Required: id (string) and enabled (boolean)' });
    }
    setProtocolEnabled(id, enabled);
    return res.status(200).json({ success: true, id, enabled });
  }

  res.status(405).end();
}
