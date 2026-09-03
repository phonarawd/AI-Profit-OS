-- STAGING / NON-PRODUCTION ONLY
-- APPLY_THIS_SLICE = NO · production apply 0
-- Nest uses service_role for push_control / push_subscriptions.
-- Live: RLS OFF, anon/authenticated GRANT empty, service_role ALL, BYPASSRLS.
-- ENABLE-only without deny policies is FORBIDDEN.

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
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO service_role;
