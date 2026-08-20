-- SourceObservation durable append-only storage
-- SOURCE_OBSERVATION != LISTING_LEG
-- APPLY_THIS_SLICE = NO · file only · listings/price_observations 재사용 금지

CREATE TABLE IF NOT EXISTS public.source_observations (
  id text PRIMARY KEY,
  source text NOT NULL
    CHECK (source IN (
      'ebay',
      'fashionphile',
      'chrono24',
      'tcgplayer',
      'mercari_jp',
      'kream',
      'stockx',
      'goat',
      'bunjang',
      'vestiaire'
    )),
  external_item_id text NOT NULL,
  observation_purpose text NOT NULL
    CHECK (observation_purpose IN ('DISCOVERY', 'CONFIRMATION')),
  source_status text NOT NULL
    CHECK (source_status IN (
      'SUCCESS',
      'NOT_FOUND',
      'UNAVAILABLE',
      'OUT_OF_STOCK',
      'PARSE_FAILED',
      'AMBIGUOUS',
      'ACCESS_BLOCKED',
      'TEMPORARY_ERROR'
    )),
  url text NOT NULL,
  observed_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT source_observations_no_yahoo_chk CHECK (source IS DISTINCT FROM 'yahoo_jp')
);

CREATE INDEX IF NOT EXISTS source_observations_source_item_observed_idx
  ON public.source_observations (source, external_item_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS source_observations_observed_at_idx
  ON public.source_observations (observed_at DESC);

CREATE OR REPLACE FUNCTION public.source_observations_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'source_observations is append-only · INSERT only'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS source_observations_forbid_mutation ON public.source_observations;
CREATE TRIGGER source_observations_forbid_mutation
  BEFORE UPDATE OR DELETE ON public.source_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.source_observations_forbid_mutation();

ALTER TABLE public.source_observations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.source_observations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.source_observations TO postgres, service_role;

REVOKE ALL ON FUNCTION public.source_observations_forbid_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.source_observations_forbid_mutation() TO postgres, service_role;
