/**
 * REL-010 — Nest HTTP에서 auth limiter가 429를 내는지 확인.
 * AppModule에 연결하지 않는다. DB/Redis 불필요.
 */
import "reflect-metadata";
import {
  Controller,
  Module,
  Post,
  UseGuards,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as http from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";
import { AuthRateLimitGuard } from "./auth-rate-limit.guard";

const req = createRequire(__filename);
const limiter = req(join(__dirname, "..", "..", "auth-rate-limit.cjs")) as {
  MESSAGE_KO: string;
  resetAuthRateLimitStore: () => void;
};

@Controller("auth")
class ProbeController {
  @Post("signup")
  @UseGuards(AuthRateLimitGuard)
  signup() {
    return { ok: true };
  }
}

@Module({
  controllers: [ProbeController],
  providers: [AuthRateLimitGuard],
})
class SelfTestModule {}

function httpPost(
  port: number,
  path: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const r = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: { "content-type": "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: data }),
        );
      },
    );
    r.on("error", reject);
    r.end("{}");
  });
}

async function main(): Promise<void> {
  process.env.AUTH_RATE_LIMIT_MAX = "3";
  process.env.AUTH_RATE_LIMIT_WINDOW_MS = "60000";
  limiter.resetAuthRateLimitStore();

  const app = await NestFactory.create<NestExpressApplication>(SelfTestModule, {
    logger: false,
  });
  await app.listen(0);
  const address = app.getHttpServer().address();
  const port = typeof address === "object" && address ? address.port : 0;

  try {
    for (let i = 0; i < 3; i += 1) {
      const ok = await httpPost(port, "/auth/signup");
      if (ok.status !== 201 && ok.status !== 200) {
        throw new Error(`allowed request ${i} status=${ok.status} body=${ok.body}`);
      }
    }
    const blocked = await httpPost(port, "/auth/signup");
    if (blocked.status !== 429) {
      throw new Error(`want 429 got ${blocked.status} body=${blocked.body}`);
    }
    if (!blocked.body.includes(limiter.MESSAGE_KO)) {
      throw new Error(`429 body missing Korean message: ${blocked.body}`);
    }
    if (/API|rate limit|throttle|429/i.test(JSON.parse(blocked.body).message || "")) {
      throw new Error("user message must not include IT jargon");
    }
  } finally {
    await app.close();
    limiter.resetAuthRateLimitStore();
  }

  console.log(
    "[auth-rate-limit.selftest] ALL PASS — Nest HTTP 429 after window (127.0.0.1 only)",
  );
}

main().catch((err) => {
  console.error("[auth-rate-limit.selftest] FATAL", err);
  process.exit(1);
});
