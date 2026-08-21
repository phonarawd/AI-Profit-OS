/**
 * verify:core-opportunity-journey — REL-106~110 DEV/TEST journey
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const spec = read("tooling/e2e/specs/core-opportunity-journey.spec.cjs");
const stubs = read("tooling/e2e/lib/consumer-route-stubs.cjs");
if (!spec.includes("stubCoreOpportunityJourney")) {
  fail("journey spec must use stubCoreOpportunityJourney");
}
if (!spec.includes("DEV/TEST")) {
  fail("journey spec must mark DEV/TEST");
}
if (!stubs.includes("production money mutation 0")) {
  fail("journey stub must keep production money mutation 0");
}

if (fails.length) {
  console.error("[verify:core-opportunity-journey] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:core-opportunity-journey] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:core-opportunity-journey] PASS — Home→List→Detail→Confirm→Execute→Result" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.CORE_JOURNEY_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.CORE_JOURNEY_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "core-opportunity-journey.spec.cjs",
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
      fail("committed Playwright core-opportunity-journey failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
