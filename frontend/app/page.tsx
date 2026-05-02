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
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#130d2a] to-[#0f0f1a] text-white">
      {/* Header */}
      <header className="border-b border-purple-900/30 backdrop-blur-sm sticky top-0 z-10 bg-black/30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold">
              RGP
            </div>
            <span className="font-semibold text-lg">Reputational Graph Protocol</span>
          </div>

          <div className="flex items-center gap-4">
            {stats && (
              <div className="hidden sm:flex gap-4 text-sm text-gray-400">
                <span>{stats.nodeCount.toLocaleString()} identities</span>
                <span>{stats.edgeCount.toLocaleString()} attestations</span>
              </div>
            )}
            {address ? (
              <div className="flex items-center gap-2">
                {walletLabel && (
                  <span className="text-xs text-purple-300 bg-purple-900/20 px-2 py-1 rounded">
                    {walletLabel}
                  </span>
                )}
                <span className="text-sm text-gray-300 bg-gray-800 px-3 py-1.5 rounded-lg">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isConnecting}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isConnecting ? "Connecting…" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-900/20 border border-red-900/30 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {!address ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-2xl bg-purple-900/30 border border-purple-600/30 flex items-center justify-center text-4xl mb-6">
              🧠
            </div>
              <h1 className="text-3xl font-bold mb-3">Soulbound Reputation Graph</h1>
              <p className="text-gray-400 max-w-md mb-8">
                Connect your wallet to view your on-chain reputation, manage attestations,
                and explore the trust graph on Solana.
              </p>
            <button
              onClick={connect}
              disabled={isConnecting}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          </div>
        ) : (
          <>
            {/* Identity info */}
            {identity && (
              <div className="mb-6 p-4 border border-purple-900/30 rounded-xl bg-purple-900/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-sm font-bold">
                    #{identity.identity_id}
                  </div>
                  <div>
                    <div className="font-medium">Identity #{identity.identity_id}</div>
                    <div className="text-xs text-gray-400 font-mono">{address}</div>
                  </div>
                  <div className="ml-auto">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        identity.active
                          ? "bg-green-900/20 text-green-400"
                          : "bg-red-900/20 text-red-400"
                      }`}
                    >
                      {identity.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!identity && (
                <div className="mb-6 p-4 border border-yellow-900/30 rounded-xl bg-yellow-900/10 text-sm text-yellow-300">
                 No on-chain identity registered for this wallet. Register to start building reputation.
                </div>
              )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-900/50 p-1 rounded-lg w-fit">
              {(["dashboard", "graph", "attest"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                    activeTab === tab
                      ? "bg-purple-700 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "dashboard" && identity && (
              <ReputationDashboard identityId={identity.identity_id} />
            )}

            {activeTab === "graph" && (
              <div className="text-center py-16 text-gray-500">
                Graph visualisation — connect to the graph engine API to view the trust graph.
              </div>
            )}

            {activeTab === "attest" && (
              <div className="text-center py-16 text-gray-500">
                Attestation form — connect wallet and identity to issue attestations on-chain.
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-900/20 mt-16 py-8 text-center text-sm text-gray-600">
        Soulbound Reputational Graph Protocol — powered by Solana
      </footer>
    </div>
  );
}
