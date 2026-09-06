import test from "node:test";
import assert from "node:assert/strict";
import {
  assertManualAssignDoesNotMutateMoney,
  evaluateMatchingPolicy,
  filterVisibleOpportunities,
  planBulkApply,
  platformDefaultLayer,
  previewPolicyChange,
  snapshotDoesNotRewrite,
  type MatchingPolicyLayer,
  type MatchingUserContext,
  type OpportunityCandidate,
} from "./matching-policy.engine.ts";

function layer(
  partial: Partial<MatchingPolicyLayer> & Pick<MatchingPolicyLayer, "source" | "policyId" | "version">,
): MatchingPolicyLayer {
  return { ...platformDefaultLayer(), ...partial };
}

function ctx(partial: Partial<MatchingUserContext> = {}): MatchingUserContext {
  return {
    userId: "user-a",
    platformHardStop: false,
    accountBlocked: false,
    riskBlocked: false,
    activeTradeCount: 0,
    dailyParticipateCount: 0,
    dailyParticipateAmountUsdt: "0",
    nowMs: 1_700_000_000_000,
    ...partial,
  };
}

function opp(
  id: string,
  requiredCapitalUsdt: string,
  extra: Partial<OpportunityCandidate> = {},
): OpportunityCandidate {
  return {
    id,
    requiredCapitalUsdt,
    category: "electronics",
    brand: "acme",
    model: "x1",
    condition: "new",
    provider: "ebay",
    marketplace: "ebay_us",
    country: "US",
    currency: "USD",
    status: "available",
    published: true,
    expired: false,
    identityConfirmed: true,
    amountValid: true,
    ...extra,
  };
}

const policyA = layer({
  source: "user",
  policyId: "pol-a",
  version: 1,
  visibilityMinUsdt: "10",
  visibilityMaxUsdt: "50",
  allowCategories: ["electronics"],
  maxConcurrentTrades: 1,
  autoMatchAllowed: true,
});

const policyB = layer({
  source: "user",
  policyId: "pol-b",
  version: 1,
  visibilityMinUsdt: "100",
  visibilityMaxUsdt: "500",
  allowCategories: ["electronics", "fashion"],
  maxConcurrentTrades: 3,
  autoMatchAllowed: false,
  manualAssignOnly: true,
});

const catalog = [
  opp("o-9", "9"),
  opp("o-10", "10"),
  opp("o-50", "50"),
  opp("o-51", "51"),
  opp("o-99", "99"),
  opp("o-100", "100"),
  opp("o-500", "500"),
  opp("o-501", "501"),
  opp("o-fashion-120", "120", { category: "fashion" }),
  opp("o-watch-20", "20", { category: "watch" }),
];

test("1 A sees only 10-50 USDT", () => {
  const ids = filterVisibleOpportunities(catalog, [policyA], ctx()).map((c) => c.id);
  assert.deepEqual(ids.sort(), ["o-10", "o-50", "o-watch-20"].sort().filter((id) => {
    const row = catalog.find((c) => c.id === id);
    return row && row.category === "electronics" && ["o-10", "o-50"].includes(id);
  }));
  assert.ok(ids.includes("o-10"));
  assert.ok(ids.includes("o-50"));
  assert.equal(ids.includes("o-9"), false);
  assert.equal(ids.includes("o-51"), false);
  assert.equal(ids.includes("o-100"), false);
});

test("2 B sees only 100-500 USDT", () => {
  const ids = filterVisibleOpportunities(catalog, [policyB], ctx({ userId: "user-b" })).map(
    (c) => c.id,
  );
  assert.ok(ids.includes("o-100"));
  assert.ok(ids.includes("o-500"));
  assert.ok(ids.includes("o-fashion-120"));
  assert.equal(ids.includes("o-50"), false);
  assert.equal(ids.includes("o-501"), false);
});

test("3 range boundaries 10 50 100 500 are inclusive", () => {
  assert.equal(
    evaluateMatchingPolicy({ candidate: opp("b10", "10"), layers: [policyA], ctx: ctx() }).visible,
    true,
  );
  assert.equal(
    evaluateMatchingPolicy({ candidate: opp("b50", "50"), layers: [policyA], ctx: ctx() }).visible,
    true,
  );
  assert.equal(
    evaluateMatchingPolicy({
      candidate: opp("b100", "100"),
      layers: [policyB],
      ctx: ctx({ userId: "user-b" }),
    }).visible,
    true,
  );
  assert.equal(
    evaluateMatchingPolicy({
      candidate: opp("b500", "500"),
      layers: [policyB],
      ctx: ctx({ userId: "user-b" }),
    }).visible,
    true,
  );
});

test("4 5 out-of-range direct URL and participate are denied", () => {
  const d = evaluateMatchingPolicy({
    candidate: opp("o-100", "100"),
    layers: [policyA],
    ctx: ctx(),
  });
  assert.equal(d.visible, false);
  assert.equal(d.participable, false);
  assert.equal(d.reasonCode, "visibility_range");
});

test("6 list search detail AI use the same evaluate", () => {
  const one = evaluateMatchingPolicy({
    candidate: opp("o-10", "10"),
    layers: [policyA],
    ctx: ctx(),
  });
  const again = evaluateMatchingPolicy({
    candidate: opp("o-10", "10"),
    layers: [policyA],
    ctx: ctx(),
  });
  assert.deepEqual(one, again);
});

test("7 8 manual assign is per-user and does not leak", () => {
  const assigned = layer({
    ...policyA,
    includeOpportunityIds: ["secret-1"],
    allowCategories: ["electronics"],
  });
  const secret = opp("secret-1", "20", { category: "watch" });
  assert.equal(
    evaluateMatchingPolicy({ candidate: secret, layers: [assigned], ctx: ctx() }).visible,
    true,
  );
  assert.equal(
    evaluateMatchingPolicy({
      candidate: secret,
      layers: [policyB],
      ctx: ctx({ userId: "user-b" }),
    }).visible,
    false,
  );
});

test("9 excluded opportunity does not reappear", () => {
  const excluded = layer({
    ...policyA,
    excludeOpportunityIds: ["o-10"],
  });
  assert.equal(
    evaluateMatchingPolicy({ candidate: opp("o-10", "10"), layers: [excluded], ctx: ctx() })
      .visible,
    false,
  );
});

test("10 policy change applies to the next request", () => {
  const before = evaluateMatchingPolicy({
    candidate: opp("o-100", "100"),
    layers: [policyA],
    ctx: ctx(),
  });
  const after = evaluateMatchingPolicy({
    candidate: opp("o-100", "100"),
    layers: [policyB],
    ctx: ctx(),
  });
  assert.equal(before.visible, false);
  assert.equal(after.visible, true);
});

test("11 snapshot amounts are not rewritten by a new policy", () => {
  assert.equal(
    snapshotDoesNotRewrite(
      { requiredCapitalUsdt: "10", expectedProfitUsdt: "2" },
      { requiredCapitalUsdt: "10", expectedProfitUsdt: "2" },
    ),
    true,
  );
  assert.equal(
    snapshotDoesNotRewrite(
      { requiredCapitalUsdt: "10", expectedProfitUsdt: "2" },
      { requiredCapitalUsdt: "11", expectedProfitUsdt: "2" },
    ),
    false,
  );
});

test("12 paused user cannot open a new trade", () => {
  const paused = layer({ ...policyA, matchingPaused: true });
  const d = evaluateMatchingPolicy({
    candidate: opp("o-10", "10"),
    layers: [paused],
    ctx: ctx(),
  });
  assert.equal(d.visible, false);
  assert.equal(d.participable, false);
  assert.equal(d.reasonCode, "matching_paused");
});

test("13 expired layer falls back to platform default", () => {
  const expired = layer({
    ...policyA,
    effectiveUntilMs: 1_699_000_000_000,
  });
  const d = evaluateMatchingPolicy({
    candidate: opp("o-100", "100"),
    layers: [expired],
    ctx: ctx({ nowMs: 1_700_000_000_000 }),
  });
  assert.equal(d.visible, true);
  assert.equal(d.policyId, "platform-default");
});

test("14 bulk dry-run count must match apply count", () => {
  const bad = planBulkApply({
    dryRunTargetCount: 3,
    applyTargetCount: 4,
    requestId: "req-1",
    seenRequestId: null,
    currentVersion: 1,
  });
  assert.equal(bad.ok, false);
  const good = planBulkApply({
    dryRunTargetCount: 3,
    applyTargetCount: 3,
    requestId: "req-1",
    seenRequestId: null,
    currentVersion: 1,
  });
  assert.equal(good.ok, true);
  if (good.ok) assert.equal(good.version, 2);
});

test("15 same request id does not bump the policy version", () => {
  const again = planBulkApply({
    dryRunTargetCount: 2,
    applyTargetCount: 2,
    requestId: "req-1",
    seenRequestId: "req-1",
    currentVersion: 4,
  });
  assert.equal(again.ok, true);
  if (again.ok) {
    assert.equal(again.duplicate, true);
    assert.equal(again.version, 4);
  }
});

test("18 client-supplied policy is ignored", () => {
  const d = evaluateMatchingPolicy({
    candidate: opp("o-100", "100"),
    layers: [policyA],
    ctx: ctx(),
    clientPolicy: { visibilityMinUsdt: "1", visibilityMaxUsdt: "1000" },
  });
  assert.equal(d.visible, false);
});

test("assign cannot change money fields", () => {
  assert.equal(
    assertManualAssignDoesNotMutateMoney({ opportunityId: "o-1", reason: "show" }).ok,
    true,
  );
  assert.equal(
    assertManualAssignDoesNotMutateMoney({ requiredCapitalUsdt: "1" }).ok,
    false,
  );
  assert.equal(assertManualAssignDoesNotMutateMoney({ journal: {} }).ok, false);
});

test("preview counts added and removed ids", () => {
  const preview = previewPolicyChange({
    beforeLayers: [policyA],
    afterLayers: [policyB],
    candidates: catalog,
    ctx: ctx(),
  });
  assert.ok(preview.beforeCount >= 1);
  assert.ok(preview.removedIds.includes("o-10"));
  assert.ok(preview.addedIds.includes("o-100"));
});

test("missing policy is platform default only, not unlimited leak", () => {
  const unpublished = opp("ghost", "10", { published: false });
  const d = evaluateMatchingPolicy({
    candidate: unpublished,
    layers: [],
    ctx: ctx(),
  });
  assert.equal(d.visible, false);
  assert.equal(d.reasonCode, "platform_default_reject");
});
