import { answerCallbackQuery } from '../../../lib/telegramBot.js';
import { readState, writeState } from '../state.js';
import { appendHistory } from '../history.js';
import { getSigner, getUsdcBalance } from '../../../lib/agentWallet.js';
import { executeApproval } from '../approve.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const update = req.body;
  const callbackQuery = update?.callback_query;

  if (!callbackQuery) return res.status(200).json({ ok: true });

  const { id: callbackQueryId, data: callbackData } = callbackQuery;
  const state = readState();

  if (!state.pendingApproval) {
    await answerCallbackQuery(callbackQueryId, 'No pending approval found.');
    return res.status(200).json({ ok: true });
  }

  const decision = state.pendingApproval;
  const expectedId = decision.id;

  if (callbackData === `approve_${expectedId}`) {
    try {
      const signer = getSigner();
      const usdcBalance = await getUsdcBalance(await signer.getAddress());
      await executeApproval(decision, state, usdcBalance, signer);
      await answerCallbackQuery(callbackQueryId, '✅ Rotation executed!');
    } catch (err) {
      await answerCallbackQuery(callbackQueryId, `❌ Error: ${err.message}`);
    }
  } else if (callbackData === `reject_${expectedId}`) {
    appendHistory({ ...decision, action: 'NOOP', reason: 'User rejected via Telegram.', executedAt: Date.now() });
    writeState({ ...state, pendingApproval: null });
    await answerCallbackQuery(callbackQueryId, '❌ Rotation rejected.');
  } else {
    await answerCallbackQuery(callbackQueryId, 'Unknown action or stale decision.');
  }

  res.status(200).json({ ok: true });
}
