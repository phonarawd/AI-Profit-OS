"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "services/api-nest/src/wallet/withdraw-stepup.policy.ts"), "utf8");

assert.doesNotMatch(source, /replace\(\/\^https\?:\\\/\\\/\/|replace\(\/\\\/\.\*\$\//);
assert.match(source, /host\.startsWith\("http:\/\/"\)/);
assert.match(source, /host\.startsWith\("https:\/\/"\)/);
assert.match(source, /const slash = host\.indexOf\("\/"\)/);
assert.match(source, /return slash >= 0 \? host\.slice\(0, slash\) : host/);

console.log("[verify:stepup-host-normalization] PASS (NO_POLYNOMIAL_PATH_REGEX · LINEAR_PREFIX_AND_INDEX)");
