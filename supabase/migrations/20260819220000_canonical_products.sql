-- CanonicalProduct + PUTDUK PD durable storage
-- APPLY_THIS_SLICE = NO · file only · production apply 0
-- CanonicalProduct != SourceObservation != Listing != Opportunity

CREATE SEQUENCE IF NOT EXISTS public.putduk_product_code_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9999999
  NO CYCLE;

CREATE TABLE IF NOT EXISTS public.canonical_products (
  canonical_product_id text PRIMARY KEY,
  putduk_product_code text NOT NULL,
  category_profile text NOT NULL,
  canonical_identity_key text NOT NULL,
  canonical_attributes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active',
  identity_evidence_summary jsonb NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_products_pd_format_chk
    CHECK (putduk_product_code ~ '^PD-[0-9]{7}$'),
  CONSTRAINT canonical_products_pd_unique UNIQUE (putduk_product_code),
  CONSTRAINT canonical_products_identity_unique UNIQUE (category_profile, canonical_identity_key)
);

CREATE TABLE IF NOT EXISTS public.canonical_product_source_links (
  id bigserial PRIMARY KEY,
  canonical_product_id text NOT NULL
    REFERENCES public.canonical_products (canonical_product_id),
  source text NOT NULL,
  source_item_id text NOT NULL,
  source_url text,
  latest_observation_ref text NOT NULL
    REFERENCES public.source_observations (id),
  matching_decision text NOT NULL,
  matcher_version text NOT NULL,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_product_source_links_product_source_item_uq
    UNIQUE (canonical_product_id, source, source_item_id),
  CONSTRAINT canonical_product_source_links_observation_uq
    UNIQUE (latest_observation_ref)
);

CREATE INDEX IF NOT EXISTS canonical_products_identity_idx
  ON public.canonical_products (category_profile, canonical_identity_key);

CREATE OR REPLACE FUNCTION public.canonical_products_protect_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.canonical_product_id IS DISTINCT FROM OLD.canonical_product_id
     OR NEW.putduk_product_code IS DISTINCT FROM OLD.putduk_product_code
     OR NEW.canonical_identity_key IS DISTINCT FROM OLD.canonical_identity_key
     OR NEW.category_profile IS DISTINCT FROM OLD.category_profile
  THEN
    RAISE EXCEPTION 'canonical identity and PD are immutable'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS canonical_products_protect_immutable ON public.canonical_products;
CREATE TRIGGER canonical_products_protect_immutable
  BEFORE UPDATE ON public.canonical_products
  FOR EACH ROW
  EXECUTE FUNCTION public.canonical_products_protect_immutable();

ALTER TABLE public.canonical_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_product_source_links ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.canonical_products FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.canonical_product_source_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.canonical_products TO postgres, service_role;
GRANT ALL ON TABLE public.canonical_product_source_links TO postgres, service_role;

REVOKE ALL ON SEQUENCE public.putduk_product_code_seq FROM PUBLIC, anon, authenticated;
GRANT ALL ON SEQUENCE public.putduk_product_code_seq TO postgres, service_role;

REVOKE ALL ON SEQUENCE public.canonical_product_source_links_id_seq FROM PUBLIC, anon, authenticated;
GRANT ALL ON SEQUENCE public.canonical_product_source_links_id_seq TO postgres, service_role;

REVOKE ALL ON FUNCTION public.canonical_products_protect_immutable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.canonical_products_protect_immutable() TO postgres, service_role;
