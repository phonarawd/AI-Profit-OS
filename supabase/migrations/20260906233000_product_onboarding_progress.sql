-- Product onboarding progress (server SoT).
-- Additive · backward compatible. localStorage is resume cache only.
-- Nest service_role only. Anon/authenticated direct access 0.

CREATE TABLE IF NOT EXISTS public.product_onboarding (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  version integer NOT NULL,
  current_step smallint NOT NULL DEFAULT 1
    CHECK (current_step BETWEEN 1 AND 7),
  state text NOT NULL DEFAULT 'in_progress'
    CHECK (state IN ('in_progress', 'completed')),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, version),
  CONSTRAINT product_onboarding_completed_chk CHECK (
    (state = 'completed' AND completed_at IS NOT NULL)
    OR (state = 'in_progress' AND completed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS product_onboarding_user_state_idx
  ON public.product_onboarding (user_id, state);

COMMENT ON TABLE public.product_onboarding IS
  'Product education progress. Server SoT. localStorage is resume cache only.';

ALTER TABLE public.product_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_onboarding FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_onboarding_deny_anon ON public.product_onboarding;
DROP POLICY IF EXISTS product_onboarding_deny_authenticated ON public.product_onboarding;
CREATE POLICY product_onboarding_deny_anon ON public.product_onboarding
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY product_onboarding_deny_authenticated ON public.product_onboarding
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE public.product_onboarding FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_onboarding TO postgres, service_role;
