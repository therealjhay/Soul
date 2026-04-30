# 🧠 MonadRPG — Soulbound Reputational Graph Protocol

> A production-grade, privacy-preserving reputation system built on [Monad](https://monad.xyz) — where identity becomes meaningful, reputation becomes portable, and trust becomes programmable.

---

## Overview

The **Reputational Graph Protocol (RGP)** is a fully modular, on-chain-anchored reputation system that enables:

- **Non-transferable identity credentials** via Soulbound Tokens (ERC-721)
- **Dynamic trust graph** backed by directed, weighted attestations
- **Context-aware reputation scoring** (DeFi, DAO, Social, Hiring, …)
- **Privacy-preserving proofs** using Zero-Knowledge Proofs (Circom/zk-SNARKs)
- **Sybil resistance** through economic friction, graph analysis, and credential gating

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Monad (EVM)                               │
│  SoulboundIdentity │ SoulboundToken │ AttestationRegistry   │
│  ReputationAnchor                                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ Events
┌──────────────────────────▼──────────────────────────────────┐
│                    Indexer (TypeScript)                      │
│  IdentityListener │ SBTListener │ AttestationListener       │
│  PostgreSQL ←→ Redis                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ Graph data
┌──────────────────────────▼──────────────────────────────────┐
│              Graph Engine (Rust)                             │
│  Directed weighted graph │ PageRank │ Time-decay             │
│  Sybil detection │ Scoring engine                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ Scores
┌──────────────────────────▼──────────────────────────────────┐
│                 Backend API (NestJS)                         │
│  /reputation │ /identity │ /attestation │ /graph │ /zk      │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST
┌──────────────────────────▼──────────────────────────────────┐
│               Frontend (Next.js)                             │
│  Dashboard │ Graph explorer │ Attestation manager           │
└─────────────────────────────────────────────────────────────┘
```

---

## Modules

| Module | Technology | Description |
|--------|-----------|-------------|
| [`contracts/`](./contracts/) | Solidity + Hardhat | On-chain identity, SBT, attestation, anchor |
| [`graph-engine/`](./graph-engine/) | Rust + Axum | Directed graph, PageRank, Sybil detection |
| [`indexer/`](./indexer/) | TypeScript + ethers.js | Real-time event indexer → PostgreSQL + Redis |
| [`api/`](./api/) | NestJS | REST API for reputation, graph, ZK proofs |
| [`zk/`](./zk/) | Circom + snarkjs | ZK circuits for threshold & membership proofs |
| [`frontend/`](./frontend/) | Next.js + Tailwind | Consumer-facing dashboard |
| [`infra/`](./infra/) | Prometheus + Grafana | Monitoring & metrics |

---

## Smart Contracts

### `SoulboundIdentity`
- Wallet-based identity registration
- Multi-wallet linking
- Time-delayed recovery mechanism
- On/off switch per identity

### `SoulboundToken`
- ERC-721 with **transfer disabled** (`soulbound`)
- Issuer-controlled minting & revocation
- Optional expiration
- Context-tagged credentials (defi, dao, social, hiring)

### `AttestationRegistry`
- Directed attestations (edges in the trust graph)
- Weight range 1–100
- Rate limiting (configurable per-day cap)
- Economic friction via attestation fee
- Full revocation support

### `ReputationAnchor`
- Periodic Merkle root anchoring of off-chain scores
- Individual score commitment (non-Merkle fallback)
- On-chain Merkle proof verification
- Epoch-linked for audit trail

---

## Graph Engine

The Rust graph engine implements:

- **Weighted PageRank** with configurable damping (default 0.85)
- **Time-decay** — exponential decay with configurable half-life (default 180 days)
- **SBT multipliers** — valid credentials boost score
- **Sybil detection** — clustering coefficient analysis + unique attestor threshold
- **Context partitioning** — independent scores per domain

---

## ZK Proof Module

Two Circom circuits (zk-SNARK, Groth16):

### `ReputationThreshold.circom`
Proves `score >= threshold` without revealing the actual score.

Inputs:
- **Public**: `threshold`, `identityCommitment`, `merkleRoot`
- **Private**: `score`, `identityId`, `secret`, Merkle path

### `MembershipProof.circom`
Proves group membership without revealing identity.

Inputs:
- **Public**: `groupRoot`, `nullifierHash`
- **Private**: `identityId`, `secret`, Merkle path

---

## Scoring Model

| Input | Effect |
|-------|--------|
| Incoming attestation weight | Direct PageRank influence |
| Edge recency (time-decay) | Older edges contribute less |
| SBT count | Score multiplier |
| Clustering coefficient | Sybil penalty if too high |
| Unique attestor count | Sybil penalty if too few |

**Output per identity per context:**
- Raw score (PageRank × multipliers)
- Normalized score [0–1000]
- Rank percentile [0–100]
- Sybil flag

---

## Quick Start

### Prerequisites
- Node.js 20+
- Rust 1.76+
- Docker + Docker Compose
- (Optional) Circom 2.x for ZK circuit compilation

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env with your RPC URL, contract addresses, etc.
```

### 2. Start infrastructure

```bash
docker-compose up -d postgres redis
```

### 3. Deploy contracts

```bash
cd contracts
npm install
npm run compile
npm run deploy:local   # local Hardhat node
# or
npm run deploy:monad   # Monad testnet
```

### 4. Run the indexer

```bash
cd indexer
npm install
npm run dev
```

### 5. Run the graph engine

```bash
cd graph-engine
cargo run
# Listens on http://localhost:8081
```

### 6. Run the API

```bash
cd api
npm install
npm run start:dev
# Docs at http://localhost:3000/docs
```

### 7. Run the frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3001
```

### Full stack (Docker)

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| API + Swagger | http://localhost:3000/docs |
| Graph Engine | http://localhost:8081 |
| Grafana | http://localhost:3002 |
| Prometheus | http://localhost:9090 |

---

## Testing

### Smart Contracts
```bash
cd contracts && npm test
```

### Graph Engine
```bash
cd graph-engine && cargo test
```

---

## API Reference

### Reputation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reputation?context=defi` | List all scores |
| GET | `/reputation/:id?context=defi` | Get scores for identity |
| GET | `/reputation/:id/rank?context=defi` | Get rank + percentile |

### Identity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/identity/:id` | Get identity |
| GET | `/identity/wallet/:address` | Get identity by wallet |
| GET | `/identity/:id/sbts` | List SBTs |
| GET | `/identity/:id/attestations/outgoing` | Outgoing attestations |
| GET | `/identity/:id/attestations/incoming` | Incoming attestations |

### Graph

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/graph/stats` | Node/edge counts |
| GET | `/graph/edges?context=defi` | Edge list |
| GET | `/graph/neighbours?identityId=1&depth=2` | Subgraph |

### ZK Proofs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/zk/verify/score` | Verify Merkle score proof |
| GET | `/zk/threshold/:id?context=defi&threshold=500` | Threshold check |

---

## Deployment Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Ready | Core contracts + Indexer + Basic graph |
| 2 | ✅ Ready | Advanced scoring + Sybil resistance |
| 3 | ✅ Ready | ZK circuits + Proof verification endpoints |
| 4 | ✅ Ready | Consumer dashboard + API integrations |
| 5 | 🔜 Planned | Decentralized prover network + governance |

---

## Security

- Smart contracts use OpenZeppelin's audited implementations
- Rate limiting on attestations (on-chain + API level)
- All SBTs are non-transferable at the EVM level
- ZK proofs ensure privacy for sensitive reputation checks
- API uses Helmet, CORS controls, and request throttling
- Recovery mechanism has a 2-day time-lock

---

## License

MIT