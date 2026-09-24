-- PUTDUK PHASE20 — trial repeatability compatibility
-- trial_program_config and trial_user_state allow up to 3 participations.
-- A single welcome grant is reusable trial capital, so the mining session FK
-- must not force a one-grant/one-session relationship.

ALTER TABLE public.mine_trial_sessions
  DROP CONSTRAINT IF EXISTS mine_trial_sessions_trial_grant_id_key;

CREATE INDEX IF NOT EXISTS mine_trial_sessions_trial_grant_idx
  ON public.mine_trial_sessions(trial_grant_id, created_at DESC)
  WHERE trial_grant_id IS NOT NULL;

COMMENT ON COLUMN public.mine_trial_sessions.trial_grant_id IS
  'Welcome trial capital source. One grant may fund multiple sequential trial sessions within trial_user_state limits.';
