/**
 * verify:rel-502-current-epoch-once
 *
 * Auth+Wallet current-epoch one-shot workflow 고정 검증.
 * 증거 파일을 생성·위조하지 않는다. secret VALUE는 로그에 출력하지 않는다.
 *
 *   (기본)                 YAML pin / 범위 / fail-closed 정적 검사
 *   --runtime-pins         live baseline · workflow hash · branch/marker
 *   --publication-safety   2e75a13..HEAD 전 commit blob+message secret scan
 *   --qa8-preflight        QA8 full PRE-FLIGHT ONLY (persist 금지)
 *   --persist-safety       QA6 intermediate persist 전용 compensating control
 *   --persist-safety --cached
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const WF_REL = ".github/workflows/rel-502-auth-wallet-current-epoch-once.yml";
const EA_WF_REL = ".github/workflows/engine-acceptance.yml";
const BASELINE_REL = "governance/engine-acceptance/baseline.v1.json";
const EVIDENCE_REL = "governance/engine-acceptance/evidence-manifest.v1.json";
const CERT_REL = "governance/engine-acceptance/FINAL_ACCEPTANCE.md";
const SCOPE_REL = "governance/engine-acceptance/protected-scope.v1.json";
const REBASE_REL = "governance/engine-acceptance/product-rebases.v1.json";
const PKG_REL = "package.json";
const CATALOG_REL = "tooling/verify/CATALOG.md";
const DOMAIN_REL = "tooling/verify/domain-by-path.cjs";

const REPOSITORY = "phonarawd/AI-Profit-OS";
const BRANCH = "release/auth-wallet-rel502-v1-20260828";
const MARKER = "fix(rel-502): use qa6 intermediate persist-safety";
const PERSIST_SUBJECT = "chore(rel-502): persist current-epoch qa1-qa6 evidence";
const BASE_MAIN = "2e75a13be17f32ff5337851f426f22aa777d86b9";
const BASELINE_ID = "ea-baseline-cc627efc3ee2-defdfa5b6ac4";
const AGGREGATE = "defdfa5b6ac45ce3ea03ee2f392b9f8c1a89f84ec5826dede5def6c08b479d23";
const WORKFLOW_HASH = "b8e724ba3af9e2d240f4daeefd53d4330972afdb942396698389825167752aa7";
const PRODUCT_COMMIT = "cc627efc3ee20e43df4888692e346dca2414e399";
const PATH_COUNT = 452;
const SNAPSHOT_DIR = "/tmp/aipo-rel502-qa6-governance-snapshot";

const ALLOWLIST = [
  "governance/engine-acceptance/qa1-result.v1.json",
  "governance/engine-acceptance/qa2-result.v1.json",
  "governance/engine-acceptance/qa3-result.v1.json",
  "governance/engine-acceptance/qa4-result.v1.json",
  "governance/engine-acceptance/qa5-result.v1.json",
  "governance/engine-acceptance/qa6-result.v1.json",
  "governance/engine-acceptance/evidence-manifest.v1.json",
  "governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md",
  "governance/engine-acceptance/defects.v1.json",
  "governance/engine-acceptance/coverage.v1.json",
];

const FORBIDDEN_PERSIST = [
  "governance/engine-acceptance/baseline.v1.json",
  "governance/engine-acceptance/protected-scope.v1.json",
  "governance/engine-acceptance/product-rebases.v1.json",
  "governance/engine-acceptance/qa7-result.v1.json",
  "governance/engine-acceptance/qa8-result.v1.json",
  "governance/engine-acceptance/qa9-result.v1.json",
  "governance/engine-acceptance/FINAL_ACCEPTANCE.md",
];

const PROTECTED_ROOTS = [
  "services/api-nest",
  "services/engine-rust",
  "schemas",
  "eval",
  "supabase/migrations",
];

const SKIP_PUB_SCAN_PATHS = [
  "tooling/verify/rel-502-current-epoch-once.cjs",
  "tooling/verify/secrets.cjs",
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

function git(args, opts) {
  const run = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: opts && opts.timeout ? opts.timeout : 30000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (run.status !== 0) {
    if (opts && opts.allowFail) return "";
    fail("git " + args.join(" ") + " failed: " + String(run.stderr || run.stdout || "").split("\n")[0]);
    return "";
  }
  return String(run.stdout || "").trim();
}

function gitShow(spec) {
  const run = spawnSync("git", ["show", spec], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (run.status !== 0) return "";
  return String(run.stdout || "");
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

function parseJsonText(raw, label) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail("invalid JSON: " + label + " " + String(err.message || err));
    return null;
  }
}

function readEvidenceJson(rel, cached) {
  if (!cached) return readJson(rel);
  const staged = gitShow(":" + rel);
  if (staged) return parseJsonText(staged, "staged:" + rel);
  const head = gitShow("HEAD:" + rel);
  if (head) return parseJsonText(head, "HEAD:" + rel);
  return readJson(rel);
}

function readEvidenceText(rel, cached) {
  if (!cached) return read(rel);
  const staged = gitShow(":" + rel);
  if (staged) return staged;
  const head = gitShow("HEAD:" + rel);
  if (head) return head;
  return read(rel);
}

function isCurrentComplete(slot, result, id) {
  if (!result) {
    fail(id + " result missing");
    return false;
  }
  if (result.completion_status !== "COMPLETE") fail(id + " result not COMPLETE");
  if (result.baseline_id !== BASELINE_ID) fail(id + " result.baseline_id != current epoch");
  if (!slot || slot.completion_status !== "COMPLETE") fail(id + " evidence slot not COMPLETE");
  if (!slot || slot.baseline_id !== BASELINE_ID) fail(id + " evidence slot baseline_id != current epoch");
  return result.completion_status === "COMPLETE" && result.baseline_id === BASELINE_ID;
}

function isCurrentCompletePair(slot, result) {
  const slotCurrent = !!(slot && slot.completion_status === "COMPLETE" && slot.baseline_id === BASELINE_ID);
  const resultCurrent = !!(
    result &&
    result.completion_status === "COMPLETE" &&
    result.baseline_id === BASELINE_ID
  );
  return slotCurrent || resultCurrent;
}

function verifyStatic() {
  const wf = read(WF_REL);
  const ea = read(EA_WF_REL);
  const pkg = read(PKG_REL);
  const catalog = read(CATALOG_REL);
  const domain = read(DOMAIN_REL);
  const scope = readJson(SCOPE_REL);
  const baseline = readJson(BASELINE_REL);

  if (!wf) return;
  want(wf, "name: rel-502-auth-wallet-current-epoch-once", "workflow name");
  want(wf, REPOSITORY, "exact repository");
  want(wf, BRANCH, "branch pin");
  want(wf, MARKER, "marker commit subject");
  want(wf, PERSIST_SUBJECT, "persist commit subject");
  want(wf, BASE_MAIN, "pinned base main SHA");
  want(wf, BASELINE_ID, "baseline id pin");
  want(wf, AGGREGATE, "aggregate pin");
  want(wf, String(PATH_COUNT), "aggregate pathCount pin");
  want(wf, WORKFLOW_HASH, "workflow hash pin");
  want(wf, PRODUCT_COMMIT, "product commit pin");
  want(wf, "permissions:", "permissions block");
  want(wf, "contents: write", "contents:write");
  want(wf, "pgvector/pgvector:pg16", "isolated pgvector");
  want(wf, "POSTGRES_USER: postgres", "isolated postgres user");
  want(wf, "POSTGRES_PASSWORD: postgres", "isolated postgres password");
  want(wf, "POSTGRES_DB: aipo_qa_synth", "isolated postgres db");
  want(wf, "AIPO_QA_PGHOST: 127.0.0.1", "localhost-only PG host");
  want(wf, "--assert-db-target", "assert-db-target");
  want(wf, "pg_isready", "DB readiness");
  want(wf, "run-qa1.cjs", "QA1 full");
  want(wf, "run-qa2.cjs --mode full", "QA2 full");
  want(wf, "run-qa3.cjs --mode full", "QA3 full");
  want(wf, "run-qa4-clock.cjs", "QA4 clock harness before canonical");
  want(wf, "run-qa4.cjs --mode full", "QA4 canonical full");
  want(wf, "run-qa5-fault.cjs", "QA5 fault harness");
  want(wf, "run-qa5.cjs --mode tiny", "QA5 canonical tiny");
  want(wf, "k6-v0.54.0-linux-amd64", "k6 0.54.0 pin");
  want(wf, "run-qa6-threshold.cjs", "QA6 threshold harness");
  want(wf, "run-qa6.cjs --mode full", "QA6 canonical full");
  want(wf, "measurement-only runner remains disconnected", "QA6 measure runner disconnected");
  want(wf, "run-qa8-adversarial.cjs", "QA8 adversarial harness");
  want(wf, "run-qa8.cjs --mode full", "QA8 canonical full");
  want(wf, "PRE-FLIGHT ONLY", "QA8 preflight-only");
  want(wf, SNAPSHOT_DIR, "QA8 governance snapshot restore required");
  want(wf, "--qa8-preflight", "QA8 preflight verifier");
  want(wf, "QA8 formal persist forbidden", "QA8 formal persist forbidden");
  want(wf, "epoch-once-evidence-after-qa6", "persist source is QA6 snapshot");
  want(wf, "--publication-safety", "publication history scan");
  want(wf, "--persist-safety", "persist safety");
  want(wf, "--persist-safety --cached", "persist safety cached");
  want(wf, "pnpm verify:secrets", "secret scan");
  want(wf, "GITHUB_SHA", "race check against GITHUB_SHA");
  want(wf, 'git fetch --no-tags origin "${AIPO_EPOCH_BRANCH}"', "race check fetch");
  want(wf, 'git ls-remote --heads origin', "authoritative ls-remote race read");
  want(wf, 'git checkout -B "${AIPO_EPOCH_BRANCH}" "${GITHUB_SHA}"', "exact branch attachment");
  want(wf, 'test "$(git rev-parse HEAD)" = "${GITHUB_SHA}"', "HEAD == GITHUB_SHA after attach");
  want(wf, "HEAD:refs/heads/" + BRANCH, "pinned FF push ref");
  for (const rel of ALLOWLIST) {
    want(wf, rel, "exact staging allowlist");
  }

  forbid(wf, "run-qa4.cjs --mode tiny", "QA4 must not persist tiny");
  forbid(wf, "run-qa8.cjs --mode tiny", "QA8 preflight must be full");
  if (/node tooling\/engine-acceptance\/run-qa6-measure\.cjs/.test(wf)) {
    fail("QA6 measure runner must stay disconnected");
  }
  forbid(wf, "run-qa7.cjs", "one-shot must not run QA7");
  forbid(wf, "publish-qa7-formal.cjs", "one-shot must not publish QA7 formal");
  forbid(wf, "run-qa9.cjs", "one-shot must not aggregate QA9");
  forbid(wf, "--force", "force push forbidden");
  forbid(wf, "force-with-lease", "force push forbidden");
  forbid(wf, "STATUS = ISSUED", "must not issue FINAL_ACCEPTANCE");
  forbid(wf, "CERT_ISSUED=1", "must not issue CERT");
  forbid(wf, "ENGINE_ACCEPTED_FOR_UI", "must not issue ENGINE_ACCEPTED_FOR_UI");
  forbid(wf, "pr52-current-epoch-evidence-once", "must not copy stale PR52 workflow");
  forbid(wf, "workflow_dispatch", "dispatch is not an allowed trigger");
  forbid(wf, "packages: write", "no extra write permission");
  forbid(wf, "pull-requests: write", "no extra write permission");
  forbid(wf, "id-token: write", "no extra write permission");
  forbid(wf, "actions: write", "no extra write permission");
  forbid(wf, "mgsytcetsiecllmhcyox", "production DB mutation 0");
  forbid(wf, 'git add -- "governance/engine-acceptance"', "no blind evidence staging");
  forbid(wf, "git add governance/engine-acceptance", "no blind evidence staging");
  forbid(wf, "epoch-once-evidence-after-qa8", "persist must not consume QA8 formal tree");
  forbid(wf, "chore(rel-502): harden auth-wallet current-epoch evidence once", "stale failed marker must not remain");
  forbid(wf, "fix(rel-502): repair current-epoch one-shot execution", "stale previous marker must not remain");
  forbid(wf, "verify:engine-acceptance", "one-shot must not run global engine-acceptance");

  const qa123Match = wf.match(/\n  qa123:\r?\n([\s\S]*?)\r?\n  qa4:/);
  if (!qa123Match) {
    fail("qa123 job missing before qa4");
  } else {
    const qa123 = qa123Match[1];
    want(qa123, "if: >-", "qa123 YAML-safe folded if");
    want(qa123, "needs.guard.outputs.run_qa == 'true' &&", "qa123 run_qa");
    want(qa123, "github.repository == '" + REPOSITORY + "' &&", "qa123 repository");
    want(qa123, "github.ref == 'refs/heads/" + BRANCH + "' &&", "qa123 branch");
    want(qa123, "github.event_name == 'push' &&", "qa123 push-only");
    want(qa123, "startsWith(github.event.head_commit.message, '" + MARKER + "')", "qa123 marker startsWith");
    if (/^ {4}if:\s*\$\{\{/m.test(qa123)) {
      fail("qa123 must not use job-level if: ${{ }} wrapper");
    }
  }

  const wfMarkerEnv = 'AIPO_EPOCH_MARKER: "' + MARKER + '"';
  want(wf, wfMarkerEnv, "workflow marker env matches verifier");

  const wfLines = wf.split(/\r?\n/);
  for (let i = 0; i < wfLines.length; i += 1) {
    const line = wfLines[i];
    if (/^\s*#/.test(line)) continue;
    if (!/^ {4}if:\s+\$\{\{/.test(line)) continue;
    const value = line.replace(/^ {4}if:\s+/, "");
    if (value.includes(": ")) {
      fail(
        "unsafe job-level if: ${{ }} plain scalar contains ': ' at L" +
          (i + 1),
      );
    }
  }

  const qa6Match = wf.match(/\n  qa6:\r?\n([\s\S]*?)\r?\n  qa8:/);
  if (!qa6Match) {
    fail("qa6 job missing before qa8");
  } else {
    const qa6 = qa6Match[1];
    want(qa6, "run-qa6.cjs --mode full", "qa6 canonical full");
    want(qa6, "rel-502-current-epoch-once.cjs --persist-safety", "qa6 intermediate persist-safety");
    want(qa6, "--persist-safety", "qa6 persist-safety flag");
    forbid(qa6, "verify:engine-acceptance", "qa6 must not run global engine-acceptance");
  }

  const qa8Match = wf.match(/\n  qa8:\r?\n([\s\S]*?)\r?\n  persist:/);
  if (!qa8Match) {
    fail("qa8 job missing before persist");
  } else {
    const qa8 = qa8Match[1];
    want(qa8, "--qa8-preflight", "qa8 preflight verifier");
    want(qa8, "AIPO_QA6_SNAPSHOT", "qa8 snapshot restore");
    want(qa8, "rel-502-current-epoch-once.cjs --persist-safety", "qa8 persist-safety after restore");
    want(qa8, "QA8 formal persist forbidden", "qa8 formal persist forbidden");
  }

  const persistIdx = wf.search(/\n  persist:/);
  if (persistIdx < 0) {
    fail("persist job missing");
  } else {
    const beforePersistActive = wf
      .slice(0, persistIdx)
      .split(/\r?\n/)
      .filter((line) => !/^\s*#/.test(line))
      .join("\n");
    if (beforePersistActive.includes("--no-verify")) {
      fail("non-persist job must not use --no-verify");
    }
    const persistJob = wf.slice(persistIdx);
    want(persistJob, "--runtime-pins", "persist runtime-pins");
    want(persistJob, "--publication-safety", "persist publication-safety");
    want(persistJob, "--persist-safety", "persist persist-safety");
    want(persistJob, "--persist-safety --cached", "persist persist-safety cached");
    want(persistJob, "pnpm verify:secrets", "persist secret scan");
    want(persistJob, "GITHUB_SHA", "persist race GITHUB_SHA");
    want(persistJob, 'git ls-remote --heads origin', "persist ls-remote race");
    for (const rel of ALLOWLIST) {
      want(persistJob, rel, "persist exact allowlist");
    }
  }

  const nvMatches = [];
  for (let i = 0; i < wfLines.length; i += 1) {
    if (/^\s*#/.test(wfLines[i])) continue;
    if (wfLines[i].includes("--no-verify")) nvMatches.push(i);
  }
  if (nvMatches.length === 0) {
    fail("evidence persist must declare --no-verify after compensating controls");
  } else if (nvMatches.length > 1) {
    fail("only evidence persist may use --no-verify");
  } else {
    const before = wfLines.slice(0, nvMatches[0]).join("\n");
    const requiredBefore = [
      "--publication-safety",
      "--persist-safety",
      "--persist-safety --cached",
      "pnpm verify:secrets",
      "qa1-result.v1.json",
      "GITHUB_SHA",
      SNAPSHOT_DIR,
      "--qa8-preflight",
    ];
    for (const req of requiredBefore) {
      if (!before.includes(req)) fail("--no-verify without preceding " + JSON.stringify(req));
    }
  }

  if (ea) {
    want(ea, "run-qa2.cjs --mode full", "formal SSOT QA2 full");
    want(ea, "run-qa3.cjs --mode full", "formal SSOT QA3 full");
    want(ea, "run-qa4.cjs --mode full", "formal SSOT QA4 full");
    want(ea, "run-qa5.cjs --mode tiny", "formal SSOT QA5 tiny");
    want(ea, "run-qa6.cjs --mode full", "formal SSOT QA6 full");
    want(ea, "run-qa8.cjs --mode full", "formal SSOT QA8 full");
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
    if (baseline.commit_sha !== PRODUCT_COMMIT) {
      fail("live baseline.commit_sha != pinned product commit");
    }
  }

  if (!pkg.includes("verify:rel-502-current-epoch-once")) {
    fail("package.json missing verify:rel-502-current-epoch-once");
  }
  if (!pkg.includes("verify:rel-502-publication-safety")) {
    fail("package.json missing verify:rel-502-publication-safety");
  }
  if (!pkg.includes("rel-502-current-epoch-once.cjs --publication-safety")) {
    fail("publication-safety script must call existing verifier");
  }
  if (!catalog.includes("rel-502-current-epoch-once")) {
    fail("CATALOG missing rel-502-current-epoch-once");
  }
  if (!catalog.includes("rel-502-publication-safety")) {
    fail("CATALOG missing rel-502-publication-safety");
  }
  if (!domain.includes("rel-502-current-epoch-once.cjs")) {
    fail("domain-by-path missing rel-502-current-epoch-once");
  }
  if (!/rel-502-auth-wallet-current-epoch-once/.test(domain)) {
    fail("domain-by-path must trigger on one-shot workflow");
  }
}

function verifyRuntimePins() {
  const { hashPathList, readJson: readGovJson } = require("../engine-acceptance/lib/hash-scope.cjs");
  const baseline = readGovJson(BASELINE_REL);
  const scope = readGovJson(SCOPE_REL);
  const ref = process.env.GITHUB_REF || "";
  const repo = process.env.GITHUB_REPOSITORY || "";
  const subject = git(["log", "-1", "--pretty=%s"]);

  if (repo && repo !== REPOSITORY) {
    fail("GITHUB_REPOSITORY must be " + REPOSITORY + " (got " + repo + ")");
  }
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
  if (baseline.protected_scope_manifest.pathCount !== PATH_COUNT) {
    fail("runtime pathCount pin miss");
  }
  if (baseline.acceptance_workflow_hash !== WORKFLOW_HASH) {
    fail("runtime acceptance_workflow_hash pin miss");
  }
  if (baseline.commit_sha !== PRODUCT_COMMIT) fail("runtime product commit pin miss");
  const liveWf = hashPathList(scope.aggregateHashes.acceptance_workflow_hash, scope);
  if (liveWf !== WORKFLOW_HASH) {
    fail("live engine-acceptance.yml hash drifted from pin");
  }
  const ancProduct = spawnSync("git", ["merge-base", "--is-ancestor", PRODUCT_COMMIT, "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (ancProduct.status !== 0) {
    fail("product commit " + PRODUCT_COMMIT + " must be an ancestor of HEAD");
  }
  const ancMain = spawnSync("git", ["merge-base", "--is-ancestor", BASE_MAIN, "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (ancMain.status !== 0) {
    fail("base main " + BASE_MAIN + " must be an ancestor of HEAD");
  }
  const originMain = git(["rev-parse", "origin/main"], { allowFail: true });
  if (originMain && originMain !== BASE_MAIN) {
    fail("origin/main must remain " + BASE_MAIN + " (got " + originMain + ")");
  }
}

function isEnvTemplate(filePath) {
  return /(^|\/)\.env\.(example|sample|template)(\.|$)/i.test(filePath) || /(^|\/)\.env\.[^/]+\.example$/i.test(filePath);
}

function isSensitivePath(filePath) {
  if (isEnvTemplate(filePath)) return null;
  if (/(^|\/)\.env($|\.)/i.test(filePath)) return "env-file";
  if (/\.pem$/i.test(filePath)) return "pem-file";
  if (/\.p12$/i.test(filePath) || /\.pfx$/i.test(filePath)) return "pkcs-file";
  if (/(^|\/)[^/]*private[^/]*\.key$/i.test(filePath) || /\.key$/i.test(filePath)) {
    if (/\.pub$/i.test(filePath)) return null;
    return "private-key-file";
  }
  if (/(^|\/)(credentials|service[-_]?account)[^/]*\.(json|txt)$/i.test(filePath)) {
    return "credentials-file";
  }
  if (/(secret[-_]?export|secrets?[-_]?dump)/i.test(filePath)) return "secret-export-dump";
  return null;
}

function isPlaceholderWindow(window) {
  return /\$\{\{\s*secrets\.|process\.env\.|secrets\.[A-Z0-9_]+|YOUR_[A-Z0-9_]+|change_me|changeme|xxxx|example\.com|placeholder|<REDACTED>|dummy[-_]|fake[-_]|not-a-secret|test-only|postgres:postgres@(localhost|127\.0\.0\.1)/i.test(
    window,
  );
}

function isFixturePath(filePath) {
  return /(^|\/)(fixtures?|golden|mocks?)(\/|$)|selftest|\.spec\.|\.test\./i.test(filePath);
}

function classifySecretHits(text, filePath) {
  const hits = [];
  if (!text || text.indexOf("\u0000") >= 0) return hits;
  const pathClass = filePath && filePath !== "(commit-message)" ? isSensitivePath(filePath) : null;
  if (pathClass && filePath !== "(commit-message)") {
    if (pathClass === "env-file" || pathClass === "pem-file" || pathClass === "pkcs-file" || pathClass === "credentials-file" || pathClass === "secret-export-dump") {
      hits.push(pathClass);
    } else if (pathClass === "private-key-file" && /PRIVATE KEY-----/.test(text)) {
      hits.push(pathClass);
    }
  }

  const rules = [
    { cls: "private-key-header", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
    { cls: "github-pat", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g },
    { cls: "github-pat", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
    { cls: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/g },
    { cls: "google-api-key", re: /\bAIza[0-9A-Za-z_-]{20,}\b/g },
    { cls: "stripe-live-secret", re: /\bsk_live_[0-9A-Za-z]{10,}\b/g },
    { cls: "slack-token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g },
    { cls: "jwt-token", re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
    { cls: "bearer-token", re: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/g },
    { cls: "database-url-password", re: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@[^/\s]+/gi },
    { cls: "literal-secret-env", re: /(?:GEMINI_API_KEY|RESEND_API_KEY|CLOUDFLARE_API_TOKEN|CF_API_TOKEN|JWT_USER_SECRET|JWT_ADMIN_SECRET|JWT_SECRET|DATABASE_URL|DATABASE_PASSWORD)\s*[:=]\s*(?![^\n]*(?:\$\{\{|process\.env|YOUR_|change_me|xxxx|\.\.\.))[^\s"'`]+/gi },
  ];

  for (const rule of rules) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text))) {
      const start = Math.max(0, m.index - 80);
      const window = text.slice(start, m.index + m[0].length + 80);
      if (isPlaceholderWindow(window)) continue;
      if (rule.cls === "database-url-password" && /@(localhost|127\.0\.0\.1)\b/i.test(m[0]) && /postgres:postgres@/i.test(m[0])) {
        continue;
      }
      if ((rule.cls === "jwt-token" || rule.cls === "bearer-token") && filePath && isFixturePath(filePath)) {
        continue;
      }
      hits.push(rule.cls);
      break;
    }
  }
  return hits;
}

function reportHit(sha, filePath, secretClass) {
  fail("publication secret class=" + secretClass + " commit=" + sha + " path=" + filePath);
}

function verifyPublicationSafety() {
  const range = BASE_MAIN + "..HEAD";
  const shas = git(["rev-list", "--reverse", range], { timeout: 60000 })
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!shas.length) {
    fail("publication range " + range + " has 0 commits");
    return;
  }

  for (const sha of shas) {
    const message = git(["log", "-1", "--pretty=%B", sha]);
    for (const cls of classifySecretHits(message, "(commit-message)")) {
      reportHit(sha, "(commit-message)", cls);
    }

    const changed = git(["diff-tree", "--no-commit-id", "--name-status", "-r", sha], { allowFail: true });
    for (const line of changed.split(/\r?\n/).filter(Boolean)) {
      const tab = line.indexOf("\t");
      if (tab < 0) continue;
      const status = line.slice(0, tab);
      const filePath = line.slice(tab + 1).replace(/\t.*$/, "").replace(/\\/g, "/");
      if (status.startsWith("D")) continue;
      if (SKIP_PUB_SCAN_PATHS.includes(filePath)) continue;
      if (/\.(png|jpg|jpeg|webp|gif|ico|woff2?|pdf|zip|wasm)$/i.test(filePath)) continue;

      const pathClass = isSensitivePath(filePath);
      if (pathClass && !isEnvTemplate(filePath) && pathClass !== "private-key-file") {
        reportHit(sha, filePath, pathClass);
        continue;
      }

      const blob = gitShow(sha + ":" + filePath);
      if (!blob) continue;
      if (isEnvTemplate(filePath)) {
        for (const cls of classifySecretHits(blob, filePath)) reportHit(sha, filePath, cls);
        continue;
      }
      for (const cls of classifySecretHits(blob, filePath)) reportHit(sha, filePath, cls);
    }
  }
}

function verifyQa8Preflight() {
  const evidence = readJson(EVIDENCE_REL);
  const result = readJson(suiteResultRel("QA8"));
  const defects = readJson("governance/engine-acceptance/defects.v1.json");
  if (!evidence || !result) return;

  if (result.completion_status === "FAIL" || result.completion_status === "BLOCKED") {
    fail("QA8 preflight completion_status is " + result.completion_status);
  }
  if (result.completion_status !== "COMPLETE") fail("QA8 preflight result not COMPLETE");
  if (result.mode !== "full") fail("QA8 preflight mode must be full");
  if (result.baseline_id !== BASELINE_ID) fail("QA8 preflight result.baseline_id != current epoch");
  if (result.all_checks_pass !== true) fail("QA8 preflight all_checks_pass != true");
  if (evidence.evidence_integrity !== "VALID") fail("QA8 preflight evidence_integrity != VALID");

  const counts = (result.defects_counts && result.defects_counts) || {};
  if ((counts.P0 || 0) > 0 || (counts.P1 || 0) > 0) {
    fail("QA8 preflight has P0/P1 defects");
  }
  if (defects && defects.counts && ((defects.counts.P0 || 0) > 0 || (defects.counts.P1 || 0) > 0)) {
    const qa8Defects = (defects.defects || []).filter((d) => d.suite_id === "QA8" && (d.severity === "P0" || d.severity === "P1"));
    if (qa8Defects.length) fail("QA8 preflight defects registry has P0/P1");
  }
  if (Array.isArray(result.blocked_codes_observed) && result.blocked_codes_observed.length) {
    fail("QA8 preflight blocked_codes_observed is not empty");
  }
  const ci = result.critical_invariant || {};
  if ((ci.blocked || 0) > 0) fail("QA8 preflight critical_invariant.blocked > 0");

  const world = result.checks && result.checks.security_privacy_world;
  const nested = (world && world.checks) || [];
  for (const c of nested) {
    if (c.status === "FAIL" || c.status === "BLOCKED") {
      fail("QA8 preflight check " + (c.check_id || "?") + " status=" + c.status);
    }
  }

  const slot = (evidence.suites || []).find((s) => s.suite_id === "QA8");
  if (!slot || slot.completion_status !== "COMPLETE" || slot.baseline_id !== BASELINE_ID) {
    fail("QA8 preflight evidence slot is not current COMPLETE");
  }
}

function scanTextForPersistSecrets(text, label) {
  if (!text) return;
  const hits = classifySecretHits(text, label);
  const extra = [
    { cls: "authorization-bearer", re: /authorization["'\s:=]+bearer\s+[A-Za-z0-9._~+/=-]{16,}/i },
    { cls: "cookie-session", re: /(?:set-cookie|cookie|sessionid|aipo_session)\s*[:=]\s*[^;\s]{16,}/i },
    { cls: "dsn-credential", re: /(?:postgres(?:ql)?|rediss?|mongodb(?:\+srv)?):\/\/[^:\s]+:[^@\s]+@/i },
  ];
  for (const rule of extra) {
    if (rule.re.test(text) && !isPlaceholderWindow(text)) hits.push(rule.cls);
  }
  const uniq = [...new Set(hits)];
  for (const cls of uniq) fail("persist evidence secret class=" + cls + " path=" + label);
}

function verifyPersistSafety(cached) {
  const { hashPathList, readJson: readGovJson } = require("../engine-acceptance/lib/hash-scope.cjs");
  const { loadRebaseLedger, verifyWashing } = require("../engine-acceptance/lib/product-rebase.cjs");

  const baseline = readEvidenceJson(BASELINE_REL, cached);
  const evidence = readEvidenceJson(EVIDENCE_REL, cached);
  const cert = readEvidenceText(CERT_REL, cached);
  const scope = readGovJson(SCOPE_REL);

  if (!baseline || !evidence) return;
  if (baseline.id !== BASELINE_ID) fail("persist-safety baseline.id drifted");
  if (!baseline.protected_scope_manifest || baseline.protected_scope_manifest.aggregate !== AGGREGATE) {
    fail("persist-safety aggregate drifted");
  }
  if (baseline.protected_scope_manifest.pathCount !== PATH_COUNT) {
    fail("persist-safety pathCount drifted");
  }
  if (baseline.acceptance_workflow_hash !== WORKFLOW_HASH) {
    fail("persist-safety workflow hash drifted");
  }
  if (baseline.commit_sha !== PRODUCT_COMMIT) fail("persist-safety product commit drifted");
  if (scope) {
    const liveWf = hashPathList(scope.aggregateHashes.acceptance_workflow_hash, scope);
    if (liveWf !== WORKFLOW_HASH) fail("persist-safety live workflow hash drifted");
  }

  if (cached) {
    const staged = git(["diff", "--cached", "--name-only"])
      .split(/\r?\n/)
      .map((s) => s.replace(/\\/g, "/"))
      .filter(Boolean);
    if (!staged.length) fail("persist-safety --cached requires staged files");
    for (const p of staged) {
      if (!ALLOWLIST.includes(p)) fail("persist-safety cached path outside allowlist: " + p);
      if (FORBIDDEN_PERSIST.includes(p)) fail("persist-safety cached forbidden path: " + p);
      if (/(trace|harness|raw-log)/i.test(p)) fail("raw traces must not be staged: " + p);
    }
    for (const need of [
      "governance/engine-acceptance/qa1-result.v1.json",
      "governance/engine-acceptance/qa2-result.v1.json",
      "governance/engine-acceptance/qa3-result.v1.json",
      "governance/engine-acceptance/qa4-result.v1.json",
      "governance/engine-acceptance/qa5-result.v1.json",
      "governance/engine-acceptance/qa6-result.v1.json",
      "governance/engine-acceptance/evidence-manifest.v1.json",
    ]) {
      if (!staged.includes(need)) fail("persist-safety --cached missing required staged file: " + need);
    }
    const product = git(["diff", "--cached", "--name-only", "--"].concat(PROTECTED_ROOTS));
    if (product) fail("protected product mutation staged:\n" + product);
  }

  const productDirty = git(["diff", "--name-only", "HEAD", "--"].concat(PROTECTED_ROOTS));
  if (productDirty) fail("protected product diff must be empty:\n" + productDirty);

  if (evidence.qa_phase !== "QA-6") fail("evidence-manifest.qa_phase must be QA-6");
  if (evidence.next !== "QA7_AI_EVAL") fail("evidence-manifest.next must be QA7_AI_EVAL");
  if (evidence.verdict === "ENGINE_ACCEPTED_FOR_UI") {
    fail("verdict must not be ENGINE_ACCEPTED_FOR_UI");
  }
  if (!/STATUS\s*=\s*NOT_ISSUED/.test(cert) || !/CERT_ISSUED\s*=\s*0/.test(cert)) {
    fail("FINAL_ACCEPTANCE must remain NOT_ISSUED / CERT_ISSUED=0");
  }

  const required = [
    { id: "QA1" },
    { id: "QA2", mode: "full" },
    { id: "QA3", mode: "full" },
    { id: "QA4", mode: "full" },
    { id: "QA5", mode: "tiny" },
    { id: "QA6", mode: "full" },
  ];
  for (const spec of required) {
    const result = readEvidenceJson(suiteResultRel(spec.id), cached);
    const slot = (evidence.suites || []).find((s) => s.suite_id === spec.id);
    isCurrentComplete(slot, result, spec.id);
    if (spec.mode && result && result.mode !== spec.mode) {
      fail(spec.id + " mode must be " + spec.mode + " (got " + String(result.mode) + ")");
    }
    if (result && result.product_mutation !== 0 && result.product_mutation !== undefined) {
      fail(spec.id + " product_mutation must be 0");
    }
  }

  for (const id of ["QA7", "QA8", "QA9"]) {
    const result = readEvidenceJson(suiteResultRel(id), cached);
    const slot = (evidence.suites || []).find((s) => s.suite_id === id);
    if (isCurrentCompletePair(slot, result)) {
      fail(id + " must not be current COMPLETE in persist tree");
    }
  }

  const qa9 = (evidence.suites || []).find((s) => s.suite_id === "QA9");
  if (qa9 && qa9.current_epoch_authoritative === true) {
    fail("predecessor QA9 must not be current authoritative");
  }

  try {
    const ledger = loadRebaseLedger(REBASE_REL);
    verifyWashing(baseline, evidence, ledger, (id) => readEvidenceJson(suiteResultRel(id), cached), fails);
  } catch (err) {
    fail("persist-safety washing check failed: " + String(err.message || err));
  }

  if (cached) {
    const staged = git(["diff", "--cached", "--name-only"])
      .split(/\r?\n/)
      .map((s) => s.replace(/\\/g, "/"))
      .filter(Boolean);
    for (const p of staged) {
      scanTextForPersistSecrets(gitShow(":" + p), p);
    }
  }
}

function main(argv) {
  const runtime = argv.includes("--runtime-pins");
  const publication = argv.includes("--publication-safety");
  const qa8Preflight = argv.includes("--qa8-preflight");
  const persistSafety = argv.includes("--persist-safety");
  const cached = argv.includes("--cached");

  if (!runtime && !publication && !qa8Preflight && !persistSafety) verifyStatic();
  if (runtime) verifyRuntimePins();
  if (publication) verifyPublicationSafety();
  if (qa8Preflight) verifyQa8Preflight();
  if (persistSafety) verifyPersistSafety(cached);

  if (fails.length) {
    console.error("[verify:rel-502-current-epoch-once] FAIL");
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  const mode = qa8Preflight
    ? "qa8-preflight"
    : persistSafety
      ? cached
        ? "persist-safety-cached"
        : "persist-safety"
      : publication
        ? "publication-safety"
        : runtime
          ? "runtime-pins"
          : "static";
  console.log("[verify:rel-502-current-epoch-once] PASS (" + mode + ")");
}

main(process.argv.slice(2));
