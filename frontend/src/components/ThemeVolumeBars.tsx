import type { AnalyticsResponse } from '../types'

const THEME_BAR_COLOR: Record<string, string> = {
  'Robotics':      'var(--success)',
  'AI / Software': 'var(--purple-mid)',
  'BioHealth':     '#D4537E',
  'Semiconductor': 'var(--blue-mid)',
  'Green Energy':  'var(--warn)',
  'MedTech':       'var(--green-mid)',
  'Other':         'var(--gray-mid)',
}

interface Props { analytics: AnalyticsResponse | null }

export default function ThemeVolumeBars({ analytics }: Props) {
  if (!analytics) {
    return <div style={{ fontSize: 12, color: 'var(--text3)' }}>กำลังโหลด...</div>
  }

  const themes = Object.entries(analytics.themes)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)

  if (themes.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text3)' }}>ยังไม่มีข้อมูล</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {themes.map(([name, data]) => {
        const barColor = THEME_BAR_COLOR[name] ?? 'var(--gray-mid)'
        const retStr = data.avg_return !== null
          ? `${data.avg_return >= 0 ? '+' : ''}${data.avg_return}%`
          : '—'
        const retColor = data.avg_return === null
          ? 'var(--text3)'
          : data.avg_return >= 0 ? 'var(--success)' : 'var(--danger)'
        return (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, width: 140, flexShrink: 0, color: 'var(--text)' }}>{name}</span>
            <div style={{ flex: 1, height: 7, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${data.pct}%`, background: barColor, borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)', width: 18, textAlign: 'right', flexShrink: 0 }}>
              {data.count}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, width: 50, textAlign: 'right', flexShrink: 0, color: retColor }}>
              {retStr}
            </span>
          </div>
        )
      })}
    </div>
  )
}
