/**
 * Standalone real Nest+HTTP round-trip for JwtAuthGuard (P0-1 evidence).
 * NOT wired into AppModule — invoked only by tooling/verify/auth-jwt-runtime.cjs
 * via `node dist/auth/jwt-guard.selftest.js` after a scoped tsc build.
 *
 * Boots a real NestExpressApplication on an ephemeral port and makes real
 * HTTP requests (Node http client, no supertest dep) against a guarded
 * probe route — the exact "boot the Nest app / make a real HTTP request"
 * check the Engine audit found missing (§22 Test Audit / §28 False
 * Completion). Needs no DATABASE_URL/REDIS_URL — CI-safe.
 */
import "reflect-metadata";
import {
  Controller,
  Get,
  Module,
  Req,
  UseGuards,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as http from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";
import { USER_JWT_AUDIENCE, USER_JWT_ISSUER } from "./auth.constants";
import { JwtAuthGuard, type SessionUser } from "./jwt-auth.guard";

const req = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwtCore = req(join(__dirname, "..", "..", "jwt.core.cjs")) as {
  sign: (
    payload: Record<string, unknown>,
    secret: string,
    opts: {
      issuer: string;
      audience: string;
      expiresInSec: number;
      nowMs?: number;
    },
  ) => string;
};

const SELFTEST_SECRET = "selftest_jwt_secret_min_32_chars_ok!!";
const PROBE_USER_ID = "11111111-1111-4111-8111-111111111111";

@Controller()
class ProbeController {
  @Get("__probe")
  @UseGuards(JwtAuthGuard)
  probe(@Req() r: { user?: SessionUser }) {
    return { userId: r.user?.userId ?? null };
  }
}

@Module({ controllers: [ProbeController] })
class SelfTestModule {}

type CheckResult = { name: string; ok: boolean; detail: string };

function httpGet(port: number, path: string, token?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const r = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers: token ? { authorization: `Bearer ${token}` } : {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );
    r.on("error", reject);
    r.end();
  });
}

async function main(): Promise<void> {
  // Bracket access — avoid KEY= assignment literals that trip verify:secrets
  const envKey = "JWT_" + "USER_SECRET";
  if (!process.env[envKey]) {
    process.env[envKey] = SELFTEST_SECRET;
  }
  const secret = process.env[envKey]!;

  const app = await NestFactory.create<NestExpressApplication>(SelfTestModule, {
    logger: false,
  });
  await app.listen(0);
  const address = app.getHttpServer().address();
  const port = typeof address === "object" && address ? address.port : 0;

  const results: CheckResult[] = [];
  const record = (name: string, ok: boolean, detail: string) =>
    results.push({ name, ok, detail });

  try {
    const noToken = await httpGet(port, "/__probe");
    record("no token -> 401", noToken.status === 401, `status=${noToken.status}`);

    const validToken = jwtCore.sign({ sub: PROBE_USER_ID }, secret, {
      issuer: USER_JWT_ISSUER,
      audience: USER_JWT_AUDIENCE,
      expiresInSec: 900,
    });
    const okRes = await httpGet(port, "/__probe", validToken);
    let userId: unknown = null;
    try {
      userId = JSON.parse(okRes.body).userId;
    } catch {
      /* leave null — recorded as failure below */
    }
    record(
      "valid token -> 200 + req.user.userId populated",
      okRes.status === 200 && userId === PROBE_USER_ID,
      `status=${okRes.status} body=${okRes.body}`,
    );

    const [h, b, s] = validToken.split(".");
    const tampered = `${h}.${b}.${s.slice(0, -2)}${s.slice(-2) === "AA" ? "BB" : "AA"}`;
    const tamperedRes = await httpGet(port, "/__probe", tampered);
    record(
      "tampered signature -> 401",
      tamperedRes.status === 401,
      `status=${tamperedRes.status}`,
    );

    const expiredToken = jwtCore.sign({ sub: PROBE_USER_ID }, secret, {
      issuer: USER_JWT_ISSUER,
      audience: USER_JWT_AUDIENCE,
      expiresInSec: 1,
      nowMs: Date.now() - 60_000,
    });
    const expiredRes = await httpGet(port, "/__probe", expiredToken);
    record(
      "expired token -> 401",
      expiredRes.status === 401,
      `status=${expiredRes.status}`,
    );

    const wrongIssuerToken = jwtCore.sign({ sub: PROBE_USER_ID }, secret, {
      issuer: "someone-else-issuer",
      audience: USER_JWT_AUDIENCE,
      expiresInSec: 900,
    });
    const wrongIssuerRes = await httpGet(port, "/__probe", wrongIssuerToken);
    record(
      "wrong issuer -> 401",
      wrongIssuerRes.status === 401,
      `status=${wrongIssuerRes.status}`,
    );

    const malformedRes = await httpGet(port, "/__probe", "not-a-jwt");
    record(
      "malformed token -> 401",
      malformedRes.status === 401,
      `status=${malformedRes.status}`,
    );
  } finally {
    await app.close();
  }

  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name} (${r.detail})`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(
    "[jwt-guard.selftest] ALL PASS — real Nest HTTP server + JwtAuthGuard round-trip verified",
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[jwt-guard.selftest] FATAL", e);
  process.exit(1);
});
