import { useState } from 'react';

export default function ApprovalPanel({ pendingApproval, onApprove, onReject }) {
  const [loading, setLoading] = useState(false);

  if (!pendingApproval) return null;

  const { from, to, deltaPct, gasCostUsd, projectedAnnualGain, confidenceScore } = pendingApproval;

  const handle = async (approved) => {
    setLoading(true);
    await (approved ? onApprove() : onReject());
    setLoading(false);
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.pulse} />
        <h2 style={styles.title}>Pending Approval</h2>
      </div>
      <p style={styles.sub}>Agent wants to execute a rotation. Review and approve or reject.</p>

      <div style={styles.grid}>
        <Item label="From" value={from?.toUpperCase()} />
        <Item label="To" value={to?.toUpperCase()} accent="#00d395" />
        <Item label="Delta" value={`+${deltaPct}%`} accent="#00d395" />
        <Item label="Confidence" value={confidenceScore} />
        <Item label="Gas Cost" value={`$${gasCostUsd}`} />
        <Item label="Annual Gain" value={`+$${projectedAnnualGain}`} accent="#00d395" />
      </div>

      <div style={styles.btnRow}>
        <button
          onClick={() => handle(true)}
          disabled={loading}
          style={{ ...styles.btn, background: '#00d395', color: '#000' }}>
          {loading ? '...' : '✅ Approve'}
        </button>
        <button
          onClick={() => handle(false)}
          disabled={loading}
          style={{ ...styles.btn, background: '#ff4444', color: '#fff' }}>
          {loading ? '...' : '❌ Reject'}
        </button>
      </div>
    </div>
  );
}

function Item({ label, value, accent }) {
  return (
    <div style={{ background: '#0f0f1e', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent || '#eee' }}>{value}</div>
    </div>
  );
}

const styles = {
  card: { background: '#1a1a2e', border: '2px solid #00d395', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  header: { display: 'flex', alignItems: 'center', marginBottom: 8 },
  pulse: { width: 10, height: 10, borderRadius: '50%', background: '#00d395', marginRight: 10, animation: 'pulse 1s infinite' },
  title: { margin: 0, fontSize: 18, color: '#00d395' },
  sub: { color: '#888', fontSize: 13, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 },
  btnRow: { display: 'flex', gap: 12 },
  btn: { flex: 1, padding: '12px 0', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
};
