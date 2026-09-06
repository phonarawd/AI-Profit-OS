/**
 * verify:s5-dedicated-staging
 * S5 전용 staging 슬롯이 REL-600 preview / production 과 분리돼 있는지 정적 검사.
 * live deploy · J0 PASS를 이 스크립트가 선언하지 않는다.
 */
const fs = require("fs");
const path = require("path");
const { resolveWranglerEnv } = require("../deploy/lib/env.cjs");

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

const manifest = readJson("infra/domain.manifest.json");
const evidence = readJson("governance/release-master/S5-DEDICATED-STAGING.v1.json");
const stagingMig = readJson("governance/release-master/S5-STAGING-MIGRATIONS.v1.json");
const originProbe = readJson("governance/release-master/S5-STAGING-ORIGIN-PROBE.v1.json");
const appliedFx = readJson("tooling/verify/fixtures/migrations-applied.v1.json");
const applicator = read("tooling/dev/apply-staging-unapplied.cjs");
const webToml = read("infra/web/wrangler.toml");
const opsToml = read("infra/ops/wrangler.toml");
const envLib = read("tooling/deploy/lib/env.cjs");
const dedicatedDeploy = read("tooling/deploy/cf-deploy-dedicated.cjs");
const dedicatedWorkflow = read(".github/workflows/deploy-dedicated.yml");
const stagingWorkflow = read(".github/workflows/deploy-staging.yml");
const proxy = read("apps/admin/middleware.ts");
const jwtLib = read("apps/admin/lib/cf-access-jwt.ts");
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const gate = read(".github/workflows/gate.yml");
const domain = read("tooling/verify/domain-by-path.cjs");
const freeze = readJson("governance/release-master/S4-CANDIDATE-FREEZE.v1.json");

if (resolveWranglerEnv("staging") !== "preview") {
  fails.push("REL-600 lock: resolveWranglerEnv(staging) must stay preview");
}
if (resolveWranglerEnv("preview") !== "preview") {
  fails.push("resolveWranglerEnv(preview) must stay preview");
}
if (resolveWranglerEnv("dedicated") !== "dedicated") {
  fails.push("resolveWranglerEnv(dedicated) must be dedicated");
}
if (resolveWranglerEnv("production") !== "production") {
  fails.push("resolveWranglerEnv(production) must stay production");
}

const staging = manifest.openNext && manifest.openNext.staging;
const dedicated = manifest.openNext && manifest.openNext.dedicated;
if (!staging || staging.wranglerEnv !== "preview") {
  fails.push("openNext.staging.wranglerEnv must remain preview");
}
if (!dedicated || dedicated.wranglerEnv !== "dedicated") {
  fails.push("openNext.dedicated.wranglerEnv must be dedicated");
}
if (!dedicated || dedicated.j0Host !== true || dedicated.previewIsNotJ0 !== true) {
  fails.push("dedicated must declare j0Host and previewIsNotJ0");
}
if (
  !dedicated ||
  dedicated.web.workersDev !== "ai-profit-web-dedicated.ebay-adapter.workers.dev" ||
  dedicated.ops.workersDev !== "ai-profit-ops-dedicated.ebay-adapter.workers.dev"
) {
  fails.push("dedicated workersDev host drift");
}
if (
  dedicated &&
  staging &&
  (dedicated.web.workersDev === staging.web.workersDev ||
    dedicated.ops.workersDev === staging.ops.workersDev)
) {
  fails.push("dedicated host must differ from REL-600 preview");
}
if (manifest.openNext.web.workersDev !== "ai-profit-web.ebay-adapter.workers.dev") {
  fails.push("production web origin must stay unchanged");
}
if (manifest.openNext.ops.workersDev !== "ai-profit-ops.ebay-adapter.workers.dev") {
  fails.push("production ops origin must stay unchanged");
}
if (manifest.env.OPS_HOST !== "ops.hiptk.app") {
  fails.push("OPS_HOST must stay ops.hiptk.app");
}

if (!/\[env\.dedicated\]/.test(webToml) || !webToml.includes('name = "ai-profit-web-dedicated"')) {
  fails.push("web wrangler missing [env.dedicated] name");
}
if (!/\[env\.dedicated\]/.test(opsToml) || !opsToml.includes('name = "ai-profit-ops-dedicated"')) {
  fails.push("ops wrangler missing [env.dedicated] name");
}
function tomlVarsBlock(toml, env) {
  const re = new RegExp("\\[env\\." + env + "\\.vars\\]([\\s\\S]*?)(?=\\n\\[|$)");
  const m = String(toml || "").match(re);
  return m ? m[1] : "";
}
if (!/CF_ACCESS_ENFORCE = "1"/.test(tomlVarsBlock(opsToml, "dedicated"))) {
  fails.push("ops dedicated vars must set CF_ACCESS_ENFORCE=1");
}
if (/CF_ACCESS_ENFORCE = "1"/.test(tomlVarsBlock(opsToml, "preview"))) {
  fails.push("ops preview must not enforce Access");
}
if (/CF_ACCESS_ENFORCE = "1"/.test(tomlVarsBlock(opsToml, "production"))) {
  fails.push("ops production must not enforce Access in this slice");
}
if (/CF_ACCESS_ENFORCE = "1"/.test(webToml)) {
  fails.push("web must not enforce Access");
}

if (!envLib.includes('target === "dedicated"')) {
  fails.push("env.cjs must map dedicated target");
}
if (dedicatedDeploy.includes("cf-workers.cjs") || dedicatedDeploy.includes("cf-domain-bridge")) {
  fails.push("dedicated orchestrator must not deploy production bridge workers");
}
if (!dedicatedDeploy.includes("cf-pages-web.cjs") || !dedicatedDeploy.includes("cf-pages-ops.cjs")) {
  fails.push("dedicated orchestrator must deploy web and ops");
}
if (!dedicatedWorkflow.includes("name: deploy-dedicated")) {
  fails.push("deploy-dedicated workflow missing");
}
if (dedicatedWorkflow.includes("environment: production")) {
  fails.push("dedicated workflow must not use production GitHub environment");
}
if (dedicatedWorkflow.includes("secrets.API_HOST")) {
  fails.push("dedicated workflow must not inherit production API_HOST");
}
if (!dedicatedWorkflow.includes("STAGING_API_HOST")) {
  fails.push("dedicated workflow must require STAGING_API_HOST");
}
if (!dedicatedWorkflow.includes("cf-pages-web.cjs dedicated")) {
  fails.push("dedicated workflow must deploy web dedicated");
}
if (/\bwrangler\s+pages\s+deploy\b/.test(dedicatedWorkflow) || /\bpages\s+deploy\b/.test(dedicatedWorkflow)) {
  fails.push("pages deploy path present in dedicated workflow");
}
if (stagingWorkflow.includes("cf-pages-web.cjs dedicated")) {
  fails.push("REL-600 deploy-staging must not retarget dedicated");
}

if (!proxy.includes("decideCfAccess") || !proxy.includes("export async function middleware")) {
  fails.push("admin middleware.ts must export Edge middleware and call decideCfAccess");
}
if (fs.existsSync(path.join(root, "apps/admin/proxy.ts"))) {
  fails.push("admin proxy.ts forbidden: OpenNext Cloudflare rejects Node proxy runtime");
}
if (!jwtLib.includes("cf-access-jwt-assertion") || !jwtLib.includes("CF_ACCESS_ENFORCE")) {
  fails.push("cf-access-jwt must verify Access JWT only when enforced");
}
if (/console\.(log|info|debug|warn|error)\([^)]*token/i.test(jwtLib)) {
  fails.push("cf-access-jwt must not log tokens");
}

if (evidence.j0 === "PASS") {
  fails.push("S5 evidence must not declare J0 PASS from static verify");
}
if (evidence.previewIsNotJ0 !== true) {
  fails.push("S5 evidence must keep previewIsNotJ0");
}
if (evidence.productionDeploy !== 0) {
  fails.push("S5 productionDeploy must stay 0");
}
if (evidence.renderLiveConfirmed !== true) {
  fails.push("S5 renderLiveConfirmed must be true after MCP live confirm");
}
if (stagingMig.productionApply !== 0 || stagingMig.j0 === "PASS") {
  fails.push("staging migration evidence must keep productionApply=0 and j0 NOT_RUN");
}
if (!Array.isArray(stagingMig.applied) || stagingMig.applied.length !== 9) {
  fails.push("staging migration evidence must list the 9 applied versions");
}
if (stagingMig.matchProfitExpense !== true || stagingMig.productOnboardingTable !== true) {
  fails.push("staging must record MATCH_PROFIT_EXPENSE and product_onboarding");
}
const pending = (appliedFx.committedUnapplied || []).map((row) =>
  typeof row === "string" ? row : row.version,
);
for (const version of stagingMig.applied || []) {
  if (!pending.includes(version)) {
    fails.push("production fixture must keep committedUnapplied " + version);
  }
}
if (!applicator.includes("srv-dabph32fngtc73esj8rg") || !applicator.includes("refused: production service id")) {
  fails.push("apply-staging-unapplied must pin staging service and refuse production");
}
const stagingSha = read("tooling/deploy/render-staging-sha.cjs");
if (!stagingSha.includes("7c6a2b0abe259847b7b1d7939ce7e1d98e6f654f") || !stagingSha.includes("not a candidate SHA")) {
  fails.push("render-staging-sha must refuse 7c6a2b0a");
}
if (originProbe.j0 === "PASS" || originProbe.j1 === "PASS" || originProbe.j2 === "PASS" || originProbe.j3 === "PASS") {
  fails.push("origin probe must not declare J PASS");
}
if (!originProbe.stagingApi || originProbe.stagingApi.migrationHead !== "20260906233000") {
  fails.push("origin probe must record staging migrationHead 20260906233000");
}
if (!originProbe.stagingApi || originProbe.stagingApi.dbOk !== true) {
  fails.push("origin probe must record staging dbOk");
}
if (originProbe.turnstileConfigured !== false) {
  fails.push("origin probe must record turnstileConfigured=false until a real key exists");
}
if (originProbe.accessEdgeOnDedicatedOps === true && evidence.j0 !== "NOT_RUN") {
  fails.push("Access edge probe is not J0");
}
if (freeze.prState !== "OPEN_DRAFT_DO_NOT_MERGE") {
  fails.push("S4 freeze must remain DO NOT MERGE");
}

if (!pkg.includes("verify:s5-dedicated-staging")) {
  fails.push("package.json missing verify:s5-dedicated-staging");
}
if (!pkg.includes("cf:deploy:dedicated")) {
  fails.push("package.json missing cf:deploy:dedicated");
}
if (!catalog.includes("s5-dedicated-staging")) {
  fails.push("CATALOG missing s5-dedicated-staging");
}
if (!gate.includes("verify:s5-dedicated-staging")) {
  fails.push("gate.yml must run verify:s5-dedicated-staging");
}
if (!domain.includes("s5-dedicated-staging.cjs")) {
  fails.push("domain-by-path must trigger s5-dedicated-staging");
}
if (!pkg.includes("verify:hard-gate-live") || !catalog.includes("hard-gate-live") || !gate.includes("verify:hard-gate-live")) {
  fails.push("hard-gate-live must be wired next to S5");
}

if (fails.length) {
  console.error("[verify:s5-dedicated-staging] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log("[verify:s5-dedicated-staging] PASS (path lock · live J0 NOT_RUN)");
