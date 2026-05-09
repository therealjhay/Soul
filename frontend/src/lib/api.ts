import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

export interface SBTToken {
  token_id: number
  holder: string
  issuer: string
  issuer_name: string
  context: string
  category: 'DEV' | 'GOVERNANCE' | 'SOCIAL' | 'DEFI' | 'OTHER'
  metadata_uri: string
  expires_at: string | null
  revoked: boolean
  issued_at: string
  weight_points: number
  description?: string
}

export interface WalletReputation {
  wallet: string
  score: number
  tier: 'NEWCOMER' | 'BUILDER' | 'VERIFIED DEV' | 'GOVERNANCE VETERAN' | 'LEGEND'
  breakdown: { category: string; score: number; percentage: number }[]
  last_updated: string
}

export interface Issuer {
  id: string
  name: string
  type: 'DAO' | 'PROTOCOL' | 'HACKATHON' | 'SOCIAL' | 'DEFI'
  sbts_issued: number
  weight: number
  status: 'VERIFIED' | 'PENDING' | 'REVOKED'
  verified: boolean
  description?: string
  sbt_types?: string[]
  integration_url?: string
}

export interface SBTEvent {
  id: string
  event_type: 'SBT_ISSUED' | 'SBT_REVOKED' | 'PASSPORT_MINTED'
  wallet: string
  issuer_name: string
  sbt_type: string
  timestamp: string
}

export interface ProtocolStats {
  total_wallets: number
  sbts_issued: number
  issuers_registered: number
}

export interface Passport {
  wallet: string
  exists: boolean
  score: number
  tier: string
  issued_at: string
  last_updated: string
  sbt_count: number
  version: string
}

export const emptyReputation = (wallet: string): WalletReputation => ({
  wallet,
  score: 0,
  tier: 'NEWCOMER',
  breakdown: [
    { category: 'DEV', score: 0, percentage: 0 },
    { category: 'GOVERNANCE', score: 0, percentage: 0 },
    { category: 'DEFI', score: 0, percentage: 0 },
    { category: 'SOCIAL', score: 0, percentage: 0 },
    { category: 'OTHER', score: 0, percentage: 0 },
  ],
  last_updated: new Date(0).toISOString(),
})

export const emptyPassport = (wallet: string): Passport => ({
  wallet,
  exists: false,
  score: 0,
  tier: 'NEWCOMER',
  issued_at: new Date(0).toISOString(),
  last_updated: new Date(0).toISOString(),
  sbt_count: 0,
  version: '0.1.0-devnet',
})

export const getWalletSBTs = (wallet: string) =>
  api.get<SBTToken[]>(`/sbts/${wallet}`).then(r => r.data)

export const getWalletReputation = (wallet: string) =>
  api.get<WalletReputation>(`/reputation/wallet/${wallet}`).then(r => r.data)

export const getIssuers = () =>
  api.get<Issuer[]>('/issuers').then(r => r.data)

export const getLiveEvents = () =>
  api.get<SBTEvent[]>('/events').then(r => r.data)

export const getProtocolStats = () =>
  api.get<ProtocolStats>('/stats').then(r => r.data)

export const getPassport = (wallet: string) =>
  api.get<Passport>(`/passport/${wallet}`).then(r => r.data)
