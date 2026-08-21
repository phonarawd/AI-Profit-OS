/**
 * verify:guides-closure — REL-127
 * /me/guide/* 7 routes · leftover chrome 0 · weekly numbers not invented.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];
const fail = (msg) => fails.push(msg);
const read = (rel) => {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(fp, "utf8");
};

const routes = [
  ["apps/web/app/me/guide/faq/page.tsx", "guide-faq"],
  ["apps/web/app/me/guide/usdt/page.tsx", "guide-usdt"],
  ["apps/web/app/me/guide/get-usdt/page.tsx", "guide-get-usdt-page"],
  ["apps/web/app/me/guide/principal/page.tsx", "guide-principal"],
  ["apps/web/app/me/guide/revenue/page.tsx", "guide-revenue"],
  ["apps/web/app/me/guide/partners/page.tsx", "guide-partners"],
  ["apps/web/app/me/guide/market-weekly/page.tsx", "guide-market-weekly"],
];

for (const [file, testId] of routes) {
  const src = read(file);
  if (!src.includes("AccountFrame")) fail(`${file} must use AccountFrame`);
  if (!src.includes(testId)) fail(`${file} must expose ${testId}`);
  if (src.includes("골격") || src.includes("도메인 todo")) {
    fail(`${file} must not show developer leftover copy`);
  }
}

const weekly = read("apps/web/app/me/guide/market-weekly/page.tsx");
if (!weekly.includes("data={null}")) {
  fail("market-weekly must not invent briefing numbers");
}
const partners = read("apps/web/app/me/guide/partners/page.tsx");
if (!partners.includes("MarketPartnerGrid")) {
  fail("partners must keep official logo grid");
}
const layout = read("apps/web/app/me/layout.tsx");
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}
const spec = read("tooling/e2e/specs/guides-closure.spec.cjs");
if (!spec.includes("guide-faq") || !spec.includes("guide-usdt")) {
  fail("committed spec must cover faq and usdt");
}
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:guides-closure"')) fail("package.json missing verify:guides-closure");
if (!catalog.includes("guides-closure")) fail("CATALOG.md must list guides-closure");
if (!domain.includes("guides-closure.cjs")) fail("domain-by-path must trigger guides-closure");

function finish(extra) {
  if (fails.length) {
    console.error("[verify:guides-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:guides-closure] PASS — 7 guide routes · leftover chrome 0" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.GUIDES_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.GUIDES_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
  process.exit(0);
}

const { ensureLocalWebRuntime } = require("../e2e/lib/local-web-runtime.cjs");

ensureLocalWebRuntime({ timeoutMs: 180000 })
  .then(async (web) => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, "node_modules/@playwright/test/cli.js"),
        "test",
        "--config",
        "tooling/e2e/playwright.config.cjs",
        "guides-closure.spec.cjs",
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
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.status !== 0) fail("committed Playwright guides-closure runtime failed");
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
