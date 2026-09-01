"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const src = fs.readFileSync(
  "services/api-nest/src/wallet/krw-deposit.service.ts",
  "utf8",
);

assert.match(src, /import \{ randomBytes, randomInt \} from "node:crypto"/);
assert.match(src, /return randomInt\(1, 100\);/);
assert.doesNotMatch(src, /randomBytes\(1\)\[0\]\s*%\s*99/);

console.log("[verify:krw-deposit-unbiased-suffix] PASS (UNBIASED_1_TO_99)");
