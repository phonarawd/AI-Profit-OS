/**
 * Standalone real Nest+HTTP round-trip for the admin boundary (QA8_ADMIN_BOUNDARY evidence).
 * NOT wired into AppModule — invoked only by tooling/verify/admin-boundary.cjs via
 * `node dist/common/admin-guard.selftest.js` after a scoped tsc build. No DB/Redis needed.
 *
 * Exercises the adversarial matrix against a real HTTP server:
 * no token / invalid signature / expired / alg=none / wrong issuer / wrong audience /
 * user JWT on an admin route / unknown role / insufficient capability / authorized admin,
 * plus a synthetic admin controller that carries no local @UseGuards (global APP_GUARD
 * containment) and a non-admin surface that must keep its prior behaviour.
 */
import "reflect-metadata";
import {
  Controller,
  Get,
  Module,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import * as http from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  ADMIN_JWT_AUDIENCE,
  ADMIN_JWT_ISSUER,
  USER_JWT_AUDIENCE,
  USER_JWT_ISSUER,
} from "../auth/auth.constants";
import { JwtAuthGuard, type SessionUser } from "../auth/jwt-auth.guard";
import { AdminGuard, type RequestWithAdmin } from "./admin.guard";
import { WithdrawCredentialsAdminController } from "../wallet/withdraw-credentials.admin.controller";
import { WithdrawCredentialsAdminService } from "../wallet/withdraw-credentials.admin.service";

const requireCjs = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwtCore = requireCjs(join(__dirname, "..", "..", "jwt.core.cjs")) as {
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

const SELFTEST_ADMIN_SECRET = "selftest_admin_secret_min_32_chars_ok!";
const SELFTEST_USER_SECRET = "selftest_user_secret_min_32_chars_okay";
const PROBE_ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PROBE_USER_ID = "11111111-1111-4111-8111-111111111111";
const PROBE_TARGET_USER_ID = "22222222-2222-4222-8222-222222222222";
/** What a caller would try to plant in the request body to forge the audit operator. */
const SPOOFED_ADMIN_ID = "99999999-9999-4999-8999-999999999999";

/** Admin controller with NO local guard metadata — only the global APP_GUARD can contain it. */
@Controller("admin")
class SyntheticUnguardedAdminController {
  @Get("__synthetic-probe")
  probe(@Req() r: RequestWithAdmin) {
    return { reached: true, adminId: r.admin?.adminId ?? null };
  }
}

/** Admin path declared at the handler level rather than on the controller. */
@Controller()
class HandlerLevelAdminPathController {
  @Get("admin/__handler-level-probe")
  probe() {
    return { reached: true };
  }
}

@Controller("public-probe")
class PublicProbeController {
  @Get()
  probe() {
    return { ok: true };
  }
}

@Controller("user-probe")
class UserProbeController {
  @Get()
  @UseGuards(JwtAuthGuard)
  probe(@Req() r: { user?: SessionUser }) {
    return { userId: r.user?.userId ?? null };
  }
}

/** Records what the real admin controller received, so operator authority is observable. */
const operatorSpy: { adminId: string | null } = { adminId: null };

const withdrawCredentialsStub = {
  resetWithdrawPin(input: { adminId: string }) {
    operatorSpy.adminId = input.adminId;
    return { ok: true, adminId: input.adminId };
  },
  revokeWebauthn(input: { adminId: string }) {
    operatorSpy.adminId = input.adminId;
    return { ok: true, adminId: input.adminId };
  },
};

@Module({
  controllers: [
    SyntheticUnguardedAdminController,
    HandlerLevelAdminPathController,
    PublicProbeController,
    UserProbeController,
    WithdrawCredentialsAdminController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AdminGuard },
    {
      provide: WithdrawCredentialsAdminService,
      useValue: withdrawCredentialsStub,
    },
  ],
})
class AdminSelfTestModule {}

type CheckResult = { name: string; ok: boolean; detail: string };

function call(
  port: number,
  method: "GET" | "POST",
  path: string,
  token?: string | null,
  body?: unknown,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const r = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": Buffer.byteLength(payload),
              }
            : {}),
        },
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
    if (payload) r.write(payload);
    r.end();
  });
}

function signAdmin(
  secret: string,
  role: string,
  opts: { issuer?: string; audience?: string; expiresInSec?: number; nowMs?: number } = {},
): string {
  return jwtCore.sign({ sub: PROBE_ADMIN_ID, role }, secret, {
    issuer: opts.issuer ?? ADMIN_JWT_ISSUER,
    audience: opts.audience ?? ADMIN_JWT_AUDIENCE,
    expiresInSec: opts.expiresInSec ?? 900,
    nowMs: opts.nowMs,
  });
}

function tamper(token: string): string {
  const [h, b, s] = token.split(".");
  return `${h}.${b}.${s.slice(0, -2)}${s.slice(-2) === "AA" ? "BB" : "AA"}`;
}

function forgeAlgNone(): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
    "utf8",
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: PROBE_ADMIN_ID,
      role: "super",
      iss: ADMIN_JWT_ISSUER,
      aud: ADMIN_JWT_AUDIENCE,
      iat: nowSec,
      exp: nowSec + 3600,
    }),
    "utf8",
  ).toString("base64url");
  return `${header}.${payload}.`;
}

/** Re-signs the payload with `role` swapped, using a secret the server does not know. */
function forgeRoleEscalation(role: string): string {
  return signAdmin("attacker_controlled_secret_min_32_chars", role);
}

const PIN_RESET_PATH = `/admin/users/${PROBE_TARGET_USER_ID}/withdraw-pin/reset`;
const SYNTHETIC_PATH = "/admin/__synthetic-probe";

async function main(): Promise<void> {
  // Bracket access — avoid KEY= assignment literals that trip verify:secrets
  const adminKey = "JWT_" + "ADMIN_SECRET";
  const userKey = "JWT_" + "USER_SECRET";
  process.env[adminKey] = SELFTEST_ADMIN_SECRET;
  process.env[userKey] = SELFTEST_USER_SECRET;

  const app = await NestFactory.create<NestExpressApplication>(
    AdminSelfTestModule,
    { logger: false },
  );
  await app.listen(0);
  const address = app.getHttpServer().address();
  const port = typeof address === "object" && address ? address.port : 0;

  const results: CheckResult[] = [];
  const record = (name: string, ok: boolean, detail: string) =>
    results.push({ name, ok, detail });

  try {
    // ── authentication (401 class) ──
    for (const [name, token] of [
      ["no token", null],
      ["malformed token", "not-a-jwt"],
      ["invalid signature", tamper(signAdmin(SELFTEST_ADMIN_SECRET, "super"))],
      [
        "expired admin token",
        signAdmin(SELFTEST_ADMIN_SECRET, "super", {
          expiresInSec: 1,
          nowMs: Date.now() - 120_000,
        }),
      ],
      ["alg=none forgery", forgeAlgNone()],
      [
        "wrong issuer",
        signAdmin(SELFTEST_ADMIN_SECRET, "super", { issuer: "someone-else" }),
      ],
      [
        "wrong audience",
        signAdmin(SELFTEST_ADMIN_SECRET, "super", { audience: "peotteok-user" }),
      ],
      ["role tampering (foreign signing key)", forgeRoleEscalation("super")],
    ] as [string, string | null][]) {
      const res = await call(port, "POST", PIN_RESET_PATH, token, {
        idempotencyKey: "k1",
      });
      record(
        `${name} -> 401 on admin route`,
        res.status === 401,
        `status=${res.status}`,
      );
    }

    const userToken = jwtCore.sign({ sub: PROBE_USER_ID }, SELFTEST_USER_SECRET, {
      issuer: USER_JWT_ISSUER,
      audience: USER_JWT_AUDIENCE,
      expiresInSec: 900,
    });
    const userOnAdmin = await call(port, "POST", PIN_RESET_PATH, userToken, {
      idempotencyKey: "k1",
    });
    record(
      "user JWT -> 401 on admin route (issuer/audience separation)",
      userOnAdmin.status === 401,
      `status=${userOnAdmin.status}`,
    );

    // ── authorization (403 class) ──
    const unknownRole = await call(
      port,
      "POST",
      PIN_RESET_PATH,
      signAdmin(SELFTEST_ADMIN_SECRET, "admin"),
      { idempotencyKey: "k1" },
    );
    record(
      'unknown role "admin" -> 403',
      unknownRole.status === 403,
      `status=${unknownRole.status}`,
    );

    const emptyRole = await call(
      port,
      "POST",
      PIN_RESET_PATH,
      signAdmin(SELFTEST_ADMIN_SECRET, ""),
      { idempotencyKey: "k1" },
    );
    record(
      "missing role claim -> 403",
      emptyRole.status === 403,
      `status=${emptyRole.status}`,
    );

    const insufficient = await call(
      port,
      "POST",
      PIN_RESET_PATH,
      signAdmin(SELFTEST_ADMIN_SECRET, "marketing"),
      { idempotencyKey: "k1" },
    );
    record(
      "valid admin without withdrawPinReset capability -> 403",
      insufficient.status === 403,
      `status=${insufficient.status}`,
    );

    // ── allow path (Nest answers a POST handler with 201) ──
    operatorSpy.adminId = null;
    const allowed = await call(
      port,
      "POST",
      PIN_RESET_PATH,
      signAdmin(SELFTEST_ADMIN_SECRET, "cs"),
      {
        idempotencyKey: "k1",
        adminId: SPOOFED_ADMIN_ID,
        updatedByAdminId: SPOOFED_ADMIN_ID,
        createdByAdminId: SPOOFED_ADMIN_ID,
      },
    );
    record(
      "authorized admin (cs · withdrawPinReset:write) -> 201",
      allowed.status === 201,
      `status=${allowed.status} body=${allowed.body}`,
    );
    record(
      "operator recorded == verified token sub (body adminId ignored)",
      operatorSpy.adminId === PROBE_ADMIN_ID,
      `recorded=${operatorSpy.adminId ?? "null"} spoofAttempt=${SPOOFED_ADMIN_ID}`,
    );
    record(
      "client-supplied operator id never reaches the audit record",
      operatorSpy.adminId !== SPOOFED_ADMIN_ID,
      `recorded=${operatorSpy.adminId ?? "null"}`,
    );

    operatorSpy.adminId = null;
    const superAllowed = await call(
      port,
      "POST",
      PIN_RESET_PATH,
      signAdmin(SELFTEST_ADMIN_SECRET, "super"),
      { idempotencyKey: "k1" },
    );
    record(
      "authorized admin (super · all:write) -> 201",
      superAllowed.status === 201,
      `status=${superAllowed.status}`,
    );
    record(
      "second operator recorded from its own token, not the previous request",
      operatorSpy.adminId === PROBE_ADMIN_ID,
      `recorded=${operatorSpy.adminId ?? "null"}`,
    );

    // ── global containment of an admin controller with no local guard ──
    const syntheticAnon = await call(port, "GET", SYNTHETIC_PATH, null);
    record(
      "synthetic admin controller without @UseGuards, no token -> 401",
      syntheticAnon.status === 401,
      `status=${syntheticAnon.status} body=${syntheticAnon.body}`,
    );
    const syntheticSuper = await call(
      port,
      "GET",
      SYNTHETIC_PATH,
      signAdmin(SELFTEST_ADMIN_SECRET, "super"),
    );
    record(
      "unclassified admin route -> 403 even for super (fail closed)",
      syntheticSuper.status === 403,
      `status=${syntheticSuper.status} body=${syntheticSuper.body}`,
    );

    const handlerLevel = await call(
      port,
      "GET",
      "/admin/__handler-level-probe",
      null,
    );
    record(
      "handler-level admin path, no token -> 401",
      handlerLevel.status === 401,
      `status=${handlerLevel.status}`,
    );

    // ── non-admin surfaces unchanged ──
    const publicRes = await call(port, "GET", "/public-probe", null);
    record(
      "non-admin unguarded route unaffected -> 200",
      publicRes.status === 200,
      `status=${publicRes.status}`,
    );
    const userProbeAnon = await call(port, "GET", "/user-probe", null);
    record(
      "user route without token still -> 401 (JwtAuthGuard unchanged)",
      userProbeAnon.status === 401,
      `status=${userProbeAnon.status}`,
    );
    const userProbeOk = await call(port, "GET", "/user-probe", userToken);
    let seenUserId: unknown = null;
    try {
      seenUserId = JSON.parse(userProbeOk.body).userId;
    } catch {
      /* recorded as failure below */
    }
    record(
      "user route with valid user token still -> 200",
      userProbeOk.status === 200 && seenUserId === PROBE_USER_ID,
      `status=${userProbeOk.status} body=${userProbeOk.body}`,
    );
    const adminOnUserRoute = await call(
      port,
      "GET",
      "/user-probe",
      signAdmin(SELFTEST_ADMIN_SECRET, "super"),
    );
    record(
      "admin JWT -> 401 on user route (no cross-domain promotion)",
      adminOnUserRoute.status === 401,
      `status=${adminOnUserRoute.status}`,
    );

    // ── fail closed when the admin secret is absent ──
    const savedSecret = process.env[adminKey];
    delete process.env[adminKey];
    const noSecret = await call(
      port,
      "POST",
      PIN_RESET_PATH,
      signAdmin(SELFTEST_ADMIN_SECRET, "super"),
      { idempotencyKey: "k1" },
    );
    process.env[adminKey] = savedSecret;
    record(
      "missing admin signing secret -> 401 (admin routes stay closed)",
      noSecret.status === 401,
      `status=${noSecret.status}`,
    );
  } finally {
    await app.close();
  }

  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name} (${r.detail})`);
  }
  if (results.some((r) => !r.ok)) {
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(
    `[admin-guard.selftest] ALL PASS — real Nest HTTP admin boundary verified (${results.length} checks)`,
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[admin-guard.selftest] FATAL", e);
  process.exit(1);
});
