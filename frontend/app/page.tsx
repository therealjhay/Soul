"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "../hooks/useWallet";
import { getIdentityByWallet, getGraphStats } from "../lib/api";
import { ReputationDashboard } from "../components/ReputationDashboard";

export default function Home() {
  const { address, walletLabel, isConnecting, error, connect, disconnect } = useWallet();
  const [activeTab, setActiveTab] = useState<"dashboard" | "graph" | "attest">("dashboard");

  const { data: identity } = useQuery({
    queryKey: ["identity", "wallet", address],
    queryFn: () => getIdentityByWallet(address!),
    enabled: !!address,
    retry: false,
  });

  const { data: stats } = useQuery({
    queryKey: ["graph", "stats"],
    queryFn: getGraphStats,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}>
      <header
        className="sticky top-0 z-10 border-b"
        style={{ borderColor: "var(--line)", backgroundColor: "color-mix(in oklab, var(--bg) 88%, black)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
              style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}
            >
              S
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">SOUL</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Reputation Passport Protocol
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden gap-4 text-sm sm:flex" style={{ color: "var(--text-muted)" }}>
                <span>{stats.nodeCount.toLocaleString()} wallets</span>
                <span>{stats.edgeCount.toLocaleString()} attestations</span>
              </div>
            )}
            {address ? (
              <div className="flex items-center gap-2">
                {walletLabel && (
                  <span className="rounded px-2 py-1 text-xs" style={{ backgroundColor: "var(--surface-2)" }}>
                    {walletLabel}
                  </span>
                )}
                <span className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "var(--surface)" }}>
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="rounded px-2 py-2 text-sm underline-offset-2 hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}
              >
                {isConnecting ? "Connecting..." : "Connect wallet"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {error && (
          <div className="mb-6 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: "#b91c1c", color: "#fecaca" }}>
            {error}
          </div>
        )}

        {!address ? (
          <section className="grid gap-8 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
            <div>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                One wallet.
                <br />
                One <span style={{ color: "var(--accent)" }}>SOUL</span> score.
              </h1>
              <p className="mt-5 max-w-[70ch] text-base leading-7" style={{ color: "var(--text-muted)" }}>
                SOUL turns scattered Token-2022 soulbound credentials from DAOs, hackathons, and DeFi protocols into a
                portable Reputation Passport that other dApps can query in seconds.
              </p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="mt-8 rounded-xl px-6 py-3 text-base font-semibold disabled:opacity-60"
                style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}
              >
                {isConnecting ? "Connecting..." : "Connect wallet to mint passport"}
              </button>
            </div>
            <div className="rounded-2xl border p-6" style={{ borderColor: "var(--line)", backgroundColor: "var(--surface)" }}>
              <h2 className="text-xl font-semibold">Reputation Passport</h2>
              <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-muted)" }}>
                Issuer authority-weighted scoring, composable API checks, and a single portable NFT identity card for
                trust-based gating across the Solana ecosystem.
              </p>
              <ul className="mt-5 space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <li>DAO role and contribution proof</li>
                <li>Hackathon builder history</li>
                <li>Protocol-level trust and anti-sybil context</li>
              </ul>
            </div>
          </section>
        ) : (
          <>
            {identity ? (
              <section className="mb-6 rounded-xl border p-4" style={{ borderColor: "var(--line)", backgroundColor: "var(--surface)" }}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold" style={{ backgroundColor: "var(--accent-2)", color: "var(--bg)" }}>
                    #{identity.identity_id}
                  </div>
                  <div>
                    <p className="font-medium">SOUL Passport #{identity.identity_id}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {address}
                    </p>
                  </div>
                  <span
                    className="ml-auto rounded px-2 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: identity.active ? "#14532d" : "#7f1d1d",
                      color: "#ecfdf5",
                    }}
                  >
                    {identity.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </section>
            ) : (
              <section className="mb-6 rounded-xl border p-4 text-sm" style={{ borderColor: "#854d0e", color: "#fde68a" }}>
                No on-chain identity found for this wallet yet. Register your SOUL identity to start building a portable
                reputation passport.
              </section>
            )}

            <nav className="mb-6 flex w-fit flex-wrap gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--surface)" }} aria-label="SOUL views">
              {([
                ["dashboard", "Passport dashboard"],
                ["graph", "Trust graph"],
                ["attest", "Attestations"],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="rounded-md px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: activeTab === tab ? "var(--accent-2)" : "transparent",
                    color: activeTab === tab ? "var(--bg)" : "var(--text-muted)",
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>

            {activeTab === "dashboard" && identity && <ReputationDashboard identityId={identity.identity_id} />}
            {activeTab === "graph" && (
              <section className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}>
                Trust graph view will render connected issuers, contexts, and edge confidence from the graph engine API.
              </section>
            )}
            {activeTab === "attest" && (
              <section className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}>
                Attestation flow is ready for wallet-signed credential issuance and protocol-specific weighting rules.
              </section>
            )}
          </>
        )}
      </main>

      <footer className="mt-12 border-t py-8 text-center text-sm" style={{ borderColor: "var(--line)", color: "var(--text-muted)" }}>
        SOUL · Portable reputation passports for the Solana builder ecosystem
      </footer>
    </div>
  );
}
