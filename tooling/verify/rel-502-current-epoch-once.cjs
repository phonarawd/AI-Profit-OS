/**
 * verify:rel-502-current-epoch-once
 *
 * Auth+Wallet current-epoch one-shot workflow 고정 검증.
 * 증거 파일을 생성·위조하지 않는다.
 *
 *   (기본)           YAML pin / 범위 / fail-closed 정적 검사
 *   --runtime-pins   live baseline · workflow hash · branch/marker
 *   --prepublish     QA1-QA6+QA8 current COMPLETE · QA7 pending ·
 *                    not accepted · protected product diff 0
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const WF_REL = ".github/workflows/rel-502-auth-wallet-current-epoch-once.yml";
const HEAVY_REL = ".github/workflows/engine-acceptance-heavy.yml";
const EA_WF_REL = ".github/workflows/engine-acceptance.yml";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const CERT_REL = "governance/engine-acceptance/FINAL_ACCEPTANCE.md";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const PKG_REL = "package.json";
const CATALOG_REL = "tooling/verify/CATALOG.md";
const DOMAIN_REL = "tooling/verify/domain-by-path.cjs";

const BRANCH = "release/auth-wallet-rel502-v1-20260828";
const MARKER = "chore(rel-502): start auth-wallet current-epoch evidence once";
const PERSIST_SUBJECT = "chore(rel-502): persist auth-wallet current-epoch QA1-QA6+QA8 evidence";
const BASELINE_ID = "ea-baseline-cc627efc3ee2-defdfa5b6ac4";
const AGGREGATE = "defdfa5b6ac45ce3ea03ee2f392b9f8c1a89f84ec5826dede5def6c08b479d23";
const WORKFLOW_HASH = "b8e724ba3af9e2d240f4daeefd53d4330972afdb942396698389825167752aa7";
const PRODUCT_COMMIT = "cc627efc3ee20e43df4888692e346dca2414e399";
const PATH_COUNT = 452;
const DISCOVERY = ["QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA8"];
const PROTECTED_ROOTS = [
  "services/api-nest",
  "services/engine-rust",
  "schemas",
  "eval",
  "supabase/migrations",
];

const fails = [];
function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail("missing: " + rel);
    return "";
  }
  return fs.readFileSync(abs, "utf8");
}

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail("invalid JSON: " + rel + " " + String(err.message || err));
    return null;
  }
}

function git(args) {
  const run = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30000,
  });
  if (run.status !== 0) {
    fail("git " + args.join(" ") + " failed: " + String(run.stderr || run.stdout || "").split("\n")[0]);
    return "";
  }
  return String(run.stdout || "").trim();
}

function want(hay, needle, label) {
  if (!hay.includes(needle)) fail(label + " missing " + JSON.stringify(needle));
}

function forbid(hay, needle, label) {
  if (hay.includes(needle)) fail(label + " must not contain " + JSON.stringify(needle));
}

function suiteResultRel(id) {
  return "governance/engine-acceptance/" + id.toLowerCase() + "-result.v1.json";
}

function isExpectedMidEpochVerifyFail(line) {
  return /qa7-result|QA7 suite|evidence QA7|verified_before_qa7|qa9-result|QA9 suite|evidence QA9|verified_before_qa9|qa_phase must be QA-9|evidence-manifest\.next must be one of|evidence-manifest\.verdict must match qa9/i.test(
    line,
  );
}

function verifyStatic() {
  const wf = read(WF_REL);
  const heavy = read(HEAVY_REL);
  const pkg = read(PKG_REL);
  const catalog = read(CATALOG_REL);
  const domain = read(DOMAIN_REL);
  const scope = readJson(SCOPE_REL);
  const baseline = readJson(BASELINE_REL);

  if (!wf) return;
  want(wf, "name: rel-502-auth-wallet-current-epoch-once", "workflow name");
  want(wf, BRANCH, "branch pin");
  want(wf, MARKER, "marker commit subject");
  want(wf, PERSIST_SUBJECT, "persist commit subject");
  want(wf, BASELINE_ID, "baseline id pin");
  want(wf, AGGREGATE, "aggregate pin");
  want(wf, WORKFLOW_HASH, "workflow hash pin");
  want(wf, PRODUCT_COMMIT, "product commit pin");
  want(wf, "pgvector/pgvector:pg16", "isolated pgvector");
  want(wf, "AIPO_QA_PGHOST", "local-only PG host env");
  want(wf, "AIPO_QA_PGUSER", "local-only PG user env");
  want(wf, "AIPO_QA_PGPASSWORD", "local-only PG password env");
  want(wf, "AIPO_QA_PGDATABASE", "local-only PG database env");
  want(wf, "AIPO_QA_PGPORT", "local-only PG port env");
  want(wf, "run-qa4-clock.cjs", "QA4 clock harness before canonical");
  want(wf, "run-qa4.cjs --mode tiny", "QA4 canonical tiny");
  want(wf, "run-qa5-fault.cjs", "QA5 fault harness");
  want(wf, "run-qa5.cjs --mode tiny", "QA5 canonical tiny");
  want(wf, "k6-v0.54.0-linux-amd64", "k6 0.54.0");
  want(wf, "run-qa6-threshold.cjs", "QA6 threshold harness");
  want(wf, "run-qa6.cjs --mode full", "QA6 canonical full");
  want(wf, "run-qa8-adversarial.cjs", "QA8 adversarial harness");
  want(wf, "run-qa8.cjs --mode tiny", "QA8 canonical tiny = heavy.yml");
  want(wf, "contents: write", "persist write permission");
  want(wf, "governance/engine-acceptance", "evidence-only stage path");
  want(wf, "--no-verify", "persist hook skip is explicit");
  want(wf, "HEAD:refs/heads/" + BRANCH, "pinned push ref");

  forbid(wf, "run-qa7.cjs", "one-shot must not run QA7");
  forbid(wf, "publish-qa7-formal.cjs", "one-shot must not publish QA7 formal");
  forbid(wf, "run-qa9.cjs", "one-shot must not aggregate QA9");
  forbid(wf, "--force", "force push forbidden");
  forbid(wf, "force-with-lease", "force push forbidden");
  forbid(wf, "STATUS = ISSUED", "must not issue FINAL_ACCEPTANCE");
  forbid(wf, "pr52-current-epoch-evidence-once", "must not copy stale PR52 workflow");

  if (heavy) {
    const heavyQa8 = /run-qa8\.cjs --mode (\w+)/.exec(heavy);
    if (!heavyQa8 || heavyQa8[1] !== "tiny") {
      fail("heavy.yml QA8 mode drifted; one-shot must be re-checked before copy");
    }
  }

  if (scope && scope.aggregateHashes && Array.isArray(scope.aggregateHashes.acceptance_workflow_hash)) {
    if (scope.aggregateHashes.acceptance_workflow_hash.includes(WF_REL)) {
      fail("one-shot workflow must stay outside acceptance_workflow_hash");
    }
    if (!scope.aggregateHashes.acceptance_workflow_hash.includes(EA_WF_REL)) {
      fail("acceptance_workflow_hash must remain pinned to engine-acceptance.yml");
    }
  }

  if (baseline) {
    if (baseline.id !== BASELINE_ID) fail("live baseline.id != pinned current epoch");
    if (!baseline.protected_scope_manifest || baseline.protected_scope_manifest.aggregate !== AGGREGATE) {
      fail("live baseline aggregate != pinned current epoch");
    }
    if (baseline.acceptance_workflow_hash !== WORKFLOW_HASH) {
      fail("live baseline acceptance_workflow_hash != pin");
    }
    if (baseline.protected_scope_manifest.pathCount !== PATH_COUNT) {
      fail("live baseline pathCount != " + PATH_COUNT);
    }
  }

  if (!pkg.includes("verify:rel-502-current-epoch-once")) {
    fail("package.json missing verify:rel-502-current-epoch-once");
  }
  if (!catalog.includes("rel-502-current-epoch-once")) {
    fail("CATALOG missing rel-502-current-epoch-once");
  }
  if (!domain.includes("rel-502-current-epoch-once.cjs")) {
    fail("domain-by-path missing rel-502-current-epoch-once");
  }
}

function verifyRuntimePins() {
  const {
    hashPathList,
    readJson: readGovJson,
  } = require("../engine-acceptance/lib/hash-scope.cjs");
  const baseline = readGovJson(BASELINE_REL);
  const scope = readGovJson(SCOPE_REL);
  const ref = process.env.GITHUB_REF || "";
  const subject = git(["log", "-1", "--pretty=%s"]);

  if (ref && ref !== "refs/heads/" + BRANCH) {
    fail("GITHUB_REF must be refs/heads/" + BRANCH + " (got " + ref + ")");
  }
  if (subject !== MARKER) {
    fail("HEAD subject must be marker " + JSON.stringify(MARKER) + " (got " + JSON.stringify(subject) + ")");
  }
  if (!baseline || baseline.id !== BASELINE_ID) fail("runtime baseline.id pin miss");
  if (!baseline.protected_scope_manifest || baseline.protected_scope_manifest.aggregate !== AGGREGATE) {
    fail("runtime aggregate pin miss");
  }
  if (baseline.acceptance_workflow_hash !== WORKFLOW_HASH) {
    fail("runtime acceptance_workflow_hash pin miss");
  }
  const liveWf = hashPathList(scope.aggregateHashes.acceptance_workflow_hash, scope);
  if (liveWf !== WORKFLOW_HASH) {
    fail("live engine-acceptance.yml hash drifted from pin");
  }
  const anc = spawnSync("git", ["merge-base", "--is-ancestor", PRODUCT_COMMIT, "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (anc.status !== 0) {
    fail("product commit " + PRODUCT_COMMIT + " must be an ancestor of HEAD");
  }
}

function verifyPrepublish() {
  const baseline = readJson(BASELINE_REL);
  const evidence = readJson(EVIDENCE_REL);
  const cert = read(CERT_REL);
  if (!baseline || !evidence) return;

  if (baseline.id !== BASELINE_ID) fail("prepublish baseline.id drifted");
  if (!baseline.protected_scope_manifest || baseline.protected_scope_manifest.aggregate !== AGGREGATE) {
    fail("prepublish aggregate drifted");
  }
  if (baseline.acceptance_workflow_hash !== WORKFLOW_HASH) {
    fail("prepublish workflow hash drifted");
  }
  if (evidence.baseline_id !== BASELINE_ID) fail("evidence-manifest.baseline_id != current epoch");
  if (evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
    fail("must not claim ENGINE_ACCEPTED_FOR_UI before QA7 formal + QA9");
  }
  if (!/STATUS\s*=\s*NOT_ISSUED/.test(cert) || !/CERT_ISSUED\s*=\s*0/.test(cert)) {
    fail("FINAL_ACCEPTANCE must remain NOT_ISSUED / CERT_ISSUED=0");
  }

  for (const id of DISCOVERY) {
    const result = readJson(suiteResultRel(id));
    const slot = (evidence.suites || []).find((s) => s.suite_id === id);
    if (!result) {
      fail(id + " result missing");
      continue;
    }
    if (result.completion_status !== "COMPLETE") fail(id + " result not COMPLETE");
    if (result.baseline_id !== BASELINE_ID) fail(id + " result.baseline_id != current epoch");
    if (!slot || slot.completion_status !== "COMPLETE") fail(id + " evidence slot not COMPLETE");
    if (slot.baseline_id !== BASELINE_ID) fail(id + " evidence slot baseline_id != current epoch");
  }

  const qa7Result = readJson(suiteResultRel("QA7"));
  const qa7 = (evidence.suites || []).find((s) => s.suite_id === "QA7");
  if (qa7 && qa7.completion_status === "COMPLETE" && qa7.baseline_id === BASELINE_ID) {
    fail("QA7 evidence slot must not be current-epoch COMPLETE before formal publish");
  }
  if (qa7Result && qa7Result.baseline_id === BASELINE_ID && qa7Result.completion_status === "COMPLETE") {
    fail("qa7-result must not be current-epoch COMPLETE before formal publish");
  }

  const porcelain = git(["status", "--porcelain", "--", "governance/engine-acceptance"]);
  if (!porcelain) fail("prepublish requires uncommitted current-epoch evidence under governance/engine-acceptance");

  const productDirty = git(["diff", "--name-only", "HEAD", "--"].concat(PROTECTED_ROOTS));
  if (productDirty) {
    fail("protected product diff must be empty:\n" + productDirty);
  }

  const rel502 = spawnSync(process.execPath, [path.join(ROOT, "tooling/verify/rel-502-final-engine-acceptance.cjs")], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 60000,
  });
  if (rel502.status !== 0) {
    fail(
      "verify:rel-502-final-engine-acceptance FAIL: " +
        String(rel502.stderr || rel502.stdout || "").split("\n")[0],
    );
  }

  const ea = spawnSync(process.execPath, [path.join(ROOT, "tooling/verify/engine-acceptance.cjs")], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120000,
  });
  if (ea.status === 0) {
    return;
  }
  const blob = String(ea.stdout || "") + "\n" + String(ea.stderr || "");
  const unexpected = blob
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2))
    .filter((l) => l && !isExpectedMidEpochVerifyFail(l));
  if (unexpected.length) {
    fail("verify:engine-acceptance unexpected FAIL:");
    for (const line of unexpected.slice(0, 12)) fail("  " + line);
  }
}

function main(argv) {
  const runtime = argv.includes("--runtime-pins");
  const prepublish = argv.includes("--prepublish");
  if (!runtime && !prepublish) verifyStatic();
  if (runtime) verifyRuntimePins();
  if (prepublish) verifyPrepublish();

  if (fails.length) {
    console.error("[verify:rel-502-current-epoch-once] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  const mode = prepublish ? "prepublish" : runtime ? "runtime-pins" : "static";
  console.log("[verify:rel-502-current-epoch-once] PASS (" + mode + ")");
}

main(process.argv.slice(2));
