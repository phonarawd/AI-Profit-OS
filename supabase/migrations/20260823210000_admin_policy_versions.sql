-- REL-224 Source/Parser health pointer + policy V1/V2/V3 + Founder override
-- APPLY_THIS_SLICE = NO · file only · production apply 0 (REL-701-DB)
-- Version rows are append-only. In-place payload overwrite = FAIL.

CREATE TABLE IF NOT EXISTS public.admin_policy_versions (
  policy_key text NOT NULL
    CHECK (policy_key IN ('source_parser', 'founder_override')),
  version_label text NOT NULL
    CHECK (version_label IN ('V1', 'V2', 'V3')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'NORMAL'
    CHECK (severity IN ('NORMAL', 'HIGH')),
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (policy_key, version_label),
  CONSTRAINT admin_policy_versions_reason_min
    CHECK (char_length(btrim(reason)) >= 10)
);

COMMENT ON TABLE public.admin_policy_versions IS
  'REL-224 immutable policy versions · rollback moves head only · not ledger';

CREATE TABLE IF NOT EXISTS public.admin_policy_heads (
  policy_key text PRIMARY KEY
    CHECK (policy_key IN ('source_parser', 'founder_override')),
  current_label text NOT NULL
    CHECK (current_label IN ('V1', 'V2', 'V3')),
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.admin_policy_versions_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'admin_policy_versions overwrite forbidden'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS admin_policy_versions_forbid_update
  ON public.admin_policy_versions;
CREATE TRIGGER admin_policy_versions_forbid_update
  BEFORE UPDATE OR DELETE ON public.admin_policy_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_policy_versions_forbid_mutation();

ALTER TABLE public.admin_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_policy_heads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_policy_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admin_policy_heads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.admin_policy_versions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_policy_heads TO service_role;
GRANT ALL ON TABLE public.admin_policy_versions TO postgres;
GRANT ALL ON TABLE public.admin_policy_heads TO postgres;

REVOKE ALL ON FUNCTION public.admin_policy_versions_forbid_mutation()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_policy_versions_forbid_mutation()
  TO postgres, service_role;
