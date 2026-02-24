import { useState, useEffect } from 'react';
import dappStyles from '../styles/Dapp.module.css';

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
      .catch(() => { });
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
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Protocol Registry</h2>
        <span style={styles.countBadge}>{protocols.filter(p => p.enabled).length} Active</span>
      </div>

      <div style={{ overflowX: 'auto', margin: '0 -24px -24px -24px' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Protocol', 'Network', 'Phase', 'Live APR', 'Status', ...(showToggle ? ['Control'] : [])].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {protocols.map((p, i) => {
              const color = PROTOCOL_COLORS[p.id] || '#888';
              const apr = aprs[p.id];
              const isBest = p.id === bestId && p.enabled;

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent', opacity: p.enabled ? 1 : 0.45 }}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 10px ${color}80` }} />
                      <div>
                        <div style={{ color, fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>{p.description.slice(0, 38)}…</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.chip, color: '#cbd5e1' }}>{CHAIN_LABELS[p.chain] || p.chain}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.chip, color: p.enabled ? '#6366f1' : '#94a3b8' }}>
                      {PHASE_LABELS[p.id] || '—'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, color: p.enabled && apr != null ? '#10b981' : '#94a3b8', fontSize: '1.05rem' }}>
                        {p.enabled && apr != null ? `${apr.toFixed(2)}%` : '—'}
                      </span>
                      {isBest && <span style={styles.bestBadge}>BEST</span>}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: p.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', color: p.enabled ? '#10b981' : '#cbd5e1', borderColor: p.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)' }}>
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
                          background: p.enabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: p.enabled ? '#ef4444' : '#10b981',
                          borderColor: p.enabled ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
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
  countBadge: { background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { padding: '12px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '16px 24px', color: '#f8fafc', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  chip: { background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 },
  bestBadge: { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px' },
  statusBadge: { padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', border: '1px solid' },
  toggleBtn: { padding: '6px 16px', border: '1px solid', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s', outline: 'none' },
};
