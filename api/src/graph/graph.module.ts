import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { Pool } from "pg";
import { PG_POOL } from "../common/database.module";

@ApiTags("graph")
@Controller("graph")
export class GraphController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get("stats")
  @ApiOperation({ summary: "Graph statistics" })
  async stats() {
    const [nodes, edges, contexts] = await Promise.all([
      this.pool.query("SELECT COUNT(*) FROM identities WHERE active = TRUE"),
      this.pool.query("SELECT COUNT(*) FROM attestations WHERE revoked = FALSE"),
      this.pool.query("SELECT DISTINCT context FROM attestations WHERE revoked = FALSE"),
    ]);
    return {
      nodeCount: parseInt(nodes.rows[0].count, 10),
      edgeCount: parseInt(edges.rows[0].count, 10),
      contexts: contexts.rows.map((r: { context: string }) => r.context),
    };
  }

  @Get("edges")
  @ApiOperation({ summary: "Fetch graph edges (for visualisation)" })
  @ApiQuery({ name: "context", required: false })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async edges(
    @Query("context") context?: string,
    @Query("limit", new DefaultValuePipe(500), ParseIntPipe) limit = 500
  ) {
    let query = "SELECT from_identity_id, to_identity_id, weight, context FROM attestations WHERE revoked = FALSE";
    const params: (string | number)[] = [];
    if (context) {
      query += " AND context = $1";
      params.push(context);
    }
    query += ` LIMIT ${limit}`;
    const res = await this.pool.query(query, params);
    return res.rows;
  }

  @Get("neighbours")
  @ApiOperation({ summary: "Get graph neighbours for an identity" })
  @ApiQuery({ name: "identityId", required: true, type: Number })
  @ApiQuery({ name: "context", required: false })
  @ApiQuery({ name: "depth", required: false, type: Number, description: "Max 2" })
  async neighbours(
    @Query("identityId", ParseIntPipe) identityId: number,
    @Query("context") context?: string,
    @Query("depth", new DefaultValuePipe(1), ParseIntPipe) depth = 1
  ) {
    // Limit depth to prevent expensive queries
    const maxDepth = Math.min(depth, 2);

    const visited = new Set<number>([identityId]);
    let frontier = [identityId];
    const edges: { from: number; to: number; weight: number; context: string }[] = [];

    for (let d = 0; d < maxDepth; d++) {
      if (frontier.length === 0) break;
      const placeholders = frontier.map((_, i) => `$${i + 1}`).join(",");
      let query = `SELECT from_identity_id, to_identity_id, weight, context
                   FROM attestations
                   WHERE revoked = FALSE
                   AND (from_identity_id IN (${placeholders}) OR to_identity_id IN (${placeholders}))`;
      const params: (number | string)[] = [...frontier, ...frontier];
      if (context) {
        query += ` AND context = $${params.length + 1}`;
        params.push(context);
      }
      const res = await this.pool.query(query, params);
      const nextFrontier: number[] = [];
      for (const row of res.rows) {
        edges.push({
          from: Number(row.from_identity_id),
          to: Number(row.to_identity_id),
          weight: row.weight,
          context: row.context,
        });
        [Number(row.from_identity_id), Number(row.to_identity_id)].forEach((id) => {
          if (!visited.has(id)) {
            visited.add(id);
            nextFrontier.push(id);
          }
        });
      }
      frontier = nextFrontier;
    }

    return {
      nodes: Array.from(visited),
      edges,
    };
  }
}

import { Module } from "@nestjs/common";

@Module({ controllers: [GraphController] })
export class GraphModule {}
