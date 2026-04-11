import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReputationScore {
  identity_id: number;
  context: string;
  raw_score: number;
  normalized_score: number;
  percentile: number;
  is_suspected_sybil: boolean;
  computed_at: string;
}

export interface Identity {
  identity_id: number;
  primary_wallet: string;
  metadata_uri: string;
  active: boolean;
  created_at: string;
}

export interface SBTToken {
  token_id: number;
  holder: string;
  issuer: string;
  context: string;
  metadata_uri: string;
  expires_at: string | null;
  revoked: boolean;
  issued_at: string;
}

export interface Attestation {
  attestation_id: number;
  from_identity_id: number;
  to_identity_id: number;
  weight: number;
  context: string;
  metadata_uri: string;
  revoked: boolean;
  created_at: string;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  contexts: string[];
}

export interface GraphEdge {
  from: number;
  to: number;
  weight: number;
  context: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const getReputationScores = (context?: string, limit = 50, offset = 0) =>
  api.get<ReputationScore[]>("/reputation", { params: { context, limit, offset } }).then((r) => r.data);

export const getReputationScore = (identityId: number, context?: string) =>
  api.get<ReputationScore | ReputationScore[]>(`/reputation/${identityId}`, { params: { context } }).then((r) => r.data);

export const getIdentity = (id: number) =>
  api.get<Identity>(`/identity/${id}`).then((r) => r.data);

export const getIdentityByWallet = (address: string) =>
  api.get<Identity>(`/identity/wallet/${address}`).then((r) => r.data);

export const getIdentitySBTs = (id: number) =>
  api.get<SBTToken[]>(`/identity/${id}/sbts`).then((r) => r.data);

export const getOutgoingAttestations = (id: number) =>
  api.get<Attestation[]>(`/identity/${id}/attestations/outgoing`).then((r) => r.data);

export const getIncomingAttestations = (id: number) =>
  api.get<Attestation[]>(`/identity/${id}/attestations/incoming`).then((r) => r.data);

export const getGraphStats = () =>
  api.get<GraphStats>("/graph/stats").then((r) => r.data);

export const getGraphEdges = (context?: string, limit = 500) =>
  api.get<GraphEdge[]>("/graph/edges", { params: { context, limit } }).then((r) => r.data);

export const getGraphNeighbours = (identityId: number, context?: string, depth = 1) =>
  api.get<{ nodes: number[]; edges: GraphEdge[] }>("/graph/neighbours", {
    params: { identityId, context, depth },
  }).then((r) => r.data);

export const checkThreshold = (identityId: number, context: string, threshold: number) =>
  api.get(`/zk/threshold/${identityId}`, { params: { context, threshold } }).then((r) => r.data);
