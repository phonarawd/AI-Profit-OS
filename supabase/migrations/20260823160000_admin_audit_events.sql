-- REL-405 Admin audit foundation
-- APPLY_THIS_SLICE = NO · file only · production apply 0 (REL-701-DB)
-- append-only · RLS deny-all · delete/update FORBIDDEN

CREATE TABLE IF NOT EXISTS public.admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_key text NOT NULL,
  actor_id uuid,
  role text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL DEFAULT 'n/a'
    CHECK (mode IN ('LIVE', 'DRY_RUN', 'SIMULATION', 'n/a')),
  result text NOT NULL
    CHECK (result IN ('preview', 'applied', 'denied', 'rolled_back')),
  reason text,
  idempotency_key text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_events_idem_uq UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS admin_audit_events_occurred_at_idx
  ON public.admin_audit_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_events_actor_key_idx
  ON public.admin_audit_events (actor_key, occurred_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_events_result_idx
  ON public.admin_audit_events (result, occurred_at DESC);

COMMENT ON TABLE public.admin_audit_events IS
  'REL-405 central admin audit · who/what/target/time/mode/result · PII/token/money reconstruct 0';

CREATE OR REPLACE FUNCTION public.admin_audit_events_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_events is append-only · INSERT only'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS admin_audit_events_forbid_mutation ON public.admin_audit_events;
CREATE TRIGGER admin_audit_events_forbid_mutation
  BEFORE UPDATE OR DELETE ON public.admin_audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_audit_events_forbid_mutation();

ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_audit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.admin_audit_events TO service_role;
GRANT ALL ON TABLE public.admin_audit_events TO postgres;

REVOKE ALL ON FUNCTION public.admin_audit_events_forbid_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_events_forbid_mutation() TO postgres, service_role;
