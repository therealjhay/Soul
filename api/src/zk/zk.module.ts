import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Query,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { IsNumber, IsString, IsArray, ArrayMinSize } from "class-validator";
import { Pool } from "pg";
import Redis from "ioredis";
import { keccak_256 } from "@noble/hashes/sha3";
import { PG_POOL, REDIS_CLIENT } from "../common/database.module";

class VerifyScoreDto {
  @IsNumber()
  identityId!: number;

  @IsString()
  context!: string;

  @IsNumber()
  score!: number;

  @IsArray()
  @ArrayMinSize(0)
  proof!: string[];
}

@ApiTags("zk")
@Controller("zk")
export class ZkController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  /**
   * Verify a Merkle proof for a reputation score against the latest on-chain anchor.
   */
  @Post("verify/score")
  @ApiOperation({ summary: "Verify a reputation score Merkle proof" })
  async verifyScore(@Body() dto: VerifyScoreDto) {
    // Fetch latest anchor from DB
    const anchor = await this.pool.query(
      "SELECT merkle_root FROM reputation_anchors ORDER BY epoch DESC LIMIT 1"
    );
    if (!anchor.rows[0]) {
      throw new BadRequestException("No reputation anchor found on chain yet");
    }

    const root: string = anchor.rows[0].merkle_root;
    const leaf = this.hashHex([dto.identityId.toString(), dto.context, dto.score.toString()]);

    const valid = this.verifyMerkleProof(dto.proof, root, leaf);
    return { valid, root, leaf };
  }

  /**
   * Check whether an identity's score exceeds a threshold — zero-knowledge threshold proof.
   * In production this calls the ZK prover service; here we verify against the DB score.
   */
  @Get("threshold/:identityId")
  @ApiOperation({ summary: "Check reputation threshold (simplified)" })
  @ApiQuery({ name: "context", required: true })
  @ApiQuery({ name: "threshold", required: true, type: Number })
  async checkThreshold(
    @Param("identityId", ParseIntPipe) identityId: number,
    @Query("context") context: string,
    @Query("threshold", ParseIntPipe) threshold: number
  ) {
    const cacheKey = `zk:threshold:${identityId}:${context}:${threshold}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const res = await this.pool.query(
      "SELECT normalized_score FROM reputation_scores WHERE identity_id = $1 AND context = $2",
      [identityId, context]
    );

    const score = res.rows[0] ? parseFloat(res.rows[0].normalized_score) : 0;
    const meetsThreshold = score >= threshold;

    const result = {
      identityId,
      context,
      threshold,
      meetsThreshold,
      // In production: attach a ZK proof here
      proof: null,
    };

    await this.redis.setex(cacheKey, 30, JSON.stringify(result));
    return result;
  }

  private verifyMerkleProof(proof: string[], root: string, leaf: string): boolean {
    let computed = leaf;
    for (const sibling of proof) {
      const a = BigInt(computed) <= BigInt(sibling) ? computed : sibling;
      const b = BigInt(computed) <= BigInt(sibling) ? sibling : computed;
      computed = this.hashHex([a, b]);
    }
    return computed.toLowerCase() === root.toLowerCase();
  }

  private hashHex(parts: Array<string | number | bigint>): string {
    const payload = new TextEncoder().encode(parts.map((p) => p.toString()).join("|"));
    const digest = keccak_256(payload);
    return `0x${Buffer.from(digest).toString("hex")}`;
  }
}

import { Module } from "@nestjs/common";

@Module({ controllers: [ZkController] })
export class ZkModule {}
