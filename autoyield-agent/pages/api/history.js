import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'history.json');

export function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function appendHistory(entry) {
  const history = readHistory();
  history.unshift(entry); // newest first
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.status(200).json(readHistory());
}
