import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextWithdrawReviewStatus } from "./withdraw-review.policy.ts";

describe("admin withdraw review transitions", () => {
  it("approves auth_ok into queued once", () => {
    assert.deepEqual(nextWithdrawReviewStatus("auth_ok", "approve"), {
      ok: true,
      next: "queued",
      reused: false,
    });
    assert.deepEqual(nextWithdrawReviewStatus("queued", "approve"), {
      ok: true,
      next: "queued",
      reused: true,
    });
  });
  it("rejects auth_ok once and blocks the opposite decision", () => {
    assert.deepEqual(nextWithdrawReviewStatus("auth_ok", "reject"), {
      ok: true,
      next: "rejected",
      reused: false,
    });
    assert.deepEqual(nextWithdrawReviewStatus("rejected", "approve"), {
      ok: false,
      code: "ALREADY_DECIDED",
    });
    assert.deepEqual(nextWithdrawReviewStatus("queued", "reject"), {
      ok: false,
      code: "ALREADY_DECIDED",
    });
  });
  it("does not invent a decision for posted or completed intents", () => {
    assert.deepEqual(nextWithdrawReviewStatus("ledger_posted", "approve"), {
      ok: false,
      code: "NOT_REVIEWABLE",
    });
    assert.deepEqual(nextWithdrawReviewStatus("completed", "reject"), {
      ok: false,
      code: "NOT_REVIEWABLE",
    });
  });
});
