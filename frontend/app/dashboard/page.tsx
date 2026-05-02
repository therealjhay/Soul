"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Nav } from "../../components/Nav";
import { CopyData } from "../../components/CopyData";
import { StatusDot } from "../../components/StatusDot";
import { ScanSkeleton, ScanSkeletonBlock } from "../../components/ScanSkeleton";
import { useCounter } from "../../hooks/useCounter";
import { useWalletCtx } from "../WalletContext";
import { getWalletSBTs, getWalletReputation, SBTToken } from "../../lib/api";
import { MOCK_REPUTATION, MOCK_SBTS, relativeTime } from "../../lib/mockData";
import Link from "next/link";

// ─── Score Ring ───────────────────────────────────────────────────────────

function ScoreRing({ score, max = 1000 }: { score: number; max?: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const progress = score / max;

  return (
    <svg width={130} height={130} viewBox="0 0 130 130" style={{ transform: "rotate(-90deg)" }}>
      {/* Track */}
      <circle cx={65} cy={65} r={r} fill="none" stroke="var(--border)" strokeWidth={2} />
      {/* Fill */}
      <circle
        cx={65}
        cy={65}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        style={{ transition: "stroke-dashoffset 1.2s var(--ease-in)" }}
        strokeLinecap="square"
      />
    </svg>
  );
}

// ─── SBT Card ─────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  DEV: "#A8FF3E",
  GOVERNANCE: "#FFB800",
  SOCIAL: "#64C8FF",
  DEFI: "#FF8C3E",
  OTHER: "#888888",
};

function SBTCard({ token, index }: { token: SBTToken; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ clipPath: "inset(100% 0 0 0)" }}
      animate={{ clipPath: "inset(0% 0 0 0)" }}
      transition={{ delay: index * 0.04, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        padding: 20,
        border: `1px solid ${hovered ? "var(--accent)" : "var(--border)"}`,
        backgroundColor: hovered ? "var(--bg-surface)" : "var(--bg-base)",
        transition: "border-color 120ms, background-color 120ms",
        cursor: "default",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {token.issuer_name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            color: "var(--accent)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          +{token.weight_points}
        </span>
      </div>

      {/* SBT Type — large center */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          color: CATEGORY_COLORS[token.category] || "var(--text-primary)",
          letterSpacing: "0.04em",
          lineHeight: 1.1,
          marginBottom: 16,
        }}
      >
        {token.description || token.context.toUpperCase().replace(/-/g, " ")}
      </div>

      {/* Bottom row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {token.category}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
          {new Date(token.issued_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Hover: issuer seal spin indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 14,
          width: 20,
          height: 20,
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "var(--text-muted)",
          animation: hovered ? "spin-once 400ms ease-out forwards" : "none",
        }}
      >
        ◈
      </div>

      <style jsx>{`
        @keyframes spin-once {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}

// ─── Category Filter Bar ──────────────────────────────────────────────────

type Category = "ALL" | "DEV" | "GOVERNANCE" | "SOCIAL" | "DEFI";

function FilterBar({ active, onChange }: { active: Category; onChange: (c: Category) => void }) {
  const cats: Category[] = ["ALL", "DEV", "GOVERNANCE", "SOCIAL", "DEFI"];
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 24 }}>
      {cats.map((c) => (
        <button
          key={c}
          id={`filter-${c.toLowerCase()}`}
          onClick={() => onChange(c)}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            padding: "10px 20px",
            background: "transparent",
            border: "none",
            borderBottom: active === c ? "2px solid var(--accent)" : "2px solid transparent",
            color: active === c ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
            transition: "color 120ms, border-color 120ms",
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

// ─── Score Tier Glitch ────────────────────────────────────────────────────

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function GlitchText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let iteration = 0;
    const maxIterations = text.length * 3;

    const interval = setInterval(() => {
      setDisplay((prev) =>
        text
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < iteration / 3) return text[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );
      iteration++;
      if (iteration > maxIterations) {
        clearInterval(interval);
        setDisplay(text);
        setDone(true);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span style={{ opacity: done ? 1 : 0.85 }}>{display}</span>
  );
}

// ─── CSS Bar Chart ────────────────────────────────────────────────────────

function ScoreBarChart({ breakdown }: { breakdown: { category: string; score: number; percentage: number }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {breakdown.map((item) => (
        <div key={item.category}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              {item.category}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>
              {item.score}
            </span>
          </div>
          <div style={{ height: 3, backgroundColor: "var(--bg-elevated)", width: "100%" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.percentage}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: "100%", backgroundColor: CATEGORY_COLORS[item.category] || "var(--accent)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const { address, isConnected } = useWalletCtx();
  const [activeFilter, setActiveFilter] = useState<Category>("ALL");
  const wallet = address || "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

  const { data: reputation, isLoading: repLoading } = useQuery({
    queryKey: ["reputation", wallet],
    queryFn: () => getWalletReputation(wallet),
    retry: false,
    initialData: MOCK_REPUTATION,
    enabled: !!wallet,
  });

  const { data: sbts, isLoading: sbtsLoading } = useQuery({
    queryKey: ["sbts", wallet],
    queryFn: () => getWalletSBTs(wallet),
    retry: false,
    initialData: MOCK_SBTS,
    enabled: !!wallet,
  });

  const score = reputation?.score ?? 0;
  const { count: scoreDisplay, ref: scoreRef } = useCounter({ target: score });

  const filteredSBTs = activeFilter === "ALL"
    ? (sbts ?? [])
    : (sbts ?? []).filter((s) => s.category === activeFilter);

  return (
    <>
      <Nav />
      <div
        id="dashboard"
        style={{
          display: "grid",
          gridTemplateColumns: "20fr 55fr 25fr",
          height: "100vh",
          paddingTop: 56,
          overflow: "hidden",
        }}
      >
        {/* ── Left Sidebar ──────────────────────────────────────────── */}
        <aside
          style={{
            borderRight: "1px solid var(--border)",
            padding: "32px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 32,
            overflowY: "auto",
          }}
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
            <div className="label" style={{ marginBottom: 8 }}>WALLET</div>
            {address ? (
              <CopyData value={address} className="text-[12px]" />
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                NO WALLET CONNECTED
              </span>
            )}
          </motion.div>

          <motion.nav initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
            <div className="label" style={{ marginBottom: 12 }}>NAVIGATE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                { href: "/dashboard", label: "OVERVIEW" },
                { href: "/passport", label: "PASSPORT" },
                { href: "/issuers", label: "ISSUERS" },
                { href: "/recovery", label: "RECOVERY" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: href === "/dashboard" ? "var(--accent)" : "var(--text-muted)",
                    textDecoration: "none",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                    display: "block",
                    transition: "color 120ms",
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </motion.nav>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
            <div className="label" style={{ marginBottom: 8 }}>CURRENT TIER</div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                padding: "4px 8px",
                display: "inline-block",
              }}
            >
              {reputation?.tier ?? "—"}
            </span>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}>
            <div className="label" style={{ marginBottom: 8 }}>STATUS</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusDot status={isConnected ? "active" : "pending"} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", color: "var(--text-secondary)" }}>
                {isConnected ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>
          </motion.div>
        </aside>

        {/* ── Main Content ──────────────────────────────────────────── */}
        <main style={{ overflowY: "auto", padding: "32px 32px" }}>
          {/* Score hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              marginBottom: 48,
              paddingBottom: 40,
              borderBottom: "1px solid var(--border)",
            }}
          >
            {/* Score ring */}
            <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
              <ScoreRing score={score} />
              <div
                ref={scoreRef as React.RefObject<HTMLDivElement>}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 38,
                    lineHeight: 1,
                    color: "var(--text-primary)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {repLoading ? "—" : scoreDisplay}
                </span>
              </div>
            </div>

            <div>
              <div className="label" style={{ marginBottom: 8 }}>REPUTATION SCORE</div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 4vw, 52px)",
                  lineHeight: 1,
                  color: "var(--accent)",
                  letterSpacing: "0.04em",
                  marginBottom: 8,
                }}
              >
                {repLoading ? (
                  <ScanSkeleton height={48} width="220px" />
                ) : (
                  <GlitchText text={reputation?.tier ?? "NEWCOMER"} />
                )}
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
                LAST UPDATED: {reputation ? new Date(reputation.last_updated).toLocaleDateString() : "—"}
              </p>
            </div>
          </motion.div>

          {/* SBT Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
              <div className="label">SOULBOUND TOKENS</div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                {filteredSBTs.length} CREDENTIALS
              </span>
            </div>

            <FilterBar active={activeFilter} onChange={setActiveFilter} />

            {sbtsLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 1 }}>
                {[...Array(6)].map((_, i) => <ScanSkeleton key={i} height={140} />)}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <div
                  key={activeFilter}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 1,
                  }}
                >
                  {filteredSBTs.map((token, i) => (
                    <SBTCard key={token.token_id} token={token} index={i} />
                  ))}
                  {filteredSBTs.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", padding: "40px 0", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                      NO CREDENTIALS IN THIS CATEGORY
                    </div>
                  )}
                </div>
              </AnimatePresence>
            )}
          </motion.div>
        </main>

        {/* ── Right Data Panel ──────────────────────────────────────── */}
        <aside
          style={{
            borderLeft: "1px solid var(--border)",
            padding: "32px 20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 40,
          }}
        >
          {/* Score Breakdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.24 }}>
            <div className="label" style={{ marginBottom: 16 }}>SCORE BREAKDOWN</div>
            {repLoading ? (
              <ScanSkeletonBlock lines={5} />
            ) : (
              <ScoreBarChart breakdown={reputation?.breakdown ?? []} />
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.24 }}>
            <div className="label" style={{ marginBottom: 16 }}>RECENT ACTIVITY</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {sbtsLoading ? (
                <ScanSkeletonBlock lines={4} />
              ) : (
                (sbts ?? []).slice(0, 5).map((token) => (
                  <div
                    key={token.token_id}
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>
                      {relativeTime(token.issued_at)}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
                      {token.issuer_name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.1em" }}>
                      +{token.weight_points} PTS
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Passport CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.24 }}>
            <div style={{ border: "1px solid var(--border)", padding: 20 }}>
              <div className="label" style={{ marginBottom: 12 }}>REPUTATION PASSPORT</div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
                Mint your on-chain reputation passport to make your credentials portable.
              </p>
              <Link href="/passport">
                <button id="dashboard-mint-passport" className="btn" style={{ width: "100%", justifyContent: "center", fontSize: 10 }}>
                  VIEW PASSPORT →
                </button>
              </Link>
            </div>
          </motion.div>
        </aside>
      </div>
    </>
  );
}
