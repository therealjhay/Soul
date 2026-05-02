import { Commitment, Connection, PublicKey } from "@solana/web3.js";
import Redis from "ioredis";
import { logger } from "../logger";
import { DatabaseManager } from "../db/DatabaseManager";

export class IdentityListener {
  private running = false;
  private subscriptionId: number | null = null;
  private readonly commitment: Commitment = "confirmed";

  constructor(
    private readonly connection: Connection,
    private readonly programId: string,
    private readonly db: DatabaseManager,
    private readonly redis: Redis,
    private readonly startSlot: number
  ) {}

  async start(): Promise<void> {
    if (!this.programId) {
      logger.warn("IdentityListener: no Solana program ID configured, skipping");
      return;
    }
    this.running = true;
    await this.catchUp();
    this.subscribeToLiveEvents();
    logger.info("IdentityListener started", { programId: this.programId });
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.subscriptionId !== null) {
      await this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }
  }

  private async catchUp(): Promise<void> {
    const lastSlot = await this.db.getLastIndexedBlock(this.programId);
    const toSlot = await this.connection.getSlot(this.commitment);
    const fromSlot = Math.max(lastSlot + 1, this.startSlot);
    if (fromSlot > toSlot) return;
    await this.db.setLastIndexedBlock(this.programId, toSlot);
    logger.info("Identity listener checkpoint synced", { fromSlot, toSlot });
  }

  private subscribeToLiveEvents(): void {
    const program = new PublicKey(this.programId);
    this.subscriptionId = this.connection.onLogs(
      program,
      async ({ logs, signature }) => {
        for (const raw of logs) {
          const line = raw.includes("RGP:") ? raw.slice(raw.indexOf("RGP:")) : "";
          if (line.startsWith("RGP:IDENTITY_REGISTERED:")) {
            await this.handleIdentityRegistered(line, signature);
          } else if (line.startsWith("RGP:IDENTITY_DEACTIVATED:")) {
            await this.handleIdentityDeactivated(line);
          } else if (line.startsWith("RGP:IDENTITY_METADATA_UPDATED:")) {
            await this.handleMetadataUpdated(line);
          }
        }
      },
      this.commitment
    );
  }

  private async handleIdentityRegistered(line: string, txHash: string): Promise<void> {
    try {
      const [, , identityId, wallet, metadataUri = ""] = line.split(":");
      const slot = await this.connection.getSlot(this.commitment);
      const now = new Date();
      await this.db.upsertIdentity({
        identityId: BigInt(identityId),
        primaryWallet: wallet,
        metadataUri,
        active: true,
        createdAt: now,
        updatedAt: now,
        blockNumber: slot,
        txHash,
      });
      await this.redis.del(`identity:wallet:${wallet.toLowerCase()}`);
      logger.debug("Identity registered", { identityId });
    } catch (err) {
      logger.error("Error handling IdentityRegistered", { err });
    }
  }

  private async handleMetadataUpdated(line: string): Promise<void> {
    try {
      const [, , identityId, newMetadataUri = ""] = line.split(":");
      await this.db.db.query(
        "UPDATE identities SET metadata_uri = $1, updated_at = $2 WHERE identity_id = $3",
        [newMetadataUri, new Date().toISOString(), identityId]
      );
      await this.redis.del(`identity:${identityId}`);
    } catch (err) {
      logger.error("Error handling MetadataUpdated", { err });
    }
  }

  private async handleIdentityDeactivated(line: string): Promise<void> {
    try {
      const [, , identityId] = line.split(":");
      await this.db.db.query(
        "UPDATE identities SET active = FALSE WHERE identity_id = $1",
        [identityId]
      );
      await this.redis.del(`identity:${identityId}`);
    } catch (err) {
      logger.error("Error handling IdentityDeactivated", { err });
    }
  }
}
