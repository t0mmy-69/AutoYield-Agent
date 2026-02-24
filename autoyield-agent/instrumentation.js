/**
 * Next.js instrumentation hook — runs once on server startup.
 * Starts the background scheduler for all registered users.
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler.js');
    startScheduler();
  }
}
