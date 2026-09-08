-- Additive imageSource: fashionphile observation photos
-- SOURCE_OBSERVATION != LISTING_LEG · settlement listing unchanged

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_image_source_check;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_image_source_check
  CHECK (image_source = ANY (ARRAY[
    'ebay'::text,
    'pokemontcg'::text,
    'ygoprodeck'::text,
    'admin_r2'::text,
    'fashionphile'::text
  ]));

ALTER TABLE public.opportunities DROP CONSTRAINT IF EXISTS opportunities_asset_image_source_check;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_asset_image_source_check
  CHECK (asset_image_source = ANY (ARRAY[
    'ebay'::text,
    'pokemontcg'::text,
    'ygoprodeck'::text,
    'admin_r2'::text,
    'fashionphile'::text
  ]));
