import { Controller, Get, Inject, Module, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Pool } from "pg";
import { PG_POOL } from "../common/database.module";

type ReputationTier = "NEWCOMER" | "BUILDER" | "VERIFIED DEV" | "GOVERNANCE VETERAN" | "LEGEND";

const PROTOCOL_VERSION = "0.1.0-devnet";

function categoryForContext(context: string): "DEV" | "GOVERNANCE" | "SOCIAL" | "DEFI" | "OTHER" {
  const normalized = context.toLowerCase();
  if (normalized.includes("dev") || normalized.includes("hackathon") || normalized.includes("builder")) return "DEV";
  if (normalized.includes("dao") || normalized.includes("governance") || normalized.includes("vote")) return "GOVERNANCE";
  if (normalized.includes("social") || normalized.includes("message") || normalized.includes("community")) return "SOCIAL";
  if (normalized.includes("defi") || normalized.includes("stake") || normalized.includes("liquid")) return "DEFI";
  return "OTHER";
}

function weightForContext(context: string): number {
  switch (categoryForContext(context)) {
    case "DEV":
      return 120;
    case "GOVERNANCE":
      return 85;
    case "DEFI":
      return 72;
    case "SOCIAL":
      return 48;
    default:
      return 25;
  }
}

function tierForScore(score: number): ReputationTier {
  if (score >= 900) return "LEGEND";
  if (score >= 750) return "GOVERNANCE VETERAN";
  if (score >= 600) return "VERIFIED DEV";
  if (score >= 250) return "BUILDER";
  return "NEWCOMER";
}

function displayIssuer(issuer: string): string {
  if (issuer.length <= 12) return issuer;
  return `${issuer.slice(0, 6)}...${issuer.slice(-4)}`;
}

function issuerTypeForCategory(category: ReturnType<typeof categoryForContext>) {
  if (category === "DEV") return "HACKATHON";
  if (category === "GOVERNANCE") return "DAO";
  if (category === "DEFI") return "DEFI";
  if (category === "SOCIAL") return "SOCIAL";
  return "PROTOCOL";
}

@ApiTags("protocol")
@Controller()
export class ProtocolController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get("stats")
  @ApiOperation({ summary: "Get indexed RGP protocol stats" })
  async stats() {
    const res = await this.pool.query(`
      SELECT
        (SELECT COUNT(*)::INT FROM identities WHERE active = TRUE) AS total_wallets,
        (SELECT COUNT(*)::INT FROM sbt_tokens WHERE revoked = FALSE) AS sbts_issued,
        (SELECT COUNT(DISTINCT issuer)::INT FROM sbt_tokens WHERE revoked = FALSE) AS issuers_registered
    `);
    return res.rows[0];
  }

  @Get("events")
  @ApiOperation({ summary: "Get recent indexed RGP activity" })
  async events() {
    const res = await this.pool.query(`
      SELECT * FROM (
        SELECT
          'identity-' || identity_id AS id,
          'PASSPORT_MINTED' AS event_type,
          primary_wallet AS wallet,
          'RGP Program' AS issuer_name,
          'IDENTITY' AS sbt_type,
          created_at AS timestamp
        FROM identities
        UNION ALL
        SELECT
          'sbt-' || token_id AS id,
          CASE WHEN revoked THEN 'SBT_REVOKED' ELSE 'SBT_ISSUED' END AS event_type,
          holder AS wallet,
          issuer AS issuer_name,
          context AS sbt_type,
          issued_at AS timestamp
        FROM sbt_tokens
      ) recent_events
      ORDER BY timestamp DESC
      LIMIT 24
    `);

    return res.rows.map((row) => ({
      ...row,
      issuer_name: row.issuer_name === "RGP Program" ? row.issuer_name : displayIssuer(row.issuer_name),
    }));
  }

  @Get("issuers")
  @ApiOperation({ summary: "List issuers observed by the indexer" })
  async issuers() {
    const res = await this.pool.query(`
      SELECT
        issuer,
        COUNT(*)::INT AS sbts_issued,
        ARRAY_AGG(DISTINCT context ORDER BY context) AS sbt_types
      FROM sbt_tokens
      WHERE revoked = FALSE
      GROUP BY issuer
      ORDER BY sbts_issued DESC, issuer ASC
    `);

    return res.rows.map((row) => {
      const firstContext = row.sbt_types?.[0] ?? "other";
      const category = categoryForContext(firstContext);
      return {
        id: row.issuer,
        name: displayIssuer(row.issuer),
        type: issuerTypeForCategory(category),
        sbts_issued: row.sbts_issued,
        weight: Math.max(...row.sbt_types.map((context: string) => weightForContext(context))),
        status: "VERIFIED",
        verified: true,
        description: `Devnet issuer observed by the RGP indexer at ${row.issuer}.`,
        sbt_types: row.sbt_types.map((context: string) => context.toUpperCase()),
        integration_url: "",
      };
    });
  }

  @Get("sbts/:wallet")
  @ApiOperation({ summary: "List indexed SBT credentials for a wallet" })
  async sbts(@Param("wallet") wallet: string) {
    const res = await this.pool.query(
      `
      SELECT *
      FROM sbt_tokens
      WHERE revoked = FALSE
        AND (holder = $1 OR lower(holder) = lower($1))
      ORDER BY issued_at DESC
      `,
      [wallet]
    );

    return res.rows.map((row) => ({
      token_id: Number(row.token_id),
      holder: row.holder,
      issuer: row.issuer,
      issuer_name: displayIssuer(row.issuer),
      context: row.context,
      category: categoryForContext(row.context),
      metadata_uri: row.metadata_uri,
      expires_at: row.expires_at,
      revoked: row.revoked,
      issued_at: row.issued_at,
      weight_points: weightForContext(row.context),
      description: `${row.context.toUpperCase()} credential indexed from the RGP devnet program.`,
    }));
  }

  @Get("reputation/wallet/:wallet")
  @ApiOperation({ summary: "Get wallet reputation from indexed scores and SBTs" })
  async walletReputation(@Param("wallet") wallet: string) {
    const identityRes = await this.pool.query(
      "SELECT * FROM identities WHERE primary_wallet = $1 OR lower(primary_wallet) = lower($1) LIMIT 1",
      [wallet]
    );
    const identity = identityRes.rows[0];

    if (!identity) {
      return this.emptyReputation(wallet);
    }

    const scoreRes = await this.pool.query(
      "SELECT * FROM reputation_scores WHERE identity_id = $1 ORDER BY normalized_score DESC",
      [identity.identity_id]
    );
    const sbtRes = await this.pool.query(
      "SELECT context FROM sbt_tokens WHERE revoked = FALSE AND (holder = $1 OR lower(holder) = lower($1))",
      [identity.primary_wallet]
    );

    const score = Math.round(scoreRes.rows[0]?.normalized_score ?? 0);
    const categoryScores = new Map<string, number>([
      ["DEV", 0],
      ["GOVERNANCE", 0],
      ["DEFI", 0],
      ["SOCIAL", 0],
      ["OTHER", 0],
    ]);

    for (const row of sbtRes.rows) {
      const category = categoryForContext(row.context);
      categoryScores.set(category, (categoryScores.get(category) ?? 0) + weightForContext(row.context));
    }

    const total = Array.from(categoryScores.values()).reduce((sum, value) => sum + value, 0);
    return {
      wallet: identity.primary_wallet,
      score,
      tier: tierForScore(score),
      breakdown: Array.from(categoryScores.entries()).map(([category, value]) => ({
        category,
        score: value,
        percentage: total === 0 ? 0 : Math.round((value / total) * 100),
      })),
      last_updated: scoreRes.rows[0]?.computed_at ?? identity.updated_at,
    };
  }

  @Get("passport/:wallet")
  @ApiOperation({ summary: "Get wallet passport status" })
  async passport(@Param("wallet") wallet: string) {
    const identityRes = await this.pool.query(
      "SELECT * FROM identities WHERE primary_wallet = $1 OR lower(primary_wallet) = lower($1) LIMIT 1",
      [wallet]
    );
    const identity = identityRes.rows[0];

    if (!identity) {
      return {
        wallet,
        exists: false,
        score: 0,
        tier: tierForScore(0),
        issued_at: new Date(0).toISOString(),
        last_updated: new Date(0).toISOString(),
        sbt_count: 0,
        version: PROTOCOL_VERSION,
      };
    }

    const [reputation, sbtCount] = await Promise.all([
      this.walletReputation(identity.primary_wallet),
      this.pool.query(
        "SELECT COUNT(*)::INT AS count FROM sbt_tokens WHERE revoked = FALSE AND (holder = $1 OR lower(holder) = lower($1))",
        [identity.primary_wallet]
      ),
    ]);

    return {
      wallet: identity.primary_wallet,
      exists: true,
      score: reputation.score,
      tier: reputation.tier,
      issued_at: identity.created_at,
      last_updated: reputation.last_updated,
      sbt_count: sbtCount.rows[0].count,
      version: PROTOCOL_VERSION,
    };
  }

  private emptyReputation(wallet: string) {
    return {
      wallet,
      score: 0,
      tier: tierForScore(0),
      breakdown: ["DEV", "GOVERNANCE", "DEFI", "SOCIAL", "OTHER"].map((category) => ({
        category,
        score: 0,
        percentage: 0,
      })),
      last_updated: new Date(0).toISOString(),
    };
  }
}

@Module({
  controllers: [ProtocolController],
})
export class ProtocolModule {}
