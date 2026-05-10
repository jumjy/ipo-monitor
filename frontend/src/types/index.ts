export interface UpcomingIPO {
  Name: string
  Industry: string
  Board: string
  'First Posting Date': string
  'Latest Posting Date': string
}

export interface ListingIPO {
  Code: string
  Name: string
  section: string
  'Listing Date': string
  Currency: string
  'Offer Price'?: string
  'Listing Price'?: string
  'Board Lot': string
  'Admission Fee': string
  'Max Lot Size'?: string
  'Register Close'?: string
  'Subscription Rate'?: string
  'One Lot Success Rate'?: string
}

export interface StatusResponse {
  last_check: string | null
  next_check: string | null
  is_running: boolean
  upcoming_count: number
  listing_count: number
  check_interval_hours: number
}

export interface HistoryEntry {
  timestamp: string
  new_upcoming: UpcomingIPO[]
  removed_upcoming: UpcomingIPO[]
  new_listing: ListingIPO[]
  status_changes: { record: ListingIPO; from: string; to: string }[]
  promotions: { name: string; listing_record: ListingIPO }[]
}

export interface TimetableEntry {
  stockcode: string
  name: string
  applicationstart: string
  applicationend: string
  resultdate: string
  listdate: string
  remindereng: string
}

export interface ThemeAnalytics {
  count: number
  pct: number
  names: string[]
  top_name: string
  avg_return: number | null
  avg_sub_rate: number | null
}

export interface IpoAnalytics {
  name: string
  code: string
  theme: string
  sub_rate: number | null
  return: number | null
}

export interface AnalyticsResponse {
  themes: Record<string, ThemeAnalytics>
  ipos: IpoAnalytics[]
  avg_return: number | null
  avg_sub_rate: number | null
}

export interface ConfigResponse {
  line_notify_token_masked: string
  line_notify_token_set: boolean
  check_interval_hours: number
  email_fallback: boolean
  smtp_host: string
  smtp_port: number
  smtp_user: string
  email_to: string
}
