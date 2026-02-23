import { useState } from 'react';
import dappStyles from '../styles/Dapp.module.css';

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
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Agent Wallet</h2>
      </div>

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
        <span style={{ ...styles.value, fontWeight: 700, fontSize: 24, color: '#00d395' }}>
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
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: '0.9rem' },
  value: { color: '#f8fafc', fontSize: '0.95rem', display: 'flex', alignItems: 'center' },
  badge: { color: '#fff', padding: '4px 12px', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.5px' },
  copyBtn: { marginLeft: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f8fafc', cursor: 'pointer', fontSize: 12, borderRadius: 4, padding: '2px 6px', transition: 'background 0.2s' },
};
