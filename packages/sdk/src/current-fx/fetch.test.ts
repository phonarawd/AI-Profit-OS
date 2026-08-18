import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCurrentFxApprox } from "./fetch.ts";

describe("normalizeCurrentFxApprox", () => {
  it("decimal string 을 그대로 두고 Number 변환하지 않는다", () => {
    const out = normalizeCurrentFxApprox({
      fxSnapshotId: "fx_1",
      capturedAt: "2026-08-17T00:00:00.000Z",
      principalKrwApprox: "1400000",
      withdrawableProfitKrwApprox: "0",
      expectedProfitKrwApprox: null,
    });
    assert.equal(out.principalKrwApprox, "1400000");
    assert.equal(out.withdrawableProfitKrwApprox, "0");
    assert.equal(out.expectedProfitKrwApprox, null);
  });

  it("usdtKrw 를 승격하지 않는다", () => {
    const out = normalizeCurrentFxApprox({
      fxSnapshotId: null,
      capturedAt: null,
      principalKrwApprox: null,
      withdrawableProfitKrwApprox: null,
      expectedProfitKrwApprox: null,
      usdtKrw: "1400",
    } as Record<string, unknown>);
    assert.equal("usdtKrw" in out, false);
    assert.equal(out.principalKrwApprox, null);
  });
});
