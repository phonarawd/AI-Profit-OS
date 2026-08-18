/**
 * CurrentFxApproxService.apply host tests.
 * CJS so @aipo/market-intelligence require works on this machine.
 */
const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const { createRequire } = require("node:module");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const here = __dirname;
const applyTs = path.join(here, "current-fx-approx.apply.ts");
const outDir = path.join(here, "_test_out");
const tscBin = path.join(__dirname, "../../../../node_modules/typescript/bin/tsc");
const tsc = spawnSync(
  process.execPath,
  [
    tscBin,
    "--pretty",
    "false",
    "--skipLibCheck",
    "--module",
    "commonjs",
    "--target",
    "ES2022",
    "--esModuleInterop",
        "--outDir",
    outDir,
    applyTs,
  ],
  { encoding: "utf8" },
);
if (tsc.status !== 0) {
  throw new Error(`tsc apply.ts failed:\n${tsc.stdout}\n${tsc.stderr}`);
}
const applyJs = path.join(outDir, "current-fx-approx.apply.js");
const apply = require(applyJs);
const req = createRequire(__filename);
const { approxKrwFromSnapshot } = req("@aipo/market-intelligence");

function snapshot(overrides) {
  return {
    fxSnapshotId: "fx_test_1",
    usdtKrw: "1400",
    formulaId: "cg_usdt_krw",
    sources: ["coingecko"],
    capturedAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

function request(overrides) {
  return {
    principalUsdt: "1000",
    withdrawableProfitUsdt: "35",
    expectedProfitUsdt: "12",
    ...overrides,
  };
}

describe("CurrentFxApproxService.apply host", () => {
  it("입력이 하나 이상이면 snapshot 을 정확히 1회 읽는다", async () => {
    let reads = 0;
    const out = await apply.applyCurrentFxApprox(request(), async () => {
      reads += 1;
      return snapshot();
    });
    assert.equal(reads, 1);
    assert.equal(out.fxSnapshotId, "fx_test_1");
    assert.equal(out.capturedAt, "2026-08-17T00:00:00.000Z");
    assert.equal(out.principalKrwApprox, approxKrwFromSnapshot("1000", snapshot()));
    assert.equal(
      out.withdrawableProfitKrwApprox,
      approxKrwFromSnapshot("35", snapshot()),
    );
    assert.equal(
      out.expectedProfitKrwApprox,
      approxKrwFromSnapshot("12", snapshot()),
    );
  });

  it("세 approx 는 같은 fxSnapshotId 를 쓴다", async () => {
    const out = await apply.applyCurrentFxApprox(request(), async () => snapshot());
    assert.equal(out.fxSnapshotId, "fx_test_1");
    assert.ok(out.principalKrwApprox);
    assert.ok(out.withdrawableProfitKrwApprox);
    assert.ok(out.expectedProfitKrwApprox);
  });

  it("세 입력이 모두 null 이면 snapshot read 0", async () => {
    let reads = 0;
    const out = await apply.applyCurrentFxApprox(
      {
        principalUsdt: null,
        withdrawableProfitUsdt: null,
        expectedProfitUsdt: null,
      },
      async () => {
        reads += 1;
        return snapshot();
      },
    );
    assert.equal(reads, 0);
    assert.equal(out.fxSnapshotId, null);
    assert.equal(out.principalKrwApprox, null);
  });

  it("0 은 KRW 0 으로 보존된다", async () => {
    const snap = snapshot();
    const out = await apply.applyCurrentFxApprox(
      request({ principalUsdt: "0" }),
      async () => snap,
    );
    assert.equal(out.principalKrwApprox, approxKrwFromSnapshot("0", snap));
    assert.equal(out.principalKrwApprox, "0");
  });

  it("null 슬롯은 계산하지 않는다", async () => {
    const out = await apply.applyCurrentFxApprox(
      request({ withdrawableProfitUsdt: null }),
      async () => snapshot(),
    );
    assert.equal(out.withdrawableProfitKrwApprox, null);
    assert.ok(out.principalKrwApprox);
  });

  it("empty string 은 invalid request", async () => {
    await assert.rejects(
      () =>
        apply.applyCurrentFxApprox(request({ principalUsdt: "" }), async () =>
          snapshot(),
        ),
      (err) => err instanceof apply.CurrentFxApproxRequestError,
    );
  });

  it("unknown key 는 invalid request", async () => {
    await assert.rejects(
      () =>
        apply.applyCurrentFxApprox(
          { ...request(), extra: "1" },
          async () => snapshot(),
        ),
      (err) => err instanceof apply.CurrentFxApproxRequestError,
    );
  });

  it("snapshot 없으면 all null", async () => {
    const out = await apply.applyCurrentFxApprox(request(), async () => null);
    assert.equal(out.fxSnapshotId, null);
    assert.equal(out.principalKrwApprox, null);
    assert.equal(out.withdrawableProfitKrwApprox, null);
    assert.equal(out.expectedProfitKrwApprox, null);
  });
});

process.on("exit", () => {
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});
