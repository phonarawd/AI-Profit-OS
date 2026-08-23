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

const conflictIds = new Set();
for (const c of fixture.conflicts || []) {
  if (!c.id || !c.dimension || !c.ownerRel || !c.summary) {
    fail(`conflict blank cell: ${JSON.stringify(c)}`);
    continue;
  }
  conflictIds.add(c.id);
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
  fail("cleanAlignment must be false while conflicts exist");
}
if (!fixture.conflicts.length) fail("conflicts[] empty while live drift exists");

const expectedConflict = [
  "C-MIG-VERSION-DRIFT",
  "C-MIG-REMOTE-ORPHAN-ONBOARDING",
  "C-MIG-REMOTE-DUP-IDEMPOTENCY",
  "C-MIG-FIXTURE-HIDE",
  "C-FSM-REGISTRY-STATUS",
  "C-FSM-CANCELLED-BY-USER",
  "C-REASON-CIRCUIT-GRAMMAR",
];
for (const id of expectedConflict) {
  if (!conflictIds.has(id)) fail(`required conflict missing: ${id}`);
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

for (const row of fixture.migrations.versionIdDrift || []) {
  if (!row.name || !row.local || !row.remote) {
    fail(`versionIdDrift blank: ${JSON.stringify(row)}`);
    continue;
  }
  if (row.local === row.remote) {
    fail(`versionIdDrift ${row.name} hides drift (local==remote)`);
  }
}

if ((fixture.migrations.remoteOnly || []).length < 2) {
  fail("remoteOnly must keep orphan onboarding + dup idempotency");
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

for (const s of ["running", "requeue", "success", "safe_stop", "cancelled", "failed"]) {
  if (!schemaStates.includes(s)) fail(`schema status missing ${s}`);
  if (!sdkTypes.includes(`"${s}"`)) fail(`SDK status missing ${s}`);
  if (!nestExec.includes(`"${s}"`)) fail(`Nest status missing ${s}`);
}
if (regStates.includes("cancelled") || regStates.includes("failed")) {
  fail("registry now has cancelled/failed — update fixture conflict C-FSM-REGISTRY-STATUS");
}
if (!schemaCodes.includes("CANCELLED_BY_USER")) {
  fail("schema resultCode missing CANCELLED_BY_USER");
}
if (/CancelledByUser|CANCELLED_BY_USER/.test(rust)) {
  fail("rust now has CANCELLED_BY_USER — update fixture conflict C-FSM-CANCELLED-BY-USER");
}
if (/CANCELLED_BY_USER/.test(rustCjs)) {
  fail("settlement_rule.cjs now has CANCELLED_BY_USER — update fixture");
}

// ── reasonCode ──
const circuit = read("services/api-nest/src/risk/rules/p49_circuit.ts");
if (!/BUCKET_INVARIANT_FAIL/.test(circuit)) {
  fail("circuit reason changed — update C-REASON-CIRCUIT-GRAMMAR");
}
const grammar = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
if (grammar.test("BUCKET_INVARIANT_FAIL")) {
  fail("grammar regex would accept circuit alias — broken test");
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
if (!/R7_ALIGNMENT:\s*CONFLICTS_OWNED/.test(cert)) {
  fail("cert must set R7_ALIGNMENT: CONFLICTS_OWNED (hide-as-clean forbidden)");
}
if (/R7_ALIGNMENT:\s*CLEAN/.test(cert) || /CLEAN_ALIGNMENT:\s*YES/.test(cert)) {
  fail("cert claims CLEAN while conflicts exist");
}
if (!/HIDE:\s*0/.test(cert)) fail("cert must lock HIDE: 0");
if (!/migrations-applied\.v1\.json/.test(cert) || !/NOT remote 1:1/.test(cert)) {
  fail("cert must say migrations-applied.v1.json is NOT remote 1:1");
}
for (const id of expectedConflict) {
  if (!cert.includes(id)) fail(`cert missing first-class conflict ${id}`);
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
for (const id of ["rel-508", "rel-509", "rel-510"]) {
  const m = plan.match(
    new RegExp(`- id: ${id}\\r?\\n(?:    [^\\n]*\\r?\\n)*?    status: (\\w+)`),
  );
  if (!m) fail(`plan ${id} status unreadable`);
  else if (m[1] === "completed") {
    fail(`${id} must stay pending until owner slice runs (hide-by-close forbidden)`);
  }
}

if (fails.length) {
  console.error("[verify:rel-505-backend-alignment] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}

console.log(
  "[verify:rel-505-backend-alignment] PASS (R7 ISSUED · CONFLICTS_OWNED · hide 0 · owner REL-508/509/510)",
);
