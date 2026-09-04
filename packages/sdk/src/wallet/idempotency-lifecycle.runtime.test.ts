import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyIdempotencyHttp,
  createIdempotencyLifecycle,
  krwDepositFingerprint,
  statusFromWalletError,
  withdrawFingerprint,
} from "./idempotency-lifecycle.ts";

describe("money idempotency lifecycle", () => {
  it("reuses one key for unchanged KRW amount and depositor name", () => {
    let n = 0;
    const life = createIdempotencyLifecycle({
      mint: () => {
        n += 1;
        return `k${n}`;
      },
    });
    const first = life.begin(krwDepositFingerprint(10000, "  hong  "));
    assert.ok("key" in first && first.key === "k1");
    life.retain();
    const retry = life.begin(krwDepositFingerprint(10000, "hong"));
    assert.ok("key" in retry && retry.key === "k1");
    assert.equal(n, 1);
  });

  it("mints a new key when amount or depositor name changes", () => {
    let n = 0;
    const life = createIdempotencyLifecycle({
      mint: () => {
        n += 1;
        return `k${n}`;
      },
    });
    assert.ok("key" in life.begin(krwDepositFingerprint(10000, "hong")));
    life.retain();
    const nextAmount = life.begin(krwDepositFingerprint(20000, "hong"));
    assert.ok("key" in nextAmount && nextAmount.key === "k2");
    life.retain();
    const nextName = life.begin(krwDepositFingerprint(20000, "lee"));
    assert.ok("key" in nextName && nextName.key === "k3");
  });

  it("blocks rapid duplicate submit while in flight", () => {
    const life = createIdempotencyLifecycle({ mint: () => "same" });
    const fp = krwDepositFingerprint(1, "a");
    assert.ok("key" in life.begin(fp));
    assert.deepEqual(life.begin(fp), { blocked: "in_flight" });
  });

  it("retains after network loss and retires after confirmed success", () => {
    let n = 0;
    const life = createIdempotencyLifecycle({
      mint: () => {
        n += 1;
        return `k${n}`;
      },
    });
    const fp = withdrawFingerprint({
      mode: "profit",
      asset: "USDT",
      amount: "1.50",
      destination: "Tdest",
      principalConfirm: false,
      stepUpReady: true,
    });
    assert.ok("key" in life.begin(fp));
    assert.equal(classifyIdempotencyHttp("network"), "retain");
    assert.equal(classifyIdempotencyHttp(408), "retain");
    assert.equal(classifyIdempotencyHttp(500), "retain");
    life.retain();
    const retry = life.begin(fp);
    assert.ok("key" in retry && retry.key === "k1");
    life.retire();
    const edited = life.begin(
      withdrawFingerprint({
        mode: "profit",
        asset: "USDT",
        amount: "2.00",
        destination: "Tdest",
        principalConfirm: false,
        stepUpReady: true,
      }),
    );
    assert.ok("key" in edited && edited.key === "k2");
  });

  it("retires after confirmed result or definitive rejection", () => {
    const life = createIdempotencyLifecycle({ mint: () => "gone" });
    life.begin(krwDepositFingerprint(3, "a"));
    assert.equal(classifyIdempotencyHttp(200), "retire");
    assert.equal(classifyIdempotencyHttp(401), "retire");
    assert.equal(classifyIdempotencyHttp(403), "retire");
    life.retire();
    assert.equal(life.peek(), null);
  });

  it("mints a new withdraw key when destination changes", () => {
    const keys = ["wa", "wb"];
    const life = createIdempotencyLifecycle({
      mint: () => keys.shift() || "wz",
    });
    const a = life.begin(
      withdrawFingerprint({
        mode: "profit",
        asset: "USDT",
        amount: "1",
        destination: "A",
        stepUpReady: true,
      }),
    );
    assert.ok("key" in a && a.key === "wa");
    life.retain();
    const b = life.begin(
      withdrawFingerprint({
        mode: "profit",
        asset: "USDT",
        amount: "1",
        destination: "B",
        stepUpReady: true,
      }),
    );
    assert.ok("key" in b && b.key === "wb");
  });

  it("maps wallet errors to retain or retire", () => {
    assert.equal(statusFromWalletError(new Error("wallet_withdraw_401")), 401);
    assert.equal(statusFromWalletError(new Error("wallet_withdraw_500")), 500);
    assert.equal(statusFromWalletError(new Error("TypeError: fetch")), "network");
    assert.equal(
      classifyIdempotencyHttp(statusFromWalletError(new Error("wallet_withdraw_500"))),
      "retain",
    );
    assert.equal(
      classifyIdempotencyHttp(statusFromWalletError(new Error("wallet_withdraw_403"))),
      "retire",
    );
  });
});
