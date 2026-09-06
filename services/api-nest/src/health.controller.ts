import { Controller, Get } from "@nestjs/common";
import { nestProvenance } from "./config/nest-provenance";
import { assertSupabaseRegionOrWarn, loadPhase0Env } from "./config/phase0.env";
import { PostgresService } from "./db/postgres";
import { publicHealthBody, sanitizeMigrationHead } from "./health.public";
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
    const [db, cache, migrationHead] = await Promise.all([
      this.pg.ping(),
      this.redis.ping(),
      this.readMigrationHead(),
    ]);
    const provenance = nestProvenance();

    return publicHealthBody({
      gitSha: provenance.gitSha,
      gitShaSource: provenance.gitShaSource,
      environment: env.nodeEnv,
      migrationHead,
      dbConfigured: this.pg.configured(),
      dbOk: db.ok === true,
      redisConfigured: this.redis.configured(),
      redisOk: cache.ok === true,
      regionUnsupported: Boolean(regionWarn),
    });
  }

  /** 추적 테이블 version만. 실패·미구성은 null (health 자체는 유지). */
  private async readMigrationHead(): Promise<string | null> {
    if (!this.pg.configured()) return null;
    try {
      const result = await this.pg.query<{ version: string }>(
        "select version from supabase_migrations.schema_migrations order by version desc limit 1",
      );
      return sanitizeMigrationHead(result.rows[0]?.version);
    } catch {
      return null;
    }
  }
}
