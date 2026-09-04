import { Controller, Get } from "@nestjs/common";
import { nestProvenance } from "./config/nest-provenance";
import { assertSupabaseRegionOrWarn, loadPhase0Env } from "./config/phase0.env";
import { PostgresService } from "./db/postgres";
import { publicHealthBody } from "./health.public";
import { UpstashRedisService } from "./redis/upstash";

@Controller("health")
export class HealthController {
  constructor(
    private readonly pg: PostgresService,
    private readonly redis: UpstashRedisService,
  ) {}

  @Get()
  async ok() {
    const env = loadPhase0Env();
    const regionWarn = assertSupabaseRegionOrWarn(env);
    const [db, cache] = await Promise.all([this.pg.ping(), this.redis.ping()]);
    const provenance = nestProvenance();

    return publicHealthBody({
      gitSha: provenance.gitSha,
      gitShaSource: provenance.gitShaSource,
      dbConfigured: this.pg.configured(),
      dbOk: db.ok === true,
      redisConfigured: this.redis.configured(),
      redisOk: cache.ok === true,
      regionUnsupported: Boolean(regionWarn),
    });
  }
}
