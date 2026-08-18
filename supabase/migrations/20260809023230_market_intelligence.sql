-- Engine §0.0 market-intelligence
-- Asset Master pipeline tables · FX snapshot formula columns · yahoo_jp FORBIDDEN

-- --- fx_snapshots: formulaId + sources[] (ADR-008 / §0.0.4.2) ---
ALTER TABLE public.fx_snapshots
  ADD COLUMN IF NOT EXISTS formula_id text,
  ADD COLUMN IF NOT EXISTS sources text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS usdt_usd numeric(18, 8),
  ADD COLUMN IF NOT EXISTS usd_krw_frank numeric(18, 6);

UPDATE public.fx_snapshots
SET
  formula_id = COALESCE(formula_id, 'cg_usdt_krw'),
  sources = CASE
    WHEN sources IS NULL OR cardinality(sources) = 0 THEN ARRAY['coingecko']::text[]
    ELSE sources
  END
WHERE formula_id IS NULL OR cardinality(sources) = 0;

ALTER TABLE public.fx_snapshots
  ALTER COLUMN formula_id SET NOT NULL;

ALTER TABLE public.fx_snapshots
  DROP CONSTRAINT IF EXISTS fx_snapshots_formula_id_chk;

ALTER TABLE public.fx_snapshots
  ADD CONSTRAINT fx_snapshots_formula_id_chk
  CHECK (formula_id IN ('cg_usdt_krw', 'cg_usdt_usd__frank_usd_krw'));

ALTER TABLE public.fx_snapshots
  DROP CONSTRAINT IF EXISTS fx_snapshots_sources_no_yahoo_chk;

ALTER TABLE public.fx_snapshots
  ADD CONSTRAINT fx_snapshots_sources_no_yahoo_chk
  CHECK (NOT ('yahoo_jp' = ANY (sources)));

-- --- listings (ebay marketplace × N | admin) ---
CREATE TABLE IF NOT EXISTS public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.assets (asset_id) ON DELETE CASCADE,
  market_id text NOT NULL
    CHECK (market_id IN ('ebay_us', 'ebay_gb', 'ebay_de', 'ebay_au', 'admin')),
  adapter_id text NOT NULL
    CHECK (adapter_id IN ('ebay', 'admin')),
  marketplace_id text,
  external_item_id text,
  title text,
  price_usdt numeric(36, 18) NOT NULL CHECK (price_usdt >= 0),
  currency text NOT NULL DEFAULT 'USDT',
  url text,
  image_url text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  stale_at timestamptz NOT NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listings_no_yahoo_chk CHECK (
    market_id IS DISTINCT FROM 'yahoo_jp'
    AND adapter_id IS DISTINCT FROM 'yahoo_jp'
  ),
  CONSTRAINT listings_ebay_marketplace_chk CHECK (
    adapter_id <> 'ebay'
    OR marketplace_id IN ('EBAY_US', 'EBAY_GB', 'EBAY_DE', 'EBAY_AU')
  )
);

CREATE INDEX IF NOT EXISTS listings_asset_id_idx ON public.listings (asset_id);
CREATE INDEX IF NOT EXISTS listings_market_stale_idx ON public.listings (market_id, stale_at);

-- --- price_observations (all ACTIVE sources · catalog refs included) ---
CREATE TABLE IF NOT EXISTS public.price_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.assets (asset_id) ON DELETE CASCADE,
  source text NOT NULL
    CHECK (source IN (
      'ebay', 'admin', 'pokemontcg', 'ygoprodeck', 'coingecko', 'frankfurter'
    )),
  marketplace_id text,
  price_usdt numeric(36, 18),
  currency text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_observations_no_yahoo_chk CHECK (source IS DISTINCT FROM 'yahoo_jp'),
  CONSTRAINT price_observations_ebay_marketplace_chk CHECK (
    source <> 'ebay'
    OR marketplace_id IN ('EBAY_US', 'EBAY_GB', 'EBAY_DE', 'EBAY_AU')
  )
);

CREATE INDEX IF NOT EXISTS price_observations_asset_src_idx
  ON public.price_observations (asset_id, source, observed_at DESC);

-- --- historical_spreads (sellSuccessRate display-only · Rule input FORBIDDEN) ---
CREATE TABLE IF NOT EXISTS public.historical_spreads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.assets (asset_id) ON DELETE CASCADE,
  buy_market_id text NOT NULL
    CHECK (buy_market_id IN ('ebay_us', 'ebay_gb', 'ebay_de', 'ebay_au', 'admin')),
  sell_market_id text NOT NULL
    CHECK (sell_market_id IN ('ebay_us', 'ebay_gb', 'ebay_de', 'ebay_au', 'admin')),
  window_days integer NOT NULL DEFAULT 30 CHECK (window_days > 0),
  success_rate numeric(8, 6),
  sample_count integer NOT NULL DEFAULT 0 CHECK (sample_count >= 0),
  as_of timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT historical_spreads_no_yahoo_chk CHECK (
    buy_market_id IS DISTINCT FROM 'yahoo_jp'
    AND sell_market_id IS DISTINCT FROM 'yahoo_jp'
  ),
  CONSTRAINT historical_spreads_pair_uq UNIQUE (
    asset_id, buy_market_id, sell_market_id, window_days
  )
);

-- --- opportunity admin filter columns (computed also OK; stored for list indexes) ---
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS grade_mismatch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_missing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capital_band text
    CHECK (capital_band IS NULL OR capital_band IN (
      'micro', 'small', 'mid', 'high', 'whale'
    ));

CREATE INDEX IF NOT EXISTS opportunities_admin_filters_idx
  ON public.opportunities (
    status,
    capital_band,
    grade_mismatch,
    image_missing
  );

-- RLS (Nest service_role / bypass · anon deny)
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_spreads ENABLE ROW LEVEL SECURITY;
