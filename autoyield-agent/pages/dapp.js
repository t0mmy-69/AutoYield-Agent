import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AgentWalletPanel from '../components/AgentWalletPanel';
import APRPanel from '../components/APRPanel';
import DecisionPanel from '../components/DecisionPanel';
import ApprovalPanel from '../components/ApprovalPanel';
import RulesPanel from '../components/RulesPanel';
import HistoryTable from '../components/HistoryTable';
import TelegramPanel from '../components/TelegramPanel';
import ProtocolPanel from '../components/ProtocolPanel';

export default function Dashboard() {
  const [state, setState] = useState(null);
  const [aprData, setAprData] = useState(null);
  const [decision, setDecision] = useState(null);
  const [rules, setRules] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/state');
    if (res.ok) setState(await res.json());
  }, []);

  const fetchRules = useCallback(async () => {
    const res = await fetch('/api/rules');
    if (res.ok) setRules(await res.json());
  }, []);

  const fetchHistory = useCallback(async () => {
    const res = await fetch('/api/history');
    if (res.ok) setHistory(await res.json());
  }, []);

  const fetchAPR = useCallback(async () => {
    const res = await fetch('/api/apr');
    if (res.ok) setAprData(await res.json());
  }, []);

  useEffect(() => {
    fetchState();
    fetchRules();
    fetchHistory();
    fetchAPR();
    const interval = setInterval(() => { fetchState(); fetchHistory(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchState, fetchRules, fetchHistory, fetchAPR]);

  const handleRunCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/check', { method: 'POST' });
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: true }),
    });
    const data = await res.json();
    if (res.ok) {
      await fetchState();
      await fetchHistory();
    } else {
      setError(data.error);
    }
  };

  const handleReject = async () => {
    await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved: false }),
    });
    await fetchState();
    await fetchHistory();
  };

  const handleSaveRules = async (newRules) => {
    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRules),
    });
    if (res.ok) setRules(await res.json());
  };

  // Enrich APR snapshot with decision analytics for APRPanel display
  const enrichedAprData = aprData ? {
    ...aprData,
    emaDelta: decision?.emaDelta,
    momentum: decision?.momentum,
    confidenceScore: decision?.confidenceScore,
    confidenceThreshold: rules?.confidenceThreshold,
  } : null;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={styles.logo}>AutoYield Agent</h1>
          <span style={styles.network}>Sepolia Testnet</span>
        </div>
        <Link href="/admin" style={styles.adminLink}>Admin</Link>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <AgentWalletPanel
        agentAddress={state?.agentAddress}
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
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 },
  error: { background: '#2a1010', border: '1px solid #ff4444', borderRadius: 8, padding: '10px 16px', color: '#ff4444', marginBottom: 16, fontSize: 14 },
};
