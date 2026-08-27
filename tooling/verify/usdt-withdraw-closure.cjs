/**
 * verify:usdt-withdraw-closure — REL-116
 * /wallet/withdraw/usdt = server POST only. credit 0. fake complete 0.
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
  "apps/web/app/wallet/withdraw/usdt/page.tsx",
  "apps/web/components/WithdrawLiveForm.tsx",
  "tooling/e2e/specs/usdt-withdraw-closure.spec.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/wallet/withdraw/usdt/page.tsx");
const kycGate = read("apps/web/lib/use-withdraw-kyc-gate.ts");
const form = read("apps/web/components/WithdrawLiveForm.tsx");
const spec = read("tooling/e2e/specs/usdt-withdraw-closure.spec.cjs");
const stubs = read("tooling/e2e/lib/consumer-route-stubs.cjs");
const withdrawStub = stubs.slice(
  stubs.indexOf("async function stubWithdraw"),
  stubs.indexOf("const HISTORY_JOURNAL_ID"),
);
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!page.includes("WithdrawLiveForm")) fail("USDT withdraw must mount WithdrawLiveForm");
if (!form.includes("createWithdraw") || !form.includes("idempotencyKey")) {
  fail("WithdrawLiveForm must POST createWithdraw with idempotencyKey");
}
if (!form.includes('data-credited="false"')) {
  fail("withdraw form must stay data-credited=false");
}
if (/출금 완료/.test(form) || /출금 완료/.test(page)) {
  fail("USDT withdraw must not fake 출금 완료");
}
if (!form.includes("지금은 출금할 수 없어요.")) {
  fail("403 must show server deny copy");
}
if (!spec.includes("usdt_deny") || !spec.includes("접수했어요")) {
  fail("committed spec must cover USDT accepted + deny");
}
for (const needle of [
  "ambiguous_retry",
  'fill("10.0")',
  "requests[0].idempotencyKey",
  '["10", "10"]',
]) {
  if (!spec.includes(needle)) {
    fail(`committed spec must cover canonical ambiguous retry: ${needle}`);
  }
}
if (!withdrawStub.includes("stubWithdraw") || !withdrawStub.includes("KYC_WITHDRAW_REQUIRED")) {
  fail("stubWithdraw must expose KYC/limit deny");
}
if (
  !withdrawStub.includes('/api/v1/compliance/kyc/status') ||
  !withdrawStub.includes('kycStatus: "approved"') ||
  !withdrawStub.includes("userId: TEST_WALLET_BUCKETS.userId")
) {
  fail("stubWithdraw must satisfy the session-owned approved KYC authority");
}
if (!pkg.includes('"verify:usdt-withdraw-closure"')) {
  fail("package.json missing verify:usdt-withdraw-closure");
}
if (!catalog.includes("usdt-withdraw-closure")) {
  fail("CATALOG.md must list usdt-withdraw-closure");
}
if (!domain.includes("usdt-withdraw-closure.cjs")) {
  fail("domain-by-path must trigger usdt-withdraw-closure");
}

if (page.includes("userId: null")) {
  fail("USDT withdraw must not bypass session-owned KYC status");
}
if (page.includes("allowWithdrawForm || !gate.toastMessage")) {
  fail("USDT withdraw must not fail open before KYC authority loads");
}
if (!page.includes("allowForm={gate.allowWithdrawForm}")) {
  fail("USDT withdraw form must require authoritative approved KYC");
}
for (const needle of [
  '"/api/v1/compliance/kyc/status"',
  'credentials: "include"',
  '"loading"',
  '"unauthorized"',
  '"unavailable"',
  'authority === "ready" && kycStatus === "approved"',
]) {
  if (!kycGate.includes(needle)) fail("KYC gate missing " + needle);
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:usdt-withdraw-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:usdt-withdraw-closure] PASS — server accept · no credit · happy+deny" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.USDT_WITHDRAW_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.USDT_WITHDRAW_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "usdt-withdraw-closure.spec.cjs",
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
      fail("committed Playwright usdt-withdraw-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
