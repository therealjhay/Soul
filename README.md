# 🧠 SolanaRGP — Soulbound Reputational Graph Protocol

A modular, privacy-aware reputation system built for **Solana**.

## Architecture

```
Solana Program (Rust) -> Indexer (TypeScript + @solana/web3.js) -> PostgreSQL/Redis
                                                      |
                                             Graph Engine (Rust)
                                                      |
                                               API (NestJS)
                                                      |
                                             Frontend (Next.js)
```

## Modules

| Module | Technology | Purpose |
|---|---|---|
| `contracts/` | Rust + Solana Program | On-chain identity/credential/attestation instruction surface |
| `indexer/` | TypeScript + Solana web3 | Program log indexing into Postgres + Redis |
| `graph-engine/` | Rust | Reputation graph scoring, ranking, sybil heuristics |
| `api/` | NestJS | REST API for identity, attestations, reputation, zk endpoints |
| `frontend/` | Next.js | Wallet-connected dashboard |
| `zk/` | Circom | Privacy proofs |

## Solana Migration Notes

- EVM/Hardhat/Solidity stack has been removed from `contracts/`.
- Frontend wallet connection now targets Solana wallets (Phantom-compatible provider API).
- Indexer now connects to Solana RPC and subscribes to program logs.
- Environment and Docker wiring use Solana RPC and Program IDs.

## Quick Start

### Prerequisites
- Node.js 20+
- Rust 1.76+
- Docker + Docker Compose

### 1. Configure env

```bash
cp .env.example .env
```

Set:
- `SOLANA_RPC_URL`
- `IDENTITY_PROGRAM_ID`
- `SBT_PROGRAM_ID`
- `ATTESTATION_PROGRAM_ID`

### 2. Start infra

```bash
docker-compose up -d postgres redis
```

### 3. Build Solana program

```bash
cd contracts
cargo build --workspace
```

### 4. Run indexer

```bash
cd indexer
npm install
npm run dev
```

### 5. Run graph engine

```bash
cd graph-engine
cargo run
```

### 6. Run API

```bash
cd api
npm install
npm run start:dev
```

### 7. Run frontend

```bash
cd frontend
npm install
npm run dev
```

## Testing

```bash
cd contracts && cargo test --workspace
cd graph-engine && cargo test
```

## Deployment Readiness (No Deployment Yet)

- CI uses lockfile-based installs (`npm ci`) for deterministic builds.
- Docker image publish workflow is now **manual only** via `workflow_dispatch` (`.github/workflows/deploy.yml`).
- Solana program now includes protocol instructions and state models for identity, SBTs, and attestations.
- Build the app stack locally:

```bash
cd indexer && npm ci && npm run build
cd ../api && npm ci && npm run build
cd ../frontend && npm ci && npm run build
```

- Build containers when Docker is available:

```bash
docker compose build indexer api frontend graph-engine
```

- Build Solana deploy artifact:

```bash
cd contracts
cargo build --release -p rgp-solana-program
# Use Solana toolchain for BPF/SBF artifact when ready:
# cargo build-sbf
```

## License

MIT
