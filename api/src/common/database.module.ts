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
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL || "postgresql://rgp:rgp@localhost:5432/rgp",
          max: 20,
        });
        return pool;
      },
    },
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis(process.env.REDIS_URL || "redis://localhost:6379");
      },
    },
  ],
  exports: [PG_POOL, REDIS_CLIENT],
})
export class DatabaseModule {}
