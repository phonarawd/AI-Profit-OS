"use strict";

require("reflect-metadata");
const path = require("node:path");
const assert = require("node:assert/strict");
const tsHook = require("./catalog-external-write.ts-hook.cjs");

const { OpportunitiesAdminService } = require("./opportunities.admin.service.ts");
const { CatalogExternalWriteGuard } = require("./catalog-external-write.guard.ts");
const { OpportunityRepriceService } = require("./opportunity-reprice.service.ts");
const { InProcessEventBus } = require("../events/in-process.bus.ts");
const cli = require("../../../../tooling/seed/catalog-runtime.cjs");

const GATE_ENV = "CATALOG_EXTERNAL_WRITE_GATE";
const prevGate = process.env[GATE_ENV];

function restoreGate() {
  if (prevGate == null) delete process.env[GATE_ENV];
  else process.env[GATE_ENV] = prevGate;
}

class FakeAdminDb {
  constructor(opts) {
    this.schemaMode = opts.schemaMode || "ready";
    this.supplyByAsset = opts.supplyByAsset || {};
    this.assets = { ...(opts.assets || {}) };
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
      if (this.assets[assetId] || this.supplyByAsset[assetId]) {
        return { rows: [{ asset_id: assetId }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (/FROM public\.opportunities/i.test(text) && /FOR UPDATE/i.test(text)) {
      const assetId = params[0];
      const supply = this.supplyByAsset[assetId];
      const rows = this.opportunities[assetId] ||
        (supply ? [{ id: "opp-" + assetId, supply_source: supply }] : []);
      return { rows, rowCount: rows.length };
    }
    if (/INSERT INTO public\.assets/i.test(text) || /UPDATE public\.assets/i.test(text)) {
      this.writes.push({ kind: "asset", text, params });
      this.assets[params[0]] = { image_url: params[3], image_source: params[4] };
    }
    if (/UPDATE public\.opportunities/i.test(text)) {
      this.writes.push({ kind: "opportunity", text, params });
    }
    if (/INSERT INTO public\.listings/i.test(text) || /UPDATE public\.listings/i.test(text)) {
      this.writes.push({ kind: "listing", text, params });
    }
    if (/INSERT INTO public\.opportunities/i.test(text)) {
      this.writes.push({ kind: "opportunity-insert", text, params });
    }
    if (/SELECT asset_label, image_alt_ko FROM public\.assets/i.test(text)) {
      const a = this.assets[params[0]];
      return { rows: a ? [{ asset_label: "lab", image_alt_ko: "alt" }] : [], rowCount: a ? 1 : 0 };
    }
    if (/FROM public\.listings/i.test(text)) return { rows: [], rowCount: 0 };
    return { rows: [], rowCount: 0 };
  }
  async withTransaction(fn) {
    return fn({ query: (text, params) => this.query(text, params) });
  }
}

function makeAdmin(db) {
  const guard = new CatalogExternalWriteGuard(db);
  const reprice = new OpportunityRepriceService(db, new InProcessEventBus(), guard);
  const priceOverride = {
    requireWrite: () => ({ reason: "test", reasonCode: "test" }),
    loadSource: async () => ({ buyPriceUsdt: "10", sellPriceUsdt: "20" }),
    resolve: () => ({
      EFFECTIVE: {
        expectedProfitUsdt: "1",
        compareReady: true,
        buyMarketId: "ebay_us",
        sellMarketId: "ebay_gb",
      },
    }),
    persistOverride: async () => {
      db.writes.push({ kind: "override" });
    },
    writeAppliedAudit: async () => {},
  };
  const images = {
    bucketName: () => "asset-images",
    resolveAdminUpload: (input) => ({
      imageUrl: "https://cdn.example/" + input.assetId + ".jpg",
      imageSource: "admin_r2",
      objectKey: "assets/watch/" + input.assetId + ".jpg",
      bucket: "asset-images",
    }),
    signedPutHint: () => null,
  };
  return new OpportunitiesAdminService(
    db,
    new InProcessEventBus(),
    images,
    reprice,
    priceOverride,
    guard,
  );
}

async function main() {
  try {
    process.env[GATE_ENV] = "off";
    const opDb = new FakeAdminDb({
      supplyByAsset: { "watch-op-1": "operator", "watch-leg-1": "legacy_external" },
      assets: {
        "watch-op-1": { image_url: "https://r2.example/op.jpg", image_source: "admin_r2" },
        "watch-leg-1": { image_url: "https://i.ebayimg.com/old.jpg", image_source: "ebay" },
      },
      opportunities: {
        "watch-op-1": [
          {
            id: "opp-op-1",
            supply_source: "operator",
            pricing_version: 3,
            expected_profit_usdt: "1",
            required_capital_usdt: "10",
            pricing: { buyMarketId: "ebay_us", sellMarketId: "ebay_gb" },
            grade_mismatch: false,
            image_missing: false,
            fx_snapshot_id: "fx",
            expected_profit_krw_approx: null,
          },
        ],
        "watch-leg-1": [
          {
            id: "opp-leg-1",
            supply_source: "legacy_external",
            pricing_version: 2,
            expected_profit_usdt: "0.4",
            required_capital_usdt: "10",
            pricing: { buyMarketId: "ebay_us", sellMarketId: "ebay_gb" },
            grade_mismatch: false,
            image_missing: false,
            fx_snapshot_id: "fx",
            expected_profit_krw_approx: null,
          },
        ],
      },
    });
    const admin = makeAdmin(opDb);
    const blocked = await admin.upsertAsset({
      assetId: "watch-op-1",
      category: "watch",
      assetLabel: "overwrite",
      imageUrl: "https://cdn.example/new.jpg",
      imageSource: "admin_r2",
    });
    assert.equal(blocked.wrote, false);
    assert.equal(blocked.reason, "OPERATOR_PROTECTED");
    assert.equal(opDb.writes.filter((w) => w.kind === "asset").length, 0);

    const retry = await admin.upsertAsset({
      assetId: "watch-op-1",
      category: "watch",
      assetLabel: "overwrite-2",
      imageUrl: "https://cdn.example/retry.jpg",
      imageSource: "ebay",
    });
    assert.equal(retry.wrote, false);
    assert.equal(opDb.writes.filter((w) => w.kind === "asset").length, 0);

    const image = await admin.registerAssetImage("watch-op-1", {
      category: "watch",
      publicUrl: "https://cdn.example/r2.jpg",
    });
    assert.equal(image.wrote, false);
    assert.equal(image.reason, "OPERATOR_PROTECTED");
    assert.equal(image.r2, undefined);
    assert.equal(image.signedPut, undefined);

    let pricingCode = "";
    try {
      await admin.patchPricing("opp-op-1", {
        updatedByAdminId: "admin-1",
        expectedPricingVersion: 3,
        reason: "test reason long enough",
        reasonCode: "test",
        useAdminOverride: false,
      });
    } catch (err) {
      pricingCode = err && err.code ? err.code : String(err.message || err);
    }
    assert.equal(pricingCode, "OPERATOR_PROTECTED");
    assert.equal(opDb.writes.some((w) => w.kind === "override"), false);
    console.log("PASS admin upsert/image/patchPricing block operator");

    process.env[GATE_ENV] = "on";
    const gateDb = new FakeAdminDb({
      supplyByAsset: { "watch-leg-1": "legacy_external" },
      assets: { "watch-leg-1": { image_url: "https://i.ebayimg.com/old.jpg" } },
    });
    const gateAdmin = makeAdmin(gateDb);
    const gateUp = await gateAdmin.upsertAsset({
      assetId: "watch-leg-1",
      category: "watch",
      assetLabel: "legacy",
      imageUrl: "https://cdn.example/gate.jpg",
      imageSource: "admin_r2",
    });
    assert.equal(gateUp.wrote, false);
    assert.equal(gateUp.reason, "GATE_ON");
    console.log("PASS admin upsert blocked when gate ON");

    process.env[GATE_ENV] = "off";
    const missingDb = new FakeAdminDb({ schemaMode: "missing" });
    const missingAdmin = makeAdmin(missingDb);
    const missingUp = await missingAdmin.upsertAsset({
      assetId: "watch-leg-1",
      category: "watch",
      assetLabel: "legacy",
      imageUrl: "https://cdn.example/x.jpg",
      imageSource: "admin_r2",
    });
    assert.equal(missingUp.wrote, false);
    assert.equal(missingUp.reason, "SCHEMA_UNREADY");
    const failDb = new FakeAdminDb({ schemaMode: "query_fail" });
    const failUp = await makeAdmin(failDb).upsertAsset({
      assetId: "watch-leg-1",
      category: "watch",
      assetLabel: "legacy",
      imageUrl: "https://cdn.example/x.jpg",
      imageSource: "admin_r2",
    });
    assert.equal(failUp.wrote, false);
    assert.equal(failUp.reason, "SCHEMA_QUERY_FAILED");
    console.log("PASS admin upsert fail-closed on schema");

    const cliDb = new FakeAdminDb({
      supplyByAsset: { "cli-op": "operator", "cli-leg": "legacy_external" },
      assets: { "cli-op": {}, "cli-leg": {} },
    });
    const cliClient = { query: (text, params) => cliDb.query(text, params) };
    const cliOp = await cli.upsertAsset(cliClient, {
      assetId: "cli-op",
      category: "watch",
      assetLabel: "op",
      imageUrl: "https://cdn.example/cli.jpg",
      imageSource: "admin_r2",
    });
    const cliLeg = await cli.upsertAsset(cliClient, {
      assetId: "cli-leg",
      category: "watch",
      assetLabel: "leg",
      imageUrl: "https://cdn.example/cli-leg.jpg",
      imageSource: "admin_r2",
    });
    assert.equal(cliOp.wrote, false);
    assert.equal(cliOp.reason, "OPERATOR_PROTECTED");
    assert.equal(cliLeg.wrote, true);
    const cliList = await cli.upsertListing(cliClient, {
      assetId: "cli-op",
      marketId: "ebay_us",
      adapterId: "ebay",
      externalItemId: "x",
      title: "x",
      nativeAmount: "10",
      nativeCurrency: "USDT",
      observedAt: "2026-09-13T14:00:00.000Z",
      staleAt: "2026-09-13T14:05:00.000Z",
    });
    assert.equal(cliList.wrote, false);
    console.log("PASS CLI seed skips operator and writes legacy");

    console.log("[catalog-external-write.admin-writers] ALL PASS");
  } finally {
    restoreGate();
    if (tsHook && typeof tsHook.uninstall === "function") tsHook.uninstall();
  }
}

if (require.main === module) {
  main().catch((err) => {
    restoreGate();
    if (tsHook && typeof tsHook.uninstall === "function") tsHook.uninstall();
    console.error("[catalog-external-write.admin-writers] FAIL");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
