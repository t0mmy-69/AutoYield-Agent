export default function APRPanel({ aprData }) {
  const { aaveAPR, compoundAPR, delta, emaDelta, momentum, confidenceScore, confidenceThreshold } = aprData || {};

  const momentumIcon = momentum > 0 ? '▲' : momentum < 0 ? '▼' : '→';
  const momentumColor = momentum > 0 ? '#00d395' : momentum < 0 ? '#ff4444' : '#888';
  const confidencePct = Math.min(Math.max((confidenceScore || 0) / 2 * 100, 0), 100); // normalize to 0-100

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Live APR Data</h2>

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
        <span style={{ color: delta > 0 ? '#00d395' : '#888', fontWeight: 600 }}>
          {delta != null ? `+${delta.toFixed(3)}%` : '—'}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>EMA Delta (smoothed)</span>
        <span style={{ color: emaDelta > 0 ? '#00d395' : '#888', fontWeight: 600 }}>
          {emaDelta != null ? `${emaDelta >= 0 ? '+' : ''}${emaDelta.toFixed(3)}%` : '—'}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Momentum</span>
        <span style={{ color: momentumColor, fontWeight: 600 }}>
          {momentumIcon} {momentum != null ? momentum.toFixed(4) : '—'}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Confidence Score</span>
        <span style={{ color: confidenceScore >= (confidenceThreshold || 0.6) ? '#00d395' : '#ff9900', fontWeight: 600 }}>
          {confidenceScore?.toFixed(2) ?? '—'}
          {confidenceThreshold ? ` / ${confidenceThreshold}` : ''}
        </span>
      </div>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${confidencePct}%`, background: confidencePct >= 30 ? '#00d395' : '#ff9900' }} />
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  title: { margin: '0 0 16px', fontSize: 16, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  protocolRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginBottom: 20 },
  protocol: { textAlign: 'center' },
  protocolName: { fontSize: 13, fontWeight: 700, letterSpacing: 1 },
  apr: { fontSize: 28, fontWeight: 800, color: '#eee', marginTop: 4 },
  vs: { color: '#555', fontSize: 18, fontWeight: 700 },
  divider: { height: 1, background: '#2a2a4a', margin: '12px 0' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 },
  label: { color: '#888' },
  progressBar: { height: 6, background: '#2a2a4a', borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.4s ease' },
};
