/**
 * GHA hosted runner 일회용 PostgreSQL 실검증.
 * mock/memory 로 대체하지 않는다. 운영 DATABASE_URL / 운영 Supabase 금지.
 * 연결 문자열·비밀번호를 출력하지 않는다.
 */
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
require(path.join(root, "services/api-nest/src/opportunities/catalog-external-write.ts-hook.cjs"));

const isolated = require(path.join(root, "services/api-nest/isolated-qa-pg.cjs"));
const mall = require(path.join(
  root,
  "services/api-nest/src/opportunities/operator-mall-product.core.cjs",
));
const persist = require(path.join(
  root,
  "services/api-nest/src/opportunities/operator-mall-product.persist.cjs",
));
const officialLedger = require(path.join(root, "tooling/verify/operator-mall-official-ledger-sql.cjs"));
const moneyAuth = require(
  path.join(root, "services/api-nest/src/ledger/money-authority.core.cjs"),
);
const staffPersist = require(path.join(root, "services/api-nest/admin-staff-login.persist.cjs"));
const dirPersist = require(path.join(
  root,
  "services/api-nest/src/membership/admin-member-directory.persist.cjs",
));
const dirCore = require(path.join(
  root,
  "services/api-nest/src/membership/admin-member-directory.core.cjs",
));
const { createRequire } = require("node:module");
const nestRequire = createRequire(path.join(root, "services/api-nest/package.json"));
const { mintReferralCode, uniqueViolationTarget } = require(
  path.join(root, "services/api-nest/src/referral/referral-code.util.ts"),
);
const { hashPassword } = require(
  path.join(root, "services/api-nest/src/auth/password-hash.ts"),
);

let nestHttp = null;
function loadNestHttp() {
  if (nestHttp) return nestHttp;
  const { Module } = nestRequire("@nestjs/common");
  const { APP_GUARD, NestFactory } = nestRequire("@nestjs/core");
  const cookieParser = nestRequire("cookie-parser");
  nestHttp = {
    Module,
    APP_GUARD,
    NestFactory,
    cookieParser,
    AdminGuard: require(path.join(root, "services/api-nest/src/common/admin.guard.ts")).AdminGuard,
    OpportunitiesAdminController: require(
      path.join(root, "services/api-nest/src/opportunities/opportunities.admin.controller.ts"),
    ).OpportunitiesAdminController,
    OpportunitiesAdminService: require(
      path.join(root, "services/api-nest/src/opportunities/opportunities.admin.service.ts"),
    ).OpportunitiesAdminService,
    CatalogRuntimeSeedService: require(
      path.join(root, "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts"),
    ).CatalogRuntimeSeedService,
    PriceOverrideService: require(
      path.join(root, "services/api-nest/src/price-override/price-override.service.ts"),
    ).PriceOverrideService,
    OperatorMallProductAdminService: require(
      path.join(root, "services/api-nest/src/opportunities/operator-mall-product.admin.service.ts"),
    ).OperatorMallProductAdminService,
    AdminSessionController: require(
      path.join(root, "services/api-nest/src/common/admin-session.controller.ts"),
    ).AdminSessionController,
    MembershipAdminController: require(
      path.join(root, "services/api-nest/src/membership/membership.admin.controller.ts"),
    ).MembershipAdminController,
    MembershipAdminService: require(
      path.join(root, "services/api-nest/src/membership/membership.admin.service.ts"),
    ).MembershipAdminService,
    PostgresService: require(path.join(root, "services/api-nest/src/db/postgres.ts")).PostgresService,
    InProcessEventBus: require(
      path.join(root, "services/api-nest/src/events/in-process.bus.ts"),
    ).InProcessEventBus,
    MembershipRuntimeService: require(
      path.join(root, "services/api-nest/src/membership/membership.runtime.service.ts"),
    ).MembershipRuntimeService,
    csrf: require(path.join(root, "services/api-nest/src/common/admin-session.csrf.ts")),
    JwtAuthGuard: require(path.join(root, "services/api-nest/src/auth/jwt-auth.guard.ts"))
      .JwtAuthGuard,
    LedgerUserController: require(
      path.join(root, "services/api-nest/src/ledger/ledger.user.controller.ts"),
    ).LedgerUserController,
    LedgerUserQueryService: require(
      path.join(root, "services/api-nest/src/ledger/ledger.user-query.service.ts"),
    ).LedgerUserQueryService,
    authConstants: require(path.join(root, "services/api-nest/src/auth/auth.constants.ts")),
    jwtCore: require(path.join(root, "services/api-nest/jwt.core.cjs")),
  };
  return nestHttp;
}

const ARTIFACT_DIR = path.join(root, "_tmp_operator_mall_gha");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const STAFF_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STAFF_EMAIL = "qa-staff@qa.invalid";

const DRAFTS = [
  "quality/migrations-draft/qa-gha-ephemeral-prereq.v1.sql",
  "quality/migrations-draft/20260913220000_opportunities_supply_source.sql",
  "quality/migrations-draft/20260915070000_operator_mall_product.sql",
  "quality/migrations-draft/20260915080000_admin_staff_credentials.sql",
];

function fail(msg) {
  console.error("[operator-mall-gha-pg] FAIL " + msg);
  process.exit(1);
}

function redact(text) {
  return isolated.redactCredentials(String(text || ""));
}

function resolvedOrDie() {
  const resolved = isolated.resolveIsolatedQaPgUrl(process.env);
  if (resolved.allowed !== true) {
    fail("isolated QA URL denied: " + (resolved.denied || "unset"));
  }
  if (isolated.isOpsDbTarget(process.env)) {
    fail("ops supabase ref detected — abort");
  }
  if (String(process.env.DATABASE_URL || "").trim()) {
    fail("DATABASE_URL is set — this job must not use app DATABASE_URL");
  }
  return resolved;
}

function splitSql(text) {
  return String(text)
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const body = s
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("--"));
      return body.length > 0;
    });
}

async function applySqlFile(db, rel) {
  const abs = path.join(root, rel);
  const text = fs.readFileSync(abs, "utf8");
  const stmts = splitSql(text);
  for (const stmt of stmts) {
    try {
      await db.query(stmt);
    } catch (err) {
      fail("SQL apply error in " + rel + ": " + redact(err && err.message));
    }
  }
}

function callHttp(port, method, urlPath, opts) {
  return new Promise((resolve, reject) => {
    const payload = opts && opts.body !== undefined ? JSON.stringify(opts.body) : null;
    const headers = Object.assign({}, opts && opts.headers);
    if (payload) {
      headers["content-type"] = "application/json";
      headers["content-length"] = Buffer.byteLength(payload);
    }
    if (opts && opts.cookie) headers.cookie = opts.cookie;
    const r = http.request(
      { host: "127.0.0.1", port, path: urlPath, method, headers },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode || 0, body: data, json });
        });
      },
    );
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function bootMallApp() {
  const n = loadNestHttp();
  class MallQaModule {}
  n.Module({
    controllers: [n.OpportunitiesAdminController],
    providers: [
      { provide: n.APP_GUARD, useClass: n.AdminGuard },
      { provide: n.OpportunitiesAdminService, useValue: {} },
      { provide: n.CatalogRuntimeSeedService, useValue: {} },
      { provide: n.PriceOverrideService, useValue: {} },
      n.OperatorMallProductAdminService,
    ],
  })(MallQaModule);
  const app = await n.NestFactory.create(MallQaModule, { logger: false });
  app.use(n.cookieParser());
  await app.listen(0);
  return app;
}

async function bootLoginApp() {
  const n = loadNestHttp();
  class LoginQaModule {}
  n.Module({
    controllers: [n.AdminSessionController],
    providers: [{ provide: n.APP_GUARD, useClass: n.AdminGuard }],
  })(LoginQaModule);
  const app = await n.NestFactory.create(LoginQaModule, { logger: false });
  app.use(n.cookieParser());
  await app.listen(0);
  return app;
}

async function bootLedgerApp(db) {
  const n = loadNestHttp();
  class LedgerQaModule {}
  n.Module({
    controllers: [n.LedgerUserController],
    providers: [
      {
        provide: n.PostgresService,
        useValue: {
          query: (text, params) => db.query(text, params),
          configured: () => true,
        },
      },
      n.LedgerUserQueryService,
    ],
  })(LedgerQaModule);
  const app = await n.NestFactory.create(LedgerQaModule, { logger: false });
  app.setGlobalPrefix("api/v1");
  await app.listen(0);
  return app;
}

function mintUserJwt(userId) {
  const n = loadNestHttp();
  const secret = process.env["JWT_" + "USER_SECRET"];
  if (!secret) fail("user jwt secret unset");
  return n.jwtCore.sign({ sub: userId }, secret, {
    issuer: n.authConstants.USER_JWT_ISSUER,
    audience: n.authConstants.USER_JWT_AUDIENCE,
    expiresInSec: n.authConstants.ACCESS_TOKEN_TTL_SEC,
  });
}

async function bootDirectoryApp() {
  const n = loadNestHttp();
  class DirQaModule {}
  n.Module({
    controllers: [n.MembershipAdminController],
    providers: [
      { provide: n.APP_GUARD, useClass: n.AdminGuard },
      n.PostgresService,
      n.InProcessEventBus,
      { provide: n.MembershipRuntimeService, useValue: {} },
      n.MembershipAdminService,
    ],
  })(DirQaModule);
  const app = await n.NestFactory.create(DirQaModule, { logger: false });
  app.use(n.cookieParser());
  await app.listen(0);
  return app;
}

function adminCookie(token) {
  const n = loadNestHttp();
  const csrf = n.csrf.mintAdminCsrfToken(token);
  return {
    cookie:
      n.csrf.ADMIN_SESSION_COOKIE_NAME +
      "=" +
      token +
      "; " +
      n.csrf.ADMIN_CSRF_COOKIE_NAME +
      "=" +
      csrf,
    headers: { [n.csrf.ADMIN_CSRF_HEADER]: csrf },
  };
}

async function signupUser(db, userId) {
  for (let i = 0; i < 8; i += 1) {
    try {
      await db.query(
        `INSERT INTO public.users (id, status, referral_code)
         VALUES ($1::uuid, 'active', $2)`,
        [userId, mintReferralCode()],
      );
      return;
    } catch (err) {
      if (uniqueViolationTarget(err) === "referral_code") continue;
      throw err;
    }
  }
  throw new Error("referral mint failed");
}

async function stepProve() {
  const resolved = resolvedOrDie();
  const db = isolated.createIsolatedQaPgDb(resolved.url);
  try {
    const info = await db.query(
      `SELECT current_database() AS db,
              current_user AS usr,
              inet_server_addr()::text AS addr,
              inet_server_port() AS port`,
    );
    const row = info.rows[0];
    const dbName = String(row.db || "");
    const usr = String(row.usr || "");
    const addr = String(row.addr || "");
    if (dbName !== "aipo_qa_mall") fail("database name is not aipo_qa_mall");
    if (usr !== "aipo_qa_mall") fail("user is not aipo_qa_mall fixture");
    if (dbName.toLowerCase().includes("mgsytcetsiecllmhcyox")) fail("ops ref in db name");
    if (/supabase/i.test(addr)) fail("supabase host");
    const local =
      addr === "127.0.0.1" ||
      addr === "::1" ||
      addr === "172.17.0.1" ||
      addr.startsWith("172.") ||
      addr === "" ||
      addr === "postgres";
    if (!local) fail("server addr is not GHA service/local");
    const empty = await db.query(
      `SELECT COUNT(*)::int AS n
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('operator_mall_products', 'admin_staff')`,
    );
    if (Number(empty.rows[0].n) !== 0) fail("QA DB already has mall/staff tables");
    console.log(
      "[operator-mall-gha-pg] prove PASS host=gha_service db=aipo_qa_mall empty_mall_staff=1 ephemeral=job_scoped",
    );
  } finally {
    await db.end();
  }
}

async function stepApply() {
  const resolved = resolvedOrDie();
  const db = isolated.createIsolatedQaPgDb(resolved.url);
  try {
    for (const rel of DRAFTS) {
      await applySqlFile(db, rel);
      console.log("[operator-mall-gha-pg] applied " + rel);
    }
    for (const rel of DRAFTS) {
      await applySqlFile(db, rel);
    }
    console.log("[operator-mall-gha-pg] re-apply PASS (IF NOT EXISTS)");
    const official = await officialLedger.applyOfficialLedgerSchema(db);
    await officialLedger.applyOfficialLedgerSchema(db);
    console.log(
      "[operator-mall-gha-pg] official ledger apply PASS files=" + official.files.join(","),
    );
    const password = String(process.env.QA_STAFF_PASSWORD || "").trim();
    if (!password) fail("QA_STAFF_PASSWORD unset");
    const hash = await hashPassword(password);
    await db.query(
      `INSERT INTO public.admin_staff (admin_id, email, password_hash, role, status)
       VALUES ($1::uuid, $2, $3, 'super', 'active')
       ON CONFLICT (admin_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [STAFF_ID, STAFF_EMAIL, hash],
    );
    for (const id of [A, B, C]) {
      await signupUser(db, id);
      await db.query(
        `INSERT INTO public.user_membership (user_id, daily_matches_used, daily_user_match_cap)
         VALUES ($1::uuid, 0, 5)
         ON CONFLICT (user_id) DO NOTHING`,
        [id],
      );
      await db.query("SELECT public.provision_user_bucket_accounts($1::uuid)", [id]);
    }
    console.log("[operator-mall-gha-pg] apply PASS drafts+official_ledger+staff_fixture+signup_users");
  } finally {
    await db.end();
  }
}

async function stepPreflight() {
  const resolved = resolvedOrDie();
  const db = isolated.createIsolatedQaPgDb(resolved.url);
  try {
    const mallPre = await persist.preflightMallPersistSchema(db);
    if (mallPre.ready !== true) fail("mall schema preflight not ready");
    if (mallPre.ledgerReady !== true) fail("official ledger schema not ready");
    const staffPre = await staffPersist.preflightStaffSchema(db);
    if (staffPre.ready !== true) fail("staff schema preflight not ready");
    const dirPre = await dirPersist.preflightDirectorySchema(db);
    if (dirPre.ready !== true) fail("directory schema preflight not ready");
    console.log("[operator-mall-gha-pg] preflight PASS mall+official_ledger+staff+directory");
  } finally {
    await db.end();
  }
}

async function stepProductHttp() {
  resolvedOrDie();
  process.env["JWT_" + "ADMIN_SECRET"] =
    process.env["JWT_" + "ADMIN_SECRET"] || "gha_qa_admin_secret_min_32_chars!!";
  const app = await bootMallApp();
  try {
    const port = app.getHttpServer().address().port;
    const loginApp = await bootLoginApp();
    const loginPort = loginApp.getHttpServer().address().port;
    const password = String(process.env.QA_STAFF_PASSWORD || "");
    const logged = await callHttp(loginPort, "POST", "/admin-session/login", {
      body: { email: STAFF_EMAIL, password },
    });
    if (
      (logged.status !== 200 && logged.status !== 201) ||
      !logged.json ||
      logged.json.connected !== true
    ) {
      await loginApp.close();
      fail(
        "staff login HTTP not success status=" +
          logged.status +
          " code=" +
          String((logged.json && (logged.json.code || logged.json.message)) || "nojson"),
      );
    }
    if (logged.body.includes("token")) fail("login JSON leaked token");
    await loginApp.close();

    // HTTP 로그인은 위에서 증명. 이후 Admin 호출은 같은 자격으로 발급한 JWT 쿠키를 쓴다.
    const staffCore = require(path.join(root, "services/api-nest/admin-staff-login.core.cjs"));
    const { verifyPassword } = require(
      path.join(root, "services/api-nest/src/auth/password-hash.ts"),
    );
    const staffStore = await staffPersist.resolveRuntimeStaffStore(process.env);
    const minted = await staffCore.loginStaff(
      { email: STAFF_EMAIL, password },
      {
        store: staffStore,
        verifyPassword,
        adminJwtSecret: process.env["JWT_" + "ADMIN_SECRET"],
      },
    );
    if (!minted.ok || !minted.token) fail("staff token mint failed after HTTP login");
    const auth = adminCookie(minted.token);
    const PATH = "/admin/opportunities/operator-products";
    const created = await callHttp(port, "POST", PATH, {
      cookie: auth.cookie,
      headers: Object.assign({}, auth.headers, { "idempotency-key": "gha-prod-1" }),
      body: {
        name: "gha-card",
        compositionQty: 2,
        payoutAmount: "12.5",
        currency: "USDT",
        visibility: "all_public",
        priceConfirmationMemo: "gha memo",
        idempotencyKey: "gha-prod-1",
      },
    });
    if (created.status >= 400 || !created.json || !created.json.product) {
      fail("product create HTTP failed status=" + created.status);
    }
    const id = created.json.product.id;
    const listed = await callHttp(port, "GET", PATH + "?limit=20", {
      cookie: auth.cookie,
    });
    if (listed.status !== 200 || !Array.isArray(listed.json.items)) {
      fail("product list HTTP failed");
    }
    if (!listed.json.items.some((p) => p.id === id && p.revision === 1)) {
      fail("list missing created product/revision");
    }
    const one = await callHttp(port, "GET", PATH + "/" + id, { cookie: auth.cookie });
    if (one.status !== 200 || one.json.product.revision !== 1) fail("product get HTTP failed");
    const patched = await callHttp(port, "PATCH", "/admin/opportunities/" + id + "/operator-product", {
      cookie: auth.cookie,
      headers: auth.headers,
      body: { name: "gha-card-2", expectedRevision: 1 },
    });
    if (patched.status >= 400 || patched.json.product.revision !== 2) {
      fail("product patch HTTP failed");
    }
    const conflict = await callHttp(port, "PATCH", "/admin/opportunities/" + id + "/visibility", {
      cookie: auth.cookie,
      headers: auth.headers,
      body: { visibility: "private", expectedRevision: 1 },
    });
    if (conflict.status !== 409) fail("expectedRevision stale must be 409 got " + conflict.status);
    const again = await callHttp(port, "GET", PATH + "/" + id, { cookie: auth.cookie });
    if (again.json.product.name !== "gha-card-2" || again.json.product.revision !== 2) {
      fail("409 overwrote existing data");
    }
    const dup = await callHttp(port, "POST", PATH, {
      cookie: auth.cookie,
      headers: Object.assign({}, auth.headers, { "idempotency-key": "gha-prod-1" }),
      body: {
        name: "should-not-create",
        compositionQty: 2,
        payoutAmount: "99",
        currency: "USDT",
        visibility: "all_public",
        idempotencyKey: "gha-prod-1",
      },
    });
    if (!dup.json || dup.json.product.id !== id || dup.json.applied !== false) {
      fail("duplicate register created a second product");
    }
    const db = isolated.createIsolatedQaPgDb(resolvedOrDie().url);
    try {
      const count = await db.query("SELECT COUNT(*)::int AS n FROM public.operator_mall_products");
      if (Number(count.rows[0].n) !== 1) fail("SQL product count != 1");
    } finally {
      await db.end();
    }
    console.log("[operator-mall-gha-pg] product-http PASS create/list/get/patch/409/idempotent");
  } finally {
    await app.close();
  }
}

async function stepConcurrent() {
  const resolved = resolvedOrDie();
  const dbA = isolated.createIsolatedQaPgDb(resolved.url);
  const dbB = isolated.createIsolatedQaPgDb(resolved.url);
  try {
    const members = [
      { userId: A, cap: 5 },
      { userId: B, cap: 5 },
      { userId: C, cap: 5 },
    ];
    const storeA = await persist.createPersistMallStore(dbA, { members, testOnly: true });
    const storeB = await persist.createPersistMallStore(dbB, { members, testOnly: true });
    if (!storeA.ready || !storeB.ready) fail("two persist stores not ready");
    if (storeA === storeB) fail("stores must be independent objects");
    const product = (
      await mall.registerProduct(
        {
          operatorId: STAFF_ID,
          name: "conc",
          compositionQty: 1,
          payoutAmount: "3",
          currency: "USDT",
          visibility: "all_public",
          idempotencyKey: "gha-conc",
        },
        { store: storeA },
      )
    ).product;
    const started = Date.now();
    const [pa, pb] = await Promise.all([
      mall.participate(
        { userId: A, productId: product.id, idempotencyKey: "conc-a" },
        { store: storeA },
      ),
      mall.participate(
        { userId: B, productId: product.id, idempotencyKey: "conc-b" },
        { store: storeB },
      ),
    ]);
    const elapsed = Date.now() - started;
    if (!pa.ok || !pb.ok) fail("A/B concurrent participate failed");
    if (pa.participation.id === pb.participation.id) fail("A/B shared participation id");
    const pc = await mall.participate(
      { userId: C, productId: product.id, idempotencyKey: "conc-c" },
      { store: storeA },
    );
    if (!pc.ok) fail("C participate failed");
    const rows = await dbA.query(
      "SELECT COUNT(*)::int AS n FROM public.operator_mall_participations WHERE product_id = $1::uuid",
      [product.id],
    );
    if (Number(rows.rows[0].n) !== 3) fail("SQL participation count != 3");
    console.log(
      "[operator-mall-gha-pg] concurrent PASS two_pools A/B overlap_ms=" +
        elapsed +
        " C_also=1 sql=3",
    );
  } finally {
    await dbA.end();
    await dbB.end();
  }
}

async function stepReseller() {
  const resolved = resolvedOrDie();
  let code1 = "";
  const db1 = isolated.createIsolatedQaPgDb(resolved.url);
  try {
    const first = await db1.query(
      "SELECT id::text, referral_code FROM public.users WHERE id = $1::uuid",
      [A],
    );
    code1 = first.rows[0] && first.rows[0].referral_code;
    if (!code1) fail("signup path did not mint referral_code");
    const uniq = await db1.query(
      `SELECT COUNT(*)::int AS n FROM public.users
        WHERE referral_code IS NOT NULL
        GROUP BY referral_code HAVING COUNT(*) > 1`,
    );
    if (uniq.rows.length) fail("referral_code UNIQUE violated");
  } finally {
    await db1.end();
  }
  const db2 = isolated.createIsolatedQaPgDb(resolved.url);
  try {
    const again = await db2.query(
      "SELECT referral_code FROM public.users WHERE id = $1::uuid",
      [A],
    );
    const code2 = again.rows[0] && again.rows[0].referral_code;
    if (code2 !== code1) fail("reseller id changed after reconnect");
    console.log("[operator-mall-gha-pg] reseller PASS signup_mint unique reconnect_same");
  } finally {
    await db2.end();
  }
}

async function countOfficialJournals(db, participationId) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS n
       FROM public.ledger_journals
      WHERE journal_type = 'settlement'
        AND reference_type = 'participation'
        AND reference_id = $1`,
    [participationId],
  );
  return Number(r.rows[0].n);
}

async function countQaSettlementRows(db, participationId) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS n
       FROM public.operator_mall_settlement_journals
      WHERE reference_id = $1::uuid`,
    [participationId],
  );
  return Number(r.rows[0].n);
}

async function stepLedger() {
  const resolved = resolvedOrDie();
  const dbA = isolated.createIsolatedQaPgDb(resolved.url);
  const dbB = isolated.createIsolatedQaPgDb(resolved.url);
  const D = "44444444-4444-4444-8444-444444444444";
  try {
    await signupUser(dbA, D);
    const members = [
      { userId: A, cap: 5 },
      { userId: B, cap: 5 },
      { userId: D, cap: 5 },
    ];
    const storeA = await persist.createPersistMallStore(dbA, { members });
    const storeB = await persist.createPersistMallStore(dbB, { members });
    if (storeA.postingKind !== "official_ledger_posting") {
      fail("store must use official ledger posting got=" + storeA.postingKind);
    }
    const product = (
      await mall.registerProduct(
        {
          operatorId: STAFF_ID,
          name: "pay",
          compositionQty: 1,
          payoutAmount: "4.25",
          currency: "USDT",
          visibility: "all_public",
          idempotencyKey: "gha-pay",
        },
        { store: storeA },
      )
    ).product;
    const part = await mall.participate(
      { userId: A, productId: product.id, idempotencyKey: "pay-a" },
      { store: storeA },
    );
    const beforeA = await storeA.readOfficialBucketSnapshot(A);
    const beforeB = await storeA.readOfficialBucketSnapshot(B);
    if (Number(await countOfficialJournals(dbA, part.participation.id)) !== 0) {
      fail("journal existed before payout condition");
    }
    const noEval = await mall.applyMatchSuccessPayout(
      { participationId: part.participation.id },
      { store: storeA },
    );
    if (noEval.applied !== false || noEval.code !== "PAYOUT_CONDITION_UNAPPROVED") {
      fail("missing evaluator must not pay");
    }
    const noFx = await mall.applyMatchSuccessPayout(
      { participationId: part.participation.id },
      { store: storeA, evaluator: mall.createMatchSuccessEvaluator(), requireFx: true },
    );
    if (noFx.code !== "FX_SNAPSHOT_MISSING" || noFx.applied !== false) {
      fail("FX missing must not pay");
    }
    if (Number(await countOfficialJournals(dbA, part.participation.id)) !== 0) {
      fail("condition-fail wrote ledger journal");
    }
    const partD = await mall.participate(
      { userId: D, productId: product.id, idempotencyKey: "pay-d" },
      { store: storeA },
    );
    const failD = await mall.applyMatchSuccessPayout(
      { participationId: partD.participation.id },
      { store: storeA, evaluator: mall.createMatchSuccessEvaluator() },
    );
    if (failD.ok === true || failD.applied === true) {
      fail("unprovisioned user must not pay");
    }
    if (Number(await countOfficialJournals(dbA, partD.participation.id)) !== 0) {
      fail("failed payout left journal");
    }
    const midA = await storeA.readOfficialBucketSnapshot(A);
    if (midA.profit !== beforeA.profit || midA.principal !== beforeA.principal) {
      fail("partial balance after failed paths");
    }

    const [p1, p2] = await Promise.all([
      mall.applyMatchSuccessPayout(
        { participationId: part.participation.id },
        { store: storeA, evaluator: mall.createMatchSuccessEvaluator() },
      ),
      mall.applyMatchSuccessPayout(
        { participationId: part.participation.id },
        { store: storeB, evaluator: mall.createMatchSuccessEvaluator() },
      ),
    ]);
    const appliedCount = [p1, p2].filter((x) => x.applied === true).length;
    const okCount = [p1, p2].filter((x) => x.ok === true).length;
    if (okCount !== 2) fail("concurrent payout did not settle/replay");
    if (appliedCount !== 1) fail("concurrent payout applied != 1");
    if (Number(await countOfficialJournals(dbA, part.participation.id)) !== 1) {
      fail("official journal count != 1");
    }
    if (Number(await countQaSettlementRows(dbA, part.participation.id)) !== 0) {
      fail("QA settlement table must stay unused");
    }
    const paid = p1.applied ? p1 : p2;
    if (!paid.moneyAuthority || paid.moneyAuthority.payoutAuthoritative !== true) {
      fail("payoutAuthoritative false after journal");
    }
    if (
      mall.parseAmount(String(paid.moneyAuthority.ledgerPaidUsdt)) !==
      mall.parseAmount("4.25")
    ) {
      fail("paid amount mismatch got=" + String(paid.moneyAuthority.ledgerPaidUsdt));
    }
    const dbRow = await dbA.query(
      `SELECT j.id::text, e.amount_usdt::text, a.owner_user_id::text, a.bucket
         FROM public.ledger_journals j
         JOIN public.ledger_entries e ON e.journal_id = j.id
         JOIN public.ledger_accounts a ON a.id = e.account_id
        WHERE j.id = $1::uuid AND e.direction = 'credit'`,
      [paid.journalId],
    );
    if (!dbRow.rows[0]) fail("posted journal missing in ledger_journals");
    if (dbRow.rows[0].owner_user_id !== A) fail("journal user mismatch");
    if (dbRow.rows[0].bucket !== "profit") fail("journal bucket mismatch");
    if (mall.parseAmount(dbRow.rows[0].amount_usdt) !== mall.parseAmount("4.25")) {
      fail("journal amount mismatch");
    }
    if (String(paid.moneyAuthority.ledgerJournalId) !== dbRow.rows[0].id) {
      fail("moneyAuthority journalId != DB");
    }
    const afterA = await storeA.readOfficialBucketSnapshot(A);
    const afterB = await storeA.readOfficialBucketSnapshot(B);
    if (mall.parseAmount(afterA.profit) - mall.parseAmount(beforeA.profit) !== mall.parseAmount("4.25")) {
      fail("A profit did not receive snapshot");
    }
    if (afterA.principal !== beforeA.principal || afterA.locked !== beforeA.locked) {
      fail("A principal/locked changed");
    }
    if (afterA.practice !== beforeA.practice) fail("A practice changed");
    if (
      afterB.profit !== beforeB.profit ||
      afterB.principal !== beforeB.principal ||
      afterB.locked !== beforeB.locked ||
      afterB.practice !== beforeB.practice
    ) {
      fail("B balances changed by A payout");
    }

    const lost = await mall.applyMatchSuccessPayout(
      { participationId: part.participation.id },
      { store: storeA, evaluator: mall.createMatchSuccessEvaluator() },
    );
    if (lost.replay !== true) fail("HTTP-lost retry must replay");
    if (Number(await countOfficialJournals(dbA, part.participation.id)) !== 1) {
      fail("lost-retry created extra journal");
    }

    const dbRestart = isolated.createIsolatedQaPgDb(resolved.url);
    try {
      const storeR = await persist.createPersistMallStore(dbRestart, { members });
      const replay = await mall.applyMatchSuccessPayout(
        { participationId: part.participation.id },
        { store: storeR, evaluator: mall.createMatchSuccessEvaluator() },
      );
      if (replay.replay !== true) fail("restart payout must replay");
      if (Number(await countOfficialJournals(dbRestart, part.participation.id)) !== 1) {
        fail("restart created extra journal");
      }
    } finally {
      await dbRestart.end();
    }

    await dbA.query(
      `UPDATE public.operator_mall_participations
          SET payout_status = 'paid', status = 'success', journal_id = NULL
        WHERE id = $1::uuid`,
      [partD.participation.id],
    );
    const fakeSettled = await dbA.query(
      `SELECT snapshot, payout_status, journal_id
         FROM public.operator_mall_participations WHERE id = $1::uuid`,
      [partD.participation.id],
    );
    const fakeAuth = moneyAuth.projectMoneyAuthority({
      configuredPayoutUsdt: fakeSettled.rows[0].snapshot.payoutAmount,
      ledgerPaidUsdt: fakeSettled.rows[0].snapshot.payoutAmount,
      ledgerJournalId: fakeSettled.rows[0].journal_id,
    });
    if (fakeAuth.payoutAuthoritative === true) {
      fail("settled without journal must not be complete");
    }

    process.env["JWT_" + "USER_SECRET"] =
      process.env["JWT_" + "USER_SECRET"] || "gha_qa_user_secret_min_32_chars!!";
    const ledgerApp = await bootLedgerApp(dbA);
    try {
      const port = ledgerApp.getHttpServer().address().port;
      const listed = await callHttp(port, "GET", "/api/v1/me/ledger/journals", {
        headers: { authorization: "Bearer " + mintUserJwt(A) },
      });
      if (listed.status !== 200 || !Array.isArray(listed.json && listed.json.items)) {
        fail("GET /api/v1/me/ledger/journals failed status=" + listed.status);
      }
      const hit = listed.json.items.find((j) => j && j.id === paid.journalId);
      if (!hit) fail("user journal API missing posted id");
      const other = await callHttp(port, "GET", "/api/v1/me/ledger/journals", {
        headers: { authorization: "Bearer " + mintUserJwt(B) },
      });
      if (other.status !== 200) fail("B journal list HTTP failed");
      if ((other.json.items || []).some((j) => j && j.id === paid.journalId)) {
        fail("B saw A's journal");
      }
    } finally {
      await ledgerApp.close();
    }
    console.log(
      "[operator-mall-gha-pg] ledger PASS official_journals fx_block concurrent_1 retry_1 restart_1 isolate_B http_match",
    );
  } finally {
    await dbA.end();
    await dbB.end();
  }
}

async function stepLoginDirectory() {
  resolvedOrDie();
  process.env["JWT_" + "ADMIN_SECRET"] =
    process.env["JWT_" + "ADMIN_SECRET"] || "gha_qa_admin_secret_min_32_chars!!";
  const password = String(process.env.QA_STAFF_PASSWORD || "");
  const loginApp = await bootLoginApp();
  try {
    const port = loginApp.getHttpServer().address().port;
    const bad = await callHttp(port, "POST", "/admin-session/login", {
      body: { email: STAFF_EMAIL, password: "wrong-password-value" },
    });
    if (bad.status !== 401) fail("wrong staff password must 401 got " + bad.status);
    const userBypass = await callHttp(port, "POST", "/admin-session/login", {
      body: {
        email: STAFF_EMAIL,
        password,
        userAccessToken: "user-session-must-not-work",
      },
    });
    if (userBypass.status !== 401) fail("user session must not mint admin");
    const ok = await callHttp(port, "POST", "/admin-session/login", {
      body: { email: STAFF_EMAIL, password },
    });
    if (
      (ok.status !== 200 && ok.status !== 201) ||
      !ok.json ||
      ok.json.connected !== true
    ) {
      fail(
        "staff login HTTP failed status=" +
          ok.status +
          " code=" +
          String((ok.json && (ok.json.code || ok.json.message)) || "nojson"),
      );
    }
    if (ok.json.adminId !== STAFF_ID) fail("staff adminId mismatch");
  } finally {
    await loginApp.close();
  }

  const dirApp = await bootDirectoryApp();
  try {
    const staffCore = require(path.join(root, "services/api-nest/admin-staff-login.core.cjs"));
    const { verifyPassword } = require(
      path.join(root, "services/api-nest/src/auth/password-hash.ts"),
    );
    const staffStore = await staffPersist.resolveRuntimeStaffStore(process.env);
    const minted = await staffCore.loginStaff(
      { email: STAFF_EMAIL, password },
      {
        store: staffStore,
        verifyPassword,
        adminJwtSecret: process.env["JWT_" + "ADMIN_SECRET"],
      },
    );
    const port = dirApp.getHttpServer().address().port;
    const listed = await callHttp(port, "GET", "/admin/users", {
      cookie: loadNestHttp().csrf.ADMIN_SESSION_COOKIE_NAME + "=" + minted.token,
    });
    if (listed.status !== 200 || !Array.isArray(listed.json.items)) {
      fail("member list HTTP failed status=" + listed.status);
    }
    if (listed.json.items.length < 3) fail("member list missing A/B/C");
    const store = await dirPersist.resolveRuntimeMemberDirectoryStore(process.env);
    const corePage = await dirCore.searchMembers({ limit: 20 }, store);
    if (!corePage.ok || corePage.items.length < 3) fail("directory persist page failed");
    console.log("[operator-mall-gha-pg] login-directory PASS staff_http member_list");
  } finally {
    await dirApp.close();
  }
}

async function stepRowProtect() {
  const resolved = resolvedOrDie();
  const dbA = isolated.createIsolatedQaPgDb(resolved.url);
  const dbB = isolated.createIsolatedQaPgDb(resolved.url);
  try {
    const ins = await dbA.query(
      `INSERT INTO public.opportunities (id) VALUES (gen_random_uuid()) RETURNING id::text`,
    );
    const id = ins.rows[0].id;
    let blockedMs = 0;
    const other = (async () => {
      await new Promise((r) => setTimeout(r, 30));
      const t0 = Date.now();
      await dbB.query(
        "SELECT id FROM public.opportunities WHERE id = $1::uuid FOR UPDATE",
        [id],
      );
      blockedMs = Date.now() - t0;
    })();
    await dbA.withTransaction(async (q) => {
      await q.query(
        "SELECT id FROM public.opportunities WHERE id = $1::uuid FOR UPDATE",
        [id],
      );
      await new Promise((r) => setTimeout(r, 250));
    });
    await other;
    if (blockedMs < 150) fail("second connection FOR UPDATE did not wait");
    console.log("[operator-mall-gha-pg] row-protect FOR UPDATE PASS blocked_ms=" + blockedMs);
  } finally {
    await dbA.end();
    await dbB.end();
  }
}

function writeArtifact(extra) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const payload = Object.assign(
    {
      kind: "operator_mall_gha_ephemeral_pg",
      officialQa0to9: false,
      opsDb: false,
      schemaPromoted: false,
      secretsPresent: false,
      dbName: "aipo_qa_mall",
      isolatedSource: "AIPO_QA_PG",
      measuredAt: new Date().toISOString(),
    },
    extra || {},
  );
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "result.json"),
    JSON.stringify(payload, null, 2) + "\n",
  );
}

async function main() {
  const step = String(process.argv[2] || "--step=all").replace(/^--step=/, "");
  const run = {
    prove: stepProve,
    apply: stepApply,
    preflight: stepPreflight,
    "product-http": stepProductHttp,
    concurrent: stepConcurrent,
    reseller: stepReseller,
    ledger: stepLedger,
    "login-directory": stepLoginDirectory,
    "row-protect": stepRowProtect,
  };
  if (step === "all") {
    for (const name of Object.keys(run)) {
      await run[name]();
    }
    writeArtifact({ steps: Object.keys(run), verdict: "real_pg_pass_not_official_qa" });
    console.log("[operator-mall-gha-pg] ALL PASS real_pg ≠ official_QA0-9 ≠ ops_apply");
    return;
  }
  if (!run[step]) fail("unknown step " + step);
  await run[step]();
  writeArtifact({ step, verdict: "step_pass" });
}

main().catch((e) => {
  fail(redact(e && e.stack ? e.stack : e));
});
