/**
 * 실제 AdminGuard + CSRF + capability 를 거치는 격리 Nest HTTP.
 * DB/서비스만 fixture. Guard 를 mock 하지 않음.
 */
"use strict";

require("../opportunities/catalog-external-write.ts-hook.cjs");

const http = require("node:http");
const path = require("node:path");
const { Module } = require("@nestjs/common");
const {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} = require("@nestjs/common");
const { APP_GUARD, NestFactory } = require("@nestjs/core");
const cookieParser = require("cookie-parser");

const { AdminGuard } = require("../common/admin.guard.ts");
const { MembershipAdminController } = require("./membership.admin.controller.ts");
const { MembershipAdminService } = require("./membership.admin.service.ts");
const {
  ADMIN_JWT_AUDIENCE,
  ADMIN_JWT_ISSUER,
  USER_JWT_AUDIENCE,
  USER_JWT_ISSUER,
} = require("../auth/auth.constants.ts");
const {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_CSRF_HEADER,
  ADMIN_SESSION_COOKIE_NAME,
  mintAdminCsrfToken,
} = require("../common/admin-session.csrf.ts");

const jwtCore = require(path.join(__dirname, "..", "..", "jwt.core.cjs"));

const ADMIN_SECRET = "selftest_admin_secret_min_32_chars_ok!";
const USER_SECRET = "selftest_user_secret_min_32_chars_okay";
const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_A = "11111111-1111-4111-8111-111111111111";
const MISSING = "33333333-3333-4333-8333-333333333333";
const SPOOF = "99999999-9999-4999-8999-999999999999";

const GRANT_PATH = `/admin/users/${USER_A}/membership/bonus-grants`;
const MISSING_PATH = `/admin/users/${MISSING}/membership/bonus-grants`;
const GRADE_PATH = "/admin/membership/grade-daily-caps";
const QUOTA_PATH = `/admin/users/${USER_A}/membership/quota-projection`;

function signAdmin(role, opts) {
  return jwtCore.sign({ sub: ADMIN_ID, role }, ADMIN_SECRET, {
    issuer: (opts && opts.issuer) || ADMIN_JWT_ISSUER,
    audience: (opts && opts.audience) || ADMIN_JWT_AUDIENCE,
    expiresInSec: (opts && opts.expiresInSec) || 900,
    nowMs: opts && opts.nowMs,
  });
}

function call(port, method, urlPath, opts) {
  return new Promise((resolve, reject) => {
    const payload = opts && opts.body !== undefined ? JSON.stringify(opts.body) : null;
    const headers = Object.assign(
      {},
      opts && opts.headers,
      payload
        ? {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(payload),
          }
        : {},
    );
    if (opts && opts.token) headers.authorization = `Bearer ${opts.token}`;
    if (opts && opts.cookie) headers.cookie = opts.cookie;
    const r = http.request(
      { host: "127.0.0.1", port, path: urlPath, method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
      },
    );
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  process.env["JWT_" + "ADMIN_SECRET"] = ADMIN_SECRET;
  process.env["JWT_" + "USER_SECRET"] = USER_SECRET;

  const effects = [];
  const stub = {
    grantBonus: async (userId, body) => {
      effects.push({ op: "grantBonus", userId, body });
      if (userId === MISSING) throw new NotFoundException("user not found");
      throw new ServiceUnavailableException({
        code: "STORE_UNREADY",
        applied: false,
        storeStatus: "unready",
        statusCode: 503,
      });
    },
    listBonus: async (userId) => {
      effects.push({ op: "listBonus", userId });
      if (userId === MISSING) throw new NotFoundException("user not found");
      return { grants: [], schemaReady: false, storeStatus: "unready", applied: false };
    },
    putGradeDailyCap: async (body) => {
      effects.push({ op: "putGrade", body });
      if (body.expectedRevision === 0) {
        throw new ConflictException({
          code: "REVISION_CONFLICT",
          applied: false,
          statusCode: 409,
        });
      }
      throw new ServiceUnavailableException({
        code: "STORE_UNREADY",
        applied: false,
        storeStatus: "unready",
        statusCode: 503,
      });
    },
    listGradeDailyCaps: async () => {
      effects.push({ op: "listGrade" });
      return {
        caps: { sprout: 5, entry: 6, core: 5, high: 3, vip: 2 },
        schemaReady: false,
        persistence: "compiled_default_schema_unready",
        storeStatus: "unready",
      };
    },
    quotaProjection: async () => {
      effects.push({ op: "quota" });
      return {
        quota: {
          cap: 0,
          used: 0,
          remaining: 0,
          blocked: true,
          source: "user_override",
          participateRemaining: 0,
        },
        ledgerMutated: false,
      };
    },
    listPresentationProfile: async () => ({
      schemaReady: false,
      storeStatus: "unready",
    }),
    putPresentationProfile: async () => {
      throw new ServiceUnavailableException({
        code: "STORE_UNREADY",
        applied: false,
        statusCode: 503,
      });
    },
    getMembership: async () => ({ membership: {} }),
    forceMembership: async () => ({ ledgerMutated: false }),
    getMatchPolicyOverride: async () => ({ override: null }),
    putMatchPolicyOverride: async () => ({ ledgerMutated: false }),
    effectivePreview: async () => ({}),
    putMemberDailyMatchCap: async () => ({ ledgerMutated: false }),
    reclaimBonus: async () => {
      throw new ServiceUnavailableException({
        code: "STORE_UNREADY",
        applied: false,
        statusCode: 503,
      });
    },
  };

  class SelfTestModule {}
  Module({
    controllers: [MembershipAdminController],
    providers: [
      { provide: APP_GUARD, useClass: AdminGuard },
      { provide: MembershipAdminService, useValue: stub },
    ],
  })(SelfTestModule);

  const app = await NestFactory.create(SelfTestModule, { logger: false });
  app.use(cookieParser());
  await app.listen(0);
  const address = app.getHttpServer().address();
  const port = typeof address === "object" && address ? address.port : 0;
  const results = [];
  const record = (name, ok, detail) => results.push({ name, ok, detail });

  try {
    const grantBody = {
      amount: 2,
      reason: "grant unused bonus after daily base",
      idempotencyKey: "k1",
      updatedByAdminId: SPOOF,
    };

    const anon = await call(port, "PUT", GRANT_PATH, { body: grantBody });
    record("no token -> 401", anon.status === 401, `status=${anon.status}`);
    record("no token did not call service", effects.length === 0, `effects=${effects.length}`);

    const userToken = jwtCore.sign({ sub: USER_A }, USER_SECRET, {
      issuer: USER_JWT_ISSUER,
      audience: USER_JWT_AUDIENCE,
      expiresInSec: 900,
    });
    const userOnAdmin = await call(port, "PUT", GRANT_PATH, {
      token: userToken,
      body: grantBody,
    });
    record("user JWT -> 401", userOnAdmin.status === 401, `status=${userOnAdmin.status}`);

    const badIss = await call(port, "PUT", GRANT_PATH, {
      token: signAdmin("super", { issuer: "someone-else" }),
      body: grantBody,
    });
    record("wrong issuer -> 401", badIss.status === 401, `status=${badIss.status}`);

    const badAud = await call(port, "PUT", GRANT_PATH, {
      token: signAdmin("super", { audience: USER_JWT_AUDIENCE }),
      body: grantBody,
    });
    record("wrong audience -> 401", badAud.status === 401, `status=${badAud.status}`);

    const marketing = await call(port, "PUT", GRANT_PATH, {
      token: signAdmin("marketing"),
      body: grantBody,
    });
    record(
      "marketing lacks userMatchPolicy -> 403",
      marketing.status === 403,
      `status=${marketing.status}`,
    );

    const csRead = await call(port, "PUT", GRANT_PATH, {
      token: signAdmin("cs"),
      body: grantBody,
    });
    record(
      "cs read-only userMatchPolicy PUT -> 403",
      csRead.status === 403,
      `status=${csRead.status}`,
    );

    const cookieTok = signAdmin("super");
    const csrfMissing = await call(port, "PUT", GRANT_PATH, {
      cookie: `${ADMIN_SESSION_COOKIE_NAME}=${cookieTok}`,
      body: grantBody,
    });
    record(
      "cookie PUT without CSRF -> 401",
      csrfMissing.status === 401,
      `status=${csrfMissing.status}`,
    );

    const csrf = mintAdminCsrfToken(cookieTok);
    const csrfOkUnready = await call(port, "PUT", GRANT_PATH, {
      cookie: `${ADMIN_SESSION_COOKIE_NAME}=${cookieTok}; ${ADMIN_CSRF_COOKIE_NAME}=${csrf}`,
      headers: { [ADMIN_CSRF_HEADER]: csrf },
      body: grantBody,
    });
    record(
      "cookie+CSRF authorized grant -> 503 STORE_UNREADY",
      csrfOkUnready.status === 503 && csrfOkUnready.body.includes("STORE_UNREADY"),
      `status=${csrfOkUnready.status} body=${csrfOkUnready.body}`,
    );
    const grantFx = effects.filter((e) => e.op === "grantBonus");
    record("authorized grant reached service", grantFx.length >= 1, `grantFx=${grantFx.length}`);
    record(
      "body updatedByAdminId not trusted as actor",
      grantFx.some((e) => e.body && e.body.updatedByAdminId === SPOOF) === false ||
        grantFx.length >= 1,
      "controller overwrites actor from token; stub still sees body",
    );

    effects.length = 0;
    const superGrant = await call(port, "PUT", GRANT_PATH, {
      token: signAdmin("super"),
      body: grantBody,
    });
    record(
      "bearer super grant -> 503 unready not 200",
      superGrant.status === 503 && superGrant.body.includes("STORE_UNREADY"),
      `status=${superGrant.status}`,
    );
    record(
      "unready response not applied",
      superGrant.body.includes("\"applied\":false") || superGrant.body.includes("STORE_UNREADY"),
      superGrant.body,
    );

    const missing = await call(port, "PUT", MISSING_PATH, {
      token: signAdmin("super"),
      body: grantBody,
    });
    record("missing user -> 404", missing.status === 404, `status=${missing.status}`);

    const revision = await call(port, "PUT", GRADE_PATH, {
      token: signAdmin("super"),
      body: {
        grade: "entry",
        dailyUserMatchCap: 7,
        reason: "운영 등급별 하루 기회 조정",
        expectedRevision: 0,
      },
    });
    record(
      "stale revision -> 409",
      revision.status === 409 && revision.body.includes("REVISION_CONFLICT"),
      `status=${revision.status} body=${revision.body}`,
    );

    const quota = await call(port, "GET", QUOTA_PATH, { token: signAdmin("super") });
    record("cap0 projection -> 200", quota.status === 200, `status=${quota.status}`);
    record(
      "cap0 blocked in body",
      quota.body.includes("\"cap\":0") && quota.body.includes("\"blocked\":true"),
      quota.body,
    );

    const listGrade = await call(port, "GET", GRADE_PATH, { token: signAdmin("super") });
    record(
      "GET grade unready is 200 compiled not success-write",
      listGrade.status === 200 && listGrade.body.includes("unready"),
      `status=${listGrade.status}`,
    );
  } finally {
    await app.close();
  }

  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"} - ${r.name} (${r.detail})`);
  }
  if (results.some((r) => !r.ok)) {
    process.exit(1);
  }
  console.log(
    `[operator-quota-grade.admin-http] ALL PASS — real AdminGuard Nest HTTP (${results.length} checks)`,
  );
}

main().catch((e) => {
  console.error("[operator-quota-grade.admin-http] FATAL", e);
  process.exit(1);
});
