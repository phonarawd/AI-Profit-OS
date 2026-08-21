/**
 * verify:support-closure — REL-126
 * /me/support deposit-disputes · fake chat 0 · leftover chrome 0.
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

for (const f of [
  "apps/web/app/me/support/page.tsx",
  "tooling/e2e/specs/support-closure.spec.cjs",
]) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/me/support/page.tsx");
const layout = read("apps/web/app/me/layout.tsx");
const spec = read("tooling/e2e/specs/support-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

for (const needle of [
  "category=deposit",
  "wrong_chain",
  "/api/v1/wallet/deposit-disputes",
  "DEPOSIT_DISPUTE_SUBMITTED",
  "idempotencyKey",
]) {
  if (!page.includes(needle)) fail(`support missing ${needle}`);
}
if (page.includes("라이브 채팅") || page.includes("바로 상담") || page.includes("fake chat")) {
  fail("support must not invent live chat");
}
if (!page.includes("바로 연결되는 상담 창은 없어요")) {
  fail("support must tell users there is no live chat");
}
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}
if (!spec.includes("wrong-chain") || !spec.includes("상담 창은 없어요")) {
  fail("committed spec must cover wrong-chain and no live chat");
}
if (!pkg.includes('"verify:support-closure"')) fail("package.json missing verify:support-closure");
if (!catalog.includes("support-closure")) fail("CATALOG.md must list support-closure");
if (!domain.includes("support-closure.cjs")) fail("domain-by-path must trigger support-closure");

function finish(extra) {
  if (fails.length) {
    console.error("[verify:support-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:support-closure] PASS — deposit-disputes · fake chat 0 · leftover chrome 0" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.SUPPORT_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.SUPPORT_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
        "support-closure.spec.cjs",
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
    if (result.status !== 0) fail("committed Playwright support-closure runtime failed");
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
