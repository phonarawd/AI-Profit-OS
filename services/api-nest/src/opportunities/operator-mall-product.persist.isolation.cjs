"use strict";

const assert = require("node:assert/strict");
const persist = require("./operator-mall-product.persist.cjs");
const core = require("./operator-mall-product.core.cjs");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const OP = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function spec(extra) {
  return Object.assign(
    {
      operatorId: OP,
      name: "card-2",
      description: "two",
      photos: ["https://cdn.example/p.jpg"],
      compositionQty: 2,
      payoutAmount: "12.5",
      currency: "USDT",
      visibility: core.VISIBILITY.ALL_PUBLIC,
      priceConfirmationMemo: "확인: 12.5 USDT",
    },
    extra || {},
  );
}

async function check(name, fn, fails) {
  try {
    await fn();
    console.log("  PASS " + name);
  } catch (e) {
    fails.push(name + ": " + e.message);
    console.error("  FAIL " + name + ": " + e.message);
  }
}

async function main() {
  const fails = [];

  await check("ops_write_blocked", async () => {
    assert.equal(
      persist.allowsMallPersistWrite({
        catalogTestDatabaseUrl: "postgres://x@localhost/qa",
        supabaseProjectRef: persist.PRODUCTION_SUPABASE_REF,
      }),
      false,
    );
    assert.equal(
      persist.allowsMallPersistWrite({
        catalogTestDatabaseUrl:
          "postgres://x@db." + persist.PRODUCTION_SUPABASE_REF + ".supabase.co/postgres",
      }),
      false,
    );
    assert.equal(persist.allowsMallPersistWrite({}), false);
    assert.equal(
      persist.allowsMallPersistWrite({
        catalogTestDatabaseUrl: "postgres://x@127.0.0.1:5432/catalog_qa",
      }),
      true,
    );
  }, fails);

  await check("unready_not_success", async () => {
    const db = persist.createFakePersistMallDb({ schemaReady: false });
    const store = await persist.createPersistMallStore(db, {
      members: [{ userId: A, cap: 5 }],
      testOnly: true,
    });
    assert.equal(store.ready, false);
    const r = await core.registerProduct(spec(), { store });
    assert.equal(r.applied, false);
    assert.equal(r.code, "STORE_UNREADY");
    assert.equal(r.ok, false);
  }, fails);

  await check("persist_restart_visibility_memo", async () => {
    const db = persist.createFakePersistMallDb({
      schemaReady: true,
      oppMallReady: true,
      members: [
        { userId: A, cap: 5 },
        { userId: B, cap: 5 },
        { userId: C, cap: 5 },
      ],
    });
    const store1 = await persist.createPersistMallStore(db, {
      members: [
        { userId: A, cap: 5 },
        { userId: B, cap: 5 },
        { userId: C, cap: 5 },
      ],
      testOnly: true,
      poolBalance: "1000",
    });
    assert.equal(store1.ready, true);
    const created = await core.registerProduct(spec(), { store: store1 });
    assert.equal(created.ok && created.applied, true);
    assert.equal(created.product.priceConfirmationMemo, "확인: 12.5 USDT");

    const store2 = await persist.createPersistMallStore(db, {
      members: [
        { userId: A, cap: 5 },
        { userId: B, cap: 5 },
        { userId: C, cap: 5 },
      ],
      testOnly: true,
      poolBalance: "1000",
    });
    const again = await store2.getProduct(created.product.id);
    assert.equal(again.visibility, "all_public");
    assert.equal(again.priceConfirmationMemo, "확인: 12.5 USDT");
    assert.equal(again.payoutAmount, "12.5");
    assert.ok(db.state.opportunities.get(created.product.id));
  }, fails);

  await check("selected_c_after_persist", async () => {
    const db = persist.createFakePersistMallDb({
      schemaReady: true,
      members: [
        { userId: A, cap: 5 },
        { userId: B, cap: 5 },
        { userId: C, cap: 5 },
      ],
    });
    const store = await persist.createPersistMallStore(db, {
      members: [
        { userId: A, cap: 5 },
        { userId: B, cap: 5 },
        { userId: C, cap: 5 },
      ],
      testOnly: true,
    });
    const p = (
      await core.registerProduct(
        spec({
          visibility: core.VISIBILITY.SELECTED_MEMBERS,
          selectedMemberIds: [A, B],
        }),
        { store },
      )
    ).product;
    assert.equal((await core.listForUser(C, { store })).items.length, 0);
    assert.equal((await core.participate({ userId: C, productId: p.id, idempotencyKey: "c" }, { store })).httpStatus, 404);
    const pa = await core.participate({ userId: A, productId: p.id, idempotencyKey: "a" }, { store });
    const pb = await core.participate({ userId: B, productId: p.id, idempotencyKey: "b" }, { store });
    assert.equal(pa.ok && pb.ok, true);
  }, fails);

  await check("cap0_does_not_block_b", async () => {
    const db = persist.createFakePersistMallDb({
      schemaReady: true,
      members: [
        { userId: A, cap: 0 },
        { userId: B, cap: 5 },
      ],
    });
    const store = await persist.createPersistMallStore(db, {
      members: [
        { userId: A, cap: 0 },
        { userId: B, cap: 5 },
      ],
      testOnly: true,
    });
    const p = (await core.registerProduct(spec(), { store })).product;
    assert.equal(
      (await core.participate({ userId: A, productId: p.id, idempotencyKey: "ac" }, { store })).code,
      "DAILY_MATCH_CAP",
    );
    assert.equal(
      (await core.participate({ userId: B, productId: p.id, idempotencyKey: "bo" }, { store })).ok,
      true,
    );
  }, fails);

  await check("payout_unique_and_authority", async () => {
    const db = persist.createFakePersistMallDb({
      schemaReady: true,
      members: [{ userId: A, cap: 5 }],
    });
    const store = await persist.createPersistMallStore(db, {
      members: [{ userId: A, cap: 5 }],
      testOnly: true,
      poolBalance: "1000",
    });
    const p = (await core.registerProduct(spec(), { store })).product;
    const pa = await core.participate({ userId: A, productId: p.id, idempotencyKey: "pay" }, { store });
    assert.equal(pa.moneyAuthority.payoutAuthoritative, false);
    const first = await core.applyMatchSuccessPayout(
      { participationId: pa.participation.id },
      { store, evaluator: core.createMatchSuccessEvaluator() },
    );
    const second = await core.applyMatchSuccessPayout(
      { participationId: pa.participation.id },
      { store, evaluator: core.createMatchSuccessEvaluator() },
    );
    assert.equal(first.applied, true);
    assert.equal(first.moneyAuthority.payoutAuthoritative, true);
    assert.equal(second.replay, true);
    const found = await store.findJournal(persist.settlementKey(pa.participation.id));
    assert.ok(found && found.id);
    const listed = await core.listPayoutsForUser(A, { store });
    assert.equal(listed.items.length, 1);
  }, fails);

  await check("draft_not_in_supabase_migrations", async () => {
    assert.equal(persist.draftSqlPath().includes("quality/migrations-draft"), true);
    assert.equal(persist.draftSqlPath().includes("supabase/migrations"), false);
  }, fails);

  console.log("[operator-mall-product.persist.isolation] scope=fake_persist real_pg=BLOCKED");
  if (fails.length) {
    console.error("[operator-mall-product.persist.isolation] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[operator-mall-product.persist.isolation] PASS");
}

main();
