import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'aprHistory.json');
const MAX_SNAPSHOTS = 12;

export function getHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function appendSnapshot(snapshot) {
  const history = getHistory();
  history.push(snapshot);
  const trimmed = history.slice(-MAX_SNAPSHOTS);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  return trimmed;
}

// Exponential Moving Average
export function computeEMA(values, window) {
  if (values.length === 0) return 0;
  const k = 2 / (window + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

// Standard deviation
export function computeStdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Get delta array from history: compoundAPR - aaveAPR for each snapshot
export function getDeltaHistory(history) {
  return history.map(h => h.compoundAPR - h.aaveAPR);
}

export function computeEmaDelta(history, window = 6) {
  const deltas = getDeltaHistory(history);
  return computeEMA(deltas, window);
}

// Momentum: change in delta over last 6 snapshots
export function computeMomentum(deltaHistory) {
  if (deltaHistory.length < 2) return 0;
  const recent = deltaHistory[deltaHistory.length - 1];
  const older = deltaHistory[Math.max(0, deltaHistory.length - 6)];
  return recent - older;
}

// Persistence: count consecutive snapshots from end where delta > 0
export function computePersistence(deltaHistory) {
  let count = 0;
  for (let i = deltaHistory.length - 1; i >= 0; i--) {
    if (deltaHistory[i] > 0) count++;
    else break;
  }
  return count;
}

export function computeConfidenceScore(history, rules) {
  if (history.length < 2) return 0;
  const deltaHistory = getDeltaHistory(history);
  const emaDelta = computeEmaDelta(history, 6);
  const volatility = computeStdDev(deltaHistory);
  const persistence = computePersistence(deltaHistory);
  const persistenceFactor = Math.min(persistence / (rules.minPersistenceChecks || 4), 1.0);
  const score = (emaDelta / (volatility + 0.01)) * persistenceFactor;
  return parseFloat(score.toFixed(4));
}
