/**
 * verify:admin-entry-e2e — REL-200~208 Playwright
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

const spec = path.join(root, "tooling/e2e/specs/admin-entry-closure.spec.cjs");
const runtime = path.join(root, "tooling/e2e/lib/local-admin-runtime.cjs");
if (!fs.existsSync(spec)) fail("missing admin-entry-closure.spec.cjs");
if (!fs.existsSync(runtime)) fail("missing local-admin-runtime.cjs");

if (fails.length) {
  console.error("[verify:admin-entry-e2e] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

if (process.env.ADMIN_E2E !== "1") {
  console.log("[verify:admin-entry-e2e] PASS (static · set ADMIN_E2E=1 for browser)");
  process.exit(0);
}

const { ensureLocalAdminRuntime } = require("../e2e/lib/local-admin-runtime.cjs");

async function runBrowser() {
  const admin = await ensureLocalAdminRuntime({ timeoutMs: 180000 });
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      "--config",
      "tooling/e2e/playwright.config.cjs",
      "admin-entry-closure.spec.cjs",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PLAYWRIGHT_ADMIN_BASE_URL: admin.baseUrl,
        NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
      },
      timeout: 420000,
    },
  );
  await admin.stop();
  return result;
}

runBrowser()
  .then((result) => {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    if (result.status !== 0) {
      console.error("[verify:admin-entry-e2e] FAIL committed Playwright");
      process.exit(1);
    }
    console.log("[verify:admin-entry-e2e] PASS (browser)");
  })
  .catch((err) => {
    console.error("[verify:admin-entry-e2e] FAIL", err && err.message ? err.message : err);
    process.exit(1);
  });
