# SolanaRGP: Soulbound Reputational Graph Protocol

SolanaRGP is a devnet-ready reputation protocol that turns identity registrations, soulbound credentials, and attestations emitted by the RGP Solana program into an indexed reputation passport.

## Architecture

```text
RGP Solana Program (Rust)
  -> Indexer (TypeScript + @solana/web3.js)
  -> PostgreSQL + Redis
  -> Graph Engine (Rust)
  -> API (NestJS)
  -> Frontend (Vite + React)
```

## Modules

| Module | Technology | Purpose |
|---|---|---|
| `contracts/` | Rust + Solana Program | RGP instruction processor for identities, SBT credentials, and attestations |
| `indexer/` | TypeScript + Solana web3.js | Subscribes to RGP program logs and writes indexed state to Postgres |
| `graph-engine/` | Rust | Reputation graph scoring, ranking, and sybil heuristics |
| `api/` | NestJS | REST API for indexed protocol stats, events, issuers, passports, graph, reputation, and zk endpoints |
| `frontend/` | Vite + React | Solana wallet-connected dashboard and passport UI |
| `zk/` | Circom | Membership and reputation-threshold proof circuits |

## Devnet Configuration

Copy the environment template:

```bash
cp .env.example .env
```

Before the first deploy, `RGP_PROGRAM_ID`, `IDENTITY_PROGRAM_ID`, `SBT_PROGRAM_ID`, `ATTESTATION_PROGRAM_ID`, and `VITE_RGP_PROGRAM_ID` should stay empty. After the RGP program is deployed to devnet, set all five values to the deployed program ID. The current indexer uses separate listeners for the identity, SBT, and attestation log families emitted by the same program.

Required local values:

```text
SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_CLUSTER=devnet
SOLANA_KEYPAIR_PATH=~/.config/solana/id.json
DATABASE_URL=postgresql://rgp:rgp@localhost:5432/rgp
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3001
VITE_API_URL=http://localhost:3000
```

## Local Runbook

Start Postgres and Redis:

```bash
docker compose up -d postgres redis
```

Build the Solana program:

```bash
cd contracts
cargo build --workspace
```

Build the SBF artifact when the Solana CLI toolchain is installed:

```bash
cd contracts
cargo build-sbf
```

Run the services:

```bash
cd indexer && npm ci && npm run dev
cd api && npm ci && npm run start:dev
cd graph-engine && cargo run
cd frontend && npm ci && npm run dev
```

Useful URLs:

```text
Frontend: http://localhost:5173
API: http://localhost:3000
API docs: http://localhost:3000/docs
Grafana: http://localhost:3002
Prometheus: http://localhost:9090
```

## Devnet Deploy Checklist

1. Install and configure the Solana CLI for devnet.
2. Fund the deploy keypair with devnet SOL.
3. Build the RGP SBF artifact from `contracts/`.
4. Deploy the program and capture the program ID.
5. Set `RGP_PROGRAM_ID`, `IDENTITY_PROGRAM_ID`, `SBT_PROGRAM_ID`, `ATTESTATION_PROGRAM_ID`, and `VITE_RGP_PROGRAM_ID` to that program ID.
6. Start Postgres, Redis, API, indexer, graph engine, and frontend.
7. Submit one identity registration and one SBT mint transaction.
8. Confirm `/stats`, `/events`, `/issuers`, `/sbts/:wallet`, `/reputation/wallet/:wallet`, and `/passport/:wallet` return indexed devnet data.

## Verification

```bash
cd contracts && cargo test --workspace
cd graph-engine && cargo test
cd api && npm run build
cd frontend && npm run build
cd indexer && npm run build
```

## License

MIT
