import { Global, Module } from "@nestjs/common";
import { InProcessEventBus } from "./in-process.bus";
import { PostgresService } from "../db/postgres";
import { UpstashRedisService } from "../redis/upstash";

@Global()
@Module({
  providers: [InProcessEventBus, PostgresService, UpstashRedisService],
  exports: [InProcessEventBus, PostgresService, UpstashRedisService],
})
export class EventsModule {}
