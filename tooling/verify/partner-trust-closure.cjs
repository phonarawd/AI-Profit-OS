/**
 * verify:partner-trust-closure — REL-129
 * official MarketPartnerGrid logos only · AI logo 0.
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

const partners = read("apps/web/app/me/guide/partners/page.tsx");
const grid = read("packages/ui/components/trust/MarketPartnerGrid.tsx");
const spec = read("tooling/e2e/specs/partner-trust-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!partners.includes("MarketPartnerGrid")) {
  fail("partners must keep official MarketPartnerGrid");
}
if (!grid.includes("listMarketLogos") || !grid.includes("/brand/")) {
  fail("MarketPartnerGrid must render official brand logos only");
}
if (/openai|dall-e|generateImage|midjourney|stable diffusion/i.test(grid + partners)) {
  fail("partner trust must not call AI image generation");
}
if (!grid.includes("market-partner-logo-pending")) {
  fail("pending logos must fall back to name-only");
}
if (!spec.includes("market-partner-grid")) {
  fail("committed spec must cover official grid");
}
if (!pkg.includes('"verify:partner-trust-closure"')) {
  fail("package.json missing verify:partner-trust-closure");
}
if (!catalog.includes("partner-trust-closure")) {
  fail("CATALOG.md must list partner-trust-closure");
}
if (!domain.includes("partner-trust-closure.cjs")) {
  fail("domain-by-path must trigger partner-trust-closure");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:partner-trust-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:partner-trust-closure] PASS — official logos only · AI logo 0" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.PARTNER_TRUST_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.PARTNER_TRUST_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
        "partner-trust-closure.spec.cjs",
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
    if (result.status !== 0) fail("committed Playwright partner-trust-closure runtime failed");
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
