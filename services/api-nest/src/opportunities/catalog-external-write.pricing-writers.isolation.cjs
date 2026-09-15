/**
 * persistComputedPricing / persistOverride 자체 보호 격리.
 * 호출자가 옵션을 생략하거나 우회용 boolean/writerKind를 넘겨도 operator 쓰기는 0.
 */
"use strict";

require("reflect-metadata");
const assert = require("node:assert/strict");
const tsHook = require("./catalog-external-write.ts-hook.cjs");

const { CatalogExternalWriteGuard } = require("./catalog-external-write.guard.ts");
const { OpportunityRepriceService } = require("./opportunity-reprice.service.ts");
const { PriceOverrideService } = require("../price-override/price-override.service.ts");
const { InProcessEventBus } = require("../events/in-process.bus.ts");

const GATE_ENV = "CATALOG_EXTERNAL_WRITE_GATE";
const LOCK_KEYS = [
  "CATALOG_EXTERNAL_WRITE_GATE",
  "PRODUCTION_SOURCE_MODE",
  "ALLOW_EXTERNAL_PRODUCT_INGEST",
  "ALLOW_LEGACY_EXTERNAL_WRITES",
];
const prevLock = Object.fromEntries(LOCK_KEYS.map((k) => [k, process.env[k]]));
const writeCore = require("../../catalog-external-write.core.cjs");

function restoreGate() {
  for (const k of LOCK_KEYS) {
    if (prevLock[k] == null) delete process.env[k];
    else process.env[k] = prevLock[k];
  }
}

class FakePricingDb {
  constructor(opts) {
    this.schemaMode = opts.schemaMode || "ready";
    this.supplyByAsset = opts.supplyByAsset || {};
    this.opportunities = { ...(opts.opportunities || {}) };
    this.writes = [];
  }
  configured() {
    return true;
  }
  async query(text, params = []) {
    if (/information_schema\.columns/i.test(text) && /supply_source/i.test(text)) {
      if (this.schemaMode === "query_fail") throw new Error("schema inspect unavailable");
      if (this.schemaMode === "missing") return { rows: [], rowCount: 0 };
      return { rows: [{ ok: 1 }], rowCount: 1 };
    }
    if (/SELECT asset_id FROM public\.opportunities WHERE id/i.test(text)) {
      const id = params[0];
      for (const [assetId, rows] of Object.entries(this.opportunities)) {
        if ((rows || []).some((r) => r.id === id)) {
          return { rows: [{ asset_id: assetId }], rowCount: 1 };
        }
      }
      return { rows: [], rowCount: 0 };
    }
    if (/FROM public\.assets/i.test(text) && /FOR UPDATE/i.test(text)) {
      const assetId = params[0];
      if (this.supplyByAsset[assetId] || this.opportunities[assetId]) {
        return { rows: [{ asset_id: assetId }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (/FROM public\.opportunities/i.test(text) && /FOR UPDATE/i.test(text)) {
      const assetId = params[0];
      const supply = this.supplyByAsset[assetId];
      const rows =
        this.opportunities[assetId] ||
        (supply ? [{ id: "opp-" + assetId, supply_source: supply }] : []);
      return { rows, rowCount: rows.length };
    }
    if (
      /UPDATE public\.opportunities SET/i.test(text) &&
      /pricing = \$2/i.test(text)
    ) {
      this.writes.push({ kind: "pricing", text, params });
      const id = params[0];
      const legacyOnly = /supply_source = 'legacy_external'/.test(text);
      for (const rows of Object.values(this.opportunities)) {
        const row = (rows || []).find((r) => r.id === id);
        if (!row) continue;
        if (legacyOnly && row.supply_source !== "legacy_external") {
          return { rows: [], rowCount: 0 };
        }
        return {
          rows: [
            {
              ...row,
              pricing: typeof params[1] === "string" ? JSON.parse(params[1]) : params[1],
              pricing_version: params[2],
              expected_profit_usdt: params[4],
              expected_profit_krw_approx: params[5],
              capital_band: params[6],
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    }
    if (/INSERT INTO public\.opportunity_price_overrides/i.test(text)) {
      this.writes.push({ kind: "override", text, params });
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  async withTransaction(fn) {
    return fn({ query: (text, params) => this.query(text, params) });
  }
}

function makeServices(db) {
  const guard = new CatalogExternalWriteGuard(db);
  const reprice = new OpportunityRepriceService(db, new InProcessEventBus(), guard);
  const priceOverride = new PriceOverrideService(db);
  const client = { query: (text, params) => db.query(text, params) };
  return { reprice, priceOverride, client };
}

const pricingInput = {
  id: "",
  pricing: { expectedProfitUsdt: "9" },
  expectedProfitUsdt: "9",
  expectedProfitKrw: null,
  capitalBand: "small",
  nextVersion: 4,
  asOf: "2026-09-14T00:00:00.000Z",
};

const overrideWrite = {
  engaged: true,
  adminBuyUsdt: "10",
  adminSellUsdt: "20",
  adminMarginPct: "1",
  reason: "test reason long enough",
  reasonCode: "test",
  adminId: "00000000-0000-0000-0000-000000000001",
  role: "admin",
};

function operatorDb() {
  return new FakePricingDb({
    supplyByAsset: { "watch-op-1": "operator" },
    opportunities: {
      "watch-op-1": [{ id: "opp-op-1", supply_source: "operator", pricing_version: 3 }],
    },
  });
}

function legacyDb() {
  return new FakePricingDb({
    supplyByAsset: { "watch-leg-1": "legacy_external" },
    opportunities: {
      "watch-leg-1": [
        { id: "opp-leg-1", supply_source: "legacy_external", pricing_version: 2 },
      ],
    },
  });
}

async function expectBlocked(fn) {
  try {
    await fn();
    return "";
  } catch (err) {
    return err && err.code ? String(err.code) : String(err && err.message ? err.message : err);
  }
}

async function main() {
  try {
    writeCore.applyUnlockLegacyWrites(process.env);

    const opDb = operatorDb();
    const op = makeServices(opDb);
    const twoArgCode = await expectBlocked(() =>
      op.reprice.persistComputedPricing(op.client, { ...pricingInput, id: "opp-op-1" }),
    );
    assert.equal(twoArgCode, "OPERATOR_PROTECTED");
    assert.equal(opDb.writes.filter((w) => w.kind === "pricing").length, 0);

    const bypassCode = await expectBlocked(() =>
      op.reprice.persistComputedPricing(
        op.client,
        { ...pricingInput, id: "opp-op-1" },
        { requireLegacySupply: false, writerKind: "operator_canonical" },
      ),
    );
    assert.equal(bypassCode, "OPERATOR_PROTECTED");
    assert.equal(opDb.writes.filter((w) => w.kind === "pricing").length, 0);

    const overrideCode = await expectBlocked(() =>
      op.priceOverride.persistOverride(op.client, "opp-op-1", overrideWrite),
    );
    assert.equal(overrideCode, "OPERATOR_PROTECTED");
    assert.equal(opDb.writes.filter((w) => w.kind === "override").length, 0);

    const retryPrice = await expectBlocked(() =>
      op.reprice.persistComputedPricing(op.client, { ...pricingInput, id: "opp-op-1" }),
    );
    const retryOverride = await expectBlocked(() =>
      op.priceOverride.persistOverride(op.client, "opp-op-1", overrideWrite),
    );
    assert.equal(retryPrice, "OPERATOR_PROTECTED");
    assert.equal(retryOverride, "OPERATOR_PROTECTED");
    assert.equal(opDb.writes.length, 0);
    console.log("PASS persistComputedPricing/persistOverride block operator (2-arg, bypass opts, retry)");

    const legDb = legacyDb();
    const leg = makeServices(legDb);
    const updated = await leg.reprice.persistComputedPricing(leg.client, {
      ...pricingInput,
      id: "opp-leg-1",
    });
    assert.equal(updated.pricing_version, 4);
    assert.equal(legDb.writes.filter((w) => w.kind === "pricing").length, 1);
    await leg.priceOverride.persistOverride(leg.client, "opp-leg-1", overrideWrite);
    assert.equal(legDb.writes.filter((w) => w.kind === "override").length, 1);
    console.log("PASS 2-arg persistComputedPricing and persistOverride write legacy");

    writeCore.applyProductionSourceLock(process.env);
    const lockedDb = legacyDb();
    const locked = makeServices(lockedDb);
    const lockedPrice = await expectBlocked(() =>
      locked.reprice.persistComputedPricing(locked.client, {
        ...pricingInput,
        id: "opp-leg-1",
      }),
    );
    assert.equal(lockedPrice, "SOURCE_DISABLED");
    assert.equal(lockedDb.writes.length, 0);
    console.log("PASS env lock blocks legacy pricing writes");

    writeCore.applyUnlockLegacyWrites(process.env);
    const missingDb = new FakePricingDb({
      schemaMode: "missing",
      supplyByAsset: { "watch-leg-1": "legacy_external" },
      opportunities: {
        "watch-leg-1": [
          { id: "opp-leg-1", supply_source: "legacy_external", pricing_version: 2 },
        ],
      },
    });
    const missing = makeServices(missingDb);
    const missingPrice = await expectBlocked(() =>
      missing.reprice.persistComputedPricing(missing.client, {
        ...pricingInput,
        id: "opp-leg-1",
      }),
    );
    const missingOverride = await expectBlocked(() =>
      missing.priceOverride.persistOverride(missing.client, "opp-leg-1", overrideWrite),
    );
    assert.equal(missingPrice, "SCHEMA_UNREADY");
    assert.equal(missingOverride, "SCHEMA_UNREADY");
    assert.equal(missingDb.writes.length, 0);

    const failDb = new FakePricingDb({
      schemaMode: "query_fail",
      supplyByAsset: { "watch-leg-1": "legacy_external" },
      opportunities: {
        "watch-leg-1": [
          { id: "opp-leg-1", supply_source: "legacy_external", pricing_version: 2 },
        ],
      },
    });
    const fail = makeServices(failDb);
    const failPrice = await expectBlocked(() =>
      fail.reprice.persistComputedPricing(fail.client, {
        ...pricingInput,
        id: "opp-leg-1",
      }),
    );
    const failOverride = await expectBlocked(() =>
      fail.priceOverride.persistOverride(fail.client, "opp-leg-1", overrideWrite),
    );
    assert.equal(failPrice, "SCHEMA_QUERY_FAILED");
    assert.equal(failOverride, "SCHEMA_QUERY_FAILED");
    assert.equal(failDb.writes.length, 0);
    console.log("PASS pricing writers fail-closed on schema missing/query fail");

    console.log("[catalog-external-write.pricing-writers] ALL PASS");
  } finally {
    restoreGate();
    if (tsHook && typeof tsHook.uninstall === "function") tsHook.uninstall();
  }
}

if (require.main === module) {
  main().catch((err) => {
    restoreGate();
    if (tsHook && typeof tsHook.uninstall === "function") tsHook.uninstall();
    console.error("[catalog-external-write.pricing-writers] FAIL");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
