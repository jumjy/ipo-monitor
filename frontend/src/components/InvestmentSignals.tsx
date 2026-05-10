import { useEffect, useState } from 'react'
import { getListing, getUpcoming } from '../api/client'
import type { ListingIPO, UpcomingIPO } from '../types'

interface Signal {
  iconBg: string
  iconStroke: string
  iconPath: string
  title: string
  desc: string
  tag: string
  tagBg: string
  tagColor: string
}

// ---- theme classifier (same logic as IPOPipeline) ----
function classifyTheme(text: string): string {
  const s = text.toLowerCase()
  if (s.includes('robot') || s.includes('autonomous') || s.includes('autom') || s.includes('lidar') || s.includes('drone')) return 'Robotics'
  if (s.includes('semiconductor') || s.includes('chip') || s.includes('photon') || s.includes('wafer') || s.includes('pixel') || s.includes('circuit') || s.includes('ic design')) return 'Semiconductor'
  if (s.includes('bio') || s.includes('pharma') || s.includes('therapeut') || s.includes('oncol') || s.includes('clinical') || s.includes('genomic') || s.includes('drug')) return 'BioHealth'
  if (s.includes('energy') || s.includes('solar') || s.includes('renewable') || s.includes('battery') || s.includes('wind') || s.includes('green')) return 'Green Energy'
  if (s.includes('medical') || s.includes('device') || s.includes('diagnostic') || s.includes('surgical')) return 'MedTech'
  if (s.includes('ai ') || s.includes('artificial') || s.includes('software') || s.includes('cloud') || s.includes('data') || s.includes('internet') || s.includes('algorithm') || s.includes('media') || s.includes('tech')) return 'AI / Software'
  return 'Other'
}

function isBioBoard(name: string, board: string) {
  return /-[BP]\b/i.test(name) || board?.toLowerCase().includes('-b') || board?.toLowerCase().includes('pre')
}

function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

// ---- SVG icon paths ----
const ICONS = {
  trending: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  clock:    '<path d="M12 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"/><path d="M12 6v6l4 2"/>',
  warn:     '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  chip:     '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="14" x2="22" y2="14"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="14" x2="4" y2="14"/>',
  info:     '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
}

// ---- signal generators ----
function genSignals(listing: ListingIPO[], upcoming: UpcomingIPO[]): Signal[] {
  const signals: Signal[] = []

  // Theme frequency across all IPOs
  const themeCounts: Record<string, string[]> = {}
  for (const r of listing) {
    const t = classifyTheme(r.Name)
    if (!themeCounts[t]) themeCounts[t] = []
    themeCounts[t].push(r.Name)
  }
  for (const u of upcoming) {
    const t = classifyTheme(u.Industry || u.Name)
    if (!themeCounts[t]) themeCounts[t] = []
    themeCounts[t].push(u.Name)
  }
  const sorted = Object.entries(themeCounts).sort((a, b) => b[1].length - a[1].length)
  const [topTheme, topNames] = sorted[0] ?? ['', []]

  // Signal 1 — dominant theme BUY signal
  if (topTheme && topNames.length >= 1) {
    const themeColor: Record<string, { bg: string; text: string; stroke: string }> = {
      'Robotics':      { bg: 'var(--teal-bg)',   text: 'var(--teal-text)',   stroke: 'var(--teal-mid)' },
      'AI / Software': { bg: 'var(--purple-bg)', text: 'var(--purple-text)', stroke: 'var(--purple-mid)' },
      'BioHealth':     { bg: 'var(--pink-bg)',   text: 'var(--pink-text)',   stroke: 'var(--pink-mid)' },
      'Semiconductor': { bg: 'var(--blue-bg)',   text: 'var(--blue-text)',   stroke: 'var(--blue-mid)' },
      'Green Energy':  { bg: 'var(--amber-bg)',  text: 'var(--amber-text)',  stroke: 'var(--amber-mid)' },
    }
    const c = themeColor[topTheme] ?? { bg: 'var(--teal-bg)', text: 'var(--teal-text)', stroke: 'var(--teal-mid)' }
    const nameList = topNames.slice(0, 3).join(', ')
    signals.push({
      iconBg: c.bg, iconStroke: c.stroke, iconPath: ICONS.trending,
      title: `${topTheme} — ${topNames.length} IPO ใน pipeline`,
      desc: `${nameList}${topNames.length > 3 ? ` และอีก ${topNames.length - 3} ตัว` : ''} — theme นี้มี IPO มากสุดในตลาดตอนนี้`,
      tag: 'BUY signal', tagBg: c.bg, tagColor: c.text,
    })
  }

  // Signal 2 — listing soon (within 14 days)
  const soonListing = listing
    .filter(r => { const d = daysUntil(r['Listing Date']); return d !== null && d >= 0 && d <= 14 })
    .sort((a, b) => (daysUntil(a['Listing Date']) ?? 99) - (daysUntil(b['Listing Date']) ?? 99))
  if (soonListing.length > 0) {
    const names = soonListing.slice(0, 3).map(r => r.Name).join(', ')
    const days = daysUntil(soonListing[0]['Listing Date'])
    signals.push({
      iconBg: 'var(--purple-bg)', iconStroke: 'var(--purple-mid)', iconPath: ICONS.clock,
      title: `Listing ใกล้มาถึง — ${soonListing.length} ตัว`,
      desc: `${names} — listing ใน ${days === 0 ? 'วันนี้' : `${days} วัน`} ควรติดตามราคา grey market`,
      tag: 'Watch list', tagBg: 'var(--purple-bg)', tagColor: 'var(--purple-text)',
    })
  }

  // Signal 3 — Bio-B / pre-profit board (high risk)
  const bioB = [
    ...listing.map(r => ({ Name: r.Name, Board: '' })),
    ...upcoming.map(u => ({ Name: u.Name, Board: u.Board ?? '' })),
  ].filter(r => isBioBoard(r.Name, r.Board))
  if (bioB.length > 0) {
    const names = bioB.slice(0, 3).map(r => r.Name).join(', ')
    signals.push({
      iconBg: 'var(--amber-bg)', iconStroke: 'var(--amber-mid)', iconPath: ICONS.warn,
      title: `Bio-B / Pre-profit board — ${bioB.length} ตัว`,
      desc: `${names}${bioB.length > 3 ? ` และอีก ${bioB.length - 3}` : ''} — board "-B"/"-P" ยังไม่ทำกำไร ผันผวนสูง`,
      tag: 'High risk', tagBg: 'var(--amber-bg)', tagColor: 'var(--amber-text)',
    })
  }

  // Signal 4 — Semiconductor / strategic
  const semi = [...listing.map(r => ({ name: r.Name, src: classifyTheme(r.Name) })),
                 ...upcoming.map(u => ({ name: u.Name, src: classifyTheme(u.Industry || u.Name) }))]
    .filter(x => x.src === 'Semiconductor')
  if (semi.length > 0) {
    const names = semi.slice(0, 3).map(x => x.name).join(', ')
    signals.push({
      iconBg: 'var(--blue-bg)', iconStroke: 'var(--blue-mid)', iconPath: ICONS.chip,
      title: `Semiconductor — ${semi.length} ตัวใน pipeline`,
      desc: `${names} — geopolitics เพิ่ม premium กลุ่ม chip / autonomous driving อย่างต่อเนื่อง`,
      tag: 'Strategic', tagBg: 'var(--blue-bg)', tagColor: 'var(--blue-text)',
    })
  }

  // Fallback — no data yet
  if (signals.length === 0) {
    signals.push({
      iconBg: 'var(--gray-bg)', iconStroke: 'var(--gray-mid)', iconPath: ICONS.info,
      title: 'ยังไม่มีข้อมูล IPO',
      desc: 'กด Check Now เพื่อดึงข้อมูลล่าสุดจาก etnet.com.hk',
      tag: 'No data', tagBg: 'var(--gray-bg)', tagColor: 'var(--gray-text)',
    })
  }

  return signals.slice(0, 4)
}

export default function InvestmentSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getListing(), getUpcoming()])
      .then(([listing, upcoming]) => setSignals(genSignals(listing, upcoming)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>กำลังวิเคราะห์...</div>
  }

  return (
    <div>
      {signals.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '10px 0',
            borderBottom: i < signals.length - 1 ? '0.5px solid var(--border)' : 'none',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={s.iconStroke} strokeWidth="2" strokeLinecap="round"
              dangerouslySetInnerHTML={{ __html: s.iconPath }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>{s.desc}</div>
            <span style={{
              display: 'inline-block', fontSize: 10, padding: '1px 7px', borderRadius: 8,
              marginTop: 5, fontWeight: 500,
              background: s.tagBg, color: s.tagColor,
            }}>
              {s.tag}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
