import { Commitment, Connection, PublicKey } from "@solana/web3.js";
import Redis from "ioredis";
import { logger } from "../logger";
import { DatabaseManager } from "../db/DatabaseManager";

export class AttestationListener {
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
      logger.warn("AttestationListener: no Solana program ID configured, skipping");
      return;
    }
    this.running = true;
    await this.catchUp();
    this.subscribeToLiveEvents();
    logger.info("AttestationListener started", { programId: this.programId });
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
    logger.info("Attestation listener checkpoint synced", { fromSlot, toSlot });
  }

  private subscribeToLiveEvents(): void {
    const program = new PublicKey(this.programId);
    this.subscriptionId = this.connection.onLogs(
      program,
      async ({ logs, signature }) => {
        for (const raw of logs) {
          const line = raw.includes("RGP:") ? raw.slice(raw.indexOf("RGP:")) : "";
          if (line.startsWith("RGP:ATTESTATION_CREATED:")) {
            await this.handleCreated(line, signature);
          } else if (line.startsWith("RGP:ATTESTATION_REVOKED:")) {
            await this.handleRevoked(line);
          } else if (line.startsWith("RGP:ATTESTATION_UPDATED:")) {
            await this.handleUpdated(line);
          }
        }
      },
      this.commitment
    );
  }

  private async handleCreated(line: string, txHash: string): Promise<void> {
    try {
      const [, , attestationId, fromId, toId, weight, context = "general"] = line.split(":");
      const slot = await this.connection.getSlot(this.commitment);
      const ts = new Date();
      await this.db.upsertAttestation({
        attestationId: BigInt(attestationId),
        fromIdentityId: BigInt(fromId),
        toIdentityId: BigInt(toId),
        weight: Number(weight),
        context,
        metadataUri: "",
        revoked: false,
        createdAt: ts,
        updatedAt: ts,
        blockNumber: slot,
        txHash,
      });
      await this.invalidateScoreCache(fromId);
      await this.invalidateScoreCache(toId);
      logger.debug("Attestation created", { attestationId });
    } catch (err) {
      logger.error("Error handling AttestationCreated", { err });
    }
  }

  private async handleRevoked(line: string): Promise<void> {
    try {
      const [, , attestationId, , toId] = line.split(":");
      await this.db.db.query(
        "UPDATE attestations SET revoked = TRUE, updated_at = NOW() WHERE attestation_id = $1",
        [attestationId]
      );
      await this.invalidateScoreCache(toId);
      logger.debug("Attestation revoked", { attestationId });
    } catch (err) {
      logger.error("Error handling AttestationRevoked", { err });
    }
  }

  private async handleUpdated(line: string): Promise<void> {
    try {
      const [, , attestationId, newWeight] = line.split(":");
      await this.db.db.query(
        "UPDATE attestations SET weight = $1, updated_at = $2 WHERE attestation_id = $3",
        [
          Number(newWeight),
          new Date().toISOString(),
          attestationId,
        ]
      );
    } catch (err) {
      logger.error("Error handling AttestationUpdated", { err });
    }
  }

  private async invalidateScoreCache(identityId: string): Promise<void> {
    const pattern = `score:${identityId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) await this.redis.del(...keys);
  }
}
