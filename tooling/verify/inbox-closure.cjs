/**
 * verify:inbox-closure — REL-121
 * /me/inbox owner · unauthorized≠empty · leftover chrome 0.
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
  "apps/web/app/me/inbox/page.tsx",
  "apps/web/app/me/inbox/InboxClient.tsx",
  "apps/web/app/me/layout.tsx",
  "packages/ui/components/inbox/inbox-list-state.ts",
  "packages/ui/components/inbox/inbox-list.runtime.test.ts",
  "tooling/e2e/specs/inbox-closure.spec.cjs",
];
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) fail(`missing: ${f}`);
}

const page = read("apps/web/app/me/inbox/page.tsx");
const client = read("apps/web/app/me/inbox/InboxClient.tsx");
const layout = read("apps/web/app/me/layout.tsx");
const spec = read("tooling/e2e/specs/inbox-closure.spec.cjs");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");

if (!page.includes("InboxClient")) fail("inbox page must mount InboxClient");
if (!client.includes("/api/v1/me/inbox")) {
  fail("InboxClient must call GET /api/v1/me/inbox");
}
if (!client.includes("unauthorized") || !client.includes("unavailable")) {
  fail("InboxClient must distinguish unauthorized/unavailable");
}
if (!client.includes("parseInboxList") || !client.includes("classifyInboxHttp")) {
  fail("InboxClient must parse inbox lists fail-closed");
}
if (client.includes("Array.isArray(json.items)")) {
  fail("InboxClient must not invent empty ready from a missing items array");
}
if (/setItems\(\[\]\)/.test(client) && /401/.test(client)) {
  fail("inbox must not turn 401 into an empty list");
}
if (layout.includes("LegacyAppShell") || layout.includes("AppShellRoot")) {
  fail("me layout must not remount leftover 5-tab chrome");
}
if (!spec.includes("unauthorized") || !spec.includes("ready")) {
  fail("committed spec must cover unauthorized/ready");
}
if (
  !spec.includes("items: []") ||
  !spec.includes("malformed") ||
  !spec.includes("unavailable")
) {
  fail("committed spec must cover empty-valid vs malformed unavailable");
}
if (!pkg.includes('"verify:inbox-closure"')) {
  fail("package.json missing verify:inbox-closure");
}
if (!catalog.includes("inbox-closure")) {
  fail("CATALOG.md must list inbox-closure");
}
if (!domain.includes("inbox-closure.cjs")) {
  fail("domain-by-path must trigger inbox-closure");
}

const runtimeTest = spawnSync(
  process.execPath,
  [
    "--test",
    "--experimental-strip-types",
    "packages/ui/components/inbox/inbox-list.runtime.test.ts",
  ],
  { cwd: root, encoding: "utf8", timeout: 30_000 },
);
process.stdout.write(runtimeTest.stdout || "");
process.stderr.write(runtimeTest.stderr || "");
if (runtimeTest.status !== 0) {
  fail("inbox list runtime tests failed");
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:inbox-closure] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:inbox-closure] PASS — inbox owner · 401≠empty · no leftover chrome" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (
  process.env.INBOX_CLOSURE_STATIC_ONLY === "1" ||
  process.env.CI === "true" ||
  process.env.CI === "1"
) {
  finish(process.env.INBOX_CLOSURE_STATIC_ONLY === "1" ? "static-only" : "ci-static");
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
      "inbox-closure.spec.cjs",
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
      fail("committed Playwright inbox-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
