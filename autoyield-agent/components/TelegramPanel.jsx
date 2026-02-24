import { useState, useEffect } from 'react';

function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return;
    }
  } catch { /* fall through */ }
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(el);
}

export default function TelegramPanel({ token }) {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);

  // Telegram enable/disable (executionMode)
  const [executionMode, setExecutionMode] = useState(null);
  const [toggling, setToggling] = useState(false);

  // Form fields
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // Test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Webhook copy
  const [copied, setCopied] = useState(false);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchStatus = () =>
    fetch('/api/telegram/status').then(r => r.json()).then(setStatus).catch(() => {});

  const fetchConfig = () =>
    fetch('/api/telegram/config').then(r => r.json()).then(d => {
      setConfig(d);
      setChatId(d.chatId || '');
      // Leave botToken blank — user must re-enter to update (security)
    }).catch(() => {});

  const fetchRules = () =>
    fetch('/api/rules', { headers: authHeader }).then(r => r.json()).then(d => {
      setExecutionMode(d.executionMode || 'manual_confirm');
    }).catch(() => {});

  useEffect(() => {
    fetchStatus();
    fetchConfig();
    fetchRules();
  }, []);

  const isTelegramEnabled = executionMode === 'telegram_approval';

  const handleToggleTelegram = async () => {
    setToggling(true);
    const newMode = isTelegramEnabled ? 'manual_confirm' : 'telegram_approval';
    try {
      const rulesRes = await fetch('/api/rules', { headers: authHeader });
      const currentRules = rulesRes.ok ? await rulesRes.json() : {};
      await fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...currentRules, executionMode: newMode }),
      });
      setExecutionMode(newMode);
    } catch { /* ignore */ }
    setToggling(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const body = {};
      if (botToken.trim()) body.botToken = botToken.trim();
      if (chatId.trim()) body.chatId = chatId.trim();

      const res = await fetch('/api/telegram/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaveMsg({ ok: true, text: 'Config saved!' });
        setBotToken('');
        await fetchStatus();
        await fetchConfig();
      } else {
        setSaveMsg({ ok: false, text: 'Failed to save.' });
      }
    } catch {
      setSaveMsg({ ok: false, text: 'Network error.' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear Telegram config? The bot will stop sending approval messages.')) return;
    await fetch('/api/telegram/config', { method: 'DELETE' });
    setBotToken('');
    setChatId('');
    setTestResult(null);
    await fetchStatus();
    await fetchConfig();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, text: `✓ Connected as @${data.botUsername}. Test message sent!` });
      } else {
        setTestResult({ ok: false, text: `✗ ${data.error}` });
      }
    } catch {
      setTestResult({ ok: false, text: '✗ Network error.' });
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = () => {
    if (status?.webhookUrl) {
      copyToClipboard(status.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isConfigured = status?.configured;
  const canSave = botToken.trim() || chatId.trim();

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.headerRow}>
        <h2 style={s.title}>Telegram Bot</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Enable/Disable Toggle */}
          <button
            onClick={handleToggleTelegram}
            disabled={toggling}
            style={{
              ...s.toggleBtn,
              background: isTelegramEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              color: isTelegramEnabled ? '#4ade80' : '#888',
              borderColor: isTelegramEnabled ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)',
              opacity: toggling ? 0.6 : 1,
            }}
            title={isTelegramEnabled ? 'Tắt Telegram Approval' : 'Bật Telegram Approval'}
          >
            <span style={s.toggleDot(isTelegramEnabled)} />
            {isTelegramEnabled ? 'Telegram: ON' : 'Telegram: OFF'}
          </button>
          <span style={isConfigured ? s.badgeOk : s.badgeWarn}>
            {isConfigured ? '● Connected' : '● Not Connected'}
          </span>
        </div>
      </div>

      <p style={s.desc}>
        Mỗi người tự tạo bot Telegram của mình qua <strong>@BotFather</strong>, nhập token + chat ID vào đây.
        Bot đó sẽ gửi lệnh approve/reject thẳng vào agent wallet của bạn.
      </p>

      {/* Config Form */}
      <div style={s.formSection}>
        <p style={s.sectionLabel}>Bot Configuration</p>
        <div style={s.formGrid}>
          <label style={s.field}>
            <span style={s.fieldLabel}>
              Bot Token
              {config?.hasToken && <span style={s.configured}> ✓ đã lưu ({config.maskedToken})</span>}
            </span>
            <input
              type="password"
              placeholder={config?.hasToken ? 'Nhập để thay đổi token...' : 'Lấy từ @BotFather → /newbot'}
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              style={s.input}
              autoComplete="off"
            />
          </label>
          <label style={s.field}>
            <span style={s.fieldLabel}>
              Chat ID
              {config?.hasChatId && <span style={s.configured}> ✓ đã lưu</span>}
            </span>
            <input
              type="text"
              placeholder="VD: 123456789 (dùng @userinfobot để lấy)"
              value={chatId}
              onChange={e => setChatId(e.target.value)}
              style={s.input}
            />
          </label>
        </div>

        <div style={s.btnRow}>
          <button onClick={handleSave} disabled={saving || !canSave} style={s.saveBtn}>
            {saving ? 'Saving...' : 'Save Config'}
          </button>
          {isConfigured && (
            <button onClick={handleClear} style={s.clearBtn}>Clear</button>
          )}
          {saveMsg && (
            <span style={saveMsg.ok ? s.msgOk : s.msgFail}>{saveMsg.text}</span>
          )}
        </div>
      </div>

      {/* How to get Chat ID */}
      <div style={s.hint}>
        <strong>Lấy Chat ID:</strong> Nhắn tin bất kỳ cho bot của bạn, rồi mở URL:<br />
        <code style={s.hintCode}>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code><br />
        → tìm <code>"chat": &#123; "id": 123456789 &#125;</code>. Hoặc nhắn <code>/start</code> cho <strong>@userinfobot</strong>.
      </div>

      {/* Webhook URL */}
      {status?.webhookUrl && (
        <div style={s.section}>
          <p style={s.sectionLabel}>Webhook URL</p>
          <div style={s.webhookRow}>
            <code style={s.webhookUrl}>{status.webhookUrl}</code>
            <button onClick={handleCopy} style={s.copyBtn}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p style={s.smallHint}>
            Đăng ký webhook với Telegram (cần domain public/ngrok):<br />
            <code style={s.hintCode}>
              {`https://api.telegram.org/bot<TOKEN>/setWebhook?url=${status.webhookUrl}`}
            </code>
          </p>
        </div>
      )}

      {/* Approval Flow */}
      <div style={s.section}>
        <p style={s.sectionLabel}>Approval Flow</p>
        <div style={s.flow}>
          {[
            'Agent chạy check → quyết định ROTATE',
            'Bot gửi message vào Telegram của bạn (delta %, gas, projected gain)',
            'Bạn bấm ✅ Approve hoặc ❌ Reject ngay trong Telegram',
            'Nếu approve → rotation thực thi on-chain',
            'Nếu reject / timeout → NOOP ghi vào history',
          ].map((text, i) => (
            <div key={i} style={s.flowRow}>
              <span style={s.flowNum}>{i + 1}</span>
              <span style={s.flowText}>{text}</span>
            </div>
          ))}
        </div>
        <p style={s.smallHint}>
          Bật ở <strong>Agent Rules</strong> → <em>Execution Mode</em>: <strong>Telegram Approval</strong>
        </p>
      </div>

      {/* Test Connection */}
      {isConfigured && (
        <div style={s.testRow}>
          <button onClick={handleTest} disabled={testing} style={s.testBtn}>
            {testing ? 'Sending...' : '📨 Send Test Message'}
          </button>
          {testResult && (
            <span style={testResult.ok ? s.msgOk : s.msgFail}>{testResult.text}</span>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { margin: 0, fontSize: 16, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  badgeOk: { background: '#0d2b1a', border: '1px solid #1a5c35', color: '#4ade80', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  badgeWarn: { background: '#2b1a0d', border: '1px solid #5c3a1a', color: '#fb923c', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  desc: { fontSize: 13, color: '#aaa', margin: '0 0 16px', lineHeight: 1.6 },

  formSection: { background: '#0f0f1e', border: '1px solid #2a2a4a', borderRadius: 8, padding: '14px 16px', marginBottom: 14 },
  sectionLabel: { margin: '0 0 10px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel: { fontSize: 12, color: '#888' },
  configured: { color: '#4ade80', fontWeight: 600 },
  input: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 6, padding: '8px 10px', color: '#eee', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  saveBtn: { padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  clearBtn: { padding: '8px 16px', background: 'transparent', color: '#f87171', border: '1px solid #f87171', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  msgOk: { fontSize: 13, color: '#4ade80' },
  msgFail: { fontSize: 13, color: '#f87171' },

  hint: { fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 1.7, background: '#0f0f1e', border: '1px solid #1e1e3a', borderRadius: 6, padding: '10px 14px' },
  hintCode: { color: '#7c6af7', fontSize: 11, wordBreak: 'break-all' },

  section: { borderTop: '1px solid #2a2a4a', paddingTop: 14, marginTop: 14 },
  webhookRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  webhookUrl: { flex: 1, background: '#0f0f1e', border: '1px solid #2a2a4a', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#a78bfa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' },
  copyBtn: { padding: '6px 14px', background: '#2a2a4a', color: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
  smallHint: { fontSize: 12, color: '#666', marginTop: 6, lineHeight: 1.6 },

  flow: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 },
  flowRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  flowNum: { background: '#4f46e5', color: '#fff', borderRadius: '50%', width: 22, height: 22, minWidth: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, lineHeight: '22px', textAlign: 'center' },
  flowText: { fontSize: 13, color: '#bbb', paddingTop: 3 },

  testRow: { borderTop: '1px solid #2a2a4a', paddingTop: 14, marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  testBtn: { padding: '9px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  toggleBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: '1px solid', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s' },
  toggleDot: (on) => ({ width: 8, height: 8, borderRadius: '50%', background: on ? '#4ade80' : '#555', display: 'inline-block', transition: 'background 0.2s' }),
};
