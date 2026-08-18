/**
 * verify:platform-fact-state-registry — R0-2 Fact↔State registry
 *
 * 검증:
 * 1) governance/platform-redesign/fact-state-registry.v1.json 존재·스키마
 * 2) baseline 기반 basedOn 일치 (경로·commitSha·todoId)
 * 3) commonViewStates 고정 집합 · domain FSM 상태와 교집합 0
 * 4) fact마다 source/asOf/freshness/owner/provenance 필수
 * 5) allowedViewStates ⊆ commonViewStates · domain FSM 상태 혼입 0
 * 6) reasonCode grammar=domain.resource.reason · examples 패턴
 * 7) Fact↔State 반복검증 rounds≥2 · surface bindings factId 존재
 * 8) classification kind ∈ {defect,intentional,deferred,missing_fact}
 * 9) 구현코드0 가드(본 게이트는 governance+verify+package/CATALOG만)
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ALLOWED_CLASS = new Set([
  "defect",
  "intentional",
  "deferred",
  "missing_fact",
]);
const REQUIRED_VIEW = [
  "idle",
  "loading",
  "ready_empty",
  "ready_data",
  "stale",
  "recoverable_error",
  "blocked",
  "unauthorized",
];
const REQUIRED_META = ["source", "asOf", "freshness", "owner", "provenance"];
const REASON_RE = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

const registryPath = path.join(
  root,
  "governance/platform-redesign/fact-state-registry.v1.json",
);
const baselinePath = path.join(
  root,
  "governance/platform-redesign/baseline.v1.json",
);
const matrixPath = path.join(
  root,
  "governance/platform-redesign/route-contract-matrix.v1.json",
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

function sortedEq(a, b) {
  const sa = [...a].sort();
  const sb = [...b].sort();
  if (sa.length !== sb.length) return false;
  return sa.every((v, i) => v === sb[i]);
}

if (!fs.existsSync(registryPath)) {
  fail("missing governance/platform-redesign/fact-state-registry.v1.json");
}
if (!fs.existsSync(baselinePath)) {
  fail("missing baseline.v1.json (R0-1 prerequisite)");
}
if (!fs.existsSync(matrixPath)) {
  fail("missing route-contract-matrix.v1.json (R0-1 prerequisite)");
}

let reg;
let baseline;
try {
  reg = JSON.parse(fs.readFileSync(registryPath, "utf8"));
} catch {
  fail("fact-state-registry.v1.json invalid JSON");
}
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch {
  fail("baseline.v1.json invalid JSON");
}

if (reg) {
  if (reg.schema !== "governance.platform-redesign.fact-state-registry.v1") {
    fail("registry.schema mismatch");
  }
  if (reg.redesignStage !== "R0") fail("registry.redesignStage must be R0");
  if (reg.todoId !== "platform-redesign-r0-fact-state") {
    fail("registry.todoId mismatch");
  }
  if (reg.pathSeparator !== "/") fail("registry.pathSeparator must be /");

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
      reg.basedOn.routeContractMatrixPath !==
      "governance/platform-redesign/route-contract-matrix.v1.json"
    ) {
      fail("basedOn.routeContractMatrixPath mismatch");
    }
    if (baseline && reg.basedOn.baselineCommitSha !== baseline.commitSha) {
      fail(
        `basedOn.baselineCommitSha drift registry=${reg.basedOn.baselineCommitSha} baseline=${baseline.commitSha}`,
      );
    }
    if (reg.basedOn.baselineTodoId !== "platform-redesign-r0-inventory") {
      fail("basedOn.baselineTodoId must be platform-redesign-r0-inventory");
    }
  }

  if (!sortedEq(reg.commonViewStates || [], REQUIRED_VIEW)) {
    fail(
      `commonViewStates must equal fixed set [${REQUIRED_VIEW.join("|")}]`,
    );
  }

  if (!Array.isArray(reg.requiredFactMeta)) {
    fail("requiredFactMeta must be array");
  } else if (!sortedEq(reg.requiredFactMeta, REQUIRED_META)) {
    fail(`requiredFactMeta must equal [${REQUIRED_META.join(",")}]`);
  }

  const domainStates = new Set();
  const fsmIds = new Set();
  if (!Array.isArray(reg.domainFsm) || reg.domainFsm.length < 1) {
    fail("domainFsm required (≥1)");
  }
  for (const fsm of reg.domainFsm || []) {
    if (!fsm.fsmId) fail("domainFsm.fsmId required");
    if (fsmIds.has(fsm.fsmId)) fail(`duplicate domainFsm.fsmId ${fsm.fsmId}`);
    fsmIds.add(fsm.fsmId);
    if (!Array.isArray(fsm.states) || fsm.states.length < 1) {
      fail(`domainFsm ${fsm.fsmId} states required`);
    }
    for (const s of fsm.states || []) {
      if (REQUIRED_VIEW.includes(s)) {
        fail(
          `domain FSM state "${s}" must not overlap commonViewStates (fsm=${fsm.fsmId})`,
        );
      }
      domainStates.add(s);
    }
  }

  const viewSet = new Set(REQUIRED_VIEW);
  for (const s of domainStates) {
    if (viewSet.has(s)) {
      fail(`commonViewStates ∩ domainFsm contains "${s}"`);
    }
  }

  if (!reg.reasonCode || reg.reasonCode.grammar !== "domain.resource.reason") {
    fail("reasonCode.grammar must be domain.resource.reason");
  }
  if (reg.reasonCode?.pattern !== REASON_RE.source) {
    // allow JSON-escaped pattern equal to source
    const pat = reg.reasonCode?.pattern;
    if (typeof pat !== "string" || pat.replace(/\\\\/g, "\\") !== REASON_RE.source) {
      // Compare functionally via examples + rebuild
      try {
        const rebuilt = new RegExp(pat);
        if (rebuilt.source !== REASON_RE.source) {
          fail("reasonCode.pattern must match domain.resource.reason regex");
        }
      } catch {
        fail("reasonCode.pattern invalid regex");
      }
    }
  }
  if (reg.reasonCode?.vocabularyStatus !== "deferred_to_domain_phases") {
    fail("reasonCode.vocabularyStatus must be deferred_to_domain_phases");
  }
  const examples = reg.reasonCode?.examplesSchemaOnly || [];
  if (!Array.isArray(examples) || examples.length < 3) {
    fail("reasonCode.examplesSchemaOnly requires ≥3 schema-only examples");
  }
  for (const ex of examples) {
    if (!REASON_RE.test(ex)) {
      fail(`reasonCode example fails grammar: ${ex}`);
    }
  }
  const forbidden = new Set(reg.reasonCode?.forbidden || []);
  for (const need of [
    "underscore_flat_alias",
    "camelCase",
    "view_state_as_reason",
  ]) {
    if (!forbidden.has(need)) {
      fail(`reasonCode.forbidden missing ${need}`);
    }
  }

  const rounds = reg.iterativeValidation?.rounds;
  if (!Array.isArray(rounds) || rounds.length < 2) {
    fail("iterativeValidation.rounds requires ≥2 (Fact↔State loop)");
  }
  for (const r of rounds || []) {
    if (typeof r.round !== "number") fail("iterativeValidation.round number required");
    if (!r.focus) fail(`iterativeValidation round ${r.round} focus required`);
    if (!Array.isArray(r.stateFindings) || r.stateFindings.length < 1) {
      fail(`iterativeValidation round ${r.round} stateFindings required`);
    }
  }

  if (!Array.isArray(reg.facts) || reg.facts.length < 1) {
    fail("facts required (≥1)");
  }

  const factIds = new Set();
  const viewCoverage = new Set();
  for (const f of reg.facts || []) {
    if (!f.factId || typeof f.factId !== "string") {
      fail("fact.factId required");
      continue;
    }
    if (factIds.has(f.factId)) fail(`duplicate factId ${f.factId}`);
    factIds.add(f.factId);

    if (!f.type) fail(`${f.factId}: type required`);
    if (f.unit === undefined || f.unit === null) {
      fail(`${f.factId}: unit required (use \"none\" if N/A)`);
    }

    for (const meta of REQUIRED_META) {
      if (!f[meta] || typeof f[meta] !== "object") {
        fail(`${f.factId}: required meta object missing: ${meta}`);
      }
    }
    if (f.source && !f.source.kind && !f.source.path && !f.source.status) {
      fail(`${f.factId}: source must include kind|path|status`);
    }
    if (f.owner && !f.owner.plan) fail(`${f.factId}: owner.plan required`);
    if (f.provenance && !f.provenance.soT) {
      fail(`${f.factId}: provenance.soT required`);
    }
    if (f.asOf && f.asOf.status === undefined) {
      fail(`${f.factId}: asOf.status required`);
    }
    if (f.freshness && f.freshness.status === undefined) {
      fail(`${f.factId}: freshness.status required`);
    }

    if (!Array.isArray(f.allowedViewStates) || f.allowedViewStates.length < 1) {
      fail(`${f.factId}: allowedViewStates required`);
    }
    for (const st of f.allowedViewStates || []) {
      if (!viewSet.has(st)) {
        fail(`${f.factId}: allowedViewStates unknown/non-common: ${st}`);
      }
      if (domainStates.has(st)) {
        fail(`${f.factId}: domain FSM state leaked into allowedViewStates: ${st}`);
      }
      viewCoverage.add(st);
    }

    if (f.domainFsmPointer != null) {
      if (!fsmIds.has(f.domainFsmPointer)) {
        fail(
          `${f.factId}: domainFsmPointer unknown: ${f.domainFsmPointer}`,
        );
      }
    }

    if (!ALLOWED_CLASS.has(f.classification)) {
      fail(`${f.factId}: classification forbidden: ${f.classification}`);
    }
    if (!f.stateCrossCheck) {
      fail(`${f.factId}: stateCrossCheck required (Fact↔State link)`);
    }
    if (!Array.isArray(f.surfaces)) {
      fail(`${f.factId}: surfaces must be array`);
    }
    assertNoBackslash(`fact:${f.factId}`, f);
  }

  for (const st of REQUIRED_VIEW) {
    if (!viewCoverage.has(st)) {
      fail(
        `commonViewState "${st}" not covered by any fact.allowedViewStates`,
      );
    }
  }

  if (
    !Array.isArray(reg.surfaceStateBindings) ||
    reg.surfaceStateBindings.length < 1
  ) {
    fail("surfaceStateBindings required");
  }
  for (const b of reg.surfaceStateBindings || []) {
    if (!b.surface) fail("surfaceStateBindings.surface required");
    if (b.viewStateOwner !== "common") {
      fail(
        `${b.surface}: viewStateOwner must be common (domain FSM separate)`,
      );
    }
    for (const ptr of b.domainFsmPointers || []) {
      if (!fsmIds.has(ptr)) {
        fail(`${b.surface}: domainFsmPointers unknown ${ptr}`);
      }
    }
    for (const id of b.primaryFactIds || []) {
      if (!factIds.has(id)) {
        fail(`${b.surface}: primaryFactIds unknown ${id}`);
      }
    }
    assertNoBackslash(`surface:${b.surface}`, b);
  }

  if (!Array.isArray(reg.classifications) || reg.classifications.length < 1) {
    fail("classifications required");
  }
  for (const c of reg.classifications || []) {
    if (!ALLOWED_CLASS.has(c.kind)) {
      fail(`classification kind forbidden: ${c.kind} (id=${c.id})`);
    }
    assertNoBackslash(`classification:${c.id}`, c);
  }

  // iterative rounds must reference existing facts when listed
  for (const r of rounds || []) {
    for (const id of r.factIdsTouched || []) {
      if (!factIds.has(id)) {
        fail(`iterativeValidation round ${r.round} unknown factId ${id}`);
      }
    }
  }

  assertNoBackslash("registry.paths", {
    basedOn: reg.basedOn,
    notes: reg.notes,
  });
}

// package.json + CATALOG wiring (ghost verify 금지)
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
if (!pkg.scripts || !pkg.scripts["verify:platform-fact-state-registry"]) {
  fail("package.json missing verify:platform-fact-state-registry");
}
const catalog = fs.readFileSync(
  path.join(root, "tooling/verify/CATALOG.md"),
  "utf8",
);
if (!catalog.includes("platform-fact-state-registry")) {
  fail("CATALOG.md missing platform-fact-state-registry");
}

if (fails.length) {
  console.error("[verify:platform-fact-state-registry] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `[verify:platform-fact-state-registry] PASS (facts=${reg.facts.length} · domainFsm=${reg.domainFsm.length} · rounds=${reg.iterativeValidation.rounds.length} · surfaces=${reg.surfaceStateBindings.length} · classifications=${reg.classifications.length} · baselineSha=${reg.basedOn.baselineCommitSha.slice(0, 12)})`,
);
