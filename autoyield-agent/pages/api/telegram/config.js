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

export default function handler(req, res) {
  if (req.method === 'GET') {
    const config = readConfig();
    // Mask token for display — never expose full token to the client
    const maskedToken = config.botToken
      ? config.botToken.replace(/^(.{6}).*(.{4})$/, '$1••••••••••••$2')
      : '';
    return res.status(200).json({
      hasToken: !!config.botToken,
      hasChatId: !!config.chatId,
      maskedToken,
      chatId: config.chatId,
    });
  }

  if (req.method === 'PUT') {
    const { botToken, chatId } = req.body || {};
    const current = readConfig();

    // Allow partial update: if field is empty string, keep existing value
    const updated = {
      botToken: botToken !== undefined && botToken !== '' ? botToken.trim() : current.botToken,
      chatId: chatId !== undefined && chatId !== '' ? chatId.trim() : current.chatId,
    };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2));
    return res.status(200).json({ ok: true });
  }

  // DELETE — clear config
  if (req.method === 'DELETE') {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ botToken: '', chatId: '' }, null, 2));
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
