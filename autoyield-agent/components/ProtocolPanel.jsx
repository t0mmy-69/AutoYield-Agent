import { useState, useEffect } from 'react';
import dappStyles from '../styles/Dapp.module.css';

const PROTOCOL_COLORS = {
  aave: '#B6509E',
  compound: '#00D395',
  radiant: '#FF6B35',
  morpho: '#9747FF',
};

const CHAIN_LABELS = {
  sepolia: 'Sepolia',
  baseSepolia: 'Base Sepolia',
  arbitrumSepolia: 'Arb Sepolia',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  ethereum: 'Ethereum',
};

const PHASE_LABELS = {
  aave: 'Phase 1',
  compound: 'Phase 1',
  radiant: 'Phase 2',
  morpho: 'Phase 2',
};

export default function ProtocolPanel({ aprs = {}, aprErrors = {}, showToggle = false, onAdded, adminFetch = fetch }) {
  const [protocols, setProtocols] = useState([]);
  const [toggling, setToggling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetch('/api/protocols')
      .then(r => r.json())
      .then(setProtocols)
      .catch(() => { });
  }, []);

  const handleToggle = async (id, currentEnabled) => {
    setToggling(id);
    try {
      const res = await adminFetch('/api/protocols', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setProtocols(prev => prev.map(p => p.id === id ? { ...p, enabled: !currentEnabled } : p));
      }
    } catch { /* ignore */ }
    setToggling(null);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove protocol "${name}" from the registry?`)) return;
    setDeleting(id);
    try {
      const res = await adminFetch('/api/protocols', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setProtocols(prev => prev.filter(p => p.id !== id));
      }
    } catch { /* ignore */ }
    setDeleting(null);
  };

  const handleAdded = (newProtocol) => {
    setProtocols(prev => [...prev, { ...newProtocol, enabled: true, custom: true }]);
    setShowAddModal(false);
    if (onAdded) onAdded(newProtocol);
  };

  const bestId = Object.entries(aprs).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <>
      <div className={dappStyles.glassCard}>
        <div className={dappStyles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 className={dappStyles.cardTitle}>Protocol Registry</h2>
            <span style={styles.countBadge}>{protocols.filter(p => p.enabled).length} Active</span>
          </div>
          {showToggle && (
            <button onClick={() => setShowAddModal(true)} style={styles.addBtn}>
              + Add Protocol
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto', margin: '0 -24px -24px -24px' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Protocol', 'Network', 'Phase', 'Live APR', 'Status', ...(showToggle ? ['Control', ''] : [])].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {protocols.map((p, i) => {
                const color = PROTOCOL_COLORS[p.id] || p.color || '#888';
                const apr = aprs[p.id];
                const aprError = aprErrors[p.id];
                const isBest = p.id === bestId && p.enabled;

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent', opacity: p.enabled ? 1 : 0.45 }}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 10px ${color}80` }} />
                        <div>
                          <div style={{ color, fontWeight: 700, fontSize: '0.95rem' }}>
                            {p.name}
                            {p.custom && (
                              <span style={{ ...styles.chip, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', marginLeft: 6, fontSize: '0.65rem' }}>CUSTOM</span>
                            )}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 2 }}>
                            {(p.description || '').slice(0, 40)}{(p.description || '').length > 40 ? '…' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.chip, color: '#cbd5e1' }}>{CHAIN_LABELS[p.chain] || p.chain}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.chip, color: p.enabled ? '#6366f1' : '#94a3b8' }}>
                        {p.custom ? 'Custom' : (PHASE_LABELS[p.id] || '—')}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.enabled ? (
                          apr != null ? (
                            <>
                              <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.05rem' }}>{apr.toFixed(2)}%</span>
                              {isBest && <span style={styles.bestBadge}>BEST</span>}
                            </>
                          ) : aprError ? (
                            <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }} title={aprError}>⚠ N/A</span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>—</span>
                          )
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, background: p.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', color: p.enabled ? '#10b981' : '#cbd5e1', borderColor: p.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)' }}>
                        {p.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {showToggle && (
                      <>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleToggle(p.id, p.enabled)}
                            disabled={toggling === p.id}
                            style={{
                              ...styles.toggleBtn,
                              background: p.enabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              color: p.enabled ? '#ef4444' : '#10b981',
                              borderColor: p.enabled ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                              opacity: toggling === p.id ? 0.5 : 1,
                            }}>
                            {toggling === p.id ? '...' : p.enabled ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deleting === p.id}
                            style={{
                              ...styles.toggleBtn,
                              background: 'rgba(239,68,68,0.08)',
                              color: '#f87171',
                              borderColor: 'rgba(239,68,68,0.25)',
                              opacity: deleting === p.id ? 0.5 : 1,
                            }}>
                            {deleting === p.id ? '...' : 'Delete'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {protocols.length === 0 && (
                <tr>
                  <td colSpan={showToggle ? 7 : 5} style={{ textAlign: 'center', color: '#64748b', padding: '32px 24px' }}>
                    No protocols registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddProtocolModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} adminFetch={adminFetch} />
      )}
    </>
  );
}

function AddProtocolModal({ onClose, onAdded, adminFetch = fetch }) {
  const [form, setForm] = useState({
    type: 'aave',
    name: '',
    chain: 'sepolia',
    contractAddress: '',
    usdcAddress: '',
    marketId: '',
    color: '#818cf8',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const generatedId = form.name
    ? form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + form.chain
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.contractAddress) {
      setError('Name and Contract Address are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, id: generatedId };
      if (form.type !== 'morpho') delete payload.marketId;
      if (form.type === 'morpho') delete payload.usdcAddress;
      const res = await adminFetch('/api/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add protocol');
      } else {
        onAdded(data.protocol);
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <div style={modalStyles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc' }}>Add Custom Protocol</span>
          <button onClick={onClose} style={modalStyles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={modalStyles.row}>
            <label style={modalStyles.label}>Protocol Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={modalStyles.select}>
              <option value="aave">AAVE V3</option>
              <option value="compound">Compound V3</option>
              <option value="morpho">Morpho Blue</option>
            </select>
          </div>

          <div style={modalStyles.row}>
            <label style={modalStyles.label}>Display Name</label>
            <input
              type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. AAVE V3 (Arbitrum)"
              style={modalStyles.input}
              required
            />
          </div>

          <div style={modalStyles.row}>
            <label style={modalStyles.label}>Network</label>
            <select value={form.chain} onChange={e => setForm(f => ({ ...f, chain: e.target.value }))} style={modalStyles.select}>
              <option value="sepolia">Ethereum Sepolia</option>
              <option value="baseSepolia">Base Sepolia</option>
              <option value="arbitrumSepolia">Arbitrum Sepolia</option>
              <option value="ethereum">Ethereum Mainnet</option>
              <option value="arbitrum">Arbitrum One</option>
              <option value="base">Base</option>
              <option value="optimism">Optimism</option>
            </select>
          </div>

          <div style={modalStyles.row}>
            <label style={modalStyles.label}>Contract Address</label>
            <input
              type="text" value={form.contractAddress}
              onChange={e => setForm(f => ({ ...f, contractAddress: e.target.value }))}
              placeholder="0x..."
              style={modalStyles.input}
              spellCheck={false}
              required
            />
          </div>

          {form.type === 'morpho' ? (
            <div style={modalStyles.row}>
              <label style={modalStyles.label}>Market ID (bytes32)</label>
              <input
                type="text" value={form.marketId}
                onChange={e => setForm(f => ({ ...f, marketId: e.target.value }))}
                placeholder="0x... (keccak256 of market params)"
                style={modalStyles.input}
                spellCheck={false}
                required
              />
            </div>
          ) : (
            <div style={modalStyles.row}>
              <label style={modalStyles.label}>USDC Address (for APR query)</label>
              <input
                type="text" value={form.usdcAddress}
                onChange={e => setForm(f => ({ ...f, usdcAddress: e.target.value }))}
                placeholder="0x... (leave blank to use chain default)"
                style={modalStyles.input}
                spellCheck={false}
              />
            </div>
          )}

          {generatedId && (
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Protocol ID: <code style={{ color: '#818cf8' }}>{generatedId}</code>
            </div>
          )}

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={modalStyles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...modalStyles.submitBtn, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Adding...' : 'Add Protocol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  countBadge: { background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 20, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' },
  addBtn: { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
  th: { padding: '12px 24px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '16px 24px', color: '#f8fafc', whiteSpace: 'nowrap', verticalAlign: 'middle' },
  chip: { background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600 },
  bestBadge: { background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px', boxShadow: '0 0 10px rgba(16, 185, 129, 0.1)' },
  statusBadge: { padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', border: '1px solid' },
  toggleBtn: { padding: '6px 16px', fontSize: '0.8rem' },
};

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '28px 32px', width: 480, maxWidth: '95vw', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '1rem' },
  row: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: '0.9rem', fontFamily: 'monospace', outline: 'none' },
  select: { background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f8fafc', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' },
  cancelBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
  submitBtn: { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(99,102,241,0.35)' },
};
