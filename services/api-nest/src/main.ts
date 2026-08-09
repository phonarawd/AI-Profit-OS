import "reflect-metadata";
// Phase0 — load repo-root .env before Nest bootstrap (ADR-016)
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("../../../tooling/deploy/lib/env.cjs").loadDotEnv();
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { loadPhase0Env } from "./config/phase0.env";

async function bootstrap() {
  const env = loadPhase0Env();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
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
