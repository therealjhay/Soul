import {
  Controller,
  Get,
  Module,
  Param,
  ParseIntPipe,
  NotFoundException,
  Inject,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { Pool } from "pg";
import Redis from "ioredis";
import { PG_POOL, REDIS_CLIENT } from "../common/database.module";

@ApiTags("identity")
@ApiBearerAuth()
@Controller("identity")
export class IdentityController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS_CLIENT) private readonly redis: Redis
  ) {}

  @Get("wallet/:address")
  @ApiOperation({ summary: "Get identity by wallet address" })
  async getByWallet(@Param("address") address: string) {
    const cacheKey = `identity:wallet:${address.toLowerCase()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const res = await this.pool.query(
      "SELECT * FROM identities WHERE primary_wallet = $1 OR lower(primary_wallet) = lower($1)",
      [address]
    );
    if (!res.rows[0]) throw new NotFoundException(`No identity found for wallet ${address}`);

    await this.redis.setex(cacheKey, 300, JSON.stringify(res.rows[0]));
    return res.rows[0];
  }

  @UseGuards(AuthGuard("jwt"))
  @Get(":id")
  @ApiOperation({ summary: "Get identity by ID" })
  @ApiParam({ name: "id", type: Number })
  async getById(@Param("id", ParseIntPipe) id: number) {
    const cacheKey = `identity:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const res = await this.pool.query("SELECT * FROM identities WHERE identity_id = $1", [id]);
    if (!res.rows[0]) throw new NotFoundException(`Identity ${id} not found`);

    await this.redis.setex(cacheKey, 300, JSON.stringify(res.rows[0]));
    return res.rows[0];
  }

  @Get(":id/sbts")
  @ApiOperation({ summary: "Get all SBTs for an identity" })
  async getSBTs(@Param("id", ParseIntPipe) id: number) {
    // Look up wallet address for identity
    const identity = await this.pool.query(
      "SELECT primary_wallet FROM identities WHERE identity_id = $1",
      [id]
    );
    if (!identity.rows[0]) throw new NotFoundException(`Identity ${id} not found`);

    const wallet = identity.rows[0].primary_wallet;
    const res = await this.pool.query(
      "SELECT * FROM sbt_tokens WHERE holder = $1 AND revoked = FALSE ORDER BY issued_at DESC",
      [wallet]
    );
    return res.rows;
  }

  @Get(":id/attestations/outgoing")
  @ApiOperation({ summary: "Get outgoing attestations for an identity" })
  async getOutgoing(@Param("id", ParseIntPipe) id: number) {
    const res = await this.pool.query(
      "SELECT * FROM attestations WHERE from_identity_id = $1 AND revoked = FALSE ORDER BY created_at DESC",
      [id]
    );
    return res.rows;
  }

  @Get(":id/attestations/incoming")
  @ApiOperation({ summary: "Get incoming attestations for an identity" })
  async getIncoming(@Param("id", ParseIntPipe) id: number) {
    const res = await this.pool.query(
      "SELECT * FROM attestations WHERE to_identity_id = $1 AND revoked = FALSE ORDER BY created_at DESC",
      [id]
    );
    return res.rows;
  }
}

import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1h" },
    }),
  ],
  controllers: [IdentityController],
  providers: [JwtStrategy],
})
export class IdentityModule {}
