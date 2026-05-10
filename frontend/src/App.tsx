import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Settings from './pages/Settings'
import { getStatus } from './api/client'

export default function App() {
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  useEffect(() => {
    getStatus().then(s => setLastCheck(s.last_check))
    const t = setInterval(() => {
      getStatus().then(s => setLastCheck(s.last_check))
    }, 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh' }}>
        <Navbar lastCheck={lastCheck} />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard onStatusChange={setLastCheck} />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
