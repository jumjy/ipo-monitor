import type { AnalyticsResponse } from '../types'

const THEME_COLORS: Record<string, { bg: string; text: string; mid: string }> = {
  'Robotics':      { bg: 'var(--teal-bg)',   text: 'var(--teal-text)',   mid: 'var(--teal-mid)' },
  'AI / Software': { bg: 'var(--purple-bg)', text: 'var(--purple-text)', mid: 'var(--purple-mid)' },
  'BioHealth':     { bg: 'var(--pink-bg)',   text: 'var(--pink-text)',   mid: 'var(--pink-mid)' },
  'Semiconductor': { bg: 'var(--blue-bg)',   text: 'var(--blue-text)',   mid: 'var(--blue-mid)' },
  'Green Energy':  { bg: 'var(--amber-bg)',  text: 'var(--amber-text)',  mid: 'var(--amber-mid)' },
  'MedTech':       { bg: 'var(--green-bg)',  text: 'var(--green-text)',  mid: 'var(--green-mid)' },
  'Other':         { bg: 'var(--gray-bg)',   text: 'var(--gray-text)',   mid: 'var(--gray-mid)' },
}

function themeColor(name: string) {
  return THEME_COLORS[name] ?? THEME_COLORS['Other']
}

interface Props { analytics: AnalyticsResponse | null }

export default function ThemeHeatmap({ analytics }: Props) {
  if (!analytics) {
    return <div style={{ fontSize: 12, color: 'var(--text3)' }}>กำลังโหลด...</div>
  }

  const themes = Object.entries(analytics.themes)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)

  if (themes.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text3)' }}>ยังไม่มีข้อมูล</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {themes.map(([name, data]) => {
        const c = themeColor(name)
        const retStr = data.avg_return !== null
          ? `${data.avg_return >= 0 ? '+' : ''}${data.avg_return}%`
          : '—'
        const retColor = data.avg_return === null
          ? c.text
          : data.avg_return >= 0 ? c.text : 'var(--danger)'
        return (
          <div key={name} style={{ background: c.bg, borderRadius: 'var(--radius)', padding: '10px 12px', cursor: 'pointer' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: c.text, marginBottom: 3 }}>{name}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: retColor }}>{retStr}</div>
            <div style={{ fontSize: 10, marginTop: 2, color: c.mid, opacity: 0.9 }}>
              {data.count} IPO{data.top_name ? ` · ${data.top_name.split(' ').slice(0, 2).join(' ')}` : ''}
            </div>
          </div>
        )
      })}
    </div>
  )
}
