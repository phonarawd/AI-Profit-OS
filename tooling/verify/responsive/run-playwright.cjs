/**
 * Optional Playwright runner for verify:responsive.
 * Default SKIP unless RESPONSIVE_PW=1 (CI browsers) — Phase0 8GB safe.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../..");
const enabled =
  process.env.RESPONSIVE_PW === "1" || process.env.RESPONSIVE_PW === "true";

if (!enabled) {
  console.log(
    "[verify:responsive:pw] SKIP (set RESPONSIVE_PW=1 to run Playwright browsers)",
  );
  process.exit(0);
}

let playwrightCli;
try {
  playwrightCli = require.resolve("@playwright/test/cli", {
    paths: [root, __dirname],
  });
} catch {
  console.error(
    "[verify:responsive:pw] FAIL @playwright/test not installed — pnpm add -D @playwright/test && pnpm exec playwright install chromium",
  );
  process.exit(1);
}

const config = path.join(__dirname, "playwright.config.cjs");
const r = spawnSync(
  process.execPath,
  [playwrightCli, "test", "-c", config],
  {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CI: process.env.CI || "" },
  },
);

process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");

const fixtureDir = path.join(__dirname, ".fixtures");
if (fs.existsSync(fixtureDir)) {
  try {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

process.exit(r.status === 0 ? 0 : r.status || 1);
