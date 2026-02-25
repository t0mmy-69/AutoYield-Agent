/**
 * AI layer — Natural Language Rules Builder + Decision Explainer.
 *
 * Safety contract (enforced here, not negotiable):
 * - AI NEVER changes decision.action (NOOP/ROTATE)
 * - AI NEVER fabricates numbers — only explains provided data
 * - All outputs are validated JSON; unknown fields are stripped
 * - Fallback templates are returned when AI is unavailable or fails
 */
import axios from 'axios';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-haiku-4-5-20251001'; // fast + cheap for explainer/rules

// ─── Fallback templates (used when AI unavailable or throws) ──────────────────

/**
 * Deterministic fallback for decision explainer.
 * Uses the exact template strings defined in the spec (Section 9).
 */
export function fallbackExplanation(decision) {
  const {
    action, from, to,
    deltaPct = 0,
    gasCostUsd = 0,
    netAnnualGain = 0,
    confidenceScore = 0,
    projectedAnnualGain = 0,
  } = decision ?? {};

  let text;
  if (action === 'NOOP') {
    text = `NOOP: delta ${deltaPct}% does not justify gas $${gasCostUsd}. `
         + `Required capital not met or constraints failed. `
         + `Confidence ${confidenceScore}.`;
  } else {
    text = `ROTATE ${(from ?? '?').toUpperCase()} -> ${(to ?? '?').toUpperCase()}: `
         + `delta ${deltaPct}%, est gas $${gasCostUsd}, `
         + `net annual benefit $${netAnnualGain}, `
         + `confidence ${confidenceScore}.`;
  }
  return { uiText: text, telegramText: text, adminNote: text };
}

/**
 * Fallback for rules builder — returns null rules (caller uses DEFAULT_RULES).
 */
export function fallbackRules(reason = 'AI unavailable') {
  return {
    rules: null,
    explanation: `${reason}. Conservative default rules will be applied.`,
    warnings: ['AI unavailable, default conservative rules applied.'],
  };
}

// ─── Internal Claude API call ─────────────────────────────────────────────────

async function callClaude(systemPrompt, userMessage, maxTokens = 512) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      timeout: 20000,
    }
  );

  const raw = response.data?.content?.[0]?.text ?? '';
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

// ─── Feature A: Natural Language Rules Builder ────────────────────────────────

const RULES_SYSTEM_PROMPT = `You are a configuration assistant for a DeFi agent wallet.
Convert the user's preferences into STRICT JSON matching the provided schema.
Output JSON only with keys: rules, explanation, warnings.
Do not invent protocols, chains, or fields not in schema.
If user request is unsafe or impossible, choose the safest valid config and add warnings.`;

/** Internal flat schema shown to the model. */
const RULES_SCHEMA_DESCRIPTION = `Output rules schema (flat JSON, exact keys only):
{
  "minDeltaPct": number,          // min APR delta % to trigger rotation (default 0.4, min 0.1)
  "cooldownMinutes": number,      // minimum minutes between moves (default 60, min 10)
  "maxGasUsdPerMove": number,     // max gas cost USD per rotation (default 2.0, min 0.05)
  "maxMovesPerYear": number,      // max rotations per year (default 52, max 365)
  "maxTotalValueUsd": number,     // safety cap in USD (default 50000, min 100)
  "confidenceThreshold": number,  // 0.0–1.0 confidence score minimum (default 0.6)
  "minPersistenceChecks": number, // consecutive checks needed before rotating (default 4, min 1)
  "executionMode": string,        // "manual_confirm" | "telegram_approval" | "auto"
  "protocolAllowlist": string[]   // [] = allow all; e.g. ["aave", "compound"] to restrict
}`;

/** Allowed keys — strip anything else the model invents. */
const ALLOWED_RULE_KEYS = new Set([
  'minDeltaPct', 'cooldownMinutes', 'maxGasUsdPerMove', 'maxMovesPerYear',
  'maxTotalValueUsd', 'confidenceThreshold', 'minPersistenceChecks',
  'executionMode', 'protocolAllowlist',
]);

const VALID_EXECUTION_MODES = new Set(['manual_confirm', 'telegram_approval', 'auto']);

/**
 * Feature A: Convert natural language to validated rules JSON.
 * Returns { rules, explanation, warnings }.
 */
export async function buildRulesWithAI({ userText, currentRules, allowedProtocols = [], allowedChains = [] }) {
  const userMessage = [
    `User strategy: "${userText}"`,
    '',
    RULES_SCHEMA_DESCRIPTION,
    '',
    `Allowed protocol IDs: ${JSON.stringify(allowedProtocols)}`,
    `Available chains: ${JSON.stringify(allowedChains)}`,
    currentRules ? `Current rules (as context): ${JSON.stringify(currentRules)}` : '',
    '',
    'Return JSON only: { "rules": { ...flat rules... }, "explanation": "3-5 sentences", "warnings": ["..."] }',
  ].filter(Boolean).join('\n');

  const result = await callClaude(RULES_SYSTEM_PROMPT, userMessage, 1024);

  if (!result.rules || typeof result.rules !== 'object') {
    throw new Error('AI returned invalid rules object');
  }

  const r = result.rules;
  const warnings = Array.isArray(result.warnings) ? [...result.warnings] : [];

  // ── Clamp unsafe values ────────────────────────────────────────────────────
  if (r.maxGasUsdPerMove != null)      r.maxGasUsdPerMove      = Math.max(0.05, Number(r.maxGasUsdPerMove));
  if (r.cooldownMinutes != null)       r.cooldownMinutes       = Math.max(10,   Number(r.cooldownMinutes));
  if (r.maxMovesPerYear != null)       r.maxMovesPerYear       = Math.min(365,  Math.max(1, Number(r.maxMovesPerYear)));
  if (r.minDeltaPct != null)           r.minDeltaPct           = Math.max(0.1,  Number(r.minDeltaPct));
  if (r.confidenceThreshold != null)   r.confidenceThreshold   = Math.min(1.0,  Math.max(0, Number(r.confidenceThreshold)));
  if (r.minPersistenceChecks != null)  r.minPersistenceChecks  = Math.max(1,    Math.round(Number(r.minPersistenceChecks)));
  if (r.maxTotalValueUsd != null && r.maxTotalValueUsd < 100) {
    r.maxTotalValueUsd = 100;
    warnings.push('maxTotalValueUsd was too low — set to minimum $100.');
  }

  // ── Validate executionMode ─────────────────────────────────────────────────
  if (r.executionMode && !VALID_EXECUTION_MODES.has(r.executionMode)) {
    warnings.push(`Unknown executionMode "${r.executionMode}" — defaulting to "manual_confirm".`);
    r.executionMode = 'manual_confirm';
  }

  // ── Validate protocolAllowlist ─────────────────────────────────────────────
  if (Array.isArray(r.protocolAllowlist) && r.protocolAllowlist.length > 0 && allowedProtocols.length > 0) {
    const invalid = r.protocolAllowlist.filter(p => !allowedProtocols.includes(p));
    if (invalid.length > 0) {
      warnings.push(`Protocols not in registry were removed from allowlist: ${invalid.join(', ')}`);
      r.protocolAllowlist = r.protocolAllowlist.filter(p => allowedProtocols.includes(p));
    }
  }

  // ── Strip keys not in schema ───────────────────────────────────────────────
  for (const k of Object.keys(r)) {
    if (!ALLOWED_RULE_KEYS.has(k)) delete r[k];
  }

  return {
    rules: r,
    explanation: typeof result.explanation === 'string' ? result.explanation : '',
    warnings,
  };
}

// ─── Feature B: Decision Explainer ───────────────────────────────────────────

const EXPLAIN_SYSTEM_PROMPT = `You are an explanation assistant.
You will be given a decision object produced by a deterministic engine.
You MUST NOT change the decision action.
You only explain why it happened using the provided numbers and check results.
Return JSON only with keys: uiText, telegramText, adminNote.
Keep it factual and short.
- uiText: 2-4 sentences for the dashboard UI
- telegramText: 1-2 short sentences, actionable, for Telegram message
- adminNote: 1-3 sentences for admin execution log
Always mention: deltaPct, gasCostUsd, netAnnualGain (or netAnnualBenefitUsd), confidenceScore.`;

/**
 * Feature B: Explain a deterministic decision in human language.
 * Returns { uiText, telegramText, adminNote }.
 * NEVER modifies decision.action.
 */
export async function explainDecision(decision, userContext = {}) {
  const safeDecision = {
    action: decision.action,        // read-only — explainer cannot change this
    from: decision.from,
    to: decision.to,
    deltaPct: decision.deltaPct,
    emaDelta: decision.emaDelta,
    gasCostUsd: decision.gasCostUsd,
    projectedAnnualGain: decision.projectedAnnualGain,
    expectedAnnualGasCost: decision.expectedAnnualGasCost,
    netAnnualGain: decision.netAnnualGain,
    confidenceScore: decision.confidenceScore,
    persistenceChecks: decision.persistenceChecks,
    reason: decision.reason,
  };

  const userMessage = [
    `Decision: ${JSON.stringify(safeDecision)}`,
    `User context: ${JSON.stringify(userContext)}`,
    '',
    'Return JSON only: { "uiText": "...", "telegramText": "...", "adminNote": "..." }',
  ].join('\n');

  const result = await callClaude(EXPLAIN_SYSTEM_PROMPT, userMessage, 512);

  if (!result.uiText || !result.telegramText || !result.adminNote) {
    throw new Error('AI returned incomplete explanation');
  }

  return {
    uiText: String(result.uiText),
    telegramText: String(result.telegramText),
    adminNote: String(result.adminNote),
  };
}
