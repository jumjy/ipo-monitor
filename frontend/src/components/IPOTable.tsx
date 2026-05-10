import type { ListingIPO, TimetableEntry, UpcomingIPO } from '../types'

interface UpcomingTableProps {
  data: UpcomingIPO[]
  loading?: boolean
}

interface ListingTableProps {
  data: ListingIPO[]
  timetable?: TimetableEntry[]
  loading?: boolean
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-8 text-gray-400 text-sm">
        No data available
      </td>
    </tr>
  )
}

function LoadingRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-8 text-gray-400 text-sm animate-pulse">
        Loading…
      </td>
    </tr>
  )
}

const thCls = 'text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 bg-gray-50'
const tdCls = 'px-4 py-3 text-sm text-gray-700 border-t border-gray-100'

export function UpcomingTable({ data, loading }: UpcomingTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
      <table className="w-full">
        <thead>
          <tr>
            <th className={thCls}>Company Name</th>
            <th className={thCls}>Industry</th>
            <th className={thCls}>Board</th>
            <th className={thCls}>First Posting</th>
            <th className={thCls}>Latest Posting</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRow cols={5} />
          ) : data.length === 0 ? (
            <EmptyRow cols={5} />
          ) : (
            data.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className={`${tdCls} font-medium text-gray-900 max-w-xs`}>{r.Name}</td>
                <td className={tdCls}>
                  <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {r.Industry}
                  </span>
                </td>
                <td className={tdCls}>{r.Board}</td>
                <td className={tdCls}>{r['First Posting Date']}</td>
                <td className={tdCls}>{r['Latest Posting Date']}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function ReminderBadge({ text }: { text: string }) {
  if (!text) return null
  const isListing = text.toLowerCase().includes('listing')
  return (
    <span
      className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 ${
        isListing
          ? 'bg-green-500 text-white'
          : 'bg-orange-500 text-white'
      }`}
    >
      {text}
    </span>
  )
}

export function ListingTable({ data, timetable = [], loading }: ListingTableProps) {
  // Build lookup: stockcode → remindereng
  const reminderMap = Object.fromEntries(
    timetable.map(t => [t.stockcode, t.remindereng])
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
      <table className="w-full">
        <thead>
          <tr>
            <th className={thCls}>Code</th>
            <th className={thCls}>Name</th>
            <th className={thCls}>Status</th>
            <th className={thCls}>Listing Date</th>
            <th className={thCls}>Price</th>
            <th className={thCls}>Board Lot</th>
            <th className={thCls}>Register Close</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <LoadingRow cols={7} />
          ) : data.length === 0 ? (
            <EmptyRow cols={7} />
          ) : (
            data.map((r, i) => {
              const isOpen = r.section === 'Listing IPO'
              const price = r['Offer Price'] || r['Listing Price'] || '—'
              const reminder = reminderMap[r.Code] || ''
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className={`${tdCls} font-mono font-semibold text-green-700`}>{r.Code}</td>
                  <td className={`${tdCls} font-medium text-gray-900`}>
                    <div className="flex flex-col gap-0.5">
                      <span>{r.Name}</span>
                      <ReminderBadge text={reminder} />
                    </div>
                  </td>
                  <td className={tdCls}>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isOpen
                          ? 'bg-green-50 text-green-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {isOpen ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td className={tdCls}>{r['Listing Date'] || '—'}</td>
                  <td className={`${tdCls} font-medium`}>
                    {price !== '—' ? `${r.Currency} ${price}` : '—'}
                  </td>
                  <td className={tdCls}>{r['Board Lot'] ? `${r['Board Lot']} shares` : '—'}</td>
                  <td className={tdCls}>{r['Register Close'] || '—'}</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
