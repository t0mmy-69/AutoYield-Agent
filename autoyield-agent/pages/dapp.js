import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import AgentWalletPanel from '../components/AgentWalletPanel';
import APRPanel from '../components/APRPanel';
import DecisionPanel from '../components/DecisionPanel';
import ApprovalPanel from '../components/ApprovalPanel';
import RulesPanel from '../components/RulesPanel';
import HistoryTable from '../components/HistoryTable';
import TelegramPanel from '../components/TelegramPanel';
import ProtocolPanel from '../components/ProtocolPanel';

const SESSION_KEY = 'autoyield_session';
const SESSION_ADDRESS_KEY = 'autoyield_address';

// ─── Auth helpers ──────────────────────────────────────────────────────────────

function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

function storeToken(token, address) {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(SESSION_ADDRESS_KEY, address);
}

function clearToken() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_ADDRESS_KEY);
}

function authHeaders(token) {
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);         // { address, agentWallet }
  const [authStep, setAuthStep] = useState('idle'); // idle | connecting | signing | done | error

  const [state, setState] = useState(null);
  const [aprData, setAprData] = useState(null);
  const [decision, setDecision] = useState(null);
  const [rules, setRules] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Restore session on load ────────────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredToken();
    if (stored) {
      setToken(stored);
      setAuthStep('done');
    }
  }, []);

  // ── Fetch data when authed ────────────────────────────────────────────────
  const fetchState = useCallback(async (t) => {
    const tk = t ?? token;
    const res = await fetch('/api/state', { headers: authHeaders(tk) });
    if (res.ok) setState(await res.json());
  }, [token]);

  const fetchRules = useCallback(async (t) => {
    const tk = t ?? token;
    const res = await fetch('/api/rules', { headers: authHeaders(tk) });
    if (res.ok) setRules(await res.json());
  }, [token]);

  const fetchHistory = useCallback(async (t) => {
    const tk = t ?? token;
    const res = await fetch('/api/history', { headers: authHeaders(tk) });
    if (res.ok) setHistory(await res.json());
  }, [token]);

  const fetchAPR = useCallback(async () => {
    const res = await fetch('/api/apr');
    if (res.ok) setAprData(await res.json());
  }, []);

  const fetchMe = useCallback(async (t) => {
    const tk = t ?? token;
    if (!tk) return;
    const res = await fetch('/api/auth/me', { headers: authHeaders(tk) });
    if (res.ok) {
      const me = await res.json();
      setUser({ address: me.address, agentWallet: me.agentWallet, usdcBalance: me.usdcBalance });
    } else {
      // Token expired
      clearToken();
      setToken(null);
      setAuthStep('idle');
    }
  }, [token]);

  useEffect(() => {
    if (authStep !== 'done') return;
    fetchMe();
    fetchState();
    fetchRules();
    fetchHistory();
    fetchAPR();
    const interval = setInterval(() => { fetchState(); fetchHistory(); }, 30000);
    return () => clearInterval(interval);
  }, [authStep, fetchState, fetchRules, fetchHistory, fetchAPR, fetchMe]);

  // ── Wallet Connect + SIWE ─────────────────────────────────────────────────
  const handleConnect = async () => {
    setError(null);
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not found. Please install MetaMask to continue.');
      return;
    }
    try {
      setAuthStep('connecting');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // 1. Get challenge
      setAuthStep('signing');
      const chalRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      if (!chalRes.ok) throw new Error('Failed to get challenge');
      const { message } = await chalRes.json();

      // 2. Sign message
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      // 3. Verify + get session token
      const verRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) throw new Error(verData.error || 'Verification failed');

      storeToken(verData.token, address);
      setToken(verData.token);
      setUser({ address: verData.user.address, agentWallet: verData.agentWallet });
      setAuthStep('done');

      // Refresh data with new token
      await Promise.all([
        fetchState(verData.token),
        fetchRules(verData.token),
        fetchHistory(verData.token),
        fetchAPR(),
      ]);
    } catch (e) {
      setError(e.message);
      setAuthStep('idle');
    }
  };

  const handleDisconnect = () => {
    clearToken();
    setToken(null);
    setUser(null);
    setState(null);
    setHistory([]);
    setRules(null);
    setDecision(null);
    setAuthStep('idle');
  };

  // ── Agent actions ─────────────────────────────────────────────────────────

  const handleRunCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: authHeaders(token),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDecision(data.decision);
      if (data.aprSnapshot) setAprData(prev => ({ ...prev, ...data.aprSnapshot }));
      await fetchState();
      await fetchHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ approved: true }),
    });
    const data = await res.json();
    if (res.ok) { await fetchState(); await fetchHistory(); }
    else setError(data.error);
  };

  const handleReject = async () => {
    await fetch('/api/approve', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ approved: false }),
    });
    await fetchState();
    await fetchHistory();
  };

  const handleSaveRules = async (newRules) => {
    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(newRules),
    });
    if (res.ok) setRules(await res.json());
  };

  const enrichedAprData = aprData ? {
    ...aprData,
    emaDelta: decision?.emaDelta,
    momentum: decision?.momentum,
    confidenceScore: decision?.confidenceScore,
    confidenceThreshold: rules?.confidenceThreshold,
  } : null;

  // ── Render: not connected ─────────────────────────────────────────────────

  if (authStep !== 'done') {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.logo}>AutoYield Agent</h1>
          <Link href="/admin" style={styles.adminLink}>Admin</Link>
        </div>
        <div style={styles.connectCard}>
          <div style={styles.connectIcon}>⚡</div>
          <h2 style={styles.connectTitle}>Connect Your Wallet</h2>
          <p style={styles.connectDesc}>
            Sign in with any EVM wallet to access your personal yield agent.
            Deposits supported on Ethereum, Base, and Arbitrum.
          </p>
          {error && <div style={styles.error}>{error}</div>}
          <button
            style={{ ...styles.connectBtn, opacity: authStep !== 'idle' ? 0.6 : 1 }}
            onClick={handleConnect}
            disabled={authStep !== 'idle'}
          >
            {authStep === 'connecting' && '🔌 Connecting...'}
            {authStep === 'signing' && '✍️ Sign message in MetaMask...'}
            {authStep === 'idle' && '🦊 Connect with MetaMask'}
          </button>
          <p style={styles.custodyNote}>
            ⚠️ Custody model: your agent wallet keys are managed server-side.
            Only deposit funds you are comfortable delegating to this automated agent.
          </p>
        </div>
      </div>
    );
  }

  // ── Render: connected ─────────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={styles.logo}>AutoYield Agent</h1>
          <span style={styles.network}>ETH · Base · Arbitrum</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <span style={styles.addressBadge}>
              {user.address.slice(0, 6)}…{user.address.slice(-4)}
            </span>
          )}
          <button onClick={handleDisconnect} style={styles.disconnectBtn}>Disconnect</button>
          <Link href="/admin" style={styles.adminLink}>Admin</Link>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {user?.agentWallet && (
        <div style={styles.depositBanner}>
          <span style={{ color: '#888', fontSize: 13 }}>Your agent wallet:</span>
          <code style={styles.depositAddress}>{user.agentWallet}</code>
          <span style={{ color: '#4ade80', fontSize: 12 }}>← Deposit USDC here (ETH · Base · Arbitrum)</span>
        </div>
      )}

      <AgentWalletPanel
        agentAddress={state?.agentAddress ?? user?.agentWallet}
        usdcBalance={state?.usdcBalance}
        currentProtocol={state?.currentProtocol}
      />

      <ApprovalPanel
        pendingApproval={state?.pendingApproval}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <div style={styles.twoCol}>
        <APRPanel aprData={enrichedAprData} />
        <DecisionPanel
          decision={decision}
          onRunCheck={handleRunCheck}
          loading={loading}
        />
      </div>

      <ProtocolPanel aprs={aprData?.aprs || {}} />
      <RulesPanel rules={rules} onSave={handleSaveRules} />
      <TelegramPanel />
      <HistoryTable history={history} />
    </div>
  );
}

const styles = {
  page: { maxWidth: 1040, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0f0f1e', minHeight: '100vh', color: '#eee' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  logo: { margin: 0, fontSize: 24, fontWeight: 800, color: '#fff' },
  network: { background: '#1a1a2e', border: '1px solid #2a2a4a', padding: '4px 12px', borderRadius: 6, fontSize: 13, color: '#888' },
  adminLink: { background: '#4f46e520', color: '#4f46e5', border: '1px solid #4f46e540', padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  error: { background: '#2a1010', border: '1px solid #ff4444', borderRadius: 8, padding: '10px 16px', color: '#ff4444', marginBottom: 16, fontSize: 14 },
  addressBadge: { background: '#1a1a2e', border: '1px solid #2a2a4a', padding: '5px 12px', borderRadius: 6, fontSize: 13, color: '#a78bfa', fontFamily: 'monospace' },
  disconnectBtn: { background: 'transparent', color: '#888', border: '1px solid #333', padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  depositBanner: { display: 'flex', alignItems: 'center', gap: 12, background: '#0d1f0d', border: '1px solid #1a3a1a', borderRadius: 8, padding: '10px 16px', marginBottom: 16, flexWrap: 'wrap' },
  depositAddress: { background: '#0f2f0f', padding: '3px 8px', borderRadius: 4, fontSize: 12, color: '#4ade80', fontFamily: 'monospace', letterSpacing: '0.03em' },
  connectCard: { maxWidth: 480, margin: '80px auto', background: '#14142b', border: '1px solid #2a2a4a', borderRadius: 16, padding: '40px 32px', textAlign: 'center' },
  connectIcon: { fontSize: 48, marginBottom: 16 },
  connectTitle: { margin: '0 0 12px', fontSize: 24, fontWeight: 700, color: '#fff' },
  connectDesc: { color: '#888', fontSize: 15, lineHeight: 1.6, marginBottom: 24 },
  connectBtn: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'opacity 0.2s' },
  custodyNote: { color: '#555', fontSize: 12, marginTop: 20, lineHeight: 1.5 },
};
