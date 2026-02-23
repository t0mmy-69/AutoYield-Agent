import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'telegram.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return { botToken: '', chatId: '' };
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const stored = readConfig();
  const hasToken = !!stored.botToken;
  const hasChatId = !!stored.chatId;

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

  res.status(200).json({
    configured: hasToken && hasChatId,
    hasToken,
    hasChatId,
    webhookUrl,
  });
}
