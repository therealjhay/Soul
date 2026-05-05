import { Module, Global } from "@nestjs/common";
import { Pool } from "pg";
import Redis from "ioredis";

export const PG_POOL = "PG_POOL";
export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error("DATABASE_URL environment variable is required");
        }
        const pool = new Pool({
          connectionString,
          max: 20,
        });
        return pool;
      },
    },
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
          throw new Error("REDIS_URL environment variable is required");
        }
        return new Redis(redisUrl);
      },
    },
  ],
  exports: [PG_POOL, REDIS_CLIENT],
})
export class DatabaseModule {}
