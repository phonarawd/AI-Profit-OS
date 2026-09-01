/**
 * verify:api-artifact-provenance
 * API 산출물 ≠ web 산출물. Production deploy/Render 변경 0.
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
if (!lib.includes("WEB_ARTIFACT_ACCEPTED != API_ARTIFACT_ACCEPTED")) {
  fails.push("API provenance must keep WEB ≠ API acceptance inequality");
}
if (!lib.includes("BLOCKED_EXTERNAL_ACTION")) {
  fails.push("registry/paid infra must stay BLOCKED_EXTERNAL_ACTION");
}
if (!lib.includes("artifact_kind") || !lib.includes("api-nest")) {
  fails.push("API artifact kind must be api-nest");
}
if (lib.includes("render.yaml") && lib.includes("deploy Production")) {
  fails.push("must not mutate Render from this helper");
}

const {
  apiArtifactAcceptedNeverEqualsWeb,
} = require("../release/api-artifact-provenance.cjs");
const acc = apiArtifactAcceptedNeverEqualsWeb();
if (acc.WEB_ARTIFACT_ACCEPTED === acc.API_ARTIFACT_ACCEPTED && acc.WEB_ARTIFACT_ACCEPTED === true) {
  fails.push("must never claim both artifacts accepted");
}
if (acc.inequality !== "WEB_ARTIFACT_ACCEPTED != API_ARTIFACT_ACCEPTED") {
  fails.push("inequality label missing");
}

if (fails.length) {
  console.error("[verify:api-artifact-provenance] FAIL");
  for (const f of fails) console.error(" - " + f);
  process.exit(1);
}
console.log(
  "[verify:api-artifact-provenance] PASS (STATIC_VERIFIER_PASS · WEB ≠ API · registry BLOCKED_EXTERNAL_ACTION)",
);
