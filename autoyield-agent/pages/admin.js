import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtocolPanel from '../components/ProtocolPanel';
import RulesPanel from '../components/RulesPanel';
import HistoryTable from '../components/HistoryTable';

const CHAIN_COLORS = {
  sepolia: '#627EEA',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  base: '#0052FF',
};

export default function AdminDashboard() {
  const [state, setState] = useState(null);
  const [aprData, setAprData] = useState(null);
  const [chains, setChains] = useState([]);
  const [rules, setRules] = useState(null);
  const [history, setHistory] = useState([]);
  const [aprHistory, setAprHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [stateRes, rulesRes, historyRes, chainsRes] = await Promise.all([
      fetch('/api/state'),
      fetch('/api/rules'),
      fetch('/api/history'),
      fetch('/api/chains'),
    ]);
    if (stateRes.ok) setState(await stateRes.json());
    if (rulesRes.ok) setRules(await rulesRes.json());
    if (historyRes.ok) setHistory(await historyRes.json());
    if (chainsRes.ok) setChains(await chainsRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefreshAPR = async () => {
    setRefreshing(true);
    const res = await fetch('/api/apr');
    if (res.ok) setAprData(await res.json());
    setRefreshing(false);
  };

  const handleSaveRules = async (newRules) => {
    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRules),
    });
    if (res.ok) setRules(await res.json());
  };

  const totalRotations = history.filter(h => h.action === 'ROTATE').length;
  const totalVolume = history
    .filter(h => h.action === 'ROTATE' && h.amountUsdc)
    .reduce((sum, h) => sum + parseFloat(h.amountUsdc || 0), 0);
  const lastCheck = history[0]?.executedAt || history[0]?.timestamp;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dapp" style={styles.backLink}>← DApp</Link>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <span style={styles.adminBadge}>ADMIN</span>
        </div>
        <div style={{ color: '#555', fontSize: 13 }}>
          {new Date().toLocaleString()}
        </div>
      </div>

      {/* System Health */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>System Overview</h2>
        <div style={styles.statsGrid}>
          <StatCard label="Agent Wallet" value={state?.agentAddress ? `${state.agentAddress.slice(0, 8)}...${state.agentAddress.slice(-6)}` : '—'} sub="Sepolia" color="#4f46e5" />
          <StatCard label="USDC Balance" value={state?.usdcBalance != null ? `$${parseFloat(state.usdcBalance).toFixed(2)}` : '—'} sub="Agent wallet" color="#00d395" />
          <StatCard label="Active Protocol" value={state?.currentProtocol?.toUpperCase() || '—'} sub="Current deployment" color="#B6509E" />
          <StatCard label="Total Rotations" value={totalRotations} sub="All time" color="#ff9900" />
          <StatCard label="Volume Rotated" value={`$${totalVolume.toFixed(0)}`} sub="USDC all time" color="#00d395" />
          <StatCard label="Execution Mode" value={rules?.executionMode?.replace('_', ' ') || '—'} sub="Current setting" color="#4f46e5" />
        </div>
      </section>

      {/* Live APR Snapshot */}
      <section style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={styles.sectionTitle}>Live APR Snapshot</h2>
          <button onClick={handleRefreshAPR} disabled={refreshing} style={styles.refreshBtn}>
            {refreshing ? 'Fetching...' : 'Refresh APRs'}
          </button>
        </div>
        {aprData ? (
          <div style={styles.aprGrid}>
            {Object.entries(aprData.aprs || {}).map(([id, apr]) => {
              const isBest = id === aprData.best;
              return (
                <div key={id} style={{ ...styles.aprCard, borderColor: isBest ? '#00d395' : '#2a2a4a' }}>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{id}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: isBest ? '#00d395' : '#eee', margin: '8px 0' }}>
                    {apr.toFixed(2)}%
                  </div>
                  {isBest && <span style={styles.bestBadge}>BEST RATE</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>Click "Refresh APRs" to fetch current rates from all enabled protocols.</div>
        )}
      </section>

      {/* Protocol Registry */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Protocol Registry</h2>
        <p style={styles.sectionDesc}>Enable or disable protocols. Disabled protocols are excluded from all APR comparisons and rotation decisions.</p>
        <ProtocolPanel aprs={aprData?.aprs || {}} showToggle={true} />
      </section>

      {/* Chain Registry */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Chain Registry</h2>
        <p style={styles.sectionDesc}>Supported networks. Chains marked "upcoming" are planned for Phase 2+ deployment.</p>
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Network', 'Chain ID', 'Status', 'RPC', 'Phase', 'Explorer'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chains.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #1a1a2e', opacity: c.enabled ? 1 : 0.5 }}>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHAIN_COLORS[c.id] || '#888' }} />
                      <span style={{ fontWeight: 700, color: '#eee' }}>{c.name}</span>
                      {c.isTestnet && <span style={{ ...styles.chip, color: '#ff9900', fontSize: 10 }}>TESTNET</span>}
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: '#888', fontFamily: 'monospace' }}>{c.chainId}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: c.enabled ? '#00d39515' : '#33333530', color: c.enabled ? '#00d395' : '#555', borderColor: c.enabled ? '#00d39540' : '#33333560' }}>
                      {c.enabled ? 'Live' : 'Upcoming'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, background: c.rpcConfigured ? '#4f46e515' : '#2a101020', color: c.rpcConfigured ? '#4f46e5' : '#ff6666', borderColor: c.rpcConfigured ? '#4f46e540' : '#ff444430' }}>
                      {c.rpcConfigured ? 'Configured' : 'Missing'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.chip}>{c.phase === 'live' ? 'Phase 1' : 'Phase 2+'}</span>
                  </td>
                  <td style={styles.td}>
                    <a href={c.explorer} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', fontSize: 12 }}>
                      {c.explorer.replace('https://', '').split('/')[0]}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Decision Rules */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Decision Rules</h2>
        <p style={styles.sectionDesc}>Tune agent behavior. Changes apply immediately to the next decision cycle.</p>
        {rules && <RulesPanel rules={rules} onSave={handleSaveRules} />}
      </section>

      {/* Execution Log */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Full Execution Log</h2>
        <p style={styles.sectionDesc}>{history.length} decisions recorded. {totalRotations} rotations executed.</p>
        <HistoryTable history={history} />
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 10, padding: '16px 20px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#eee', wordBreak: 'break-all' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a18', minHeight: '100vh', color: '#eee' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid #1a1a2e' },
  title: { margin: 0, fontSize: 22, fontWeight: 900, color: '#fff' },
  adminBadge: { background: '#4f46e520', color: '#4f46e5', border: '1px solid #4f46e540', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  backLink: { color: '#888', textDecoration: 'none', fontSize: 14, padding: '6px 12px', border: '1px solid #2a2a4a', borderRadius: 6 },
  section: { marginBottom: 40 },
  sectionTitle: { margin: '0 0 6px', fontSize: 15, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
  sectionDesc: { margin: '0 0 16px', fontSize: 13, color: '#555' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  aprGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 },
  aprCard: { background: '#1a1a2e', border: '2px solid', borderRadius: 12, padding: '20px', textAlign: 'center' },
  bestBadge: { background: '#00d39520', color: '#00d395', border: '1px solid #00d39540', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 },
  emptyState: { color: '#555', textAlign: 'center', padding: '32px 0', fontSize: 14, background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 10 },
  card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '8px 12px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '1px solid #2a2a4a', whiteSpace: 'nowrap', fontSize: 12 },
  td: { padding: '14px 12px', color: '#ccc', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  chip: { background: '#0f0f1e', border: '1px solid #2a2a4a', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#888' },
  statusBadge: { padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11, border: '1px solid' },
  refreshBtn: { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
};
