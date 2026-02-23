const PROTOCOL_COLORS = {
  aave: '#B6509E',
  compound: '#00D395',
  radiant: '#FF6B35',
  morpho: '#9747FF',
};

export default function APRPanel({ aprData }) {
  const { aprs, best, emaDelta, momentum, confidenceScore, confidenceThreshold } = aprData || {};

  const momentumIcon = momentum > 0 ? '▲' : momentum < 0 ? '▼' : '→';
  const momentumColor = momentum > 0 ? '#00d395' : momentum < 0 ? '#ff4444' : '#888';
  const confidencePct = Math.min(Math.max((confidenceScore || 0) / 2 * 100, 0), 100);

  const aprEntries = Object.entries(aprs || {});

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Live APR — All Protocols</h2>

      <div style={styles.protocolList}>
        {aprEntries.length === 0 && (
          <div style={{ color: '#555', textAlign: 'center', padding: 16 }}>Fetching protocol rates...</div>
        )}
        {aprEntries.map(([id, apr]) => {
          const color = PROTOCOL_COLORS[id] || '#888';
          const isBest = id === best;
          return (
            <div key={id} style={{ ...styles.protocolItem, borderLeftColor: isBest ? color : '#2a2a4a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ color, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{id.toUpperCase()}</span>
                {isBest && <span style={styles.bestBadge}>BEST</span>}
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, color: isBest ? '#00d395' : '#eee' }}>
                {apr?.toFixed(2) ?? '—'}%
              </span>
            </div>
          );
        })}
      </div>

      <div style={styles.divider} />

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
        <span style={{ color: (confidenceScore || 0) >= (confidenceThreshold || 0.6) ? '#00d395' : '#ff9900', fontWeight: 600 }}>
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
  protocolList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  protocolItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#0f0f1e', border: '1px solid #2a2a4a', borderRadius: 8, borderLeftWidth: 3, borderLeftStyle: 'solid' },
  bestBadge: { background: '#00d39520', color: '#00d395', border: '1px solid #00d39540', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 },
  divider: { height: 1, background: '#2a2a4a', margin: '12px 0' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 },
  label: { color: '#888' },
  progressBar: { height: 6, background: '#2a2a4a', borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 3, transition: 'width 0.4s ease' },
};
