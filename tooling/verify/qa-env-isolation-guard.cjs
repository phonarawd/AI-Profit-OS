/**
 * verify:qa-env-isolation-guard — REL-006
 * production URL throw · committed spec 존재 · money mutation fail-closed
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const files = [
  "tooling/e2e/README.md",
  "tooling/e2e/playwright.config.cjs",
  "tooling/e2e/fixtures/qa-allowlist.v1.json",
  "tooling/e2e/lib/qa-env-isolation-guard.cjs",
  "tooling/e2e/lib/money-mutation-gate.cjs",
  "tooling/e2e/helpers/auth-session.cjs",
  "tooling/e2e/specs/happy-path.placeholder.spec.cjs",
  "tooling/e2e/persona/qa-lab-seed.v1.md",
];
for (const f of files) mustExist(f);

const readme = read("tooling/e2e/README.md");
if (!/MCP 브라우저 클릭만으로는 DONE이 아니다/.test(readme)) {
  fails.push("README must forbid MCP-only DONE");
}

const allowlist = JSON.parse(read("tooling/e2e/fixtures/qa-allowlist.v1.json"));
if (allowlist.productionProjectRef !== "mgsytcetsiecllmhcyox") {
  fails.push("allowlist must lock production project_ref");
}

const {
  assertQaIsolation,
  redactUrl,
} = require(path.join(root, "tooling/e2e/lib/qa-env-isolation-guard.cjs"));
const {
  runMoneyMutationTest,
} = require(path.join(root, "tooling/e2e/lib/money-mutation-gate.cjs"));
const {
  createAuthSession,
} = require(path.join(root, "tooling/e2e/helpers/auth-session.cjs"));

function expectThrow(fn, needle) {
  let threw = false;
  try {
    fn();
  } catch (err) {
    threw = true;
    if (!String(err.message).includes(needle)) {
      fails.push(`throw message missing ${needle}: ${err.message}`);
    }
  }
  if (!threw) fails.push(`expected throw containing ${needle}`);
}

expectThrow(
  () =>
    assertQaIsolation({
      purpose: "qa",
      databaseUrl:
        "postgres://u:YOUR_PASSWORD@db.mgsytcetsiecllmhcyox.supabase.co:5432/postgres",
    }),
  "production",
);

expectThrow(
  () =>
    assertQaIsolation({
      purpose: "qa",
      projectRef: "mgsytcetsiecllmhcyox",
    }),
  "production",
);

let mutationRan = false;
expectThrow(
  () =>
    runMoneyMutationTest(
      () => {
        mutationRan = true;
      },
      {
        databaseUrl:
          "postgres://u:YOUR_PASSWORD@db.mgsytcetsiecllmhcyox.supabase.co:5432/postgres",
      },
    ),
  "production",
);
if (mutationRan) {
  fails.push("money mutation callback must not run on production url");
}

mutationRan = false;
expectThrow(
  () =>
    runMoneyMutationTest(() => {
      mutationRan = true;
    }, { databaseUrl: "" }),
  "fail-closed",
);
if (mutationRan) {
  fails.push("money mutation callback must not run without allowlisted target");
}

mutationRan = false;
const moneyOk = runMoneyMutationTest(
  () => {
    mutationRan = true;
    return "ok";
  },
  { databaseUrl: "postgres://u:YOUR_PASSWORD@127.0.0.1:5432/putduk_qa" },
);
if (!mutationRan || moneyOk !== "ok") {
  fails.push("allowlisted local money mutation must run");
}

const session = createAuthSession({ personaId: "qa-lab-persona-001" });
if (session.cookieName !== "aipo_session") {
  fails.push("auth session helper must use aipo_session");
}

const redacted = redactUrl("postgres://u:YOUR_PASSWORD@127.0.0.1/postgres");
if (redacted.includes("YOUR_PASSWORD")) {
  fails.push("redactUrl must not leak password");
}

const spec = read("tooling/e2e/specs/happy-path.placeholder.spec.cjs");
if (!spec.includes("assertQaIsolation") || !spec.includes("createAuthSession")) {
  fails.push("committed spec must use guard + auth session helper");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:qa-env-isolation-guard"')) {
  fails.push("package.json missing verify:qa-env-isolation-guard");
}

const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("qa-env-isolation-guard")) {
  fails.push("CATALOG.md must list qa-env-isolation-guard");
}

const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("qa-env-isolation-guard.cjs")) {
  fails.push("domain-by-path must trigger qa-env-isolation-guard");
}

if (fails.length) {
  console.error("[verify:qa-env-isolation-guard] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:qa-env-isolation-guard] PASS (production throw · money fail-closed · committed spec)",
);
