/**
 * One-shot §0.9 E-R6 catalog runtime seed against DATABASE_URL.
 * Uses same builders as Nest CatalogRuntimeSeedService (no Nest boot).
 */
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "../..");
// pg lives in api-nest workspace (root tooling has no direct dep)
const { Client } = require(path.join(
  root,
  "services/api-nest/node_modules/pg",
));
const write = require(path.join(
  root,
  "services/api-nest/src/opportunities/opportunity-write.cjs",
));

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

loadEnv();

const mi = require(path.join(
  root,
  "services/market-intelligence/src/index.cjs",
));

async function upsertAsset(client, asset) {
  await client.query(
    `INSERT INTO public.assets (
       asset_id, category, asset_label, image_url, image_source,
       image_alt_ko, image_rights_note_ko, image_fetched_at, meta
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     ON CONFLICT (asset_id) DO UPDATE SET
       category = EXCLUDED.category,
       asset_label = EXCLUDED.asset_label,
       image_url = EXCLUDED.image_url,
       image_source = EXCLUDED.image_source,
       image_alt_ko = EXCLUDED.image_alt_ko,
       image_fetched_at = EXCLUDED.image_fetched_at,
       meta = EXCLUDED.meta,
       updated_at = now()`,
    [
      asset.assetId,
      asset.category,
      asset.assetLabel,
      asset.imageUrl,
      asset.imageSource,
      asset.imageAltKo,
      asset.imageRightsNoteKo,
      asset.imageFetchedAt,
      JSON.stringify(asset.meta || {}),
    ],
  );
}

async function upsertListing(client, L) {
  // PTF-00C P0-A — this seed script only ever ingests buildEbayIngestListing
  // output (nativeCurrency=USDT identity, no FX lookup needed/possible from
  // a Nest-less one-shot script). A non-USDT row here would be a bug in the
  // seed builders, not something this script can safely FX-normalize.
  const { rows } = mi.normalizeIngestListingsForPersist([L], "ebay");
  const row = rows[0];
  if (!row) return false;
  if (row.nativeCurrency !== "USDT") {
    throw new Error(
      `seed:catalog-runtime only supports USDT-denominated seed listings, got ${row.nativeCurrency}`,
    );
  }
  const priceUsdt = row.nativeAmount;
  const existing = await client.query(
    `SELECT id::text FROM public.listings
      WHERE asset_id = $1 AND market_id = $2
        AND external_item_id IS NOT DISTINCT FROM $3
      LIMIT 1`,
    [row.assetId, row.marketId, row.externalItemId],
  );
  if (existing.rows[0]) {
    await client.query(
      `UPDATE public.listings SET
         price_usdt = $2::numeric, currency = 'USDT',
         native_amount = $2::numeric, native_currency = 'USDT',
         fx_snapshot_id = NULL, price_denomination_status = 'normalized',
         title = $3, url = $4,
         image_url = $5, observed_at = $6::timestamptz, stale_at = $7::timestamptz,
         marketplace_id = $8, adapter_id = $9, raw = $10::jsonb, updated_at = now()
       WHERE id = $1::uuid`,
      [
        existing.rows[0].id,
        priceUsdt,
        row.title,
        row.url,
        row.imageUrl,
        row.observedAt,
        row.staleAt,
        row.marketplaceId,
        row.adapterId,
        JSON.stringify(row.raw),
      ],
    );
  } else {
    await client.query(
      `INSERT INTO public.listings (
         asset_id, market_id, adapter_id, marketplace_id, external_item_id,
         title, price_usdt, currency, native_amount, native_currency,
         fx_snapshot_id, price_denomination_status, url, image_url,
         observed_at, stale_at, raw
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7::numeric,'USDT',$7::numeric,'USDT',
         NULL,'normalized',$8,$9,
         $10::timestamptz,$11::timestamptz,$12::jsonb
       )`,
      [
        row.assetId,
        row.marketId,
        row.adapterId,
        row.marketplaceId,
        row.externalItemId,
        row.title,
        priceUsdt,
        row.url,
        row.imageUrl,
        row.observedAt,
        row.staleAt,
        JSON.stringify(row.raw),
      ],
    );
  }
  return true;
}

async function upsertOpportunity(client, opp) {
  const result = await write.insertIfAbsentByAssetId(client, opp);
  return result.inserted;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[seed:catalog-runtime] DATABASE_URL unset");
    process.exit(1);
  }

  const plan = mi.buildMinCatalogRuntimeSeed();
  if (plan.forbiddenInsertAttempts.length !== 0) {
    throw new Error("forbiddenInsertAttempts must be 0");
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  await client.connect();

  try {
    const fx = plan.fx;
    await client.query(
      `INSERT INTO public.fx_snapshots (
         id, usd_krw, source, captured_at, formula_id, sources, usdt_usd, usd_krw_frank
       ) VALUES ($1,$2::numeric,$3,$4::timestamptz,$5,$6::text[],NULL,NULL)
       ON CONFLICT (id) DO NOTHING`,
      [
        fx.fxSnapshotId,
        fx.usdKrw,
        "coingecko",
        fx.capturedAt,
        fx.formulaId,
        fx.sources,
      ],
    );

    let assets = 0;
    for (const asset of plan.assets) {
      await upsertAsset(client, asset);
      assets += 1;
    }

    let listings = 0;
    let opps = 0;
    let available = 0;
    let crTrue = 0;
    for (const bundle of plan.bundles) {
      for (const L of bundle.listings) {
        if (await upsertListing(client, L)) listings += 1;
      }
      if (await upsertOpportunity(client, bundle.opportunity)) opps += 1;
      if (bundle.opportunity.status === "available") available += 1;
      if (bundle.opportunity.pricing.compareReady === true) crTrue += 1;
    }

    const counts = await client.query(
      `SELECT
         (SELECT count(*)::int FROM public.assets) AS assets,
         (SELECT count(*)::int FROM public.listings) AS listings,
         (SELECT count(*)::int FROM public.opportunities) AS opportunities,
         (SELECT count(*)::int FROM public.opportunities WHERE status='available') AS available`,
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          seeded: { assets, listings, opportunities: opps, available, crTrue },
          db: counts.rows[0],
          forbiddenInsertAttempts: 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[seed:catalog-runtime] FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
});
