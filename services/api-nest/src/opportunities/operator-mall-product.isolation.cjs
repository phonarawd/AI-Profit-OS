"use strict";

const assert = require("node:assert/strict");
const core = require("./operator-mall-product.core.cjs");

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const OP = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function mem(members, pool) {
  return core.createMemoryMallStore({ members, poolBalance: pool || "1000" });
}

function spec(extra) {
  return Object.assign({
    operatorId: OP,
    name: "card-2",
    description: "two",
    photos: ["https://cdn.example/p.jpg"],
    compositionQty: 2,
    payoutAmount: "12.5",
    currency: "USDT",
    visibility: core.VISIBILITY.ALL_PUBLIC,
    priceConfirmationMemo: "확인: 12.5 USDT",
    idempotencyKey: extra && extra.idempotencyKey ? extra.idempotencyKey : "reg-default",
  }, extra || {});
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

  await check("unready", async () => {
    const r = await core.registerProduct(spec(), { store: core.createUnreadyMallStore() });
    assert.equal(r.applied, false);
    assert.equal(r.code, "STORE_UNREADY");
  }, fails);

  await check("neg_and_auth", async () => {
    const store = mem([{ userId: A, cap: 5 }]);
    assert.equal((await core.registerProduct(spec({ payoutAmount: "-1" }), { store })).code, "INVALID_AMOUNT");
    assert.equal((await core.registerProduct(spec({ unauthenticated: true }), { store })).code, "ADMIN_AUTH_REQUIRED");
    assert.equal((await core.registerProduct(spec({ actorKind: "ai_tool", name: "ai" }), { store })).ok, true);
  }, fails);

  await check("ab_together", async () => {
    const store = mem([{ userId: A, cap: 5 }, { userId: B, cap: 5 }]);
    const p = (await core.registerProduct(spec(), { store })).product;
    const pa = await core.participate({ userId: A, productId: p.id, idempotencyKey: "a1" }, { store });
    const pb = await core.participate({ userId: B, productId: p.id, idempotencyKey: "b1" }, { store });
    assert.equal(pa.ok && pb.ok, true);
    assert.notEqual(pa.participation.id, pb.participation.id);
  }, fails);

  await check("cap0_a", async () => {
    const store = mem([{ userId: A, cap: 0 }, { userId: B, cap: 5 }]);
    const p = (await core.registerProduct(spec(), { store })).product;
    const pa = await core.participate({ userId: A, productId: p.id, idempotencyKey: "ac" }, { store });
    const pb = await core.participate({ userId: B, productId: p.id, idempotencyKey: "bo" }, { store });
    assert.equal(pa.code, "DAILY_MATCH_CAP");
    assert.equal(pb.ok, true);
  }, fails);

  await check("selected_c", async () => {
    const store = mem([{ userId: A, cap: 5 }, { userId: B, cap: 5 }, { userId: C, cap: 5 }]);
    const p = (await core.registerProduct(spec({
      visibility: core.VISIBILITY.SELECTED_MEMBERS,
      selectedMemberIds: [A, B],
    }), { store })).product;
    assert.equal((await core.listForUser(C, { store })).items.length, 0);
    assert.equal((await core.getForUser(C, p.id, { store })).httpStatus, 404);
    assert.equal((await core.participate({ userId: C, productId: p.id, idempotencyKey: "c" }, { store })).httpStatus, 404);
    assert.equal((await core.participate({ userId: A, productId: p.id, idempotencyKey: "as" }, { store })).ok, true);
  }, fails);

  await check("idem", async () => {
    const store = mem([{ userId: A, cap: 5 }, { userId: B, cap: 5 }]);
    const p = (await core.registerProduct(spec(), { store })).product;
    const first = await core.participate({ userId: A, productId: p.id, idempotencyKey: "dup" }, { store });
    const replay = await core.participate({ userId: A, productId: p.id, idempotencyKey: "dup" }, { store });
    const other = await core.participate({ userId: B, productId: p.id, idempotencyKey: "dup" }, { store });
    assert.equal(first.applied, true);
    assert.equal(replay.replay, true);
    assert.notEqual(other.participation.id, first.participation.id);
  }, fails);

  await check("no_cross", async () => {
    const store = mem([{ userId: A, cap: 5 }, { userId: B, cap: 5 }]);
    const p = (await core.registerProduct(spec(), { store })).product;
    const pa = await core.participate({ userId: A, productId: p.id, idempotencyKey: "pa" }, { store });
    const pb = await core.participate({ userId: B, productId: p.id, idempotencyKey: "pb" }, { store });
    const pay = await core.applyMatchSuccessPayout({ participationId: pa.participation.id }, {
      store, evaluator: core.createMatchSuccessEvaluator(),
    });
    assert.equal(pay.payoutStatus, "paid");
    assert.equal((await store.getParticipation(pb.participation.id)).payoutStatus, "pending");
  }, fails);

  await check("snapshot_private", async () => {
    const store = mem([{ userId: A, cap: 5 }]);
    const p = (await core.registerProduct(spec({ payoutAmount: "10" }), { store })).product;
    const pa = await core.participate({ userId: A, productId: p.id, idempotencyKey: "s" }, { store });
    await core.updateProduct(p.id, {
      operatorId: OP,
      payoutAmount: "99",
      visibility: core.VISIBILITY.PRIVATE,
      expectedRevision: p.revision,
    }, { store });
    assert.equal((await store.getParticipation(pa.participation.id)).snapshot.payoutAmount, "10");
    assert.equal((await core.listForUser(A, { store })).items.length, 0);
  }, fails);

  await check("tamper_replay", async () => {
    const store = mem([{ userId: A, cap: 5 }]);
    const p = (await core.registerProduct(spec(), { store })).product;
    assert.equal((await core.participate({
      userId: A, productId: p.id, idempotencyKey: "t1", payoutAmount: "999",
    }, { store })).code, "PAYOUT_AMOUNT_TAMPER");
    const ok = await core.participate({ userId: A, productId: p.id, idempotencyKey: "t2" }, { store });
    assert.equal((await core.applyMatchSuccessPayout({
      participationId: ok.participation.id, clientResultCode: "MATCH_SUCCESS",
    }, { store, evaluator: core.createMatchSuccessEvaluator() })).code, "CLIENT_RESULT_REJECTED");
    const first = await core.applyMatchSuccessPayout({ participationId: ok.participation.id }, {
      store, evaluator: core.createMatchSuccessEvaluator(),
    });
    const second = await core.applyMatchSuccessPayout({ participationId: ok.participation.id }, {
      store, evaluator: core.createMatchSuccessEvaluator(),
    });
    assert.equal(first.applied, true);
    assert.equal(second.replay, true);
  }, fails);

  await check("blocked_eval", async () => {
    const store = mem([{ userId: A, cap: 5 }]);
    const p = (await core.registerProduct(spec(), { store })).product;
    const pa = await core.participate({ userId: A, productId: p.id, idempotencyKey: "n" }, { store });
    assert.equal((await core.applyMatchSuccessPayout({ participationId: pa.participation.id }, { store })).code, "PAYOUT_CONDITION_UNAPPROVED");
  }, fails);

  await check("poor_pool", async () => {
    const store = mem([{ userId: A, cap: 5 }], "1");
    const p = (await core.registerProduct(spec({ payoutAmount: "50" }), { store })).product;
    const pa = await core.participate({ userId: A, productId: p.id, idempotencyKey: "poor" }, { store });
    assert.equal((await core.applyMatchSuccessPayout({ participationId: pa.participation.id }, {
      store, evaluator: core.createMatchSuccessEvaluator(),
    })).code, "INSUFFICIENT_SOURCE");
    assert.equal((await core.listPayoutsForUser(A, { store })).items.length, 0);
  }, fails);

  await check("slots_per_member_not_stock", async () => {
    const rows = [
      { opportunityId: "p1", userId: A, status: "running" },
      { opportunityId: "p1", userId: A, status: "requeue" },
      { opportunityId: "p1", userId: B, status: "running" },
    ];
    assert.equal(core.countMemberInFlight(rows, "p1", A), 2);
    assert.equal(core.countMemberInFlight(rows, "p1", B), 1);
    assert.equal(core.countMemberInFlight(rows, "p1", C), 0);
  }, fails);

  await check("price_memo_not_payout", async () => {
    const store = mem([{ userId: A, cap: 5 }]);
    const p = (await core.registerProduct(spec(), { store })).product;
    assert.equal(p.priceConfirmationMemo, "확인: 12.5 USDT");
    assert.equal(p.payoutAmount, "12.5");
    const pub = (await core.getForUser(A, p.id, { store })).product;
    assert.equal(pub.moneyAuthority.configuredPayoutUsdt, "12.5");
    assert.equal(Object.prototype.hasOwnProperty.call(pub, "priceConfirmationMemo"), false);
  }, fails);

  await check("register_idem_and_revision_409", async () => {
    const store = mem([{ userId: A, cap: 5 }]);
    const first = await core.registerProduct(spec({ idempotencyKey: "same-reg" }), { store });
    const replay = await core.registerProduct(spec({
      idempotencyKey: "same-reg",
      name: "other-name",
    }), { store });
    assert.equal(first.applied, true);
    assert.equal(replay.replay, true);
    assert.equal(replay.product.id, first.product.id);
    assert.equal(replay.product.name, first.product.name);
    const listed = await core.adminListProducts({ operatorId: OP, limit: 10 }, { store });
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].revision, 1);
    const one = await core.adminGetProduct(first.product.id, { operatorId: OP }, { store });
    assert.equal(one.product.revision, 1);
    const stale = await core.updateProduct(first.product.id, {
      operatorId: OP,
      name: "stale",
      expectedRevision: 99,
    }, { store });
    assert.equal(stale.httpStatus, 409);
    assert.equal(stale.code, "REVISION_CONFLICT");
    const after = await core.adminGetProduct(first.product.id, { operatorId: OP }, { store });
    assert.equal(after.product.name, first.product.name);
    const ok = await core.updateProduct(first.product.id, {
      operatorId: OP,
      name: "renamed",
      expectedRevision: 1,
    }, { store });
    assert.equal(ok.applied, true);
    assert.equal(ok.product.revision, 2);
  }, fails);

  await check("money_not_authority_until_journal", async () => {
    const store = mem([{ userId: A, cap: 5 }]);
    const p = (await core.registerProduct(spec(), { store })).product;
    const pa = await core.participate({ userId: A, productId: p.id, idempotencyKey: "ma" }, { store });
    assert.equal(pa.moneyAuthority.payoutAuthoritative, false);
    assert.equal(pa.moneyAuthority.configuredPayoutUsdt, "12.5");
    const pay = await core.applyMatchSuccessPayout({ participationId: pa.participation.id }, {
      store, evaluator: core.createMatchSuccessEvaluator(),
    });
    assert.equal(pay.moneyAuthority.payoutAuthoritative, true);
    assert.equal(pay.moneyAuthority.ledgerPaidUsdt, "12.5");
  }, fails);

  console.log("[operator-mall-product.isolation] scope=in_process_memory real_pg_concurrency=BLOCKED");
  if (fails.length) {
    console.error("[operator-mall-product.isolation] FAIL\n- " + fails.join("\n- "));
    process.exit(1);
  }
  console.log("[operator-mall-product.isolation] PASS");
}

main();
