import dappStyles from '../styles/Dapp.module.css';

const PROTOCOL_COLORS = {
  aave: '#b026ff', // neon purple
  compound: '#00ff9d', // neon emerald
  radiant: '#ff007f', // neon pink
  morpho: '#00f0ff', // neon cyan
};

export default function APRPanel({ aprData }) {
  const { aprs, best, emaDelta, momentum, confidenceScore, confidenceThreshold } = aprData || {};

  const momentumIcon = momentum > 0 ? '▲' : momentum < 0 ? '▼' : '→';
  const momentumColor = momentum > 0 ? 'var(--neon-emerald)' : momentum < 0 ? 'var(--neon-pink)' : 'var(--text-muted)';
  const confidencePct = Math.min(Math.max((confidenceScore || 0) / 2 * 100, 0), 100);

  const aprEntries = Object.entries(aprs || {});

  return (
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Live APR Snapshot</h2>
      </div>

      <div style={styles.protocolList}>
        {aprEntries.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Fetching protocol rates...</div>
        )}
        {aprEntries.map(([id, apr]) => {
          const color = PROTOCOL_COLORS[id] || '#888';
          const isBest = id === best;
          return (
            <div key={id} style={{ ...styles.protocolItem, borderLeftColor: isBest ? color : 'var(--border-glass)', boxShadow: isBest ? `0 0 15px ${color}30` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                <span style={{ color, fontWeight: 800, fontSize: 13, letterSpacing: 1.5, textShadow: `0 0 5px ${color}80` }}>{id.toUpperCase()}</span>
                {isBest && <span style={styles.bestBadge}>TOP YIELD</span>}
              </div>
              <span style={{ fontSize: 24, fontWeight: 900, color: isBest ? color : 'var(--text-main)', textShadow: isBest ? `0 0 10px ${color}` : 'none' }}>
                {apr?.toFixed(2) ?? '—'}%
              </span>
            </div>
          );
        })}
      </div>

      <div style={styles.divider} />

      <div style={styles.row}>
        <span style={styles.label}>EMA Delta</span>
        <span style={{ color: emaDelta > 0 ? 'var(--neon-emerald)' : 'var(--text-muted)', fontWeight: 800 }}>
          {emaDelta != null ? `${emaDelta >= 0 ? '+' : ''}${emaDelta.toFixed(3)}%` : '—'}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Momentum</span>
        <span style={{ color: momentumColor, fontWeight: 800 }}>
          {momentumIcon} {momentum != null ? momentum.toFixed(4) : '—'}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Confidence</span>
        <span style={{ color: (confidenceScore || 0) >= (confidenceThreshold || 0.6) ? 'var(--neon-cyan)' : 'var(--neon-pink)', fontWeight: 800 }}>
          {confidenceScore?.toFixed(2) ?? '—'}
          <span style={{ opacity: 0.5, fontSize: '0.85em' }}> / {confidenceThreshold}</span>
        </span>
      </div>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${confidencePct}%`, background: confidencePct >= 30 ? 'var(--neon-cyan)' : 'var(--neon-pink)', boxShadow: `0 0 10px ${confidencePct >= 30 ? 'var(--neon-cyan)' : 'var(--neon-pink)'}` }} />
      </div>
    </div>
  );
}

const styles = {
  protocolList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 },
  protocolItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: 12, borderLeftWidth: 4, borderLeftStyle: 'solid', transition: 'all 0.3s' },
  bestBadge: { background: 'var(--text-main)', color: '#000', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 900, letterSpacing: 1 },
  divider: { height: 1, background: 'var(--border-glass)', margin: '16px 0' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.95rem' },
  label: { color: 'var(--text-muted)' },
  progressBar: { height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4, overflow: 'hidden', marginTop: 12, border: '1px solid var(--border-glass)' },
  progressFill: { height: '100%', borderRadius: 4, transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)' },
};
