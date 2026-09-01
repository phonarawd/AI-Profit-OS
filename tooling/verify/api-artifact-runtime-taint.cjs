"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const src = fs.readFileSync("tooling/release/api-artifact-runtime-qa.cjs", "utf8");
const start = src.indexOf("const judged = evaluateApiHealth(probe, bound.source_sha);");
const end = src.indexOf("\n}\n\nasync function main", start);
assert.ok(start >= 0 && end > start, "runApiArtifactRuntimeQa result block missing");
const block = src.slice(start, end);

assert.match(block, /const verified = judged\.ok === true/);
assert.match(block, /status: verified \? 200 : null/);
assert.match(block, /service: verified \? "api-nest" : null/);
assert.match(block, /git_sha: verified \? expectedSha : null/);
assert.match(block, /git_sha_source: verified \? "RENDER_GIT_COMMIT" : null/);
assert.doesNotMatch(block, /probe\.status|probe\.body|probe\.body\.gitSha|probe\.body\.service/);

console.log("[verify:api-artifact-runtime-taint] PASS (HTTP_DECISION_ONLY · EXPECTED_PROVENANCE_ONLY)");
