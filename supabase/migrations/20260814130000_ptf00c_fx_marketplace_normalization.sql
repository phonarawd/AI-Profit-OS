-- PTF-00C P0-A/P0-B — price denomination contract + FX marketplace normalization
-- Root cause: a non-USDT marketplace native amount (eBay EBAY_GB/DE/AU listing in
-- GBP/EUR/AUD, or even EBAY_US in USD) was stored directly under price_usdt/currency
-- and consumed as if it were already USDT. This migration makes the distinction
-- between nativeAmount/nativeCurrency and authoritative normalizedUsdt unambiguous
-- at the schema level (Engine §0.0.4.2 extension).

-- --- fx_snapshots: marketplace normalization legs ---
-- USD per 1 GBP/EUR/AUD (Frankfurter, inverted server-side via money.cjs divAmount)
-- and USDT per 1 USD (CoinGecko usdtUsd inverted) — never assume 1 USD == 1 USDT.
ALTER TABLE public.fx_snapshots
  ADD COLUMN IF NOT EXISTS gbp_usd numeric(18, 8),
  ADD COLUMN IF NOT EXISTS eur_usd numeric(18, 8),
  ADD COLUMN IF NOT EXISTS aud_usd numeric(18, 8),
  ADD COLUMN IF NOT EXISTS usdt_per_usd numeric(18, 8),
  ADD COLUMN IF NOT EXISTS rate_provenance jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.fx_snapshots.gbp_usd IS
  'USD per 1 GBP — Frankfurter base=USD rates.GBP inverted. Null = leg unavailable at compose time (fail-closed downstream, never fabricated).';
COMMENT ON COLUMN public.fx_snapshots.eur_usd IS 'USD per 1 EUR — see gbp_usd.';
COMMENT ON COLUMN public.fx_snapshots.aud_usd IS 'USD per 1 AUD — see gbp_usd.';
COMMENT ON COLUMN public.fx_snapshots.usdt_per_usd IS
  'USDT per 1 USD — CoinGecko usdtUsd inverted. 1 USD != 1 USDT is assumed false only via this leg, never by identity.';
COMMENT ON COLUMN public.fx_snapshots.rate_provenance IS
  'Per-leg {source, capturedAt} map for traceability (PTF-00C §3) — e.g. {"gbpUsd":{"source":"frankfurter","capturedAt":"..."}}.';

-- --- listings: distinguish nativeAmount/nativeCurrency from normalized price_usdt ---
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS native_amount numeric(36, 18),
  ADD COLUMN IF NOT EXISTS native_currency text,
  ADD COLUMN IF NOT EXISTS fx_snapshot_id text REFERENCES public.fx_snapshots (id),
  ADD COLUMN IF NOT EXISTS price_denomination_status text NOT NULL DEFAULT 'normalized';

COMMENT ON COLUMN public.listings.native_amount IS
  'Marketplace-native amount exactly as observed (decimal string authority) — PTF-00C P0-A.';
COMMENT ON COLUMN public.listings.native_currency IS
  'Marketplace-native currency (USD/GBP/EUR/AUD/USDT). price_usdt must equal native_amount only when this is USDT (identity).';
COMMENT ON COLUMN public.listings.fx_snapshot_id IS
  'fx_snapshots row used to normalize native_amount -> price_usdt. Null only when native_currency=USDT (no conversion needed).';
COMMENT ON COLUMN public.listings.price_denomination_status IS
  'normalized = price_usdt is a verified authoritative USDT value. legacy_unverified = pre-repair row where price_usdt cannot be trusted as normalized (see PTF-00C §5).';

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_price_denomination_status_chk;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_price_denomination_status_chk
  CHECK (price_denomination_status IN ('normalized', 'legacy_unverified'));

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_native_currency_chk;
ALTER TABLE public.listings
  ADD CONSTRAINT listings_native_currency_chk
  CHECK (native_currency IS NULL OR native_currency IN ('USD', 'GBP', 'EUR', 'AUD', 'USDT'));

-- --- Backfill existing rows BEFORE native_* become NOT NULL ---
-- currency='USDT' rows (Day-1 seed bundles) — already correct identity, no conversion.
UPDATE public.listings
SET native_amount = price_usdt,
    native_currency = 'USDT',
    price_denomination_status = 'normalized'
WHERE currency = 'USDT' AND native_amount IS NULL;

-- currency<>'USDT' rows — PTF-00C §5 contaminated data (P0-A confirmed via
-- Supabase inspection: 3 real ebay_us/EBAY_US listings for w_rolex_sub_126610ln,
-- observed_at=2026-08-11T18:50:39Z, currency=USD, price_usdt held the raw
-- unconverted USD number). No authoritative historical FX snapshot exists for
-- that observed_at (only fx_day1_runtime_seed, captured 2026-08-09, a USDT/KRW
-- display rate unrelated to USD/USDT — pre-dates and cannot correctly convert
-- these rows). Backfilling a "converted" value now would fabricate a rate that
-- did not exist at observation time — forbidden by policy. Preserve the true
-- native reading and mark the row unverified instead. price_usdt is left
-- byte-identical (no code path in services/api-nest reads listings.price_usdt
-- as a money-authoritative value today: opportunities.expected_profit_usdt /
-- opportunities.pricing are the only live pricing authority, and these 3 rows
-- are not referenced by any opportunities row).
UPDATE public.listings
SET native_amount = price_usdt,
    native_currency = currency,
    price_denomination_status = 'legacy_unverified'
WHERE currency <> 'USDT' AND native_amount IS NULL;

ALTER TABLE public.listings ALTER COLUMN native_amount SET NOT NULL;
ALTER TABLE public.listings ALTER COLUMN native_currency SET NOT NULL;

-- --- price_observations: same contract, kept consistent even though currently unused ---
-- (Confirmed via Supabase inspection: table has 0 rows / no INSERT path exists yet.
-- Adding the columns now avoids a second migration once it is wired up.)
ALTER TABLE public.price_observations
  ADD COLUMN IF NOT EXISTS native_amount numeric(36, 18),
  ADD COLUMN IF NOT EXISTS native_currency text,
  ADD COLUMN IF NOT EXISTS fx_snapshot_id text REFERENCES public.fx_snapshots (id),
  ADD COLUMN IF NOT EXISTS price_denomination_status text NOT NULL DEFAULT 'normalized'
    CHECK (price_denomination_status IN ('normalized', 'legacy_unverified'));

ALTER TABLE public.price_observations
  DROP CONSTRAINT IF EXISTS price_observations_native_currency_chk;
ALTER TABLE public.price_observations
  ADD CONSTRAINT price_observations_native_currency_chk
  CHECK (native_currency IS NULL OR native_currency IN ('USD', 'GBP', 'EUR', 'AUD', 'USDT'));
