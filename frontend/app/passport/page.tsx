"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Nav } from "../../components/Nav";
import { CopyData } from "../../components/CopyData";
import { ScanSkeleton } from "../../components/ScanSkeleton";
import { useParallax } from "../../hooks/useParallax";
import { useWalletCtx } from "../WalletContext";
import { MOCK_PASSPORT, MOCK_REPUTATION, truncateAddress } from "../../lib/mockData";
import { mintPassport } from "../../lib/programs";

// ─── Passport Card ────────────────────────────────────────────────────────

interface PassportCardProps {
  wallet: string;
  score: number;
  tier: string;
  issuedAt: string;
  sbtCount: number;
  version: string;
}

function PassportCard({ wallet, score, tier, issuedAt, sbtCount, version }: PassportCardProps) {
  const { ref, transform } = useParallax(8);
  const [flipped, setFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/passport?wallet=${wallet}`;

  const handleFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    // flip out
    setTimeout(() => {
      setFlipped((f) => !f);
      setIsFlipping(false);
    }, 200);
  };

  return (
    <div style={{ perspective: "1000px" }}>
      {/* Outer parallax container */}
      <div
        ref={ref}
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
          transition: "transform 80ms linear",
          cursor: "default",
        }}
      >
        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: -40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: "min(480px, 90vw)",
            aspectRatio: "1.586",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            position: "relative",
            overflow: "hidden",
            animation: isFlipping
              ? flipped
                ? "card-flip-in 200ms ease forwards"
                : "card-flip-out 200ms ease forwards"
              : "none",
          }}
        >
          {!flipped ? (
            /* ── Front face ── */
            <div
              style={{
                padding: 28,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Top: Protocol label */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      letterSpacing: "0.1em",
                      color: "var(--text-primary)",
                      marginBottom: 2,
                    }}
                  >
                    SOUL REPUTATION PASSPORT
                  </div>
                  <div className="label">{version} · SOLANA MAINNET</div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 28,
                    color: "var(--accent)",
                    letterSpacing: "0.08em",
                    transform: "translateZ(20px)",
                  }}
                >
                  SOUL
                </div>
              </div>

              {/* Center: Score + Tier */}
              <div style={{ transform: "translateZ(16px)" }}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(48px, 8vw, 80px)",
                    lineHeight: 1,
                    color: "var(--text-primary)",
                    letterSpacing: "0.04em",
                    marginBottom: 4,
                  }}
                >
                  {score}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                  }}
                >
                  {tier}
                </div>
              </div>

              {/* Bottom: Address + Metadata */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>WALLET</div>
                  <CopyData value={wallet} className="text-[11px]" />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="label" style={{ marginBottom: 4 }}>ISSUED</div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
                    {new Date(issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="label" style={{ marginBottom: 4 }}>SBTs</div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
                    {sbtCount}
                  </span>
                </div>
              </div>

              {/* Subtle grid pattern */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                  opacity: 0.2,
                  pointerEvents: "none",
                }}
              />
            </div>
          ) : (
            /* ── Back face: QR + Share URL ── */
            <div
              style={{
                padding: 28,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
              }}
            >
              <div className="label" style={{ letterSpacing: "0.2em" }}>SCAN TO VERIFY</div>
              <div style={{ padding: 12, border: "1px solid var(--border)", backgroundColor: "var(--text-primary)" }}>
                <QRCodeSVG
                  value={shareUrl}
                  size={140}
                  bgColor="#F2EFE9"
                  fgColor="#0D0D0D"
                  level="M"
                />
              </div>
              <CopyData value={shareUrl} display={`/passport?wallet=${truncateAddress(wallet)}`} truncate={false} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Action buttons below card */}
      <div style={{ display: "flex", gap: 1, marginTop: 1 }}>
        <button
          id="passport-share"
          onClick={handleFlip}
          className="btn"
          style={{ flex: 1, justifyContent: "center", fontSize: 10 }}
        >
          {flipped ? "← BACK" : "SHARE →"}
        </button>
        <button
          id="passport-refresh"
          className="btn"
          style={{ flex: 1, justifyContent: "center", fontSize: 10 }}
        >
          REFRESH PASSPORT
        </button>
      </div>
    </div>
  );
}

// ─── Passport Page ────────────────────────────────────────────────────────

export default function PassportPage() {
  const { address } = useWalletCtx();
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintDone, setMintDone] = useState(false);

  const passport = MOCK_PASSPORT;
  const reputation = MOCK_REPUTATION;

  const wallet = address || passport.wallet;

  const handleMint = async () => {
    setMinting(true);
    setMintError(null);
    try {
      const result = await mintPassport(wallet);
      if (result.success) setMintDone(true);
    } catch (e: unknown) {
      setMintError(e instanceof Error ? e.message : "Mint failed");
    } finally {
      setMinting(false);
    }
  };

  return (
    <>
      <Nav />
      <main
        style={{
          minHeight: "100vh",
          paddingTop: 56,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: "80px 24px",
        }}
      >
        {/* Animated grid background */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            opacity: 0.15,
            animation: "grid-drift 20s linear infinite",
            pointerEvents: "none",
          }}
        />

        <style jsx global>{`
          @keyframes grid-drift {
            from { background-position: 0 0; }
            to   { background-position: 40px 40px; }
          }
        `}</style>

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          {/* Page title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: "center" }}
          >
            <div className="label" style={{ marginBottom: 8, letterSpacing: "0.2em" }}>IDENTITY DOCUMENT</div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 5vw, 64px)",
                color: "var(--text-primary)",
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              REPUTATION PASSPORT
            </h1>
          </motion.div>

          {/* Passport card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <PassportCard
              wallet={wallet}
              score={reputation.score}
              tier={reputation.tier}
              issuedAt={passport.issued_at}
              sbtCount={passport.sbt_count}
              version={passport.version}
            />
          </motion.div>

          {/* Metadata row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, auto)",
              gap: "0 40px",
              borderTop: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
              padding: "16px 0",
              width: "min(480px, 90vw)",
            }}
          >
            {[
              { label: "ISSUED", value: new Date(passport.issued_at).toLocaleDateString() },
              { label: "LAST UPDATED", value: new Date(passport.last_updated).toLocaleDateString() },
              { label: "CHAIN", value: "SOLANA" },
              { label: "VERSION", value: passport.version },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="label" style={{ marginBottom: 4 }}>{label}</div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)" }}>{value}</span>
              </div>
            ))}
          </motion.div>

          {/* Mint flow if no passport */}
          {!passport.exists && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              style={{ border: "1px solid var(--border)", padding: 24, width: "min(480px, 90vw)", textAlign: "center" }}
            >
              <div className="label" style={{ marginBottom: 12 }}>NO PASSPORT FOUND</div>
              {mintError && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--destructive)", marginBottom: 12 }}>
                  ERROR: {mintError}
                </p>
              )}
              {mintDone ? (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>
                  PASSPORT MINTED SUCCESSFULLY
                </p>
              ) : (
                <button
                  id="passport-mint"
                  onClick={handleMint}
                  disabled={minting}
                  className="btn"
                  style={{ width: "100%", justifyContent: "center", fontSize: 11, borderColor: "var(--accent)" }}
                >
                  {minting ? <ScanSkeleton height={16} width="160px" /> : "MINT PASSPORT →"}
                </button>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </>
  );
}
