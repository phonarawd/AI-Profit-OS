"use strict";

/**
 * Coach SSE error projection must be a constant code.
 * Raw exception messages (user text / Nest internals) must not reach the wire.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const ctrl = fs.readFileSync(
  path.join(root, "services/api-nest/src/ai/coach.controller.ts"),
  "utf8",
);

assert.match(ctrl, /text\/event-stream/);
assert.match(ctrl, /JSON\.stringify\(\{\s*message:\s*"coach_error"\s*\}\)/);
assert.doesNotMatch(
  ctrl,
  /catch\s*\([^)]*\)\s*\{[\s\S]*e\.message/,
);
assert.doesNotMatch(
  ctrl,
  /const message = e instanceof Error \? e\.message/,
);

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
assert.match(pkg, /verify:coach-sse-error-canonical/);

console.log(
  "[verify:coach-sse-error-canonical] PASS (SSE error is constant coach_error)",
);
