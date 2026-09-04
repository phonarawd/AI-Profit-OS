"use strict";

const fs = require("fs");
const path = require("path");
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

const ART = "governance/release-master/rc-formal.v1.json";
const DOC = "governance/release-master/RC_FORMAL.md";
const CERT = "governance/engine-acceptance/FINAL_ACCEPTANCE.md";
const ARCHIVE_INV =
  "governance/recovery/archive/engine-drift-inventory.pre-rebase-20260902.v1.json";
const ARCHIVE_EV =
  "governance/recovery/archive/engine-rebase-evidence.pre-rebase-20260902.v1.json";
const REMOVED = [
  ".github/workflows/engine-rebase-approved-once.yml",
  ".github/workflows/engine-current-epoch-publish-once.yml",
];
// RC re-seal 2026-09-04: current epoch (PO ACK ea-rebase-ec3c9604d2ab-5ac0f4291966 · QA0-QA9 ISSUED).
// 하드코딩 = 잠금. 새 epoch 로의 re-seal 은 이 상수와 FINAL_ACCEPTANCE.md 를 함께 갱신해야 한다.
const CURRENT_BASELINE = "ea-baseline-0d8825e8f333-5ac0f4291966";
const APPLIED_FX = "tooling/verify/fixtures/migrations-applied.v1.json";

const artRaw = read(ART);
const doc = read(DOC);
const cert = read(CERT);
let art;
try {
  art = artRaw ? JSON.parse(artRaw) : null;
} catch (err) {
  fails.push("rc-formal json: " + err.message);
}

if (art) {
  if (art.schema !== "governance.release-master.rc-formal.v1") {
    fails.push("schema lock");
  }
  if (art.status !== "LOCKED") fails.push("status must be LOCKED");
  const binding = String(art.source_sha_binding || "");
  if (!/^[0-9a-f]{40}$/.test(binding)) {
    fails.push("source_sha_binding must be exact 40-char lowercase SHA");
  } else {
    const { spawnSync } = require("node:child_process");
    const head = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    })
      .stdout.trim()
      .toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(head)) {
      fails.push("cannot resolve git HEAD");
    } else if (binding === head) {
      // exact tip freeze
    } else {
      const mb = spawnSync("git", ["merge-base", binding, head], {
        cwd: root,
        encoding: "utf8",
      }).stdout.trim().toLowerCase();
      if (mb !== binding) {
        fails.push("source_sha_binding must be HEAD or an ancestor of HEAD");
      } else {
        const diff = spawnSync(
          "git",
          ["diff", "--name-only", binding, head],
          { cwd: root, encoding: "utf8" },
        )
          .stdout.split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        // evidence-only tip 허용 경로: 거버넌스 · 플랜 · 검증기 · e2e · 워크플로 · 에이전트 훅/셀프테스트 · ignore.
        // 제품(apps/ services/ packages/ workers/ supabase/ schemas/ …)은 전부 불허 → re-seal 필요.
        const disallowed = diff.filter(
          (p) =>
            !p.startsWith("governance/") &&
            !p.startsWith(".cursor/plans/") &&
            !p.startsWith(".cursor/hooks/") &&
            !p.startsWith(".cursor/rules/") &&
            !p.startsWith("tooling/verify/") &&
            !p.startsWith("tooling/e2e/") &&
            !p.startsWith(".github/workflows/") &&
            !/^scripts\/(verify-|hook-)[^/]+\.mjs$/.test(p) &&
            p !== ".gitignore" &&
            p !== ".gitattributes",
        );
        if (disallowed.length) {
          fails.push(
            "HEAD diverges from RC binding outside governance/evidence: " +
              disallowed.slice(0, 8).join(","),
          );
        }
      }
    }
  }
  if (art.engine_final_acceptance !== "ISSUED") fails.push("engine_final_acceptance");
  if (art.engine_baseline !== CURRENT_BASELINE) {
    fails.push("engine_baseline");
  }
  if (art.engine_qa9 !== "ENGINE_ACCEPTED_FOR_UI") fails.push("engine_qa9");
  if (art.protected_scope_drift !== 0) fails.push("protected_scope_drift");
  if (art.historical_82_path_evidence !== "PRESERVED") {
    fails.push("historical_82_path_evidence");
  }
  if (art.baseline_washing !== 0) fails.push("baseline_washing");
  if (art.one_shot_acceptance_workflows !== "REMOVED") {
    fails.push("one_shot_acceptance_workflows");
  }
  // REL-701-DB 상태는 migration fixture(rel701db.status) 와 1:1 로 일치해야 한다 (은닉·선반영 모두 FAIL).
  let rel701dbApplied = false;
  try {
    const fx = JSON.parse(read(APPLIED_FX) || "{}");
    rel701dbApplied = Boolean(fx.rel701db && fx.rel701db.status === "APPLIED");
  } catch (err) {
    fails.push("migrations fixture unreadable: " + err.message);
  }
  if (rel701dbApplied) {
    if (art.production_db_apply !== 1) fails.push("production_db_apply must be 1 after REL-701-DB");
    if (art.production_db_apply_owner !== "REL-701-DB") fails.push("production_db_apply_owner");
    if (!/^\d{4}-\d{2}-\d{2}T/.test(String(art.production_db_apply_at || ""))) {
      fails.push("production_db_apply_at must be ISO timestamp");
    }
    if (
      !art.production_db_apply_evidence ||
      !fs.existsSync(path.join(root, String(art.production_db_apply_evidence)))
    ) {
      fails.push("production_db_apply_evidence file missing");
    }
    if (art.production_schema_parity_migration !== "APPLIED_BY_REL-701-DB") {
      fails.push("production_schema_parity_migration must be APPLIED_BY_REL-701-DB after apply");
    }
    if (art.next !== "REL-701_FOUNDER_WORKFLOW_DISPATCH") {
      fails.push("next must be REL-701_FOUNDER_WORKFLOW_DISPATCH after REL-701-DB");
    }
  } else {
    if (art.production_db_apply !== 0) fails.push("production_db_apply must be 0");
    if (art.production_schema_parity_migration !== "UNAPPLIED") {
      fails.push("production_schema_parity_migration must stay UNAPPLIED");
    }
    if (art.next !== "REL-701-DB_FOUNDER_AUTHORIZATION") {
      fails.push("next must stay REL-701-DB_FOUNDER_AUTHORIZATION before REL-701-DB");
    }
  }
  // Production deploy 는 이 레코드로 절대 승인되지 않는다 (REL-701 = Founder workflow_dispatch).
  if (art.production_deploy !== 0) fails.push("production_deploy must be 0");
  if (art.apply_owner !== "REL-701-DB") fails.push("apply_owner");
  if (art.b3_production_promotion !== "CLOSED") {
    fails.push("b3 production promotion must stay CLOSED");
  }
  if (!art.release_artifact || art.release_artifact.release_acceptance_verdict !== "PASS") {
    fails.push("release_artifact.release_acceptance_verdict must be PASS");
  }
  if (!art.release_artifact || !/^[0-9a-f]{64}$/.test(String(art.release_artifact.artifact_digest || ""))) {
    fails.push("release_artifact.artifact_digest must be sha256 hex");
  }

  const docNeedles = [
    "STATUS = LOCKED",
    "ENGINE_FINAL_ACCEPTANCE = ISSUED",
    "ENGINE_QA9 = ENGINE_ACCEPTED_FOR_UI",
    "PRODUCTION_DEPLOY = 0",
    "ENGINE_BASELINE = " + CURRENT_BASELINE,
  ];
  if (rel701dbApplied) {
    docNeedles.push(
      "PRODUCTION_DB_APPLY = 1",
      "PRODUCTION_SCHEMA_PARITY_MIGRATION = APPLIED_BY_REL-701-DB",
      "NEXT = REL-701_FOUNDER_WORKFLOW_DISPATCH",
    );
  } else {
    docNeedles.push(
      "PRODUCTION_DB_APPLY = 0",
      "PRODUCTION_SCHEMA_PARITY_MIGRATION = UNAPPLIED",
      "NEXT = REL-701-DB_FOUNDER_AUTHORIZATION",
    );
  }
  for (const needle of docNeedles) {
    if (!doc.includes(needle)) fails.push("doc missing " + needle);
  }
  if (!doc.includes("RC_SOURCE_SHA_BINDING = " + binding)) {
    fails.push("doc RC_SOURCE_SHA_BINDING must equal artifact source_sha_binding");
  }
}
if (!/RC_SOURCE_SHA_BINDING = [0-9a-f]{40}/.test(doc)) {
  fails.push("doc missing exact RC_SOURCE_SHA_BINDING SHA");
}

if (!cert.includes("STATUS = ISSUED") || !cert.includes("CERT_ISSUED = 1")) {
  fails.push("FINAL_ACCEPTANCE must stay ISSUED");
}
if (!cert.includes("REBASE_REQUIRED = 0") || !cert.includes("ACK_RECEIVED = 1")) {
  fails.push("FINAL_ACCEPTANCE rebase/ACK lock");
}
if (!cert.includes("NEXT = RC_FORMAL")) fails.push("FINAL_ACCEPTANCE NEXT must stay RC_FORMAL");

const live = psm.compareProtectedScope();
if (live.changedPathCount !== 0) fails.push("live changed_paths must be 0");
if (live.liveAggregate !== live.baselineAggregate) {
  fails.push("live aggregate must equal baseline aggregate");
}
if (live.baselineId !== CURRENT_BASELINE) {
  fails.push("live baseline id");
}
if (!cert.includes("BASELINE_ID = " + CURRENT_BASELINE)) {
  fails.push("FINAL_ACCEPTANCE BASELINE_ID must equal RC engine_baseline");
}

if (!fs.existsSync(path.join(root, ARCHIVE_INV))) {
  fails.push("predecessor inventory archive missing");
}
if (!fs.existsSync(path.join(root, ARCHIVE_EV))) {
  fails.push("predecessor evidence archive missing");
}
const archiveInv = JSON.parse(read(ARCHIVE_INV) || "{}");
if (archiveInv.changed_paths !== 82) fails.push("archive must preserve 82 paths");
if (archiveInv.ACK_RECEIVED !== 0) fails.push("archive ACK must stay 0");

for (const rel of REMOVED) {
  if (fs.existsSync(path.join(root, rel))) {
    fails.push("temporary one-shot workflow still present: " + rel);
  }
}

const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
if (!pkg.includes("verify:rc-formal")) fails.push("package.json missing verify:rc-formal");
if (!catalog.includes("rc-formal")) fails.push("CATALOG missing rc-formal");

if (fails.length) {
  console.error("[verify:rc-formal] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:rc-formal] PASS (LOCKED · ISSUED · drift 0 · history 82 · one-shot removed · prod deploy 0 · REL-701-DB state mirrored)",
);
