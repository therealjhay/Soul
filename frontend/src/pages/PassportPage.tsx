import { useState, useRef, MouseEvent, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Nav } from '../components/Nav'
import { useWalletCtx } from '../context/WalletContext'
import { emptyPassport, emptyReputation, getPassport, getWalletReputation } from '../lib/api'
import { RGP_PROTOCOL_VERSION, SOLANA_CLUSTER, truncateAddress } from '../lib/protocolData'
import { PageTransition } from '../components/PageTransition'

// ─── 3D Passport Card ─────────────────────────────────────────────────────

function PassportCard({ wallet, score, tier, issuedAt, version }: any) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [flipped, setFlipped] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/passport?wallet=${wallet}`

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef.current || isFlipping) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    // Map to rotateY(±10deg) and rotateX(±6deg)
    setTilt({ x: (y / (rect.height / 2)) * -6, y: (x / (rect.width / 2)) * 10 })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
  }

  const handleFlip = () => {
    if (isFlipping) return
    setIsFlipping(true)
    setTimeout(() => {
      setFlipped(f => !f)
      setIsFlipping(false)
    }, 240)
  }

  return (
    <div style={{ perspective: 1200, width: '100%', maxWidth: 640, margin: '0 auto 48px' }}>
      <motion.div
        initial={{ y: -60, rotateX: 12, opacity: 0 }}
        animate={{ y: 0, rotateX: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      >
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          animate={{
            rotateX: tilt.x,
            rotateY: isFlipping ? (flipped ? -90 : 90) : (flipped ? 180 : tilt.y)
          }}
          transition={{
            rotateX: { type: "tween", ease: "linear", duration: 0.1 },
            rotateY: { type: "tween", ease: isFlipping ? "linear" : "linear", duration: isFlipping ? 0.24 : 0.1 }
          }}
          style={{
            width: '100%', aspectRatio: '1.586', position: 'relative',
            transformStyle: 'preserve-3d', cursor: 'default'
          }}
        >
          {/* FRONT FACE */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)',
            padding: 32, transformStyle: 'preserve-3d',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            pointerEvents: flipped ? 'none' : 'auto'
          }}>
            {/* Base Layer */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: 'radial-gradient(circle at center, var(--text-muted) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* Depth Layer 1 (Z=20px) */}
            <div style={{ transform: 'translateZ(20px)', display: 'flex', justifyContent: 'space-between' }}>
              <div className="label">SOUL PASSPORT</div>
              <div className="data" style={{ fontSize: 10, color: 'var(--text-muted)' }}>v{version} // SOLANA_{SOLANA_CLUSTER.toUpperCase()}</div>
            </div>

            {/* Depth Layer 2 (Z=60px) */}
            <div style={{ transform: 'translateZ(60px)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div className="mobile-hero-text" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(80px, 16vw, 160px)', color: 'var(--text-primary)', lineHeight: 0.8 }}>
                {score}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--accent)', letterSpacing: 2 }}>
                {tier}
              </div>
            </div>

            {/* Depth Layer 3 (Z=40px) */}
            <div style={{ transform: 'translateZ(40px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div>
                <div className="label" style={{ marginBottom: 4 }}>WALLET</div>
                <div className="data" style={{ fontSize: 13 }}>{truncateAddress(wallet)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label" style={{ marginBottom: 4 }}>ISSUED</div>
                <div className="data" style={{ fontSize: 13 }}>{new Date(issuedAt).toLocaleDateString()}</div>
              </div>
            </div>
            
            <div style={{ position: 'absolute', bottom: 32, right: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, transform: 'translateZ(20px)' }}>
              {[1,2,3,4,5,6,7,8,9].map(i => (
                <div key={i} style={{ width: 4, height: 4, backgroundColor: 'var(--text-muted)' }} />
              ))}
            </div>
          </div>

          {/* BACK FACE */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
            backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)',
            padding: 32, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 32,
            pointerEvents: flipped ? 'auto' : 'none'
          }}>
            <div className="label">SCAN TO VERIFY</div>
            <div style={{ padding: 16, backgroundColor: '#fff' }}>
              <QRCodeSVG value={shareUrl} size={160} bgColor="#fff" fgColor="#000" level="M" />
            </div>
            <div className="data" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {shareUrl}
            </div>
          </div>

        </motion.div>
      </motion.div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 48 }}>
        <button className="btn" onClick={() => window.location.reload()}>
          REFRESH PASSPORT
        </button>
        <button className="btn btn--active" onClick={handleFlip}>
          {flipped ? "HIDE QR CODE" : "SHARE PASSPORT"}
        </button>
      </div>
    </div>
  )
}

// ─── CSS Perspective Grid Background ──────────────────────────────────────

function PerspectiveGrid() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: -1, perspective: 1000, overflow: 'hidden', backgroundColor: '#0A0A0A' }}>
      <motion.div
        animate={{ backgroundPositionY: ['0px', '60px'] }}
        transition={{ duration: 5, ease: "linear", repeat: Infinity }}
        style={{
          position: 'absolute', bottom: '-50%', left: '-50%', right: '-50%', height: '150%',
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          transformOrigin: 'top center',
          transform: 'rotateX(75deg)'
        }}
      />
    </div>
  )
}

// ─── Passport Page ────────────────────────────────────────────────────────

export default function PassportPage() {
  const { address } = useWalletCtx()
  const wallet = address || ''
  const { data: reputation = emptyReputation(wallet) } = useQuery({
    queryKey: ['passport-reputation', wallet],
    queryFn: () => getWalletReputation(wallet),
    enabled: Boolean(wallet),
    retry: false,
  })
  const { data: passport = emptyPassport(wallet) } = useQuery({
    queryKey: ['passport', wallet],
    queryFn: () => getPassport(wallet),
    enabled: Boolean(wallet),
    retry: false,
  })

  return (
    <PageTransition>
      <Nav />
      <main style={{ minHeight: '100vh', paddingTop: 'calc(var(--nav-h) + 64px)', position: 'relative' }}>
        <PerspectiveGrid />
        
        <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <PassportCard
            wallet={wallet}
            score={reputation.score}
            tier={reputation.tier}
            issuedAt={passport.issued_at}
            sbtCount={passport.sbt_count}
            version={passport.version || RGP_PROTOCOL_VERSION}
          />
        </div>
      </main>
    </PageTransition>
  )
}
