-- MatchResult durable decision history
-- APPLY_THIS_SLICE = NO · file only · production apply 0
-- MatchResult != SourceObservation != CanonicalProduct != Opportunity
-- Identity key = normalized pair + matcher_version
-- same version + same semantics = idempotent
-- same version + different semantics = BLOCKED (no silent UPDATE)

CREATE TABLE IF NOT EXISTS public.match_results (
  match_result_id text PRIMARY KEY,
  pair_lo text NOT NULL
    REFERENCES public.source_observations (id),
  pair_hi text NOT NULL
    REFERENCES public.source_observations (id),
  left_observation_id text NOT NULL
    REFERENCES public.source_observations (id),
  right_observation_id text NOT NULL
    REFERENCES public.source_observations (id),
  left_source text NOT NULL,
  right_source text NOT NULL,
  matcher_version text NOT NULL,
  category_profile text NOT NULL
    CHECK (category_profile IN (
      'trading_card',
      'sneakers',
      'watch',
      'luxury_bag',
      'unknown'
    )),
  decision text NOT NULL
    CHECK (decision IN (
      'MATCH',
      'NO_MATCH',
      'INSUFFICIENT_EVIDENCE',
      'CONFLICT'
    )),
  match_path text,
  matching_decision_eligible boolean NOT NULL,
  final_truth_eligible boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL,
  conflicts jsonb NOT NULL,
  semantics_fingerprint text NOT NULL,
  payload jsonb NOT NULL,
  evaluated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_results_pair_distinct_chk
    CHECK (pair_lo <> pair_hi),
  CONSTRAINT match_results_pair_order_chk
    CHECK (pair_lo <= pair_hi),
  CONSTRAINT match_results_pair_membership_chk
    CHECK (
      (pair_lo = left_observation_id AND pair_hi = right_observation_id)
      OR (pair_lo = right_observation_id AND pair_hi = left_observation_id)
    ),
  CONSTRAINT match_results_match_path_chk
    CHECK (
      (decision = 'MATCH' AND match_path IN (
        'AUTHORITATIVE_STRONG',
        'STRONG',
        'COMPOSITE_STRONG'
      ))
      OR (decision <> 'MATCH' AND match_path IS NULL)
    ),
  CONSTRAINT match_results_final_truth_chk
    CHECK (final_truth_eligible = false),
  CONSTRAINT match_results_pair_version_uq
    UNIQUE (pair_lo, pair_hi, matcher_version)
);

CREATE INDEX IF NOT EXISTS match_results_left_idx
  ON public.match_results (left_observation_id);

CREATE INDEX IF NOT EXISTS match_results_right_idx
  ON public.match_results (right_observation_id);

CREATE INDEX IF NOT EXISTS match_results_decision_idx
  ON public.match_results (decision, created_at DESC);

CREATE OR REPLACE FUNCTION public.match_results_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'match_results is append-only · INSERT only'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS match_results_forbid_mutation ON public.match_results;
CREATE TRIGGER match_results_forbid_mutation
  BEFORE UPDATE OR DELETE ON public.match_results
  FOR EACH ROW
  EXECUTE FUNCTION public.match_results_forbid_mutation();

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.match_results FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.match_results TO postgres, service_role;

REVOKE ALL ON FUNCTION public.match_results_forbid_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_results_forbid_mutation() TO postgres, service_role;
