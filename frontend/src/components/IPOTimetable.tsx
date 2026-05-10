import type { TimetableEntry } from '../types'

interface Props {
  data: TimetableEntry[]
  loading?: boolean
}

function parseDate(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('/').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function dd(d: Date) {
  return String(d.getDate()).padStart(2, '0')
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const COLOR_SUB    = '#d4b896'
const COLOR_RESULT = '#7cc47a'
const COLOR_LIST   = '#5b9bd5'

const COL_W  = 28
const ROW_H  = 28
const LABEL_W = 170

function inRange(d: Date, from: Date | null, to: Date | null) {
  if (!from || !to) return false
  const t = d.getTime()
  return t >= from.getTime() && t <= to.getTime()
}

function sameDay(a: Date, b: Date | null) {
  if (!b) return false
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6

export default function IPOTimetable({ data, loading }: Props) {
  if (loading) {
    return <div style={{ fontSize: 12, color: 'var(--text3)', padding: '20px 0', textAlign: 'center' }}>กำลังโหลด...</div>
  }

  if (!data.length) {
    return <div style={{ fontSize: 12, color: 'var(--text3)', padding: '20px 0', textAlign: 'center' }}>ไม่มีข้อมูล timetable</div>
  }

  const allDates = data.flatMap(e => [
    parseDate(e.applicationstart),
    parseDate(e.listdate),
  ]).filter(Boolean) as Date[]

  if (!allDates.length) return null

  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

  const start = new Date(minDate)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const end = new Date(maxDate)
  end.setDate(end.getDate() + 3)

  const dates: Date[] = []
  const cur = new Date(start)
  while (cur <= end) {
    dates.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  const monthGroups: { month: number; year: number; count: number }[] = []
  for (const d of dates) {
    const last = monthGroups[monthGroups.length - 1]
    if (last && last.month === d.getMonth() && last.year === d.getFullYear()) {
      last.count++
    } else {
      monthGroups.push({ month: d.getMonth(), year: d.getFullYear(), count: 1 })
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: LABEL_W + dates.length * COL_W }}>

        {/* Month header */}
        <div style={{ display: 'flex', marginLeft: LABEL_W }}>
          {monthGroups.map((g, i) => (
            <div key={i} style={{
              width: g.count * COL_W, height: ROW_H,
              lineHeight: `${ROW_H}px`, textAlign: 'center',
              fontSize: 11, fontWeight: 600, color: 'white',
              background: 'var(--teal-mid)',
              borderRight: '1px solid var(--teal-bg)',
              flexShrink: 0,
            }}>
              {MONTH_NAMES[g.month]} {g.year}
            </div>
          ))}
        </div>

        {/* Day of week */}
        <div style={{ display: 'flex', marginLeft: LABEL_W }}>
          {dates.map((d, i) => (
            <div key={i} style={{
              width: COL_W, height: ROW_H, lineHeight: `${ROW_H}px`,
              textAlign: 'center', fontSize: 10, fontWeight: 600,
              background: isWeekend(d) ? '#c8a84b' : '#e8c35a',
              color: '#3d2a00',
              borderRight: '1px solid #d4aa40',
              flexShrink: 0,
            }}>
              {DAY_LETTERS[d.getDay()]}
            </div>
          ))}
        </div>

        {/* Date numbers */}
        <div style={{ display: 'flex', marginLeft: LABEL_W }}>
          {dates.map((d, i) => (
            <div key={i} style={{
              width: COL_W, height: ROW_H, lineHeight: `${ROW_H}px`,
              textAlign: 'center', fontSize: 10, fontWeight: 500,
              background: isWeekend(d) ? 'var(--surface2)' : 'var(--surface)',
              color: isWeekend(d) ? 'var(--text3)' : 'var(--text2)',
              borderRight: '0.5px solid var(--border)',
              borderBottom: '0.5px solid var(--border)',
              flexShrink: 0,
            }}>
              {dd(d)}
            </div>
          ))}
        </div>

        {/* Section label */}
        <div style={{
          height: ROW_H, display: 'flex', alignItems: 'center', paddingLeft: 12,
          background: 'var(--surface2)', borderBottom: '0.5px solid var(--border)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--warn)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Listing IPO
          </span>
        </div>

        {/* IPO rows */}
        {data.map((entry, ri) => {
          const appStart = parseDate(entry.applicationstart)
          const appEnd   = parseDate(entry.applicationend)
          const resultD  = parseDate(entry.resultdate)
          const listD    = parseDate(entry.listdate)

          return (
            <div key={ri} style={{ display: 'flex', alignItems: 'center', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{
                width: LABEL_W, height: ROW_H, lineHeight: `${ROW_H}px`,
                flexShrink: 0, paddingLeft: 12, paddingRight: 8,
                fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }} title={entry.name}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text3)', marginRight: 5 }}>
                  {entry.stockcode}
                </span>
                <span style={{ color: 'var(--text)' }}>{entry.name}</span>
              </div>

              {dates.map((d, ci) => {
                const isSub    = inRange(d, appStart, appEnd)
                const isResult = sameDay(d, resultD)
                const isListing = sameDay(d, listD)
                let blockColor = ''
                if (isSub) blockColor = COLOR_SUB
                if (isResult) blockColor = COLOR_RESULT
                if (isListing) blockColor = COLOR_LIST

                return (
                  <div key={ci} style={{
                    width: COL_W, height: ROW_H, flexShrink: 0,
                    background: isWeekend(d) ? 'var(--surface2)' : 'transparent',
                    borderRight: '0.5px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {blockColor && (
                      <div style={{
                        width: COL_W - 4, height: ROW_H - 6,
                        background: blockColor, borderRadius: 3,
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* Legend */}
        <div style={{
          display: 'flex', gap: 20, padding: '10px 12px',
          borderTop: '0.5px solid var(--border)',
          background: 'var(--surface2)', flexWrap: 'wrap',
        }}>
          {[
            { color: COLOR_SUB,    label: 'Subscription Period' },
            { color: COLOR_RESULT, label: 'Result Announcement' },
            { color: COLOR_LIST,   label: 'Listing Date' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}>
              <div style={{ width: 14, height: 12, background: color, borderRadius: 2, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>

        {/* Remark */}
        <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--text3)', borderTop: '0.5px solid var(--border)' }}>
          Registration cut-off at noon 12:00 on register close day · ข้อมูลสำหรับอ้างอิงเท่านั้น
        </div>

      </div>
    </div>
  )
}
