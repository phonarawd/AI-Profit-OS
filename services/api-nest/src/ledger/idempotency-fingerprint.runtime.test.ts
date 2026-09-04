import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConflictException } from "@nestjs/common";
import {
  assertFingerprintMatch,
  fingerprintPayload,
  krwDepositSemantic,
  withdrawIntentSemantic,
} from "./idempotency-fingerprint.ts";

describe("wallet idempotency semantic conflict", () => {
  it("same KRW key and same amount/name match", () => {
    const a = fingerprintPayload(
      krwDepositSemantic({
        userId: "u1",
        requestedAmountKrw: 10000,
        depositorName: " hong ",
      }),
    );
    const b = fingerprintPayload(
      krwDepositSemantic({
        userId: "u1",
        requestedAmountKrw: 10000,
        depositorName: "hong",
      }),
    );
    assert.doesNotThrow(() => assertFingerprintMatch({ stored: a, incoming: b }));
  });

  it("same KRW key with a different amount conflicts", () => {
    const stored = fingerprintPayload(
      krwDepositSemantic({
        userId: "u1",
        requestedAmountKrw: 10000,
        depositorName: "hong",
      }),
    );
    const incoming = fingerprintPayload(
      krwDepositSemantic({
        userId: "u1",
        requestedAmountKrw: 20000,
        depositorName: "hong",
      }),
    );
    assert.throws(
      () => assertFingerprintMatch({ stored, incoming }),
      (err) => err instanceof ConflictException,
    );
  });

  it("same withdraw key with a different destination conflicts", () => {
    const base = {
      userId: "u1",
      mode: "profit",
      asset: "USDT",
      amountUsdt: "1.00",
      debitProfitUsdt: "1.00",
      debitPrincipalUsdt: "0",
    };
    const stored = fingerprintPayload(
      withdrawIntentSemantic({ ...base, destination: "A" }),
    );
    const incoming = fingerprintPayload(
      withdrawIntentSemantic({ ...base, destination: "B" }),
    );
    assert.throws(
      () => assertFingerprintMatch({ stored, incoming }),
      (err) => err instanceof ConflictException,
    );
  });
});
