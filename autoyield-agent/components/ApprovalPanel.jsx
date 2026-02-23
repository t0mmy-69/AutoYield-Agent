import { useState } from 'react';
import dappStyles from '../styles/Dapp.module.css';

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
    <div className={dappStyles.glassCard} style={{ border: '2px solid rgba(16, 185, 129, 0.5)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)' }}>
      <div className={dappStyles.cardHeader} style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 8 }}>
        <h2 className={dappStyles.cardTitle} style={{ color: '#10b981' }}>
          <span style={styles.pulse} /> Action Required: Pending Rotation
        </h2>
      </div>
      <p style={styles.sub}>The AI Agent has identified a highly profitable yield rotation. Review the projected gains below to approve or reject the execution.</p>

      <div style={styles.grid}>
        <Item label="From" value={from?.toUpperCase()} />
        <Item label="To" value={to?.toUpperCase()} accent="#10b981" />
        <Item label="Yield Delta" value={`+${deltaPct}%`} accent="#10b981" />
        <Item label="AI Confidence" value={confidenceScore} />
        <Item label="Est. Gas Cost" value={`$${gasCostUsd}`} />
        <Item label="Net Annual Gain" value={`+$${projectedAnnualGain}`} accent="#10b981" />
      </div>

      <div style={styles.btnRow}>
        <button
          onClick={() => handle(true)}
          disabled={loading}
          style={{ ...styles.btn, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
          {loading ? 'Processing...' : 'Approve Execution'}
        </button>
        <button
          onClick={() => handle(false)}
          disabled={loading}
          style={{ ...styles.btn, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}>
          {loading ? '...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

function Item({ label, value, accent }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px' }}>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: accent || '#f8fafc' }}>{value}</div>
    </div>
  );
}

const styles = {
  pulse: { width: 10, height: 10, borderRadius: '50%', background: '#10b981', marginRight: 8, animation: 'pulseApproval 1.5s infinite', boxShadow: '0 0 10px #10b981' },
  sub: { color: '#94a3b8', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 },
  btnRow: { display: 'flex', gap: 16 },
  btn: { flex: 1, padding: '14px 0', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' },
};
