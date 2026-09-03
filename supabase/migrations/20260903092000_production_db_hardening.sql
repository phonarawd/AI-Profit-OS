-- REL-701-DB Production DB hardening source.
-- SOURCE ONLY in release closure. Production apply requires explicit Founder authorization.
-- Rehearsed on isolated staging via supabase/staging/20260901120000_admin_audit_append_only.sql,
-- supabase/staging/20260901120100_push_rls.sql, and owner-scoped default ACL proof.
-- Idempotent / forward-safe. No customer-data writes.
-- Migration version is intentionally newer than live head 20260902155632.

-- Admin audit: append-only surface. service_role = SELECT + INSERT only.
ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_audit_events FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.admin_audit_events FROM service_role;
GRANT SELECT, INSERT ON TABLE public.admin_audit_events TO service_role;
GRANT ALL ON TABLE public.admin_audit_events TO postgres;

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

DROP TRIGGER IF EXISTS admin_audit_events_forbid_mutation
  ON public.admin_audit_events;
CREATE TRIGGER admin_audit_events_forbid_mutation
  BEFORE UPDATE OR DELETE ON public.admin_audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_audit_events_forbid_mutation();

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

DROP TRIGGER IF EXISTS admin_audit_events_forbid_truncate
  ON public.admin_audit_events;
CREATE TRIGGER admin_audit_events_forbid_truncate
  BEFORE TRUNCATE ON public.admin_audit_events
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.admin_audit_events_forbid_truncate();

REVOKE ALL ON FUNCTION public.admin_audit_events_forbid_mutation()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_audit_events_forbid_truncate()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_audit_events_forbid_mutation()
  TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.admin_audit_events_forbid_truncate()
  TO postgres, service_role;

-- Push control/subscriptions: browser roles default-deny; Nest service_role only.
ALTER TABLE public.push_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_control FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_control_deny_anon ON public.push_control;
DROP POLICY IF EXISTS push_control_deny_authenticated ON public.push_control;
CREATE POLICY push_control_deny_anon ON public.push_control
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY push_control_deny_authenticated ON public.push_control
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS push_subscriptions_deny_anon ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_deny_authenticated ON public.push_subscriptions;
CREATE POLICY push_subscriptions_deny_anon ON public.push_subscriptions
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY push_subscriptions_deny_authenticated ON public.push_subscriptions
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.push_control FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.push_subscriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.push_control FROM service_role;
REVOKE ALL ON TABLE public.push_subscriptions FROM service_role;
GRANT SELECT, UPDATE ON TABLE public.push_control TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.push_subscriptions TO service_role;

-- Future application-owned public tables: current app owner is postgres only.
-- Supabase-managed supabase_admin defaults are observed/reported, not mutated here.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
