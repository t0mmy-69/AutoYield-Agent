import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN is not configured in .env.local' });
  }
  if (!chatId || chatId === 'YOUR_CHAT_ID_HERE') {
    return res.status(400).json({ error: 'TELEGRAM_CHAT_ID is not configured in .env.local' });
  }

  const BASE_URL = `https://api.telegram.org/bot${token}`;

  try {
    // Verify bot token is valid via getMe
    const meRes = await axios.get(`${BASE_URL}/getMe`);
    const botName = meRes.data?.result?.first_name || 'Bot';
    const botUsername = meRes.data?.result?.username || '';

    // Send a test message
    await axios.post(`${BASE_URL}/sendMessage`, {
      chat_id: chatId,
      text:
        `✅ *AutoYield Agent — Telegram Connected*\n\n` +
        `Your bot is set up correctly.\n` +
        `You will receive ROTATE approval requests here when execution mode is set to *Telegram Approval*.`,
      parse_mode: 'Markdown',
    });

    return res.status(200).json({
      ok: true,
      botName,
      botUsername,
      message: `Test message sent to chat ${chatId}`,
    });
  } catch (err) {
    const detail = err.response?.data?.description || err.message;
    return res.status(500).json({ error: `Telegram API error: ${detail}` });
  }
}
