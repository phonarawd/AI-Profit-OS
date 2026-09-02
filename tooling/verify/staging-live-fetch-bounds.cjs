"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const r600 = fs.readFileSync("tooling/verify/rel-600-staging.cjs", "utf8");
const r601 = fs.readFileSync("tooling/verify/rel-601-staging-regression.cjs", "utf8");
const r602 = fs.readFileSync("tooling/verify/rel-602-staging-rollback.cjs", "utf8");

for (const src of [r600, r601]) {
  assert.match(src, /AbortSignal\.timeout\(LIVE_FETCH_TIMEOUT_MS\)/);
  assert.match(src, /LIVE_FETCH_ATTEMPTS = 3/);
  assert.match(src, /LIVE_FETCH_RETRY_DELAY_MS = 750/);
}
assert.match(r600, /fetchTransientSafe\(url,/);
assert.doesNotMatch(r600, /async function live\(url, ok\) \{\s*const res = await fetch\(/);
assert.match(r602, /run\.error && run\.error\.code === "ETIMEDOUT"/);
assert.match(r602, /live fetch error\(\?: after bounded retries\)\?/);

console.log("[verify:staging-live-fetch-bounds] PASS (STATUS_RULES_UNCHANGED · TRANSPORT_TIMEOUT_BOUNDED · RETRY_BOUNDED)");
