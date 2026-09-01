/**
 * verify:krw-deposit-closure — REL-115
 * /wallet/deposit?tab=krw = server pending only. credit 0. PG 0.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
}

const files = [
  "apps/web/app/wallet/deposit/DepositClient.tsx",
  "apps/web/app/wallet/deposit/krw-deposit-instructions.ts",
  "tooling/e2e/specs/krw-deposit-closure.spec.cjs",
  "tooling/e2e/lib/consumer-route-stubs.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const client = read("apps/web/app/wallet/deposit/DepositClient.tsx");
const spec = read("tooling/e2e/specs/krw-deposit-closure.spec.cjs");
const stubs = read("tooling/e2e/lib/consumer-route-stubs.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!client.includes("/api/v1/wallet/krw-deposit-requests")) {
  fail("KRW deposit must POST /api/v1/wallet/krw-deposit-requests");
}
if (!client.includes("/api/v1/wallet/krw-deposit-instructions")) {
  fail("KRW deposit must GET /api/v1/wallet/krw-deposit-instructions");
}
if (!client.includes("parseSafeKrwDepositInstructions")) {
  fail("KRW deposit must parse the four-field instruction payload");
}
if (!client.includes("data-krw-instr-state")) {
  fail("KRW deposit must expose instruction view state");
}
if (!client.includes("requestedAmountKrw") || !client.includes("depositorName")) {
  fail("KRW deposit must send requestedAmountKrw + depositorName");
}
if (!client.includes("idempotencyKey")) {
  fail("KRW deposit must send idempotencyKey");
}
if (!client.includes("createIdempotencyLifecycle") || !client.includes("krwDepositFingerprint")) {
  fail("KRW deposit must keep one idempotency key per economic intent");
}
if (client.includes("Date.now()") && client.includes("Math.random()")) {
  fail("KRW deposit must not mint a new random key on every submit");
}
if (!client.includes('json.status === "pending"')) {
  fail("KRW deposit success is server pending only");
}
if (/입금 완료/.test(client)) {
  fail("KRW deposit must not fake 입금 완료");
}
if (/PG|toss|iamport|nicepay/i.test(client)) {
  fail("KRW deposit must stay PG-free");
}
if (!spec.includes("krw_deny") || !spec.includes("pending")) {
  fail("committed spec must cover KRW pending + deny");
}
if (!spec.includes("data-krw-instr-state") || !spec.includes("krw-deposit-instructions")) {
  fail("committed spec must cover KRW instruction authority");
}
if (!spec.includes("잔액에 넣지 않았어요")) {
  fail("committed spec must prove pending ≠ credit");
}
if (!stubs.includes("krw-deposit-requests") || !stubs.includes("krw_deny")) {
  fail("stubDeposit must cover KRW pending and deny");
}
if (!stubs.includes("krw-deposit-instructions")) {
  fail("stubDeposit must cover KRW instruction authority");
}
if (!pkg.includes('"verify:krw-deposit-closure"')) {
  fail("package.json missing verify:krw-deposit-closure");
}
if (!catalog.includes("krw-deposit-closure")) {
  fail("CATALOG.md must list krw-deposit-closure");
}
if (!domain.includes("krw-deposit-closure.cjs")) {
  fail("domain-by-path must trigger krw-deposit-closure");
}

const runtimeTest = spawnSync(
  process.execPath,
  [
    "--test",
    "--experimental-strip-types",
    "packages/sdk/src/wallet/idempotency-lifecycle.runtime.test.ts",
    "apps/web/app/wallet/deposit/krw-deposit-instructions.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(runtimeTest.stdout || "");
process.stderr.write(runtimeTest.stderr || "");
if (runtimeTest.status !== 0) {
  fail("idempotency lifecycle runtime tests failed");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:krw-deposit-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:krw-deposit-closure] PASS — pending ≠ credit · PG 0 · happy+deny" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.KRW_DEPOSIT_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.KRW_DEPOSIT_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
  process.exit(0);
}

const { ensureLocalWebRuntime } = require("../e2e/lib/local-web-runtime.cjs");

async function runBrowser() {
  const web = await ensureLocalWebRuntime({ timeoutMs: 180000 });
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      "--config",
      "tooling/e2e/playwright.config.cjs",
      "krw-deposit-closure.spec.cjs",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: web.baseUrl,
        NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
      },
      timeout: 420000,
    },
  );
  await web.stop();
  return result;
}

runBrowser()
  .then((result) => {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.status !== 0) {
      fail("committed Playwright krw-deposit-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
