import fs from 'fs';
import path from 'path';
import { getSessionFromRequest } from '../../lib/auth.js';
import { getUserRules, setUserRules } from '../../lib/db.js';

const RULES_FILE = path.join(process.cwd(), 'data', 'rules.json');

const DEFAULT_RULES = {
  minDeltaPct: 0.4,
  confidenceThreshold: 0.6,
  minPersistenceChecks: 4,
  cooldownMinutes: 60,
  maxGasUsdPerMove: 2,
  maxTotalValueUsd: 50000,
  maxMovesPerYear: 52,
  executionMode: 'telegram_approval',
};

// ─── Global (admin/legacy) helpers ────────────────────────────────────────────

export function readRules() {
  try {
    const saved = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
    return { ...DEFAULT_RULES, ...saved };
  } catch {
    return { ...DEFAULT_RULES };
  }
}

// ─── Per-user helper ───────────────────────────────────────────────────────────

export function readRulesForUser(userId) {
  if (userId == null) return readRules();
  return getUserRules(userId);
}

// ─── API handler ──────────────────────────────────────────────────────────────

export default function handler(req, res) {
  const session = getSessionFromRequest(req);
  const userId = session?.userId ?? null;

  if (req.method === 'GET') {
    return res.status(200).json(readRulesForUser(userId));
  }

  if (req.method === 'PUT') {
    if (userId != null) {
      const current = getUserRules(userId);
      const updated = { ...current, ...req.body };
      setUserRules(userId, updated);
      return res.status(200).json(updated);
    }
    // Global fallback
    const current = readRules();
    const updated = { ...current, ...req.body };
    fs.writeFileSync(RULES_FILE, JSON.stringify(updated, null, 2));
    return res.status(200).json(updated);
  }

  res.status(405).end();
}
