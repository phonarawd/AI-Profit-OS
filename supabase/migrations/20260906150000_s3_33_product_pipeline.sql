-- S3 / 3.3 상품 파이프라인
-- listings 재처리 중복 0 · unmatched identity review 내구성
-- Additive · production apply 는 S5 staging 이후.

CREATE UNIQUE INDEX IF NOT EXISTS listings_asset_market_external_uq
  ON public.listings (asset_id, market_id, external_item_id)
  NULLS NOT DISTINCT;

COMMENT ON INDEX public.listings_asset_market_external_uq IS
  '동일 listing/tick 재처리에서 listings 행이 늘지 않게 한다.';

CREATE TABLE IF NOT EXISTS public.identity_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key text NOT NULL,
  adapter_id text NOT NULL DEFAULT 'ebay',
  external_item_id text,
  listing_id text,
  title text,
  search_query text,
  reason text NOT NULL DEFAULT 'unmatched',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  queued_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT identity_review_queue_identity_key_uq UNIQUE (identity_key)
);

CREATE INDEX IF NOT EXISTS identity_review_queue_queued_idx
  ON public.identity_review_queue (queued_at DESC);

COMMENT ON TABLE public.identity_review_queue IS
  'eBay unmatched/ambiguous identity. Auto-publish 0. Process memory only 금지.';

ALTER TABLE public.identity_review_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.identity_review_queue FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.identity_review_queue TO postgres, service_role;
