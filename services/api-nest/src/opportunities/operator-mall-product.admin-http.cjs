"use strict";

require("./catalog-external-write.ts-hook.cjs");

const http = require("node:http");
const path = require("node:path");
const { Module } = require("@nestjs/common");
const { APP_GUARD, NestFactory } = require("@nestjs/core");
const cookieParser = require("cookie-parser");
const { AdminGuard } = require("../common/admin.guard.ts");
const { OpportunitiesAdminController } = require("./opportunities.admin.controller.ts");
const { OpportunitiesAdminService } = require("./opportunities.admin.service.ts");
const { CatalogRuntimeSeedService } = require("./catalog-runtime-seed.service.ts");
const { PriceOverrideService } = require("../price-override/price-override.service.ts");
const { OperatorMallProductAdminService } = require("./operator-mall-product.admin.service.ts");
const {
  ADMIN_JWT_AUDIENCE,
  ADMIN_JWT_ISSUER,
} = require("../auth/auth.constants.ts");
const {
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_CSRF_HEADER,
  ADMIN_SESSION_COOKIE_NAME,
  mintAdminCsrfToken,
} = require("../common/admin-session.csrf.ts");

const jwtCore = require(path.join(__dirname, "..", "..", "jwt.core.cjs"));
const isolated = require(path.join(__dirname, "..", "..", "isolated-qa-pg.cjs"));
const ADMIN_SECRET = "selftest_admin_secret_min_32_chars_ok!";
const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PATH = "/admin/opportunities/operator-products";

function signAdmin(role) {
  return jwtCore.sign({ sub: ADMIN_ID, role }, ADMIN_SECRET, {
    issuer: ADMIN_JWT_ISSUER,
    audience: ADMIN_JWT_AUDIENCE,
    expiresInSec: 900,
  });
}

function call(port, method, urlPath, opts) {
  return new Promise((resolve, reject) => {
    const payload = opts && opts.body !== undefined ? JSON.stringify(opts.body) : null;
    const headers = Object.assign({}, opts && opts.headers);
    if (payload) {
      headers["content-type"] = "application/json";
      headers["content-length"] = Buffer.byteLength(payload);
    }
    if (opts && opts.token) headers.authorization = "Bearer " + opts.token;
    if (opts && opts.cookie) headers.cookie = opts.cookie;
    const r = http.request({ host: "127.0.0.1", port, path: urlPath, method, headers }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  isolated.pinUnreadyIsolatedEnv(process.env);
  process.env["JWT_" + "ADMIN_SECRET"] = ADMIN_SECRET;
  class SelfTestModule {}
  Module({
    controllers: [OpportunitiesAdminController],
    providers: [
      { provide: APP_GUARD, useClass: AdminGuard },
      { provide: OpportunitiesAdminService, useValue: {} },
      { provide: CatalogRuntimeSeedService, useValue: {} },
      { provide: PriceOverrideService, useValue: {} },
      OperatorMallProductAdminService,
    ],
  })(SelfTestModule);

  const app = await NestFactory.create(SelfTestModule, { logger: false });
  app.use(cookieParser());
  await app.listen(0);
  const port = app.getHttpServer().address().port;
  const results = [];
  const record = (name, ok, detail) => results.push({ name, ok, detail });
  const body = {
    name: "card-2",
    compositionQty: 2,
    payoutAmount: "12.5",
    currency: "USDT",
    visibility: "all_public",
  };

  try {
    const anon = await call(port, "POST", PATH, { body });
    record("anon 401", anon.status === 401, String(anon.status));

    const marketing = signAdmin("marketing");
    const csrfM = mintAdminCsrfToken(marketing);
    const forbid = await call(port, "POST", PATH, {
      token: marketing,
      cookie: ADMIN_SESSION_COOKIE_NAME + "=" + marketing + "; " + ADMIN_CSRF_COOKIE_NAME + "=" + csrfM,
      headers: { [ADMIN_CSRF_HEADER]: csrfM },
      body,
    });
    record("marketing 403", forbid.status === 403, String(forbid.status));

    const superTok = signAdmin("super");
    const csrf = mintAdminCsrfToken(superTok);
    const unready = await call(port, "POST", PATH, {
      token: superTok,
      cookie: ADMIN_SESSION_COOKIE_NAME + "=" + superTok + "; " + ADMIN_CSRF_COOKIE_NAME + "=" + csrf,
      headers: { [ADMIN_CSRF_HEADER]: csrf },
      body,
    });
    record(
      "store unready 503 applied false",
      unready.status === 503 && unready.body.includes("STORE_UNREADY") && unready.body.includes("\"applied\":false"),
      unready.body,
    );
  } finally {
    await app.close();
  }

  for (const r of results) console.log((r.ok ? "PASS" : "FAIL") + " - " + r.name);
  if (results.some((r) => !r.ok)) process.exit(1);
  console.log("[operator-mall-product.admin-http] ALL PASS — Nest HTTP unready (not real DB)");
}

main().catch((e) => {
  console.error("[operator-mall-product.admin-http] FATAL", e);
  process.exit(1);
});
