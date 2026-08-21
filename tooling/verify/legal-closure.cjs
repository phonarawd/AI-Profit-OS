/**
 * verify:legal-closure — REL-128
 * /me/legal* 5 routes · existing legal/operator owners · leftover chrome 0.
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
  ["apps/web/app/me/legal/page.tsx", "legal-hub"],
  ["apps/web/app/me/legal/terms/page.tsx", "legal-terms"],
  ["apps/web/app/me/legal/privacy/page.tsx", "legal-privacy"],
  ["apps/web/app/me/legal/oss/page.tsx", "legal-oss"],
  ["apps/web/app/me/legal/license/page.tsx", "legal-license"],
];
for (const [file, testId] of routes) {
  const src = read(file);
  if (!src.includes("AccountFrame")) fail(`${file} must use AccountFrame`);
  if (!src.includes(testId)) fail(`${file} must expose ${testId}`);
}

const terms = read("apps/web/app/me/legal/terms/page.tsx");
const privacy = read("apps/web/app/me/legal/privacy/page.tsx");
const license = read("apps/web/app/me/legal/license/page.tsx");
if (!terms.includes("T.legal.terms") || !privacy.includes("T.legal.privacy")) {
  fail("legal docs must use existing T.legal owners");
}
if (!license.includes("@aipo/operator-entity")) {
  fail("license must use existing operator-entity owner");
}
const layout = read("apps/web/app/me/layout.tsx");
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}
const spec = read("tooling/e2e/specs/legal-closure.spec.cjs");
if (!spec.includes("legal-hub") || !spec.includes("legal-terms")) {
  fail("committed spec must cover legal hub and terms");
}
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:legal-closure"')) fail("package.json missing verify:legal-closure");
if (!catalog.includes("legal-closure")) fail("CATALOG.md must list legal-closure");
if (!domain.includes("legal-closure.cjs")) fail("domain-by-path must trigger legal-closure");

function finish(extra) {
  if (fails.length) {
    console.error("[verify:legal-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:legal-closure] PASS — 5 legal routes · existing owners · leftover chrome 0" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.LEGAL_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.LEGAL_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
        "legal-closure.spec.cjs",
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
    if (result.status !== 0) fail("committed Playwright legal-closure runtime failed");
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
