import axios from 'axios';

const BASE_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendApprovalMessage(decision) {
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
    await axios.post(`${BASE_URL}/sendMessage`, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (err) {
    console.error('Telegram sendMessage failed:', err.message);
  }
}

export async function answerCallbackQuery(callbackQueryId, text) {
  try {
    await axios.post(`${BASE_URL}/answerCallbackQuery`, {
      callback_query_id: callbackQueryId,
      text,
    });
  } catch (err) {
    console.error('answerCallbackQuery failed:', err.message);
  }
}
