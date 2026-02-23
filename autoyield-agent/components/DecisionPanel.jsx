import dappStyles from '../styles/Dapp.module.css';

export default function DecisionPanel({ decision, onRunCheck, loading }) {
  const isRotate = decision?.action === 'ROTATE';
  const badgeColor = isRotate ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #475569, #334155)';

  return (
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Decision Engine Output</h2>
      </div>

      <div style={{ ...styles.badge, background: badgeColor }}>
        {decision?.action ?? 'NOT RUN'}
      </div>

      {decision && (
        <>
          <p style={styles.reason}>{decision.reason}</p>
          <div style={styles.divider} />
          <div style={styles.row}>
            <span style={styles.label}>Route</span>
            <span style={styles.value}>
              {decision.from ? `${decision.from.toUpperCase()} → ${decision.to.toUpperCase()}` : '—'}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Est. Gas Cost</span>
            <span style={styles.value}>${decision.gasCostUsd?.toFixed(2) ?? '—'}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Projected Annual Gain</span>
            <span style={{ ...styles.value, color: '#10b981' }}>
              +${decision.projectedAnnualGain?.toFixed(2) ?? '—'}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Expected Annual Gas</span>
            <span style={{ ...styles.value, color: '#f59e0b' }}>
              -${decision.expectedAnnualGasCost?.toFixed(2) ?? '—'}
            </span>
          </div>
          <div style={{ ...styles.row, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 8 }}>
            <span style={{ ...styles.label, fontWeight: 800, color: '#f8fafc' }}>Net Annual Gain</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: decision.netAnnualGain >= 0 ? '#10b981' : '#ef4444' }}>
              {decision.netAnnualGain >= 0 ? '+' : ''}${decision.netAnnualGain?.toFixed(2) ?? '—'}
            </span>
          </div>
        </>
      )}

      <button onClick={onRunCheck} disabled={loading} style={{ ...styles.btn, opacity: loading ? 0.6 : 1, transform: loading ? 'scale(0.98)' : 'scale(1)' }}>
        {loading ? 'Evaluating...' : 'Manually Run Engine'}
      </button>
    </div>
  );
}

const styles = {
  badge: { display: 'inline-flex', padding: '8px 24px', borderRadius: 12, fontWeight: 800, fontSize: '1.2rem', color: '#fff', marginBottom: 16, boxShadow: '0 4px 15px rgba(0,0,0,0.3)' },
  reason: { color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 16px' },
  divider: { height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '16px 0' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.95rem' },
  label: { color: '#94a3b8' },
  value: { color: '#f8fafc', fontWeight: 600 },
  btn: { marginTop: 24, width: '100%', padding: '14px 0', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)' },
};
