/**
 * 실제 AdminGuard + capability 를 거치는 회원 조회 Nest HTTP.
 * DB/서비스는 fixture. Guard 를 mock 하지 않음. 실 Postgres 아님.
 */
"use strict";

require("../opportunities/catalog-external-write.ts-hook.cjs");

const http = require("node:http");
const path = require("node:path");
const { Module } = require("@nestjs/common");
const {
  BadRequestException,
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
const LIST_PATH = "/admin/users";

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
    const headers = Object.assign({}, opts && opts.headers);
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
    r.end();
  });
}

async function main() {
  process.env["JWT_" + "ADMIN_SECRET"] = ADMIN_SECRET;
  process.env["JWT_" + "USER_SECRET"] = USER_SECRET;

  const lookups = [];
  const stub = {
    searchUsers: async (input) => {
      lookups.push(input);
      const q = String((input && input.q) || "").trim();
      if (!q) {
        return {
          items: [
            {
              userId: USER_A,
              createdAt: "2026-09-16T00:00:00.000Z",
              username: "alpha",
              status: "active",
              emailMasked: "a***m",
              phoneMasked: "0***8",
              resellerId: "AAAA1111",
              membership: "sprout",
              signupIp: null,
            },
          ],
          nextCursor: null,
          exact: false,
          substituted: false,
        };
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q)) {
        throw new BadRequestException("q must be uuid");
      }
      if (q === MISSING) throw new NotFoundException("user not found");
      return {
        items: [{ userId: q, membership: "sprout", resellerId: "AAAA1111" }],
        nextCursor: null,
        exact: true,
        substituted: false,
      };
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
    const anon = await call(port, "GET", LIST_PATH);
    record("no auth 401", anon.status === 401, `status=${anon.status}`);
    record("no auth did not call service", lookups.length === 0, `n=${lookups.length}`);

    const userTok = jwtCore.sign({ sub: USER_A }, USER_SECRET, {
      issuer: USER_JWT_ISSUER,
      audience: USER_JWT_AUDIENCE,
      expiresInSec: 900,
    });
    const userOnAdmin = await call(port, "GET", `${LIST_PATH}?q=${USER_A}`, { token: userTok });
    record("user JWT 401", userOnAdmin.status === 401, `status=${userOnAdmin.status}`);

    const expired = await call(port, "GET", `${LIST_PATH}?q=${USER_A}`, {
      token: signAdmin("super", { expiresInSec: 1, nowMs: Date.now() - 120000 }),
    });
    record("expired admin 401", expired.status === 401, `status=${expired.status}`);

    const marketing = await call(port, "GET", `${LIST_PATH}?q=${USER_A}`, {
      token: signAdmin("marketing"),
    });
    record("marketing lacks users 403", marketing.status === 403, `status=${marketing.status}`);

    const emptyQ = await call(port, "GET", LIST_PATH, { token: signAdmin("super") });
    record(
      "empty q 200 production list",
      emptyQ.status === 200 && emptyQ.body.includes(USER_A),
      `status=${emptyQ.status} body=${emptyQ.body}`,
    );
    record(
      "empty q has createdAt and signupIp null",
      emptyQ.body.includes("createdAt") && emptyQ.body.includes("signupIp"),
      emptyQ.body,
    );

    const badQ = await call(port, "GET", `${LIST_PATH}?q=not-a-uuid`, { token: signAdmin("super") });
    record("invalid uuid 400", badQ.status === 400, `status=${badQ.status} body=${badQ.body}`);

    const nf = await call(port, "GET", `${LIST_PATH}?q=${MISSING}`, { token: signAdmin("super") });
    record("missing 404", nf.status === 404 && nf.body.includes("user not found"), `status=${nf.status}`);

    const ok = await call(port, "GET", `${LIST_PATH}?q=${USER_A}`, { token: signAdmin("super") });
    record("exact uuid 200", ok.status === 200, `status=${ok.status} body=${ok.body}`);
    record("exact returns resellerId", ok.body.includes("AAAA1111") && ok.body.includes("resellerId"), ok.body);
    record("min pii no email", !ok.body.includes("@") && ok.body.includes(USER_A), ok.body);
    record(
      "audit operator from token",
      lookups.some((x) => x.operatorId === ADMIN_ID && x.q === USER_A),
      JSON.stringify(lookups.slice(-1)),
    );

    const cookieTok = signAdmin("super");
    const csrf = mintAdminCsrfToken(cookieTok);
    const getNoCsrf = await call(port, "GET", `${LIST_PATH}?q=${USER_A}`, {
      cookie: `${ADMIN_SESSION_COOKIE_NAME}=${cookieTok}`,
    });
    record("GET cookie without CSRF allowed", getNoCsrf.status === 200, `status=${getNoCsrf.status}`);
    const getBadCsrf = await call(port, "GET", `${LIST_PATH}?q=${USER_A}`, {
      cookie: `${ADMIN_SESSION_COOKIE_NAME}=${cookieTok}; ${ADMIN_CSRF_COOKIE_NAME}=${csrf}`,
      headers: { [ADMIN_CSRF_HEADER]: "wrong" },
    });
    record(
      "GET ignores CSRF mismatch",
      getBadCsrf.status === 200,
      `status=${getBadCsrf.status}`,
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
    `[admin-member-directory.admin-http] ALL PASS — real AdminGuard Nest HTTP (${results.length} checks; not real Postgres)`,
  );
}

main().catch((e) => {
  console.error("[admin-member-directory.admin-http] FATAL", e);
  process.exit(1);
});
