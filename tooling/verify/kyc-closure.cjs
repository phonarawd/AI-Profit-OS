/**
 * verify:kyc-closure — REL-124
 * /me/kyc status owner · fake approved 0 · leftover chrome 0.
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
  "apps/web/app/me/kyc/page.tsx",
  "apps/web/app/me/kyc/KycClient.tsx",
  "apps/web/app/me/layout.tsx",
  "tooling/e2e/specs/kyc-closure.spec.cjs",
]) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/me/kyc/page.tsx");
const client = read("apps/web/app/me/kyc/KycClient.tsx");
const layout = read("apps/web/app/me/layout.tsx");
const spec = read("tooling/e2e/specs/kyc-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!page.includes("KycClient")) fail("kyc page must mount KycClient");
if (!client.includes("/api/v1/compliance/kyc/status")) {
  fail("KycClient must read GET /api/v1/compliance/kyc/status");
}
if (!client.includes("unauthorized") || !client.includes("unavailable")) {
  fail("KycClient must distinguish unauthorized/unavailable");
}
if (/kycStatus:\s*"approved"/.test(client) && /catch/.test(client)) {
  fail("kyc must not invent approved");
}
if (client.includes("userId") && /\{.*userId/.test(client)) {
  fail("kyc must not render userId");
}
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}
if (!spec.includes("unauthorized") || !spec.includes("approved")) {
  fail("committed spec must cover unauthorized and approved");
}
if (!pkg.includes('"verify:kyc-closure"')) fail("package.json missing verify:kyc-closure");
if (!catalog.includes("kyc-closure")) fail("CATALOG.md must list kyc-closure");
if (!domain.includes("kyc-closure.cjs")) fail("domain-by-path must trigger kyc-closure");

function finish(extra) {
  if (fails.length) {
    console.error("[verify:kyc-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:kyc-closure] PASS — status owner · fake approved 0 · leftover chrome 0" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.KYC_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.KYC_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
        "kyc-closure.spec.cjs",
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
    if (result.status !== 0) fail("committed Playwright kyc-closure runtime failed");
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
