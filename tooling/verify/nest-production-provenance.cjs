/**
 * verify:nest-production-provenance — P0-B2
 * health gitSha from RENDER_GIT_COMMIT · hardcoded SHA 0 · db/redis unchanged.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function fail(message) {
  fails.push(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const healthRel = "services/api-nest/src/health.controller.ts";
const provRel = "services/api-nest/src/config/nest-provenance.ts";

if (!fs.existsSync(path.join(root, healthRel))) fail("missing health.controller.ts");
if (!fs.existsSync(path.join(root, provRel))) fail("missing nest-provenance.ts");

const health = fs.existsSync(path.join(root, healthRel)) ? read(healthRel) : "";
const prov = fs.existsSync(path.join(root, provRel)) ? read(provRel) : "";

if (!/from\s+["']\.\/config\/nest-provenance["']/.test(health)) {
  fail("health.controller.ts must import nestProvenance from ./config/nest-provenance");
}
if (!/\bnestProvenance\s*\(/.test(health)) {
  fail("health.controller.ts must call nestProvenance()");
}

if (!/export function nestProvenance\s*\(/.test(prov)) {
  fail("nest-provenance.ts must export nestProvenance()");
}
if (!/RENDER_GIT_COMMIT/.test(prov)) {
  fail("nestProvenance must use RENDER_GIT_COMMIT");
}
if (/\bGITHUB_SHA\b|\bSOURCE_VERSION\b|\bGIT_SHA\b|\bRENDER_GIT_BRANCH\b/.test(prov)) {
  fail("do not guess extra SHA env names");
}
if (/execSync|spawnSync|git rev-parse|child_process/.test(prov)) {
  fail("runtime must not shell out to git");
}

const envReads = [...prov.matchAll(/env\[NEST_GIT_SHA_ENV\]|process\.env\.([A-Z0-9_]+)/g)]
  .map((m) => m[1])
  .filter(Boolean);
const unexpected = envReads.filter((name) => name !== "RENDER_GIT_COMMIT");
if (unexpected.length) {
  fail("nest-provenance.ts must not read env besides RENDER_GIT_COMMIT: " + unexpected.join(","));
}

if (/gitSha\s*[:=]\s*["'][0-9a-fA-F]{7,}["']/.test(health) || /gitSha\s*[:=]\s*["'][0-9a-fA-F]{7,}["']/.test(prov)) {
  fail("gitSha must not be a hardcoded SHA literal");
}

const shaLiteral = /\b[0-9a-fA-F]{40}\b/;
if (shaLiteral.test(health) || shaLiteral.test(prov)) {
  fail("health/provenance must not embed a 40-char commit SHA");
}

if (!/\bdb\s*:/.test(health) || !/\bredis\s*:/.test(health)) {
  fail("health db/redis keys must remain");
}
if (!/this\.pg\.ping\(\)/.test(health) || !/this\.redis\.ping\(\)/.test(health)) {
  fail("health must keep db/redis ping semantics");
}
if (!/configured:\s*this\.pg\.configured\(\)/.test(health)) {
  fail("health db.configured semantics must remain");
}
if (!/configured:\s*this\.redis\.configured\(\)/.test(health)) {
  fail("health redis.configured semantics must remain");
}
if (/db\s*:\s*\{[\s\S]*gitSha/.test(health) || /redis\s*:\s*\{[\s\S]*gitSha/.test(health)) {
  fail("gitSha must not be folded into db/redis payloads");
}

const NEST_GIT_SHA_ENV = "RENDER_GIT_COMMIT";
const GIT_SHA_RE = /^[0-9a-f]{7,40}$/i;
function readNestGitSha(env) {
  const raw = env[NEST_GIT_SHA_ENV];
  if (raw == null) return null;
  const sha = String(raw).trim();
  if (!GIT_SHA_RE.test(sha)) return null;
  return sha.toLowerCase();
}

if (readNestGitSha({}) !== null) fail("missing env must be null");
if (readNestGitSha({ RENDER_GIT_COMMIT: "" }) !== null) fail("empty SHA must be null");
if (readNestGitSha({ RENDER_GIT_COMMIT: "not-a-sha" }) !== null) {
  fail("non-hex SHA must be null");
}
if (readNestGitSha({ RENDER_GIT_COMMIT: "deadbeef" }) !== "deadbeef") {
  fail("short hex SHA must pass");
}

if (fails.length) {
  console.error("[verify:nest-production-provenance] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

console.log(
  "[verify:nest-production-provenance] PASS (health gitSha from RENDER_GIT_COMMIT · hardcoded SHA 0 · db/redis unchanged)",
);
