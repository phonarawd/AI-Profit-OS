/**
 * verify:governance-observation-registry — R0-4 Observation Registry (+ post-r0)
 *
 * R0 register-only 잠금은 lifecyclePhase!=="post-r0"일 때 유지.
 * post-r0: Money wave1 promote/materialize 허용 · Engine observed 유지 · R0 AtR0 locks=0 이력 불변.
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
const MONEY_PROMOTED_IDS = [
  "idempotency-conflict-detection-invariant-gap",
  "committed-event-publication-durability-gap",
  "user-mutation-subject-binding-violation",
  "internal-trigger-machine-auth-gap",
];
const ENGINE_OBSERVED_IDS = [
  "settlement-rule-parity-evidence-gap",
  "adapters-ingest-fail-open-machine-auth",
];
const MONEY_TODO_IDS = [
  "idempotency-conflict-detection-invariant-gap",
  "committed-event-publication-durability-gap",
  "money-wallet-auth-remediation",
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
const moneyPlanPath = path.join(
  root,
  ".cursor/plans/ai_profit_os_01_money_c3d4e5f6.plan.md",
);
const changeControlPath = path.join(
  root,
  "governance/platform-redesign/change-control.v1.md",
);

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
  if (!Array.isArray(st)) {
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
  if (schema.properties?.isCurrentlyOccurring || schema.properties?.currentOccurrence) {
    fail("forbidden alias for currentlyOccurring — use currentlyOccurring only");
  }
}

const postR0 = reg?.lifecyclePhase === "post-r0";

if (reg) {
  if (reg.schema !== "governance.platform-redesign.observations.v1") {
    fail("registry.schema mismatch");
  }
  if (reg.redesignStage !== "R0") fail("registry.redesignStage must remain R0 (origin stage)");
  if (reg.todoId !== "platform-redesign-r0-observation-registry") {
    fail("registry.todoId mismatch");
  }
  if (reg.pathSeparator !== "/") fail("registry.pathSeparator must be /");
  if (reg.observationSchemaPath !== "schemas/governance-observation.v1.json") {
    fail("observationSchemaPath mismatch");
  }
  if (reg.virtualRulesCreated !== 0) {
    fail("virtualRulesCreated must be 0 (신규 규칙 가상생성0)");
  }
  // R0 시점 잠금은 이력 불변
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
    if (baseline && reg.basedOn.baselineCommitSha !== baseline.commitSha) {
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

  // R0 출구 포인터(이력)
  if (
    !reg.nextAfterR0 ||
    reg.nextAfterR0.todoId !== "redesign-r1-money-read-contract"
  ) {
    fail("nextAfterR0.todoId must remain redesign-r1-money-read-contract (R0 exit history)");
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
  const byId = new Map();

  for (const o of reg.observations || []) {
    if (!o.id) fail("observation.id required");
    if (seen.has(o.id)) fail(`duplicate observation.id ${o.id}`);
    seen.add(o.id);
    byId.set(o.id, o);

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
    if (
      o.reviewTrigger === String(o.currentlyOccurring) ||
      o.reviewTrigger === "true" ||
      o.reviewTrigger === "false"
    ) {
      fail(
        `${o.id}: reviewTrigger must not be a boolean alias of currentlyOccurring`,
      );
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

  if (!postR0) {
    if (reg.implementationCode !== 0) {
      fail("implementationCode must be 0 at R0");
    }
    if (reg.materializedTodos !== 0) {
      fail("materializedTodos must be 0 at R0");
    }
    if (statusCounts.promoted !== 0) {
      fail("R0 promotionAtR0 lock: status=promoted count must be 0");
    }
    if (statusCounts.observed !== 6) {
      fail("R0 register-only: all 6 observations must be status=observed");
    }
    if (reg.counts?.byStatus?.promoted !== 0) {
      fail("counts.byStatus.promoted must be 0");
    }
    if (reg.counts?.byStatus?.observed !== 6) {
      fail("counts.byStatus.observed must be 6");
    }
  } else {
    if (reg.postR0Promotion?.changeId !== "cc.money.r0-obs-promote-wave1") {
      fail("postR0Promotion.changeId must be cc.money.r0-obs-promote-wave1");
    }
    if (reg.materializedTodos !== 3) {
      fail(`materializedTodos must be 3 at Money wave1 (got ${reg.materializedTodos})`);
    }
    if (statusCounts.promoted !== 4) {
      fail(`post-r0 Money wave1: promoted must be 4 (got ${statusCounts.promoted})`);
    }
    if (statusCounts.observed !== 2) {
      fail(`post-r0 Money wave1: observed must be 2 Engine (got ${statusCounts.observed})`);
    }
    for (const id of MONEY_PROMOTED_IDS) {
      const o = byId.get(id);
      if (!o || o.status !== "promoted") {
        fail(`${id} must be status=promoted`);
      }
      if (!o.materializedTodoId) {
        fail(`${id}: materializedTodoId required when promoted`);
      }
      if (o.changeControlId !== "cc.money.r0-obs-promote-wave1") {
        fail(`${id}: changeControlId must be cc.money.r0-obs-promote-wave1`);
      }
      if (o.ownerPlan !== "01-money") {
        fail(`${id}: ownerPlan must be 01-money`);
      }
    }
    for (const id of ENGINE_OBSERVED_IDS) {
      const o = byId.get(id);
      if (!o || o.status !== "observed") {
        fail(`${id} must remain status=observed until Engine reviewTrigger`);
      }
      if (o.materializedTodoId) {
        fail(`${id}: must not materialize before Engine pending complete`);
      }
    }
    // A+B packaging
    if (
      byId.get("user-mutation-subject-binding-violation")?.materializedTodoId !==
      "money-wallet-auth-remediation"
    ) {
      fail("Finding A must materialize as money-wallet-auth-remediation");
    }
    if (
      byId.get("internal-trigger-machine-auth-gap")?.materializedTodoId !==
      "money-wallet-auth-remediation"
    ) {
      fail("Finding B must materialize as money-wallet-auth-remediation");
    }

    // Money plan frontmatter must contain the 3 todos
    let moneyFm = "";
    if (!fs.existsSync(moneyPlanPath)) {
      fail("missing 01 Money plan for materialize assert");
    } else {
      const money = fs.readFileSync(moneyPlanPath, "utf8");
      moneyFm = money.split(/^---$/m)[1] || "";
      for (const id of MONEY_TODO_IDS) {
        if (!new RegExp(`id:\\s*${id}\\b`).test(moneyFm)) {
          fail(`01 Money frontmatter missing materialized todo id=${id}`);
        }
      }
    }

    // nextExecutable: Money remediation pending이면 그 첫 todo · 아니면 Engine 첫 pending
    const moneyPending = [];
    for (const id of MONEY_TODO_IDS) {
      const m = moneyFm.match(
        new RegExp(`id:\\s*${id}\\b[\\s\\S]*?status:\\s*(\\w+)`, "m"),
      );
      if (m && m[1] === "pending") moneyPending.push(id);
    }
    const expectedNext =
      moneyPending[0] || "engine-ebay-identity-match-ingest";
    if (!reg.nextExecutable || reg.nextExecutable.todoId !== expectedNext) {
      fail(
        `nextExecutable.todoId must be ${expectedNext} (got ${reg.nextExecutable?.todoId})`,
      );
    }

    // Change Control evidence
    if (!fs.existsSync(changeControlPath)) {
      fail("missing change-control.v1.md");
    } else {
      const cc = fs.readFileSync(changeControlPath, "utf8");
      if (!cc.includes("cc.money.r0-obs-promote-wave1")) {
        fail("change-control.v1.md missing cc.money.r0-obs-promote-wave1");
      }
      if (!cc.includes("6.4")) {
        fail("change-control.v1.md missing §6.4 Money promote wave1");
      }
    }
  }

  if (reg.counts) {
    if (reg.counts.observations !== 6) {
      fail("counts.observations must be 6");
    }
    if (reg.counts.byStatus?.promoted !== statusCounts.promoted) {
      fail(
        `counts.byStatus.promoted drift expected=${statusCounts.promoted} got=${reg.counts.byStatus?.promoted}`,
      );
    }
    if (reg.counts.byStatus?.observed !== statusCounts.observed) {
      fail(
        `counts.byStatus.observed drift expected=${statusCounts.observed} got=${reg.counts.byStatus?.observed}`,
      );
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

if (!fs.existsSync(bootstrapPath)) {
  fail("missing docs/CONSTITUTION_BOOTSTRAP.md");
} else {
  const boot = fs.readFileSync(bootstrapPath, "utf8");
  if (postR0) {
    const nextId = reg?.nextExecutable?.todoId;
    if (!nextId || !boot.includes(nextId)) {
      fail(
        `BOOTSTRAP 「현재 다음」 must include nextExecutable.todoId=${nextId}`,
      );
    }
    if (
      /현재 다음:\s*01 Money `redesign-r1-money-read-contract` only/.test(boot)
    ) {
      fail(
        "BOOTSTRAP stale: 현재 다음 still redesign-r1-money-read-contract only",
      );
    }
  } else {
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
    if (
      /현재 다음:\s*00 Index `platform-redesign-r0-inventory` only/.test(boot)
    ) {
      fail(
        "BOOTSTRAP stale: 현재 다음 still platform-redesign-r0-inventory only",
      );
    }
  }
}

if (fails.length) {
  console.error("[verify:governance-observation-registry] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}

const mode = postR0
  ? `post-r0 Money wave1 promoted=${MONEY_PROMOTED_IDS.length} materialize=${MONEY_TODO_IDS.length} next=${reg.nextExecutable.todoId}`
  : `R0 register-only observed×6 materialize=0 next=01/${reg.nextAfterR0.todoId}`;
console.log(
  `[verify:governance-observation-registry] PASS (${mode} · R0 AtR0 locks=0 · gates×4 wired)`,
);
