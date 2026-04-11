import { ethers } from "ethers";
import Redis from "ioredis";
import { logger } from "../logger";
import { DatabaseManager } from "../db/DatabaseManager";

const IDENTITY_ABI = [
  "event IdentityRegistered(uint256 indexed identityId, address indexed wallet, string metadataURI, uint256 timestamp)",
  "event WalletLinked(uint256 indexed identityId, address indexed wallet, uint256 timestamp)",
  "event WalletUnlinked(uint256 indexed identityId, address indexed wallet, uint256 timestamp)",
  "event MetadataUpdated(uint256 indexed identityId, string newMetadataURI, uint256 timestamp)",
  "event IdentityDeactivated(uint256 indexed identityId, uint256 timestamp)",
];

export class IdentityListener {
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
    this.contract = new ethers.Contract(address, IDENTITY_ABI, provider);
  }

  async start(): Promise<void> {
    if (!this.address) {
      logger.warn("IdentityListener: no contract address configured, skipping");
      return;
    }
    this.running = true;
    await this.catchUp();
    this.subscribeToLiveEvents();
    logger.info({ contract: this.address }, "IdentityListener started");
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

    logger.info({ from, to, contract: this.address }, "Catching up on IdentityRegistered events");

    const filter = this.contract.filters.IdentityRegistered();
    const events = await this.contract.queryFilter(filter, from, to);

    for (const event of events as ethers.EventLog[]) {
      await this.handleIdentityRegistered(event);
    }

    await this.db.setLastIndexedBlock(this.address, to);
  }

  private subscribeToLiveEvents(): void {
    this.contract.on("IdentityRegistered", async (...args) => {
      const event = args[args.length - 1] as ethers.EventLog;
      await this.handleIdentityRegistered(event);
    });

    this.contract.on("MetadataUpdated", async (...args) => {
      const event = args[args.length - 1] as ethers.EventLog;
      await this.handleMetadataUpdated(event);
    });

    this.contract.on("IdentityDeactivated", async (...args) => {
      const event = args[args.length - 1] as ethers.EventLog;
      await this.handleIdentityDeactivated(event);
    });
  }

  private async handleIdentityRegistered(event: ethers.EventLog): Promise<void> {
    try {
      const [identityId, wallet, metadataUri, timestamp] = event.args;
      const blockTs = new Date(Number(timestamp) * 1000);
      await this.db.upsertIdentity({
        identityId,
        primaryWallet: wallet,
        metadataUri,
        active: true,
        createdAt: blockTs,
        updatedAt: blockTs,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
      });
      // Invalidate Redis cache
      await this.redis.del(`identity:wallet:${wallet.toLowerCase()}`);
      logger.debug({ identityId: identityId.toString() }, "Identity registered");
    } catch (err) {
      logger.error({ err }, "Error handling IdentityRegistered");
    }
  }

  private async handleMetadataUpdated(event: ethers.EventLog): Promise<void> {
    try {
      const [identityId, newMetadataUri, timestamp] = event.args;
      await this.db.db.query(
        "UPDATE identities SET metadata_uri = $1, updated_at = $2 WHERE identity_id = $3",
        [newMetadataUri, new Date(Number(timestamp) * 1000).toISOString(), identityId.toString()]
      );
      await this.redis.del(`identity:${identityId.toString()}`);
    } catch (err) {
      logger.error({ err }, "Error handling MetadataUpdated");
    }
  }

  private async handleIdentityDeactivated(event: ethers.EventLog): Promise<void> {
    try {
      const [identityId] = event.args;
      await this.db.db.query(
        "UPDATE identities SET active = FALSE WHERE identity_id = $1",
        [identityId.toString()]
      );
      await this.redis.del(`identity:${identityId.toString()}`);
    } catch (err) {
      logger.error({ err }, "Error handling IdentityDeactivated");
    }
  }
}
