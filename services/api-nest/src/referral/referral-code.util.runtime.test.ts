import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowsReferralCodeEnsure,
  classifyOwnReferralCode,
  isProductionDbTarget,
  mintReferralCode,
  normalizeReferralCode,
  REFERRAL_CODE_ALPHABET,
  uniqueViolationTarget,
} from "./referral-code.util.ts";

describe("own referral code authority", () => {
  it("mints stable unique-looking codes from different bytes", () => {
    const a = mintReferralCode(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
    const b = mintReferralCode(Uint8Array.from([9, 8, 7, 6, 5, 4, 3, 2]));
    assert.equal(a.length, 8);
    assert.notEqual(a, b);
  });
  it("proves 256 divides by alphabet 32 so byte mapping is uniform", () => {
    assert.equal(REFERRAL_CODE_ALPHABET.length, 32);
    assert.equal(256 % REFERRAL_CODE_ALPHABET.length, 0);
    const counts = Array.from({ length: 32 }, () => 0);
    for (let b = 0; b < 256; b++) {
      counts[b & 31] += 1;
    }
    assert.ok(counts.every((n) => n === 8));
  });
  it("maps each CSPRNG byte with a 5-bit mask, not a biased remainder", () => {
    const code = mintReferralCode(Uint8Array.from([0, 31, 32, 255, 1, 2, 3, 4]));
    assert.equal(code[0], REFERRAL_CODE_ALPHABET[0]);
    assert.equal(code[1], REFERRAL_CODE_ALPHABET[31]);
    assert.equal(code[2], REFERRAL_CODE_ALPHABET[0]);
    assert.equal(code[3], REFERRAL_CODE_ALPHABET[31]);
    assert.throws(() => mintReferralCode(Uint8Array.from([1, 2, 3])), /8 CSPRNG bytes/);
  });
  it("rejects blank codes", () => {
    assert.equal(normalizeReferralCode("  "), null);
    assert.equal(normalizeReferralCode(null), null);
  });
  it("deleted and banned never expose a shareable code", () => {
    assert.deepEqual(
      classifyOwnReferralCode({ status: "deleted", referralCode: "KEEPME12" }),
      { policy: "deleted", referralCode: null },
    );
    assert.deepEqual(
      classifyOwnReferralCode({ status: "banned", referralCode: "KEEPME12" }),
      { policy: "banned", referralCode: null },
    );
  });
  it("active persisted code is ready and missing stays missing", () => {
    assert.deepEqual(
      classifyOwnReferralCode({ status: "active", referralCode: "QA120INV" }),
      { policy: "ready", referralCode: "QA120INV" },
    );
    assert.deepEqual(
      classifyOwnReferralCode({ status: "active", referralCode: null }),
      { policy: "missing", referralCode: null },
    );
  });
  it("never allows ensure writes against the production project ref", () => {
    assert.equal(isProductionDbTarget("db.mgsytcetsiecllmhcyox.supabase.co"), true);
    assert.equal(
      allowsReferralCodeEnsure({
        ensureFlag: "1",
        databaseUrl: "postgres://u@db.mgsytcetsiecllmhcyox.supabase.co/postgres",
      }),
      false,
    );
    assert.equal(
      allowsReferralCodeEnsure({
        ensureFlag: "1",
        databaseUrl: "postgres://u@localhost/staging",
      }),
      true,
    );
    assert.equal(
      allowsReferralCodeEnsure({
        ensureFlag: "0",
        databaseUrl: "postgres://u@localhost/staging",
      }),
      false,
    );
  });
  it("classifies unique violations on referral_code", () => {
    assert.equal(
      uniqueViolationTarget({
        code: "23505",
        constraint: "users_referral_code_key",
      }),
      "referral_code",
    );
    assert.equal(
      uniqueViolationTarget({ code: "23505", constraint: "users_email_key" }),
      "other",
    );
  });
});
