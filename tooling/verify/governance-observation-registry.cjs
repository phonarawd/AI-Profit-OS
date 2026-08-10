/**
 * verify:governance-observation-registry — R0-4 Observation Registry
 *
 * 검증:
 * 1) schemas/governance-observation.v1.json 존재·필수 필드/enum
 * 2) governance/platform-redesign/governance-observations.v1.json 존재·스키마
 * 3) status ∈ {observed,deferred,promoted,rejected}
 * 4) currentlyOccurring(boolean) ⊥ reviewTrigger(string) 분리
 * 5) R0 신규 규칙 가상생성0 · materialize0 · promoted0 · 구현코드0
 * 6) handoff 6 observation id 전수 등록
 * 7) R0 신규 4게이트 package.json+CATALOG 배선 (ghost verify 금지)
 * 8) BOOTSTRAP 다음=01 Money redesign-r1-money-read-contract
 * 9) prerequisites(R0-1~R0-3) 존재
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

const ALLOWED_STATUS = new Set([
  "observed",
  "deferred",
  "promoted",
  "rejected",
]);
const ALLOWED_OWNER = new Set([
  "00-index",
  "01-money",
  "02-engine",
  "03-ui",
  "04-admin",
  "05-pwa",
  "06-infra",
]);
const REQUIRED_OBS_IDS = [
  "settlement-rule-parity-evidence-gap",
  "idempotency-conflict-detection-invariant-gap",
  "committed-event-publication-durability-gap",
  "user-mutation-subject-binding-violation",
  "internal-trigger-machine-auth-gap",
  "adapters-ingest-fail-open-machine-auth",
];
const R0_GATES = [
  "platform-redesign-inventory",
  "platform-fact-state-registry",
  "platform-change-control",
  "governance-observation-registry",
];

const schemaPath = path.join(root, "schemas/governance-observation.v1.json");
const registryPath = path.join(
  root,
  "governance/platform-redesign/governance-observations.v1.json",
);
const baselinePath = path.join(
  root,
  "governance/platform-redesign/baseline.v1.json",
);
const bootstrapPath = path.join(root, "docs/CONSTITUTION_BOOTSTRAP.md");

function fail(msg) {
  fails.push(msg);
}

function hasBackslash(s) {
  return typeof s === "string" && s.includes("\\");
}

function assertNoBackslash(label, value) {
  if (typeof value === "string") {
    if (hasBackslash(value)) {
      fail(`${label} must use canonical / separator: ${value}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) assertNoBackslash(label, v);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      assertNoBackslash(`${label}.${k}`, v);
    }
  }
}

if (!fs.existsSync(schemaPath)) {
  fail("missing schemas/governance-observation.v1.json");
}
if (!fs.existsSync(registryPath)) {
  fail("missing governance/platform-redesign/governance-observations.v1.json");
}

for (const rel of [
  "governance/platform-redesign/baseline.v1.json",
  "governance/platform-redesign/route-contract-matrix.v1.json",
  "governance/platform-redesign/fact-state-registry.v1.json",
  "governance/platform-redesign/change-control.v1.md",
]) {
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`prerequisite missing: ${rel}`);
  }
}

let schema;
let reg;
let baseline;

try {
  schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
} catch {
  fail("governance-observation.v1.json invalid JSON");
}
try {
  reg = JSON.parse(fs.readFileSync(registryPath, "utf8"));
} catch {
  fail("governance-observations.v1.json invalid JSON");
}
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch {
  fail("baseline.v1.json invalid JSON");
}

if (schema) {
  if (schema.title !== "GovernanceObservationV1") {
    fail("schema.title must be GovernanceObservationV1");
  }
  const st = schema.properties?.status?.enum;
  if (!Array.isArray(st) || !ALLOWED_STATUS.size) {
    fail("schema.status.enum required");
  } else {
    for (const s of ALLOWED_STATUS) {
      if (!st.includes(s)) fail(`schema.status.enum missing ${s}`);
    }
    if (st.length !== 4) fail("schema.status.enum must be exactly 4 values");
  }
  for (const req of [
    "id",
    "status",
    "currentlyOccurring",
    "reviewTrigger",
    "invariant",
    "evidence",
    "ownerPlan",
  ]) {
    if (!(schema.required || []).includes(req)) {
      fail(`schema.required missing ${req}`);
    }
  }
  if (schema.properties?.currentlyOccurring?.type !== "boolean") {
    fail("schema.currentlyOccurring must be boolean");
  }
  if (schema.properties?.reviewTrigger?.type !== "string") {
    fail("schema.reviewTrigger must be string");
  }
  // 분리 잠금: 동일 필드/alias 금지
  if (schema.properties?.currentlyOccurring === schema.properties?.reviewTrigger) {
    fail("currentlyOccurring and reviewTrigger must be distinct properties");
  }
  if (schema.properties?.isCurrentlyOccurring || schema.properties?.currentOccurrence) {
    fail("forbidden alias for currentlyOccurring — use currentlyOccurring only");
  }
}

if (reg) {
  if (reg.schema !== "governance.platform-redesign.observations.v1") {
    fail("registry.schema mismatch");
  }
  if (reg.redesignStage !== "R0") fail("registry.redesignStage must be R0");
  if (reg.todoId !== "platform-redesign-r0-observation-registry") {
    fail("registry.todoId mismatch");
  }
  if (reg.pathSeparator !== "/") fail("registry.pathSeparator must be /");
  if (
    reg.observationSchemaPath !== "schemas/governance-observation.v1.json"
  ) {
    fail("observationSchemaPath mismatch");
  }
  if (reg.implementationCode !== 0) {
    fail("implementationCode must be 0");
  }
  if (reg.virtualRulesCreated !== 0) {
    fail("virtualRulesCreated must be 0 (R0 신규 규칙 가상생성0)");
  }
  if (reg.materializedTodos !== 0) {
    fail("materializedTodos must be 0 at R0");
  }
  if (reg.locks?.virtualRuleCreationAtR0 !== 0) {
    fail("locks.virtualRuleCreationAtR0 must be 0");
  }
  if (reg.locks?.promotionAtR0 !== 0) {
    fail("locks.promotionAtR0 must be 0");
  }
  if (reg.locks?.materializeAtR0 !== 0) {
    fail("locks.materializeAtR0 must be 0");
  }

  if (!reg.basedOn || typeof reg.basedOn !== "object") {
    fail("registry.basedOn required");
  } else {
    if (
      reg.basedOn.baselinePath !==
      "governance/platform-redesign/baseline.v1.json"
    ) {
      fail("basedOn.baselinePath mismatch");
    }
    if (
      baseline &&
      reg.basedOn.baselineCommitSha !== baseline.commitSha
    ) {
      fail(
        `basedOn.baselineCommitSha drift registry=${reg.basedOn.baselineCommitSha} baseline=${baseline.commitSha}`,
      );
    }
  }

  if (!reg.fieldSeparation) {
    fail("fieldSeparation required (status⊥currentlyOccurring⊥reviewTrigger)");
  } else {
    for (const k of ["status", "currentlyOccurring", "reviewTrigger"]) {
      if (!reg.fieldSeparation[k]) {
        fail(`fieldSeparation.${k} required`);
      }
    }
  }

  if (
    !reg.nextAfterR0 ||
    reg.nextAfterR0.todoId !== "redesign-r1-money-read-contract"
  ) {
    fail("nextAfterR0.todoId must be redesign-r1-money-read-contract");
  }
  if (reg.nextAfterR0?.fileSerial !== "01") {
    fail("nextAfterR0.fileSerial must be 01");
  }

  const gates = reg.r0VerifyGates || [];
  for (const g of R0_GATES) {
    if (!gates.includes(g)) fail(`r0VerifyGates missing ${g}`);
  }

  if (!Array.isArray(reg.observations) || reg.observations.length !== 6) {
    fail(
      `observations length must be 6 (got ${reg.observations?.length ?? "n/a"})`,
    );
  }

  const seen = new Set();
  let occurringTrue = 0;
  const statusCounts = {
    observed: 0,
    deferred: 0,
    promoted: 0,
    rejected: 0,
  };

  for (const o of reg.observations || []) {
    if (!o.id) fail("observation.id required");
    if (seen.has(o.id)) fail(`duplicate observation.id ${o.id}`);
    seen.add(o.id);

    if (!ALLOWED_STATUS.has(o.status)) {
      fail(`forbidden status ${o.status} (id=${o.id})`);
    }
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

    if (typeof o.currentlyOccurring !== "boolean") {
      fail(`${o.id}: currentlyOccurring must be boolean`);
    }
    if (o.currentlyOccurring) occurringTrue += 1;

    if (typeof o.reviewTrigger !== "string" || !o.reviewTrigger.trim()) {
      fail(`${o.id}: reviewTrigger required string`);
    }
    // 분리: reviewTrigger에 boolean 문자열만 두거나 currentlyOccurring 복제 금지
    if (
      o.reviewTrigger === String(o.currentlyOccurring) ||
      o.reviewTrigger === "true" ||
      o.reviewTrigger === "false"
    ) {
      fail(
        `${o.id}: reviewTrigger must not be a boolean alias of currentlyOccurring`,
      );
    }
    if ("currentlyOccurring" in o && "reviewTrigger" in o) {
      if (o.currentlyOccurring === o.reviewTrigger) {
        fail(`${o.id}: currentlyOccurring and reviewTrigger must differ`);
      }
    }

    for (const req of [
      "invariant",
      "evidence",
      "ownerPlan",
      "classification",
      "severityNote",
    ]) {
      if (typeof o[req] !== "string" || !o[req].trim()) {
        fail(`${o.id}: ${req} required`);
      }
    }
    if (!ALLOWED_OWNER.has(o.ownerPlan)) {
      fail(`${o.id}: ownerPlan forbidden ${o.ownerPlan}`);
    }
    assertNoBackslash(`observation:${o.id}`, o);
  }

  for (const id of REQUIRED_OBS_IDS) {
    if (!seen.has(id)) fail(`missing required observation id: ${id}`);
  }

  // R0: promoted/rejected/deferred 가상 승격 금지 — 전부 observed
  if (statusCounts.promoted !== 0) {
    fail("R0 promotionAtR0 lock: status=promoted count must be 0");
  }
  if (statusCounts.observed !== 6) {
    fail("R0 register-only: all 6 observations must be status=observed");
  }

  if (reg.counts) {
    if (reg.counts.observations !== 6) {
      fail("counts.observations must be 6");
    }
    if (reg.counts.byStatus?.promoted !== 0) {
      fail("counts.byStatus.promoted must be 0");
    }
    if (reg.counts.byStatus?.observed !== 6) {
      fail("counts.byStatus.observed must be 6");
    }
    if (reg.counts.currentlyOccurringTrue !== occurringTrue) {
      fail(
        `counts.currentlyOccurringTrue drift expected=${occurringTrue} got=${reg.counts.currentlyOccurringTrue}`,
      );
    }
  }

  assertNoBackslash("registry.paths", {
    basedOn: reg.basedOn,
    observationSchemaPath: reg.observationSchemaPath,
  });
}

// package.json + CATALOG + domain-by-path (ghost verify 금지)
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
for (const g of R0_GATES) {
  const key = `verify:${g}`;
  if (!pkg.scripts || !pkg.scripts[key]) {
    fail(`package.json missing ${key}`);
  }
}
const catalog = fs.readFileSync(
  path.join(root, "tooling/verify/CATALOG.md"),
  "utf8",
);
for (const g of R0_GATES) {
  if (!catalog.includes(g)) {
    fail(`CATALOG.md missing ${g}`);
  }
}
const domainByPath = fs.readFileSync(
  path.join(root, "tooling/verify/domain-by-path.cjs"),
  "utf8",
);
if (!domainByPath.includes("governance-observation-registry.cjs")) {
  fail("domain-by-path.cjs missing governance-observation-registry.cjs");
}
if (!/governance-observation\\.v1\\.json/.test(domainByPath)) {
  fail("domain-by-path.cjs missing governance-observation.v1.json path trigger");
}

// BOOTSTRAP 다음 포인터
if (!fs.existsSync(bootstrapPath)) {
  fail("missing docs/CONSTITUTION_BOOTSTRAP.md");
} else {
  const boot = fs.readFileSync(bootstrapPath, "utf8");
  if (!boot.includes("redesign-r1-money-read-contract")) {
    fail(
      "BOOTSTRAP must point next to 01 Money redesign-r1-money-read-contract",
    );
  }
  if (!/다음[^\n]*redesign-r1-money-read-contract/.test(boot)) {
    fail(
      "BOOTSTRAP 「다음」 pointer must include redesign-r1-money-read-contract",
    );
  }
  // stale R0-only next 금지 (현재 다음이 inventory만이면 FAIL)
  if (
    /현재 다음:\s*00 Index `platform-redesign-r0-inventory` only/.test(boot)
  ) {
    fail(
      "BOOTSTRAP stale: 현재 다음 still platform-redesign-r0-inventory only",
    );
  }
}

// 구현코드0 — 본 게이트 산출물에 apps/services 제품 경로 기입 금지(증거 문자열의 기존 경로 설명은 허용)
if (reg?.implementationCode !== 0) {
  // already failed above
}

if (fails.length) {
  console.error("[verify:governance-observation-registry] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `[verify:governance-observation-registry] PASS (observations=${REQUIRED_OBS_IDS.length} · status=observed×6 · virtualRules=0 · materialize=0 · next=01/${reg.nextAfterR0.todoId} · R0 gates×4 wired)`,
);
