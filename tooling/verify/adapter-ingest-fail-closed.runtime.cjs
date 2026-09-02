/**
 * Adapter ingest runtime — unset/wrong token never reaches ingest().
 */
"use strict";

const assert = require("node:assert/strict");
const {
  AdaptersIngestController,
} = require("../../services/api-nest/dist/adapters/adapters.ingest.controller.js");

async function main() {
  let calls = 0;
  const service = {
    async ingest(body) {
      calls += 1;
      return { ok: true, adapterId: body.adapterId, accepted: 0 };
    },
  };
  const controller = new AdaptersIngestController(service);
  const body = { adapterId: "ebay", dryRun: true };

  delete process.env["ADAPTER_INGEST_TOKEN"];
  assert.throws(
    () => controller.ingest(body, { headers: {} }),
    (err) => err && err.getStatus && err.getStatus() === 503,
  );
  assert.equal(calls, 0);

  process.env["ADAPTER_INGEST_TOKEN"] = "change_me_adapter_ingest_runtime";
  assert.throws(
    () => controller.ingest(body, { headers: {} }),
    (err) => err && err.getStatus && err.getStatus() === 401,
  );
  assert.throws(
    () =>
      controller.ingest(body, {
        headers: { "x-adapter-token": "wrong" },
      }),
    (err) => err && err.getStatus && err.getStatus() === 401,
  );
  assert.equal(calls, 0);

  const result = await controller.ingest(body, {
    headers: { "x-adapter-token": "change_me_adapter_ingest_runtime" },
  });
  assert.equal(result.ok, true);
  assert.equal(calls, 1);

  console.log(
    "[verify:adapter-ingest-runtime] PASS (UNSET_BLOCKED · WRONG_BLOCKED · CORRECT_ACCEPTED)",
  );
}

main().catch((err) => {
  // codeql[js/log-injection]: message-only verifier failure path
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
