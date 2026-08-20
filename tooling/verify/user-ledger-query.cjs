/**
 * verify:user-ledger-query — REL-015
 * 유저 JWT 본인 전표만 · decimal string · 빈목록/정상목록 · UPDATE 엔드포인트 0
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
  "services/api-nest/ledger-user-query.core.cjs",
  "services/api-nest/src/ledger/ledger.user-query.service.ts",
  "services/api-nest/src/ledger/ledger.user.controller.ts",
  "services/api-nest/src/ledger/ledger.user-query.selftest.ts",
  "tooling/e2e/lib/ledger-user-query-harness.cjs",
  "tooling/e2e/specs/ledger-user-query.spec.cjs",
]) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

const ctrl = read("services/api-nest/src/ledger/ledger.user.controller.ts");
if (!ctrl.includes("JwtAuthGuard")) {
  fails.push("user ledger controller must use JwtAuthGuard");
}
if (!/@Controller\("me\/ledger"\)/.test(ctrl)) {
  fails.push('user ledger controller must be @Controller("me/ledger")');
}
if (/@(Post|Put|Patch|Delete)\(/.test(ctrl)) {
  fails.push("user ledger controller must be GET-only (no write path)");
}
if (/@Query\(\s*["']userId["']/.test(ctrl)) {
  fails.push("user ledger must ignore query.userId (session only)");
}

const svc = read("services/api-nest/src/ledger/ledger.user-query.service.ts");
if (/\bUPDATE\s+(?:public\.)?ledger_|\bINSERT\s+INTO\s+|\bDELETE\s+FROM\s+/i.test(svc)) {
  fails.push("user query service must be SELECT-only");
}
if (!svc.includes("amount_usdt::text")) {
  fails.push("SQL amounts must be selected as text (decimal string)");
}

const routes = read("services/api-nest/src/ledger/ledger.routes.ts");
if (!routes.includes("LEDGER_USER_ROUTES")) {
  fails.push("LEDGER_USER_ROUTES missing");
}

const mod = read("services/api-nest/src/ledger/ledger.module.ts");
if (!mod.includes("LedgerUserController") || !mod.includes("LedgerUserQueryService")) {
  fails.push("LedgerModule must register user query controller/service");
}

const core = require(path.join(root, "services/api-nest/ledger-user-query.core.cjs"));
const {
  runLedgerUserQueryCases,
} = require(path.join(root, "tooling/e2e/lib/ledger-user-query-harness.cjs"));
const cases = runLedgerUserQueryCases();
if (cases.unauth.status !== 401) fails.push("missing JWT must be 401");
if (cases.empty.status !== 200 || cases.empty.total !== 0) {
  fails.push("empty list must be 200 total=0");
}
if (
  cases.listed.status !== 200 ||
  cases.listed.total !== 1 ||
  cases.listed.items[0].entries[0].amountUsdt !== "10.5"
) {
  fails.push("own list must return decimal-string amounts");
}
if (cases.other.status !== 403 || cases.other.messageKo !== core.FORBIDDEN_KO) {
  fails.push("foreign journal must be 403");
}

const spec = read("tooling/e2e/specs/ledger-user-query.spec.cjs");
if (!spec.includes("assertQaIsolation") || !spec.includes("403")) {
  fails.push("committed spec must use QA guard and cover 403");
}
if (/mgsytcetsiecllmhcyox/.test(spec)) {
  fails.push("committed spec must not target production project_ref");
}

const {
  assertQaIsolation,
} = require(path.join(root, "tooling/e2e/lib/qa-env-isolation-guard.cjs"));
try {
  assertQaIsolation({
    purpose: "e2e",
    projectRef: "mgsytcetsiecllmhcyox",
  });
  fails.push("QA guard must block production project_ref");
} catch {
  /* expected */
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const domain = read("tooling/verify/domain-by-path.cjs");
if (!pkg.includes('"verify:user-ledger-query"')) {
  fails.push("package.json missing verify:user-ledger-query");
}
if (!catalog.includes("user-ledger-query")) {
  fails.push("CATALOG.md must list user-ledger-query");
}
if (!domain.includes("user-ledger-query.cjs")) {
  fails.push("domain-by-path must trigger user-ledger-query");
}

const tscBin = require.resolve("typescript/bin/tsc");
const distSelftest = path.join(
  root,
  "services/api-nest/dist/ledger/ledger.user-query.selftest.js",
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
    fails.push("api-nest tsc failed — cannot run ledger.user-query.selftest");
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
    fails.push("ledger.user-query.selftest Nest HTTP did not PASS");
  }
} else if (!fails.some((f) => f.includes("tsc failed"))) {
  fails.push("missing compiled ledger.user-query.selftest");
}

if (fails.length) {
  console.error("[verify:user-ledger-query] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:user-ledger-query] PASS (JWT 본인만 · 403 타인 · decimal string · GET-only · QA · Nest HTTP)",
);
