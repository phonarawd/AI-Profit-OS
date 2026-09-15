"use strict";

require("reflect-metadata");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");

const nestRoot = path.resolve(__dirname, "..");
const ts = require(require.resolve("typescript", { paths: [nestRoot] }));
const origResolve = Module._resolveFilename;
const origTsExt = require.extensions[".ts"];
Module._resolveFilename = function (request, parent, isMain, options) {
  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    if (typeof request === "string" && request.startsWith(".") && !path.extname(request)) {
      const base = path.resolve(path.dirname(parent.filename), request);
      for (const ext of [".ts", ".js", ".cjs"]) {
        if (fs.existsSync(base + ext)) {
          return origResolve.call(this, request + ext, parent, isMain, options);
        }
      }
    }
    throw err;
  }
};

require.extensions[".ts"] = function (module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};

function uninstallTsHook() {
  Module._resolveFilename = origResolve;
  if (origTsExt) require.extensions[".ts"] = origTsExt;
  else delete require.extensions[".ts"];
}

const { AdaptersAdminService } = require("../adapters/adapters.admin.service.ts");
const { InProcessEventBus } = require("../events/in-process.bus.ts");
const { CatalogExternalWriteGuard } = require("./catalog-external-write.guard.ts");
const { CatalogRuntimeSeedService } = require("./catalog-runtime-seed.service.ts");

const GATE_ENV = "CATALOG_EXTERNAL_WRITE_GATE";
const prevGate = process.env[GATE_ENV];

function restoreGate() {
  if (prevGate == null) delete process.env[GATE_ENV];
  else process.env[GATE_ENV] = prevGate;
}

class FakeCatalogDb {
  constructor(schemaMode) {
    this.schemaMode = schemaMode;
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
    if (/FROM public\.assets/i.test(text) && /FOR UPDATE/i.test(text)) {
      return { rows: [{ asset_id: params[0] }], rowCount: 1 };
    }
    if (/FROM public\.opportunities/i.test(text) && /FOR UPDATE/i.test(text)) {
      return { rows: [{ id: "opp-iso", supply_source: "legacy_external" }], rowCount: 1 };
    }
    if (/FROM public\.listings/i.test(text)) return { rows: [], rowCount: 0 };
    if (
      /INSERT INTO public\.listings/i.test(text) ||
      /UPDATE public\.listings/i.test(text) ||
      /UPDATE public\.assets/i.test(text) ||
      /UPDATE public\.opportunities/i.test(text)
    ) {
      this.writes.push(text);
    }
    return { rows: [], rowCount: 0 };
  }
  async withTransaction(fn) {
    return fn({ query: (text, params) => this.query(text, params) });
  }
}

function adminListing() {
  return {
    assetId: "iso-legacy-asset",
    marketId: "ebay_us",
    adapterId: "admin",
    externalItemId: "iso-ext-1",
    title: "iso listing",
    priceUsdt: "50",
    nativeAmount: "50",
    nativeCurrency: "USDT",
    observedAt: "2026-09-13T14:00:00.000Z",
    imageUrl: "https://i." + "ebayimg.com/iso.jpg",
  };
}

function throwingSeed() {
  return {
    persistIngestListings: async () => {
      throw new Error("persistIngestListings must not run");
    },
    applyEbayImageProvenance: async () => {
      throw new Error("applyEbayImageProvenance must not run");
    },
  };
}

function makeGuard(db) {
  return new CatalogExternalWriteGuard(db);
}

function makeSeed(db, guard) {
  return new CatalogRuntimeSeedService(
    db,
    {},
    {
      getLatestUsableSnapshot: async () => {
        throw new Error("snapshot lookup must not run for USDT listings");
      },
    },
    {
      repriceFromCurrentListings: async () => {
        throw new Error("reprice must not run when persist wrote 0");
      },
    },
    guard,
  );
}

function makeAdapters(opts) {
  return new AdaptersAdminService(
    new InProcessEventBus(),
    {
      recordTick: async (input) => {
        opts.ticks.push(input);
        return { providerId: "ebay" };
      },
    },
    opts.seed,
    {
      recordFxIngest: async (input) => {
        opts.fxCalls.push(input);
        return { snapshotId: "fx-iso", created: true, ok: true };
      },
    },
    opts.guard,
  );
}

async function main() {
  try {
    process.env[GATE_ENV] = "off";
    const readyDb = new FakeCatalogDb("ready");
    const readyGuard = makeGuard(readyDb);
    const readySeed = makeSeed(readyDb, readyGuard);
    const wrote = await readySeed.persistIngestListings([adminListing()], "admin");
    assert.equal(wrote.upserted, 1);
    assert.ok(readyDb.writes.some((s) => /INSERT INTO public\.listings/i.test(s)));
    console.log("PASS control persist insert");

    process.env[GATE_ENV] = "on";
    const gateDb = new FakeCatalogDb("ready");
    const gateTicks = [];
    const gateFx = [];
    const gateAdapters = makeAdapters({
      guard: makeGuard(gateDb),
      seed: throwingSeed(),
      ticks: gateTicks,
      fxCalls: gateFx,
    });
    const gateEbay = await gateAdapters.ingest({
      adapterId: "ebay",
      listings: [adminListing()],
      marketplaceHealth: [
        { marketplaceId: "EBAY_US", attempted: 2, successCount: 2, failureCount: 0 },
      ],
      providerTickId: "iso-gate-on",
      observedAt: "2026-09-13T14:00:00.000Z",
    });
    assert.equal(gateEbay.ok, true);
    assert.equal(gateEbay.listingsPersisted ?? 0, 0);
    assert.equal(gateEbay.productWrite.status, "blocked");
    assert.equal(gateEbay.productWrite.reason, "GATE_ON");
    assert.ok(gateTicks.length >= 1);
    const gatePersist = await makeSeed(gateDb, makeGuard(gateDb)).persistIngestListings(
      [adminListing()],
      "admin",
    );
    assert.equal(gatePersist.upserted, 0);
    assert.equal(gateDb.writes.length, 0);
    const gateFxRes = await gateAdapters.ingest({
      adapterId: "coingecko",
      fx: { usdtKrw: "1350" },
      observedAt: "2026-09-13T14:00:00.000Z",
    });
    assert.equal(gateFxRes.fxSnapshotId, "fx-iso");
    assert.equal(gateFx.length, 1);
    console.log("PASS gate ON keeps heartbeat and FX");

    process.env[GATE_ENV] = "maybe";
    const unresolvedGuard = makeGuard(new FakeCatalogDb("ready"));
    const pre = unresolvedGuard.preflightProductWrites();
    assert.equal(pre.skipAll, true);
    assert.equal(pre.reason, "GATE_UNRESOLVED");
    const unresolvedTicks = [];
    const unresolvedFx = [];
    const unresolvedAdapters = makeAdapters({
      guard: unresolvedGuard,
      seed: throwingSeed(),
      ticks: unresolvedTicks,
      fxCalls: unresolvedFx,
    });
    const unresolvedEbay = await unresolvedAdapters.ingest({
      adapterId: "ebay",
      listings: [adminListing()],
      marketplaceHealth: [
        { marketplaceId: "EBAY_GB", attempted: 1, successCount: 1, failureCount: 0 },
      ],
      providerTickId: "iso-unresolved",
    });
    assert.equal(unresolvedEbay.ok, true);
    assert.equal(unresolvedEbay.productWrite.status, "blocked");
    assert.equal(unresolvedEbay.productWrite.reason, "GATE_UNRESOLVED");
    assert.ok(unresolvedTicks.length >= 1);
    const unresolvedPersist = await makeSeed(
      new FakeCatalogDb("ready"),
      unresolvedGuard,
    ).persistIngestListings([adminListing()], "admin");
    assert.equal(unresolvedPersist.upserted, 0);
    await unresolvedAdapters.ingest({
      adapterId: "frankfurter",
      fx: { usdKrw: "1350" },
      observedAt: "2026-09-13T14:00:00.000Z",
    });
    assert.equal(unresolvedFx.length, 1);
    console.log("PASS unresolved gate keeps heartbeat and FX");

    process.env[GATE_ENV] = "off";
    const missingDb = new FakeCatalogDb("missing");
    const missingGuard = makeGuard(missingDb);
    const missingSeed = makeSeed(missingDb, missingGuard);
    const missingPersist = await missingSeed.persistIngestListings([adminListing()], "admin");
    assert.equal(missingPersist.upserted, 0);
    assert.equal(missingDb.writes.length, 0);
    const missingImage = await missingSeed.applyEbayImageProvenance({
      assetId: "iso-legacy-asset",
      imageUrl: "https://i." + "ebayimg.com/iso.jpg",
    });
    assert.equal(missingImage.ok, false);
    const missingTicks = [];
    const missingFx = [];
    const missingAdapters = makeAdapters({
      guard: missingGuard,
      seed: missingSeed,
      ticks: missingTicks,
      fxCalls: missingFx,
    });
    const missingEbay = await missingAdapters.ingest({
      adapterId: "ebay",
      listings: [adminListing()],
      marketplaceHealth: [
        {
          marketplaceId: "EBAY_US",
          attempted: 1,
          successCount: 0,
          failureCount: 1,
          errorClass: "timeout",
        },
      ],
      providerTickId: "iso-schema-missing",
    });
    assert.equal(missingEbay.ok, true);
    assert.ok(missingTicks.length >= 1);
    await missingAdapters.ingest({
      adapterId: "coingecko",
      fx: { usdtKrw: "1400" },
      observedAt: "2026-09-13T14:00:01.000Z",
    });
    assert.equal(missingFx.length, 1);
    console.log("PASS missing column keeps heartbeat and FX");

    const failDb = new FakeCatalogDb("query_fail");
    const failGuard = makeGuard(failDb);
    const failSeed = makeSeed(failDb, failGuard);
    const failPersist = await failSeed.persistIngestListings([adminListing()], "admin");
    assert.equal(failPersist.upserted, 0);
    const failTicks = [];
    const failFx = [];
    const failAdapters = makeAdapters({
      guard: failGuard,
      seed: failSeed,
      ticks: failTicks,
      fxCalls: failFx,
    });
    const failEbay = await failAdapters.ingest({
      adapterId: "ebay",
      listings: [adminListing()],
      marketplaceHealth: [
        { marketplaceId: "EBAY_US", attempted: 3, successCount: 3, failureCount: 0 },
      ],
      providerTickId: "iso-schema-query-fail",
    });
    assert.equal(failEbay.ok, true);
    assert.ok(failTicks.length >= 1);
    await failAdapters.ingest({
      adapterId: "coingecko",
      fx: { usdtKrw: "1410" },
      observedAt: "2026-09-13T14:00:02.000Z",
    });
    assert.equal(failFx.length, 1);
    console.log("PASS schema query fail keeps heartbeat and FX");

    const cutTicks = [];
    const cutAdapters = makeAdapters({
      guard: makeGuard(new FakeCatalogDb("ready")),
      seed: {
        persistIngestListings: async () => {
          throw new Error("forced persist throw");
        },
        applyEbayImageProvenance: async () => ({ ok: true }),
      },
      ticks: cutTicks,
      fxCalls: [],
    });
    const cutRes = await cutAdapters.ingest({
      adapterId: "ebay",
      listings: [adminListing()],
      marketplaceHealth: [
        { marketplaceId: "EBAY_US", attempted: 1, successCount: 1, failureCount: 0 },
      ],
      providerTickId: "iso-cut-off",
    });
    assert.equal(cutRes.ok, false);
    assert.equal(cutRes.productWrite.status, "failed");
    assert.equal(cutRes.productWrite.reason, "PERSIST_EXCEPTION");
    assert.match(String(cutRes.productWrite.error || ""), /forced persist throw/);
    assert.equal(cutRes.listingsPersisted ?? 0, 0);
    assert.ok(cutTicks.length >= 1);
    console.log("PASS persist throw records failure and keeps heartbeat");
    console.log("[catalog-external-write.ingest-isolation] ALL PASS");
  } finally {
    restoreGate();
    uninstallTsHook();
  }
}

if (require.main === module) {
  main().catch((err) => {
    restoreGate();
    uninstallTsHook();
    console.error("[catalog-external-write.ingest-isolation] FAIL");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
