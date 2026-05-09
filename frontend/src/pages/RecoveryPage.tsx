import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Nav } from '../components/Nav'
import { submitRecovery } from '../lib/programs'
import { useWalletCtx } from '../context/WalletContext'
import { PageTransition } from '../components/PageTransition'

// ─── Validation ───────────────────────────────────────────────────────────
const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
function isValidSolanaAddress(addr: string): boolean {
  return addr.length >= 32 && addr.length <= 44 && addr.split('').every(c => BASE58_CHARS.includes(c))
}

// ─── SVG Lock Animation ───────────────────────────────────────────────────
function BrutalistLock({ closed }: { closed: boolean }) {
  return (
    <div style={{ width: 120, height: 120 }}>
      <svg viewBox="0 0 120 120" fill="none">
        {/* Shackle */}
        <motion.path
          d="M30 60 V30 C30 10, 90 10, 90 30 V60"
          stroke="var(--border)" strokeWidth="8" strokeLinecap="square"
          animate={{ y: closed ? 0 : -24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Body */}
        <rect x="20" y="60" width="80" height="50" fill="var(--bg-elevated)" stroke="var(--border)" strokeWidth="4" />
        {/* Keyhole */}
        <rect x="56" y="76" width="8" height="12" fill="var(--accent)" />
        <motion.line 
          x1="60" y1="88" x2="60" y2="96" 
          stroke="var(--accent)" strokeWidth="4"
          animate={{ rotate: closed ? 90 : 0 }}
          style={{ transformOrigin: "60px 82px" }}
        />
      </svg>
    </div>
  )
}

function GuardianInput({ index, value, onChange }: { index: number, value: string, onChange: (v: string) => void }) {
  const [touched, setTouched] = useState(false)
  const valid = isValidSolanaAddress(value)
  const invalid = touched && value.length > 0 && !valid

  return (
    <div style={{ marginBottom: 32 }}>
      <label className="input-label" style={{ color: invalid ? 'var(--error)' : 'var(--text-secondary)' }}>
        GUARDIAN {index + 1}
      </label>
      <input
        className="input-field" type="text" placeholder="Solana Wallet Address"
        value={value} onChange={e => onChange(e.target.value)} onBlur={() => setTouched(true)}
        style={{ borderColor: invalid ? 'var(--error)' : valid ? 'var(--accent)' : 'var(--border)' }}
      />
      {invalid && <div className="data" style={{ color: 'var(--error)', fontSize: 11, marginTop: 8 }}>ERR_INVALID_ADDRESS_FORMAT</div>}
    </div>
  )
}

// ─── Recovery Page ────────────────────────────────────────────────────────

export default function RecoveryPage() {
  const { address } = useWalletCtx()
  const wallet = address || ""
  
  const [step, setStep] = useState(0)
  const [guardians, setGuardians] = useState(['', '', ''])
  const [submitting, setSubmitting] = useState(false)
  const [configHash, setConfigHash] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const allValid = guardians.filter(isValidSolanaAddress).length === 3

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await submitRecovery(wallet, guardians)
      setConfigHash(res.configHash)
      setTimeout(() => setStep(3), 800)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Recovery transaction failed.')
    } finally {
      setTimeout(() => setSubmitting(false), 800)
    }
  }

  // Horizontal translation variants
  const sliderVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100vw' : '-100vw', opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
    exit: (direction: number) => ({ x: direction < 0 ? '100vw' : '-100vw', opacity: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } })
  }

  // To track direction
  const [[page, direction], setPage] = useState([0, 0])

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection])
    setStep(page + newDirection)
  }

  return (
    <PageTransition>
      <Nav />
      <main style={{ minHeight: '100vh', paddingTop: 'var(--nav-h)', backgroundColor: 'var(--bg-base)', overflowX: 'hidden', position: 'relative' }}>
        
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'var(--bg-surface)' }}>
          <motion.div
            animate={{ width: `${((step + 1) / 4) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: '100%', backgroundColor: 'var(--accent)' }}
          />
        </div>

        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          {step === 0 && (
            <motion.div key="0" custom={direction} variants={sliderVariants} initial="enter" animate="center" exit="exit" className="flex items-center justify-center w-screen min-h-[calc(100vh-var(--nav-h))] p-6 lg:p-12">
              <div style={{ maxWidth: 640 }}>
                <div className="label" style={{ marginBottom: 16 }}>SOCIAL RECOVERY</div>
                <h1 className="mobile-hero-text" style={{ fontSize: 'clamp(80px, 12vw, 140px)', lineHeight: 0.8, marginBottom: 48 }}>GUARDIANS</h1>
                <p className="data" style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 13, lineHeight: 1.6 }}>
                  Your SOUL passport is tied to your wallet. If you lose access, a 2/3 consensus from your guardians can restore it to a new address.
                </p>
                <div style={{ padding: 24, border: '1px solid var(--warning)', marginBottom: 48 }}>
                  <div className="label" style={{ color: 'var(--warning)', marginBottom: 8 }}>WARNING</div>
                  <p className="data" style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                    Guardians have no access to your assets. This protocol only governs reputation portability.
                  </p>
                </div>
                <button className="btn" onClick={() => paginate(1)}>CONFIGURE NODES →</button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="1" custom={direction} variants={sliderVariants} initial="enter" animate="center" exit="exit" className="flex items-center justify-center w-screen min-h-[calc(100vh-var(--nav-h))] p-6 lg:p-12">
              <div className="w-full max-w-[640px]">
                <div className="label" style={{ marginBottom: 16 }}>STEP 02</div>
                <h2 className="mobile-h2-text" style={{ fontSize: 80, lineHeight: 0.8, marginBottom: 48 }}>ADD GUARDIANS</h2>
                <div style={{ padding: 48, border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                  {guardians.map((g, i) => (
                    <GuardianInput key={i} index={i} value={g} onChange={v => setGuardians(prev => prev.map((x, j) => j === i ? v : x))} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 48 }}>
                  <button className="btn" onClick={() => paginate(-1)}>← BACK</button>
                  <button className="btn btn--active" disabled={!allValid} onClick={() => paginate(1)}>REVIEW & SIGN →</button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="2" custom={direction} variants={sliderVariants} initial="enter" animate="center" exit="exit" className="flex items-center justify-center w-screen min-h-[calc(100vh-var(--nav-h))] p-6 lg:p-12">
              <div className="w-full max-w-[640px]">
                <div className="label" style={{ marginBottom: 16 }}>STEP 03</div>
                <h2 className="mobile-h2-text" style={{ fontSize: 80, lineHeight: 0.8, marginBottom: 48 }}>VERIFY</h2>
                
                <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 p-6 lg:p-12 mb-12" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                  <div style={{ flex: 1 }}>
                    <div className="label" style={{ marginBottom: 8 }}>TARGET WALLET</div>
                    <div className="data" style={{ marginBottom: 32 }}>{wallet}</div>
                    
                    {guardians.map((g, i) => (
                      <div key={i} style={{ marginBottom: 16 }}>
                        <div className="label" style={{ marginBottom: 4 }}>GUARDIAN {i + 1}</div>
                        <div className="data" style={{ color: 'var(--text-secondary)' }}>{g}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mobile-hide" style={{ alignSelf: 'center' }}>
                    <BrutalistLock closed={submitting || configHash !== null} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24 }}>
                  <button className="btn" disabled={submitting} onClick={() => paginate(-1)}>← BACK</button>
                  <button className="btn btn--active" disabled={submitting} onClick={handleSubmit}>
                    {submitting ? "EXECUTING..." : "SIGN & LOCK IN →"}
                  </button>
                </div>
                {submitError && (
                  <div className="data" style={{ color: 'var(--error)', fontSize: 12, marginTop: 24 }}>
                    {submitError}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="3" custom={direction} variants={sliderVariants} initial="enter" animate="center" exit="exit" className="flex items-center justify-center w-screen min-h-[calc(100vh-var(--nav-h))] p-6 lg:p-12">
              <div className="w-full max-w-[640px] text-center p-8 lg:p-16" style={{ border: '1px solid var(--accent)', backgroundColor: 'var(--bg-surface)' }}>
                <h2 style={{ fontSize: 100, color: 'var(--accent)', lineHeight: 0.8, marginBottom: 24 }}>LOCKED IN</h2>
                <p className="data" style={{ color: 'var(--text-secondary)', marginBottom: 48 }}>3 GUARDIANS REGISTERED ON-CHAIN.</p>
                <div style={{ padding: 24, border: '1px solid var(--border)', backgroundColor: 'var(--bg-base)' }}>
                  <div className="label" style={{ marginBottom: 8 }}>CONFIG HASH</div>
                  <div className="data" style={{ color: 'var(--accent)', fontSize: 11, wordBreak: 'break-all' }}>{configHash}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </PageTransition>
  )
}
