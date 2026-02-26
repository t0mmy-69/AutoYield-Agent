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

export default function RulesPanel({ rules, onSave, onAiGenerate }) {
  const [localRules, setLocalRules] = useState(rules || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // AI builder state
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null); // { rules, explanation, warnings }
  const [aiError, setAiError] = useState(null);

  const handleChange = (key, value) => {
    // executionMode is a string enum — never coerce to number
    const parsed = key === 'executionMode' ? value : (parseFloat(value) || value);
    setLocalRules(r => ({ ...r, [key]: parsed }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(localRules);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenerateWithAI = async () => {
    if (!aiText.trim() || !onAiGenerate) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const result = await onAiGenerate(aiText.trim());
      setAiResult(result);
    } catch (err) {
      setAiError(err.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiRules = async () => {
    if (!aiResult?.rules) return;
    const merged = { ...localRules, ...aiResult.rules };
    setLocalRules(merged);
    setAiResult(null);
    setAiText('');
    setSaving(true);
    await onSave(merged);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={dappStyles.glassCard}>
      <div className={dappStyles.cardHeader}>
        <h2 className={dappStyles.cardTitle}>Agent Configuration Rules</h2>
      </div>

      {/* ── AI Rules Builder ─────────────────────────────────────────────── */}
      <div style={styles.aiSection}>
        <label style={styles.aiSectionLabel}>
          🤖 AI Rules Builder — describe your strategy in plain language
        </label>
        <textarea
          value={aiText}
          onChange={e => setAiText(e.target.value)}
          placeholder='e.g. "Low risk, max 1 move per day, gas below $1, use Aave and Compound only, require Telegram approvals."'
          className="input-glass"
          rows={3}
          style={styles.aiTextarea}
        />
        <button
          onClick={handleGenerateWithAI}
          disabled={aiLoading || !aiText.trim() || !onAiGenerate}
          style={{ ...styles.aiBtn, opacity: aiLoading || !aiText.trim() ? 0.6 : 1 }}
        >
          {aiLoading ? '⏳ Generating...' : '✨ Generate Rules with AI'}
        </button>

        {aiError && (
          <div style={styles.aiError}>{aiError}</div>
        )}

        {aiResult && (
          <div style={styles.aiPreview}>
            {aiResult.aiUnavailable && (
              <div style={styles.aiWarn}>⚠️ AI not configured — showing default conservative rules.</div>
            )}
            {aiResult.explanation && (
              <p style={styles.aiExplanation}>{aiResult.explanation}</p>
            )}
            {aiResult.warnings?.length > 0 && (
              <ul style={styles.aiWarnings}>
                {aiResult.warnings.map((w, i) => (
                  <li key={i} style={styles.aiWarningItem}>⚠️ {w}</li>
                ))}
              </ul>
            )}
            {aiResult.rules && (
              <>
                <pre style={styles.aiJson}>{JSON.stringify(aiResult.rules, null, 2)}</pre>
                <button onClick={handleApplyAiRules} style={styles.aiApplyBtn}>
                  ✓ Apply AI Rules
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Manual Rules Form ─────────────────────────────────────────────── */}
      <div style={styles.divider} />
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
              className="input-glass"
              style={{ padding: '10px 12px', fontSize: '0.95rem' }}
            />
          </label>
        ))}
        <label style={styles.field}>
          <span style={styles.label}>Execution Mode</span>
          <select
            value={localRules.executionMode || 'manual_confirm'}
            onChange={e => handleChange('executionMode', e.target.value)}
            className="input-glass"
            style={{ padding: '10px 12px', fontSize: '0.95rem', cursor: 'pointer' }}>
            <option value="manual_confirm">Manual Confirm (UI)</option>
            <option value="telegram_approval">Telegram Approval</option>
            <option value="auto">Auto Execute</option>
          </select>
        </label>
      </div>
      <button onClick={handleSave} disabled={saving} className={`btn-neon ${saved ? '' : 'btn-neon-primary'}`} style={{ ...styles.btn, opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving...' : saved ? '✓ Saved Successfully' : 'Apply Rules'}
      </button>
    </div>
  );
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 },
  btn: { width: '100%', padding: '14px 0', fontSize: '1rem', letterSpacing: '0.5px' },
  divider: { height: 1, background: 'linear-gradient(90deg, transparent, var(--border-glass), transparent)', margin: '0 0 24px' },
  // AI section
  aiSection: { marginBottom: 24 },
  aiSectionLabel: { display: 'block', fontSize: '0.85rem', color: 'var(--neon-purple)', fontWeight: 700, marginBottom: 10, letterSpacing: 0.3 },
  aiTextarea: { width: '100%', resize: 'vertical', padding: '10px 12px', fontSize: '0.9rem', lineHeight: 1.5, boxSizing: 'border-box', marginBottom: 10 },
  aiBtn: { background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-cyan))', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' },
  aiError: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: '0.85rem', marginTop: 10 },
  aiPreview: { background: 'rgba(176, 38, 255, 0.06)', border: '1px solid rgba(176, 38, 255, 0.2)', borderRadius: 10, padding: '16px', marginTop: 12 },
  aiWarn: { fontSize: '0.85rem', color: '#fbbf24', marginBottom: 10 },
  aiExplanation: { color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.65, margin: '0 0 12px' },
  aiWarnings: { margin: '0 0 12px', padding: '0 0 0 4px', listStyle: 'none' },
  aiWarningItem: { fontSize: '0.82rem', color: '#fbbf24', marginBottom: 4 },
  aiJson: { background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '12px', fontSize: '0.78rem', color: 'var(--neon-cyan)', overflowX: 'auto', margin: '0 0 12px', whiteSpace: 'pre-wrap' },
  aiApplyBtn: { background: 'linear-gradient(135deg, var(--neon-emerald), var(--neon-cyan))', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer' },
};
