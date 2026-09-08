-- Global source unlock · additive observation sources (feelway · coupang)
-- SSOT: governance/global-product/global-source-unlock-authorization.v1.md

ALTER TABLE public.source_observations DROP CONSTRAINT IF EXISTS source_observations_source_check;

ALTER TABLE public.source_observations
  ADD CONSTRAINT source_observations_source_check
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
    'vestiaire',
    'feelway',
    'coupang',
    'cardpick',
    'pokahub',
    'snkrdunk',
    'the_realreal',
    'cardmarket',
    'pokard'
  ));
