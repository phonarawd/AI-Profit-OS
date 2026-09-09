import assert from "node:assert/strict";
import { test } from "node:test";
import { planAuthoritativePayout } from "./authoritative-success.ts";

test("compareReady rule success does not pay without an event", () => {
  const plan = planAuthoritativePayout({
    ruleCode: "MATCH_SUCCESS",
    hasOpenAuthoritativeEvent: false,
    nowMs: 1_000,
    hardDeadlineMs: 90_000,
  });
  assert.equal(plan.action, "wait");
});

test("timer expiry without an event returns principal path", () => {
  const plan = planAuthoritativePayout({
    ruleCode: "MATCH_SUCCESS",
    hasOpenAuthoritativeEvent: false,
    nowMs: 90_000,
    hardDeadlineMs: 90_000,
  });
  assert.equal(plan.action, "timeout");
});

test("authoritative event on the exact trade pays once", () => {
  const plan = planAuthoritativePayout({
    ruleCode: "MATCH_SUCCESS",
    hasOpenAuthoritativeEvent: true,
    nowMs: 1_000,
    hardDeadlineMs: 90_000,
  });
  assert.equal(plan.action, "pay");
});

test("non-success rules are not rewritten into a payout", () => {
  const plan = planAuthoritativePayout({
    ruleCode: "PRICE_MOVED",
    hasOpenAuthoritativeEvent: true,
    nowMs: 1_000,
    hardDeadlineMs: 90_000,
  });
  assert.equal(plan.action, "follow_rule");
});
