import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const requireCjs = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const core = requireCjs(
  join(here, "..", "..", "catalog-external-write.core.cjs"),
) as typeof import("../../catalog-external-write.core.cjs");

function fixture(over: Record<string, unknown> = {}) {
  return core.createMemoryCatalog({
    schemaReady: true,
    gateRaw: "on",
    sourceLockEngaged: true,
    assets: {
      op_asset: { image_url: "https://r2.example/op.jpg", image_source: "admin_r2" },
      leg_asset: { image_url: "https://i.ebayimg.com/old.jpg", image_source: "ebay" },
    },
    opportunities: {
      op_asset: [
        {
          id: "opp-op",
          supply_source: "operator",
          pricing_version: 3,
          expected_profit_usdt: "1.25",
          asset_image_url: "https://r2.example/op.jpg",
          asset_image_source: "admin_r2",
        },
      ],
      leg_asset: [
        {
          id: "opp-leg",
          supply_source: "legacy_external",
          pricing_version: 2,
          expected_profit_usdt: "0.40",
          asset_image_url: "https://i.ebayimg.com/old.jpg",
          asset_image_source: "ebay",
        },
      ],
    },
    listings: {
      op_asset: [
        {
          market_id: "ebay_us",
          external_item_id: "ext-op",
          price_usdt: "100",
        },
      ],
      leg_asset: [
        {
          market_id: "ebay_us",
          external_item_id: "ext-leg",
          price_usdt: "50",
        },
      ],
    },
    ...over,
  });
}

function unlockedFixture(over: Record<string, unknown> = {}) {
  return fixture({ gateRaw: "off", sourceLockEngaged: false, ...over });
}

const listingPatch = {
  market_id: "ebay_us",
  external_item_id: "ext-op",
  price_usdt: "999",
};

describe("catalog-external-write core", () => {
  it("S1-A: default and production env lock block ALLOW_LEGACY", () => {
    const gate = core.parseGate("");
    assert.equal(gate.ok, true);
    if (gate.ok) assert.equal(gate.engaged, true);
    const locked = core.decideProductWrite({
      gate,
      schemaReady: true,
      sources: ["legacy_external"],
    });
    assert.equal(locked.allow, false);
    assert.equal(locked.reason, core.REASON.SOURCE_DISABLED);

    const envLocked = core.readSourceLockFromEnv(Object.create(null));
    assert.equal(envLocked.engaged, true);
    assert.equal(envLocked.reason, core.REASON.SOURCE_DISABLED);

    const unlocked = core.decideProductWrite({
      gate: core.parseGate("off"),
      schemaReady: true,
      sources: ["legacy_external"],
      sourceLock: { ok: true, engaged: false },
    });
    assert.equal(unlocked.allow, true);
    assert.equal(unlocked.reason, core.REASON.ALLOW_LEGACY);
  });

  it("S1-B: operator rows stay immutable", async () => {
    const cat = unlockedFixture();
    const before = cat.snapshotAsset("op_asset");
    const listing = await cat.persistListing("op_asset", listingPatch);
    const image = await cat.applyImage("op_asset", "https://i.ebayimg.com/new.jpg");
    const price = await cat.reprice("op_asset", 99, "9.99");
    const after = cat.snapshotAsset("op_asset");
    assert.equal(listing.wrote, false);
    assert.equal(listing.reason, core.REASON.OPERATOR_PROTECTED);
    assert.equal(image.wrote, false);
    assert.equal(price.wrote, false);
    assert.deepEqual(after.listings, before.listings);
    assert.equal(after.opportunities[0].pricing_version, 3);
    assert.equal(after.opportunities[0].asset_image_url, before.opportunities[0].asset_image_url);
    assert.equal(after.asset?.image_url, before.asset?.image_url);
  });

  it("S1-C: unlocked env can refresh a different legacy asset", async () => {
    const cat = unlockedFixture();
    const listing = await cat.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "77",
    });
    const image = await cat.applyImage(
      "leg_asset",
      "https://i.ebayimg.com/new-leg.jpg",
    );
    const price = await cat.reprice("leg_asset", 3, "0.55");
    assert.equal(listing.wrote, true);
    assert.equal(image.wrote, true);
    assert.equal(price.wrote, true);
    assert.equal(cat.snapshotAsset("leg_asset").listings[0].price_usdt, "77");
    assert.equal(
      cat.snapshotAsset("op_asset").opportunities[0].pricing_version,
      3,
    );
  });

  it("S1-D: locked env and gate ON block product writes", async () => {
    const cat = fixture({ gateRaw: "on", sourceLockEngaged: true });
    const leg = await cat.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "1",
    });
    const op = await cat.persistListing("op_asset", listingPatch);
    assert.equal(leg.wrote, false);
    assert.equal(leg.reason, core.REASON.SOURCE_DISABLED);
    assert.equal(op.wrote, false);
    assert.equal(op.reason, core.REASON.OPERATOR_PROTECTED);
    const seed = core.decideBootSeed({
      gate: core.parseGate("on"),
      schemaReady: true,
    });
    assert.equal(seed.allow, false);
    assert.equal(seed.reason, core.REASON.SOURCE_DISABLED);
  });

  it("S1-E: gate off alone does not unlock; operator stays protected", async () => {
    const cat = fixture({ gateRaw: "on", sourceLockEngaged: true });
    await cat.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "1",
    });
    cat.setGateRaw("off");
    const stillLocked = await cat.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "88",
    });
    assert.equal(stillLocked.wrote, false);
    assert.equal(stillLocked.reason, core.REASON.SOURCE_DISABLED);
    cat.setSourceLockEngaged(false);
    const leg = await cat.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "88",
    });
    const op = await cat.persistListing("op_asset", listingPatch);
    assert.equal(leg.wrote, true);
    assert.equal(op.wrote, false);
    assert.equal(op.reason, core.REASON.OPERATOR_PROTECTED);
  });

  it("bad gate, missing column, and inspect failure stay fail-closed", async () => {
    assert.equal(core.parseGate("maybe").ok, false);
    const badGate = core.decideProductWrite({
      gate: core.parseGate("maybe"),
      schemaReady: true,
      sources: ["legacy_external"],
    });
    assert.equal(badGate.allow, false);
    assert.equal(badGate.reason, core.REASON.GATE_UNRESOLVED);

    const unready = unlockedFixture({ schemaReady: false, gateRaw: "off" });
    const u = await unready.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "1",
    });
    assert.equal(u.wrote, false);
    assert.equal(u.reason, core.REASON.SCHEMA_UNREADY);

    const errCat = unlockedFixture({ schemaError: true, gateRaw: "off" });
    const e = await errCat.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "1",
    });
    assert.equal(e.wrote, false);
    assert.equal(e.reason, core.REASON.SCHEMA_QUERY_FAILED);

    const invalid = core.decideProductWrite({
      gate: core.parseGate("off"),
      schemaReady: true,
      sources: ["mystery"],
      sourceLock: { ok: true, engaged: false },
    });
    assert.equal(invalid.allow, false);
    assert.equal(invalid.reason, core.REASON.SUPPLY_SOURCE_INVALID);

    const unread = core.decideProductWrite({
      gate: core.parseGate("off"),
      schemaReady: true,
      sources: [null],
      sourceLock: { ok: true, engaged: false },
    });
    assert.equal(unread.allow, false);
    assert.equal(unread.reason, core.REASON.SUPPLY_SOURCE_UNREADABLE);
  });

  it("supply race: operator flip inside lock writes 0", async () => {
    const cat = unlockedFixture();
    const wrote = await cat.withAssetLock("leg_asset", async () => {
      await cat.setSupplySource("leg_asset", "opp-leg", "operator");
      return cat.persistListing("leg_asset", {
        market_id: "ebay_us",
        external_item_id: "ext-leg",
        price_usdt: "13",
      });
    });
    assert.equal(wrote.wrote, false);
    assert.equal(wrote.reason, core.REASON.OPERATOR_PROTECTED);
    assert.equal(cat.snapshotAsset("leg_asset").listings[0].price_usdt, "50");
  });

  it("concurrent ingest: operator fails, unlocked legacy serializes", async () => {
    const cat = unlockedFixture();
    const [a, b, c, d] = await Promise.all([
      cat.persistListing("op_asset", listingPatch),
      cat.persistListing("op_asset", { ...listingPatch, price_usdt: "2" }),
      cat.persistListing("leg_asset", {
        market_id: "ebay_us",
        external_item_id: "ext-leg",
        price_usdt: "11",
      }),
      cat.persistListing("leg_asset", {
        market_id: "ebay_us",
        external_item_id: "ext-leg",
        price_usdt: "12",
      }),
    ]);
    assert.equal(a.wrote, false);
    assert.equal(b.wrote, false);
    assert.equal(c.wrote, true);
    assert.equal(d.wrote, true);
    assert.equal(cat.snapshotAsset("leg_asset").listings[0].price_usdt, "12");
    assert.equal(cat.snapshotAsset("op_asset").listings[0].price_usdt, "100");
  });

  it("lock race: engaging source lock inside TX blocks write", async () => {
    const cat = unlockedFixture();
    const result = await cat.withAssetLock("leg_asset", async () => {
      cat.setSourceLockEngaged(true);
      return cat.persistListing("leg_asset", {
        market_id: "ebay_us",
        external_item_id: "ext-leg",
        price_usdt: "13",
      });
    });
    assert.equal(result.wrote, false);
    assert.equal(result.reason, core.REASON.SOURCE_DISABLED);
    assert.equal(cat.snapshotAsset("leg_asset").listings[0].price_usdt, "50");
  });

  it("lock order is assets then opportunities", () => {
    assert.deepEqual(core.LOCK_ORDER, ["assets", "opportunities"]);
    assert.match(core.SQL.lockOpportunities, /ORDER BY id ASC/);
    assert.match(core.SQL.lockOpportunities, /FOR UPDATE/);
    assert.match(core.SQL.lockAsset, /FOR UPDATE/);
  });

  it("admin upsert blocks operator", async () => {
    const cat = unlockedFixture();
    const before = cat.snapshotAsset("op_asset");
    const first = await cat.upsertAsset("op_asset", { image_url: "https://cdn.example/x.jpg" });
    const retry = await cat.upsertAsset("op_asset", { image_url: "https://cdn.example/y.jpg" });
    assert.equal(first.wrote, false);
    assert.equal(first.reason, core.REASON.OPERATOR_PROTECTED);
    assert.equal(retry.wrote, false);
    assert.equal(cat.snapshotAsset("op_asset").asset.image_url, before.asset.image_url);
  });
  it("admin image and seed skip operator only", async () => {
    const cat = unlockedFixture();
    const op = await cat.applyAdminImage("op_asset", "https://cdn.example/r2.jpg");
    const leg = await cat.applyAdminImage("leg_asset", "https://cdn.example/r2-leg.jpg");
    assert.equal(op.wrote, false);
    assert.equal(leg.wrote, true);
  });
  it("patchPricing blocks operator", async () => {
    const cat = unlockedFixture();
    const op = await cat.patchPricing("op_asset", "opp-op", 99, "9.99");
    const leg = await cat.patchPricing("leg_asset", "opp-leg", 4, "0.88");
    assert.equal(op.wrote, false);
    assert.equal(leg.wrote, true);
    assert.equal(cat.snapshotAsset("op_asset").opportunities[0].pricing_version, 3);
  });
  it("gate and schema fail-closed for admin writers", async () => {
    const on = fixture({ gateRaw: "on", sourceLockEngaged: true });
    assert.equal(
      (await on.upsertAsset("leg_asset", { image_url: "x" })).reason,
      core.REASON.SOURCE_DISABLED,
    );
    const missing = unlockedFixture({ schemaReady: false, gateRaw: "off" });
    assert.equal((await missing.patchPricing("leg_asset", "opp-leg", 8, "1")).reason, core.REASON.SCHEMA_UNREADY);
    const fail = unlockedFixture({ schemaError: true, gateRaw: "off" });
    assert.equal((await fail.applyAdminImage("leg_asset", "https://cdn.example/x.jpg")).reason, core.REASON.SCHEMA_QUERY_FAILED);
  });
  it("canonical writer is reserved and does not promote legacy", () => {
    assert.equal(core.WRITER_KIND.OPERATOR_CANONICAL, "operator_canonical");
    const canonical = core.decideProductWrite({
      gate: core.parseGate("on"),
      schemaReady: true,
      sources: ["operator"],
      writerKind: core.WRITER_KIND.OPERATOR_CANONICAL,
    });
    assert.equal(canonical.allow, true);
    const noPromote = core.decideProductWrite({
      gate: core.parseGate("off"),
      schemaReady: true,
      sources: ["legacy_external"],
      writerKind: core.WRITER_KIND.OPERATOR_CANONICAL,
    });
    assert.equal(noPromote.reason, core.REASON.LEGACY_NOT_PROMOTABLE);
  });

  it("dual env must all unlock before ALLOW_LEGACY", () => {
    const lockedEnv = {
      CATALOG_EXTERNAL_WRITE_GATE: "off",
      PRODUCTION_SOURCE_MODE: "operator_only",
      ALLOW_EXTERNAL_PRODUCT_INGEST: "true",
      ALLOW_LEGACY_EXTERNAL_WRITES: "true",
    };
    assert.equal(core.readSourceLockFromEnv(lockedEnv).engaged, true);
    const unlockedEnv = core.applyUnlockLegacyWrites({});
    assert.equal(core.readSourceLockFromEnv(unlockedEnv).engaged, false);
    const d = core.decideProductWrite({
      gate: core.parseGate("off"),
      schemaReady: true,
      sources: ["legacy_external"],
      env: unlockedEnv,
    });
    assert.equal(d.allow, true);
  });
});
