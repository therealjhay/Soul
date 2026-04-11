"use client";

import { useQuery } from "@tanstack/react-query";
import { getReputationScore, getIdentitySBTs, getOutgoingAttestations, getIncomingAttestations } from "../lib/api";

interface ReputationDashboardProps {
  identityId: number;
}

const CONTEXTS = ["defi", "dao", "social", "hiring"];

function ScoreBadge({ score, context }: { score: number; context: string }) {
  const tier = score >= 800 ? "Platinum" : score >= 600 ? "Gold" : score >= 400 ? "Silver" : score >= 200 ? "Bronze" : "Unranked";
  const colors: Record<string, string> = {
    Platinum: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    Gold: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    Silver: "bg-gray-400/20 text-gray-300 border-gray-400/30",
    Bronze: "bg-orange-700/20 text-orange-300 border-orange-700/30",
    Unranked: "bg-gray-700/20 text-gray-400 border-gray-700/30",
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[tier]}`}>
      <div className="text-xs uppercase tracking-wider mb-1 opacity-70">{context}</div>
      <div className="text-3xl font-bold">{Math.round(score)}</div>
      <div className="text-sm mt-1">{tier}</div>
      <div className="mt-2 h-1.5 bg-black/20 rounded-full">
        <div
          className="h-1.5 rounded-full bg-current opacity-60"
          style={{ width: `${(score / 1000) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function ReputationDashboard({ identityId }: ReputationDashboardProps) {
  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ["scores", identityId],
    queryFn: () => getReputationScore(identityId),
    enabled: !!identityId,
  });

  const { data: sbts } = useQuery({
    queryKey: ["sbts", identityId],
    queryFn: () => getIdentitySBTs(identityId),
    enabled: !!identityId,
  });

  const { data: outgoing } = useQuery({
    queryKey: ["outgoing", identityId],
    queryFn: () => getOutgoingAttestations(identityId),
    enabled: !!identityId,
  });

  const { data: incoming } = useQuery({
    queryKey: ["incoming", identityId],
    queryFn: () => getIncomingAttestations(identityId),
    enabled: !!identityId,
  });

  const scoreArray = Array.isArray(scores) ? scores : scores ? [scores] : [];

  return (
    <div className="space-y-6">
      {/* Reputation Scores */}
      <section>
        <h2 className="text-lg font-semibold text-purple-300 mb-3">Reputation Scores</h2>
        {scoresLoading ? (
          <div className="text-gray-500 text-sm">Loading scores…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CONTEXTS.map((ctx) => {
              const s = scoreArray.find((x) => x.context === ctx);
              return (
                <ScoreBadge
                  key={ctx}
                  context={ctx}
                  score={s ? s.normalized_score : 0}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Soulbound Tokens */}
      <section>
        <h2 className="text-lg font-semibold text-purple-300 mb-3">
          Soulbound Tokens ({sbts?.length ?? 0})
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {sbts?.map((sbt) => (
            <div
              key={sbt.token_id}
              className="border border-purple-900/40 rounded-lg p-3 bg-purple-900/10"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
                  {sbt.context}
                </span>
                {sbt.revoked && (
                  <span className="text-xs text-red-400 bg-red-900/20 px-2 py-0.5 rounded">
                    Revoked
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 truncate">
                Issuer: {sbt.issuer.slice(0, 10)}…
              </div>
            </div>
          ))}
          {(!sbts || sbts.length === 0) && (
            <div className="text-gray-500 text-sm">No SBTs yet.</div>
          )}
        </div>
      </section>

      {/* Attestations */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-purple-300 mb-3">
              Given Attestations ({outgoing?.length ?? 0})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {outgoing?.map((a) => (
                <div key={a.attestation_id} className="border border-gray-800 rounded p-2 text-sm">
                  <span className="text-gray-400">→ Identity {a.to_identity_id}</span>
                  <span className="ml-2 text-purple-400">w:{a.weight}</span>
                  <span className="ml-2 text-xs text-gray-600">{a.context}</span>
                </div>
              ))}
              {(!outgoing || outgoing.length === 0) && (
                <div className="text-gray-500 text-sm">No outgoing attestations.</div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-purple-300 mb-3">
              Received Attestations ({incoming?.length ?? 0})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incoming?.map((a) => (
                <div key={a.attestation_id} className="border border-gray-800 rounded p-2 text-sm">
                  <span className="text-gray-400">← Identity {a.from_identity_id}</span>
                  <span className="ml-2 text-green-400">w:{a.weight}</span>
                  <span className="ml-2 text-xs text-gray-600">{a.context}</span>
                </div>
              ))}
              {(!incoming || incoming.length === 0) && (
                <div className="text-gray-500 text-sm">No incoming attestations.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
