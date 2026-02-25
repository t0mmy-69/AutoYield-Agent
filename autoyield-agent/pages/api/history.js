import fs from 'fs';
import path from 'path';
import { getSessionFromRequest } from '../../lib/auth.js';
import { appendUserHistory, getUserHistory } from '../../lib/db.js';
import { DATA_DIR } from '../../lib/dataPath.js';

const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// ─── Global (admin/legacy) helpers ────────────────────────────────────────────

export function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function appendHistory(entry) {
  const history = readHistory();
  history.unshift(entry); // newest first
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// ─── Per-user helpers ─────────────────────────────────────────────────────────

export function appendHistoryForUser(userId, entry) {
  if (userId == null) return appendHistory(entry);
  appendUserHistory(userId, entry);
}

export function readHistoryForUser(userId) {
  if (userId == null) return readHistory();
  return getUserHistory(userId);
}

// ─── API handler ──────────────────────────────────────────────────────────────

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const session = getSessionFromRequest(req);
  const userId = session?.userId ?? null;
  res.status(200).json(readHistoryForUser(userId));
}
