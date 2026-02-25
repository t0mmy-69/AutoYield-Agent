/**
 * POST /api/telegram
 * Telegram webhook — receives callback queries when users click Approve/Reject
 * in the Telegram approval message sent by sendApprovalMessage().
 *
 * Setup: set your webhook URL in Telegram to:
 *   https://<your-domain>/api/telegram
 * with optional secret token via TELEGRAM_WEBHOOK_SECRET env var.
 */
import { isTelegramCallbackProcessed, markTelegramCallbackProcessed } from '../../lib/db.js';
import { answerCallbackQuery } from '../../lib/telegramBot.js';
import { getUserSigner, getUserUsdcBalance } from '../../lib/userWallet.js';
import { getSigner, getUsdcBalance } from '../../lib/agentWallet.js';
import { readStateForUser, writeStateForUser } from './state.js';
import { appendHistoryForUser } from './history.js';
import { executeApproval } from './approve.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Verify webhook secret if configured
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers['x-telegram-bot-api-secret-token'];
    if (provided !== secret) return res.status(403).end();
  }

  const update = req.body;
  const callbackQuery = update?.callback_query;

  // Not a button click (e.g. regular message) — ack and ignore
  if (!callbackQuery) return res.status(200).end();

  const callbackQueryId = String(callbackQuery.id);
  const callbackData = callbackQuery.data || '';

  // Replay prevention: each callback_query_id is only processed once
  if (isTelegramCallbackProcessed(callbackQueryId)) {
    await answerCallbackQuery(callbackQueryId, 'Already processed.');
    return res.status(200).end();
  }
  markTelegramCallbackProcessed(callbackQueryId);

  // Parse callback_data: "approve|{userId}|{decisionId}" or "reject|{userId}|{decisionId}"
  const parts = callbackData.split('|');
  if (parts.length !== 3) {
    await answerCallbackQuery(callbackQueryId, 'Unrecognized callback format.');
    return res.status(200).end();
  }
  const [action, rawUserId, decisionId] = parts;

  if (action !== 'approve' && action !== 'reject') {
    return res.status(200).end();
  }

  const userId = rawUserId === 'null' ? null : (parseInt(rawUserId) || null);

  const state = readStateForUser(userId);

  if (!state.pendingApproval) {
    await answerCallbackQuery(callbackQueryId, 'No pending approval found — may have already been executed or expired.');
    return res.status(200).end();
  }

  const decision = state.pendingApproval;

  // Validate the decision ID matches what was sent
  if (decision.id !== decisionId) {
    await answerCallbackQuery(callbackQueryId, 'Decision ID mismatch — this approval may have been superseded.');
    return res.status(200).end();
  }

  // Check expiry
  if (decision.expiresAt && Date.now() > decision.expiresAt) {
    writeStateForUser(userId, { ...state, pendingApproval: null });
    appendHistoryForUser(userId, {
      ...decision, action: 'NOOP',
      reason: 'Telegram approval expired.',
      executedAt: Date.now(),
    });
    await answerCallbackQuery(callbackQueryId, 'Approval window has expired. Run a new check to get a fresh decision.');
    return res.status(200).end();
  }

  // Reject
  if (action === 'reject') {
    writeStateForUser(userId, { ...state, pendingApproval: null });
    appendHistoryForUser(userId, {
      ...decision, action: 'NOOP',
      reason: 'Rejected via Telegram.',
      executedAt: Date.now(),
    });
    await answerCallbackQuery(callbackQueryId, 'Rotation rejected.');
    return res.status(200).json({ ok: true, action: 'rejected' });
  }

  // Approve — execute rotation
  try {
    let signer;
    if (userId != null) {
      signer = getUserSigner(userId);
    } else {
      signer = getSigner();
    }
    const usdcBalance = userId != null
      ? await getUserUsdcBalance(userId)
      : await getUsdcBalance(await signer.getAddress());

    const result = await executeApproval(decision, state, usdcBalance, signer, userId);
    const shortTx = result.txHash ? `${result.txHash.slice(0, 10)}…` : '(pending)';
    await answerCallbackQuery(callbackQueryId, `Rotation executed! TX: ${shortTx}`);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[Telegram webhook] executeApproval failed:', err.message);
    await answerCallbackQuery(callbackQueryId, `Execution failed: ${err.message.slice(0, 100)}`);
    return res.status(200).json({ ok: false, error: err.message });
  }
}
