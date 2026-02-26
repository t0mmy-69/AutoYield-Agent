import fs from 'fs';
import path from 'path';
import { getSessionFromRequest } from '../../lib/auth.js';
import { getUserRules, setUserRules } from '../../lib/db.js';
import { DATA_DIR } from '../../lib/dataPath.js';

const RULES_FILE = path.join(DATA_DIR, 'rules.json');

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

const ALLOWED_EXECUTION_MODES = ['manual_confirm', 'telegram_approval', 'auto'];

const NUMERIC_RULE_KEYS = [
  'minDeltaPct', 'confidenceThreshold', 'minPersistenceChecks',
  'cooldownMinutes', 'maxGasUsdPerMove', 'maxTotalValueUsd', 'maxMovesPerYear', 'minCapital',
];

/**
 * Validate and sanitize incoming rule fields.
 * Returns { ok: true, rules } or { ok: false, error }.
 */
function validateRules(incoming) {
  const rules = { ...incoming };

  if ('executionMode' in rules) {
    if (!ALLOWED_EXECUTION_MODES.includes(rules.executionMode)) {
      return { ok: false, error: `Invalid executionMode "${rules.executionMode}". Allowed: ${ALLOWED_EXECUTION_MODES.join(', ')}` };
    }
  }

  // Coerce numeric fields — reject NaN
  for (const key of NUMERIC_RULE_KEYS) {
    if (key in rules) {
      const n = parseFloat(rules[key]);
      if (isNaN(n)) return { ok: false, error: `Invalid value for "${key}": must be a number.` };
      rules[key] = n;
    }
  }

  return { ok: true, rules };
}

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
    const validation = validateRules(req.body);
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    if (userId != null) {
      const current = getUserRules(userId);
      const updated = { ...current, ...validation.rules };
      setUserRules(userId, updated);
      return res.status(200).json(updated);
    }
    // Global fallback
    const current = readRules();
    const updated = { ...current, ...validation.rules };
    fs.writeFileSync(RULES_FILE, JSON.stringify(updated, null, 2));
    return res.status(200).json(updated);
  }

  res.status(405).end();
}
