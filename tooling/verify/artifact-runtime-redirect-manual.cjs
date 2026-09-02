"use strict";

const assert = require("node:assert/strict");
const { runRuntimeQa } = require("../release/artifact-runtime-qa.cjs");

async function main() {
  let seenInit = null;
  let stopped = false;

  const runtime = await runRuntimeQa({
    digest: "a".repeat(64),
    extractRoot: process.cwd(),
    surfaces: [
      {
        id: "ops",
        kind: "opennext",
        route: "/",
        accept: [200, 301, 302, 307, 308],
      },
    ],
    startWorker: async () => ({
      harness: "redirect-manual-test",
      fetch: async (_input, init) => {
        seenInit = init;
        return new Response(null, {
          status: 307,
          headers: { Location: "/admin" },
        });
      },
      stop: async () => {
        stopped = true;
      },
    }),
  });

  assert.equal(seenInit?.redirect, "manual");
  assert.equal(runtime.verified, true);
  assert.equal(runtime.surfaces.length, 1);
  assert.equal(runtime.surfaces[0].status, 307);
  assert.equal(runtime.surfaces[0].reason, "pass");
  assert.equal(stopped, true);

  console.log(
    "[verify:artifact-runtime-redirect-manual] PASS (OPS_307_LOCAL · NO_REDIRECT_FOLLOW)",
  );
}

main().catch((err) => {
  console.error("[verify:artifact-runtime-redirect-manual] FAIL");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
