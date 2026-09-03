/**
 * verify:phase0-bootstrap — Infra §51.13 / §15
 * CF Pages/Workers + Supabase Seoul + Upstash · Compose optional · NATS/Temporal/EKS 0
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

const required = [
  "infra/hosts.manifest.json",
  "infra/phase0-migration-playbook.md",
  "infra/api/runtime.json",
  "infra/r2/kyc-docs.toml",
  "infra/web/wrangler.toml",
  "infra/ops/wrangler.toml",
  "infra/ops/access-policy.json",
  "infra/workers.manifest.json",
  "docker-compose.dev.yml",
  ".env.example",
  "services/api-nest/src/config/phase0.env.ts",
  "services/api-nest/src/db/postgres.ts",
  "services/api-nest/src/redis/upstash.ts",
  "services/api-nest/src/events/in-process.bus.ts",
  "services/api-nest/src/events/events.module.ts",
  "workers/push-dispatcher/wrangler.toml",
  ".github/workflows/deploy-cloudflare.yml",
];
for (const rel of required) mustExist(rel);

const hosts = readJson("infra/hosts.manifest.json");
if (hosts.phase !== 0) fails.push("hosts.manifest phase must be 0");
if (hosts.bus !== "in-process") fails.push("hosts.manifest bus must be in-process");
if (hosts.compose?.required !== false) {
  fails.push("hosts.manifest compose.required must be false (Docker-less default)");
}
if (hosts.hosts?.db?.region !== "ap-northeast-2") {
  fails.push("hosts.manifest db.region must be ap-northeast-2 (Seoul)");
}
if (hosts.hosts?.db?.projectRef !== "mgsytcetsiecllmhcyox") {
  fails.push("hosts.manifest db.projectRef mismatch");
}
if (hosts.hosts?.db?.authSoT !== "nest-jwt-only") {
  fails.push("hosts.manifest must lock nest-jwt-only auth");
}
for (const bad of ["nats", "temporal", "eks", "vercel"]) {
  if (!(hosts.forbiddenDay1 || []).includes(bad)) {
    fails.push(`hosts.manifest forbiddenDay1 missing ${bad}`);
  }
}
if (!JSON.stringify(hosts.workersPhase0 || []).includes("push-dispatcher")) {
  fails.push("hosts.manifest workersPhase0 must include push-dispatcher");
}

const apiRt = readJson("infra/api/runtime.json");
if (apiRt.bus !== "in-process" || apiRt.phase !== 0) {
  fails.push("infra/api/runtime.json must be phase0 in-process");
}
for (const bad of ["nats", "temporal", "eks", "supabase-auth"]) {
  if (!(apiRt.forbidden || []).includes(bad)) {
    fails.push(`api runtime forbidden missing ${bad}`);
  }
}

const workers = readJson("infra/workers.manifest.json");
if (!Array.isArray(workers.phase0) || workers.phase0.join() !== "push-dispatcher") {
  fails.push("workers.manifest phase0 must be [push-dispatcher] only");
}
if (/nats/i.test(JSON.stringify(workers.phase0))) {
  fails.push("workers.manifest phase0 must not list NATS workers");
}

const webToml = read("infra/web/wrangler.toml");
const opsToml = read("infra/ops/wrangler.toml");
if (!webToml.includes("ai-profit-web")) fails.push("web wrangler missing ai-profit-web");
if (!opsToml.includes("ai-profit-ops")) fails.push("ops wrangler missing ai-profit-ops");
if (/^\s*pages_build_output_dir\s*=/m.test(webToml)) {
  fails.push("web wrangler: pages_build_output_dir key forbidden (OpenNext → Workers)");
}
if (/^\s*pages_build_output_dir\s*=/m.test(opsToml)) {
  fails.push("ops wrangler: pages_build_output_dir key forbidden (OpenNext → Workers)");
}
if (!webToml.includes(".open-next/worker.js") || !webToml.includes(".open-next/assets")) {
  fails.push("web wrangler must point main+assets at apps/web/.open-next");
}
if (!opsToml.includes(".open-next/worker.js") || !opsToml.includes(".open-next/assets")) {
  fails.push("ops wrangler must point main+assets at apps/admin/.open-next");
}

const r2 = read("infra/r2/kyc-docs.toml");
if (!r2.includes('bucket_name = "kyc-docs"')) {
  fails.push("R2 kyc-docs bucket_name lock missing");
}

const compose = read("docker-compose.dev.yml");
if (!/optional|옵션|Docker-less|ADR-016/i.test(compose)) {
  fails.push("docker-compose.dev.yml must document optional / Docker-less");
}

const envEx = read(".env.example");
for (const key of [
  "DATABASE_URL=",
  "REDIS_URL=",
  "SUPABASE_REGION=ap-northeast-2",
  "SUPABASE_PROJECT_REF=",
  "CLOUDFLARE_ACCOUNT_ID=",
  "OAUTH_KAKAO_CLIENT_ID=",
  "OAUTH_GOOGLE_CLIENT_ID=",
  "R2_KYC_BUCKET=kyc-docs",
  "JWT_USER_SECRET=",
  "JWT_ADMIN_SECRET=",
]) {
  if (!envEx.includes(key)) fails.push(`.env.example missing ${key}`);
}

const bus = read("services/api-nest/src/events/in-process.bus.ts");
if (!bus.includes('mode = "in-process"') || !bus.includes("nats: false")) {
  fails.push("InProcessEventBus must declare in-process and nats:false");
}

const appMod = read("services/api-nest/src/app.module.ts");
if (!appMod.includes("EventsModule")) {
  fails.push("AppModule must import EventsModule (Phase0 bus+hosts)");
}

const phaseEnv = read("services/api-nest/src/config/phase0.env.ts");
if (!phaseEnv.includes("ap-northeast-2")) {
  fails.push("phase0.env must lock Seoul ap-northeast-2 check");
}

const oauthSvc = read("services/api-nest/src/auth/oauth-identity.service.ts");
if (
  !oauthSvc.includes("oauthConfigured") ||
  !oauthSvc.includes("oauthKakaoClientId") ||
  !oauthSvc.includes("oauthGoogleClientId")
) {
  fails.push("oauth-identity.service must wire oauthConfigured + Phase0 OAuth env");
}

const playbook = read("infra/phase0-migration-playbook.md");
if (!/Phase0 → Phase1/i.test(playbook) || !/in-process/i.test(playbook)) {
  fails.push("phase0-migration-playbook incomplete");
}
if (!/NATS/i.test(playbook)) {
  fails.push("playbook must document NATS as Phase1+ cutover");
}

// Package scan — Phase0 must not depend on NATS/Temporal/EKS
const pkgPaths = [
  "package.json",
  "services/api-nest/package.json",
  "apps/web/package.json",
  "apps/admin/package.json",
];
const bannedDep =
  /"(nats|nats\.js|@nats-io\/|@temporalio\/|temporalio|@aws-sdk\/client-eks|kubernetes-client)"/;
for (const rel of pkgPaths) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, "utf8");
  if (bannedDep.test(t)) fails.push(`Phase0 forbidden dependency in ${rel}`);
}

const nestPkg = readJson("services/api-nest/package.json");
const nestDeps = { ...nestPkg.dependencies, ...nestPkg.devDependencies };
if (!nestDeps.pg) fails.push("api-nest must depend on pg (Supabase/Compose PG)");
if (!nestDeps.ioredis) fails.push("api-nest must depend on ioredis (Upstash REDIS_URL)");
for (const bad of [
  "@supabase/supabase-js",
  "@supabase/auth-js",
  "nats",
  "@temporalio/client",
]) {
  if (nestDeps[bad]) fails.push(`api-nest must not depend on ${bad}`);
}

// Optional .env sanity (local only — never fail CI for missing .env)
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf8");
  if (/SUPABASE_REGION=/.test(env) && !/SUPABASE_REGION=ap-northeast-2/.test(env)) {
    fails.push(".env SUPABASE_REGION must be ap-northeast-2 when set");
  }
}

const phaseRule = read(".cursor/rules/phase-activation.mdc");
if (!phaseRule.includes("in-process")) {
  fails.push("phase-activation.mdc must lock Phase0 in-process");
}
if (!phaseRule.includes("Upstash")) {
  fails.push("phase-activation.mdc must mention Upstash");
}
if (!phaseRule.includes("NATS")) {
  fails.push("phase-activation.mdc must mention NATS phase boundary");
}

// PART9-pre needle — web /api/v1 → API_HOST · /ads rewrite 보존
const webNextCfg = read("apps/web/next.config.ts");
if (!webNextCfg.includes("/ads") || !webNextCfg.includes("/l/")) {
  fails.push("apps/web/next.config.ts must preserve /ads → /l rewrites");
}
if (!webNextCfg.includes("/api/v1/:path*")) {
  fails.push("apps/web/next.config.ts must rewrite /api/v1/:path* → API_HOST");
}
if (!webNextCfg.includes("API_HOST")) {
  fails.push("apps/web/next.config.ts /api/v1 rewrite must use API_HOST");
}

if (fails.length) {
  console.error("[verify:phase0-bootstrap] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:phase0-bootstrap] PASS (CF Pages/Workers · Supabase Seoul · Upstash · Compose optional · NATS/Temporal/EKS 0)",
);
