import { Link, useLocation } from 'react-router-dom'

interface Props {
  lastCheck?: string | null
}

function LogoMark() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="10" width="3" height="6" rx="1" fill="white"/>
        <rect x="7" y="6" width="3" height="10" rx="1" fill="white"/>
        <rect x="12" y="2" width="3" height="14" rx="1" fill="white"/>
        <circle cx="3.5" cy="8" r="1.5" fill="#5DCAA5"/>
      </svg>
    </div>
  )
}

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

export default function Navbar({ lastCheck }: Props) {
  const { pathname } = useLocation()

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')
  }

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '0.5px solid var(--border-strong)',
      padding: '14px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <LogoMark />
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>IPO Intelligence Dashboard</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>Hong Kong Market — etnet.com.hk</div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {lastCheck && (
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'DM Mono', monospace" }}>
            Updated: {fmtDate(lastCheck)}
          </span>
        )}
        <a
          href="https://www.etnet.com.hk/www/eng/stocks/ci_ipo.php"
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 11, color: 'var(--blue-mid)', textDecoration: 'none',
            padding: '4px 10px', border: '0.5px solid var(--border-strong)',
            borderRadius: 20,
          }}
        >
          Source ↗
        </a>
        <div style={{ width: '0.5px', height: 18, background: 'var(--border-strong)', margin: '0 2px' }} />
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              fontSize: 12,
              fontWeight: pathname === to ? 500 : 400,
              color: pathname === to ? 'var(--text)' : 'var(--text3)',
              textDecoration: 'none',
              padding: '3px 8px',
              borderRadius: 6,
              background: pathname === to ? 'var(--surface2)' : 'transparent',
            }}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
