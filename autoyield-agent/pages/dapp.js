import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dappStyles from '../styles/Dapp.module.css';
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
  const [aiExplanation, setAiExplanation] = useState(null);
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

      setAuthStep('signing');
      const chalRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      if (!chalRes.ok) throw new Error('Failed to get challenge');
      const { message } = await chalRes.json();

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

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
      if (data.aiExplanation) setAiExplanation(data.aiExplanation);
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

  const handleAiGenerateRules = async (userText) => {
    const allowedProtocols = aprData?.aprs ? Object.keys(aprData.aprs) : [];
    const res = await fetch('/api/ai/rules', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ userText, currentRules: rules, allowedProtocols }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI request failed');
    return data;
  };

  const enrichedAprData = aprData ? {
    ...aprData,
    emaDelta: decision?.emaDelta,
    momentum: decision?.momentum,
    confidenceScore: decision?.confidenceScore,
    confidenceThreshold: rules?.confidenceThreshold,
  } : null;

  if (authStep !== 'done') {
    return (
      <div className={dappStyles.page}>
        <header className={dappStyles.header}>
          <div className={dappStyles.logoArea}>
            <div className={dappStyles.logoIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            </div>
            AutoYield Agent
          </div>
          <Link href="/admin" className={dappStyles.networkBadge} style={{ textDecoration: 'none' }}>Admin</Link>
        </header>

        <div className={dappStyles.glassCard} style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 12px', color: 'var(--text-main)' }}>Connect Your Wallet</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 24 }}>
            Sign in with any EVM wallet to access your personal elite yield agent.
            Deposits supported on Ethereum Sepolia, Base Sepolia, and Arbitrum Sepolia.
          </p>
          {error && <div className={dappStyles.error}>{error}</div>}
          <button
            style={{
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
              color: '#fff', border: 'none', padding: '14px 32px', borderRadius: 12,
              fontSize: '1.05rem', fontWeight: 800, cursor: 'pointer', width: '100%',
              boxShadow: 'var(--shadow-glow-cyan)', transition: 'all 0.3s ease',
              opacity: authStep !== 'idle' ? 0.6 : 1
            }}
            onClick={handleConnect}
            disabled={authStep !== 'idle'}
          >
            {authStep === 'connecting' && '🔌 Connecting...'}
            {authStep === 'signing' && '✍️ Sign message in MetaMask...'}
            {authStep === 'idle' && '🦊 Connect with MetaMask'}
          </button>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 20, lineHeight: 1.5 }}>
            ⚠️ Custody model: your agent wallet keys are managed server-side.
            Only deposit funds you are comfortable delegating to this automated agent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={dappStyles.page}>
      <header className={dappStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className={dappStyles.logoArea}>
            <div className={dappStyles.logoIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            </div>
            AutoYield Agent
          </div>
          <span className={dappStyles.networkBadge}>
            <div className={dappStyles.pulseDot} />
            Testnet · ETH · Base · ARB
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <span style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', padding: '6px 14px', borderRadius: 8, fontSize: '0.85rem', color: 'var(--neon-cyan)', fontFamily: 'monospace', fontWeight: 600 }}>
              {user.address.slice(0, 6)}…{user.address.slice(-4)}
            </span>
          )}
          <button onClick={handleDisconnect} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', padding: '6px 14px', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Disconnect</button>
          <Link href="/admin" className={dappStyles.networkBadge} style={{ textDecoration: 'none', background: 'rgba(176, 38, 255, 0.15)', color: 'var(--neon-purple)', borderColor: 'rgba(176, 38, 255, 0.3)' }}>Admin View</Link>
        </div>
      </header>

      {error && <div className={dappStyles.error}>{error}</div>}

      {user?.agentWallet && (
        <div className={dappStyles.glassCard} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px', marginBottom: 24, paddingBottom: '16px', background: 'rgba(0, 255, 157, 0.05)', borderColor: 'rgba(0, 255, 157, 0.2)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>AGENT WALLET:</span>
          <code style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '4px 10px', borderRadius: 6, fontSize: '0.85rem', color: 'var(--neon-emerald)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{user.agentWallet}</code>
          <span style={{ color: 'var(--neon-emerald)', fontSize: '0.85rem', fontWeight: 600 }}>← Deposit USDC here to start yielding</span>
        </div>
      )}

      <AgentWalletPanel
        agentAddress={state?.agentAddress ?? user?.agentWallet}
        usdcBalance={state?.usdcBalance}
        currentProtocol={state?.currentProtocol}
        token={token}
        userAddress={user?.address}
        onRefresh={() => { fetchState(); fetchMe(); }}
      />

      <ApprovalPanel
        pendingApproval={state?.pendingApproval}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <div className={dappStyles.mainGrid}>
        <APRPanel aprData={enrichedAprData} />
        <DecisionPanel
          decision={decision}
          onRunCheck={handleRunCheck}
          loading={loading}
          aiExplanation={aiExplanation}
        />
      </div>

      <ProtocolPanel aprs={aprData?.aprs || {}} />
      <RulesPanel rules={rules} onSave={handleSaveRules} onAiGenerate={handleAiGenerateRules} />
      <TelegramPanel token={token} />
      <HistoryTable history={history} />
    </div>
  );
}
