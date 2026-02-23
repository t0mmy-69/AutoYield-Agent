import { useState, useEffect } from 'react';

const PROTOCOL_COLORS = {
  aave: '#B6509E',
  compound: '#00D395',
  radiant: '#FF6B35',
  morpho: '#9747FF',
};

const CHAIN_LABELS = {
  sepolia: 'Sepolia',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
};

const PHASE_LABELS = {
  aave: 'Phase 1',
  compound: 'Phase 1',
  radiant: 'Phase 2',
  morpho: 'Phase 2',
};

export default function ProtocolPanel({ aprs = {}, showToggle = false }) {
  const [protocols, setProtocols] = useState([]);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    fetch('/api/protocols')
      .then(r => r.json())
      .then(setProtocols)
      .catch(() => {});
  }, []);

  const handleToggle = async (id, currentEnabled) => {
    setToggling(id);
    try {
      const res = await fetch('/api/protocols', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setProtocols(prev => prev.map(p => p.id === id ? { ...p, enabled: !currentEnabled } : p));
      }
    } catch { /* ignore */ }
    setToggling(null);
  };

  const bestId = Object.entries(aprs).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.title}>Protocol Registry</h2>
        <span style={styles.countBadge}>{protocols.filter(p => p.enabled).length} Active</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Protocol', 'Network', 'Phase', 'Live APR', 'Status', ...(showToggle ? ['Control'] : [])].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {protocols.map(p => {
              const color = PROTOCOL_COLORS[p.id] || '#888';
              const apr = aprs[p.id];
              const isBest = p.id === bestId && p.enabled;

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #1a1a2e', opacity: p.enabled ? 1 : 0.45 }}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <div>
                        <div style={{ color, fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                        <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{p.description.slice(0, 38)}…</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.chip, color: '#aaa' }}>{CHAIN_LABELS[p.chain] || p.chain}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.chip, color: p.enabled ? '#4f46e5' : '#555' }}>
                      {PHASE_LABELS[p.id] || '—'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 800, color: p.enabled && apr != null ? '#00d395' : '#444', fontSize: 16 }}>
                        {p.enabled && apr != null ? `${apr.toFixed(2)}%` : '—'}
                      </span>
                      {isBest && <span style={styles.bestBadge}>BEST</span>}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: p.enabled ? '#00d39515' : '#33333530', color: p.enabled ? '#00d395' : '#555', borderColor: p.enabled ? '#00d39540' : '#33333560' }}>
                      {p.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {showToggle && (
                    <td style={styles.td}>
                      <button
                        onClick={() => handleToggle(p.id, p.enabled)}
                        disabled={toggling === p.id}
                        style={{
                          ...styles.toggleBtn,
                          background: p.enabled ? '#2a101020' : '#0a2a1520',
                          color: p.enabled ? '#ff6666' : '#00d395',
                          borderColor: p.enabled ? '#ff444430' : '#00d39530',
                          opacity: toggling === p.id ? 0.5 : 1,
                        }}>
                        {toggling === p.id ? '...' : p.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { margin: 0, fontSize: 16, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  countBadge: { background: '#4f46e520', color: '#4f46e5', border: '1px solid #4f46e540', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 12px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '1px solid #2a2a4a', whiteSpace: 'nowrap', fontSize: 12 },
  td: { padding: '12px 12px', color: '#ccc', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  chip: { background: '#0f0f1e', border: '1px solid #2a2a4a', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  bestBadge: { background: '#00d39520', color: '#00d395', border: '1px solid #00d39540', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700 },
  statusBadge: { padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11, border: '1px solid' },
  toggleBtn: { padding: '5px 14px', border: '1px solid', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'opacity 0.15s' },
};
