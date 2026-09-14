/**
 * 실제 Nest HTTP · AdminSessionController. Guard 를 mock 하지 않음.
 * 제품 경로는 createUnreadyStaffStore 고정. 실DB 로그인 아님.
 */
"use strict";

require("../opportunities/catalog-external-write.ts-hook.cjs");

const http = require("node:http");
const path = require("node:path");
const { Module } = require("@nestjs/common");
const { APP_GUARD, NestFactory } = require("@nestjs/core");
const cookieParser = require("cookie-parser");

const { AdminGuard } = require("./admin.guard.ts");
const { AdminSessionController } = require("./admin-session.controller.ts");
const {
  USER_JWT_AUDIENCE,
  USER_JWT_ISSUER,
  USER_SESSION_COOKIE_NAME,
} = require("../auth/auth.constants.ts");

const jwtCore = require(path.join(__dirname, "..", "..", "jwt.core.cjs"));

const ADMIN_SECRET = "selftest_admin_secret_min_32_chars_ok!";
const USER_SECRET = "selftest_user_secret_min_32_chars_okay";

function call(port, method, urlPath, opts) {
  return new Promise((resolve, reject) => {
    const payload = opts && opts.body !== undefined ? JSON.stringify(opts.body) : null;
    const headers = Object.assign({}, opts && opts.headers);
    if (opts && opts.cookie) headers.cookie = opts.cookie;
    if (payload) {
      headers["content-type"] = "application/json";
      headers["content-length"] = Buffer.byteLength(payload);
    }
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

  class SelfTestModule {}
  Module({
    controllers: [AdminSessionController],
    providers: [{ provide: APP_GUARD, useClass: AdminGuard }],
  })(SelfTestModule);

  const app = await NestFactory.create(SelfTestModule, { logger: false });
  app.use(cookieParser());
  await app.listen(0);
  const address = app.getHttpServer().address();
  const port = typeof address === "object" && address ? address.port : 0;
  const results = [];
  const record = (name, ok, detail) => results.push({ name, ok, detail });

  try {
    const unready = await call(port, "POST", "/admin-session/login", {
      body: { email: "ops@example.com", password: "wrong-password" },
    });
    record(
      "store unready 503 even with password",
      unready.status === 503 && unready.body.includes("STORE_UNREADY"),
      `status=${unready.status} body=${unready.body}`,
    );
    record(
      "applied false not success",
      unready.body.includes("\"applied\":false") && !unready.body.includes("\"connected\":true"),
      unready.body,
    );
    record("token absent from json", !/"token"\s*:/.test(unready.body), unready.body);

    const queryBearer = await call(port, "POST", "/admin-session/login?access_token=x", {
      body: { email: "ops@example.com", password: "x" },
    });
    record("query bearer 401", queryBearer.status === 401, `status=${queryBearer.status}`);

    const userTok = jwtCore.sign({ sub: "11111111-1111-4111-8111-111111111111" }, USER_SECRET, {
      issuer: USER_JWT_ISSUER,
      audience: USER_JWT_AUDIENCE,
      expiresInSec: 900,
    });
    const userBody = await call(port, "POST", "/admin-session/login", {
      body: {
        email: "ops@example.com",
        password: "x",
        userAccessToken: userTok,
      },
    });
    record(
      "userAccessToken still store-unready (store checked first)",
      userBody.status === 503 && userBody.body.includes("STORE_UNREADY"),
      `status=${userBody.status}`,
    );
    const userCookie = await call(port, "POST", "/admin-session/login", {
      cookie: `${USER_SESSION_COOKIE_NAME}=${userTok}`,
      body: { email: "ops@example.com", password: "x" },
    });
    record(
      "user session cookie still store-unready",
      userCookie.status === 503 && userCookie.body.includes("STORE_UNREADY"),
      `status=${userCookie.status}`,
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
    `[admin-session-login.admin-http] ALL PASS — Nest HTTP store-unready (${results.length} checks; memory password path is isolation; real DB BLOCKED)`,
  );
}

main().catch((e) => {
  console.error("[admin-session-login.admin-http] FATAL", e);
  process.exit(1);
});
