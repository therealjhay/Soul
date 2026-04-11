import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from "@nestjs/swagger";
import { Pool } from "pg";
import Redis from "ioredis";
import { PG_POOL, REDIS_CLIENT } from "../common/database.module";

@ApiTags("reputation")
@Controller("reputation")
export class ReputationController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  @Get()
  @ApiOperation({ summary: "List reputation scores (paginated)" })
  @ApiQuery({ name: "context", required: false, description: "Filter by context" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  async listScores(
    @Query("context") context?: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit = 50,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset = 0
  ) {
    const cacheKey = `scores:list:${context || "all"}:${limit}:${offset}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const baseQuery =
      "SELECT * FROM reputation_scores" +
      (context ? " WHERE context = $1" : "") +
      " ORDER BY normalized_score DESC" +
      ` LIMIT ${limit} OFFSET ${offset}`;

    const res = await this.pool.query(context ? baseQuery : baseQuery, context ? [context] : []);
    const result = res.rows;

    await this.redis.setex(cacheKey, 60, JSON.stringify(result));
    return result;
  }

  @Get(":identityId")
  @ApiOperation({ summary: "Get reputation scores for an identity" })
  @ApiParam({ name: "identityId", type: Number })
  @ApiQuery({ name: "context", required: false })
  async getScore(
    @Param("identityId", ParseIntPipe) identityId: number,
    @Query("context") context?: string
  ) {
    const cacheKey = `score:${identityId}:${context || "all"}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let query = "SELECT * FROM reputation_scores WHERE identity_id = $1";
    const params: (number | string)[] = [identityId];
    if (context) {
      query += " AND context = $2";
      params.push(context);
    }

    const res = await this.pool.query(query, params);
    if (res.rows.length === 0) {
      throw new NotFoundException(`No reputation scores found for identity ${identityId}`);
    }

    const result = context ? res.rows[0] : res.rows;
    await this.redis.setex(cacheKey, 60, JSON.stringify(result));
    return result;
  }

  @Get(":identityId/rank")
  @ApiOperation({ summary: "Get rank and percentile for an identity in a context" })
  @ApiParam({ name: "identityId", type: Number })
  @ApiQuery({ name: "context", required: true })
  async getRank(
    @Param("identityId", ParseIntPipe) identityId: number,
    @Query("context") context = "defi"
  ) {
    const res = await this.pool.query(
      `SELECT identity_id, normalized_score, percentile,
              RANK() OVER (ORDER BY normalized_score DESC) AS rank,
              COUNT(*) OVER () AS total
       FROM reputation_scores
       WHERE context = $1`,
      [context]
    );

    const row = res.rows.find((r) => Number(r.identity_id) === identityId);
    if (!row) throw new NotFoundException(`Identity ${identityId} not found in context ${context}`);
    return row;
  }
}

import { Module } from "@nestjs/common";

@Module({ controllers: [ReputationController] })
export class ReputationModule {}
