export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE';
  const hasChatId = !!process.env.TELEGRAM_CHAT_ID && process.env.TELEGRAM_CHAT_ID !== 'YOUR_CHAT_ID_HERE';

  // Build webhook URL from request host
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
