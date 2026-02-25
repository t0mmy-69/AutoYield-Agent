import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './dataPath.js';

const CONFIG_PATH = path.join(DATA_DIR, 'telegram.json');

function getTelegramConfig() {
  try {
    const stored = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (stored.botToken && stored.chatId) return stored;
  } catch {}
  // Fallback to env vars
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  };
}

/**
 * Send a Telegram approval message for a ROTATE decision.
 *
 * @param {object} decision       - Decision object (with expiresAt and userId embedded).
 * @param {string|null} customText - AI-generated telegram text (1-2 sentences).
 *   If provided, replaces the default stats block. Approve/Reject buttons always appended.
 */
export async function sendApprovalMessage(decision, customText = null) {
  const { botToken, chatId } = getTelegramConfig();
  if (!botToken || !chatId) {
    console.warn('Telegram not configured — skipping approval message');
    return;
  }

  const { from, to, deltaPct, emaDelta, gasCostUsd, projectedAnnualGain, confidenceScore, id, userId } = decision;
  const fromLabel = from?.toUpperCase() || '?';
  const toLabel = to?.toUpperCase() || '?';
  // Encode userId so the webhook can resolve which user's state to update.
  // Format: "approve|{userId}|{decisionId}" — pipe-separated to avoid ambiguity with underscores.
  const uid = userId != null ? String(userId) : 'null';

  // Use AI-generated text when available; fall back to deterministic stats block.
  const body = customText
    ? String(customText)
    : `From: *${fromLabel}* → *${toLabel}*\n` +
      `Delta: +${deltaPct}% (EMA: ${emaDelta}%)\n` +
      `Confidence: ${confidenceScore}\n` +
      `Gas: ~$${gasCostUsd}\n` +
      `Projected Annual Gain: $${projectedAnnualGain}`;

  const text =
    `🤖 *AutoYield Decision: ROTATE*\n\n` +
    `${body}\n\n` +
    `Approve to execute the rotation now.`;

  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Approve', callback_data: `approve|${uid}|${id}` },
      { text: '❌ Reject', callback_data: `reject|${uid}|${id}` },
    ]],
  };

  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Telegram sendMessage failed:', err.message);
  }
}

export async function answerCallbackQuery(callbackQueryId, text) {
  const { botToken } = getTelegramConfig();
  if (!botToken) return;
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      callback_query_id: callbackQueryId,
      text,
    });
  } catch (err) {
    console.error('answerCallbackQuery failed:', err.message);
  }
}
