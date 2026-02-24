/**
 * POST /api/cron           — trigger check for all users (admin)
 * POST /api/cron?userId=X  — trigger check for a specific user
 *
 * Protected by CRON_SECRET env var (set in .env.local).
 * Can be called by external cron services (cron-job.org, Vercel cron, etc.)
 * or by the built-in scheduler via lib/scheduler.js.
 */
import { runAllUsers, runCheckForUser, startScheduler } from '../../lib/scheduler.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify cron secret (skip in dev if not set)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers['x-cron-secret'] || req.query.secret;
    if (provided !== secret) return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : null;

    if (userId) {
      const result = await runCheckForUser(userId);
      return res.status(200).json({ ok: true, result });
    }

    const results = await runAllUsers();
    res.status(200).json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Also export a way to start the scheduler from here
export { startScheduler };
