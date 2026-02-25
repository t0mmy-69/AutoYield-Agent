/**
 * POST /api/ai/explain
 * Decision Explainer — Feature B.
 *
 * Returns human-readable explanation of a deterministic engine decision.
 * Results are cached per decision ID to avoid redundant API calls.
 * Always returns a response (fallback templates if AI unavailable/fails).
 *
 * Safety: AI cannot change decision.action — it only explains given data.
 */
import { explainDecision, fallbackExplanation } from '../../../lib/ai.js';
import { getCachedAiExplanation, saveAiExplanation } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { decision, userContext } = req.body ?? {};

  if (!decision || !decision.id) {
    return res.status(400).json({ error: 'decision object with id is required' });
  }

  // Return cached result if available
  const cached = getCachedAiExplanation(decision.id);
  if (cached) return res.status(200).json({ ...cached, cached: true });

  // AI unavailable — return fallback immediately
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ ...fallbackExplanation(decision), aiUnavailable: true });
  }

  try {
    const result = await explainDecision(decision, userContext ?? {});
    saveAiExplanation(decision.id, result);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[AI /explain error]', err.message);
    const fb = fallbackExplanation(decision);
    return res.status(200).json({ ...fb, error: err.message });
  }
}
