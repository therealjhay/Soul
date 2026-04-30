import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ReputationModule } from "./reputation/reputation.module";
import { IdentityModule } from "./identity/identity.module";
import { AttestationModule } from "./attestation/attestation.module";
import { GraphModule } from "./graph/graph.module";
import { ZkModule } from "./zk/zk.module";
import { DatabaseModule } from "./common/database.module";
import { HealthModule } from "./common/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    HealthModule,
    ReputationModule,
    IdentityModule,
    AttestationModule,
    GraphModule,
    ZkModule,
  ],
})
export class AppModule {}
