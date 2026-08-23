/**
 * verify:rel-505-backend-alignment — R7 1:1 대조
 * 공란 0 · 충돌 은폐 0. CLEAN을 충돌 위에서 발급하면 FAIL.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(msg) {
  fails.push(msg);
}

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fail(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const fixtureRel = "tooling/verify/fixtures/r7-backend-alignment.v1.json";
const certRel = "governance/release-master/R7_BACKEND_ALIGNMENT.md";
const planRel = ".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md";

let fixture;
try {
  fixture = JSON.parse(read(fixtureRel));
} catch {
  fail("r7 fixture invalid JSON");
  fixture = null;
}

if (!fixture) {
  console.error("[verify:rel-505-backend-alignment] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

const requiredMeta = [
  "schema",
  "rel",
  "certVersion",
  "asOf",
  "projectRef",
  "cleanAlignment",
  "dimensions",
  "reconciled",
  "conflicts",
  "holds",
  "migrations",
];
for (const k of requiredMeta) {
  if (fixture[k] == null) fail(`fixture missing ${k}`);
}
if (fixture.rel !== "REL-505") fail("fixture.rel must be REL-505");
if (fixture.projectRef !== "mgsytcetsiecllmhcyox") {
  fail("fixture.projectRef must be isolation allowlist only");
}
if (fixture.hideForbidden !== true) fail("fixture.hideForbidden must be true");
if (fixture.migrationsAppliedFixtureIsNotRemoteProof !== true) {
  fail("fixture must refuse migrations-applied.v1.json as remote 1:1 proof");
}
if (
  fixture.remoteAppliedFixture !==
  "tooling/verify/fixtures/migrations-remote-applied.v1.json"
) {
  fail("fixture.remoteAppliedFixture must point at remote-applied identity");
}

const dimIds = new Set();
for (const d of fixture.dimensions || []) {
  if (!d.id || !d.title || !d.verdict) {
    fail(`dimension blank cell: ${JSON.stringify(d)}`);
    continue;
  }
  dimIds.add(d.id);
  if (!["ALIGNED", "CONFLICT"].includes(d.verdict)) {
    fail(`dimension ${d.id} verdict must be ALIGNED|CONFLICT (no footnote status)`);
  }
  if (d.verdict === "CONFLICT") {
    if (!d.ownerRel || !/^REL-\d+$/.test(d.ownerRel)) {
      fail(`CONFLICT ${d.id} missing ownerRel`);
    }
  } else if (d.ownerRel != null) {
    fail(`ALIGNED ${d.id} must not carry ownerRel`);
  }
  if (!d.note || !String(d.note).trim()) fail(`dimension ${d.id} note blank`);
}

const reconciledIds = new Set();
for (const r of fixture.reconciled || []) {
  if (!r.id || !r.dimension || !r.ownerRel || !r.summary || !r.status) {
    fail(`reconciled blank cell: ${JSON.stringify(r)}`);
    continue;
  }
  reconciledIds.add(r.id);
  if (r.status !== "RECONCILED") fail(`reconciled ${r.id} status must be RECONCILED`);
  if (!dimIds.has(r.dimension)) fail(`reconciled ${r.id} unknown dimension`);
  if (!/^REL-\d+$/.test(r.ownerRel)) fail(`reconciled ${r.id} ownerRel invalid`);
}

const conflictIds = new Set();
for (const c of fixture.conflicts || []) {
  if (!c.id || !c.dimension || !c.ownerRel || !c.summary) {
    fail(`conflict blank cell: ${JSON.stringify(c)}`);
    continue;
  }
  conflictIds.add(c.id);
  if (reconciledIds.has(c.id)) fail(`conflict ${c.id} also listed as reconciled`);
  if (!dimIds.has(c.dimension)) fail(`conflict ${c.id} unknown dimension`);
  if (!/^REL-\d+$/.test(c.ownerRel)) fail(`conflict ${c.id} ownerRel invalid`);
}

const holdIds = new Set();
for (const h of fixture.holds || []) {
  if (!h.id || !h.ownerRel || !h.summary) {
    fail(`hold blank cell: ${JSON.stringify(h)}`);
    continue;
  }
  holdIds.add(h.id);
}

if (fixture.cleanAlignment !== false) {
  fail("cleanAlignment must stay false while holds exist (CLEAN citation forbidden)");
}
if (fixture.conflicts.length) {
  fail("semantic conflicts must be empty after REL-509/510");
}

const expectedReconciled = [
  "C-MIG-VERSION-DRIFT",
  "C-MIG-REMOTE-ORPHAN-ONBOARDING",
  "C-MIG-REMOTE-DUP-IDEMPOTENCY",
  "C-MIG-FIXTURE-HIDE",
  "C-FSM-REGISTRY-STATUS",
  "C-FSM-CANCELLED-BY-USER",
  "C-REASON-CIRCUIT-GRAMMAR",
];
for (const id of expectedReconciled) {
  if (!reconciledIds.has(id)) fail(`required reconciled missing: ${id}`);
  if (conflictIds.has(id)) fail(`${id} must not stay CONFLICT after owner slice`);
}

const migHead = (fixture.dimensions || []).find((d) => d.id === "D-MIGRATION-HEAD");
if (!migHead || migHead.verdict !== "ALIGNED") {
  fail("D-MIGRATION-HEAD must be ALIGNED after REL-508 identity reconcile");
}
const fsmDim = (fixture.dimensions || []).find((d) => d.id === "D-ENGINE-FSM");
if (!fsmDim || fsmDim.verdict !== "ALIGNED") {
  fail("D-ENGINE-FSM must be ALIGNED after REL-509");
}
const reasonDim = (fixture.dimensions || []).find((d) => d.id === "D-SOURCE-ASOF-REASON");
if (!reasonDim || reasonDim.verdict !== "ALIGNED") {
  fail("D-SOURCE-ASOF-REASON must be ALIGNED after REL-510");
}

const expectedHolds = ["H-TRACK-A-UNAPPLIED", "H-DEP-502", "H-DEP-504"];
for (const id of expectedHolds) {
  if (!holdIds.has(id)) fail(`required hold missing: ${id}`);
}

for (const rel of ["REL-508", "REL-509", "REL-510"]) {
  if (!(fixture.ownerRels || []).includes(rel)) {
    fail(`ownerRels missing ${rel}`);
  }
}
const openOwners = fixture.ownerRelsOpen || [];
if (openOwners.includes("REL-508")) {
  fail("REL-508 must not stay in ownerRelsOpen after reconcile");
}
if (openOwners.includes("REL-509") || openOwners.includes("REL-510")) {
  fail("REL-509/510 must leave ownerRelsOpen after FSM/reason align");
}

// ── local migrations vs fixture ──
const migDir = path.join(root, "supabase", "migrations");
const localFiles = fs
  .readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const localPairs = [];
for (const f of localFiles) {
  const m = f.match(/^(\d{14})_(.+)\.sql$/);
  if (!m) {
    fail(`bad migration filename: ${f}`);
    continue;
  }
  localPairs.push([m[1], m[2]]);
}

const expectedLocal = [
  ...(fixture.migrations.alignedByVersion || []),
  ...(fixture.migrations.versionIdDrift || []).map((r) => [r.local, r.name]),
  ...(fixture.migrations.localOnlyUnapplied || []),
].map(([v, n]) => `${v}_${n}`);

const liveLocal = localPairs.map(([v, n]) => `${v}_${n}`);
const expSet = new Set(expectedLocal);
const liveSet = new Set(liveLocal);
for (const x of liveLocal) {
  if (!expSet.has(x)) fail(`local migration not in R7 fixture: ${x}`);
}
for (const x of expectedLocal) {
  if (!liveSet.has(x)) fail(`R7 fixture local missing on disk: ${x}`);
}

const remoteRequired = [
  "20260814134038",
  "20260814134055",
  "20260814135111",
  "20260814152139",
  "20260817154827",
  "20260810212231",
  "20260821223109",
];
for (const row of fixture.migrations.versionIdDrift || []) {
  if (!row.name || !row.local || !row.remote) {
    fail(`versionIdDrift blank: ${JSON.stringify(row)}`);
    continue;
  }
  if (row.local === row.remote) {
    fail(`versionIdDrift ${row.name} hides drift (local==remote)`);
  }
  if (row.status !== "RECONCILED") {
    fail(`versionIdDrift ${row.name} must stay RECONCILED (do not delete the map)`);
  }
}

if ((fixture.migrations.remoteOnly || []).length < 2) {
  fail("remoteOnly must keep orphan onboarding + dup idempotency");
}
for (const row of fixture.migrations.remoteOnly || []) {
  if (row.status !== "RECONCILED") {
    fail(`remoteOnly ${row.name} must stay RECONCILED`);
  }
}

const oldFix = JSON.parse(
  read("tooling/verify/fixtures/migrations-applied.v1.json") || "{}",
);
const oldNote = String(oldFix.note || "");
if (!/apply-time version|LOCAL filename prefix/i.test(oldNote)) {
  fail("migrations-applied fixture lost the local-prefix caveat");
}
if ((oldFix.versions || []).includes("20260814134038")) {
  fail("do not rewrite migrations-applied.v1.json to pretend remote ids");
}

const remoteFix = JSON.parse(
  read("tooling/verify/fixtures/migrations-remote-applied.v1.json") || "{}",
);
if (remoteFix.projectRef !== "mgsytcetsiecllmhcyox") {
  fail("remote-applied fixture projectRef must be isolation allowlist only");
}
if (remoteFix.applyMigration !== 0) {
  fail("remote-applied fixture must lock applyMigration 0");
}
const remoteVers = new Set(remoteFix.versions || []);
for (const v of remoteRequired) {
  if (!remoteVers.has(v)) fail(`remote-applied fixture missing ${v}`);
}
if (remoteVers.has("20260819210000")) {
  fail("do not list Track A unapplied files as remote-applied");
}
if ((remoteFix.versions || []).length !== 42) {
  fail(`remote-applied versions must be 42, got ${(remoteFix.versions || []).length}`);
}

// ── AppModule 1:1 ──
const nestSrc = path.join(root, "services", "api-nest", "src");
const moduleFiles = walk(nestSrc).filter(
  (p) => p.endsWith(".module.ts") && !p.endsWith("app.module.ts"),
);
const diskModules = [];
for (const p of moduleFiles) {
  const src = fs.readFileSync(p, "utf8");
  const m = src.match(/export class (\w+Module)/);
  if (!m) {
    fail(`module file missing export class: ${path.relative(root, p)}`);
    continue;
  }
  diskModules.push(m[1]);
}
const appMod = read("services/api-nest/src/app.module.ts");
const imported = [...appMod.matchAll(/(\w+Module)/g)]
  .map((m) => m[1])
  .filter((n) => n !== "Module");
const importSet = new Set(imported);
for (const n of diskModules) {
  if (!importSet.has(n)) fail(`AppModule missing import: ${n}`);
}
if (diskModules.length !== 21) {
  fail(`expected 21 nest feature modules, got ${diskModules.length}`);
}

// ── Engine FSM ──
const schema = JSON.parse(read("schemas/trade-execution-state.v1.json") || "{}");
const schemaStates = schema.properties?.status?.enum || [];
const schemaCodes = schema.properties?.resultCode?.enum || [];
const sdkTypes = read("packages/sdk/src/execution-stream/types.ts");
const nestExec = read("services/api-nest/src/trades/trades.execution.service.ts");
const rust = read("services/engine-rust/src/settlement_rule.rs");
const rustCjs = read("services/engine-rust/settlement_rule.cjs");
const registry = JSON.parse(
  read("governance/platform-redesign/fact-state-registry.v1.json") || "{}",
);
const fsm = (registry.domainFsm || []).find((x) => x.fsmId === "engine.trade_execution");
const regStates = fsm?.states || [];
const rustNotOwner = fsm?.rustNotOwner || {};

for (const s of ["running", "requeue", "success", "safe_stop", "cancelled", "failed"]) {
  if (!schemaStates.includes(s)) fail(`schema status missing ${s}`);
  if (!sdkTypes.includes(`"${s}"`)) fail(`SDK status missing ${s}`);
  if (!nestExec.includes(`"${s}"`)) fail(`Nest status missing ${s}`);
}
if (!regStates.includes("failed")) {
  fail("registry engine.trade_execution must include failed (Nest write)");
}
if (regStates.includes("cancelled")) {
  fail("cancelled is rust-not-owner — do not list as rust-owned registry state");
}
if (
  !Array.isArray(rustNotOwner.statuses) ||
  !rustNotOwner.statuses.includes("cancelled")
) {
  fail("registry rustNotOwner.statuses must include cancelled");
}
if (
  !Array.isArray(rustNotOwner.resultCodes) ||
  !rustNotOwner.resultCodes.includes("CANCELLED_BY_USER")
) {
  fail("registry rustNotOwner.resultCodes must include CANCELLED_BY_USER");
}
if (rustNotOwner.ruleEngine !== "rust-not-owner") {
  fail("registry rustNotOwner.ruleEngine must be rust-not-owner");
}
if (!schemaCodes.includes("CANCELLED_BY_USER")) {
  fail("schema resultCode missing CANCELLED_BY_USER");
}
if (/\bCancelledByUser\b/.test(rust) || /\bSelf::CancelledByUser\b/.test(rust)) {
  fail("do not add fake rust CancelledByUser variant");
}
if (
  !/RUST_NOT_OWNER_STATUSES/.test(rust) ||
  !/RUST_NOT_OWNER_RESULT_CODES/.test(rust)
) {
  fail("rust must declare RUST_NOT_OWNER_* (not a registry-only footnote)");
}
if (!/RUST_NOT_OWNER_RESULT_CODES[\s\S]*CANCELLED_BY_USER/.test(rust)) {
  fail("rust RUST_NOT_OWNER_RESULT_CODES must include CANCELLED_BY_USER");
}
if (
  !/RUST_NOT_OWNER_STATUSES/.test(rustCjs) ||
  !/RUST_NOT_OWNER_RESULT_CODES/.test(rustCjs)
) {
  fail("settlement_rule.cjs must declare RUST_NOT_OWNER_*");
}
if (
  !/RUST_NOT_OWNER_STATUSES/.test(nestExec) ||
  !/RUST_NOT_OWNER_RESULT_CODES/.test(nestExec)
) {
  fail("Nest must consume rust-not-owner (not registry-only)");
}

// ── reasonCode ──
const circuit = read("services/api-nest/src/risk/rules/p49_circuit.ts");
const catalog = read("services/api-nest/src/risk/rules/p49_catalog.ts");
const toastCodes = read("schemas/toast-codes.v1.json");
const moneyCircuit = read("services/api-nest/src/risk/money-circuit.service.ts");
if (!/money\.circuit\.bucket_invariant/.test(circuit)) {
  fail("circuit reasonCode must be money.circuit.bucket_invariant");
}
if (/BUCKET_INVARIANT_FAIL/.test(circuit)) {
  fail("p49_circuit must not keep legacy underscore_flat_alias");
}
if (/BUCKET_INVARIANT_FAIL/.test(catalog)) {
  fail("p49_catalog must not keep legacy underscore_flat_alias");
}
if (/BUCKET_INVARIANT_FAIL/.test(toastCodes)) {
  fail("toast-codes must not keep legacy underscore_flat_alias");
}
if (!/money\.circuit\.bucket_invariant/.test(catalog)) {
  fail("p49_catalog must use money.circuit.bucket_invariant");
}
if (!/money\.circuit\.bucket_invariant/.test(toastCodes)) {
  fail("toast-codes must use money.circuit.bucket_invariant");
}
if (!/CIRCUIT_REASON_BUCKET_INVARIANT/.test(moneyCircuit)) {
  fail("money-circuit must keep CIRCUIT_REASON_BUCKET_INVARIANT");
}
const grammar = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
if (grammar.test("BUCKET_INVARIANT_FAIL")) {
  fail("grammar regex would accept circuit alias — broken test");
}
if (!grammar.test("money.circuit.bucket_invariant")) {
  fail("circuit reasonCode must match domain.resource.reason");
}
if (!grammar.test("money.home.buckets_missing")) {
  fail("home-money reasonCode must keep grammar");
}

// ── SDK → Nest paths ──
const sdkFiles = walk(path.join(root, "packages", "sdk", "src")).filter((p) =>
  /\.(ts)$/.test(p),
);
const reserved = new Set(fixture.phase1ReservedSdkPaths || []);
const sdkPaths = new Set();
for (const p of sdkFiles) {
  const src = fs.readFileSync(p, "utf8");
  for (const m of src.matchAll(/\/api\/v1\/[A-Za-z0-9_./:-]+/g)) {
    const raw = m[0].replace(/["'`].*$/, "");
    if (reserved.has(raw)) continue;
    if (raw.includes("/execution") && /Phase1/.test(src)) continue;
    sdkPaths.add(raw);
  }
}

const nestPatterns = new Set();
for (const file of walk(nestSrc).filter((p) => p.endsWith(".ts"))) {
  const src = fs.readFileSync(file, "utf8");
  const ctrl = src.match(/@Controller\(\s*["']([^"']*)["']/);
  if (ctrl && ctrl[1]) nestPatterns.add(ctrl[1].replace(/^\//, ""));
  if (/routes\.ts$/.test(file) || /HTTP_PATHS/.test(src)) {
    for (const m of src.matchAll(/:\s*["']([A-Za-z0-9_./:-]+)["']/g)) {
      nestPatterns.add(m[1]);
    }
    for (const m of src.matchAll(
      /(?:GET|POST|PUT|PATCH|DELETE)\s+\/api\/v1\/([^\s"']+)/g,
    )) {
      nestPatterns.add(m[1]);
    }
  }
}

function pathMatches(tail, pat) {
  const re = new RegExp(
    "^" +
      pat
        .split("/")
        .map((s) =>
          s.startsWith(":")
            ? "[^/]+"
            : s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("/") +
      "$",
  );
  return re.test(tail);
}

function sdkMatchesNest(sdkPath) {
  const tail = sdkPath.replace(/^\/api\/v1\//, "").replace(/\/$/, "");
  const generic = tail
    .split("/")
    .map((s) => (s === "kakao" ? ":provider" : s))
    .join("/");
  const candidates = [tail, generic, tail.split("/").slice(1).join("/"), generic.split("/").slice(1).join("/")];
  for (const c of candidates) {
    if (!c) continue;
    for (const pat of nestPatterns) {
      if (c === pat || pathMatches(c, pat) || pathMatches(generic, pat)) return true;
    }
  }
  return false;
}

for (const pth of sdkPaths) {
  if (!sdkMatchesNest(pth)) fail(`SDK path not found in Nest: ${pth}`);
}

// ── money units ──
const buckets = JSON.parse(read("schemas/wallet-buckets.v1.json") || "{}");
for (const k of [
  "principalUsdt",
  "profitUsdt",
  "lockedUsdt",
  "practiceUsdt",
  "liabilityUsdt",
]) {
  if (buckets.properties?.[k]?.type !== "string") {
    fail(`wallet-buckets ${k} must be decimal string`);
  }
}
const sdkWallet = read("packages/sdk/src/wallet/types.ts");
if (!/principalUsdt:\s*string/.test(sdkWallet)) {
  fail("SDK wallet principalUsdt must be string");
}

// ── auth ──
const userControllers = walk(nestSrc).filter((p) =>
  /\.user\.controller\.ts$/.test(p) || /kyc\.controller\.ts$/.test(p),
);
for (const p of userControllers) {
  const src = fs.readFileSync(p, "utf8");
  if (!/JwtAuthGuard/.test(src)) {
    fail(`user controller missing JwtAuthGuard: ${path.relative(root, p)}`);
  }
}
const migBlob = localFiles
  .map((f) => fs.readFileSync(path.join(migDir, f), "utf8"))
  .join("\n");
if (/auth\.uid\s*\(/.test(migBlob)) {
  fail("migrations must not use auth.uid() (Supabase Auth session 0)");
}

// ── cert ──
const cert = read(certRel);
if (!cert) fail("R7 cert missing");
if (!/R7_CERT:\s*ISSUED/.test(cert)) fail("cert must set R7_CERT: ISSUED");
if (!/R7_ALIGNMENT:\s*HOLDS_OWNED/.test(cert)) {
  fail("cert must set R7_ALIGNMENT: HOLDS_OWNED (CLEAN citation forbidden)");
}
if (/R7_ALIGNMENT:\s*CLEAN/.test(cert) || /CLEAN_ALIGNMENT:\s*YES/.test(cert)) {
  fail("cert claims CLEAN while holds exist");
}
if (/R7_ALIGNMENT:\s*CONFLICTS_OWNED/.test(cert)) {
  fail("C-FSM/C-REASON are reconciled — do not keep CONFLICTS_OWNED");
}
if (!/HIDE:\s*0/.test(cert)) fail("cert must lock HIDE: 0");
if (!/D-ENGINE-FSM[^\n]*ALIGNED/.test(cert)) {
  fail("cert D-ENGINE-FSM must be ALIGNED");
}
if (!/D-SOURCE-ASOF-REASON[^\n]*ALIGNED/.test(cert)) {
  fail("cert D-SOURCE-ASOF-REASON must be ALIGNED");
}
if (!/migrations-applied\.v1\.json/.test(cert) || !/NOT remote 1:1/.test(cert)) {
  fail("cert must say migrations-applied.v1.json is NOT remote 1:1");
}
for (const id of [
  "C-FSM-REGISTRY-STATUS",
  "C-FSM-CANCELLED-BY-USER",
  "C-REASON-CIRCUIT-GRAMMAR",
]) {
  if (!cert.includes(id)) fail(`cert missing first-class reconciled ${id}`);
}
const conflictSection = (cert.split("## Conflicts")[1] || "").split("## ")[0];
for (const id of [
  "C-FSM-REGISTRY-STATUS",
  "C-FSM-CANCELLED-BY-USER",
  "C-REASON-CIRCUIT-GRAMMAR",
]) {
  if (new RegExp(`\\|\\s*${id}\\s*\\|`).test(conflictSection)) {
    fail(`${id} still listed as open conflict`);
  }
}
if (!/## Reconciled/.test(cert)) {
  fail("cert must keep a first-class Reconciled section");
}
for (const id of expectedReconciled) {
  if (!cert.includes(id)) fail(`cert missing first-class reconciled ${id}`);
}
if (!/migrations-remote-applied\.v1\.json/.test(cert)) {
  fail("cert must name the remote-applied fixture");
}
if (/각주/.test(cert) && /충돌/.test(cert)) {
  const after = cert.split("## ")[0];
  if (/각주/.test(after)) fail("do not park conflicts only in 각주");
}
if (/APPLY_MIGRATION:\s*YES/.test(cert) || /apply_migration\s*\(/.test(cert)) {
  fail("R7 must not apply migrations");
}

// ── plan owner RELs ──
const plan = read(planRel);
for (const id of ["rel-505", "rel-508", "rel-509", "rel-510"]) {
  if (!new RegExp(`- id: ${id}\\b`).test(plan)) {
    fail(`plan missing todo ${id}`);
  }
}
const m505 = plan.match(
  /- id: rel-505\r?\n(?:    [^\n]*\r?\n)*?    status: (\w+)/,
);
if (!m505 || m505[1] !== "completed") {
  fail("plan rel-505 status must be completed");
}
const m508 = plan.match(
  /- id: rel-508\r?\n(?:    [^\n]*\r?\n)*?    status: (\w+)/,
);
if (!m508 || m508[1] !== "completed") {
  fail("plan rel-508 status must be completed after identity reconcile");
}
for (const id of ["rel-509", "rel-510"]) {
  const m = plan.match(
    new RegExp(`- id: ${id}\\r?\\n(?:    [^\\n]*\\r?\\n)*?    status: (\\w+)`),
  );
  if (!m) fail(`plan ${id} status unreadable`);
  else if (m[1] !== "completed") {
    fail(`${id} must be completed after owner slice`);
  }
}

if (fails.length) {
  console.error("[verify:rel-505-backend-alignment] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:rel-505-backend-alignment] PASS (R7 ISSUED · HOLDS_OWNED · C-MIG/C-FSM/C-REASON RECONCILED · hide 0 · CLEAN 0)",
);
