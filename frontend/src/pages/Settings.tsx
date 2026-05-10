import { useEffect, useState } from 'react'
import { getConfig, sendTestNotify, updateConfig } from '../api/client'
import type { ConfigResponse } from '../types'

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 20px',
  marginBottom: 14,
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, letterSpacing: '.08em',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14,
}

const fieldLabel: React.CSSProperties = {
  fontSize: 12, color: 'var(--text2)', marginBottom: 5, display: 'block',
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '0.5px solid var(--border-strong)',
  borderRadius: 8, padding: '7px 10px', fontSize: 13,
  background: 'var(--surface)', color: 'var(--text)',
  outline: 'none', boxSizing: 'border-box',
  fontFamily: "'DM Sans', sans-serif",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

export default function Settings() {
  const [cfg, setCfg] = useState<ConfigResponse | null>(null)
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [interval, setIntervalVal] = useState(6)
  const [emailFallback, setEmailFallback] = useState(false)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    getConfig().then(c => {
      setCfg(c)
      setIntervalVal(c.check_interval_hours)
      setEmailFallback(c.email_fallback)
      setSmtpHost(c.smtp_host)
      setSmtpPort(c.smtp_port)
      setSmtpUser(c.smtp_user)
      setEmailTo(c.email_to)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const payload: Record<string, unknown> = {
        check_interval_hours: interval,
        email_fallback: emailFallback,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        email_to: emailTo,
      }
      if (token) payload.line_notify_token = token
      if (smtpPass) payload.smtp_pass = smtpPass
      await updateConfig(payload)
      setSaveMsg({ ok: true, text: 'Saved successfully.' })
      setToken('')
      const updated = await getConfig()
      setCfg(updated)
    } catch {
      setSaveMsg({ ok: false, text: 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotify = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await sendTestNotify()
      setTestResult({ ok: r.success, text: r.success ? 'Notification sent!' : 'Failed — check token.' })
    } catch {
      setTestResult({ ok: false, text: 'Request failed.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 24px 60px' }}>
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 16 }}>
        Settings
      </div>

      {/* Line Notify */}
      <div style={card}>
        <div style={sectionLabel}>Line Notify</div>
        <Field label="Token">
          <div style={{ position: 'relative' }}>
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder={cfg?.line_notify_token_set ? cfg.line_notify_token_masked : 'Paste token here…'}
              style={{ ...inputStyle, paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, padding: 0 }}
            >
              {showToken ? '🙈' : '👁'}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Current: {cfg?.line_notify_token_set
              ? <span style={{ color: 'var(--success)' }}>✓ Set</span>
              : <span style={{ color: 'var(--danger)' }}>✗ Not set</span>}
          </p>
        </Field>

        <button
          onClick={handleTestNotify}
          disabled={testing || !cfg?.line_notify_token_set}
          style={{
            fontSize: 12, padding: '6px 14px', borderRadius: 20,
            border: '0.5px solid var(--border-strong)',
            background: cfg?.line_notify_token_set ? 'var(--teal-bg)' : 'var(--surface2)',
            color: cfg?.line_notify_token_set ? 'var(--teal-text)' : 'var(--text3)',
            cursor: cfg?.line_notify_token_set ? 'pointer' : 'not-allowed',
            fontFamily: "'DM Sans', sans-serif",
            opacity: testing ? 0.6 : 1,
          }}
        >
          {testing ? 'Sending…' : '↗ Send Test Notification'}
        </button>

        {testResult && (
          <p style={{ fontSize: 12, marginTop: 8, color: testResult.ok ? 'var(--success)' : 'var(--danger)' }}>
            {testResult.ok ? '✓' : '✗'} {testResult.text}
          </p>
        )}
      </div>

      {/* Scheduler */}
      <div style={card}>
        <div style={sectionLabel}>Scheduler</div>
        <Field label="Check interval (hours)">
          <input
            type="number"
            min={1} max={24} step={0.5}
            value={interval}
            onChange={e => setIntervalVal(Number(e.target.value))}
            style={{ ...inputStyle, width: 120 }}
          />
        </Field>
        <p style={{ fontSize: 11, color: 'var(--text3)' }}>
          ระบบจะ scrape etnet.com.hk และแจ้งเตือนทุก {interval} ชั่วโมง
        </p>
      </div>

      {/* Email Fallback */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: emailFallback ? 14 : 0 }}>
          <div style={sectionLabel}>Email Fallback</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={emailFallback}
              onChange={e => setEmailFallback(e.target.checked)}
              style={{ accentColor: 'var(--success)', width: 14, height: 14 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Enable</span>
          </label>
        </div>

        {emailFallback && (
          <div>
            <Field label="SMTP Host">
              <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="SMTP Port">
              <input type="number" value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} style={{ ...inputStyle, width: 120 }} />
            </Field>
            <Field label="SMTP User">
              <input type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="SMTP Password">
              <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="Leave blank to keep existing" style={inputStyle} />
            </Field>
            <Field label="Send To (email)">
              <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} style={inputStyle} />
            </Field>
          </div>
        )}
      </div>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            fontSize: 13, fontWeight: 500, padding: '8px 20px',
            borderRadius: 20, border: 'none',
            background: 'var(--text)', color: 'var(--surface)',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saveMsg && (
          <span style={{ fontSize: 12, color: saveMsg.ok ? 'var(--success)' : 'var(--danger)' }}>
            {saveMsg.ok ? '✓' : '✗'} {saveMsg.text}
          </span>
        )}
      </div>
    </div>
  )
}
