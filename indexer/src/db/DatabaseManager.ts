import { Pool } from "pg";
import { logger } from "../logger";

export class DatabaseManager {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    logger.info("Running database migrations");
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS indexer_state (
        contract_address TEXT PRIMARY KEY,
        last_indexed_block BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS identities (
        identity_id BIGINT PRIMARY KEY,
        primary_wallet TEXT NOT NULL,
        metadata_uri TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        block_number BIGINT NOT NULL,
        tx_hash TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_identities_wallet ON identities(primary_wallet);

      CREATE TABLE IF NOT EXISTS sbt_tokens (
        token_id BIGINT PRIMARY KEY,
        holder TEXT NOT NULL,
        issuer TEXT NOT NULL,
        context TEXT NOT NULL,
        metadata_uri TEXT,
        expires_at TIMESTAMPTZ,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        issued_at TIMESTAMPTZ NOT NULL,
        block_number BIGINT NOT NULL,
        tx_hash TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sbt_holder ON sbt_tokens(holder);
      CREATE INDEX IF NOT EXISTS idx_sbt_context ON sbt_tokens(context);

      CREATE TABLE IF NOT EXISTS attestations (
        attestation_id BIGINT PRIMARY KEY,
        from_identity_id BIGINT NOT NULL,
        to_identity_id BIGINT NOT NULL,
        weight SMALLINT NOT NULL,
        context TEXT NOT NULL,
        metadata_uri TEXT,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        block_number BIGINT NOT NULL,
        tx_hash TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_att_from ON attestations(from_identity_id);
      CREATE INDEX IF NOT EXISTS idx_att_to ON attestations(to_identity_id);
      CREATE INDEX IF NOT EXISTS idx_att_context ON attestations(context);

      CREATE TABLE IF NOT EXISTS reputation_scores (
        identity_id BIGINT NOT NULL,
        context TEXT NOT NULL,
        raw_score DOUBLE PRECISION NOT NULL,
        normalized_score DOUBLE PRECISION NOT NULL,
        percentile DOUBLE PRECISION NOT NULL,
        is_suspected_sybil BOOLEAN NOT NULL DEFAULT FALSE,
        computed_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (identity_id, context)
      );

      CREATE TABLE IF NOT EXISTS reputation_anchors (
        epoch BIGINT PRIMARY KEY,
        merkle_root TEXT NOT NULL,
        prev_root TEXT,
        metadata_uri TEXT,
        anchored_at TIMESTAMPTZ NOT NULL,
        block_number BIGINT NOT NULL,
        tx_hash TEXT NOT NULL
      );
    `);
    logger.info("Migrations complete");
  }

  async getLastIndexedBlock(contractAddress: string): Promise<number> {
    const res = await this.pool.query<{ last_indexed_block: string }>(
      "SELECT last_indexed_block FROM indexer_state WHERE contract_address = $1",
      [contractAddress.toLowerCase()]
    );
    return res.rows[0] ? parseInt(res.rows[0].last_indexed_block, 10) : 0;
  }

  async setLastIndexedBlock(contractAddress: string, blockNumber: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO indexer_state (contract_address, last_indexed_block, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (contract_address)
       DO UPDATE SET last_indexed_block = $2, updated_at = NOW()`,
      [contractAddress.toLowerCase(), blockNumber]
    );
  }

  async upsertIdentity(data: {
    identityId: bigint;
    primaryWallet: string;
    metadataUri: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    blockNumber: number;
    txHash: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO identities (identity_id, primary_wallet, metadata_uri, active, created_at, updated_at, block_number, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (identity_id) DO UPDATE SET
         primary_wallet = $2, metadata_uri = $3, active = $4,
         updated_at = $6, block_number = $7, tx_hash = $8`,
      [
        data.identityId.toString(),
        data.primaryWallet.toLowerCase(),
        data.metadataUri,
        data.active,
        data.createdAt.toISOString(),
        data.updatedAt.toISOString(),
        data.blockNumber,
        data.txHash,
      ]
    );
  }

  async upsertSBT(data: {
    tokenId: bigint;
    holder: string;
    issuer: string;
    context: string;
    metadataUri: string;
    expiresAt: Date | null;
    revoked: boolean;
    issuedAt: Date;
    blockNumber: number;
    txHash: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO sbt_tokens (token_id, holder, issuer, context, metadata_uri, expires_at, revoked, issued_at, block_number, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (token_id) DO UPDATE SET
         revoked = $7, block_number = $9, tx_hash = $10`,
      [
        data.tokenId.toString(),
        data.holder.toLowerCase(),
        data.issuer.toLowerCase(),
        data.context,
        data.metadataUri,
        data.expiresAt ? data.expiresAt.toISOString() : null,
        data.revoked,
        data.issuedAt.toISOString(),
        data.blockNumber,
        data.txHash,
      ]
    );
  }

  async upsertAttestation(data: {
    attestationId: bigint;
    fromIdentityId: bigint;
    toIdentityId: bigint;
    weight: number;
    context: string;
    metadataUri: string;
    revoked: boolean;
    createdAt: Date;
    updatedAt: Date;
    blockNumber: number;
    txHash: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO attestations (attestation_id, from_identity_id, to_identity_id, weight, context, metadata_uri, revoked, created_at, updated_at, block_number, tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (attestation_id) DO UPDATE SET
         weight = $4, revoked = $7, updated_at = $9, block_number = $10, tx_hash = $11`,
      [
        data.attestationId.toString(),
        data.fromIdentityId.toString(),
        data.toIdentityId.toString(),
        data.weight,
        data.context,
        data.metadataUri,
        data.revoked,
        data.createdAt.toISOString(),
        data.updatedAt.toISOString(),
        data.blockNumber,
        data.txHash,
      ]
    );
  }

  async upsertReputationScore(data: {
    identityId: bigint;
    context: string;
    rawScore: number;
    normalizedScore: number;
    percentile: number;
    isSuspectedSybil: boolean;
    computedAt: Date;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO reputation_scores (identity_id, context, raw_score, normalized_score, percentile, is_suspected_sybil, computed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (identity_id, context) DO UPDATE SET
         raw_score = $3, normalized_score = $4, percentile = $5,
         is_suspected_sybil = $6, computed_at = $7`,
      [
        data.identityId.toString(),
        data.context,
        data.rawScore,
        data.normalizedScore,
        data.percentile,
        data.isSuspectedSybil,
        data.computedAt.toISOString(),
      ]
    );
  }

  get db(): Pool {
    return this.pool;
  }
}
