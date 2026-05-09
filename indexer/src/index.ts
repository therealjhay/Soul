import { Commitment, Connection } from "@solana/web3.js";
import { Pool } from "pg";
import Redis from "ioredis";
import * as dotenv from "dotenv";
import { logger } from "./logger";
import { IdentityListener } from "./listeners/IdentityListener";
import { SBTListener } from "./listeners/SBTListener";
import { AttestationListener } from "./listeners/AttestationListener";
import { DatabaseManager } from "./db/DatabaseManager";

dotenv.config();

const {
  SOLANA_RPC_URL,
  DATABASE_URL,
  REDIS_URL,
  IDENTITY_PROGRAM_ID,
  SBT_PROGRAM_ID,
  ATTESTATION_PROGRAM_ID,
  RGP_PROGRAM_ID,
  START_SLOT = "0",
  COMMITMENT = "confirmed",
} = process.env;

if (!SOLANA_RPC_URL) throw new Error("SOLANA_RPC_URL is required");
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!REDIS_URL) throw new Error("REDIS_URL is required");
if (!IDENTITY_PROGRAM_ID) throw new Error("IDENTITY_PROGRAM_ID is required");
if (!SBT_PROGRAM_ID) throw new Error("SBT_PROGRAM_ID is required");
if (!ATTESTATION_PROGRAM_ID) throw new Error("ATTESTATION_PROGRAM_ID is required");
if (!RGP_PROGRAM_ID) throw new Error("RGP_PROGRAM_ID is required");

const solanaRpcUrl = SOLANA_RPC_URL;
const databaseUrl = DATABASE_URL;
const redisUrl = REDIS_URL;
const identityProgramId = IDENTITY_PROGRAM_ID;
const sbtProgramId = SBT_PROGRAM_ID;
const attestationProgramId = ATTESTATION_PROGRAM_ID;

async function main() {
  logger.info("Starting RGP Indexer");

  const commitment = COMMITMENT as Commitment;
  const connection = new Connection(solanaRpcUrl, commitment);
  const version = await connection.getVersion();
  logger.info("Connected to Solana RPC", { rpc: solanaRpcUrl, solanaCore: version["solana-core"] });

  // Initialise DB
  const pool = new Pool({ connectionString: databaseUrl });
  const db = new DatabaseManager(pool);
  await db.migrate();

  // Initialise Redis
  const redis = new Redis(redisUrl);
  redis.on("error", (err) => logger.error("Redis error", { err }));
  logger.info("Redis connected");

  const startSlot = parseInt(START_SLOT, 10);

  // Start listeners
  const listeners = [
    new IdentityListener(connection, identityProgramId, db, redis, startSlot),
    new SBTListener(connection, sbtProgramId, db, redis, startSlot),
    new AttestationListener(connection, attestationProgramId, db, redis, startSlot),
  ];

  for (const listener of listeners) {
    await listener.start();
  }

  logger.info("Indexer fully started — listening for events");

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, shutting down");
    for (const l of listeners) await l.stop();
    await pool.end();
    redis.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error("Indexer startup failed", { err });
  process.exit(1);
});
