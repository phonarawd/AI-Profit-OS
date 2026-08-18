-- Engine ai-feature-platform · feature/AI_LOG/Eval/AI PICK/Shadow Replay
-- L3 money execution FORBIDDEN · Admin cannot override AI scores (A13)
-- Same PostgreSQL as ledger_* (DB dualization 0)

-- Model registry · Eval Gate PASS only → prod · auto-train OFF
CREATE TABLE IF NOT EXISTS public.ai_model_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id text NOT NULL UNIQUE,
  version text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('candidate', 'eval_pass', 'eval_fail', 'prod', 'discarded')),
  eval_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_learning boolean NOT NULL DEFAULT false
    CHECK (auto_learning = false),
  promoted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_model_registry_prod_requires_pass_chk CHECK (
    status <> 'prod' OR (eval_report ? 'pass' AND (eval_report->>'pass') = 'true')
  )
);

CREATE INDEX IF NOT EXISTS ai_model_registry_status_idx
  ON public.ai_model_registry (status, created_at DESC);

COMMENT ON TABLE public.ai_model_registry IS
  'Engine §47.10 Eval Gate · auto_learning locked false · FAIL never prod';

-- AI PICK score audit (read-only Admin · no manual override column)
CREATE TABLE IF NOT EXISTS public.ai_pick_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id text NOT NULL,
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  feature_vector_hash text NOT NULL,
  formula_id text NOT NULL,
  ai_confidence_score numeric(5, 2) NOT NULL
    CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100),
  ranking_score numeric(12, 6) NOT NULL,
  is_ai_pick boolean NOT NULL DEFAULT false,
  level text NOT NULL CHECK (level = 'L2'),
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_pick_scores_no_admin_override_chk CHECK (
    NOT (components ? 'adminOverride')
    AND NOT (components ? 'successRatePercent')
    AND NOT (components ? 'sellSuccessRate')
  )
);

CREATE INDEX IF NOT EXISTS ai_pick_scores_opportunity_id_idx
  ON public.ai_pick_scores (opportunity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_pick_scores_is_ai_pick_idx
  ON public.ai_pick_scores (is_ai_pick, created_at DESC);

COMMENT ON TABLE public.ai_pick_scores IS
  'Engine AI PICK L2 · feature-platform calc only · Admin mutate 0 · sellSuccessRate input 0';

-- Shadow replay runs · drift 0.000% gate · fail → block settlement
CREATE TABLE IF NOT EXISTS public.shadow_replay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL UNIQUE,
  as_of timestamptz NOT NULL,
  horizon_hours integer NOT NULL DEFAULT 24 CHECK (horizon_hours = 24),
  report jsonb NOT NULL,
  drift_pct numeric(12, 6) NOT NULL,
  pass boolean NOT NULL,
  fail_action text
    CHECK (fail_action IS NULL OR fail_action = 'block_settlement'),
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shadow_replay_pass_drift_chk CHECK (
    (pass = true AND drift_pct = 0)
    OR (pass = false AND fail_action = 'block_settlement')
  )
);

CREATE INDEX IF NOT EXISTS shadow_replay_runs_as_of_idx
  ON public.shadow_replay_runs (as_of DESC);

CREATE INDEX IF NOT EXISTS shadow_replay_runs_pass_idx
  ON public.shadow_replay_runs (pass, as_of DESC);

COMMENT ON TABLE public.shadow_replay_runs IS
  'Engine shadow-replay · 24h · drift 0.000% · FAIL=block_settlement';

ALTER TABLE public.ai_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_registry FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pick_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pick_scores FORCE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_replay_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shadow_replay_runs FORCE ROW LEVEL SECURITY;
