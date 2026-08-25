/**
 * verify:rel-506-r8-infra-core
 * R8 Core 인증. Ads/자동운영 완료 대체 금지. pages deploy 0. apply 0.
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

function readJson(rel) {
  const text = read(rel);
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    fails.push(rel + " invalid JSON: " + e.message);
    return {};
  }
}

const fixture = readJson("tooling/verify/fixtures/rel-506-r8-infra-core.v1.json");
const inventory = readJson("governance/release-master/r8-cache-inventory.v1.json");
const plan = read(".cursor/plans/PUTDUK_RELEASE_MASTER.plan.md");
const cert = read("governance/release-master/R8_INFRA_CORE.md");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const manifest = readJson("infra/domain.manifest.json");
const sink = readJson("governance/observability/error-sink.v1.json");
const engineCert = read("governance/engine-acceptance/FINAL_ACCEPTANCE.md");
const r6 = read("governance/admin/R6_CERTIFICATION.md");
const versioning = read("governance/release-master/VERSIONING.md");
const runbook = read("governance/release-master/ROLLBACK_RUNBOOK.md");
const webToml = read("infra/web/wrangler.toml");
const opsToml = read("infra/ops/wrangler.toml");
const kycToml = read("infra/r2/kyc-docs.toml");
const assetToml = read("infra/r2/asset-images.toml");

function todoCompleted(relId) {
  const id = relId.replace(/^REL-/i, "rel-").toLowerCase();
  const re = new RegExp(
    "- id: " + id + "\\r?\\n(?:.*\\r?\\n){0,3}\\s*status: (\\w+)",
  );
  const m = plan.match(re);
  return m && m[1] === "completed";
}

function yamlStatus(relId) {
  const idx = plan.indexOf("ID: " + relId);
  if (idx < 0) return "";
  const m = plan.slice(idx, idx + 240).match(/STATUS:\s*(\w+)/);
  return m ? m[1] : "";
}

if (fixture.certIssued !== 1) fails.push("fixture certIssued must be 1");
if (fixture.allAligned !== 0) fails.push("fixture allAligned must stay 0 while deferred rows exist");
if (fixture.pagesDeploy !== 0) fails.push("fixture pagesDeploy must be 0");
if (fixture.vercel !== 0) fails.push("fixture vercel must be 0");
if (fixture.adsExcluded !== 1) fails.push("fixture adsExcluded must be 1");
if (fixture.autonomousOpsComplete !== 0) {
  fails.push("fixture autonomousOpsComplete must be 0");
}
if (fixture.productionAnnotatedTag !== 0) {
  fails.push("fixture must not claim a production annotated tag");
}
if (fixture.webVitalsRum !== 0) fails.push("fixture webVitalsRum must be 0");
if (fixture.dynamicCacheRules !== 0) fails.push("fixture dynamicCacheRules must be 0");
if (fixture.knownGoodScheme !== "REL-403") fails.push("knownGoodScheme must be REL-403");
if (fixture.knownGoodPractice !== "REL-602") fails.push("knownGoodPractice must be REL-602");
if (fixture.rumOwner !== "REL-703") fails.push("rum owner must stay REL-703");
if (fixture.adsOwner !== "POST-012") fails.push("ads owner must stay POST-012");
for (const sev of ["p0", "p1", "p2", "p3"]) {
  if (Number(fixture[sev]) !== 0) fails.push("fixture " + sev + " budget must be 0");
}

for (const dep of fixture.deps || []) {
  if (!todoCompleted(dep)) fails.push("EXIT_GATE: plan todo not completed " + dep);
  if (yamlStatus(dep) !== "COMPLETED") fails.push("EXIT_GATE: YAML not COMPLETED " + dep);
}
if (!todoCompleted("REL-506")) fails.push("rel-506 todo must be completed");
if (yamlStatus("REL-506") !== "COMPLETED") fails.push("REL-506 YAML must be COMPLETED");

for (const needle of [
  "STATUS = COMPLETED",
  "CERT_ISSUED = 1",
  "PAGES_DEPLOY = 0",
  "VERCEL = 0",
  "ADS_EXCLUDED = 1",
  "AUTONOMOUS_OPS_COMPLETE = 0",
  "ADS_OWNER = POST-012",
  "ALL_ALIGNED = 0",
  "KNOWN_P0 = 0",
  "KNOWN_P3 = 0",
  "WEB_VITALS_RUM = 0",
  "WEB_VITALS_RUM_OWNER = REL-703",
  "DYNAMIC_CACHE_RULES = 0",
  "PRODUCTION_ANNOTATED_TAG = 0",
  "KNOWN_GOOD_SCHEME = REL-403",
  "KNOWN_GOOD_PRACTICE = REL-602",
  "CURRENT_RELEASE_ID_PINNED = 0",
  "CONCEALMENT = 0",
]) {
  if (!cert.includes(needle)) fails.push("R8 cert missing " + needle);
}

const header = (cert.match(/```text\r?\n([\s\S]*?)```/) || [])[1] || "";
if (!header) fails.push("R8 cert missing header text block");
const bannedHeader = [
  "AUTONOMOUS_OPS_COMPLETE = 1",
  "ADS_AUTONOMOUS_CERT = 1",
  "PLATFORM_RELEASE_STATUS=CLOSED",
  "WEB_VITALS_RUM = 1",
  "PAGES_DEPLOY = 1",
  "VERCEL = 1",
  "PRODUCTION_ANNOTATED_TAG = 1",
  "CERT_ISSUED = 0",
];
for (const phrase of bannedHeader) {
  if (header.includes(phrase)) fails.push("header banned assignment: " + phrase);
}
if (/자동운영 완료/.test(header)) {
  fails.push("header must not claim autonomous-ops complete");
}
if (!cert.includes("POST-012")) fails.push("cert must keep POST-012 as Ads owner");
if (!cert.includes("DEFERRED not aligned")) {
  fails.push("cert must keep deferred rows instead of hiding gaps");
}

if (manifest.openNext?.runtime !== "workers") {
  fails.push("domain.manifest openNext.runtime must be workers");
}
const env = manifest.env || {};
if (env.APP_HOST !== "app.hiptk.app") fails.push("APP_HOST must stay app.hiptk.app");
if (env.OPS_HOST !== "ops.hiptk.app") fails.push("OPS_HOST must stay ops.hiptk.app");
if (env.API_HOST !== "api.hiptk.app") fails.push("API_HOST must stay api.hiptk.app");
const forbidden = manifest.openNext?.forbiddenDeploy || [];
if (!forbidden.some((x) => String(x).includes("wrangler pages deploy"))) {
  fails.push("manifest forbiddenDeploy must include wrangler pages deploy");
}
if (manifest.openNext?.web?.workersDev !== "ai-profit-web.ebay-adapter.workers.dev") {
  fails.push("openNext.web.workersDev drift");
}
if (manifest.openNext?.ops?.workersDev !== "ai-profit-ops.ebay-adapter.workers.dev") {
  fails.push("openNext.ops.workersDev drift");
}

if (sink.vercel !== 0) fails.push("error-sink vercel must stay 0");
if (sink.provider !== "cloudflare-workers-console") {
  fails.push("error-sink provider must stay cloudflare-workers-console");
}

function tomlHasPagesKey(toml, label) {
  if (/^\s*pages_build_output_dir\s*=/m.test(toml)) {
    fails.push(label + " has pages_build_output_dir");
  }
}
tomlHasPagesKey(webToml, "infra/web/wrangler.toml");
tomlHasPagesKey(opsToml, "infra/ops/wrangler.toml");
if (!webToml.includes('binding = "ASSETS"') || !webToml.includes(".open-next/assets")) {
  fails.push("web wrangler must bind ASSETS to .open-next/assets");
}
if (!opsToml.includes('binding = "ASSETS"') || !opsToml.includes(".open-next/assets")) {
  fails.push("ops wrangler must bind ASSETS to .open-next/assets");
}

if (inventory.dynamicCacheRules !== 0 || inventory.cacheControlInventory !== 0) {
  fails.push("inventory must not invent dynamic cache rules");
}
if (inventory.inventedSlo !== 0) fails.push("inventory inventedSlo must be 0");
const webInv = inventory.openNextAssets?.web || {};
const opsInv = inventory.openNextAssets?.ops || {};
if (webInv.binding !== "ASSETS" || webInv.wrangler !== "infra/web/wrangler.toml") {
  fails.push("inventory web assets slot drift");
}
if (opsInv.binding !== "ASSETS" || opsInv.wrangler !== "infra/ops/wrangler.toml") {
  fails.push("inventory ops assets slot drift");
}
if (!kycToml.includes('bucket_name = "kyc-docs"') || !/public_access\s*=\s*false/.test(kycToml)) {
  fails.push("kyc-docs must stay private");
}
if (
  !assetToml.includes('bucket_name = "asset-images"') ||
  !/public_access\s*=\s*true/.test(assetToml)
) {
  fails.push("asset-images must stay public thumbs bucket");
}
const r2 = inventory.r2 || [];
if (r2.length !== 2) fails.push("inventory r2 must list kyc-docs + asset-images only");
if (!r2.some((x) => x.bucket === "kyc-docs" && x.publicAccess === false)) {
  fails.push("inventory missing private kyc-docs");
}
if (!r2.some((x) => x.bucket === "asset-images" && x.publicAccess === true)) {
  fails.push("inventory missing public asset-images");
}

if (/"web-vitals"\s*:/.test(pkg)) {
  fails.push("web-vitals dependency present; flip WEB_VITALS_RUM or remove the package");
}
const rumFiles = [
  "apps/web/components/observability/ObsRuntime.tsx",
  "packages/observability/observability.core.cjs",
];
for (const rel of rumFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) continue;
  const body = fs.readFileSync(full, "utf8");
  if (/from ["']web-vitals["']/.test(body) || /\bon(?:LCP|INP|CLS)\s*\(/.test(body)) {
    fails.push("web-vitals RUM appeared without flipping WEB_VITALS_RUM: " + rel);
  }
}

const deployScan = [
  "tooling/deploy/cf-pages-web.cjs",
  "tooling/deploy/cf-pages-ops.cjs",
  "tooling/deploy/cf-deploy-all.cjs",
  ".github/workflows/deploy-cloudflare.yml",
  "package.json",
];
for (const rel of deployScan) {
  const body = read(rel);
  if (/\bwrangler\s+pages\s+deploy\b/.test(body) || /\bpages\s+deploy\b/.test(body)) {
    fails.push("pages deploy path present: " + rel);
  }
  if (/\bvercel\s+deploy\b/.test(body) || /npx\s+vercel/.test(body)) {
    fails.push("vercel deploy path present: " + rel);
  }
}

if (!versioning.includes("KNOWN_GOOD") || !versioning.includes("REL-602")) {
  fails.push("VERSIONING.md must keep known-good -> REL-602");
}
if (!runbook.includes("KNOWN_GOOD_OWNER = REL-403") || !runbook.includes("PRACTICE_OWNER = REL-602")) {
  fails.push("ROLLBACK_RUNBOOK owners drifted");
}
const rebaseRequired = /REBASE_REQUIRED = 1/.test(engineCert);
if (!rebaseRequired) {
  if (!/STATUS = ISSUED/.test(engineCert) || !/CERT_ISSUED = 1/.test(engineCert)) {
    fails.push("REL-502 must stay ISSUED before R8 Core");
  }
}
if (!/DEFECTS_P0 = 0/.test(engineCert) || !/DEFECTS_P1 = 0/.test(engineCert)) {
  fails.push("engine DEFECTS_P0/P1 must stay 0");
}
if (!/KNOWN_P0 = 0/.test(r6) || !/KNOWN_P3 = 0/.test(r6)) {
  fails.push("R6 known P0-P3 must stay 0");
}

if (!pkg.includes("verify:rel-506-r8-infra-core")) {
  fails.push("package.json missing verify:rel-506-r8-infra-core");
}
if (!catalog.includes("rel-506-r8-infra-core")) {
  fails.push("CATALOG missing rel-506-r8-infra-core");
}
if (!gate.includes("verify:rel-506-r8-infra-core")) {
  fails.push("gate.yml must run verify:rel-506-r8-infra-core");
}
if (!domain.includes("rel-506-r8-infra-core.cjs")) {
  fails.push("domain-by-path must trigger rel-506");
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
        "re-run FAIL " +
          script +
          ": " +
          String(run.stderr || run.stdout || "").split("\n")[0],
      );
    }
  }
}

if (fails.length) {
  console.error("[verify:rel-506-r8-infra-core] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:rel-506-r8-infra-core] PASS (R8 Core · pages 0 · Ads excluded · deferred rum/tag)",
);
