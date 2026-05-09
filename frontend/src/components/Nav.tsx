import { Link, useLocation } from 'react-router-dom'
import { useWalletCtx } from '../context/WalletContext'
import { truncateAddress } from '../lib/protocolData'

export function Nav() {
  const { isConnected, address, connect, disconnect } = useWalletCtx()
  const location = useLocation()

  return (
    <nav className="flex items-center justify-between px-4 lg:px-8 fixed top-0 left-0 right-0 z-[100]" style={{
      height: 'var(--nav-h)', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-base)'
    }}>
      <div className="flex items-center gap-4 lg:gap-12 overflow-x-auto">
        <Link to="/" style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: 0, lineHeight: 1 }}>
          SOUL
        </Link>
        
        {isConnected && (
          <div className="flex gap-4 lg:gap-8">
            {[
              { path: '/dashboard', label: 'DASHBOARD' },
              { path: '/issuers', label: 'ISSUER REGISTRY' },
              { path: '/recovery', label: 'RECOVERY' }
            ].map(link => (
              <Link
                key={link.path}
                to={link.path}
                className="label"
                style={{
                  color: location.pathname.startsWith(link.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderBottom: location.pathname.startsWith(link.path) ? '2px solid var(--accent)' : '2px solid transparent',
                  paddingBottom: 4
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {!isConnected ? (
          <button className="btn" onClick={connect}>
            CONNECT WALLET
          </button>
        ) : (
          <button className="btn btn--active" onClick={disconnect}>
            {address ? truncateAddress(address) : 'DISCONNECT'}
          </button>
        )}
      </div>
    </nav>
  )
}
