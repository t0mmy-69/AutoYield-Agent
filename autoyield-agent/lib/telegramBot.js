import axios from 'axios';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'telegram.json');

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

export async function sendApprovalMessage(decision) {
  const { botToken, chatId } = getTelegramConfig();
  if (!botToken || !chatId) {
    console.warn('Telegram not configured — skipping approval message');
    return;
  }

  const { from, to, deltaPct, emaDelta, gasCostUsd, projectedAnnualGain, confidenceScore, id } = decision;
  const fromLabel = from?.toUpperCase() || '?';
  const toLabel = to?.toUpperCase() || '?';

  const text =
    `🤖 *AutoYield Decision: ROTATE*\n\n` +
    `From: *${fromLabel}* → *${toLabel}*\n` +
    `Delta: +${deltaPct}% (EMA: ${emaDelta}%)\n` +
    `Confidence: ${confidenceScore}\n` +
    `Gas: ~$${gasCostUsd}\n` +
    `Projected Annual Gain: $${projectedAnnualGain}\n\n` +
    `Approve to execute the rotation now.`;

  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Approve', callback_data: `approve_${id}` },
      { text: '❌ Reject', callback_data: `reject_${id}` },
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
