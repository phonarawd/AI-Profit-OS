-- Engine §47.16.6 — additive advisory naming for shadow_replay_runs
-- FAIL_ACTION value "block_settlement" + existing CHECK constraints: UNCHANGED
-- New columns clarify drift fail is advisory-only (settlement engine NOT wired)

ALTER TABLE public.shadow_replay_runs
  ADD COLUMN IF NOT EXISTS drift_advisory_only boolean NOT NULL DEFAULT true;

ALTER TABLE public.shadow_replay_runs
  ADD COLUMN IF NOT EXISTS contract_label text NOT NULL DEFAULT 'drift_advisory_only';

ALTER TABLE public.shadow_replay_runs
  DROP CONSTRAINT IF EXISTS shadow_replay_contract_label_chk;

ALTER TABLE public.shadow_replay_runs
  ADD CONSTRAINT shadow_replay_contract_label_chk
  CHECK (contract_label = 'drift_advisory_only');

ALTER TABLE public.shadow_replay_runs
  DROP CONSTRAINT IF EXISTS shadow_replay_drift_advisory_only_chk;

ALTER TABLE public.shadow_replay_runs
  ADD CONSTRAINT shadow_replay_drift_advisory_only_chk
  CHECK (drift_advisory_only = true);

COMMENT ON COLUMN public.shadow_replay_runs.fail_action IS
  'Persisted compat enum: null | block_settlement. Does NOT wire settlement engine (§47.16.6).';

COMMENT ON COLUMN public.shadow_replay_runs.drift_advisory_only IS
  'Always true — drift fail is advisory-only until PO settlement gate track.';

COMMENT ON COLUMN public.shadow_replay_runs.contract_label IS
  'Canonical contract label drift_advisory_only (additive; Admin copy pointer = 04 Admin).';

COMMENT ON TABLE public.shadow_replay_runs IS
  'Engine offline shadow-replay · 24h · drift 0.000% · fail_action=block_settlement (persisted) · contract_label=drift_advisory_only (advisory)';
