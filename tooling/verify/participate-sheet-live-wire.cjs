/**
 * verify:participate-sheet-live-wire — REL-108 ParticipateConfirmSheet
 * 11-state names · failure ≠ closed · accepted only after participate
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fail(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const files = [
  "apps/web/components/spark-dash-room/participate-sheet.ts",
  "apps/web/components/spark-dash-room/ParticipateConfirmSheet.tsx",
  "apps/web/app/profits/[id]/OpportunityDetailClient.tsx",
  "tooling/e2e/specs/participate-sheet-closure.spec.cjs",
];
for (const f of files) mustExist(f);

const sheet = read("apps/web/components/spark-dash-room/participate-sheet.ts");
const ui = read("apps/web/components/spark-dash-room/ParticipateConfirmSheet.tsx");
const client = read("apps/web/app/profits/[id]/OpportunityDetailClient.tsx");
const spec = read("tooling/e2e/specs/participate-sheet-closure.spec.cjs");
const pkg = read("package.json");

const keys = [
  "ready",
  "issuing",
  "submitting",
  "accepted",
  "reused",
  "preflight_required",
  "insufficient",
  "stale",
  "expired",
  "blocked",
  "auth",
];
for (const key of keys) {
  if (!sheet.includes(`"${key}"`) && !sheet.includes(`case "${key}"`)) {
    fail(`participate-sheet missing visual key ${key}`);
  }
  if (!spec.includes(key)) {
    fail(`participate-sheet-closure must cover ${key}`);
  }
}

if (!ui.includes("PREFLIGHT_READY") && !sheet.includes("PREFLIGHT_READY")) {
  fail("sheet must keep PREFLIGHT_READY");
}
if (!client.includes("PHASE_SUBMITTING") || !client.includes("postParticipate")) {
  fail("detail must submit only through postParticipate");
}
if (client.includes("PHASE_ACCEPTED") && !client.includes("result.tradeId")) {
  fail("accepted must come from participate result");
}
if (!spec.includes("INSUFFICIENT_PRINCIPAL") || !spec.includes("PREFLIGHT_REQUIRED")) {
  fail("spec must keep at least two server failure states");
}
if (!spec.includes("SUBMITTING") || !spec.includes("participateDelayMs")) {
  fail("spec must prove accepted does not lead the server");
}
if (!pkg.includes('"verify:participate-sheet-live-wire"')) {
  fail("package.json missing verify:participate-sheet-live-wire");
}

if (fails.length) {
  console.error("[verify:participate-sheet-live-wire] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

function finish(extra) {
  if (fails.length) {
    console.error("[verify:participate-sheet-live-wire] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log(
    "[verify:participate-sheet-live-wire] PASS — 11-state · failure≠closed · accepted after server" +
      (extra ? ` · ${extra}` : ""),
  );
}

if (process.env.PARTICIPATE_SHEET_STATIC_ONLY === "1") {
  finish("static-only");
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
      "participate-sheet-closure.spec.cjs",
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
      fail("committed Playwright participate-sheet-closure runtime failed");
    }
    finish("browser");
  })
  .catch((err) => {
    fail(err && err.message ? err.message : String(err));
    finish("browser");
  });
