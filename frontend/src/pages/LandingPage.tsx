import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { useWalletCtx } from '../context/WalletContext'
import { getLiveEvents, SBTEvent } from '../lib/api'
import { MOCK_EVENTS } from '../lib/mockData'
import { useNumberTick } from '../hooks/useNumberTick'
import { PageTransition } from '../components/PageTransition'

export default function LandingPage() {
  const navigate = useNavigate()
  const { isConnected, connect } = useWalletCtx()
  const [events, setEvents] = useState<SBTEvent[]>([])

  const { ref: statsRef, value: wIdx } = useNumberTick(14502)
  const { value: sIss } = useNumberTick(42819)
  const { value: iReg } = useNumberTick(83)

  useEffect(() => {
    if (isConnected) {
      navigate('/dashboard', { replace: true })
    }
  }, [isConnected, navigate])

  useEffect(() => {
    getLiveEvents().then(setEvents).catch(() => setEvents(MOCK_EVENTS))
    const interval = setInterval(() => {
      setEvents((prev) => {
        const newEvent: SBTEvent = {
          id: `ev-${Date.now()}`,
          event_type: Math.random() > 0.8 ? 'PASSPORT_MINTED' : 'SBT_ISSUED',
          wallet: '7xKX...' + Math.random().toString(36).substring(7).toUpperCase(),
          issuer_name: ['Superteam', 'Marinade', 'Realms DAO'][Math.floor(Math.random() * 3)],
          sbt_type: ['HACKATHON', 'STAKER', 'VOTER'][Math.floor(Math.random() * 3)],
          timestamp: new Date().toISOString(),
        }
        return [newEvent, ...prev].slice(0, 12) // Max 12 visible entries
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <PageTransition>
      <Nav />
      <main className="flex flex-col lg:flex-row min-h-screen overflow-hidden" style={{ paddingTop: 'var(--nav-h)' }}>
        
        {/* Left: 58% - Hero */}
        <section className="flex flex-col justify-center w-full lg:w-[58%] px-6 lg:px-[8%] shrink-0" style={{
          borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)'
        }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.24 }}>
            <h1 className="mobile-hero-text" style={{ fontSize: 'clamp(80px, 12vw, 180px)', lineHeight: 0.8, color: 'var(--text-primary)', marginBottom: 32 }}>
              SOUL<br />
              REPUTATION<br />
              ON-CHAIN
            </h1>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-secondary)',
              maxWidth: 480, marginBottom: 48, lineHeight: 1.6
            }}>
              Soulbound credentials from DAOs, hackathons, and DeFi protocols —<br />
              aggregated into a single cryptographic passport. Your identity, permanent.
            </p>
            
            <button className="btn" onClick={connect} style={{ width: '100%', fontSize: 16 }}>
              CONNECT WALLET →
            </button>
          </motion.div>
        </section>

        {/* Right: 42% - Terminal Feed */}
        <section className="flex flex-col overflow-hidden w-full lg:w-[42%] p-6 lg:p-8 shrink-0 pb-16" style={{
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div className="label" style={{ marginBottom: 24 }}>LIVE NETWORK FEED</div>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <AnimatePresence>
              {events.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)',
                    marginBottom: 16, display: 'flex', gap: 16
                  }}
                >
                  <span style={{ color: 'var(--accent)' }}>&gt;</span>
                  <div>
                    <span style={{ color: 'var(--text-primary)' }}>{ev.wallet}</span>
                    <span> :: {ev.event_type} </span>
                    {ev.event_type !== 'PASSPORT_MINTED' && (
                      <span style={{ color: 'var(--text-muted)' }}>[{ev.issuer_name} / {ev.sbt_type}]</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Fixed Bottom Bar */}
        <div ref={statsRef} className="fixed bottom-0 left-0 right-0 h-12 flex items-center justify-center z-10 w-full overflow-x-auto whitespace-nowrap px-4" style={{
          borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-base)',
          fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)'
        }}>
          WALLETS INDEXED: <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }} className="stat-value">{wIdx.toLocaleString()}</span>
          <span style={{ margin: '0 24px' }}>|</span>
          SBTS ISSUED: <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }} className="stat-value">{sIss.toLocaleString()}</span>
          <span style={{ margin: '0 24px' }}>|</span>
          ISSUERS REGISTERED: <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }} className="stat-value">{iReg}</span>
        </div>

      </main>
    </PageTransition>
  )
}
