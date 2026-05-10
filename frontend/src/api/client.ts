import axios from 'axios'
import type { ConfigResponse, HistoryEntry, ListingIPO, StatusResponse, TimetableEntry, UpcomingIPO } from '../types'

const api = axios.create({ baseURL: '/api' })

export const getStatus = () => api.get<StatusResponse>('/status').then(r => r.data)
export const getUpcoming = () => api.get<UpcomingIPO[]>('/ipo/upcoming').then(r => r.data)
export const getListing = () => api.get<ListingIPO[]>('/ipo/listing').then(r => r.data)
export const triggerCheck = () => api.post('/check').then(r => r.data)
export const getHistory = (limit = 50) => api.get<HistoryEntry[]>(`/history?limit=${limit}`).then(r => r.data)
export const getConfig = () => api.get<ConfigResponse>('/config').then(r => r.data)
export const updateConfig = (data: Record<string, unknown>) => api.put('/config', data).then(r => r.data)
export const getTimetable = () => api.get<TimetableEntry[]>('/ipo/timetable').then(r => r.data)
export const sendTestNotify = () => api.post('/test-notify').then(r => r.data)
export const getAnalytics = () => api.get<import('../types').AnalyticsResponse>('/analytics').then(r => r.data)
