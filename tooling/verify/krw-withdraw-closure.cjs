/**
 * verify:krw-withdraw-closure — REL-117
 * /wallet/withdraw/krw = server POST only. credit 0. PG 0.
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
  "apps/web/app/wallet/withdraw/krw/page.tsx",
  "apps/web/components/WithdrawLiveForm.tsx",
  "tooling/e2e/specs/krw-withdraw-closure.spec.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/wallet/withdraw/krw/page.tsx");
const form = read("apps/web/components/WithdrawLiveForm.tsx");
const spec = read("tooling/e2e/specs/krw-withdraw-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!page.includes('asset="KRW"') && !page.includes("asset={'KRW'}")) {
  fail("KRW withdraw page must mount WithdrawLiveForm asset=KRW");
}
if (!page.includes("WithdrawLiveForm")) fail("KRW withdraw must mount WithdrawLiveForm");
if (/PG|toss|iamport|nicepay/i.test(page) || /PG|toss|iamport|nicepay/i.test(form)) {
  fail("KRW withdraw must stay PG-free");
}
if (/출금 완료/.test(page)) fail("KRW withdraw must not fake 출금 완료");
if (!spec.includes("krw_deny") || !spec.includes("접수했어요")) {
  fail("committed spec must cover KRW accepted + deny");
}
if (!pkg.includes('"verify:krw-withdraw-closure"')) {
  fail("package.json missing verify:krw-withdraw-closure");
}
if (!catalog.includes("krw-withdraw-closure")) {
  fail("CATALOG.md must list krw-withdraw-closure");
}
if (!domain.includes("krw-withdraw-closure.cjs")) {
  fail("domain-by-path must trigger krw-withdraw-closure");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:krw-withdraw-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:krw-withdraw-closure] PASS — server accept · PG 0 · happy+deny" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.KRW_WITHDRAW_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.KRW_WITHDRAW_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "krw-withdraw-closure.spec.cjs",
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
      fail("committed Playwright krw-withdraw-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
