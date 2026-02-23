export default function DecisionPanel({ decision, onRunCheck, loading }) {
  const isRotate = decision?.action === 'ROTATE';
  const badgeColor = isRotate ? '#00d395' : '#555';

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Decision Engine</h2>

      <div style={{ ...styles.badge, background: badgeColor }}>
        {decision?.action ?? 'NOT RUN'}
      </div>

      {decision && (
        <>
          <p style={styles.reason}>{decision.reason}</p>
          <div style={styles.divider} />
          <div style={styles.row}>
            <span style={styles.label}>From → To</span>
            <span style={styles.value}>
              {decision.from ? `${decision.from.toUpperCase()} → ${decision.to.toUpperCase()}` : '—'}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Gas Cost</span>
            <span style={styles.value}>${decision.gasCostUsd?.toFixed(2) ?? '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Projected Annual Gain</span>
            <span style={{ ...styles.value, color: '#00d395' }}>
              +${decision.projectedAnnualGain?.toFixed(2) ?? '—'}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Expected Annual Gas</span>
            <span style={{ ...styles.value, color: '#ff9900' }}>
              -${decision.expectedAnnualGasCost?.toFixed(2) ?? '—'}
            </span>
          </div>
          <div style={{ ...styles.row, borderTop: '1px solid #2a2a4a', paddingTop: 8, marginTop: 4 }}>
            <span style={{ ...styles.label, fontWeight: 700, color: '#eee' }}>Net Annual</span>
            <span style={{ fontWeight: 700, color: decision.netAnnualGain >= 0 ? '#00d395' : '#ff4444' }}>
              {decision.netAnnualGain >= 0 ? '+' : ''}${decision.netAnnualGain?.toFixed(2) ?? '—'}
            </span>
          </div>
        </>
      )}

      <button onClick={onRunCheck} disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Running...' : 'Run Check'}
      </button>
    </div>
  );
}

const styles = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  title: { margin: '0 0 16px', fontSize: 16, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  badge: { display: 'inline-block', padding: '6px 20px', borderRadius: 8, fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 12 },
  reason: { color: '#aaa', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' },
  divider: { height: 1, background: '#2a2a4a', margin: '12px 0' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 },
  label: { color: '#888' },
  value: { color: '#eee', fontWeight: 500 },
  btn: { marginTop: 16, width: '100%', padding: '12px 0', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
};
