import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'aprHistory.json');
const MAX_SNAPSHOTS = 24; // increased window for multi-protocol tracking

export function getHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function appendSnapshot(snapshot) {
  const history = getHistory();
  const normalized = normalizeSnapshot(snapshot);
  history.push(normalized);
  const trimmed = history.slice(-MAX_SNAPSHOTS);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  return trimmed;
}

// Handle both old { aaveAPR, compoundAPR } and new { aprs, best, bestAPR } formats
function normalizeSnapshot(s) {
  if (s.aprs) return s; // already new format
  // Legacy format migration
  const aprs = {};
  if (s.aaveAPR != null) aprs['aave'] = s.aaveAPR;
  if (s.compoundAPR != null) aprs['compound'] = s.compoundAPR;
  const bestAPR = Math.max(s.aaveAPR || 0, s.compoundAPR || 0);
  const best = (s.aaveAPR || 0) >= (s.compoundAPR || 0) ? 'aave' : 'compound';
  return { aprs, best, bestAPR, timestamp: s.timestamp };
}

// Delta array: (best available APR minus current protocol's APR) per snapshot
// Measures the opportunity cost of staying in the current protocol over time
export function getDeltaHistory(history, currentProtocol) {
  return history.map(h => {
    const s = normalizeSnapshot(h);
    const currentAPR = s.aprs[currentProtocol] ?? 0;
    return s.bestAPR - currentAPR;
  });
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

export function computeEmaDelta(history, currentProtocol, window = 6) {
  const deltas = getDeltaHistory(history, currentProtocol);
  return computeEMA(deltas, window);
}

// Momentum: change in delta over last N snapshots
export function computeMomentum(deltaHistory) {
  if (deltaHistory.length < 2) return 0;
  const recent = deltaHistory[deltaHistory.length - 1];
  const older = deltaHistory[Math.max(0, deltaHistory.length - 6)];
  return recent - older;
}

// Persistence: consecutive snapshots from end where delta > 0
export function computePersistence(deltaHistory) {
  let count = 0;
  for (let i = deltaHistory.length - 1; i >= 0; i--) {
    if (deltaHistory[i] > 0) count++;
    else break;
  }
  return count;
}

export function computeConfidenceScore(history, currentProtocol, rules) {
  if (history.length < 2) return 0;
  const deltaHistory = getDeltaHistory(history, currentProtocol);
  const emaDelta = computeEMA(deltaHistory, 6);
  const volatility = computeStdDev(deltaHistory);
  const persistence = computePersistence(deltaHistory);
  const persistenceFactor = Math.min(persistence / (rules.minPersistenceChecks || 4), 1.0);
  return parseFloat(((emaDelta / (volatility + 0.01)) * persistenceFactor).toFixed(4));
}
