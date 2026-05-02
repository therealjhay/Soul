import { SBTToken, Issuer, SBTEvent, ProtocolStats, WalletReputation, Passport } from "./api";

export const MOCK_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

export const MOCK_REPUTATION: WalletReputation = {
  wallet: MOCK_WALLET,
  score: 847,
  tier: "VERIFIED DEV",
  breakdown: [
    { category: "DEV", score: 312, percentage: 37 },
    { category: "GOVERNANCE", score: 201, percentage: 24 },
    { category: "DEFI", score: 168, percentage: 20 },
    { category: "SOCIAL", score: 124, percentage: 15 },
    { category: "OTHER", score: 42, percentage: 4 },
  ],
  last_updated: new Date().toISOString(),
};

export const MOCK_SBTS: SBTToken[] = [
  {
    token_id: 1,
    holder: MOCK_WALLET,
    issuer: "solana:FGyzBRkSmWzFQxbVS2RCn1kvJfCdRb7gPqp5KJcb4v1d",
    issuer_name: "Superteam",
    context: "hackathon-winner",
    category: "DEV",
    metadata_uri: "https://arweave.net/mock1",
    expires_at: null,
    revoked: false,
    issued_at: "2024-11-15T00:00:00Z",
    weight_points: 120,
    description: "Colosseum Hackathon Winner",
  },
  {
    token_id: 2,
    holder: MOCK_WALLET,
    issuer: "solana:AHoiVT8kZuGW5EYYbhMVpGLCk7FZjcbXK3AqQzf2eP4t",
    issuer_name: "Realms DAO",
    context: "governance-voter",
    category: "GOVERNANCE",
    metadata_uri: "https://arweave.net/mock2",
    expires_at: null,
    revoked: false,
    issued_at: "2024-09-03T00:00:00Z",
    weight_points: 85,
    description: "Active DAO Governance Voter",
  },
  {
    token_id: 3,
    holder: MOCK_WALLET,
    issuer: "solana:4RiJQLkDGCzBGb4o4mGYmB7MyCZ9kPNnCJNaXxJSuUy7",
    issuer_name: "Marinade Finance",
    context: "staker-veteran",
    category: "DEFI",
    metadata_uri: "https://arweave.net/mock3",
    expires_at: null,
    revoked: false,
    issued_at: "2024-06-21T00:00:00Z",
    weight_points: 72,
    description: "Long-term Liquid Staker",
  },
  {
    token_id: 4,
    holder: MOCK_WALLET,
    issuer: "solana:3xLLNHNJmtBkFk4VbkXgumAXnMKBagBkSTARkHgW7zBP",
    issuer_name: "Dialect",
    context: "early-adopter",
    category: "SOCIAL",
    metadata_uri: "https://arweave.net/mock4",
    expires_at: null,
    revoked: false,
    issued_at: "2024-03-12T00:00:00Z",
    weight_points: 48,
    description: "Early Adopter — Dialect Messaging",
  },
  {
    token_id: 5,
    holder: MOCK_WALLET,
    issuer: "solana:5M2nX8VVY3h9dBTqECRGhFCZXEsTcFQWuJhCWxiLnSHn",
    issuer_name: "Solana Foundation",
    context: "developer-certified",
    category: "DEV",
    metadata_uri: "https://arweave.net/mock5",
    expires_at: null,
    revoked: false,
    issued_at: "2024-01-08T00:00:00Z",
    weight_points: 200,
    description: "Certified Solana Developer",
  },
  {
    token_id: 6,
    holder: MOCK_WALLET,
    issuer: "solana:9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7fKc5hPYYJ7g",
    issuer_name: "Helium Network",
    context: "hotspot-deployer",
    category: "DEFI",
    metadata_uri: "https://arweave.net/mock6",
    expires_at: null,
    revoked: false,
    issued_at: "2024-02-17T00:00:00Z",
    weight_points: 56,
    description: "Helium Hotspot Deployer",
  },
];

export const MOCK_ISSUERS: Issuer[] = [
  {
    id: "superteam",
    name: "Superteam",
    type: "DAO",
    sbts_issued: 4821,
    weight: 95,
    status: "VERIFIED",
    verified: true,
    description: "Global DAO building the Solana ecosystem through talent and funding.",
    sbt_types: ["HACKATHON_WINNER", "MEMBER", "CONTRIBUTOR"],
    integration_url: "https://superteam.fun",
  },
  {
    id: "solana-foundation",
    name: "Solana Foundation",
    type: "DAO",
    sbts_issued: 12340,
    weight: 100,
    status: "VERIFIED",
    verified: true,
    description: "Official foundation supporting the Solana protocol.",
    sbt_types: ["DEVELOPER_CERTIFIED", "GRANT_RECIPIENT", "CORE_CONTRIBUTOR"],
    integration_url: "https://solana.org",
  },
  {
    id: "marinade",
    name: "Marinade Finance",
    type: "PROTOCOL",
    sbts_issued: 3201,
    weight: 72,
    status: "VERIFIED",
    verified: true,
    description: "Liquid staking protocol for Solana.",
    sbt_types: ["STAKER_VETERAN", "GOVERNANCE_VOTER", "EARLY_ADOPTER"],
    integration_url: "https://marinade.finance",
  },
  {
    id: "realms",
    name: "Realms DAO",
    type: "DAO",
    sbts_issued: 8914,
    weight: 88,
    status: "VERIFIED",
    verified: true,
    description: "On-chain governance infrastructure for Solana DAOs.",
    sbt_types: ["GOVERNANCE_VOTER", "COUNCIL_MEMBER", "PROPOSAL_AUTHOR"],
    integration_url: "https://realms.today",
  },
  {
    id: "dialect",
    name: "Dialect",
    type: "SOCIAL",
    sbts_issued: 1567,
    weight: 55,
    status: "VERIFIED",
    verified: true,
    description: "On-chain messaging and notifications for Solana.",
    sbt_types: ["EARLY_ADOPTER", "POWER_USER", "NOTIFICATION_SUBSCRIBER"],
    integration_url: "https://dialect.to",
  },
  {
    id: "helium",
    name: "Helium Network",
    type: "DEFI",
    sbts_issued: 2890,
    weight: 65,
    status: "VERIFIED",
    verified: true,
    description: "Decentralized wireless network built on Solana.",
    sbt_types: ["HOTSPOT_DEPLOYER", "VALIDATOR", "NETWORK_VOTER"],
    integration_url: "https://helium.com",
  },
  {
    id: "jito-labs",
    name: "Jito Labs",
    type: "PROTOCOL",
    sbts_issued: 0,
    weight: 0,
    status: "PENDING",
    verified: false,
    description: "MEV infrastructure and liquid staking on Solana.",
    sbt_types: [],
    integration_url: "",
  },
  {
    id: "drift-protocol",
    name: "Drift Protocol",
    type: "DEFI",
    sbts_issued: 0,
    weight: 0,
    status: "PENDING",
    verified: false,
    description: "Perpetuals and spot trading protocol on Solana.",
    sbt_types: [],
    integration_url: "",
  },
];

export const MOCK_EVENTS: SBTEvent[] = [
  {
    id: "ev1",
    event_type: "SBT_ISSUED",
    wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    issuer_name: "Superteam",
    sbt_type: "HACKATHON_WINNER",
    timestamp: new Date(Date.now() - 12000).toISOString(),
  },
  {
    id: "ev2",
    event_type: "PASSPORT_MINTED",
    wallet: "AHoiVT8kZuGW5EYYbhMVpGLCk7FZjcbXK3AqQzf2eP4t",
    issuer_name: "SOUL Protocol",
    sbt_type: "REPUTATION_PASSPORT",
    timestamp: new Date(Date.now() - 34000).toISOString(),
  },
  {
    id: "ev3",
    event_type: "SBT_ISSUED",
    wallet: "3xLLNHNJmtBkFk4VbkXgumAXnMKBagBkSTARkHgW7zBP",
    issuer_name: "Realms DAO",
    sbt_type: "GOVERNANCE_VOTER",
    timestamp: new Date(Date.now() - 67000).toISOString(),
  },
  {
    id: "ev4",
    event_type: "SBT_ISSUED",
    wallet: "4RiJQLkDGCzBGb4o4mGYmB7MyCZ9kPNnCJNaXxJSuUy7",
    issuer_name: "Marinade Finance",
    sbt_type: "STAKER_VETERAN",
    timestamp: new Date(Date.now() - 103000).toISOString(),
  },
  {
    id: "ev5",
    event_type: "SBT_ISSUED",
    wallet: "9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7fKc5hPYYJ7g",
    issuer_name: "Solana Foundation",
    sbt_type: "DEVELOPER_CERTIFIED",
    timestamp: new Date(Date.now() - 180000).toISOString(),
  },
];

export const MOCK_STATS: ProtocolStats = {
  total_wallets: 48291,
  sbts_issued: 203847,
  issuers_registered: 34,
};

export const MOCK_PASSPORT: Passport = {
  wallet: MOCK_WALLET,
  exists: true,
  score: 847,
  tier: "VERIFIED DEV",
  issued_at: "2024-01-08T00:00:00Z",
  last_updated: new Date().toISOString(),
  sbt_count: 6,
  version: "v1.2",
};

/** Truncates a wallet address: first 6 + last 4 */
export function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Format a timestamp to relative time (e.g. "2m ago") */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
