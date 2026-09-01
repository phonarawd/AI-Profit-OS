-- Money §43.6 — single-use withdraw step-up bearer proof.
-- Forward migration only. This file does not apply itself and performs no
-- Production mutation unless the normal Founder-gated migration path later runs it.
--
-- consumed_at = proof challenge successfully verified.
-- token_consumed_at = the issued stepUpToken was spent at exactly one protected action.

ALTER TABLE public.withdraw_stepup_challenges
  ADD COLUMN IF NOT EXISTS token_consumed_at timestamptz;

COMMENT ON COLUMN public.withdraw_stepup_challenges.token_consumed_at IS
  'Money §43.6 one-time step-up token spend marker; NULL until protected action consumes token';

CREATE INDEX IF NOT EXISTS withdraw_stepup_challenges_token_unspent_idx
  ON public.withdraw_stepup_challenges (user_id, id)
  WHERE consumed_at IS NOT NULL AND token_consumed_at IS NULL;
