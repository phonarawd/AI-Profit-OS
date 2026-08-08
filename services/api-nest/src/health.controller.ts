import { Controller, Get } from "@nestjs/common";
import {
  assertSupabaseRegionOrWarn,
  loadPhase0Env,
} from "./config/phase0.env";
import { PostgresService } from "./db/postgres";
import { InProcessEventBus } from "./events/in-process.bus";
import { UpstashRedisService } from "./redis/upstash";

@Controller("health")
export class HealthController {
  constructor(
    private readonly pg: PostgresService,
    private readonly redis: UpstashRedisService,
    private readonly bus: InProcessEventBus,
  ) {}

  @Get()
  async ok() {
    const env = loadPhase0Env();
    const regionWarn = assertSupabaseRegionOrWarn(env);
    const [db, cache] = await Promise.all([this.pg.ping(), this.redis.ping()]);

    return {
      ok: true,
      service: "api-nest",
      phase: 0,
      bus: this.bus.describe(),
      hosts: {
        app: env.appHost,
        ops: env.opsHost,
        api: env.apiHost,
        rootDomain: env.rootDomain,
      },
      db: {
        provider: "supabase-or-compose",
        configured: this.pg.configured(),
        region: env.supabaseRegion,
        ...db,
      },
      redis: {
        provider: "upstash-or-compose",
        configured: this.redis.configured(),
        ...cache,
      },
      r2KycBucket: env.r2KycBucket,
      warnings: regionWarn ? [regionWarn] : [],
    };
  }
}
