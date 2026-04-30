import { ethers } from "ethers";
import Redis from "ioredis";
import { logger } from "../logger";
import { DatabaseManager } from "../db/DatabaseManager";

const SBT_ABI = [
  "event SBTMinted(uint256 indexed tokenId, address indexed holder, address indexed issuer, string context, string metadataURI, uint256 expiresAt, uint256 timestamp)",
  "event SBTRevoked(uint256 indexed tokenId, address indexed holder, address indexed issuer, uint256 timestamp)",
];

export class SBTListener {
  private contract: ethers.Contract;
  private running = false;

  constructor(
    private readonly provider: ethers.JsonRpcProvider,
    private readonly address: string,
    private readonly db: DatabaseManager,
    private readonly redis: Redis,
    private readonly startBlock: number,
    private readonly confirmations: number
  ) {
    this.contract = new ethers.Contract(address, SBT_ABI, provider);
  }

  async start(): Promise<void> {
    if (!this.address) {
      logger.warn("SBTListener: no contract address configured, skipping");
      return;
    }
    this.running = true;
    await this.catchUp();
    this.subscribeToLiveEvents();
    logger.info({ contract: this.address }, "SBTListener started");
  }

  async stop(): Promise<void> {
    this.running = false;
    this.contract.removeAllListeners();
  }

  private async catchUp(): Promise<void> {
    const lastBlock = await this.db.getLastIndexedBlock(this.address);
    const from = Math.max(lastBlock + 1, this.startBlock);
    const current = await this.provider.getBlockNumber();
    const to = current - this.confirmations;
    if (from > to) return;

    const filter = this.contract.filters.SBTMinted();
    const events = await this.contract.queryFilter(filter, from, to);
    for (const event of events as ethers.EventLog[]) {
      await this.handleSBTMinted(event);
    }

    const revokedFilter = this.contract.filters.SBTRevoked();
    const revokedEvents = await this.contract.queryFilter(revokedFilter, from, to);
    for (const event of revokedEvents as ethers.EventLog[]) {
      await this.handleSBTRevoked(event);
    }

    await this.db.setLastIndexedBlock(this.address, to);
  }

  private subscribeToLiveEvents(): void {
    this.contract.on("SBTMinted", async (...args) => {
      await this.handleSBTMinted(args[args.length - 1] as ethers.EventLog);
    });
    this.contract.on("SBTRevoked", async (...args) => {
      await this.handleSBTRevoked(args[args.length - 1] as ethers.EventLog);
    });
  }

  private async handleSBTMinted(event: ethers.EventLog): Promise<void> {
    try {
      const [tokenId, holder, issuer, context, metadataUri, expiresAt, timestamp] = event.args;
      const issuedAt = new Date(Number(timestamp) * 1000);
      const expiresDate = expiresAt > 0n ? new Date(Number(expiresAt) * 1000) : null;

      await this.db.upsertSBT({
        tokenId,
        holder,
        issuer,
        context,
        metadataUri,
        expiresAt: expiresDate,
        revoked: false,
        issuedAt,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
      });
      await this.redis.del(`sbt:holder:${holder.toLowerCase()}`);
      logger.debug({ tokenId: tokenId.toString() }, "SBT minted");
    } catch (err) {
      logger.error({ err }, "Error handling SBTMinted");
    }
  }

  private async handleSBTRevoked(event: ethers.EventLog): Promise<void> {
    try {
      const [tokenId] = event.args;
      await this.db.db.query(
        "UPDATE sbt_tokens SET revoked = TRUE WHERE token_id = $1",
        [tokenId.toString()]
      );
      await this.redis.del(`sbt:${tokenId.toString()}`);
      logger.debug({ tokenId: tokenId.toString() }, "SBT revoked");
    } catch (err) {
      logger.error({ err }, "Error handling SBTRevoked");
    }
  }
}
