import { Commitment, Connection, PublicKey } from "@solana/web3.js";
import Redis from "ioredis";
import { logger } from "../logger";
import { DatabaseManager } from "../db/DatabaseManager";

export class SBTListener {
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
      logger.warn("SBTListener: no Solana program ID configured, skipping");
      return;
    }
    this.running = true;
    await this.catchUp();
    this.subscribeToLiveEvents();
    logger.info("SBTListener started", { programId: this.programId });
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
    logger.info("SBT listener checkpoint synced", { fromSlot, toSlot });
  }

  private subscribeToLiveEvents(): void {
    const program = new PublicKey(this.programId);
    this.subscriptionId = this.connection.onLogs(
      program,
      async ({ logs, signature }) => {
        for (const raw of logs) {
          const line = raw.includes("RGP:") ? raw.slice(raw.indexOf("RGP:")) : "";
          if (line.startsWith("RGP:SBT_MINTED:")) {
            await this.handleSBTMinted(line, signature);
          } else if (line.startsWith("RGP:SBT_REVOKED:")) {
            await this.handleSBTRevoked(line);
          }
        }
      },
      this.commitment
    );
  }

  private async handleSBTMinted(line: string, txHash: string): Promise<void> {
    try {
      const [, , tokenId, holder, context = "general"] = line.split(":");
      const slot = await this.connection.getSlot(this.commitment);

      await this.db.upsertSBT({
        tokenId: BigInt(tokenId),
        holder,
        issuer: holder,
        context,
        metadataUri: "",
        expiresAt: null,
        revoked: false,
        issuedAt: new Date(),
        blockNumber: slot,
        txHash,
      });
      await this.redis.del(`sbt:holder:${holder.toLowerCase()}`);
      logger.debug("SBT minted", { tokenId });
    } catch (err) {
      logger.error("Error handling SBTMinted", { err });
    }
  }

  private async handleSBTRevoked(line: string): Promise<void> {
    try {
      const [, , tokenId] = line.split(":");
      await this.db.db.query(
        "UPDATE sbt_tokens SET revoked = TRUE WHERE token_id = $1",
        [tokenId]
      );
      await this.redis.del(`sbt:${tokenId}`);
      logger.debug("SBT revoked", { tokenId });
    } catch (err) {
      logger.error("Error handling SBTRevoked", { err });
    }
  }
}
