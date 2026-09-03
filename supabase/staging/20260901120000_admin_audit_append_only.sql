-- STAGING / NON-PRODUCTION ONLY
-- APPLY_THIS_SLICE = NO · production apply 0 · production grant mutation 0
-- Live defect (2026-09-01 read-only): service_role has
-- DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE + BYPASSRLS
-- Repo intent: SELECT, INSERT only. UPDATE/DELETE trigger exists; TRUNCATE does not.

REVOKE ALL ON TABLE public.admin_audit_events FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.admin_audit_events FROM service_role;
GRANT SELECT, INSERT ON TABLE public.admin_audit_events TO service_role;
GRANT ALL ON TABLE public.admin_audit_events TO postgres;

CREATE OR REPLACE FUNCTION public.admin_audit_events_forbid_truncate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_events is append-only · TRUNCATE forbidden'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS admin_audit_events_forbid_truncate ON public.admin_audit_events;
CREATE TRIGGER admin_audit_events_forbid_truncate
  BEFORE TRUNCATE ON public.admin_audit_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.admin_audit_events_forbid_truncate();
