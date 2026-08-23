/**
 * verify:rel-502-final-engine-acceptance
 * PSM=TRUE REL 자동수집. 해시 drift면 인증 금지.
 * 2026-08-14 QA9 ENGINE_ACCEPTED_FOR_UI 를 현재 권위로 쓰지 않는다.
 * REL-004 sanity 대체 0. 로컬 QA0-QA9 가짜 PASS 0.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const psm = require("./lib/rel-502-psm.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing: " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const fixture = JSON.parse(
  read("tooling/verify/fixtures/rel-502-final-engine-acceptance.v1.json") || "{}",
);
const cert = read(psm.CERT_REL);
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const rebasePolicy = read("governance/engine-acceptance/product-rebases.v1.json");

if (fixture.collectFromPlan !== true) fails.push("fixture must collect PSM from plan");
if (Number(fixture.rel004Substitute) !== 0) fails.push("REL-004 substitute must be 0");
if (fixture.qa9PredecessorVerdictAsCurrent !== "FORBIDDEN") {
  fails.push("qa9 predecessor verdict as current must be FORBIDDEN");
}
if (Number(fixture.localQa0to9Rerun) !== 0) {
  fails.push("local QA0-QA9 fake rerun must be 0");
}

let ev;
try {
  ev = psm.evaluate(root);
} catch (err) {
  fails.push("psm evaluate: " + String(err.message || err));
}

if (ev) {
  if (!ev.collected.rels.length) fails.push("PSM REL collector returned 0");
  for (const b of ev.pendingRels) {
    fails.push("PSM REL pending: " + b.id + " STATUS=" + b.status);
  }
  const collectedIds = ev.collected.rels.map((b) => b.id);
  for (const dep of ev.yamlDeps) {
    if (!psm.todoCompleted(ev.planText, dep)) {
      fails.push("EXIT_GATE: plan todo not completed " + dep);
    }
    if (!psm.yamlCompleted(ev.planText, dep)) {
      fails.push("EXIT_GATE: YAML STATUS not COMPLETED " + dep);
    }
  }
  for (const dep of fixture.explicitNonPsmDeps || []) {
    if (!ev.yamlDeps.includes(dep)) fails.push("YAML DEPENDENCIES missing " + dep);
    if (collectedIds.includes(dep)) fails.push(dep + " must stay non-PSM explicit dep");
  }
  for (const id of collectedIds) {
    if (!ev.yamlDeps.includes(id)) {
      fails.push("new PSM REL must wait in REL-502 YAML DEPENDENCIES: " + id);
    }
  }

  const issued = psm.needle(cert, "STATUS", "ISSUED") || psm.needle(cert, "CERT_ISSUED", "1");
  const notIssued = psm.needle(cert, "STATUS", "NOT_ISSUED") && psm.needle(cert, "CERT_ISSUED", "0");

  if (!psm.needle(cert, "REL-004_SUBSTITUTE", "0")) {
    fails.push("FINAL_ACCEPTANCE must declare REL-004_SUBSTITUTE = 0");
  }
  if (!psm.needle(cert, "QA9_PREDECESSOR_VERDICT_AS_CURRENT", "0")) {
    fails.push("FINAL_ACCEPTANCE must declare QA9_PREDECESSOR_VERDICT_AS_CURRENT = 0");
  }
  if (!psm.needle(cert, "PSM_REL_PENDING", String(ev.pendingRels.length))) {
    fails.push("FINAL_ACCEPTANCE PSM_REL_PENDING drift");
  }
  if (!cert.includes("LIVE_AGGREGATE = " + ev.scope.liveAggregate)) {
    fails.push("FINAL_ACCEPTANCE LIVE_AGGREGATE stale vs live hash");
  }
  if (!cert.includes("BASELINE_AGGREGATE = " + ev.scope.baselineAggregate)) {
    fails.push("FINAL_ACCEPTANCE BASELINE_AGGREGATE stale");
  }
  if (!psm.needle(cert, "CHANGED_PATHS", String(ev.scope.changedPathCount))) {
    fails.push("FINAL_ACCEPTANCE CHANGED_PATHS stale");
  }
  if (!/EXIT_GATE/.test(cert)) fails.push("FINAL_ACCEPTANCE missing EXIT_GATE");
  if (/REL-004/.test(cert) && /대체/.test(cert) && !/대체 금지|SUBSTITUTE = 0/.test(cert)) {
    fails.push("FINAL_ACCEPTANCE must not treat REL-004 as substitute");
  }

  if (ev.scope.drift) {
    if (issued) fails.push("ISSUED forbidden while protected-scope drift");
    if (!notIssued) fails.push("drift requires STATUS = NOT_ISSUED and CERT_ISSUED = 0");
    if (!psm.needle(cert, "PROTECTED_SCOPE_DRIFT", "1")) {
      fails.push("drift must set PROTECTED_SCOPE_DRIFT = 1");
    }
    if (!psm.needle(cert, "REBASE_REQUIRED", "1")) {
      fails.push("drift must set REBASE_REQUIRED = 1");
    }
  } else {
    if (!psm.needle(cert, "PROTECTED_SCOPE_DRIFT", "0")) {
      fails.push("no-drift must set PROTECTED_SCOPE_DRIFT = 0");
    }
    if (ev.canIssue) {
      if (!issued) fails.push("current-epoch QA ready requires ISSUED cert");
    } else if (issued) {
      fails.push("ISSUED forbidden until current-epoch QA1-QA9 ready: " + ev.qa.reason);
    }
  }

  if (ev.plan502Done && !ev.canIssue) {
    fails.push("REL-502 cannot be COMPLETED until current-epoch QA0-QA9 PASS");
  }
}

if (!rebasePolicy.includes('"qa9_predecessor_verdict_as_current_authoritative": "FORBIDDEN"')) {
  fails.push("product-rebases must keep qa9 predecessor verdict FORBIDDEN");
}
if (!pkg.includes("verify:rel-502-final-engine-acceptance")) {
  fails.push("package.json missing verify:rel-502-final-engine-acceptance");
}
if (!catalog.includes("rel-502-final-engine-acceptance")) {
  fails.push("CATALOG missing rel-502-final-engine-acceptance");
}
if (!gate.includes("verify:rel-502-final-engine-acceptance")) {
  fails.push("gate.yml must run verify:rel-502-final-engine-acceptance");
}
if (!domain.includes("rel-502-final-engine-acceptance.cjs")) {
  fails.push("domain-by-path must trigger rel-502");
}
if (!domain.includes("FINAL_ACCEPTANCE")) {
  fails.push("domain-by-path must isolate FINAL_ACCEPTANCE.md from engine-acceptance spawn");
}

if (fails.length === 0) {
  for (const script of fixture.extraVerifies || []) {
    const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
      cwd: root,
      encoding: "utf8",
      timeout: 60000,
    });
    if (run.status !== 0) {
      fails.push(
        "re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0],
      );
    }
  }
}

if (fails.length) {
  console.error("[verify:rel-502-final-engine-acceptance] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:rel-502-final-engine-acceptance] PASS (PSM collect · drift fail-closed · REL-004 substitute 0)",
);
