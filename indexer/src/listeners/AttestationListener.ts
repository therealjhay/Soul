import { ethers } from "ethers";
import Redis from "ioredis";
import { logger } from "../logger";
import { DatabaseManager } from "../db/DatabaseManager";

const ATTESTATION_ABI = [
  "event AttestationCreated(uint256 indexed attestationId, uint256 indexed fromIdentityId, uint256 indexed toIdentityId, uint8 weight, string context, string metadataURI, uint256 timestamp)",
  "event AttestationUpdated(uint256 indexed attestationId, uint8 newWeight, string newMetadataURI, uint256 timestamp)",
  "event AttestationRevoked(uint256 indexed attestationId, uint256 indexed fromIdentityId, uint256 indexed toIdentityId, uint256 timestamp)",
];

export class AttestationListener {
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
    this.contract = new ethers.Contract(address, ATTESTATION_ABI, provider);
  }

  async start(): Promise<void> {
    if (!this.address) {
      logger.warn("AttestationListener: no contract address configured, skipping");
      return;
    }
    this.running = true;
    await this.catchUp();
    this.subscribeToLiveEvents();
    logger.info({ contract: this.address }, "AttestationListener started");
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

    const createdFilter = this.contract.filters.AttestationCreated();
    const events = await this.contract.queryFilter(createdFilter, from, to);
    for (const e of events as ethers.EventLog[]) {
      await this.handleCreated(e);
    }

    const revokedFilter = this.contract.filters.AttestationRevoked();
    const revoked = await this.contract.queryFilter(revokedFilter, from, to);
    for (const e of revoked as ethers.EventLog[]) {
      await this.handleRevoked(e);
    }

    await this.db.setLastIndexedBlock(this.address, to);
  }

  private subscribeToLiveEvents(): void {
    this.contract.on("AttestationCreated", async (...args) => {
      await this.handleCreated(args[args.length - 1] as ethers.EventLog);
    });
    this.contract.on("AttestationRevoked", async (...args) => {
      await this.handleRevoked(args[args.length - 1] as ethers.EventLog);
    });
    this.contract.on("AttestationUpdated", async (...args) => {
      await this.handleUpdated(args[args.length - 1] as ethers.EventLog);
    });
  }

  private async handleCreated(event: ethers.EventLog): Promise<void> {
    try {
      const [attestationId, fromId, toId, weight, context, metadataUri, timestamp] = event.args;
      const ts = new Date(Number(timestamp) * 1000);
      await this.db.upsertAttestation({
        attestationId,
        fromIdentityId: fromId,
        toIdentityId: toId,
        weight: Number(weight),
        context,
        metadataUri,
        revoked: false,
        createdAt: ts,
        updatedAt: ts,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
      });
      // Invalidate cached scores for both identities
      await this.invalidateScoreCache(fromId.toString());
      await this.invalidateScoreCache(toId.toString());
      logger.debug({ attestationId: attestationId.toString() }, "Attestation created");
    } catch (err) {
      logger.error({ err }, "Error handling AttestationCreated");
    }
  }

  private async handleRevoked(event: ethers.EventLog): Promise<void> {
    try {
      const [attestationId, fromId, toId] = event.args;
      await this.db.db.query(
        "UPDATE attestations SET revoked = TRUE, updated_at = NOW() WHERE attestation_id = $1",
        [attestationId.toString()]
      );
      await this.invalidateScoreCache(toId.toString());
      logger.debug({ attestationId: attestationId.toString() }, "Attestation revoked");
    } catch (err) {
      logger.error({ err }, "Error handling AttestationRevoked");
    }
  }

  private async handleUpdated(event: ethers.EventLog): Promise<void> {
    try {
      const [attestationId, newWeight, newMetadataUri, timestamp] = event.args;
      await this.db.db.query(
        "UPDATE attestations SET weight = $1, metadata_uri = $2, updated_at = $3 WHERE attestation_id = $4",
        [
          Number(newWeight),
          newMetadataUri,
          new Date(Number(timestamp) * 1000).toISOString(),
          attestationId.toString(),
        ]
      );
    } catch (err) {
      logger.error({ err }, "Error handling AttestationUpdated");
    }
  }

  private async invalidateScoreCache(identityId: string): Promise<void> {
    const pattern = `score:${identityId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) await this.redis.del(...keys);
  }
}
