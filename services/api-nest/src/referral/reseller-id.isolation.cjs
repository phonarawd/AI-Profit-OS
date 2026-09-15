"use strict";

const assert = require("node:assert/strict");
const core = require("./reseller-id.core.cjs");

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

function seqMint(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

async function main() {
  const taken = new Set();
  const first = core.issueResellerIdOnSignup({ mint: seqMint(["AAAA1111", "BBBB2222"]), taken });
  assert.equal(first.resellerId, "AAAA1111");
  const retry = core.issueResellerIdOnSignup({ existing: first.resellerId, mint: seqMint(["ZZZZ9999"]), taken });
  assert.equal(retry.reused, true);
  assert.equal(retry.resellerId, "AAAA1111");
  const collide = core.issueResellerIdOnSignup({
    mint: seqMint(["AAAA1111", "CCCC3333"]),
    taken,
  });
  assert.equal(collide.resellerId, "CCCC3333");

  const store = core.createMemoryResellerStore([{ userId: U1, resellerId: "AAAA1111" }]);
  const keep = await store.putIfAbsent(U1, "NEWID000");
  assert.equal(keep, "AAAA1111");
  try {
    await store.putIfAbsent(U2, "AAAA1111");
    assert.fail("expected unique");
  } catch (e) {
    assert.equal(core.classifyUniqueAsReseller(e), true);
  }
  assert.throws(() => core.assertResellerIdNotAuthToken("jwt"), /not an auth token/);
  const plan = core.draftBackfillPlan();
  assert.equal(plan.applied, false);
  assert.equal(plan.opsDb, false);
  const proj = core.asResellerId("AAAA1111");
  assert.equal(proj.resellerId, "AAAA1111");
  console.log("[reseller-id.isolation] PASS (memory unique/retry · ops backfill not applied)");
}

main().catch((e) => {
  console.error("[reseller-id.isolation] FAIL", e);
  process.exit(1);
});
