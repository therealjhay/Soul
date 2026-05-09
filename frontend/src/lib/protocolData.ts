import { ProtocolStats } from './api'

export const RGP_PROTOCOL_VERSION = '0.1.0-devnet'
export const SOLANA_CLUSTER = import.meta.env.VITE_SOLANA_CLUSTER || 'devnet'
export const SOLANA_RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

export const EMPTY_PROTOCOL_STATS: ProtocolStats = {
  total_wallets: 0,
  sbts_issued: 0,
  issuers_registered: 0,
}

export function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.max(0, Math.floor(diff / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
