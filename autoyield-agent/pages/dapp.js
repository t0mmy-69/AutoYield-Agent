import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import AgentWalletPanel from '../components/AgentWalletPanel';
import APRPanel from '../components/APRPanel';
import DecisionPanel from '../components/DecisionPanel';
import ApprovalPanel from '../components/ApprovalPanel';
import RulesPanel from '../components/RulesPanel';
import HistoryTable from '../components/HistoryTable';
import styles from '../styles/Dapp.module.css';

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
    // Poll state every 30s to detect Telegram approvals
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
    const res = await fetch('/api/approve', {
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

  // Merge confidence score data from decision into aprData for APRPanel
  const enrichedAprData = aprData ? {
    ...aprData,
    emaDelta: decision?.emaDelta,
    momentum: decision?.momentum,
    confidenceScore: decision?.confidenceScore,
    confidenceThreshold: rules?.confidenceThreshold,
  } : null;

  return (
    <div className={styles.page}>
      <Head>
        <title>AutoYield | Dapp Dashboard</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22h20L12 2z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          AutoYield Dapp
        </div>
        <div className={styles.networkBadge}>
          <div className={styles.pulseDot}></div>
          Sepolia Testnet
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.mainGrid}>
        {/* Left Column: Data & Analytics */}
        <div className={styles.leftCol}>
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
          <APRPanel aprData={enrichedAprData} />
          <HistoryTable history={history} />
        </div>

        {/* Right Column: Controls & Decisions */}
        <div className={styles.rightCol}>
          <DecisionPanel
            decision={decision}
            onRunCheck={handleRunCheck}
            loading={loading}
          />
          <RulesPanel rules={rules} onSave={handleSaveRules} />
        </div>
      </div>
    </div>
  );
}
