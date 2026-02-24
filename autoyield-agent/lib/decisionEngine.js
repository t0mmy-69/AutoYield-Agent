import crypto from 'crypto';
import {
  getDeltaHistory,
  computeEmaDelta,
  computeMomentum,
  computeStdDev,
  computePersistence,
} from './aprHistory.js';

/** Generate a cryptographically random, unpredictable decision ID. */
function randomDecisionId() {
  return `decision_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Main decision engine — 6 steps as defined in spec.
 * Supports N protocols dynamically via aprSnapshot.aprs map.
 * Returns a decision object with action ROTATE or NOOP + full reasoning.
 */
export function runDecisionEngine({ state, aprSnapshot, history, rules, gasCostUsd }) {
  const { aprs, best: target, bestAPR: targetAPR } = aprSnapshot;
  const { currentProtocol, lastMoveTimestamp } = state;
  const userBalance = state.userBalance || 0;

  // ── Step 1: Determine target protocol ───────────────────────────────────
  const currentAPR = aprs[currentProtocol] ?? 0;
  const deltaPct = parseFloat((targetAPR - currentAPR).toFixed(4));

  if (deltaPct <= 0 || target === currentProtocol) {
    return noop({ deltaPct, aprSnapshot, gasCostUsd, currentProtocol, reason: 'Current protocol already has highest APR. No rotation needed.' });
  }

  if (deltaPct < (rules.minDeltaPct || 0.4)) {
    return noop({ deltaPct, aprSnapshot, gasCostUsd, currentProtocol, reason: `Delta +${deltaPct}% below minimum threshold ${rules.minDeltaPct}%.` });
  }

  // ── Step 2: Capital threshold check ─────────────────────────────────────
  const requiredCapital = gasCostUsd / (deltaPct / 100);
  if (userBalance < requiredCapital) {
    return noop({ deltaPct, aprSnapshot, gasCostUsd, currentProtocol, reason: `Balance $${userBalance.toFixed(0)} below required capital $${requiredCapital.toFixed(0)} to justify gas at this delta.` });
  }

  // ── Step 3: Annual profitability model ───────────────────────────────────
  const projectedAnnualGain = userBalance * (deltaPct / 100);
  const expectedRotationsPerYear = rules.maxMovesPerYear || 52;
  const expectedAnnualGasCost = gasCostUsd * expectedRotationsPerYear;

  if (projectedAnnualGain <= expectedAnnualGasCost) {
    return noop({ deltaPct, aprSnapshot, gasCostUsd, currentProtocol, projectedAnnualGain, expectedAnnualGasCost, reason: `Annual gain $${projectedAnnualGain.toFixed(2)} does not exceed expected annual gas cost $${expectedAnnualGasCost.toFixed(2)}.` });
  }

  // ── Step 4: Trend analysis and confidence scoring ────────────────────────
  const deltaHistory = getDeltaHistory(history, currentProtocol);
  const emaDelta = parseFloat(computeEmaDelta(history, currentProtocol, 6).toFixed(4));
  const momentum = parseFloat(computeMomentum(deltaHistory).toFixed(4));
  const deltaVolatility = parseFloat(computeStdDev(deltaHistory).toFixed(4));
  const persistence = computePersistence(deltaHistory);
  const persistenceFactor = Math.min(persistence / (rules.minPersistenceChecks || 4), 1.0);
  const confidenceScore = parseFloat(((emaDelta / (deltaVolatility + 0.01)) * persistenceFactor).toFixed(4));

  if (emaDelta <= 0) {
    return noop({ deltaPct, emaDelta, momentum, deltaVolatility, confidenceScore, persistence, aprSnapshot, gasCostUsd, currentProtocol, reason: 'EMA-smoothed delta is negative — current snapshot may be a transient spike.' });
  }

  if (confidenceScore < (rules.confidenceThreshold || 0.6)) {
    return noop({ deltaPct, emaDelta, momentum, deltaVolatility, confidenceScore, persistence, aprSnapshot, gasCostUsd, currentProtocol, reason: `Confidence score ${confidenceScore.toFixed(2)} below threshold ${rules.confidenceThreshold}. Delta is present but not sufficiently stable or persistent.` });
  }

  // ── Step 5: Cooldown check ───────────────────────────────────────────────
  if (lastMoveTimestamp) {
    const minutesSinceLastMove = (Date.now() - lastMoveTimestamp) / 60000;
    if (minutesSinceLastMove < (rules.cooldownMinutes || 60)) {
      return noop({ deltaPct, emaDelta, momentum, deltaVolatility, confidenceScore, persistence, aprSnapshot, gasCostUsd, currentProtocol, reason: `Cooldown active. Last move was ${minutesSinceLastMove.toFixed(0)} min ago. Required cooldown: ${rules.cooldownMinutes} min.` });
    }
  }

  // ── Step 6: Safety checks ────────────────────────────────────────────────
  if (gasCostUsd > (rules.maxGasUsdPerMove || 2.0)) {
    return noop({ deltaPct, emaDelta, momentum, deltaVolatility, confidenceScore, persistence, aprSnapshot, gasCostUsd, currentProtocol, reason: `Gas cost $${gasCostUsd.toFixed(2)} exceeds maximum allowed $${rules.maxGasUsdPerMove}.` });
  }

  if (userBalance > (rules.maxTotalValueUsd || 50000)) {
    return noop({ deltaPct, emaDelta, momentum, deltaVolatility, confidenceScore, persistence, aprSnapshot, gasCostUsd, currentProtocol, reason: `Balance $${userBalance.toFixed(0)} exceeds safety cap $${rules.maxTotalValueUsd}. Manual review recommended.` });
  }

  // ── ROTATE ───────────────────────────────────────────────────────────────
  return {
    action: 'ROTATE',
    from: currentProtocol,
    to: target,
    fromAPR: currentAPR,
    toAPR: targetAPR,
    deltaPct,
    emaDelta,
    momentum,
    deltaVolatility,
    gasCostUsd,
    projectedAnnualGain: parseFloat(projectedAnnualGain.toFixed(2)),
    expectedAnnualGasCost: parseFloat(expectedAnnualGasCost.toFixed(2)),
    netAnnualGain: parseFloat((projectedAnnualGain - expectedAnnualGasCost).toFixed(2)),
    confidenceScore,
    persistenceChecks: persistence,
    allAPRs: aprs,
    reason: `Delta +${deltaPct}% (EMA ${emaDelta}%) stable for ${persistence} checks. Confidence ${confidenceScore.toFixed(2)} >= threshold ${rules.confidenceThreshold}. Annual net gain $${(projectedAnnualGain - expectedAnnualGasCost).toFixed(2)}.`,
    timestamp: Date.now(),
    id: randomDecisionId(),
  };
}

function noop(context) {
  const {
    deltaPct = 0, emaDelta = 0, momentum = 0, deltaVolatility = 0,
    confidenceScore = 0, persistence = 0, gasCostUsd = 0,
    projectedAnnualGain = 0, expectedAnnualGasCost = 0,
    aprSnapshot, reason,
  } = context;
  return {
    action: 'NOOP',
    from: null,
    to: null,
    deltaPct,
    emaDelta,
    momentum,
    deltaVolatility,
    gasCostUsd,
    projectedAnnualGain: parseFloat((projectedAnnualGain || 0).toFixed(2)),
    expectedAnnualGasCost: parseFloat((expectedAnnualGasCost || 0).toFixed(2)),
    netAnnualGain: 0,
    confidenceScore,
    persistenceChecks: persistence,
    allAPRs: aprSnapshot?.aprs || {},
    reason,
    timestamp: Date.now(),
    id: randomDecisionId(),
  };
}
