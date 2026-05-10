import { RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import type { StatusResponse } from '../types'

interface Props {
  status: StatusResponse | null
  onCheck: () => void
  checking: boolean
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

export default function StatusBar({ status, onCheck, checking }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            'inline-block w-2.5 h-2.5 rounded-full',
            status?.is_running ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'
          )}
        />
        <span className="text-sm text-gray-600">
          {status?.is_running ? 'Checking…' : 'Idle'}
        </span>
      </div>

      <div className="text-sm text-gray-500">
        Last check: <span className="text-gray-800 font-medium">{fmt(status?.last_check ?? null)}</span>
      </div>
      <div className="text-sm text-gray-500">
        Next check: <span className="text-gray-800 font-medium">{fmt(status?.next_check ?? null)}</span>
      </div>

      <div className="ml-auto">
        <button
          onClick={onCheck}
          disabled={checking || status?.is_running}
          className={clsx(
            'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
            checking || status?.is_running
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          )}
        >
          <RefreshCw size={14} className={clsx(checking && 'animate-spin')} />
          Check Now
        </button>
      </div>
    </div>
  )
}
