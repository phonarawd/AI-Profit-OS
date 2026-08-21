/**
 * verify:invite-closure — REL-120
 * /me/invite referral owner · unauthorized/ready · leftover 5-tab chrome 0.
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
  "apps/web/app/me/invite/page.tsx",
  "apps/web/app/me/invite/InviteClient.tsx",
  "apps/web/app/me/layout.tsx",
  "apps/web/app/me/AccountFrame.tsx",
  "tooling/e2e/specs/invite-closure.spec.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/me/invite/page.tsx");
const client = read("apps/web/app/me/invite/InviteClient.tsx");
const layout = read("apps/web/app/me/layout.tsx");
const spec = read("tooling/e2e/specs/invite-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
const home = read("packages/ui/components/invite/InviteHome.tsx");

if (!page.includes("InviteClient")) fail("invite page must mount InviteClient");
if (!client.includes("/api/v1/referral/me")) {
  fail("InviteClient must call GET /api/v1/referral/me");
}
if (!client.includes("unauthorized") || !client.includes("unavailable")) {
  fail("InviteClient must distinguish unauthorized/unavailable");
}
if (/joined:\s*0|statsJoined.*0/.test(client) && /catch/.test(client)) {
  fail("invite must not invent joined=0 on error");
}
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}
if (home.includes('?? 0') || /stats\?\.joined \?\? 0/.test(home)) {
  fail("InviteHome must not default missing stats to 0");
}
if (!spec.includes("unauthorized") || !spec.includes("ready")) {
  fail("committed spec must cover unauthorized/ready");
}
if (!pkg.includes('"verify:invite-closure"')) {
  fail("package.json missing verify:invite-closure");
}
if (!catalog.includes("invite-closure")) {
  fail("CATALOG.md must list invite-closure");
}
if (!domain.includes("invite-closure.cjs")) {
  fail("domain-by-path must trigger invite-closure");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:invite-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:invite-closure] PASS — referral owner · no fake zero · no leftover chrome" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.INVITE_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.INVITE_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "invite-closure.spec.cjs",
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
      fail("committed Playwright invite-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
