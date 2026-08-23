-- REL-223 Allocation / Manual Match + Bulk/Schedule/Campaign
-- APPLY_THIS_SLICE = NO · file only · production apply 0 (REL-701-DB)
-- Control intents only. ledger_* INSERT/UPDATE from this REL = FAIL.

CREATE TABLE IF NOT EXISTS public.admin_match_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verb text NOT NULL
    CHECK (verb IN ('ALLOW', 'BLOCK', 'PAUSE', 'CANCEL', 'REASSIGN')),
  kind text NOT NULL
    CHECK (kind IN ('match', 'bulk', 'schedule', 'campaign')),
  mode text NOT NULL
    CHECK (mode IN ('LIVE', 'DRY_RUN', 'SIMULATION')),
  stage text NOT NULL
    CHECK (stage IN ('preview', 'confirm', 'apply', 'result', 'rollback')),
  confirmed boolean NOT NULL DEFAULT false,
  previewed boolean NOT NULL DEFAULT false,
  impact_count integer NOT NULL DEFAULT 0
    CHECK (impact_count >= 0),
  target_id uuid,
  reason text NOT NULL,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_match_controls_reason_min
    CHECK (char_length(btrim(reason)) >= 10),
  CONSTRAINT admin_match_controls_bulk_preview
    CHECK (
      kind = 'match'
      OR impact_count >= 1
    ),
  CONSTRAINT admin_match_controls_reassign_target
    CHECK (
      verb <> 'REASSIGN'
      OR target_id IS NOT NULL
    )
);

COMMENT ON TABLE public.admin_match_controls IS
  'REL-223 match/bulk control intent · not ledger credit · preview+confirm for LIVE';

CREATE OR REPLACE FUNCTION public.admin_match_controls_forbid_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'admin_match_controls delete forbidden'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS admin_match_controls_forbid_delete
  ON public.admin_match_controls;
CREATE TRIGGER admin_match_controls_forbid_delete
  BEFORE DELETE ON public.admin_match_controls
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_match_controls_forbid_delete();

ALTER TABLE public.admin_match_controls ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_match_controls FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_match_controls TO service_role;
GRANT ALL ON TABLE public.admin_match_controls TO postgres;

REVOKE ALL ON FUNCTION public.admin_match_controls_forbid_delete()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_match_controls_forbid_delete()
  TO postgres, service_role;
