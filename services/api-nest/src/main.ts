import "reflect-metadata";
// Phase0 — load repo-root .env before Nest bootstrap (ADR-016)
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("../../../tooling/deploy/lib/env.cjs").loadDotEnv();
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require("cookie-parser");
import { AppModule } from "./app.module";
import { securityHeadersMiddleware } from "./common/security-headers.middleware";
import { loadPhase0Env } from "./config/phase0.env";
import { runPhase06StagingSelftest } from "./mining/phase06-staging.selftest";

async function bootstrapPhase06Database(): Promise<void> {
  if (process.env.PHASE06_STAGING_SELFTEST !== "1" || process.env.DATABASE_URL) return;

  const projectRef = String(process.env.SUPABASE_PROJECT_REF ?? "").trim();
  const token = String(process.env.JWT_ADMIN_SECRET ?? "");
  if (projectRef !== "mgsytcetsiecllmhcyox" || token.length < 32) {
    throw new Error("PHASE06 staging database bootstrap refused: environment mismatch");
  }

  const response = await fetch(
    `https://${projectRef}.supabase.co/functions/v1/phase06-db-bootstrap`,
    {
      method: "POST",
      headers: {
        "x-phase06-bootstrap-token": token,
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`PHASE06 staging database bootstrap failed with ${response.status}`);
  }
  const body = (await response.json()) as { secret?: unknown };
  const password = typeof body.secret === "string" ? body.secret : "";
  if (!password) throw new Error("PHASE06 staging database bootstrap returned no credential");

  process.env.DATABASE_URL = `postgresql://putduk_mine_staging_api:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
  // eslint-disable-next-line no-console
  console.log("PHASE06_STAGING_DB_BOOTSTRAP_OK");
}

async function bootstrap() {
  await bootstrapPhase06Database();
  const env = loadPhase0Env();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // PART9-pre2 — httpOnly 세션쿠키 파싱 (JwtAuthGuard cookie fallback)
  app.use(cookieParser());
  app.use(securityHeadersMiddleware);
  app.useBodyParser("json", { limit: "10mb" });
  app.setGlobalPrefix("api/v1");

  const origins = new Set<string>();
  for (const host of [env.appHost, env.opsHost]) {
    if (!host) continue;
    origins.add(host.startsWith("http") ? host : `http://${host}`);
    if (!host.includes("localhost")) {
      origins.add(`https://${host}`);
    }
  }
  // Founder ACK 2026-09-13: apex user-web. Landing putduk.com never allowed.
  origins.add("https://hiptk.app");
  origins.add("https://www.hiptk.app");
  origins.add("https://app.hiptk.app");
  for (const o of [...origins]) {
    if (/(^|[/.])putduk\.com$/i.test(o.replace(/^https?:\/\//, ""))) {
      origins.delete(o);
    }
  }
  app.enableCors({
    origin: [...origins],
    credentials: true,
  });

  await app.listen(env.port);
  // eslint-disable-next-line no-console
  console.log(
    `[api-nest] :${env.port} · phase0 · bus=in-process · hosts app=${env.appHost} ops=${env.opsHost}`,
  );

  if (process.env.PHASE06_STAGING_SELFTEST === "1") {
    void runPhase06StagingSelftest(env.port).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(`PHASE06_STAGING_E2E_FAIL ${message}`);
    });
  }
}

void bootstrap();
