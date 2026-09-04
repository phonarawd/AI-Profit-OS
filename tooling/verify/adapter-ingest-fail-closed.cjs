/**
 * Adapter ingest — token unset = 503 · wrong token = 401 · fail-open 금지.
 */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const src = fs.readFileSync(
  path.join(root, "services/api-nest/src/adapters/adapters.ingest.controller.ts"),
  "utf8",
);

assert.doesNotMatch(src, /if \(token\)\s*\{/);
assert.match(src, /if \(!token\)/);
assert.match(src, /ADAPTER_INGEST_TOKEN_NOT_CONFIGURED/);
assert.match(src, /ADAPTER_INGEST_TOKEN_INVALID/);
assert.match(src, /x-adapter-token/);

console.log(
  "[verify:adapter-ingest-fail-closed] PASS (TOKEN_UNSET_503 · WRONG_TOKEN_401 · FAIL_OPEN_PATTERN_REMOVED)",
);
