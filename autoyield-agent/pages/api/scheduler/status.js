import { getSchedulerStats } from '../../../lib/scheduler.js';

/**
 * GET /api/scheduler/status
 * Returns scheduler runtime stats: running state, last run time, total runs.
 * Protected by ADMIN_SECRET.
 */
import { withAdminAuth } from '../../../lib/auth.js';

function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const running = !!global['__autoyield_scheduler__'];
  const stats = getSchedulerStats();

  res.status(200).json({
    running,
    startedAt: stats?.startedAt ?? null,
    lastRunAt: stats?.lastRunAt ?? null,
    lastRunUsers: stats?.lastRunUsers ?? 0,
    totalRuns: stats?.totalRuns ?? 0,
  });
}

export default withAdminAuth(handler);
