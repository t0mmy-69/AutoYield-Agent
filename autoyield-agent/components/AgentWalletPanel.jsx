import { useState } from 'react';

export default function AgentWalletPanel({ agentAddress, usdcBalance, currentProtocol }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (!agentAddress) return;
    navigator.clipboard.writeText(agentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddr = agentAddress
    ? `${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}`
    : '—';

  const protocolColor = currentProtocol === 'aave' ? '#b6509e' : '#00d395';

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Agent Wallet</h2>
      <div style={styles.row}>
        <span style={styles.label}>Address</span>
        <span style={styles.value}>
          {shortAddr}
          <button onClick={copyAddress} style={styles.copyBtn}>
            {copied ? '✓' : '⎘'}
          </button>
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>USDC Balance</span>
        <span style={{ ...styles.value, fontWeight: 700, fontSize: 20 }}>
          ${usdcBalance?.toFixed(2) ?? '—'}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Current Protocol</span>
        <span style={{ ...styles.badge, background: protocolColor }}>
          {currentProtocol?.toUpperCase() ?? '—'}
        </span>
      </div>
    </div>
  );
}

const styles = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  title: { margin: '0 0 16px', fontSize: 16, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { color: '#888', fontSize: 14 },
  value: { color: '#eee', fontSize: 14 },
  badge: { color: '#fff', padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: 13 },
  copyBtn: { marginLeft: 8, background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14 },
};
