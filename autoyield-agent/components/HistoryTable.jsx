import dappStyles from '../styles/Dapp.module.css';

export default function HistoryTable({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className={dappStyles.glassCard}>
        <div className={dappStyles.cardHeader} style={{ marginBottom: 0 }}>
          <h2 className={dappStyles.cardTitle}>Execution Log</h2>
        </div>
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0', fontSize: '0.95rem' }}>No automated executions yet. The AI agent is monitoring conditions.</p>
      </div>
    );
  }

  return (
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Execution Log</h2>
      </div>
      <div style={{ overflowX: 'auto', margin: '0 -24px -24px -24px' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Time', 'Action', 'From → To', 'Yield Delta', 'AI Confidence', 'Net Annual', 'Tx Hash'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((entry, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                <td style={styles.td}>{formatTime(entry.executedAt || entry.timestamp)}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: entry.action === 'ROTATE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)', color: entry.action === 'ROTATE' ? '#10b981' : '#cbd5e1' }}>
                    {entry.action}
                  </span>
                </td>
                <td style={{ ...styles.td, fontWeight: 600 }}>
                  {entry.from && entry.to ? `${entry.from.toUpperCase()} → ${entry.to.toUpperCase()}` : '—'}
                </td>
                <td style={styles.td}>{entry.deltaPct != null ? `+${entry.deltaPct.toFixed(3)}%` : '—'}</td>
                <td style={styles.td}>{entry.confidenceScore?.toFixed(2) ?? '—'}</td>
                <td style={{ ...styles.td, fontWeight: 700 }}>
                  <span className={entry.netAnnualGain >= 0 ? 'text-gradient-emerald' : 'text-gradient-pink'}>
                    {entry.netAnnualGain != null ? `${entry.netAnnualGain >= 0 ? '+' : ''}$${entry.netAnnualGain.toFixed(2)}` : '—'}
                  </span>
                </td>
                <td style={styles.td}>
                  {entry.txHash
                    ? <a href={`https://sepolia.etherscan.io/tx/${entry.txHash}`} target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                      {entry.txHash.slice(0, 8)}...
                    </a>
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

const styles = {
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { padding: '12px 24px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' },
  td: { padding: '16px 24px', color: '#f8fafc', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.02)' },
  badge: { padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.5px' },
};
