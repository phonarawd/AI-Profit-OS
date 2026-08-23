/**
 * verify:rel-403-versioning
 * 버전 규칙 문서 + 빌드 id 리졸버. production 자동 태그 0.
 */
const fs = require("fs");
const path = require("path");
const {
  loadSpec,
  readPackageVersion,
  gitShortSha,
  gitTagName,
  resolveReleaseId,
} = require("../release/version-id.cjs");

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

const spec = loadSpec();
const pkg = read("package.json");
const catalog = read("tooling/verify/CATALOG.md");
const versioning = read("governance/release-master/VERSIONING.md");
const gate = read(".github/workflows/gate.yml");
const deploy = read(".github/workflows/deploy-cloudflare.yml");

if (spec.rel !== "REL-403") fails.push("spec.rel must be REL-403");
if (spec.scheme !== "semver") fails.push("scheme must be semver");
if (spec.autoTagOnPush !== false) fails.push("autoTagOnPush must be false");
if (spec.autoTagOnMain !== false) fails.push("autoTagOnMain must be false");
if (spec.secret !== false) fails.push("release id must not be a secret");
if (spec.runtimeInjectionThisRel !== false) {
  fails.push("this REL is gate/docs — runtime injection must stay 0");
}
if (spec.productionTag !== "manual-after-human-deploy") {
  fails.push("production tags must be manual after HUMAN deploy");
}
if (spec.envOverride !== "PUTDUK_RELEASE_ID") {
  fails.push("env override must be PUTDUK_RELEASE_ID");
}
if (spec.rollbackConsumer !== "REL-602") {
  fails.push("rollback consumer must be REL-602");
}

const version = readPackageVersion();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fails.push("package.json version must be semver x.y.z");
}
if (gitTagName(version) !== "v" + version) {
  fails.push("git tag name must be v{semver}");
}

const id = resolveReleaseId();
const idRe = new RegExp(spec.releaseIdPattern);
if (!idRe.test(id)) fails.push("release id does not match pattern: " + id);
if (!id.startsWith(version + "+")) {
  fails.push("release id must start with package version");
}
const sha = gitShortSha();
if (sha && !id.endsWith("+" + sha) && !process.env.PUTDUK_RELEASE_ID) {
  fails.push("release id must include git sha when available");
}

for (const needle of [
  "SCHEME: semver",
  "AUTO_TAG_ON_PUSH: 0",
  "AUTO_TAG_ON_MAIN: 0",
  "PRODUCTION_TAG: MANUAL_AFTER_HUMAN_DEPLOY",
  "SECRET: 0",
  "REL-602",
  "PUTDUK_RELEASE_ID",
  "KNOWN_GOOD",
  "{semver}+{gitSha7|local}",
]) {
  if (!versioning.includes(needle)) {
    fails.push("VERSIONING.md missing " + needle);
  }
}

if (!pkg.includes("verify:rel-403-versioning")) {
  fails.push("package.json missing verify:rel-403-versioning");
}
if (!pkg.includes("release:id")) {
  fails.push("package.json missing release:id");
}
if (!catalog.includes("rel-403-versioning")) {
  fails.push("CATALOG missing rel-403-versioning");
}

if (/\bgit\s+tag\b/.test(gate) || /push\s+--tags/.test(gate)) {
  fails.push("gate.yml must not auto-tag");
}
if (!deploy.includes("workflow_dispatch")) {
  fails.push("deploy-cloudflare.yml must stay HUMAN workflow_dispatch");
}
if (/\bgit\s+tag\b/.test(deploy) || /push\s+--tags/.test(deploy)) {
  fails.push("deploy-cloudflare.yml must not auto-tag");
}

if (fails.length) {
  console.error("[verify:rel-403-versioning] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-403-versioning] PASS (" + id + ")");
