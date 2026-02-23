import { fetchBothAPRs } from '../../lib/aprFetcher.js';
import { appendSnapshot } from '../../lib/aprHistory.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const snapshot = await fetchBothAPRs();
    appendSnapshot(snapshot);
    res.status(200).json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
