/**
 * verify:peotteok-closure — REL-122
 * /me/peotteok fact-only · spark-dash ai-orb reuse · leftover chrome 0.
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
  "apps/web/app/me/peotteok/page.tsx",
  "apps/web/app/me/layout.tsx",
  "tooling/e2e/specs/peotteok-closure.spec.cjs",
]) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/me/peotteok/page.tsx");
const layout = read("apps/web/app/me/layout.tsx");
const spec = read("tooling/e2e/specs/peotteok-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!page.includes("usePeotteokChat") || !page.includes("PeotteokChat")) {
  fail("peotteok must keep existing chat owner");
}
if (!page.includes("/spark-dash/ai-orb.svg")) {
  fail("peotteok must reuse public/spark-dash/ai-orb.svg");
}
if (!page.includes("확인된 사실만")) {
  fail("peotteok must keep fact-only copy");
}
if (page.includes("수익 확정") || page.includes("무조건 벌")) {
  fail("peotteok must not invent guaranteed profit copy");
}
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}
if (!spec.includes("peotteok-ai-orb") || !spec.includes("app-shell")) {
  fail("committed spec must cover orb reuse and leftover chrome 0");
}
if (!pkg.includes('"verify:peotteok-closure"')) fail("package.json missing verify:peotteok-closure");
if (!catalog.includes("peotteok-closure")) fail("CATALOG.md must list peotteok-closure");
if (!domain.includes("peotteok-closure.cjs")) fail("domain-by-path must trigger peotteok-closure");

function finish(extra) {
  if (fails.length) {
    console.error("[verify:peotteok-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:peotteok-closure] PASS — fact-only · spark-dash orb · leftover chrome 0" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.PEOTTEOK_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.PEOTTEOK_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
        "peotteok-closure.spec.cjs",
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
    if (result.status !== 0) fail("committed Playwright peotteok-closure runtime failed");
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
