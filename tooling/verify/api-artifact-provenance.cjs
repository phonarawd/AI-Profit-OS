/**
 * verify:api-artifact-provenance
 * API 산출물은 web 산출물과 별도 권위지만, 동일 release-bundle digest 안에
 * source SHA + API entry digest가 fail-closed로 결속되어야 한다.
 * Production deploy/Render 변경 0.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const read = (rel) => {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push("missing " + rel);
    return "";
  }
  return fs.readFileSync(p, "utf8");
};

const lib = read("tooling/release/api-artifact-provenance.cjs");
const bundle = read("tooling/release/artifact-provenance.cjs");
const workflow = read(".github/workflows/release-build.yml");

if (!lib.includes("WEB_ARTIFACT_ACCEPTED != API_ARTIFACT_ACCEPTED")) {
  fails.push("API provenance must keep WEB ≠ API acceptance authority");
}
if (!lib.includes("BLOCKED_EXTERNAL_ACTION")) {
  fails.push("registry/paid infra must stay BLOCKED_EXTERNAL_ACTION");
}
if (!lib.includes("artifact_kind") || !lib.includes("api-nest")) {
  fails.push("API artifact kind must be api-nest");
}
if (!lib.includes("if (require.main === module)") || !lib.includes("--source-sha")) {
  fails.push("canonical CLI source-SHA binder missing");
}

for (const needle of [
  'const API_DIST_DIR = "services/api-nest/dist"',
  'const API_ENTRY = API_DIST_DIR + "/main.js"',
  'const API_MANIFEST = API_DIST_DIR + "/api-release-manifest.json"',
  "collectApiArtifact",
  "assertApiArtifact",
  "copyTree(path.join(repoRoot, API_DIST_DIR)",
  "api_artifact,",
]) {
  if (!bundle.includes(needle)) {
    fails.push("release-bundle API binding missing: " + needle);
  }
}

for (const needle of [
  "pnpm --filter @aipo/api-nest... build",
  "services/api-nest/dist/main.js",
  "api-artifact-provenance.cjs --source-sha",
  "services/api-nest/dist/api-release-manifest.json",
  "pnpm verify:api-artifact-provenance",
]) {
  if (!workflow.includes(needle)) {
    fails.push("release-build API evidence missing: " + needle);
  }
}

const {
  apiArtifactAcceptedNeverEqualsWeb,
  isFullSha,
} = require("../release/api-artifact-provenance.cjs");
const acc = apiArtifactAcceptedNeverEqualsWeb();
if (acc.WEB_ARTIFACT_ACCEPTED === true && acc.API_ARTIFACT_ACCEPTED === true) {
  fails.push("must never silently collapse web/API acceptance authorities");
}
if (acc.inequality !== "WEB_ARTIFACT_ACCEPTED != API_ARTIFACT_ACCEPTED") {
  fails.push("inequality label missing");
}
if (!isFullSha("a".repeat(40)) || isFullSha("a".repeat(39))) {
  fails.push("full SHA validator drift");
}

if (fails.length) {
  console.error("[verify:api-artifact-provenance] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:api-artifact-provenance] PASS (STATIC_VERIFIER_PASS · API packaged in immutable release-bundle · API runtime acceptance remains independent)",
);
