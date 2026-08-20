/**
 * verify:auth-rate-limit — REL-010
 * committed spec 한도 초과 429 · limiter 우회 0 · QA 가드 안에서만
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

for (const rel of [
  "services/api-nest/auth-rate-limit.cjs",
  "services/api-nest/src/auth/auth-rate-limit.guard.ts",
  "services/api-nest/src/auth/auth-rate-limit.selftest.ts",
  "tooling/e2e/lib/auth-rate-limit-harness.cjs",
  "tooling/e2e/specs/auth-rate-limit.spec.cjs",
]) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const ctrl = read("services/api-nest/src/auth/auth.controller.ts");
if (!ctrl.includes("AuthRateLimitGuard")) {
  fails.push("auth.controller.ts must use AuthRateLimitGuard");
}
if (!/@UseGuards\(AuthRateLimitGuard\)/.test(ctrl)) {
  fails.push("AuthRateLimitGuard must wrap the auth controller");
}

const routes = read("services/api-nest/src/auth/auth.routes.ts");
for (const needle of [
  "signup",
  "oauthStart",
  "magicLinkRequest",
  "passkeyAuthVerify",
]) {
  if (!routes.includes(needle)) fails.push(`auth.routes missing ${needle}`);
}

const jargon = /API|Staging|DLQ|NATS|rate limit|throttle/i;
const core = require(path.join(root, "services/api-nest/auth-rate-limit.cjs"));
if (jargon.test(core.MESSAGE_KO)) {
  fails.push("limiter message must not include IT jargon");
}

core.resetAuthRateLimitStore();
process.env.AUTH_RATE_LIMIT_MAX = "2";
process.env.AUTH_RATE_LIMIT_WINDOW_MS = "60000";
const a = core.decideAuthRateLimit({
  ip: "unknown",
  account: "-",
  route: "POST /api/v1/auth/signup",
  nowMs: 1_000_000,
});
const b = core.decideAuthRateLimit({
  ip: "unknown",
  account: "-",
  route: "POST /api/v1/auth/signup",
  nowMs: 1_000_000,
});
const c = core.decideAuthRateLimit({
  ip: "unknown",
  account: "-",
  route: "POST /api/v1/auth/signup",
  nowMs: 1_000_000,
});
if (!a.allow || !b.allow || c.allow !== false || c.status !== 429) {
  fails.push("missing IP must still be limited (fail-closed, no bypass)");
}
core.resetAuthRateLimitStore();
delete process.env.AUTH_RATE_LIMIT_MAX;
delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;

const {
  assertQaIsolation,
} = require(path.join(root, "tooling/e2e/lib/qa-env-isolation-guard.cjs"));
try {
  assertQaIsolation({
    purpose: "e2e",
    projectRef: "mgsytcetsiecllmhcyox",
  });
  fails.push("QA guard must block production project_ref before auth flood");
} catch {
  /* expected */
}

const {
  runAuthRateLimitRepeat,
} = require(path.join(root, "tooling/e2e/lib/auth-rate-limit-harness.cjs"));
const rows = runAuthRateLimitRepeat({ max: 3, host: "127.0.0.1" });
if (rows.length !== 4 || rows[3].allow !== false || rows[3].status !== 429) {
  fails.push("committed harness must emit 429 after the window");
}

const spec = read("tooling/e2e/specs/auth-rate-limit.spec.cjs");
if (!spec.includes("assertQaIsolation") || !spec.includes("429")) {
  fails.push("committed spec must use QA guard and expect 429");
}
if (/mgsytcetsiecllmhcyox/.test(spec)) {
  fails.push("committed spec must not target production project_ref");
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:auth-rate-limit"')) {
  fails.push("package.json missing verify:auth-rate-limit");
}
if (!catalog.includes("auth-rate-limit")) {
  fails.push("CATALOG.md must list auth-rate-limit");
}
if (!domain.includes("auth-rate-limit.cjs")) {
  fails.push("domain-by-path must trigger auth-rate-limit");
}

const tscBin = require.resolve("typescript/bin/tsc");
const distSelftest = path.join(
  root,
  "services/api-nest/dist/auth/auth-rate-limit.selftest.js",
);
if (!fs.existsSync(distSelftest)) {
  const build = spawnSync(
    process.execPath,
    [tscBin, "-p", path.join(root, "services/api-nest/tsconfig.json")],
    { cwd: root, encoding: "utf8" },
  );
  process.stdout.write(build.stdout || "");
  process.stderr.write(build.stderr || "");
  if (build.status !== 0) {
    fails.push("api-nest tsc failed — cannot run auth-rate-limit.selftest");
  }
}
if (fs.existsSync(distSelftest)) {
  const run = spawnSync(process.execPath, [distSelftest], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
  });
  process.stdout.write(run.stdout || "");
  process.stderr.write(run.stderr || "");
  if (run.status !== 0 || !(run.stdout || "").includes("ALL PASS")) {
    fails.push("auth-rate-limit.selftest Nest HTTP 429 did not PASS");
  }
} else if (!fails.some((f) => f.includes("tsc failed"))) {
  fails.push("missing compiled auth-rate-limit.selftest");
}

if (fails.length) {
  console.error("[verify:auth-rate-limit] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:auth-rate-limit] PASS (429 after window · unknown IP limited · QA guard · Nest HTTP · bypass 0)",
);
