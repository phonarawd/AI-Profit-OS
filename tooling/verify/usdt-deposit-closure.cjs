/**
 * verify:usdt-deposit-closure — REL-114
 * /wallet/deposit USDT = server address only. credit 0. fake success 0.
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
  "apps/web/app/wallet/deposit/page.tsx",
  "apps/web/app/wallet/deposit/DepositClient.tsx",
  "tooling/e2e/specs/usdt-deposit-closure.spec.cjs",
  "tooling/e2e/lib/consumer-route-stubs.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/wallet/deposit/page.tsx");
const client = read("apps/web/app/wallet/deposit/DepositClient.tsx");
const spec = read("tooling/e2e/specs/usdt-deposit-closure.spec.cjs");
const stubs = read("tooling/e2e/lib/consumer-route-stubs.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
const surface = `${page}\n${client}`;

if (!page.includes("DepositClient")) {
  fail("deposit page must mount DepositClient");
}
if (!surface.includes("/api/v1/wallet/my-deposit-address")) {
  fail("USDT deposit must GET /api/v1/wallet/my-deposit-address");
}
if (!surface.includes("trc20Address")) {
  fail("USDT deposit must read trc20Address");
}
if (!surface.includes('data-credited="false"')) {
  fail("USDT continue must stay data-credited=false");
}
if (/입금 완료/.test(surface)) {
  fail("USDT deposit must not fake 입금 완료");
}
if (/principalUsdt\s*\+\s*|buckets\.[a-zA-Z]+Usdt\s*=/.test(client)) {
  fail("deposit must not mutate wallet buckets locally");
}
if (!spec.includes("usdt_deny") || !spec.includes("data-credited")) {
  fail("committed spec must cover USDT happy + deny and no credit");
}
if (!stubs.includes("stubDeposit") || !stubs.includes("TQADEPOSITADDRESSREL1140000001")) {
  fail("stubDeposit must expose a distinct USDT address");
}
if (!pkg.includes('"verify:usdt-deposit-closure"')) {
  fail("package.json missing verify:usdt-deposit-closure");
}
if (!catalog.includes("usdt-deposit-closure")) {
  fail("CATALOG.md must list usdt-deposit-closure");
}
if (!domain.includes("usdt-deposit-closure.cjs")) {
  fail("domain-by-path must trigger usdt-deposit-closure");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:usdt-deposit-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:usdt-deposit-closure] PASS — server address · no credit · happy+deny" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.USDT_DEPOSIT_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.USDT_DEPOSIT_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "usdt-deposit-closure.spec.cjs",
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
      fail("committed Playwright usdt-deposit-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
