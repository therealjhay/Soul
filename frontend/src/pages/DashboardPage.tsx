import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useAnimation } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useWalletCtx } from '../context/WalletContext'
import { emptyReputation, getWalletReputation, getWalletSBTs } from '../lib/api'
import { truncateAddress } from '../lib/protocolData'
import { useGlitchText } from '../hooks/useGlitchText'
import { useNumberTick } from '../hooks/useNumberTick'
import { PageTransition } from '../components/PageTransition'

// ─── Score Ring SVG ───────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const { value } = useNumberTick(score, 1500)
  const percentage = (score / 1000) * 100
  const radius = 120
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="mobile-svg-ring" style={{ position: 'relative', width: 300, height: 300, margin: '0 auto 32px' }}>
      <svg width="100%" height="100%" viewBox="0 0 300 300" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="150" cy="150" r={radius} fill="none" stroke="var(--border)" strokeWidth="2" />
        <motion.circle
          cx="150" cy="150" r={radius} fill="none"
          stroke="var(--accent)" strokeWidth="4"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <div className="mobile-svg-text" style={{ fontSize: 110, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 0.8 }}>
          {value}
        </div>
      </div>
    </div>
  )
}

// ─── SBT Card (3D Tilt) ───────────────────────────────────────────────────

function SBTCard({ sbt }: { sbt: any }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const controls = useAnimation()

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    // Map to ±5deg
    setTilt({ x: (y / (rect.height / 2)) * -5, y: (x / (rect.width / 2)) * 5 })
  }

  const handleMouseEnter = () => {
    controls.start({ rotate: 360, transition: { duration: 0.4, ease: [0.7, 0, 0.84, 0] } })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    controls.start({ rotate: 0, transition: { duration: 0 } })
  }

  return (
    <div style={{ perspective: 800 }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{ rotateX: tilt.x, rotateY: tilt.y, z: tilt.x || tilt.y ? 8 : 0 }}
        transition={{ type: "tween", ease: "linear", duration: 0.1 }}
        style={{
          border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)',
          padding: 24, transformStyle: 'preserve-3d', cursor: 'default'
        }}
        whileHover={{ borderColor: 'var(--accent)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <motion.div animate={controls} style={{ width: 24, height: 24, border: '1px solid var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, backgroundColor: 'var(--text-secondary)' }} />
          </motion.div>
          <div className="label">{sbt.category}</div>
        </div>
        <h3 style={{ fontSize: 32, marginBottom: 8 }}>{sbt.issuer_name}</h3>
        <div className="data" style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24, minHeight: 40 }}>
          {sbt.description}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div className="data" style={{ fontSize: 12 }}>{new Date(sbt.issued_at).toLocaleDateString()}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent)' }}>+{sbt.weight_points}</div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { address } = useWalletCtx()
  const wallet = address || ''
  const { data: reputation = emptyReputation(wallet) } = useQuery({
    queryKey: ['wallet-reputation', wallet],
    queryFn: () => getWalletReputation(wallet),
    enabled: Boolean(wallet),
    retry: false,
  })
  const { data: sbts = [], isLoading: sbtsLoading } = useQuery({
    queryKey: ['wallet-sbts', wallet],
    queryFn: () => getWalletSBTs(wallet),
    enabled: Boolean(wallet),
    retry: false,
  })

  const [filter, setFilter] = useState('ALL')
  const filters = ['ALL', 'DEV', 'GOVERNANCE', 'SOCIAL', 'DEFI']
  const filteredSBTs = filter === 'ALL' ? sbts : sbts.filter(s => s.category.toUpperCase() === filter)

  const glitchedTier = useGlitchText(reputation.tier, true)

  const copyWallet = () => {
    navigator.clipboard.writeText(wallet)
    // Custom invert flash handled by CSS class addition ideally, but keeping simple here
  }

  return (
    <PageTransition>
      <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen overflow-y-auto lg:overflow-hidden">
        
        {/* Sidebar (18%) */}
        <aside className="flex flex-col shrink-0 w-full lg:w-[18%]" style={{ borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-base)' }}>
          <div style={{ padding: '32px 24px', borderBottom: '1px solid var(--border)' }}>
            <Link to="/" style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--text-primary)' }}>SOUL</Link>
          </div>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
            <div className="label" style={{ marginBottom: 8 }}>WALLET_ID</div>
            <div onClick={copyWallet} className="data" style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
              {truncateAddress(wallet)}
            </div>
          </div>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
            <div className="label" style={{ marginBottom: 8 }}>CURRENT_TIER</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--accent)' }}>
              {glitchedTier}
            </div>
          </div>
          <nav className="flex flex-row lg:flex-col flex-1 py-4 lg:py-6 overflow-x-auto lg:overflow-visible">
            {[
              { path: '/dashboard', label: 'DASHBOARD' },
              { path: '/passport', label: 'PASSPORT' },
              { path: '/issuers', label: 'ISSUERS' },
              { path: '/recovery', label: 'RECOVERY' }
            ].map(link => (
              <Link key={link.path} to={link.path} className="label" style={{
                padding: '16px 24px', color: link.path === '/dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderLeft: link.path === '/dashboard' ? '2px solid var(--accent)' : '2px solid transparent'
              }}>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main (57%) */}
        <main className="flex flex-col shrink-0 w-full lg:w-[57%]" style={{ borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-base)' }}>
          <div style={{ padding: '48px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
            <ScoreRing score={reputation.score} />
            <div className="label">SOUL SCORE</div>
          </div>
          
          <div className="mobile-table-wrap" style={{ padding: '24px 48px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 24 }}>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)} className="label" style={{
                color: filter === f ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: filter === f ? '1px solid var(--accent)' : '1px solid transparent',
                paddingBottom: 4, transition: 'clip-path 0.3s'
              }}>
                {f}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {!sbtsLoading && filteredSBTs.length === 0 && (
                <div className="data" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  No indexed RGP credentials found for this devnet wallet yet.
                </div>
              )}
              {filteredSBTs.map((sbt, i) => (
                <motion.div key={sbt.token_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <SBTCard sbt={sbt} />
                </motion.div>
              ))}
            </div>
          </div>
        </main>

        {/* Right Panel (25%) */}
        <aside className="flex flex-col shrink-0 w-full lg:w-[25%]" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ padding: '32px 24px', borderBottom: '1px solid var(--border)' }}>
            <button className="btn" style={{ width: '100%' }} onClick={() => navigate('/passport')}>
              VIEW PASSPORT →
            </button>
          </div>
          
          <div style={{ padding: '32px 24px', borderBottom: '1px solid var(--border)' }}>
            <div className="label" style={{ marginBottom: 32 }}>SCORE BREAKDOWN</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160 }}>
              {reputation.breakdown.map((item, i) => (
                <div key={item.category} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div className="data" style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.score}</div>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${item.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: '100%', backgroundColor: 'var(--accent)' }}
                  />
                  <div className="label" style={{ fontSize: 9 }}>{item.category.substring(0, 3)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, padding: '32px 24px', overflowY: 'auto' }}>
            <div className="label" style={{ marginBottom: 24 }}>RECENT ACTIVITY</div>
            {sbtsLoading && <div className="skeleton" style={{ height: 48, width: '100%' }} />}
            {!sbtsLoading && !sbts.length && (
              <div className="data" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>No credential events indexed.</div>
            )}
            {sbts.slice(0, 4).map((sbt, i) => (
              <motion.div key={sbt.token_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.06 }} style={{ marginBottom: 16 }}>
                <div className="data" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {new Date(sbt.issued_at).toLocaleDateString()}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)' }}>
                  + {sbt.weight_points} PTS :: {sbt.issuer_name}
                </div>
              </motion.div>
            ))}
          </div>
        </aside>

      </div>
    </PageTransition>
  )
}
