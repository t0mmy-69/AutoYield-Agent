import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dappStyles from '../styles/Dapp.module.css';
import ProtocolPanel from '../components/ProtocolPanel';
import RulesPanel from '../components/RulesPanel';
import HistoryTable from '../components/HistoryTable';

const CHAIN_COLORS = {
  sepolia: '#627EEA',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  base: '#0052FF',
};

// Credential groups for the admin UI
const CHAIN_CRED_GROUPS = [
  {
    id: 'sepolia', name: 'Sepolia Testnet', color: '#627EEA', phase: 'Phase 1',
    fields: [
      { key: 'RPC_URL', label: 'RPC URL', placeholder: 'https://sepolia.infura.io/v3/YOUR_KEY' },
      { key: 'USDC_ADDRESS', label: 'USDC Contract', placeholder: '0x...' },
    ],
  },
  {
    id: 'arbitrum', name: 'Arbitrum One', color: '#28A0F0', phase: 'Phase 2',
    fields: [
      { key: 'ARBITRUM_RPC_URL', label: 'RPC URL', placeholder: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY' },
      { key: 'ARBITRUM_USDC_ADDRESS', label: 'USDC Contract', placeholder: '0x...' },
    ],
  },
  {
    id: 'optimism', name: 'Optimism', color: '#FF0420', phase: 'Phase 2',
    fields: [
      { key: 'OPTIMISM_RPC_URL', label: 'RPC URL', placeholder: 'https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY' },
      { key: 'OPTIMISM_USDC_ADDRESS', label: 'USDC Contract', placeholder: '0x...' },
    ],
  },
  {
    id: 'base', name: 'Base', color: '#0052FF', phase: 'Phase 2',
    fields: [
      { key: 'BASE_RPC_URL', label: 'RPC URL', placeholder: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY' },
      { key: 'BASE_USDC_ADDRESS', label: 'USDC Contract', placeholder: '0x...' },
    ],
  },
];

const PROTOCOL_CRED_GROUPS = [
  {
    id: 'aave', name: 'AAVE V3', color: '#B6509E', chain: 'Sepolia',
    fields: [{ key: 'AAVE_POOL_ADDRESS', label: 'Pool Address', placeholder: '0x...' }],
  },
  {
    id: 'compound', name: 'Compound V3', color: '#00D395', chain: 'Sepolia',
    fields: [{ key: 'COMPOUND_COMET_ADDRESS', label: 'Comet Address', placeholder: '0x...' }],
  },
  {
    id: 'radiant', name: 'Radiant Capital', color: '#FF6B35', chain: 'Arbitrum',
    fields: [{ key: 'RADIANT_POOL_ADDRESS', label: 'Pool Address', placeholder: '0x...' }],
  },
  {
    id: 'morpho', name: 'Morpho Blue', color: '#9747FF', chain: 'Base',
    fields: [{ key: 'MORPHO_POOL_ADDRESS', label: 'Pool Address', placeholder: '0x...' }],
  },
];

export default function AdminDashboard() {
  const [state, setState] = useState(null);
  const [aprData, setAprData] = useState(null);
  const [chains, setChains] = useState([]);
  const [rules, setRules] = useState(null);
  const [history, setHistory] = useState([]);
  const [aprHistory, setAprHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [credentials, setCredentials] = useState({}); // key → { source, fileValue, ... }
  const [credEdits, setCredEdits] = useState({});     // key → current input value
  const [credSaving, setCredSaving] = useState(null); // group id being saved
  const [chainToggling, setChainToggling] = useState(null);
  const [chainDeleting, setChainDeleting] = useState(null);

  const load = useCallback(async () => {
    const [stateRes, rulesRes, historyRes, chainsRes, credRes] = await Promise.all([
      fetch('/api/state'),
      fetch('/api/rules'),
      fetch('/api/history'),
      fetch('/api/chains'),
      fetch('/api/credentials'),
    ]);
    if (stateRes.ok) setState(await stateRes.json());
    if (rulesRes.ok) setRules(await rulesRes.json());
    if (historyRes.ok) setHistory(await historyRes.json());
    if (chainsRes.ok) setChains(await chainsRes.json());
    if (credRes.ok) {
      const list = await credRes.json();
      const map = {};
      const edits = {};
      list.forEach(c => {
        map[c.key] = c;
        edits[c.key] = c.fileValue || '';
      });
      setCredentials(map);
      setCredEdits(edits);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefreshAPR = async () => {
    setRefreshing(true);
    const res = await fetch('/api/apr');
    if (res.ok) setAprData(await res.json());
    setRefreshing(false);
  };

  const handleSaveCreds = async (groupId, keys) => {
    setCredSaving(groupId);
    const updates = {};
    keys.forEach(k => { updates[k] = credEdits[k] ?? ''; });
    const res = await fetch('/api/credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const list = await res.json();
      const map = {};
      const edits = { ...credEdits };
      list.forEach(c => {
        map[c.key] = c;
        edits[c.key] = c.fileValue || '';
      });
      setCredentials(map);
      setCredEdits(edits);
    }
    setCredSaving(null);
  };

  const handleSaveRules = async (newRules) => {
    const res = await fetch('/api/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRules),
    });
    if (res.ok) setRules(await res.json());
  };

  const handleChainToggle = async (id, currentEnabled) => {
    setChainToggling(id);
    try {
      const res = await fetch('/api/chains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      if (res.ok) setChains(prev => prev.map(c => c.id === id ? { ...c, enabled: !currentEnabled } : c));
    } catch { /* ignore */ }
    setChainToggling(null);
  };

  const handleChainDelete = async (id, name) => {
    if (!confirm(`Xóa chain "${name}" khỏi danh sách? Có thể restore lại bằng cách xóa data/chains.json.`)) return;
    setChainDeleting(id);
    try {
      const res = await fetch('/api/chains', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setChains(prev => prev.filter(c => c.id !== id));
    } catch { /* ignore */ }
    setChainDeleting(null);
  };

  const totalRotations = history.filter(h => h.action === 'ROTATE').length;
  const totalVolume = history
    .filter(h => h.action === 'ROTATE' && h.amountUsdc)
    .reduce((sum, h) => sum + parseFloat(h.amountUsdc || 0), 0);
  const lastCheck = history[0]?.executedAt || history[0]?.timestamp;

  return (
    <div className={dappStyles.page}>
      {/* Header */}
      <header className={dappStyles.header} style={{ marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 20 }}>
        <div className={dappStyles.logoArea}>
          <Link href="/dapp" style={styles.backLink}>← DApp</Link>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginLeft: 16 }}>Admin Dashboard</span>
          <span style={styles.adminBadge}>ADMIN</span>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>
          {new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      </header>

      {/* System Health */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>System Overview</h2>
        <div style={styles.statsGrid}>
          <StatCard label="Agent Wallet" value={state?.agentAddress ? `${state.agentAddress.slice(0, 8)}...${state.agentAddress.slice(-6)}` : '—'} sub="Sepolia" color="#6366f1" />
          <StatCard label="USDC Balance" value={state?.usdcBalance != null ? `$${parseFloat(state.usdcBalance).toFixed(2)}` : '—'} sub="Agent wallet" color="#10b981" />
          <StatCard label="Active Protocol" value={state?.currentProtocol?.toUpperCase() || '—'} sub="Current deployment" color="#ec4899" />
          <StatCard label="Total Rotations" value={totalRotations} sub="All time" color="#f59e0b" />
          <StatCard label="Volume Rotated" value={`$${totalVolume.toFixed(0)}`} sub="USDC all time" color="#10b981" />
          <StatCard label="Execution Mode" value={rules?.executionMode?.replace('_', ' ') || '—'} sub="Current setting" color="#6366f1" />
        </div>
      </section>

      {/* Live APR Snapshot */}
      <section style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px 4px' }}>
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
                <div key={id} className={dappStyles.glassCard} style={{ ...styles.aprCard, borderColor: isBest ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.08)', boxShadow: isBest ? '0 0 20px rgba(16, 185, 129, 0.15)' : undefined }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{id}</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: isBest ? '#10b981' : '#f8fafc', margin: '12px 0' }}>
                    {apr.toFixed(2)}%
                  </div>
                  {isBest && <span style={styles.bestBadge}>⭐ BEST RATE</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={dappStyles.glassCard} style={styles.emptyState}>
            <p>Click "Refresh APRs" to fetch current rates from all enabled protocols.</p>
          </div>
        )}
      </section>

      {/* Protocol Registry */}
      <section style={styles.section}>
        <div style={{ margin: '0 0 16px 4px' }}>
          <h2 style={styles.sectionTitle}>Protocol Registry</h2>
          <p style={styles.sectionDesc}>Enable or disable protocols. Disabled protocols are excluded from all APR comparisons and rotation decisions.</p>
        </div>
        <ProtocolPanel aprs={aprData?.aprs || {}} showToggle={true} />
      </section>

      {/* Chain Registry */}
      <section style={styles.section}>
        <div style={{ margin: '0 0 16px 4px' }}>
          <h2 style={styles.sectionTitle}>Chain Registry</h2>
          <p style={styles.sectionDesc}>Supported networks. Chains marked "upcoming" are planned for Phase 2+ deployment.</p>
        </div>
        <div className={dappStyles.glassCard}>
          <div style={{ overflowX: 'auto', margin: '0 -24px -24px -24px' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Network', 'Chain ID', 'Status', 'RPC', 'Phase', 'Explorer', 'Control', ''].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chains.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent', opacity: c.enabled ? 1 : 0.5 }}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHAIN_COLORS[c.id] || '#888', boxShadow: `0 0 10px ${CHAIN_COLORS[c.id]}80` }} />
                        <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>{c.name}</span>
                        {c.isTestnet && <span style={{ ...styles.chip, color: '#f59e0b', fontSize: '0.7rem' }}>TESTNET</span>}
                      </div>
                    </td>
                    <td style={{ ...styles.td, color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.chainId}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, background: c.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', color: c.enabled ? '#10b981' : '#cbd5e1', borderColor: c.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)' }}>
                        {c.enabled ? 'Live' : 'Upcoming'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, background: c.rpcConfigured ? 'rgba(99, 102, 241, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: c.rpcConfigured ? '#818cf8' : '#ef4444', borderColor: c.rpcConfigured ? 'rgba(99, 102, 241, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}>
                        {c.rpcConfigured ? 'Configured' : 'Missing'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.chip}>{c.phase === 'live' ? 'Phase 1' : 'Phase 2+'}</span>
                    </td>
                    <td style={styles.td}>
                      <a href={c.explorer} target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                        {c.explorer.replace('https://', '').split('/')[0]}
                      </a>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleChainToggle(c.id, c.enabled)}
                        disabled={chainToggling === c.id}
                        style={{
                          ...styles.actionBtn,
                          background: c.enabled ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: c.enabled ? '#ef4444' : '#10b981',
                          borderColor: c.enabled ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)',
                          opacity: chainToggling === c.id ? 0.5 : 1,
                        }}>
                        {chainToggling === c.id ? '...' : c.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleChainDelete(c.id, c.name)}
                        disabled={chainDeleting === c.id}
                        style={{
                          ...styles.actionBtn,
                          background: 'rgba(239,68,68,0.08)',
                          color: '#f87171',
                          borderColor: 'rgba(239,68,68,0.25)',
                          opacity: chainDeleting === c.id ? 0.5 : 1,
                        }}>
                        {chainDeleting === c.id ? '...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* API Credentials */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>API Credentials</h2>
        <p style={styles.sectionDesc}>
          Configure RPC endpoints and contract addresses. Values saved here override environment variables at runtime without restarting the server.
          <span style={{ color: '#ff9900', marginLeft: 8 }}>⚠ Agent private key is managed via env only.</span>
        </p>

        <h3 style={styles.subSectionTitle}>Chain RPC & USDC</h3>
        <div style={styles.credGrid}>
          {CHAIN_CRED_GROUPS.map(group => (
            <CredentialCard
              key={group.id}
              group={group}
              credentials={credentials}
              credEdits={credEdits}
              setCredEdits={setCredEdits}
              onSave={handleSaveCreds}
              saving={credSaving === group.id}
            />
          ))}
        </div>

        <h3 style={{ ...styles.subSectionTitle, marginTop: 28 }}>Protocol Contract Addresses</h3>
        <div style={styles.credGrid}>
          {PROTOCOL_CRED_GROUPS.map(group => (
            <CredentialCard
              key={group.id}
              group={group}
              credentials={credentials}
              credEdits={credEdits}
              setCredEdits={setCredEdits}
              onSave={handleSaveCreds}
              saving={credSaving === group.id}
            />
          ))}
        </div>
      </section>

      {/* Decision Rules */}
      <section style={styles.section}>
        <div style={{ margin: '0 0 16px 4px' }}>
          <h2 style={styles.sectionTitle}>Decision Rules</h2>
          <p style={styles.sectionDesc}>Tune agent behavior. Changes apply immediately to the next decision cycle.</p>
        </div>
        {rules && <RulesPanel rules={rules} onSave={handleSaveRules} />}
      </section>

      {/* Execution Log */}
      <section style={styles.section}>
        <div style={{ margin: '0 0 16px 4px' }}>
          <h2 style={styles.sectionTitle}>Full Execution Log</h2>
          <p style={styles.sectionDesc}>{history.length} decisions recorded. {totalRotations} rotations executed.</p>
        </div>
        <HistoryTable history={history} />
      </section>
    </div>
  );
}

function CredentialCard({ group, credentials, credEdits, setCredEdits, onSave, saving }) {
  const allConfigured = group.fields.every(f => {
    const c = credentials[f.key];
    return c && c.source !== 'unset';
  });

  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${group.color}`, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, color: '#eee', fontSize: 14 }}>{group.name}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
            {group.chain ? `on ${group.chain}` : group.phase}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
            background: allConfigured ? '#00d39515' : '#ff990015',
            color: allConfigured ? '#00d395' : '#ff9900',
            border: `1px solid ${allConfigured ? '#00d39540' : '#ff990040'}`,
          }}>
            {allConfigured ? '● Ready' : '○ Incomplete'}
          </span>
          <button
            onClick={() => onSave(group.id, group.fields.map(f => f.key))}
            disabled={saving}
            style={styles.saveCredBtn}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {group.fields.map(field => {
        const cred = credentials[field.key] || {};
        const sourceColor = cred.source === 'file' ? '#00d395' : cred.source === 'env' ? '#4f46e5' : '#555';
        const sourceLabel = cred.source === 'file' ? 'saved' : cred.source === 'env' ? 'env' : 'not set';
        return (
          <div key={field.key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 0.5 }}>
                {field.label}
              </label>
              <span style={{ fontSize: 10, color: sourceColor, fontWeight: 700 }}>● {sourceLabel}</span>
            </div>
            <input
              type="text"
              value={credEdits[field.key] || ''}
              onChange={e => setCredEdits(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={cred.source === 'env' ? '(configured via env)' : field.placeholder}
              spellCheck={false}
              style={styles.credInput}
            />
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className={dappStyles.glassCard} style={{ borderLeft: `4px solid ${color}`, padding: '20px', transition: 'transform 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', wordBreak: 'break-all', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 8, fontWeight: 500 }}>{sub}</div>
    </div>
  );
}

const styles = {
  adminBadge: { background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', marginLeft: 16 },
  backLink: { color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontWeight: 600, transition: 'all 0.2s' },
  section: { marginBottom: 48 },
  sectionTitle: { margin: '0 0 8px', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' },
  sectionDesc: { margin: '0 0 20px', fontSize: '0.9rem', color: '#94a3b8' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  aprGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  aprCard: { padding: '28px 20px', textAlign: 'center', transition: 'all 0.3s' },
  bestBadge: { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px', display: 'inline-block' },
  emptyState: { color: '#94a3b8', textAlign: 'center', padding: '48px 0', fontSize: '0.95rem' },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { padding: '12px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '16px 24px', color: '#f8fafc', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  chip: { background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' },
  statusBadge: { padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', border: '1px solid' },
  refreshBtn: { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)', transition: 'all 0.2s', outline: 'none' },
  subSectionTitle: { margin: '0 0 12px', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' },
  credGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  credInput: { width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 10px', color: '#f8fafc', fontSize: '0.8rem', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' },
  saveCredBtn: { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '5px 14px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  actionBtn: { padding: '5px 14px', border: '1px solid', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.2s', outline: 'none', whiteSpace: 'nowrap' },
};
