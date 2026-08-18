import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeKrwDepositRequest } from "./fetch.ts";

describe("normalizeKrwDepositRequest", () => {
  it("keeps server-computed USDT strings and does not invent zero final", () => {
    const out = normalizeKrwDepositRequest({
      id: "r1",
      userId: "u1",
      requestedAmountKrw: 1000000,
      payableAmountKrw: 1000037,
      uniqueSuffixKrw: 37,
      payableSuffixRole: "bank_transfer_identification",
      depositCode: "abcd1234",
      depositorName: "홍길동",
      status: "pending",
      expiresAt: "2026-08-18T03:00:00.000Z",
      estimatedUsdt: "714.18",
      quote: {
        fxSnapshotId: "fx_q",
        usdtKrw: "1400.25",
        estimatedUsdt: "714.18",
        capturedAt: "2026-08-18T00:00:00.000Z",
      },
      final: null,
      createdAt: "2026-08-18T01:00:00.000Z",
    });
    assert.equal(out.estimatedUsdt, "714.18");
    assert.equal(out.quote?.estimatedUsdt, "714.18");
    assert.equal(out.final, null);
  });

  it("drops fake zero creditedUsdt instead of promoting it", () => {
    const out = normalizeKrwDepositRequest({
      id: "r2",
      userId: "u1",
      requestedAmountKrw: 1000,
      payableAmountKrw: 1037,
      uniqueSuffixKrw: 37,
      status: "rejected",
      expiresAt: "2026-08-18T03:00:00.000Z",
      createdAt: "2026-08-18T01:00:00.000Z",
      estimatedUsdt: "0",
      quote: null,
      final: {
        appliedFxSnapshotId: "fx_a",
        appliedUsdtKrw: "1400",
        creditedUsdt: "0",
      },
    });
    assert.equal(out.estimatedUsdt, undefined);
    assert.equal(out.final, null);
  });
});
