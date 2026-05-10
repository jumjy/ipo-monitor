import { Bubble } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import type { AnalyticsResponse, IpoAnalytics } from '../types'

ChartJS.register(LinearScale, PointElement, Tooltip)

const THEME_COLOR: Record<string, string> = {
  'Robotics':      '#1D9E75',
  'AI / Software': '#534AB7',
  'BioHealth':     '#D4537E',
  'Semiconductor': '#378ADD',
  'Green Energy':  '#BA7517',
  'MedTech':       '#3B6D11',
  'Other':         '#888780',
}

const LEGEND = [
  { label: 'Robotics',       color: '#1D9E75' },
  { label: 'AI / Software',  color: '#534AB7' },
  { label: 'BioHealth',      color: '#D4537E' },
  { label: 'Semiconductor',  color: '#378ADD' },
  { label: 'Green Energy',   color: '#BA7517' },
  { label: 'Other',          color: '#888780' },
]

function bubbleR(sub: number) {
  if (sub > 5000) return 10
  if (sub > 2000) return 8
  if (sub > 500)  return 7
  return 6
}

interface Props { analytics: AnalyticsResponse | null }

export default function BubbleChart({ analytics }: Props) {
  const points: IpoAnalytics[] = analytics?.ipos.filter(
    i => i.sub_rate !== null && i.return !== null
  ) ?? []

  if (points.length === 0) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>
          {analytics ? 'ยังไม่มีข้อมูล Subscription Rate + Return ที่สมบูรณ์' : 'กำลังโหลด...'}
        </p>
      </div>
    )
  }

  const data = {
    datasets: [{
      data: points.map(p => ({ x: p.sub_rate!, y: p.return!, r: bubbleR(p.sub_rate!) })),
      backgroundColor: points.map(p => (THEME_COLOR[p.theme] ?? '#888780') + 'aa'),
      borderColor: points.map(p => THEME_COLOR[p.theme] ?? '#888780'),
      borderWidth: 1,
    }],
  }

  const maxY = Math.max(50, ...points.map(p => p.return!))
  const minY = Math.min(-30, ...points.map(p => p.return!))

  const options: ChartOptions<'bubble'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const p = points[ctx.dataIndex]
            return `${p.name}: sub ${p.sub_rate!.toLocaleString()}x · return ${p.return! >= 0 ? '+' : ''}${p.return}%`
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Subscription rate (x)', font: { size: 11 }, color: '#a09e96' },
        ticks: { callback: v => Number(v).toLocaleString() + 'x', font: { size: 10 }, color: '#a09e96' },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      y: {
        title: { display: true, text: 'Return (%)', font: { size: 11 }, color: '#a09e96' },
        ticks: { callback: v => (Number(v) >= 0 ? '+' : '') + v + '%', font: { size: 10 }, color: '#a09e96' },
        grid: { color: 'rgba(0,0,0,0.06)' },
        min: Math.floor(minY / 10) * 10,
        max: Math.ceil(maxY / 10) * 10 + 20,
      },
    },
  }

  const presentThemes = [...new Set(points.map(p => p.theme))]
  const legend = LEGEND.filter(l => presentThemes.includes(l.label))
  if (presentThemes.includes('Other')) {
    if (!legend.find(l => l.label === 'Other')) legend.push({ label: 'Other', color: '#888780' })
  }

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', height: 220 }}>
        <Bubble data={data} options={options} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        {legend.map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: l.color, flexShrink: 0, display: 'inline-block' }} />
            {l.label}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
        ข้อมูลจาก {points.length} IPO ที่มีทั้ง Subscription Rate และ Listing Price — ขนาดฟองสะท้อน subscription tier
      </p>
    </div>
  )
}
