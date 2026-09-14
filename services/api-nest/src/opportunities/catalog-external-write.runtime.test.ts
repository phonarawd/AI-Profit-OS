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
    gateRaw: "",
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

const listingPatch = {
  market_id: "ebay_us",
  external_item_id: "ext-op",
  price_usdt: "999",
};

describe("catalog-external-write core", () => {
  it("S1-A: 게이트 OFF · operator 없음 · 기본 OFF", () => {
    const gate = core.parseGate("");
    assert.equal(gate.ok, true);
    if (gate.ok) assert.equal(gate.engaged, false);
    const d = core.decideProductWrite({
      gate,
      schemaReady: true,
      sources: ["legacy_external"],
    });
    assert.equal(d.allow, true);
    assert.equal(d.reason, core.REASON.ALLOW_LEGACY);
  });

  it("S1-B: 게이트 OFF · operator 동일 asset 불변", async () => {
    const cat = fixture();
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

  it("S1-C: 다른 asset의 legacy는 갱신", async () => {
    const cat = fixture();
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

  it("S1-D: 게이트 ON이면 상품 쓰기 차단 · 결정만 (FX는 writer 밖)", async () => {
    const cat = fixture({ gateRaw: "on" });
    const leg = await cat.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "1",
    });
    const op = await cat.persistListing("op_asset", listingPatch);
    assert.equal(leg.wrote, false);
    assert.equal(leg.reason, core.REASON.GATE_ON);
    assert.equal(op.wrote, false);
    const seed = core.decideBootSeed({
      gate: core.parseGate("on"),
      schemaReady: true,
    });
    assert.equal(seed.allow, false);
    assert.equal(seed.reason, core.REASON.GATE_ON);
  });

  it("S1-E: ON→OFF 해도 operator 보호 유지 · legacy는 다시 허용", async () => {
    const cat = fixture({ gateRaw: "on" });
    await cat.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "1",
    });
    cat.setGateRaw("off");
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

  it("잘못된 게이트 값·컬럼 부재·정책 조회 실패는 쓰기 차단", async () => {
    assert.equal(core.parseGate("maybe").ok, false);
    const badGate = core.decideProductWrite({
      gate: core.parseGate("maybe"),
      schemaReady: true,
      sources: ["legacy_external"],
    });
    assert.equal(badGate.allow, false);
    assert.equal(badGate.reason, core.REASON.GATE_UNRESOLVED);

    const unready = fixture({ schemaReady: false, gateRaw: "off" });
    const u = await unready.persistListing("leg_asset", {
      market_id: "ebay_us",
      external_item_id: "ext-leg",
      price_usdt: "1",
    });
    assert.equal(u.wrote, false);
    assert.equal(u.reason, core.REASON.SCHEMA_UNREADY);

    const errCat = fixture({ schemaError: true, gateRaw: "off" });
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
    });
    assert.equal(invalid.allow, false);
    assert.equal(invalid.reason, core.REASON.SUPPLY_SOURCE_INVALID);

    const unread = core.decideProductWrite({
      gate: core.parseGate("off"),
      schemaReady: true,
      sources: [null],
    });
    assert.equal(unread.allow, false);
    assert.equal(unread.reason, core.REASON.SUPPLY_SOURCE_UNREADABLE);
  });

  it("공급원 변경 경합: 잠금 안에서 operator로 바뀌면 같은 TX 재평가로 쓰기 0", async () => {
    const cat = fixture();
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

  it("동시 ingest: operator는 둘 다 실패 · legacy는 직렬 성공", async () => {
    const cat = fixture();
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

  it("게이트 전환 경합: 잠금 안에서 ON이면 같은 TX 재평가로 차단", async () => {
    const cat = fixture({ gateRaw: "off" });
    const result = await cat.withAssetLock("leg_asset", async () => {
      cat.setGateRaw("on");
      return cat.persistListing("leg_asset", {
        market_id: "ebay_us",
        external_item_id: "ext-leg",
        price_usdt: "13",
      });
    });
    assert.equal(result.wrote, false);
    assert.equal(result.reason, core.REASON.GATE_ON);
    assert.equal(cat.snapshotAsset("leg_asset").listings[0].price_usdt, "50");
  });

  it("잠금 순서는 assets → opportunities", () => {
    assert.deepEqual(core.LOCK_ORDER, ["assets", "opportunities"]);
    assert.match(core.SQL.lockOpportunities, /ORDER BY id ASC/);
    assert.match(core.SQL.lockOpportunities, /FOR UPDATE/);
    assert.match(core.SQL.lockAsset, /FOR UPDATE/);
  });

  it("admin upsert blocks operator", async () => {
    const cat = fixture();
    const before = cat.snapshotAsset("op_asset");
    const first = await cat.upsertAsset("op_asset", { image_url: "https://cdn.example/x.jpg" });
    const retry = await cat.upsertAsset("op_asset", { image_url: "https://cdn.example/y.jpg" });
    assert.equal(first.wrote, false);
    assert.equal(first.reason, core.REASON.OPERATOR_PROTECTED);
    assert.equal(retry.wrote, false);
    assert.equal(cat.snapshotAsset("op_asset").asset.image_url, before.asset.image_url);
  });
  it("admin image and seed skip operator only", async () => {
    const cat = fixture();
    const op = await cat.applyAdminImage("op_asset", "https://cdn.example/r2.jpg");
    const leg = await cat.applyAdminImage("leg_asset", "https://cdn.example/r2-leg.jpg");
    assert.equal(op.wrote, false);
    assert.equal(leg.wrote, true);
  });
  it("patchPricing blocks operator", async () => {
    const cat = fixture();
    const op = await cat.patchPricing("op_asset", "opp-op", 99, "9.99");
    const leg = await cat.patchPricing("leg_asset", "opp-leg", 4, "0.88");
    assert.equal(op.wrote, false);
    assert.equal(leg.wrote, true);
    assert.equal(cat.snapshotAsset("op_asset").opportunities[0].pricing_version, 3);
  });
  it("gate and schema fail-closed for admin writers", async () => {
    const on = fixture({ gateRaw: "on" });
    assert.equal((await on.upsertAsset("leg_asset", { image_url: "x" })).reason, core.REASON.GATE_ON);
    const missing = fixture({ schemaReady: false, gateRaw: "off" });
    assert.equal((await missing.patchPricing("leg_asset", "opp-leg", 8, "1")).reason, core.REASON.SCHEMA_UNREADY);
    const fail = fixture({ schemaError: true, gateRaw: "off" });
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

});
