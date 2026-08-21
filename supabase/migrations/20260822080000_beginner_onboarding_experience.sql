-- Durable beginner onboarding / funding-experience gate.
-- Bypass = beginner_onboarding_completed_at OR completed KRW/USDT funding.
-- Balance inference 0. pending/failed/cancelled is not experience.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS beginner_onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.user_profiles.beginner_onboarding_completed_at IS
  'Durable beginner onboarding completion. localStorage is resume only.';
