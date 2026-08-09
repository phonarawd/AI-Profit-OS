-- Engine §0.9 E-R6 · Day-1 FX snapshot bootstrap for opportunity FK
-- Insert-only when fx_snapshots empty · Nest catalog runtime seed may upsert same id
-- Rates = deterministic Day-1 placeholder (coingecko path) · live adapter refresh owns later ticks

INSERT INTO public.fx_snapshots (
  id,
  usd_krw,
  source,
  captured_at,
  formula_id,
  sources,
  usdt_usd,
  usd_krw_frank
)
SELECT
  'fx_day1_runtime_seed',
  1380.000000,
  'coingecko',
  now(),
  'cg_usdt_krw',
  ARRAY['coingecko']::text[],
  NULL,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM public.fx_snapshots LIMIT 1);

COMMENT ON TABLE public.fx_snapshots IS
  'FX snapshots · Day-1 bootstrap id=fx_day1_runtime_seed when empty · formula SSOT=market-intelligence composeFxSnapshot';
