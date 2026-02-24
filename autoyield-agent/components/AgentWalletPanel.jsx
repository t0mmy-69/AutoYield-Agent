import { useState } from 'react';
import dappStyles from '../styles/Dapp.module.css';

function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return;
    }
  } catch { /* fall through */ }
  // Fallback for non-HTTPS or unsupported browsers
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(el);
}

export default function AgentWalletPanel({ agentAddress, usdcBalance, currentProtocol, token, userAddress, onRefresh }) {
  const [copied, setCopied] = useState(false);

  // Deposit state
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositMsg, setDepositMsg] = useState(null);

  // Withdraw state
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState(null);

  const copyAddress = () => {
    if (!agentAddress) return;
    copyToClipboard(agentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Deposit: user signs MetaMask tx sending USDC from their wallet to agent wallet
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    if (typeof window === 'undefined' || !window.ethereum) {
      setDepositMsg({ ok: false, text: 'MetaMask not found.' });
      return;
    }
    setDepositing(true);
    setDepositMsg(null);
    try {
      // Get USDC address + agent chain info from backend
      const infoRes = await fetch('/api/wallet/info', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!infoRes.ok) throw new Error('Could not fetch wallet info.');
      const info = await infoRes.json();
      if (!info.usdcAddress) throw new Error('USDC address not configured on server.');

      // Switch to correct chain if needed
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];

      // Encode USDC transfer(to, amount)
      // decimals = 6 for USDC
      const decimals = 6;
      const amountInt = Math.floor(parseFloat(depositAmount) * 10 ** decimals);
      const amountHex = '0x' + amountInt.toString(16).padStart(64, '0');
      const toHex = info.agentAddress.slice(2).toLowerCase().padStart(64, '0');
      const data = '0xa9059cbb' + toHex + amountHex;

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from, to: info.usdcAddress, data, gas: '0x186A0' }],
      });
      setDepositMsg({ ok: true, text: `Deposit sent! TX: ${txHash.slice(0, 10)}...` });
      setDepositAmount('');
      setTimeout(() => { setDepositMsg(null); onRefresh?.(); }, 4000);
    } catch (e) {
      setDepositMsg({ ok: false, text: e.message || 'Deposit failed.' });
    } finally {
      setDepositing(false);
    }
  };

  // Withdraw: backend agent wallet sends USDC to user's address
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    setWithdrawing(true);
    setWithdrawMsg(null);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: withdrawAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Withdraw failed.');
      setWithdrawMsg({ ok: true, text: `Withdrawn! TX: ${data.txHash?.slice(0, 10)}...` });
      setWithdrawAmount('');
      setTimeout(() => { setWithdrawMsg(null); onRefresh?.(); }, 4000);
    } catch (e) {
      setWithdrawMsg({ ok: false, text: e.message || 'Withdraw failed.' });
    } finally {
      setWithdrawing(false);
    }
  };

  const shortAddr = agentAddress
    ? `${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}`
    : '—';

  const protocolColor = currentProtocol === 'aave' ? '#b6509e' : '#00d395';

  return (
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Agent Wallet</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowDeposit(v => !v); setShowWithdraw(false); }} style={styles.actionBtn('var(--neon-emerald)', 'rgba(0,255,157,0.3)')}>
            ↓ Deposit
          </button>
          <button onClick={() => { setShowWithdraw(v => !v); setShowDeposit(false); }} style={styles.actionBtn('var(--neon-cyan)', 'rgba(0,240,255,0.3)')}>
            ↑ Withdraw
          </button>
        </div>
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
        <span style={{ ...styles.value, fontWeight: 800, fontSize: 26, color: 'var(--neon-emerald)', textShadow: '0 0 10px rgba(0,255,157,0.4)' }}>
          ${usdcBalance?.toFixed(2) ?? '—'}
        </span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Current Protocol</span>
        <span style={{ ...styles.badge, background: protocolColor }}>
          {currentProtocol?.toUpperCase() ?? '—'}
        </span>
      </div>

      {/* Deposit Panel */}
      {showDeposit && (
        <div style={styles.subPanel}>
          <p style={styles.subTitle}>Deposit USDC to Agent Wallet</p>
          <p style={styles.subHint}>MetaMask sẽ gửi USDC từ ví chính của bạn đến agent wallet ({shortAddr}).</p>
          <div style={styles.inputRow}>
            <input
              type="number"
              placeholder="Amount USDC"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              min="0"
              step="0.01"
              style={styles.amountInput}
            />
            <button
              onClick={handleDeposit}
              disabled={depositing || !depositAmount}
              style={{ ...styles.confirmBtn, background: '#10b981', opacity: depositing ? 0.6 : 1 }}
            >
              {depositing ? 'Sending...' : 'Confirm Deposit'}
            </button>
          </div>
          {depositMsg && <p style={{ color: depositMsg.ok ? '#4ade80' : '#f87171', fontSize: 13, marginTop: 8 }}>{depositMsg.text}</p>}
        </div>
      )}

      {/* Withdraw Panel */}
      {showWithdraw && (
        <div style={styles.subPanel}>
          <p style={styles.subTitle}>Withdraw USDC to Your Wallet</p>
          <p style={styles.subHint}>Agent wallet sẽ gửi USDC về ví chính của bạn ({userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : '—'}).</p>
          <div style={styles.inputRow}>
            <input
              type="number"
              placeholder="Amount USDC"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              min="0"
              step="0.01"
              style={styles.amountInput}
            />
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount}
              style={{ ...styles.confirmBtn, background: '#6366f1', opacity: withdrawing ? 0.6 : 1 }}
            >
              {withdrawing ? 'Withdrawing...' : 'Confirm Withdraw'}
            </button>
          </div>
          {withdrawMsg && <p style={{ color: withdrawMsg.ok ? '#4ade80' : '#f87171', fontSize: 13, marginTop: 8 }}>{withdrawMsg.text}</p>}
        </div>
      )}
    </div>
  );
}

const styles = {
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { color: 'var(--text-muted)', fontSize: '0.9rem' },
  value: { color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'center' },
  badge: { color: '#fff', padding: '4px 12px', borderRadius: 8, fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px', boxShadow: '0 0 10px rgba(255,255,255,0.2)' },
  copyBtn: { marginLeft: 8, background: 'var(--border-glass)', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: 12, borderRadius: 4, padding: '2px 6px', transition: 'background 0.2s', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' },
  actionBtn: (color, glow) => ({ background: `rgba(255,255,255,0.05)`, color, border: `1px solid ${color}`, borderRadius: 8, padding: '5px 14px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 0 10px ${glow}`, textShadow: `0 0 5px ${color}` }),
  subPanel: { marginTop: 16, borderTop: '1px solid var(--border-glass)', paddingTop: 16 },
  subTitle: { margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' },
  subHint: { margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--text-muted)' },
  inputRow: { display: 'flex', gap: 8 },
  amountInput: { flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-glass)', borderRadius: 12, padding: '10px 16px', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none', transition: 'border 0.3s', '&:focus': { borderColor: 'var(--neon-cyan)' } },
  confirmBtn: { color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
};
