import { useState } from 'react';

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
    <div style={styles.card}>
      <h2 style={styles.title}>Agent Rules</h2>
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
      <button onClick={handleSave} disabled={saving} style={styles.btn}>
        {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Rules'}
      </button>
    </div>
  );
}

const styles = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  title: { margin: '0 0 16px', fontSize: 16, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, color: '#888' },
  input: { background: '#0f0f1e', border: '1px solid #2a2a4a', borderRadius: 6, padding: '8px 10px', color: '#eee', fontSize: 14, outline: 'none' },
  btn: { padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
};
