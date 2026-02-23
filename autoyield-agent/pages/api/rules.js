import fs from 'fs';
import path from 'path';

const RULES_FILE = path.join(process.cwd(), 'data', 'rules.json');

export function readRules() {
  return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(readRules());
  }
  if (req.method === 'PUT') {
    const current = readRules();
    const updated = { ...current, ...req.body };
    fs.writeFileSync(RULES_FILE, JSON.stringify(updated, null, 2));
    return res.status(200).json(updated);
  }
  res.status(405).end();
}
