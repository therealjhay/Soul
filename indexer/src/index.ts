import { ethers } from "ethers";
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
  RPC_URL = "http://localhost:8545",
  DATABASE_URL = "postgresql://rgp:rgp@localhost:5432/rgp",
  REDIS_URL = "redis://localhost:6379",
  IDENTITY_CONTRACT = "",
  SBT_CONTRACT = "",
  ATTESTATION_CONTRACT = "",
  START_BLOCK = "0",
  CONFIRMATION_BLOCKS = "2",
} = process.env;

async function main() {
  logger.info("Starting RGP Indexer");

  // Initialise provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  logger.info({ chainId: network.chainId.toString() }, "Connected to chain");

  // Initialise DB
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = new DatabaseManager(pool);
  await db.migrate();

  // Initialise Redis
  const redis = new Redis(REDIS_URL);
  redis.on("error", (err) => logger.error({ err }, "Redis error"));
  logger.info("Redis connected");

  const startBlock = parseInt(START_BLOCK, 10);
  const confirmations = parseInt(CONFIRMATION_BLOCKS, 10);

  // Start listeners
  const listeners = [
    new IdentityListener(provider, IDENTITY_CONTRACT, db, redis, startBlock, confirmations),
    new SBTListener(provider, SBT_CONTRACT, db, redis, startBlock, confirmations),
    new AttestationListener(provider, ATTESTATION_CONTRACT, db, redis, startBlock, confirmations),
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
  logger.error({ err }, "Indexer startup failed");
  process.exit(1);
});
