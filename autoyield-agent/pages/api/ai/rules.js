/**
 * POST /api/ai/rules
 * Natural Language Rules Builder — Feature A.
 *
 * Converts user's plain-text strategy description into a validated rules JSON
 * conforming to the internal schema. Falls back to default conservative rules
 * if AI is unavailable, so the UI always gets a usable response.
 */
import { buildRulesWithAI, fallbackRules } from '../../../lib/ai.js';
import { getSessionFromRequest } from '../../../lib/auth.js';

// Simple per-user/per-IP rate limit: max 1 AI call per 60 seconds
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = getSessionFromRequest(req);
  const userId = session?.userId ?? null;

  const rlKey = userId != null
    ? `user:${userId}`
    : `ip:${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'}`;

  const last = rateLimitMap.get(rlKey);
  if (last && Date.now() - last < RATE_LIMIT_MS) {
    return res.status(429).json({ error: 'Too many requests. Please wait 60 seconds between AI calls.' });
  }
  rateLimitMap.set(rlKey, Date.now());

  const { userText, currentRules, allowedProtocols, allowedChains } = req.body ?? {};

  if (!userText || typeof userText !== 'string' || !userText.trim()) {
    return res.status(400).json({ error: 'userText is required' });
  }

  // AI unavailable — return fallback immediately without calling the API
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ ...fallbackRules('AI not configured'), aiUnavailable: true });
  }

  try {
    const result = await buildRulesWithAI({
      userText: userText.trim(),
      currentRules: currentRules ?? null,
      allowedProtocols: Array.isArray(allowedProtocols) ? allowedProtocols : [],
      allowedChains: Array.isArray(allowedChains) ? allowedChains : [],
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[AI /rules error]', err.message);
    return res.status(200).json({ ...fallbackRules(err.message), error: err.message });
  }
}
