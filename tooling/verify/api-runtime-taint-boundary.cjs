"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const src = fs.readFileSync("tooling/release/api-artifact-runtime-qa.cjs", "utf8");

assert.doesNotMatch(src, /function allowApiRuntime/);
assert.doesNotMatch(src, /reason:\s*err\s*&&\s*err\.message/);
assert.match(src, /reason: "api_runtime_exception"/);
assert.match(src, /normalizeHex\(probeBody\.gitSha\) === expectedSha/);
assert.match(src, /\? expectedSha\s*:\s*null/);
assert.match(src, /probeBody\.service === "api-nest" \? "api-nest" : null/);
assert.match(src, /probeBody\.gitShaSource === "RENDER_GIT_COMMIT"/);

console.log("[verify:api-runtime-taint-boundary] PASS");
