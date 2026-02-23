import dappStyles from '../styles/Dapp.module.css';

export default function APRPanel({ aprData }) {
  const { aaveAPR, compoundAPR, delta, emaDelta, momentum, confidenceScore, confidenceThreshold } = aprData || {};

  const momentumIcon = momentum > 0 ? '▲' : momentum < 0 ? '▼' : '—';
  const momentumColor = momentum > 0 ? '#00d395' : momentum < 0 ? '#ef4444' : '#94a3b8';
  const confidencePct = Math.min(Math.max((confidenceScore || 0) / 2 * 100, 0), 100); // normalize to 0-100

  return (
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Live APR AI Analysis</h2>
      </div>

      <div style={styles.protocolRow}>
        <div style={styles.protocol}>
          <div style={{ ...styles.protocolName, color: '#b6509e' }}>AAVE</div>
          <div style={styles.apr}>{aaveAPR?.toFixed(2) ?? '—'}%</div>
        </div>
        <div style={styles.vs}>VS</div>
        <div style={styles.protocol}>
          <div style={{ ...styles.protocolName, color: '#00d395' }}>COMPOUND</div>
          <div style={styles.apr}>{compoundAPR?.toFixed(2) ?? '—'}%</div>
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.row}>
        <span style={styles.label}>Raw Delta</span>
        <span style={{ color: delta > 0 ? '#00d395' : '#94a3b8', fontWeight: 600 }}>
          {delta != null ? `+${delta.toFixed(3)}%` : '—'}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>EMA Delta (Smoothed)</span>
        <span style={{ color: emaDelta > 0 ? '#00d395' : '#94a3b8', fontWeight: 600 }}>
          {emaDelta != null ? `${emaDelta >= 0 ? '+' : ''}${emaDelta.toFixed(3)}%` : '—'}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Momentum</span>
        <span style={{ color: momentumColor, fontWeight: 600 }}>
          {momentumIcon} {momentum != null ? momentum.toFixed(4) : '—'}
        </span>
      </div>

      <div style={{ ...styles.row, marginTop: 16 }}>
        <span style={styles.label}>AI Confidence Score</span>
        <span style={{ color: confidenceScore >= (confidenceThreshold || 0.6) ? '#00d395' : '#f59e0b', fontWeight: 700 }}>
          {confidenceScore?.toFixed(2) ?? '—'} <span style={{ color: '#64748b' }}>/ {confidenceThreshold || 0.6}</span>
        </span>
      </div>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${confidencePct}%`, background: confidencePct >= 30 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
      </div>
    </div>
  );
}

const styles = {
  protocolRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', margin: '24px 0' },
  protocol: { textAlign: 'center' },
  protocolName: { fontSize: '0.85rem', fontWeight: 800, letterSpacing: '1px' },
  apr: { fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', marginTop: 8, textShadow: '0 2px 10px rgba(0,0,0,0.5)' },
  vs: { color: '#475569', fontSize: '1.2rem', fontWeight: 800, background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '50%' },
  divider: { height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '24px 0' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.95rem' },
  label: { color: '#94a3b8' },
  progressBar: { height: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 4, overflow: 'hidden', marginTop: 8, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' },
};
