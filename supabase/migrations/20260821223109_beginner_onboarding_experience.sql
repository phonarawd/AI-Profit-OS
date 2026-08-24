ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS beginner_onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.user_profiles.beginner_onboarding_completed_at IS
  'Durable beginner onboarding completion. localStorage is resume only.';
