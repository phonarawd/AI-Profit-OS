import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeDepositAddress,
  normalizeDepositDispute,
  normalizeKycStatus,
  normalizeWalletBuckets,
  normalizeWalletJournals,
} from "./fetch.ts";
import { CONSUMER_PROFIT_MERGE_CTA_EXPOSED } from "./types.ts";

describe("wallet gap wiring — money/KYC/address safety", () => {
  it("does not coerce missing bucket amounts to 0", () => {
    assert.throws(
      () =>
        normalizeWalletBuckets({
          userId: "u1",
          profitUsdt: "1.00",
          lockedUsdt: "0",
          practiceUsdt: "0",
          liabilityUsdt: "1.00",
        }),
      /wallet_buckets_unavailable/,
    );
  });

  it("keeps a real ledger zero instead of treating it as missing", () => {
    const out = normalizeWalletBuckets({
      userId: "u1",
      principalUsdt: "0",
      profitUsdt: "0",
      lockedUsdt: "0",
      practiceUsdt: "0",
      liabilityUsdt: "0",
      asOfLedgerEntryId: "none",
    });
    assert.equal(out.principalUsdt, "0");
    assert.equal(out.liabilityUsdt, "0");
  });

  it("does not invent a deposit address when owner fields are missing", () => {
    assert.throws(
      () =>
        normalizeDepositAddress({
          userId: "u1",
          derivationIndex: 0,
          qrPayload: "payload",
          createdAt: "2026-08-20T00:00:00.000Z",
        }),
      /deposit_address_unavailable/,
    );
  });

  it("does not invent KYC approved when status is missing", () => {
    assert.throws(
      () => normalizeKycStatus({ userId: "u1" }),
      /kyc_status_unavailable/,
    );
    const none = normalizeKycStatus({ userId: "u1", kycStatus: "none" });
    assert.equal(none.kycStatus, "none");
    assert.notEqual(none.kycStatus, "approved");
  });

  it("drops journal items whose money lines are missing instead of filling 0", () => {
    const out = normalizeWalletJournals({
      items: [
        {
          id: "j1",
          journalType: "deposit_usdt",
          createdAt: "2026-08-20T00:00:00.000Z",
          userLines: [{ bucket: "principal", direction: "credit" }],
        },
      ],
    });
    assert.deepEqual(out.items, []);
  });

  it("keeps profit→principal consumer CTA hidden", () => {
    assert.equal(CONSUMER_PROFIT_MERGE_CTA_EXPOSED, false);
  });

  it("does not invent a deposit dispute when owner fields are missing", () => {
    assert.throws(
      () =>
        normalizeDepositDispute({
          kind: "wrong_chain",
          status: "open",
        }),
      /deposit_dispute_unavailable/,
    );
  });
});
