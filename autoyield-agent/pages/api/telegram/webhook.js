import fs from 'fs';
import path from 'path';
import { answerCallbackQuery } from '../../../lib/telegramBot.js';
import { readStateForUser, writeStateForUser } from '../state.js';
import { appendHistoryForUser } from '../history.js';
import { getSigner, getUsdcBalance } from '../../../lib/agentWallet.js';
import { getUserSigner, getUserUsdcBalance } from '../../../lib/userWallet.js';
import { isTelegramCallbackProcessed, markTelegramCallbackProcessed } from '../../../lib/db.js';
import { executeApproval } from '../approve.js';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'telegram.json');

function getTelegramChatId() {
  try {
    const stored = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (stored.chatId) return String(stored.chatId);
  } catch {}
  return process.env.TELEGRAM_CHAT_ID ? String(process.env.TELEGRAM_CHAT_ID) : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── Webhook secret verification (set via Telegram setWebhook secret_token) ──
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const provided = req.headers['x-telegram-bot-api-secret-token'];
    if (provided !== webhookSecret) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const update = req.body;
  const callbackQuery = update?.callback_query;
  if (!callbackQuery) return res.status(200).json({ ok: true });

  const { id: callbackQueryId, data: callbackData, from: fromUser } = callbackQuery;

  // ── Replay prevention — reject already-processed callback IDs ─────────────
  if (isTelegramCallbackProcessed(callbackQueryId)) {
    await answerCallbackQuery(callbackQueryId, 'Already processed.');
    return res.status(200).json({ ok: true });
  }

  // ── ChatId verification — only configured owner can approve ───────────────
  const authorizedChatId = getTelegramChatId();
  if (authorizedChatId && String(fromUser?.id) !== authorizedChatId) {
    await answerCallbackQuery(callbackQueryId, '⛔ Unauthorized. Only the account owner can approve.');
    return res.status(200).json({ ok: true });
  }

  // ── Resolve userId (encoded in callback data for per-user decisions) ───────
  // Format: approve_{decisionId} or approve_{decisionId}_{userId}
  let userId = null;
  if (callbackData) {
    const match = callbackData.match(/_(\d+)$/);
    const potentialId = match ? parseInt(match[1]) : null;
    // If the decision id itself is also numeric, we need to distinguish:
    // decision id = "decision_1234567890" → last token after split('_') is timestamp
    // userId is appended as a separate integer after the decision id
    // We store userId explicitly in the decision object so we can read it from state
  }

  const state = readStateForUser(null); // Try global state first
  let resolvedState = state;
  let resolvedUserId = null;

  // Check global pending approval
  if (state.pendingApproval) {
    resolvedUserId = state.pendingApproval.userId ?? null;
    if (resolvedUserId) {
      // Load the correct per-user state
      resolvedState = readStateForUser(resolvedUserId);
    }
  }

  if (!resolvedState.pendingApproval) {
    await answerCallbackQuery(callbackQueryId, 'No pending approval found.');
    return res.status(200).json({ ok: true });
  }

  const decision = resolvedState.pendingApproval;
  const expectedId = decision.id;

  // ── Expiry check ───────────────────────────────────────────────────────────
  if (decision.expiresAt && Date.now() > decision.expiresAt) {
    appendHistoryForUser(resolvedUserId, {
      ...decision, action: 'NOOP', reason: 'Telegram approval window expired.', executedAt: Date.now(),
    });
    writeStateForUser(resolvedUserId, { ...resolvedState, pendingApproval: null });
    await answerCallbackQuery(callbackQueryId, '⏰ Approval window (30 min) expired. Run a new check.');
    return res.status(200).json({ ok: true });
  }

  const isApprove = callbackData === `approve_${expectedId}`;
  const isReject = callbackData === `reject_${expectedId}`;

  // Mark as processed BEFORE execution to prevent double-execution on Telegram retry
  markTelegramCallbackProcessed(callbackQueryId);

  if (isApprove) {
    try {
      let signer;
      if (resolvedUserId != null) {
        signer = getUserSigner(resolvedUserId);
      } else {
        signer = getSigner();
      }
      const usdcBalance = resolvedUserId != null
        ? await getUserUsdcBalance(resolvedUserId)
        : await getUsdcBalance(await signer.getAddress());

      await executeApproval(decision, resolvedState, usdcBalance, signer, resolvedUserId);
      await answerCallbackQuery(callbackQueryId, '✅ Rotation executed successfully!');
    } catch (err) {
      await answerCallbackQuery(callbackQueryId, `❌ Execution failed: ${err.message}`);
    }
  } else if (isReject) {
    appendHistoryForUser(resolvedUserId, {
      ...decision, action: 'NOOP', reason: 'User rejected via Telegram.', executedAt: Date.now(),
    });
    writeStateForUser(resolvedUserId, { ...resolvedState, pendingApproval: null });
    await answerCallbackQuery(callbackQueryId, '❌ Rotation rejected.');
  } else {
    await answerCallbackQuery(callbackQueryId, 'Unknown action or stale decision.');
  }

  res.status(200).json({ ok: true });
}
