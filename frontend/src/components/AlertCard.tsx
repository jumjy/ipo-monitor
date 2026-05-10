import { ArrowRight, Bell, TrendingUp } from 'lucide-react'
import type { HistoryEntry } from '../types'

interface Props {
  entry: HistoryEntry
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  )
}

export default function AlertCard({ entry }: Props) {
  const total =
    entry.new_upcoming.length +
    entry.new_listing.length +
    entry.status_changes.length +
    entry.promotions.length

  const dt = new Date(entry.timestamp)
  const dateStr = dt.toLocaleDateString('th-TH', { dateStyle: 'medium' })
  const timeStr = dt.toLocaleTimeString('th-TH', { timeStyle: 'short' })

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-green-600" />
          <span className="font-semibold text-gray-800 text-sm">{dateStr} · {timeStr}</span>
        </div>
        <span className="text-xs text-gray-400">{total} change{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {entry.new_upcoming.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-3 py-1.5">
            <Badge label="New Upcoming" color="bg-blue-100 text-blue-700" />
            <span className="text-sm text-gray-700">{r.Name}</span>
          </div>
        ))}

        {entry.new_listing.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-green-50 rounded-lg px-3 py-1.5">
            <Badge label="New Listing" color="bg-green-100 text-green-700" />
            <span className="text-sm font-mono font-semibold text-green-700">[{r.Code}]</span>
            <span className="text-sm text-gray-700">{r.Name}</span>
          </div>
        ))}

        {entry.status_changes.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-orange-50 rounded-lg px-3 py-1.5">
            <Badge label="Status Change" color="bg-orange-100 text-orange-700" />
            <span className="text-sm text-gray-700">{c.record.Name}</span>
            <ArrowRight size={12} className="text-gray-400" />
            <span className="text-xs text-orange-600">{c.to}</span>
          </div>
        ))}

        {entry.promotions.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-purple-50 rounded-lg px-3 py-1.5">
            <Badge label="Promoted" color="bg-purple-100 text-purple-700" />
            <TrendingUp size={12} className="text-purple-500" />
            <span className="text-sm text-gray-700">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
