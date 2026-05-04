import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Nav } from '../components/Nav'
import { getIssuers, Issuer } from '../lib/api'
import { MOCK_ISSUERS } from '../lib/mockData'
import { useQuery } from '@tanstack/react-query'
import { PageTransition } from '../components/PageTransition'

// ─── Status Indicator ─────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const isVerified = status === 'VERIFIED'
  const color = isVerified ? 'var(--accent)' : 'var(--text-muted)'
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className={isVerified ? "hard-pulse" : ""} style={{ width: 8, height: 8, backgroundColor: color }} />
      <span className="label" style={{ color: isVerified ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{status}</span>
    </div>
  )
}

// ─── Apply Overlay ────────────────────────────────────────────────────────

function ApplyOverlay({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false)

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'var(--bg-surface)',
        display: 'flex', flexDirection: 'column', padding: '64px 12vw'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 32, marginBottom: 64 }}>
        <h2 style={{ fontSize: 80, lineHeight: 0.8 }}>APPLY AS ISSUER</h2>
        <button onClick={onClose} className="btn">CLOSE</button>
      </div>

      {submitted ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1 }}>
          <h3 style={{ fontSize: 48, color: 'var(--accent)', marginBottom: 24 }}>APPLICATION SUBMITTED</h3>
          <p className="data" style={{ color: 'var(--text-secondary)' }}>Review in progress. Expect a response within 5-10 business days.</p>
        </motion.div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); setSubmitted(true) }} style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div>
            <label className="input-label">ISSUER NAME</label>
            <input className="input-field" type="text" placeholder="e.g. Superteam" required />
          </div>
          <div>
            <label className="input-label">ISSUER TYPE</label>
            <select className="input-field" required>
              <option value="">SELECT TYPE</option>
              <option value="DAO">DAO</option>
              <option value="PROTOCOL">PROTOCOL</option>
              <option value="HACKATHON">HACKATHON</option>
            </select>
          </div>
          <div>
            <label className="input-label">INTEGRATION URL</label>
            <input className="input-field" type="url" placeholder="https://your-protocol.xyz" required />
          </div>
          <button type="submit" className="btn btn--active" style={{ alignSelf: 'flex-start' }}>SUBMIT APPLICATION</button>
        </form>
      )}
    </motion.div>
  )
}

// ─── Issuer Row (0fr CSS trick) ───────────────────────────────────────────

function IssuerRow({ issuer }: { issuer: Issuer }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', backgroundColor: expanded ? 'var(--bg-elevated)' : 'transparent', transition: 'background-color 0.2s' }}
      >
        <td style={{ padding: '24px 32px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>{issuer.name}</div>
        </td>
        <td style={{ padding: '24px 32px' }} className="label">{issuer.type}</td>
        <td style={{ padding: '24px 32px' }} className="data">{issuer.sbts_issued.toLocaleString()}</td>
        <td style={{ padding: '24px 32px', color: issuer.weight > 0 ? 'var(--accent)' : 'var(--text-muted)' }} className="data">
          {issuer.weight > 0 ? `+${issuer.weight}` : '0'}
        </td>
        <td style={{ padding: '24px 32px' }}>
          <StatusDot status={issuer.status} />
        </td>
      </tr>

      {/* The 0fr -> 1fr CSS Trick */}
      <tr>
        <td colSpan={5} style={{ padding: 0, borderBottom: expanded ? '1px solid var(--border)' : 'none' }}>
          <div style={{
            display: 'grid',
            gridTemplateRows: expanded ? '1fr' : '0fr',
            transition: 'grid-template-rows 400ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ padding: expanded ? '32px 48px' : '0 48px', display: 'flex', gap: 64, backgroundColor: 'var(--bg-base)' }}>
                <div style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 12 }}>DESCRIPTION</div>
                  <p className="data" style={{ color: 'var(--text-primary)', fontSize: 13 }}>{issuer.description || 'N/A'}</p>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label" style={{ marginBottom: 12 }}>SUPPORTED SBT TYPES</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {(issuer.sbt_types || []).map(t => (
                      <span key={t} className="label" style={{ padding: '4px 8px', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>{t}</span>
                    ))}
                  </div>
                </div>
                {issuer.integration_url && (
                  <div style={{ alignSelf: 'center' }}>
                    <a href={issuer.integration_url} target="_blank" rel="noreferrer" className="btn">VISIT PROTOCOL</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  )
}

// ─── Issuers Page ─────────────────────────────────────────────────────────

export default function IssuersPage() {
  const [applyOpen, setApplyOpen] = useState(false)
  const { data: issuers, isLoading } = useQuery({
    queryKey: ['issuers'], queryFn: getIssuers, retry: false, initialData: MOCK_ISSUERS,
  })
  
  return (
    <PageTransition>
      <Nav />
      <main style={{ minHeight: '100vh', paddingTop: 'var(--nav-h)', backgroundColor: 'var(--bg-base)' }}>
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end px-6 py-12 lg:px-12 lg:py-16" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h1 className="mobile-hero-text" style={{ fontSize: 'clamp(80px, 12vw, 160px)', lineHeight: 0.8 }}>ISSUERS</h1>
          </div>
          <div style={{ display: 'flex', gap: 64, paddingBottom: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ marginBottom: 8 }}>VERIFIED</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--accent)', lineHeight: 1 }}>
                {(issuers || []).filter(i => i.status === 'VERIFIED').length}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ marginBottom: 8 }}>PENDING</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--text-muted)', lineHeight: 1 }}>
                {(issuers || []).filter(i => i.status === 'PENDING').length}
              </div>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="skeleton" style={{ height: 600, width: '100%' }} />
        ) : (
          <div className="w-full overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                  {['ISSUER', 'CATEGORY', 'SBT VOLUME', 'WEIGHT', 'STATUS'].map(h => (
                    <th key={h} className="label" style={{ textAlign: 'left', padding: '24px 32px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issuers.map((issuer) => <IssuerRow key={issuer.id} issuer={issuer} />)}
              </tbody>
            </table>
          </div>
        )}

        <button
          className="btn btn--active"
          onClick={() => setApplyOpen(true)}
          style={{ position: 'fixed', bottom: 40, right: 40, zIndex: 100 }}
        >
          APPLY AS ISSUER →
        </button>

        <AnimatePresence>
          {applyOpen && <ApplyOverlay onClose={() => setApplyOpen(false)} />}
        </AnimatePresence>

      </main>
    </PageTransition>
  )
}
