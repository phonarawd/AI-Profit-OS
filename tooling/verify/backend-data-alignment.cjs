/**
 * verify:backend-data-alignment
 * R7 live 1:1. Blank cell FAIL. Open conflict as ALIGNED = FAIL.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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

function walkFiles(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

const fixture = JSON.parse(
  read("tooling/verify/fixtures/backend-data-alignment.v1.json") || "{}",
);
const cert = read("governance/release-master/R7_BACKEND_ALIGNMENT.md");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const appliedFx = JSON.parse(
  read("tooling/verify/fixtures/migrations-applied.v1.json") || "{}",
);
const tradeSchema = JSON.parse(read("schemas/trade-execution-state.v1.json") || "{}");
const homeMoney = JSON.parse(read("schemas/home-money-read.v1.json") || "{}");
const factState = JSON.parse(
  read("governance/platform-redesign/fact-state-registry.v1.json") || "{}",
);
const engineCert = read("governance/engine-acceptance/FINAL_ACCEPTANCE.md");
const r6 = read("governance/admin/R6_CERTIFICATION.md");
const appModule = read("services/api-nest/src/app.module.ts");

if (fixture.certIssued !== 0) fails.push("fixture certIssued must stay 0 until REL-502 rebase");
if (fixture.applyMigration !== 0) fails.push("R7 applyMigration must be 0");
if (fixture.projectRef !== "mgsytcetsiecllmhcyox") fails.push("projectRef lock");
if (fixture.additiveRel !== "REL-508") fails.push("additive owner must be REL-508");
if (fixture.stalePendingRebase !== true) {
  fails.push("current-fx wire is protected-scope mutation — stalePendingRebase must be true");
}

const open = fixture.openConflicts || [];
if (open.length !== 0) {
  fails.push("openConflicts must be empty after REL-508 Nest wire");
}

for (const needle of [
  "STATUS = BLOCKED_PROTECTED_SCOPE_STALE",
  "CERT_ISSUED = 0",
  "OPEN_CONFLICT = 0",
  "STALE_PENDING_REBASE = 1",
  "CONCEALMENT = 0",
  "ADDITIVE_REL = REL-508",
  "CONTRACT_VERSION = 1.0.1",
]) {
  if (!cert.includes(needle)) fails.push("R7 cert missing " + needle);
}
if (/CERT_ISSUED = 1/.test(cert)) {
  fails.push("cannot issue R7 while protected-scope STALE is pending rebase");
}
if (/SDK_NEST_CURRENT_FX_APPROX/.test(cert) && /OPEN_CONFLICT = SDK_NEST_CURRENT_FX_APPROX/.test(cert)) {
  fails.push("current-fx conflict must be closed after Nest wire");
}
if (/apply_migration\s*\(/.test(cert)) fails.push("cert must not invoke apply_migration");

if (!plan.includes("ID: REL-508")) fails.push("additive REL-508 YAML missing from plan");
if (!/- id: rel-508\r?\n/.test(plan)) fails.push("additive rel-508 todo missing from plan");

const nestRoot = path.join(root, "services/api-nest/src");
const nestFiles = walkFiles(nestRoot, []);
const nestBlob = nestFiles
  .filter((f) => f.endsWith(".ts"))
  .map((f) => fs.readFileSync(f, "utf8"))
  .join("\n");
if (!nestBlob.includes("me/current-fx/approx")) {
  fails.push("Nest must expose me/current-fx/approx after REL-508");
}
if (/supabase\.auth/.test(nestBlob)) fails.push("api-nest must not use supabase.auth");
if (!read("services/api-nest/src/auth/jwt-auth.guard.ts").includes("export class JwtAuthGuard")) {
  fails.push("JwtAuthGuard missing");
}

function sdkMentions(sdk, p) {
  if (sdk.includes(p)) return true;
  if (!p.includes("/:id")) return false;
  const before = p.split("/:id")[0];
  const after = (p.split("/:id/")[1] || "").replace(/^\//, "");
  return sdk.includes(before) && (!after || sdk.includes(after));
}

for (const pair of fixture.sdkPairs || []) {
  const sdk = read(pair.sdk);
  if (sdk && !sdkMentions(sdk, pair.path)) {
    fails.push("SDK missing path " + pair.id + " " + pair.path);
  }
  if (pair.conflict) {
    if (pair.nest != null) fails.push(pair.id + " conflict pair must have nest=null");
    continue;
  }
  if (!pair.nest || !pair.nestNeedle) {
    fails.push("blank nest cell: " + pair.id);
    continue;
  }
  const nestSrc = read(pair.nest);
  if (nestSrc && !nestSrc.includes(pair.nestNeedle)) {
    fails.push("Nest missing needle " + pair.id + " " + pair.nestNeedle);
  }
}

const moduleFiles = nestFiles
  .filter((f) => f.endsWith(".module.ts"))
  .map((f) => toPosix(path.relative(root, f)));
const reachable = new Set();
const q = ["services/api-nest/src/app.module.ts"];
while (q.length) {
  const rel = q.pop();
  if (reachable.has(rel)) continue;
  reachable.add(rel);
  const src = read(rel);
  const re = /from ["'](\.\.?\/[^"']+\.module)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const resolved = toPosix(
      path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1] + ".ts")),
    );
    if (fs.existsSync(path.join(root, resolved))) q.push(resolved);
  }
}
for (const mod of moduleFiles) {
  if (mod.endsWith("/app.module.ts")) continue;
  if (!reachable.has(mod)) fails.push("orphan Nest module: " + mod);
}
if (!appModule.includes("AuthModule") || !appModule.includes("WalletModule")) {
  fails.push("AppModule missing core modules");
}

const statusEnum = tradeSchema.properties?.status?.enum || [];
for (const st of fixture.engineFsmCore || []) {
  if (!statusEnum.includes(st)) fails.push("trade status missing FSM " + st);
}
const fsm = (factState.domainFsm || []).find((x) => x.fsmId === "engine.trade_execution");
const fsmStates = (fsm && fsm.states) || [];
for (const st of fsmStates) {
  if (!statusEnum.includes(st)) fails.push("fact-state FSM not in schema: " + st);
}

const reasonPat = homeMoney.properties?.reasonCode?.pattern || "";
if (!reasonPat.includes("[a-z]")) {
  fails.push("home-money reasonCode must stay domain.resource.reason");
}
if ((homeMoney.properties?.reasonCode?.enum || []).includes("PRICE_MOVED")) {
  fails.push("do not alias engine resultCode onto home-money reasonCode");
}
const resultEnum = tradeSchema.properties?.resultCode?.enum || [];
if (!resultEnum.includes("PRICE_MOVED") || !resultEnum.includes("MATCH_SUCCESS")) {
  fails.push("engine resultCode vocabulary missing");
}
for (const key of ["principalUsdt", "asOf", "source", "state"]) {
  if (!(homeMoney.required || []).includes(key)) fails.push("home-money-read missing " + key);
}
if (homeMoney.properties?.principalUsdt?.type !== "string") {
  fails.push("principalUsdt must be decimal string");
}

const participate = read("services/api-nest/src/opportunities/participate.service.ts");
const walletCtl = read("services/api-nest/src/wallet/wallet.controller.ts");
const sdkPart = read("packages/sdk/src/participate/fetch.ts");
const sdkWallet = read("packages/sdk/src/wallet/fetch.ts");
if (!participate.includes("idempotencyKey") || !sdkPart.includes("idempotencyKey")) {
  fails.push("participate idempotency missing");
}
if (!walletCtl.includes("idempotencyKey") || !sdkWallet.includes("idempotencyKey")) {
  fails.push("withdraw idempotency missing");
}

const migDir = path.join(root, "supabase/migrations");
const appliedSet = new Set(appliedFx.versions || []);
const unappliedSet = new Set(appliedFx.committedUnapplied || []);
let appliedIdx = 0;
let unappliedIdx = 0;
for (const name of fs.readdirSync(migDir).filter((f) => f.endsWith(".sql"))) {
  const ver = name.slice(0, 14);
  const n = (read("supabase/migrations/" + name).match(/CREATE\s+(UNIQUE\s+)?INDEX/gi) || [])
    .length;
  if (appliedSet.has(ver)) appliedIdx += n;
  else if (unappliedSet.has(ver)) unappliedIdx += n;
}
if (appliedIdx < 1) fails.push("applied migrations have no CREATE INDEX");
if (!cert.includes("REL-701-DB")) fails.push("index/head diverge owner must stay REL-701-DB");

const localFiles = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
const localHead = localFiles[localFiles.length - 1].slice(0, 14);
const remoteHead = (appliedFx.versions || [])[(appliedFx.versions || []).length - 1];
if (localHead !== "20260823210000") fails.push("local migration head unexpected " + localHead);
if (remoteHead !== "20260814140000") fails.push("remote applied head unexpected " + remoteHead);
if (localHead === remoteHead) {
  fails.push("heads unexpectedly equal — update the R7 table, do not hide apply state");
}

if (!/DEFECTS_P0 = 0/.test(engineCert)) {
  fails.push("engine cert DEFECTS_P0 must stay 0");
}
if (/REBASE_REQUIRED = 1/.test(engineCert)) {
  if (!/STATUS = NOT_ISSUED/.test(engineCert) || !/CERT_ISSUED = 0/.test(engineCert)) {
    fails.push("drifted cert must be NOT_ISSUED until rebase");
  }
} else if (!/STATUS = ISSUED/.test(engineCert) || !/CERT_ISSUED = 1/.test(engineCert)) {
  fails.push("REL-502 cert must stay ISSUED with P0=0 when scope is clean");
}
if (!/KNOWN_P0 = 0/.test(r6) || !/KNOWN_P3 = 0/.test(r6)) {
  fails.push("R6 known P0-P3 must stay 0");
}

if (fails.length === 0) {
  for (const script of fixture.extraVerifies || []) {
    const run = spawnSync(process.execPath, [path.join(root, "tooling/verify", script)], {
      cwd: root,
      encoding: "utf8",
      timeout: 90_000,
    });
    if (run.status !== 0) {
      fails.push(
        "re-run FAIL " + script + ": " + String(run.stderr || run.stdout || "").split("\n")[0],
      );
    }
  }
}

if (fails.length) {
  console.error("[verify:backend-data-alignment] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:backend-data-alignment] PASS (table filled · current-fx wired · CERT_ISSUED 0 · STALE pending rebase)",
);
