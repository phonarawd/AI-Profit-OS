"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const src = fs.readFileSync("services/api-nest/src/wallet/withdraw-stepup.policy.ts", "utf8");
assert.match(src, /new URL\(raw\.includes\("[:][/][/]"\) \? raw : "https:\/\/" \+ raw\)/);
assert.doesNotMatch(src, /replace\(\/\^https\?:/);
assert.doesNotMatch(src, /replace\(\/\\\/\.\*\$\//);
console.log("[verify:withdraw-origin-normalization] PASS");
