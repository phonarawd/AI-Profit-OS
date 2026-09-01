"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const krw = fs.readFileSync(path.join(root, "services/api-nest/src/wallet/krw-deposit.service.ts"), "utf8");
const stepup = fs.readFileSync(path.join(root, "services/api-nest/src/wallet/withdraw-stepup.policy.ts"), "utf8");
const env = fs.readFileSync(path.join(root, "tooling/deploy/lib/env.cjs"), "utf8");

assert.match(krw, /import \{ randomBytes, randomInt \} from "node:crypto"/);
assert.match(krw, /return randomInt\(1, 100\);/);
assert.doesNotMatch(krw, /randomBytes\(1\)\[0\]\s*%\s*99/);

assert.doesNotMatch(stepup, /replace\(\/\^https\?:\\\/\\\/\/|replace\(\/\\\/\.\*\$\//);
assert.match(stepup, /host\.startsWith\("http:\/\/"\)/);
assert.match(stepup, /host\.startsWith\("https:\/\/"\)/);
assert.match(stepup, /const slash = host\.indexOf\("\/"\)/);

assert.match(env, /function isPlaceholderRootDomain\(value\)/);
assert.doesNotMatch(env, /rootDomain\.includes\("domain\.com"\)/);
assert.match(env, /host === suffix \|\| host\.endsWith\(`\.\$\{suffix\}`\)/);

console.log("[verify:codeql-hardening-current] PASS (UNBIASED_KRW_SUFFIX · LINEAR_HOST_NORMALIZATION · STRUCTURAL_PLACEHOLDER_DOMAIN)");
