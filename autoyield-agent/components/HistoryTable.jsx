export default function HistoryTable({ history }) {
  if (!history || history.length === 0) {
    return (
      <div style={styles.card}>
        <h2 style={styles.title}>Move History</h2>
        <p style={{ color: '#555', textAlign: 'center', padding: 24 }}>No moves yet. Run a check to start.</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Move History</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Time', 'Action', 'From → To', 'Delta', 'Confidence', 'Net Annual', 'Tx Hash'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((entry, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1a1a2e' }}>
                <td style={styles.td}>{formatTime(entry.executedAt || entry.timestamp)}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: entry.action === 'ROTATE' ? '#00d395' : '#333', color: entry.action === 'ROTATE' ? '#000' : '#888' }}>
                    {entry.action}
                  </span>
                </td>
                <td style={styles.td}>
                  {entry.from && entry.to ? `${entry.from.toUpperCase()} → ${entry.to.toUpperCase()}` : '—'}
                </td>
                <td style={styles.td}>{entry.deltaPct != null ? `+${entry.deltaPct.toFixed(3)}%` : '—'}</td>
                <td style={styles.td}>{entry.confidenceScore?.toFixed(2) ?? '—'}</td>
                <td style={{ ...styles.td, color: (entry.netAnnualGain || 0) >= 0 ? '#00d395' : '#ff4444' }}>
                  {entry.netAnnualGain != null ? `${entry.netAnnualGain >= 0 ? '+' : ''}$${entry.netAnnualGain.toFixed(2)}` : '—'}
                </td>
                <td style={styles.td}>
                  {entry.txHash
                    ? <a href={`https://sepolia.etherscan.io/tx/${entry.txHash}`} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontSize: 12 }}>
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
  return new Date(ts).toLocaleString();
}

const styles = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  title: { margin: '0 0 16px', fontSize: 16, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 12px', textAlign: 'left', color: '#666', fontWeight: 600, borderBottom: '1px solid #2a2a4a', whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', color: '#ccc', whiteSpace: 'nowrap' },
  badge: { padding: '3px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 },
};
