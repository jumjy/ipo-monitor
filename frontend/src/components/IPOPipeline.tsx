import { useEffect, useState } from 'react'
import { getListing, getUpcoming } from '../api/client'
import type { ListingIPO, UpcomingIPO } from '../types'

type Tab = 'all' | 'listing' | 'upcoming'

interface PipelineItem {
  code: string
  name: string
  theme: string
  pillClass: string
  dotColor: string
  status: 'listing' | 'upcoming'
  date: string
}

const THEME_MAP: { keywords: string[]; theme: string; pill: string }[] = [
  { keywords: ['robot', 'autonomous', 'autom', 'drone', 'lidar'], theme: 'Robotics', pill: 'robot' },
  { keywords: ['ai ', 'artificial', 'software', 'cloud', 'data', 'internet', 'information tech', 'machine learn', 'deep learn', 'algorithm', 'media'], theme: 'AI / Software', pill: 'ai' },
  { keywords: ['semiconductor', 'chip', 'photon', 'wafer', 'circuit', 'microelectron', 'ic design', 'pixel'], theme: 'Semiconductor', pill: 'semi' },
  { keywords: ['bio', 'pharma', 'therapeut', 'oncol', 'health', 'clinical', 'genomic', 'biotech', 'drug', 'medicine'], theme: 'BioHealth', pill: 'bio' },
  { keywords: ['energy', 'solar', 'renewable', 'electric', 'battery', 'power', 'wind', 'green'], theme: 'Green Energy', pill: 'energy' },
  { keywords: ['medical', 'device', 'diagnostic', 'equipment', 'surgical', 'imaging'], theme: 'MedTech', pill: 'medtech' },
]

function classifyTheme(industry: string): { theme: string; pill: string } {
  const lower = industry.toLowerCase()
  for (const { keywords, theme, pill } of THEME_MAP) {
    if (keywords.some(k => lower.includes(k))) return { theme, pill }
  }
  return { theme: 'Other', pill: 'other' }
}

const PILL_STYLE: Record<string, { bg: string; color: string }> = {
  robot:   { bg: 'var(--teal-bg)',   color: 'var(--teal-text)' },
  ai:      { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
  semi:    { bg: 'var(--blue-bg)',   color: 'var(--blue-text)' },
  bio:     { bg: 'var(--pink-bg)',   color: 'var(--pink-text)' },
  energy:  { bg: 'var(--amber-bg)',  color: 'var(--amber-text)' },
  medtech: { bg: 'var(--green-bg)',  color: 'var(--green-text)' },
  other:   { bg: 'var(--gray-bg)',   color: 'var(--gray-text)' },
}

function fmtListDate(iso: string | undefined): string {
  if (!iso) return 'รอกำหนด'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function toListingItem(r: ListingIPO): PipelineItem {
  const { theme, pill } = classifyTheme(r.Name + ' ')
  return {
    code: r.Code || '—',
    name: r.Name,
    theme,
    pillClass: pill,
    dotColor: 'var(--success)',
    status: 'listing',
    date: fmtListDate(r['Listing Date']),
  }
}

function toUpcomingItem(r: UpcomingIPO): PipelineItem {
  const { theme, pill } = classifyTheme(r.Industry || r.Name)
  return {
    code: '—',
    name: r.Name,
    theme,
    pillClass: pill,
    dotColor: 'var(--warn)',
    status: 'upcoming',
    date: 'รอกำหนด',
  }
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'listing', label: 'Listing soon' },
  { key: 'upcoming', label: 'Upcoming' },
]

export default function IPOPipeline() {
  const [items, setItems] = useState<PipelineItem[]>([])
  const [tab, setTab] = useState<Tab>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getListing(), getUpcoming()])
      .then(([listing, upcoming]) => {
        const combined: PipelineItem[] = [
          ...listing.map(toListingItem),
          ...upcoming.map(toUpcomingItem),
        ]
        setItems(combined)
      })
      .finally(() => setLoading(false))
  }, [])

  const visible = tab === 'all' ? items : items.filter(i => i.status === tab)

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              padding: '4px 12px',
              borderRadius: 20,
              border: '0.5px solid var(--border-strong)',
              background: tab === t.key ? 'var(--text)' : 'transparent',
              color: tab === t.key ? 'var(--surface)' : 'var(--text2)',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>กำลังโหลด...</div>
      ) : visible.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>ไม่มีข้อมูล</div>
      ) : (
        <div>
          {visible.map((item, i) => {
            const ps = PILL_STYLE[item.pillClass] ?? PILL_STYLE.other
            return (
              <div
                key={`${item.code}-${item.name}-${i}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 0',
                  borderBottom: i < visible.length - 1 ? '0.5px solid var(--border)' : 'none',
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.dotColor, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: 'var(--text3)', width: 42, flexShrink: 0 }}>
                  {item.code}
                </span>
                <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={item.name}>
                  {item.name}
                </span>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 10, flexShrink: 0,
                  background: ps.bg, color: ps.color,
                }}>
                  {item.theme}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, width: 80, textAlign: 'right' }}>
                  {item.date}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
