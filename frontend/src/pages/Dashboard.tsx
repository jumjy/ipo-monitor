import { useEffect, useState } from 'react'
import { getStatus, getUpcoming, getListing, triggerCheck, getAnalytics, getTimetable } from '../api/client'
import ThemeHeatmap from '../components/ThemeHeatmap'
import ThemeVolumeBars from '../components/ThemeVolumeBars'
import IPOPipeline from '../components/IPOPipeline'
import InvestmentSignals from '../components/InvestmentSignals'
import BubbleChart from '../components/BubbleChart'
import IPOTimetable from '../components/IPOTimetable'
import type { AnalyticsResponse, StatusResponse, TimetableEntry } from '../types'

interface Props {
  onStatusChange?: (lastCheck: string | null) => void
}

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '18px 20px',
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, letterSpacing: '.08em',
  textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 10,
}

const mc: React.CSSProperties = {
  background: 'var(--surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '14px 16px',
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

function dominantTheme(analytics: AnalyticsResponse | null): string {
  if (!analytics) return '—'
  const top = Object.entries(analytics.themes).sort((a, b) => b[1].count - a[1].count)[0]
  return top ? top[0] : '—'
}

function dominantCount(analytics: AnalyticsResponse | null, total: number): string {
  if (!analytics || total === 0) return ''
  const top = Object.entries(analytics.themes).sort((a, b) => b[1].count - a[1].count)[0]
  return top ? `${top[1].count} จาก ${total} IPO` : ''
}

export default function Dashboard({ onStatusChange }: Props) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [timetableLoading, setTimetableLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  const fetchAll = async () => {
    const [s, , , a, t] = await Promise.all([getStatus(), getUpcoming(), getListing(), getAnalytics(), getTimetable()])
    setStatus(s)
    setAnalytics(a)
    setTimetable(t)
    setTimetableLoading(false)
    onStatusChange?.(s.last_check)
    return s
  }

  useEffect(() => {
    fetchAll()
    const t = setInterval(fetchAll, 30_000)
    return () => clearInterval(t)
  }, [])

  const handleCheck = async () => {
    setChecking(true)
    try {
      await triggerCheck()
      const poll = setInterval(async () => {
        const s = await getStatus()
        setStatus(s)
        onStatusChange?.(s.last_check)
        if (!s.is_running) {
          clearInterval(poll)
          setChecking(false)
          fetchAll()
        }
      }, 2000)
    } catch {
      setChecking(false)
    }
  }

  const totalIPO = (status?.listing_count ?? 0) + (status?.upcoming_count ?? 0)
  const isRunning = status?.is_running || checking

  const avgSubRate = analytics?.avg_sub_rate
  const avgReturn = analytics?.avg_return
  const domTheme = dominantTheme(analytics)
  const domCount = dominantCount(analytics, totalIPO)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>

      <div style={{ marginBottom: 16 }}>
        <div style={sectionLabel}>Market overview</div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ ...mc, background: 'var(--blue-bg)', borderColor: 'var(--blue-mid)' }}>
          <div style={{ fontSize: 11, color: 'var(--blue-text)', marginBottom: 6, opacity: 0.8 }}>IPO ที่กำลังมา</div>
          <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color: 'var(--blue-text)' }}>{status ? totalIPO : '—'}</div>
          <div style={{ fontSize: 11, marginTop: 5, color: 'var(--blue-text)', opacity: 0.7 }}>
            {status ? `${status.listing_count} listing · ${status.upcoming_count} upcoming` : '—'}
          </div>
        </div>
        <div style={{ ...mc, background: 'var(--purple-bg)', borderColor: 'var(--purple-mid)' }}>
          <div style={{ fontSize: 11, color: 'var(--purple-text)', marginBottom: 6, opacity: 0.8 }}>Avg. sub rate</div>
          <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color: 'var(--purple-text)' }}>
            {avgSubRate !== null && avgSubRate !== undefined ? `${avgSubRate.toLocaleString()}x` : '—'}
          </div>
          <div style={{ fontSize: 11, marginTop: 5, color: 'var(--purple-text)', opacity: 0.7 }}>
            {avgSubRate ? 'จาก listing ปัจจุบัน' : 'ยังไม่มี sub rate'}
          </div>
        </div>
        <div style={{ ...mc, background: avgReturn !== null && avgReturn !== undefined && avgReturn < 0 ? 'var(--pink-bg)' : 'var(--teal-bg)', borderColor: avgReturn !== null && avgReturn !== undefined && avgReturn < 0 ? 'var(--pink-mid)' : 'var(--teal-mid)' }}>
          <div style={{ fontSize: 11, marginBottom: 6, opacity: 0.8, color: avgReturn !== null && avgReturn !== undefined && avgReturn < 0 ? 'var(--pink-text)' : 'var(--teal-text)' }}>Avg. return (listing)</div>
          <div style={{
            fontSize: 24, fontWeight: 500, lineHeight: 1,
            color: avgReturn === null || avgReturn === undefined ? 'var(--teal-text)' : avgReturn >= 0 ? 'var(--teal-text)' : 'var(--pink-text)'
          }}>
            {avgReturn !== null && avgReturn !== undefined ? `${avgReturn >= 0 ? '+' : ''}${avgReturn}%` : '—'}
          </div>
          <div style={{ fontSize: 11, marginTop: 5, opacity: 0.7, color: avgReturn !== null && avgReturn !== undefined && avgReturn < 0 ? 'var(--pink-text)' : 'var(--teal-text)' }}>
            {analytics ? `${analytics.ipos.filter(i => i.return !== null).length} IPO มี listing price` : '—'}
          </div>
        </div>
        <div style={{ ...mc, background: 'var(--amber-bg)', borderColor: 'var(--amber-mid)' }}>
          <div style={{ fontSize: 11, color: 'var(--amber-text)', marginBottom: 6, opacity: 0.8 }}>Dominant theme</div>
          <div style={{ fontSize: 17, fontWeight: 500, lineHeight: 1, paddingTop: 4, color: 'var(--amber-text)' }}>{domTheme}</div>
          <div style={{ fontSize: 11, marginTop: 5, color: 'var(--amber-text)', opacity: 0.7 }}>{domCount}</div>
        </div>
      </div>

      {/* IPO Timetable calendar — under Market Overview */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={sectionLabel}>IPO Timetable — subscription &amp; listing calendar</div>
        <IPOTimetable data={timetable} loading={timetableLoading} />
      </div>

      {/* Status strip */}
      <div style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isRunning ? 'var(--warn)' : 'var(--success)',
            boxShadow: isRunning ? '0 0 0 3px rgba(186,117,23,0.2)' : 'none',
          }} />
          <span style={{ fontSize: 12, color: isRunning ? 'var(--warn)' : 'var(--text2)' }}>
            {isRunning ? 'กำลัง check…' : 'Idle'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          อัพเดตล่าสุด: <span style={{ color: 'var(--text)', fontFamily: "'DM Mono', monospace" }}>{fmt(status?.last_check)}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          Check ถัดไป: <span style={{ color: 'var(--text)', fontFamily: "'DM Mono', monospace" }}>{fmt(status?.next_check)}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          ทุก <span style={{ color: 'var(--text)' }}>{status?.check_interval_hours ?? '—'} ชม.</span>
        </div>
        <button
          onClick={handleCheck}
          disabled={isRunning}
          style={{
            marginLeft: 'auto', fontSize: 12, fontWeight: 500,
            padding: '5px 14px', borderRadius: 20,
            border: '0.5px solid var(--border-strong)',
            background: isRunning ? 'var(--surface2)' : 'var(--text)',
            color: isRunning ? 'var(--text3)' : 'var(--surface)',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: isRunning ? 'spin 1s linear infinite' : 'none' }}>
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {isRunning ? 'Checking…' : 'Check Now'}
        </button>
      </div>

      {/* Row 2: Heatmap + Volume bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <div style={sectionLabel}>Theme heatmap — return (listing price vs offer price)</div>
          <ThemeHeatmap analytics={analytics} />
        </div>
        <div style={card}>
          <div style={sectionLabel}>IPO volume by theme</div>
          <ThemeVolumeBars analytics={analytics} />
        </div>
      </div>

      {/* Row 3: Pipeline + Signals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={card}>
          <div style={sectionLabel}>IPO pipeline — coming up</div>
          <IPOPipeline />
        </div>
        <div style={card}>
          <div style={sectionLabel}>Investment signals</div>
          <InvestmentSignals />
        </div>
      </div>

      {/* Bubble chart */}
      <div style={card}>
        <div style={sectionLabel}>Subscription rate vs return — IPO ที่มีข้อมูลครบ</div>
        <BubbleChart analytics={analytics} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
