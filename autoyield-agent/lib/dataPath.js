import path from 'path';

/**
 * Base directory for all persistent data files.
 * Override with DATA_DIR env var to point to a Railway/Docker persistent volume.
 * Default: <project_root>/data
 */
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
