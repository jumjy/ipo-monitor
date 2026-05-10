import { useEffect, useState } from 'react'
import { Inbox } from 'lucide-react'
import { getHistory } from '../api/client'
import AlertCard from '../components/AlertCard'
import type { HistoryEntry } from '../types'

export default function History() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory(50)
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-800 mb-5">Alert History</h1>

      {loading ? (
        <div className="text-center py-16 text-gray-400 animate-pulse">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Inbox size={40} strokeWidth={1.5} />
          <p className="text-sm">No alerts yet — changes will appear here after the first detection.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e, i) => (
            <AlertCard key={i} entry={e} />
          ))}
        </div>
      )}
    </div>
  )
}
