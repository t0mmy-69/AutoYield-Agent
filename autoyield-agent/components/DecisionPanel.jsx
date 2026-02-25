import dappStyles from '../styles/Dapp.module.css';

export default function DecisionPanel({ decision, onRunCheck, loading, aiExplanation }) {
  const isRotate = decision?.action === 'ROTATE';
  const badgeColor = isRotate ? 'linear-gradient(135deg, var(--neon-emerald), var(--neon-cyan))' : 'linear-gradient(135deg, #475569, #334155)';
  const glowShadow = isRotate ? 'var(--shadow-glow-emerald)' : 'none';

  return (
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Decision Engine Output</h2>
      </div>

      <div style={{ ...styles.badge, background: badgeColor, boxShadow: glowShadow }}>
        {decision?.action ?? 'NOT RUN'}
      </div>

      {decision && (
        <>
          {aiExplanation?.uiText ? (
            <div style={styles.aiBox}>
              <span style={styles.aiLabel}>🤖 AI Analysis</span>
              <p style={styles.aiText}>{aiExplanation.uiText}</p>
            </div>
          ) : (
            <p style={styles.reason}>{decision.reason}</p>
          )}
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
            <span style={{ ...styles.value, color: 'var(--neon-emerald)', textShadow: '0 0 8px rgba(0,255,157,0.4)' }}>
              +${decision.projectedAnnualGain?.toFixed(2) ?? '—'}
            </span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Expected Annual Gas</span>
            <span style={{ ...styles.value, color: 'var(--neon-pink)' }}>
              -${decision.expectedAnnualGasCost?.toFixed(2) ?? '—'}
            </span>
          </div>
          <div style={{ ...styles.row, borderTop: '1px solid var(--border-glass)', paddingTop: 16, marginTop: 12 }}>
            <span style={{ ...styles.label, fontWeight: 900, color: 'var(--text-main)', letterSpacing: 1 }}>Net Annual Gain</span>
            <span style={{ fontWeight: 900, fontSize: '1.25rem', color: decision.netAnnualGain >= 0 ? 'var(--neon-emerald)' : 'var(--neon-pink)', textShadow: decision.netAnnualGain >= 0 ? '0 0 10px rgba(0,255,157,0.5)' : 'none' }}>
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
  badge: { display: 'inline-flex', padding: '8px 24px', borderRadius: 12, fontWeight: 900, fontSize: '1.2rem', color: '#fff', marginBottom: 16, letterSpacing: 1.5 },
  reason: { color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 16px' },
  aiBox: { background: 'rgba(176, 38, 255, 0.08)', border: '1px solid rgba(176, 38, 255, 0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 },
  aiLabel: { fontSize: '0.75rem', fontWeight: 700, color: 'var(--neon-purple)', letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6 },
  aiText: { color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.65, margin: 0 },
  divider: { height: 1, background: 'linear-gradient(90deg, transparent, var(--border-glass), transparent)', margin: '16px 0' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: '0.95rem' },
  label: { color: 'var(--text-muted)' },
  value: { color: 'var(--text-main)', fontWeight: 800 },
  btn: { marginTop: 24, width: '100%', padding: '16px 0', background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-cyan))', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', boxShadow: 'var(--shadow-glow-cyan)', letterSpacing: 1, textTransform: 'uppercase' },
};
