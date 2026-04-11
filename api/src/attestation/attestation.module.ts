import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { Pool } from "pg";
import Redis from "ioredis";
import { PG_POOL, REDIS_CLIENT } from "../common/database.module";

@ApiTags("attestation")
@Controller("attestation")
export class AttestationController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  @Get()
  @ApiOperation({ summary: "List attestations" })
  @ApiQuery({ name: "fromId", required: false, type: Number })
  @ApiQuery({ name: "toId", required: false, type: Number })
  @ApiQuery({ name: "context", required: false })
  async list(
    @Query("fromId") fromId?: string,
    @Query("toId") toId?: string,
    @Query("context") context?: string
  ) {
    const conditions: string[] = ["revoked = FALSE"];
    const params: (string | number)[] = [];

    if (fromId) {
      params.push(parseInt(fromId, 10));
      conditions.push(`from_identity_id = $${params.length}`);
    }
    if (toId) {
      params.push(parseInt(toId, 10));
      conditions.push(`to_identity_id = $${params.length}`);
    }
    if (context) {
      params.push(context);
      conditions.push(`context = $${params.length}`);
    }

    const where = conditions.join(" AND ");
    const res = await this.pool.query(
      `SELECT * FROM attestations WHERE ${where} ORDER BY created_at DESC LIMIT 200`,
      params
    );
    return res.rows;
  }
}

import { Module } from "@nestjs/common";

@Module({ controllers: [AttestationController] })
export class AttestationModule {}
