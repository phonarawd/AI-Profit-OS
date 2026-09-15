"use strict";

const assert = require("node:assert/strict");
const persist = require("./reseller-id.persist.cjs");
const core = require("./reseller-id.core.cjs");

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

async function main() {
  assert.equal(
    persist.allowsResellerBackfillWrite({
      ensureFlag: "1",
      supabaseProjectRef: "mgsytcetsiecllmhcyox",
    }),
    false,
  );
  assert.equal(persist.allowsResellerBackfillWrite({ ensureFlag: "1" }), true);
  assert.equal(persist.allowsResellerBackfillWrite({}), false);

  const unready = persist.createFakeResellerPersistDb({ schemaReady: false });
  const blocked = await persist.lookupResellerId(unready, U1);
  assert.equal(blocked.code, "STORE_UNREADY");
  assert.equal(blocked.applied, false);

  const db = persist.createFakeResellerPersistDb({
    schemaReady: true,
    users: [
      { userId: U1, referralCode: "AAAA1111" },
      { userId: U2, referralCode: null },
    ],
  });
  const found = await persist.lookupResellerId(db, U1);
  assert.equal(found.resellerId, "AAAA1111");
  assert.equal(found.applied, false);
  core.assertResellerIdNotAuthToken("display");

  const missing = await persist.lookupResellerId(db, U2);
  assert.equal(missing.resellerId, null);

  const ops = await persist.issueIfAbsentIsolated(db, U2, () => "BBBB2222", {
    ensureFlag: "1",
    supabaseProjectRef: "mgsytcetsiecllmhcyox",
  });
  assert.equal(ops.code, "BACKFILL_BLOCKED");
  assert.equal(ops.applied, false);

  const isolated = await persist.issueIfAbsentIsolated(db, U2, () => "BBBB2222", {
    ensureFlag: "1",
  });
  assert.equal(isolated.applied, true);
  assert.equal(isolated.resellerId, "BBBB2222");
  const again = await persist.issueIfAbsentIsolated(db, U2, () => "ZZZZ9999", {
    ensureFlag: "1",
  });
  assert.equal(again.reused, true);
  assert.equal(again.resellerId, "BBBB2222");

  const collideDb = persist.createFakeResellerPersistDb({
    schemaReady: true,
    users: [
      { userId: U1, referralCode: "AAAA1111" },
      { userId: U2, referralCode: null },
    ],
  });
  const collided = await persist.issueIfAbsentIsolated(collideDb, U2, () => "AAAA1111", {
    ensureFlag: "1",
  });
  assert.notEqual(collided.resellerId, "AAAA1111");
  const stillMissing = await persist.lookupResellerId(collideDb, U2);
  assert.equal(stillMissing.resellerId, null);
  const owner = await persist.lookupResellerId(collideDb, U1);
  assert.equal(owner.resellerId, "AAAA1111");

  const plan = core.draftBackfillPlan();
  assert.equal(plan.applied, false);
  assert.equal(persist.draftBackfillPath().includes("quality/migrations-draft"), true);
  console.log("[reseller-id.persist.isolation] PASS (lookup/unique · ops backfill blocked)");
}

main().catch((e) => {
  console.error("[reseller-id.persist.isolation] FAIL", e);
  process.exit(1);
});
