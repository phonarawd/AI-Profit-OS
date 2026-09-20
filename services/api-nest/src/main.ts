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

async function bootstrap() {
  const env = loadPhase0Env();
  const phase06ProdRef = "gaugwamwceqdnqdqrxqg";
  const phase06ConfiguredRef = String(process.env.SUPABASE_PROJECT_REF ?? "").trim();
  const phase06DatabaseUrl = String(process.env.DATABASE_URL ?? "");
  // Phase06 staging safety probe: expose only a boolean, never credentials or URLs.
  // eslint-disable-next-line no-console
  console.log(`PHASE06_DB_TARGET_PRODUCTION=${phase06ConfiguredRef === phase06ProdRef || phase06DatabaseUrl.includes(phase06ProdRef)}`);
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
}

void bootstrap();
