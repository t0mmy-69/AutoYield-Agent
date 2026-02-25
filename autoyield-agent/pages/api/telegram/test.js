import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../../../lib/dataPath.js';

const CONFIG_PATH = path.join(DATA_DIR, 'telegram.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { botToken: '', chatId: '' };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const config = readConfig();
  const token = config.botToken;
  const chatId = config.chatId;

  if (!token) {
    return res.status(400).json({ error: 'Bot Token chưa được cấu hình. Vui lòng nhập Bot Token ở trên.' });
  }
  if (!chatId) {
    return res.status(400).json({ error: 'Chat ID chưa được cấu hình. Vui lòng nhập Chat ID ở trên.' });
  }

  const BASE_URL = `https://api.telegram.org/bot${token}`;

  try {
    const meRes = await axios.get(`${BASE_URL}/getMe`);
    const botName = meRes.data?.result?.first_name || 'Bot';
    const botUsername = meRes.data?.result?.username || '';

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
