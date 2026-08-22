/**
 * verify:money-red-team — REL-501
 * 가드 PASS + 핵심 금융 실패 모드 커버. production DB 0.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

const files = [
  "tooling/e2e/matrix/money-red-team.v1.json",
  "tooling/e2e/lib/money-red-team.cjs",
  "tooling/e2e/specs/money-red-team.spec.cjs",
  "tooling/e2e/lib/qa-env-isolation-guard.cjs",
  "tooling/e2e/lib/money-mutation-gate.cjs",
  "services/engine-rust/settlement_rule.cjs",
  "services/api-nest/src/opportunities/participate.service.ts",
  "services/api-nest/src/ledger/idempotency-fingerprint.ts",
  "governance/release-master/REL-501-MONEY-RED-TEAM.md",
  "tooling/e2e/reports/money-red-team.v1.json",
];
for (const f of files) mustExist(f);

const spec = read("tooling/e2e/specs/money-red-team.spec.cjs");
if (!spec.includes("assertQaIsolation") || !spec.includes("runFailureModes")) {
  fails.push("committed spec must use guard + failure-mode runner");
}
if (/browser_navigate\s*\(|mcp_browser_|CallMcpTool/.test(spec)) {
  fails.push("MCP-only evidence is not DONE");
}

const participate = read("services/api-nest/src/opportunities/participate.service.ts");
for (const code of [
  "INSUFFICIENT_PRINCIPAL",
  "PRICE_STALE_DATA",
  "OPPORTUNITY_EXPIRED",
  "MATCH_BLOCKED",
  "idempotency",
]) {
  if (!participate.includes(code)) {
    fails.push(`participate.service missing ${code}`);
  }
}

const fingerprint = read("services/api-nest/src/ledger/idempotency-fingerprint.ts");
if (!fingerprint.includes("IDEMPOTENCY_KEY_CONFLICT")) {
  fails.push("fingerprint owner missing IDEMPOTENCY_KEY_CONFLICT");
}

if (/\bUPDATE\s+.*balance/i.test(participate)) {
  fails.push("BALANCE_UPDATE_AS_TRUTH must stay 0");
}

const pkg = read("package.json");
if (!pkg.includes('"verify:money-red-team"')) {
  fails.push("package.json missing verify:money-red-team");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("money-red-team")) {
  fails.push("CATALOG.md must list money-red-team");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("money-red-team.cjs")) {
  fails.push("domain-by-path must trigger money-red-team");
}

if (fails.length === 0) {
  const {
    loadMatrix,
    runFailureModes,
    assertProductionDenied,
  } = require(path.join(root, "tooling/e2e/lib/money-red-team.cjs"));

  try {
    assertProductionDenied();
    const matrix = loadMatrix();
    const report = runFailureModes();
    if (report.productionDbWrite !== 0) {
      fails.push("productionDbWrite must stay 0");
    }
    if (report.liveDbMoneyMutation !== "NOT_RUN") {
      fails.push("do not claim live DB money mutation without an isolated QA DB");
    }
    for (const mode of matrix.modes) {
      const row = report.results.find((r) => r.id === mode.id);
      if (!row || !row.pass) {
        fails.push(`failure mode ${mode.id} not covered (${row && row.actual})`);
      }
    }
    const saved = JSON.parse(
      read("tooling/e2e/reports/money-red-team.v1.json") || "{}",
    );
    if (saved.rel !== "REL-501" || saved.liveDbMoneyMutation !== "NOT_RUN") {
      fails.push("committed red-team report must keep liveDbMoneyMutation=NOT_RUN");
    }
    if (saved.productionDbWrite !== 0) {
      fails.push("committed red-team report must keep productionDbWrite=0");
    }
    for (const mode of matrix.modes) {
      if (!(saved.coveredModes || []).includes(mode.id)) {
        fails.push(`committed report missing mode ${mode.id}`);
      }
    }
  } catch (err) {
    fails.push(err.message);
  }
}

if (fails.length === 0) {
  for (const script of [
    "qa-env-isolation-guard.cjs",
    "money-unavailable.cjs",
    "participate-http.cjs",
    "idempotency-conflict-detection.cjs",
  ]) {
    const r = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
      cwd: root,
      encoding: "utf8",
    });
    if (r.status !== 0) {
      fails.push(`${script} FAIL\n${r.stdout || ""}${r.stderr || ""}`);
    }
  }
}

if (fails.length) {
  console.error("[verify:money-red-team] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:money-red-team] PASS (guard · 7 failure modes · production DB 0 · live mutation NOT_RUN)",
);
