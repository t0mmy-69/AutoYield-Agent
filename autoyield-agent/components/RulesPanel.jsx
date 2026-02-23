import { useState } from 'react';
import dappStyles from '../styles/Dapp.module.css';

const FIELDS = [
  { key: 'minDeltaPct', label: 'Min Delta %', type: 'number', step: 0.1, min: 0 },
  { key: 'confidenceThreshold', label: 'Confidence Threshold', type: 'number', step: 0.05, min: 0, max: 1 },
  { key: 'minPersistenceChecks', label: 'Min Persistence Checks', type: 'number', step: 1, min: 1 },
  { key: 'cooldownMinutes', label: 'Cooldown (minutes)', type: 'number', step: 15, min: 0 },
  { key: 'maxGasUsdPerMove', label: 'Max Gas Per Move ($)', type: 'number', step: 0.1, min: 0 },
  { key: 'maxMovesPerYear', label: 'Max Moves Per Year', type: 'number', step: 1, min: 1 },
];

export default function RulesPanel({ rules, onSave }) {
  const [localRules, setLocalRules] = useState(rules || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (key, value) => {
    setLocalRules(r => ({ ...r, [key]: parseFloat(value) || value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(localRules);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Agent Configuration Rules</h2>
      </div>
      <div style={styles.grid}>
        {FIELDS.map(({ key, label, type, step, min, max }) => (
          <label key={key} style={styles.field}>
            <span style={styles.label}>{label}</span>
            <input
              type={type}
              step={step}
              min={min}
              max={max}
              value={localRules[key] ?? ''}
              onChange={e => handleChange(key, e.target.value)}
              style={styles.input}
            />
          </label>
        ))}
        <label style={styles.field}>
          <span style={styles.label}>Execution Mode</span>
          <select
            value={localRules.executionMode || 'manual_confirm'}
            onChange={e => handleChange('executionMode', e.target.value)}
            style={styles.input}>
            <option value="manual_confirm">Manual Confirm (UI)</option>
            <option value="telegram_approval">Telegram Approval</option>
            <option value="auto">Auto Execute</option>
          </select>
        </label>
      </div>
      <button onClick={handleSave} disabled={saving} style={{ ...styles.btn, opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving...' : saved ? '✓ Saved Successfully' : 'Apply Rules'}
      </button>
    </div>
  );
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 },
  input: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#f8fafc',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  btn: { width: '100%', padding: '12px 0', background: 'rgba(255,255,255,0.05)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s' },
};
