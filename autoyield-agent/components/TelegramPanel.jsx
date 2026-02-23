import { useState, useEffect } from 'react';

export default function TelegramPanel() {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/telegram/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, message: `Connected as @${data.botUsername} (${data.botName}). Test message sent!` });
      } else {
        setTestResult({ ok: false, message: data.error });
      }
    } catch {
      setTestResult({ ok: false, message: 'Network error — could not reach Telegram API.' });
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = () => {
    if (status?.webhookUrl) {
      navigator.clipboard.writeText(status.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isConfigured = status?.configured;

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Telegram Integration</h2>
        <span style={isConfigured ? styles.badgeOk : styles.badgeWarn}>
          {isConfigured ? '● Connected' : '● Not Configured'}
        </span>
      </div>

      {/* Status Checklist */}
      <div style={styles.checkList}>
        <div style={styles.checkRow}>
          <span style={status?.hasToken ? styles.checkOk : styles.checkFail}>
            {status?.hasToken ? '✓' : '✗'}
          </span>
          <span style={styles.checkLabel}>
            <code>TELEGRAM_BOT_TOKEN</code> in <code>.env.local</code>
          </span>
        </div>
        <div style={styles.checkRow}>
          <span style={status?.hasChatId ? styles.checkOk : styles.checkFail}>
            {status?.hasChatId ? '✓' : '✗'}
          </span>
          <span style={styles.checkLabel}>
            <code>TELEGRAM_CHAT_ID</code> in <code>.env.local</code>
          </span>
        </div>
      </div>

      {/* Setup Instructions (shown when not configured) */}
      {!isConfigured && (
        <div style={styles.instructions}>
          <p style={styles.instrTitle}>Setup Guide</p>
          <ol style={styles.ol}>
            <li>Open Telegram and message <strong>@BotFather</strong></li>
            <li>Send <code>/newbot</code> and follow the prompts to get your <strong>Bot Token</strong></li>
            <li>Start a chat with your new bot, then visit:<br />
              <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code><br />
              to find your <strong>Chat ID</strong> in the JSON response
            </li>
            <li>Add to <code>.env.local</code>:
              <pre style={styles.pre}>{`TELEGRAM_BOT_TOKEN=123456:ABC-...
TELEGRAM_CHAT_ID=987654321`}</pre>
            </li>
            <li>Restart the dev server: <code>npm run dev</code></li>
            <li>Register the webhook URL below with Telegram (see Webhook section)</li>
          </ol>
        </div>
      )}

      {/* Webhook URL */}
      {status?.webhookUrl && (
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Webhook URL</p>
          <div style={styles.webhookRow}>
            <code style={styles.webhookUrl}>{status.webhookUrl}</code>
            <button onClick={handleCopy} style={styles.copyBtn}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p style={styles.hint}>
            Register this URL with Telegram by visiting:<br />
            <code style={styles.hintCode}>
              {`https://api.telegram.org/bot<TOKEN>/setWebhook?url=${status.webhookUrl}`}
            </code>
          </p>
        </div>
      )}

      {/* Approval Flow Description */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>How Telegram Approval Works</p>
        <div style={styles.flowSteps}>
          {[
            { step: '1', text: 'Agent runs check → decision is ROTATE' },
            { step: '2', text: 'Telegram message sent with: from/to protocol, delta %, gas cost, projected annual gain' },
            { step: '3', text: 'You tap ✅ Approve or ❌ Reject inline' },
            { step: '4', text: 'If approved → rotation executes on-chain' },
            { step: '5', text: 'If rejected or timeout → NOOP logged to history' },
          ].map(({ step, text }) => (
            <div key={step} style={styles.flowRow}>
              <span style={styles.flowNum}>{step}</span>
              <span style={styles.flowText}>{text}</span>
            </div>
          ))}
        </div>
        <p style={styles.hint}>
          Enable this in <strong>Agent Rules</strong> → set <em>Execution Mode</em> to <strong>Telegram Approval</strong>.
        </p>
      </div>

      {/* Test Button */}
      {isConfigured && (
        <div style={styles.testSection}>
          <button onClick={handleTest} disabled={testing} style={styles.testBtn}>
            {testing ? 'Sending...' : 'Send Test Message'}
          </button>
          {testResult && (
            <span style={testResult.ok ? styles.testOk : styles.testFail}>
              {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { margin: 0, fontSize: 16, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  badgeOk: { background: '#0d2b1a', border: '1px solid #1a5c35', color: '#4ade80', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
  badgeWarn: { background: '#2b1a0d', border: '1px solid #5c3a1a', color: '#fb923c', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },

  checkList: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10 },
  checkOk: { color: '#4ade80', fontWeight: 700, fontSize: 14, width: 16 },
  checkFail: { color: '#f87171', fontWeight: 700, fontSize: 14, width: 16 },
  checkLabel: { fontSize: 13, color: '#ccc' },

  instructions: { background: '#0f0f1e', border: '1px solid #2a2a4a', borderRadius: 8, padding: '14px 16px', marginBottom: 16 },
  instrTitle: { margin: '0 0 10px', fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },
  ol: { margin: 0, paddingLeft: 20, color: '#bbb', fontSize: 13, lineHeight: 1.8 },
  pre: { background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 6, padding: '8px 12px', margin: '6px 0', fontSize: 12, color: '#a78bfa', overflowX: 'auto' },

  section: { borderTop: '1px solid #2a2a4a', paddingTop: 14, marginTop: 14, marginBottom: 4 },
  sectionLabel: { margin: '0 0 10px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 },

  webhookRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  webhookUrl: { flex: 1, background: '#0f0f1e', border: '1px solid #2a2a4a', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#a78bfa', overflowX: 'auto', display: 'block', whiteSpace: 'nowrap' },
  copyBtn: { padding: '6px 14px', background: '#2a2a4a', color: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' },
  hint: { fontSize: 12, color: '#666', marginTop: 6, lineHeight: 1.6 },
  hintCode: { color: '#7c6af7', fontSize: 11, wordBreak: 'break-all' },

  flowSteps: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 },
  flowRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  flowNum: { background: '#4f46e5', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, lineHeight: '22px', textAlign: 'center' },
  flowText: { fontSize: 13, color: '#bbb', paddingTop: 3 },

  testSection: { borderTop: '1px solid #2a2a4a', paddingTop: 14, marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  testBtn: { padding: '9px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  testOk: { color: '#4ade80', fontSize: 13 },
  testFail: { color: '#f87171', fontSize: 13 },
};
