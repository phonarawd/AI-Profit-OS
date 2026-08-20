import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ReferralError,
  normalizeReferralMe,
  referralConsumerState,
} from "./fetch.ts";

describe("referral gap wiring — no % / no L1 label / no invented code", () => {
  it("does not invent a referral summary when required flags are missing", () => {
    assert.throws(
      () =>
        normalizeReferralMe({
          enabled: true,
          inviteCountUnlimited: true,
        }),
      ReferralError,
    );
  });

  it("rejects inviteCountUnlimited other than true instead of inventing a cap", () => {
    assert.throws(
      () =>
        normalizeReferralMe({
          enabled: true,
          rewardsEnabled: false,
          inviteCountUnlimited: false,
        }),
      /REFERRAL_UNAVAILABLE/,
    );
  });

  it("keeps a missing myReferralCode as null instead of inventing a code", () => {
    const out = normalizeReferralMe({
      enabled: true,
      rewardsEnabled: false,
      inviteCountUnlimited: true,
      edges: [],
      myBinding: null,
    });
    assert.equal(out.myReferralCode, null);
    assert.equal(out.inviteCountUnlimited, true);
    assert.equal(out.consumerState, "rewards_off");
  });

  it("does not pass L1/L2/L3 or percent fields through to the user DTO", () => {
    const out = normalizeReferralMe({
      enabled: true,
      rewardsEnabled: true,
      inviteCountUnlimited: true,
      myReferralCode: "ABCD12",
      edges: [
        {
          status: "l1_done",
          levelsAchieved: ["L1"],
          computedL2ReferrerUsdt: "3",
          l2ReferrerPct: "0.05",
        },
      ],
      myBinding: { status: "l1_done", levelsAchieved: ["L1"] },
    });
    assert.equal(out.myReferralCode, "ABCD12");
    assert.equal(out.bound, true);
    assert.equal(out.inviteCount, 1);
    assert.equal(
      JSON.stringify(out).includes("L1") || JSON.stringify(out).includes("0.05"),
      false,
    );
  });

  it("maps queued_pool to pool wait, not invite failure", () => {
    const out = normalizeReferralMe({
      enabled: true,
      rewardsEnabled: true,
      inviteCountUnlimited: true,
      edges: [{ status: "queued_pool" }],
      myBinding: null,
    });
    assert.equal(out.poolWait, true);
    assert.equal(out.consumerState, "pool_wait");
    assert.equal(referralConsumerState({
      enabled: true,
      rewardsEnabled: true,
      bound: false,
      poolWait: true,
    }), "pool_wait");
  });
});
