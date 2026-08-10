/**
 * verify:platform-redesign-inventory — R0-1 Forensic baseline + route-contract matrix
 *
 * 검증:
 * 1) governance/platform-redesign/baseline.v1.json · route-contract-matrix.v1.json 존재·스키마
 * 2) 분류 kind ∈ {defect,intentional,deferred,missing_fact} only
 * 3) 경로 canonical `/` (백슬래시 0)
 * 4) 실측 계수(논리 route/물리 page/wire/manifest/Admin12/Nest imports/migrations/assets/verify)
 *    가 baseline counts·목록과 일치 (commitSha/dirtyPaths는 스냅샷 메타 — 형식만 검증)
 * 5) matrix가 web·admin 물리 page 전 route를 커버
 */
const fs = require("fs");
const path = require("path");
const { measure, norm } = require("./lib/platform-redesign-measure.cjs");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ALLOWED = new Set(["defect", "intentional", "deferred", "missing_fact"]);

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
    if (hasBackslash(value)) fail(`${label} must use canonical / separator: ${value}`);
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
  const sa = [...a].map(norm).sort();
  const sb = [...b].map(norm).sort();
  if (sa.length !== sb.length) return false;
  return sa.every((v, i) => v === sb[i]);
}

if (!fs.existsSync(baselinePath)) {
  fail("missing governance/platform-redesign/baseline.v1.json");
}
if (!fs.existsSync(matrixPath)) {
  fail("missing governance/platform-redesign/route-contract-matrix.v1.json");
}

let baseline;
let matrix;
try {
  baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
} catch {
  fail("baseline.v1.json invalid JSON");
}
try {
  matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
} catch {
  fail("route-contract-matrix.v1.json invalid JSON");
}

if (baseline) {
  if (baseline.schema !== "governance.platform-redesign.baseline.v1") {
    fail("baseline.schema mismatch");
  }
  if (baseline.pathSeparator !== "/") fail("baseline.pathSeparator must be /");
  if (!/^[0-9a-f]{40}$/i.test(baseline.commitSha || "")) {
    fail("baseline.commitSha must be 40-char hex git SHA");
  }
  if (!Array.isArray(baseline.dirtyPaths)) fail("baseline.dirtyPaths must be array");
  if (!Array.isArray(baseline.classifications) || baseline.classifications.length < 1) {
    fail("baseline.classifications required (≥1)");
  }
  for (const c of baseline.classifications || []) {
    if (!ALLOWED.has(c.kind)) {
      fail(`baseline classification kind forbidden: ${c.kind} (id=${c.id})`);
    }
    assertNoBackslash(`classification:${c.id}`, c);
  }

  const requiredTop = [
    "web",
    "admin",
    "canon",
    "nest",
    "migrations",
    "assets",
    "verify",
    "counts",
  ];
  for (const k of requiredTop) {
    if (!baseline[k]) fail(`baseline missing ${k}`);
  }
}

if (matrix) {
  if (matrix.schema !== "governance.platform-redesign.route-contract-matrix.v1") {
    fail("matrix.schema mismatch");
  }
  if (!Array.isArray(matrix.routes) || matrix.routes.length < 1) {
    fail("matrix.routes required");
  }
  for (const r of matrix.routes || []) {
    if (!ALLOWED.has(r.classification)) {
      fail(
        `matrix route classification forbidden: ${r.classification} (${r.app} ${r.logicalRoute})`,
      );
    }
    for (const field of [
      "productContract",
      "visualContract",
      "implementationContract",
    ]) {
      if (!r[field] || !["present", "absent"].includes(r[field].status)) {
        fail(`matrix ${r.app} ${r.logicalRoute} ${field}.status invalid`);
      }
    }
    if (!Array.isArray(r.canonWires)) {
      fail(`matrix ${r.app} ${r.logicalRoute} canonWires must be array`);
    }
    if (!r.ownerPlan) fail(`matrix ${r.app} ${r.logicalRoute} ownerPlan required`);
    if (!Array.isArray(r.verifyIds)) {
      fail(`matrix ${r.app} ${r.logicalRoute} verifyIds must be array`);
    }
    assertNoBackslash(`matrix:${r.app}:${r.logicalRoute}`, r);
  }
}

let live;
try {
  live = measure(root);
} catch (e) {
  fail(`live measure failed: ${e.message}`);
}

if (baseline && live) {
  assertNoBackslash("baseline.paths", {
    dirtyPaths: baseline.dirtyPaths,
    web: baseline.web,
    admin: baseline.admin,
    canon: baseline.canon,
    nest: baseline.nest,
    migrations: baseline.migrations,
    assets: baseline.assets,
    verify: baseline.verify,
  });

  const countKeys = [
    "webLogicalRoutes",
    "webPhysicalPages",
    "adminPhysicalPages",
    "adminTopLevel",
    "canonPhysicalWires",
    "canonManifestSurfaces",
    "wiresNotInManifest",
    "nestImports",
    "localMigrations",
    "remoteMigrations",
    "brandAssets",
    "publicBrandAssets",
    "contracts",
  ];
  for (const k of countKeys) {
    if (baseline.counts?.[k] !== live.counts[k]) {
      fail(
        `counts.${k} drift baseline=${baseline.counts?.[k]} live=${live.counts[k]} (재측정 후 baseline 갱신 필요)`,
      );
    }
  }

  // verify script/id counts may include this gate after baseline write — allow ≥ baseline
  if ((baseline.counts?.verifyScripts || 0) > live.counts.verifyScripts) {
    fail(
      `counts.verifyScripts baseline>${live.counts.verifyScripts} (unexpected shrink)`,
    );
  }
  if ((baseline.counts?.verifyPackageIds || 0) > live.counts.verifyPackageIds) {
    fail(
      `counts.verifyPackageIds baseline>${live.counts.verifyPackageIds} (unexpected shrink)`,
    );
  }

  if (baseline.admin?.topLevelCount !== 12) {
    fail("baseline.admin.topLevelCount must be 12");
  }
  if (live.admin.topLevelCount !== 12) {
    fail("live ADMIN_TOP_LEVEL_COUNT must be 12");
  }
  if (!sortedEq(baseline.web?.logicalRoutes || [], live.web.logicalRoutes)) {
    fail("web.logicalRoutes set drift vs live");
  }
  if (
    !sortedEq(
      (baseline.web?.physicalPages || []).map((p) => p.physicalPage),
      live.web.physicalPages.map((p) => p.physicalPage),
    )
  ) {
    fail("web.physicalPages set drift vs live");
  }
  if (
    !sortedEq(
      (baseline.admin?.physicalPages || []).map((p) => p.physicalPage),
      live.admin.physicalPages.map((p) => p.physicalPage),
    )
  ) {
    fail("admin.physicalPages set drift vs live");
  }
  if (
    !sortedEq(
      (baseline.canon?.physicalWires || []).map((w) => w.path),
      live.canon.physicalWires.map((w) => w.path),
    )
  ) {
    fail("canon.physicalWires set drift vs live");
  }
  if (
    !sortedEq(
      (baseline.canon?.manifestSurfaces || []).map((s) => s.id),
      live.canon.manifestSurfaces.map((s) => s.id),
    )
  ) {
    fail("canon.manifestSurfaces id set drift vs live");
  }
  if (!sortedEq(baseline.nest?.imports || [], live.nest.imports)) {
    fail("nest.imports drift vs live");
  }
  if (
    !sortedEq(baseline.migrations?.localVersions || [], live.migrations.localVersions)
  ) {
    fail("migrations.localVersions drift vs live");
  }
  if (
    !sortedEq(
      baseline.migrations?.remoteVersions || [],
      live.migrations.remoteVersions,
    )
  ) {
    fail("migrations.remoteVersions drift vs live");
  }
  if (
    !sortedEq(
      baseline.migrations?.localVersions || [],
      baseline.migrations?.remoteVersions || [],
    )
  ) {
    fail("baseline local/remote migration versions not 1:1");
  }
}

if (matrix && live) {
  const webKeys = new Set(
    live.web.physicalPages.map((p) => `web:${p.logicalRoute}:${p.physicalPage}`),
  );
  const adminKeys = new Set(
    live.admin.physicalPages.map(
      (p) => `admin:${p.logicalRoute}:${p.physicalPage}`,
    ),
  );
  const matrixKeys = new Set(
    matrix.routes.map((r) => `${r.app}:${r.logicalRoute}:${r.physicalPage}`),
  );
  for (const k of webKeys) {
    if (!matrixKeys.has(k)) fail(`matrix missing web row for ${k}`);
  }
  for (const k of adminKeys) {
    if (!matrixKeys.has(k)) fail(`matrix missing admin row for ${k}`);
  }
  for (const k of matrixKeys) {
    if (!webKeys.has(k) && !adminKeys.has(k)) {
      fail(`matrix orphan row ${k}`);
    }
  }
}

if (fails.length) {
  console.error("[verify:platform-redesign-inventory] FAIL");
  for (const f of fails) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `[verify:platform-redesign-inventory] PASS (commitSha=${baseline.commitSha.slice(0, 12)} · web=${live.counts.webPhysicalPages} · adminPages=${live.counts.adminPhysicalPages} · wires=${live.counts.canonPhysicalWires} · surfaces=${live.counts.canonManifestSurfaces} · adminTop=${live.counts.adminTopLevel} · nest=${live.counts.nestImports} · mig=${live.counts.localMigrations}/${live.counts.remoteMigrations} · matrix=${matrix.routes.length} · classifications=${baseline.classifications.length})`,
);
