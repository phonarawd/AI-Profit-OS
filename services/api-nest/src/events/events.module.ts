import { Global, Module } from "@nestjs/common";
import { AdminRbacLookupService } from "../common/admin-rbac.lookup.service";
import { InProcessEventBus } from "./in-process.bus";
import { PostgresService } from "../db/postgres";
import { UpstashRedisService } from "../redis/upstash";

@Global()
@Module({
  providers: [
    InProcessEventBus,
    PostgresService,
    UpstashRedisService,
    AdminRbacLookupService,
  ],
  exports: [InProcessEventBus, PostgresService, UpstashRedisService],
})
export class EventsModule {}
