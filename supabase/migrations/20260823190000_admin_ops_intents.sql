-- REL-222 3-mode Admin Ops intents
-- APPLY_THIS_SLICE = NO · file only · production apply 0 (REL-701-DB)
-- This table stores preview/confirm/apply/rollback intent rows.
-- It is not a ledger. ledger_* INSERT/UPDATE from this REL = FAIL.

CREATE TABLE IF NOT EXISTS public.admin_ops_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family text NOT NULL
    CHECK (family IN (
      'policy',
      'bulk',
      'execution_rule',
      'wallet_operation',
      'risk_threshold'
    )),
  mode text NOT NULL
    CHECK (mode IN ('LIVE', 'DRY_RUN', 'SIMULATION')),
  stage text NOT NULL
    CHECK (stage IN ('preview', 'confirm', 'apply', 'result', 'rollback')),
  confirmed boolean NOT NULL DEFAULT false,
  impact_count integer NOT NULL DEFAULT 0
    CHECK (impact_count >= 0),
  reason text NOT NULL,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_ops_intents_reason_min
    CHECK (char_length(btrim(reason)) >= 10)
);

COMMENT ON TABLE public.admin_ops_intents IS
  'REL-222 3-mode ops intent · not ledger credit · LIVE confirm required';

CREATE OR REPLACE FUNCTION public.admin_ops_intents_forbid_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'admin_ops_intents delete forbidden'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS admin_ops_intents_forbid_delete
  ON public.admin_ops_intents;
CREATE TRIGGER admin_ops_intents_forbid_delete
  BEFORE DELETE ON public.admin_ops_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_ops_intents_forbid_delete();

ALTER TABLE public.admin_ops_intents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_ops_intents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_ops_intents TO service_role;
GRANT ALL ON TABLE public.admin_ops_intents TO postgres;

REVOKE ALL ON FUNCTION public.admin_ops_intents_forbid_delete()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ops_intents_forbid_delete()
  TO postgres, service_role;
