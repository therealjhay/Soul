"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Nav } from "../components/Nav";
import { useCounter } from "../hooks/useCounter";
import { useWalletCtx } from "./WalletContext";
import { getLiveEvents, getProtocolStats, SBTEvent } from "../lib/api";
import { MOCK_EVENTS, MOCK_STATS, relativeTime } from "../lib/mockData";
import { useRouter } from "next/navigation";

// ─── Stagger animation ────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

// ─── Live Event Row ───────────────────────────────────────────────────────

function EventRow({ event }: { event: SBTEvent }) {
  const typeLabel: Record<string, string> = {
    SBT_ISSUED: "SBT ISSUED",
    SBT_REVOKED: "SBT REVOKED",
    PASSPORT_MINTED: "PASSPORT MINTED",
  };
  const typeColor: Record<string, string> = {
    SBT_ISSUED: "var(--accent)",
    SBT_REVOKED: "var(--destructive)",
    PASSPORT_MINTED: "var(--warning)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr auto",
        gap: 12,
        alignItems: "start",
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span style={{ fontSize: 10, color: "var(--text-muted)", paddingTop: 1 }}>
        {relativeTime(event.timestamp)}
      </span>
      <span>
        <span style={{ fontSize: 10, color: typeColor[event.event_type] || "var(--text-secondary)", letterSpacing: "0.1em" }}>
          {typeLabel[event.event_type] || event.event_type}
        </span>
        <br />
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
          {event.issuer_name} · {event.sbt_type}
        </span>
        <br />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {event.wallet.slice(0, 6)}…{event.wallet.slice(-4)}
        </span>
      </span>
    </motion.div>
  );
}

// ─── Stats Counter ────────────────────────────────────────────────────────

function StatCounter({ target, label }: { target: number; label: string }) {
  const { count, ref } = useCounter({ target });
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(24px, 3vw, 40px)",
          color: "var(--text-primary)",
          letterSpacing: "0.02em",
          lineHeight: 1,
        }}
      >
        {count.toLocaleString()}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const { connect, isConnecting, isConnected } = useWalletCtx();
  const [events, setEvents] = useState<SBTEvent[]>(MOCK_EVENTS);

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["protocol-stats"],
    queryFn: getProtocolStats,
    retry: false,
    initialData: MOCK_STATS,
  });

  // Live event feed — polls every 5s, appends without full re-render
  const { data: freshEvents } = useQuery({
    queryKey: ["live-events"],
    queryFn: getLiveEvents,
    retry: false,
    refetchInterval: 5000,
    initialData: MOCK_EVENTS,
  });

  useEffect(() => {
    if (!freshEvents) return;
    setEvents((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const newItems = freshEvents.filter((e) => !existingIds.has(e.id));
      if (!newItems.length) return prev;
      return [...newItems, ...prev].slice(0, 12);
    });
  }, [freshEvents]);

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (isConnected) router.push("/dashboard");
  }, [isConnected, router]);

  const handleConnect = async () => {
    await connect();
  };

  return (
    <>
      <Nav />

      {/* Full-viewport layout, no scroll on initial load */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "60fr 40fr",
          gridTemplateRows: "1fr auto",
          height: "100vh",
          paddingTop: 56, // nav height
          overflow: "hidden",
        }}
      >
        {/* ── Left Column: Headline + CTA ───────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 48px",
            borderRight: "1px solid var(--border)",
          }}
        >
          {/* Headline */}
          <div style={{ marginBottom: 32 }}>
            {["REPUTATION", "ON-CHAIN.", "PERMANENT."].map((word, i) => (
              <motion.h1
                key={word}
                custom={i}
                variants={stagger}
                initial="hidden"
                animate="visible"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-hero)",
                  lineHeight: 0.92,
                  color: "var(--text-primary)",
                  display: "block",
                  margin: 0,
                  letterSpacing: "0.02em",
                }}
              >
                {word === "ON-CHAIN." ? (
                  <>
                    ON-
                    <span style={{ color: "var(--accent)" }}>CHAIN.</span>
                  </>
                ) : (
                  word
                )}
              </motion.h1>
            ))}
          </div>

          {/* Descriptor */}
          <motion.p
            custom={3}
            variants={stagger}
            initial="hidden"
            animate="visible"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              color: "var(--text-muted)",
              lineHeight: 1.7,
              maxWidth: 440,
              marginBottom: 48,
            }}
          >
            Soulbound credentials from DAOs, hackathons, and DeFi protocols — aggregated into a single
            cryptographic passport. Your identity, permanent.
          </motion.p>

          {/* CTA */}
          <motion.div custom={4} variants={stagger} initial="hidden" animate="visible">
            <button
              id="landing-connect"
              onClick={handleConnect}
              disabled={isConnecting}
              className="btn"
              style={{
                fontSize: 14,
                padding: "16px 32px",
                borderColor: "var(--border-active)",
                color: "var(--text-primary)",
                width: "100%",
                justifyContent: "center",
                letterSpacing: "0.12em",
              }}
            >
              {isConnecting ? "CONNECTING…" : "CONNECT WALLET →"}
            </button>
          </motion.div>
        </div>

        {/* ── Right Column: Live Event Feed ─────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderLeft: "1px solid var(--border)",
          }}
        >
          {/* Terminal header */}
          <motion.div
            custom={1}
            variants={stagger}
            initial="hidden"
            animate="visible"
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                backgroundColor: "var(--accent)",
                animation: "pulse-dot 2s steps(1) infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
              }}
            >
              LIVE ACTIVITY — SOUL PROTOCOL
            </span>
          </motion.div>

          {/* Feed */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "0 24px",
              scrollbarWidth: "thin",
            }}
          >
            <AnimatePresence initial={false}>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Bottom Stats Bar (fixed, spans full width) ───────────── */}
        <motion.div
          custom={5}
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{
            gridColumn: "1 / -1",
            borderTop: "1px solid var(--border)",
            padding: "20px 48px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
          }}
        >
          <StatCounter target={stats?.total_wallets ?? 48291} label="TOTAL WALLETS INDEXED" />
          <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 40 }}>
            <StatCounter target={stats?.sbts_issued ?? 203847} label="SBTS ISSUED" />
          </div>
          <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 40 }}>
            <StatCounter target={stats?.issuers_registered ?? 34} label="ISSUERS REGISTERED" />
          </div>
        </motion.div>
      </main>
    </>
  );
}
