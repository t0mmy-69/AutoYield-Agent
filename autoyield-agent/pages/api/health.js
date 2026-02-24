import { getDb } from '../../lib/db.js';

/**
 * GET /api/health
 * Returns system health status — DB connectivity, scheduler state, uptime.
 * Used by Railway health checks, uptime monitors, and on-call alerting.
 */
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const checks = {};
  let httpStatus = 200;

  // DB check
  try {
    getDb().prepare('SELECT 1').get();
    checks.db = 'ok';
  } catch (err) {
    checks.db = `error: ${err.message}`;
    httpStatus = 503;
  }

  // Scheduler check
  const schedulerRunning = !!global['__autoyield_scheduler__'];
  checks.scheduler = schedulerRunning ? 'running' : 'stopped';
  if (!schedulerRunning) httpStatus = 503;

  // Uptime
  checks.uptimeSeconds = Math.floor(process.uptime());

  res.status(httpStatus).json({
    status: httpStatus === 200 ? 'ok' : 'degraded',
    timestamp: Date.now(),
    checks,
  });
}
