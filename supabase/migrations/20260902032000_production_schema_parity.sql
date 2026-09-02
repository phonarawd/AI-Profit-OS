-- Production schema parity recovery — generated from fresh read-only catalog truth on 2026-09-02.
-- Purpose: make a clean Supabase branch reproduce the current Production public schema.
-- DATA COPY = 0. Customer rows are never copied. Only safe system singleton defaults are seeded.
-- Production already owns these objects; IF NOT EXISTS / ON CONFLICT DO NOTHING keep this forward-safe.
-- This migration does NOT perform the later staging hardening slice.

CREATE TABLE IF NOT EXISTS public.ledger_outbox_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  journal_id uuid,
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  CONSTRAINT ledger_outbox_events_pkey PRIMARY KEY (id),
  CONSTRAINT ledger_outbox_events_attempts_check CHECK (attempts >= 0),
  CONSTRAINT ledger_outbox_events_journal_id_fkey
    FOREIGN KEY (journal_id) REFERENCES public.ledger_journals(id)
);
CREATE INDEX IF NOT EXISTS ledger_outbox_events_unpublished_idx
  ON public.ledger_outbox_events (created_at)
  WHERE published_at IS NULL;
COMMENT ON TABLE public.ledger_outbox_events IS
  'Phase0 transactional outbox for ledger domain events · at-least-once delivery';

CREATE TABLE IF NOT EXISTS public.source_observations (
  id text NOT NULL,
  source text NOT NULL,
  external_item_id text NOT NULL,
  observation_purpose text NOT NULL,
  source_status text NOT NULL,
  url text NOT NULL,
  observed_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  content_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT source_observations_pkey PRIMARY KEY (id),
  CONSTRAINT source_observations_source_check CHECK (
    source = ANY (ARRAY[
      'ebay'::text,'fashionphile'::text,'chrono24'::text,'tcgplayer'::text,
      'mercari_jp'::text,'kream'::text,'stockx'::text,'goat'::text,
      'bunjang'::text,'vestiaire'::text
    ])
  ),
  CONSTRAINT source_observations_no_yahoo_chk CHECK (source IS DISTINCT FROM 'yahoo_jp'::text),
  CONSTRAINT source_observations_observation_purpose_check CHECK (
    observation_purpose = ANY (ARRAY['DISCOVERY'::text,'CONFIRMATION'::text])
  ),
  CONSTRAINT source_observations_source_status_check CHECK (
    source_status = ANY (ARRAY[
      'SUCCESS'::text,'NOT_FOUND'::text,'UNAVAILABLE'::text,'OUT_OF_STOCK'::text,
      'PARSE_FAILED'::text,'AMBIGUOUS'::text,'ACCESS_BLOCKED'::text,'TEMPORARY_ERROR'::text
    ])
  )
);
CREATE INDEX IF NOT EXISTS source_observations_observed_at_idx
  ON public.source_observations (observed_at DESC);
CREATE INDEX IF NOT EXISTS source_observations_source_item_observed_idx
  ON public.source_observations (source, external_item_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.canonical_products (
  canonical_product_id text NOT NULL,
  putduk_product_code text NOT NULL,
  category_profile text NOT NULL,
  canonical_identity_key text NOT NULL,
  canonical_attributes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  identity_evidence_summary jsonb NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_products_pkey PRIMARY KEY (canonical_product_id),
  CONSTRAINT canonical_products_pd_format_chk CHECK (putduk_product_code ~ '^PD-[0-9]{7}$'::text),
  CONSTRAINT canonical_products_pd_unique UNIQUE (putduk_product_code),
  CONSTRAINT canonical_products_identity_unique UNIQUE (category_profile, canonical_identity_key)
);
CREATE INDEX IF NOT EXISTS canonical_products_identity_idx
  ON public.canonical_products (category_profile, canonical_identity_key);

CREATE TABLE IF NOT EXISTS public.canonical_product_source_links (
  id bigserial NOT NULL,
  canonical_product_id text NOT NULL,
  source text NOT NULL,
  source_item_id text NOT NULL,
  source_url text,
  latest_observation_ref text NOT NULL,
  matching_decision text NOT NULL,
  matcher_version text NOT NULL,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT canonical_product_source_links_pkey PRIMARY KEY (id),
  CONSTRAINT canonical_product_source_links_product_source_item_uq
    UNIQUE (canonical_product_id, source, source_item_id),
  CONSTRAINT canonical_product_source_links_observation_uq UNIQUE (latest_observation_ref),
  CONSTRAINT canonical_product_source_links_canonical_product_id_fkey
    FOREIGN KEY (canonical_product_id)
    REFERENCES public.canonical_products(canonical_product_id),
  CONSTRAINT canonical_product_source_links_latest_observation_ref_fkey
    FOREIGN KEY (latest_observation_ref)
    REFERENCES public.source_observations(id)
);

CREATE TABLE IF NOT EXISTS public.match_results (
  match_result_id text NOT NULL,
  pair_lo text NOT NULL,
  pair_hi text NOT NULL,
  left_observation_id text NOT NULL,
  right_observation_id text NOT NULL,
  left_source text NOT NULL,
  right_source text NOT NULL,
  matcher_version text NOT NULL,
  category_profile text NOT NULL,
  decision text NOT NULL,
  match_path text,
  matching_decision_eligible boolean NOT NULL,
  final_truth_eligible boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL,
  conflicts jsonb NOT NULL,
  semantics_fingerprint text NOT NULL,
  payload jsonb NOT NULL,
  evaluated_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_results_pkey PRIMARY KEY (match_result_id),
  CONSTRAINT match_results_pair_version_uq UNIQUE (pair_lo, pair_hi, matcher_version),
  CONSTRAINT match_results_left_observation_id_fkey
    FOREIGN KEY (left_observation_id) REFERENCES public.source_observations(id),
  CONSTRAINT match_results_right_observation_id_fkey
    FOREIGN KEY (right_observation_id) REFERENCES public.source_observations(id),
  CONSTRAINT match_results_pair_lo_fkey
    FOREIGN KEY (pair_lo) REFERENCES public.source_observations(id),
  CONSTRAINT match_results_pair_hi_fkey
    FOREIGN KEY (pair_hi) REFERENCES public.source_observations(id),
  CONSTRAINT match_results_category_profile_check CHECK (
    category_profile = ANY (ARRAY[
      'trading_card'::text,'sneakers'::text,'watch'::text,'luxury_bag'::text,'unknown'::text
    ])
  ),
  CONSTRAINT match_results_decision_check CHECK (
    decision = ANY (ARRAY[
      'MATCH'::text,'NO_MATCH'::text,'INSUFFICIENT_EVIDENCE'::text,'CONFLICT'::text
    ])
  ),
  CONSTRAINT match_results_final_truth_chk CHECK (final_truth_eligible = false),
  CONSTRAINT match_results_match_path_chk CHECK (
    (
      decision = 'MATCH'::text
      AND match_path = ANY (ARRAY[
        'AUTHORITATIVE_STRONG'::text,'STRONG'::text,'COMPOSITE_STRONG'::text
      ])
    )
    OR (decision <> 'MATCH'::text AND match_path IS NULL)
  ),
  CONSTRAINT match_results_pair_distinct_chk CHECK (pair_lo <> pair_hi),
  CONSTRAINT match_results_pair_membership_chk CHECK (
    (pair_lo = left_observation_id AND pair_hi = right_observation_id)
    OR (pair_lo = right_observation_id AND pair_hi = left_observation_id)
  ),
  CONSTRAINT match_results_pair_order_chk CHECK (pair_lo <= pair_hi)
);
CREATE INDEX IF NOT EXISTS match_results_decision_idx
  ON public.match_results (decision, created_at DESC);
CREATE INDEX IF NOT EXISTS match_results_left_idx
  ON public.match_results (left_observation_id);
CREATE INDEX IF NOT EXISTS match_results_right_idx
  ON public.match_results (right_observation_id);

CREATE TABLE IF NOT EXISTS public.push_control (
  id integer NOT NULL DEFAULT 1,
  push_enabled boolean NOT NULL DEFAULT true,
  reason text,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_control_pkey PRIMARY KEY (id),
  CONSTRAINT push_control_id_check CHECK (id = 1)
);
COMMENT ON TABLE public.push_control IS
  'REL-020 Admin pushEnabled kill · UI=REL-213';

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  platform text NOT NULL DEFAULT 'web'::text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_endpoint_check CHECK (endpoint LIKE 'https://%'::text),
  CONSTRAINT push_subscriptions_platform_check CHECK (
    platform = ANY (ARRAY['web'::text,'ios_pwa'::text,'android_pwa'::text,'desktop'::text])
  ),
  CONSTRAINT push_subscriptions_user_endpoint_uq UNIQUE (user_id, endpoint),
  CONSTRAINT push_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);
COMMENT ON TABLE public.push_subscriptions IS
  'REL-020 Web Push endpoints · schemas/push-subscription.v1';

CREATE TABLE IF NOT EXISTS public.admin_audit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_key text NOT NULL,
  actor_id uuid,
  role text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL DEFAULT 'n/a'::text,
  result text NOT NULL,
  reason text,
  idempotency_key text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_events_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_events_idem_uq UNIQUE (idempotency_key),
  CONSTRAINT admin_audit_events_mode_check CHECK (
    mode = ANY (ARRAY['LIVE'::text,'DRY_RUN'::text,'SIMULATION'::text,'n/a'::text])
  ),
  CONSTRAINT admin_audit_events_result_check CHECK (
    result = ANY (ARRAY['preview'::text,'applied'::text,'denied'::text,'rolled_back'::text])
  )
);
CREATE INDEX IF NOT EXISTS admin_audit_events_actor_key_idx
  ON public.admin_audit_events (actor_key, occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_events_occurred_at_idx
  ON public.admin_audit_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_events_result_idx
  ON public.admin_audit_events (result, occurred_at DESC);
COMMENT ON TABLE public.admin_audit_events IS
  'REL-405 central admin audit · who/what/target/time/mode/result · PII/token/money reconstruct 0';

CREATE TABLE IF NOT EXISTS public.admin_kill_switches (
  id text NOT NULL,
  engaged boolean NOT NULL DEFAULT false,
  reason text,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_kill_switches_pkey PRIMARY KEY (id),
  CONSTRAINT admin_kill_switches_id_check CHECK (
    id = ANY (ARRAY[
      'GLOBAL_OPPORTUNITY_PAUSE'::text,'GLOBAL_MATCHING_PAUSE'::text,
      'GLOBAL_WITHDRAW_PAUSE'::text,'GLOBAL_DEPOSIT_PAUSE'::text,
      'GLOBAL_ALL_PAUSE'::text,'MONEY_CIRCUIT'::text,'PUSH_KILL'::text,
      'GROWTH_PAUSE'::text,'REFERRAL_ACCRUAL_HALT'::text
    ])
  )
);
COMMENT ON TABLE public.admin_kill_switches IS
  'REL-406 9 kill-switch rows · engaged=true blocks server path · wraps money_circuit/push/referral';

CREATE TABLE IF NOT EXISTS public.opportunity_price_overrides (
  opportunity_id uuid NOT NULL,
  engaged boolean NOT NULL DEFAULT false,
  admin_buy_usdt numeric,
  admin_sell_usdt numeric,
  admin_margin_pct numeric,
  reason_code text NOT NULL,
  reason text NOT NULL,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_price_overrides_pkey PRIMARY KEY (opportunity_id),
  CONSTRAINT opportunity_price_overrides_opportunity_id_fkey
    FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE,
  CONSTRAINT opportunity_price_overrides_reason_code_check CHECK (
    reason_code = ANY (ARRAY[
      'SOURCE_STALE'::text,'FEED_GAP'::text,'MANUAL_COMMERCIAL'::text,
      'RISK_ADJUST'::text,'OVERRIDE_CLEAR'::text
    ])
  ),
  CONSTRAINT opportunity_price_overrides_reason_min CHECK (char_length(btrim(reason)) >= 10)
);
COMMENT ON TABLE public.opportunity_price_overrides IS
  'REL-407 OVERRIDE layer SoT · SOURCE stays on listings · not ledger credit';

CREATE TABLE IF NOT EXISTS public.admin_ops_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family text NOT NULL,
  mode text NOT NULL,
  stage text NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  impact_count integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_ops_intents_pkey PRIMARY KEY (id),
  CONSTRAINT admin_ops_intents_family_check CHECK (
    family = ANY (ARRAY[
      'policy'::text,'bulk'::text,'execution_rule'::text,'wallet_operation'::text,'risk_threshold'::text
    ])
  ),
  CONSTRAINT admin_ops_intents_mode_check CHECK (
    mode = ANY (ARRAY['LIVE'::text,'DRY_RUN'::text,'SIMULATION'::text])
  ),
  CONSTRAINT admin_ops_intents_stage_check CHECK (
    stage = ANY (ARRAY['preview'::text,'confirm'::text,'apply'::text,'result'::text,'rollback'::text])
  ),
  CONSTRAINT admin_ops_intents_impact_count_check CHECK (impact_count >= 0),
  CONSTRAINT admin_ops_intents_reason_min CHECK (char_length(btrim(reason)) >= 10)
);
COMMENT ON TABLE public.admin_ops_intents IS
  'REL-222 3-mode ops intent · not ledger credit · LIVE confirm required';

CREATE TABLE IF NOT EXISTS public.admin_match_controls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  verb text NOT NULL,
  kind text NOT NULL,
  mode text NOT NULL,
  stage text NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  previewed boolean NOT NULL DEFAULT false,
  impact_count integer NOT NULL DEFAULT 0,
  target_id uuid,
  reason text NOT NULL,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_match_controls_pkey PRIMARY KEY (id),
  CONSTRAINT admin_match_controls_verb_check CHECK (
    verb = ANY (ARRAY['ALLOW'::text,'BLOCK'::text,'PAUSE'::text,'CANCEL'::text,'REASSIGN'::text])
  ),
  CONSTRAINT admin_match_controls_kind_check CHECK (
    kind = ANY (ARRAY['match'::text,'bulk'::text,'schedule'::text,'campaign'::text])
  ),
  CONSTRAINT admin_match_controls_mode_check CHECK (
    mode = ANY (ARRAY['LIVE'::text,'DRY_RUN'::text,'SIMULATION'::text])
  ),
  CONSTRAINT admin_match_controls_stage_check CHECK (
    stage = ANY (ARRAY['preview'::text,'confirm'::text,'apply'::text,'result'::text,'rollback'::text])
  ),
  CONSTRAINT admin_match_controls_impact_count_check CHECK (impact_count >= 0),
  CONSTRAINT admin_match_controls_reason_min CHECK (char_length(btrim(reason)) >= 10),
  CONSTRAINT admin_match_controls_reassign_target CHECK (
    verb <> 'REASSIGN'::text OR target_id IS NOT NULL
  ),
  CONSTRAINT admin_match_controls_bulk_preview CHECK (
    kind = 'match'::text OR impact_count >= 1
  )
);
COMMENT ON TABLE public.admin_match_controls IS
  'REL-223 match/bulk control intent · not ledger credit · preview+confirm for LIVE';

CREATE TABLE IF NOT EXISTS public.admin_policy_versions (
  policy_key text NOT NULL,
  version_label text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'NORMAL'::text,
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_policy_versions_pkey PRIMARY KEY (policy_key, version_label),
  CONSTRAINT admin_policy_versions_policy_key_check CHECK (
    policy_key = ANY (ARRAY['source_parser'::text,'founder_override'::text])
  ),
  CONSTRAINT admin_policy_versions_version_label_check CHECK (
    version_label = ANY (ARRAY['V1'::text,'V2'::text,'V3'::text])
  ),
  CONSTRAINT admin_policy_versions_reason_min CHECK (char_length(btrim(reason)) >= 10),
  CONSTRAINT admin_policy_versions_severity_check CHECK (
    severity = ANY (ARRAY['NORMAL'::text,'HIGH'::text])
  )
);
COMMENT ON TABLE public.admin_policy_versions IS
  'REL-224 immutable policy versions · rollback moves head only · not ledger';

CREATE TABLE IF NOT EXISTS public.admin_policy_heads (
  policy_key text NOT NULL,
  current_label text NOT NULL,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_policy_heads_pkey PRIMARY KEY (policy_key),
  CONSTRAINT admin_policy_heads_policy_key_check CHECK (
    policy_key = ANY (ARRAY['source_parser'::text,'founder_override'::text])
  ),
  CONSTRAINT admin_policy_heads_current_label_check CHECK (
    current_label = ANY (ARRAY['V1'::text,'V2'::text,'V3'::text])
  )
);

CREATE OR REPLACE FUNCTION public.source_observations_forbid_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'source_observations is append-only · INSERT only'
    USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION public.canonical_products_protect_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.canonical_product_id IS DISTINCT FROM OLD.canonical_product_id
     OR NEW.putduk_product_code IS DISTINCT FROM OLD.putduk_product_code
     OR NEW.canonical_identity_key IS DISTINCT FROM OLD.canonical_identity_key
     OR NEW.category_profile IS DISTINCT FROM OLD.category_profile
  THEN
    RAISE EXCEPTION 'canonical identity and PD are immutable'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_results_forbid_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'match_results is append-only · INSERT only'
    USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_audit_events_forbid_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'admin_audit_events is append-only · INSERT only'
    USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_kill_switches_forbid_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'admin_kill_switches delete forbidden'
    USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION public.opportunity_price_overrides_forbid_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'opportunity_price_overrides delete forbidden'
    USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_ops_intents_forbid_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'admin_ops_intents delete forbidden'
    USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_match_controls_forbid_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'admin_match_controls delete forbidden'
    USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_policy_versions_forbid_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'admin_policy_versions overwrite forbidden'
    USING ERRCODE = '42501';
END;
$function$;

DROP TRIGGER IF EXISTS source_observations_forbid_mutation ON public.source_observations;
CREATE TRIGGER source_observations_forbid_mutation
  BEFORE DELETE OR UPDATE ON public.source_observations
  FOR EACH ROW EXECUTE FUNCTION public.source_observations_forbid_mutation();

DROP TRIGGER IF EXISTS canonical_products_protect_immutable ON public.canonical_products;
CREATE TRIGGER canonical_products_protect_immutable
  BEFORE UPDATE ON public.canonical_products
  FOR EACH ROW EXECUTE FUNCTION public.canonical_products_protect_immutable();

DROP TRIGGER IF EXISTS match_results_forbid_mutation ON public.match_results;
CREATE TRIGGER match_results_forbid_mutation
  BEFORE DELETE OR UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.match_results_forbid_mutation();

DROP TRIGGER IF EXISTS admin_audit_events_forbid_mutation ON public.admin_audit_events;
CREATE TRIGGER admin_audit_events_forbid_mutation
  BEFORE DELETE OR UPDATE ON public.admin_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.admin_audit_events_forbid_mutation();

DROP TRIGGER IF EXISTS admin_kill_switches_forbid_delete ON public.admin_kill_switches;
CREATE TRIGGER admin_kill_switches_forbid_delete
  BEFORE DELETE ON public.admin_kill_switches
  FOR EACH ROW EXECUTE FUNCTION public.admin_kill_switches_forbid_delete();

DROP TRIGGER IF EXISTS opportunity_price_overrides_forbid_delete ON public.opportunity_price_overrides;
CREATE TRIGGER opportunity_price_overrides_forbid_delete
  BEFORE DELETE ON public.opportunity_price_overrides
  FOR EACH ROW EXECUTE FUNCTION public.opportunity_price_overrides_forbid_delete();

DROP TRIGGER IF EXISTS admin_ops_intents_forbid_delete ON public.admin_ops_intents;
CREATE TRIGGER admin_ops_intents_forbid_delete
  BEFORE DELETE ON public.admin_ops_intents
  FOR EACH ROW EXECUTE FUNCTION public.admin_ops_intents_forbid_delete();

DROP TRIGGER IF EXISTS admin_match_controls_forbid_delete ON public.admin_match_controls;
CREATE TRIGGER admin_match_controls_forbid_delete
  BEFORE DELETE ON public.admin_match_controls
  FOR EACH ROW EXECUTE FUNCTION public.admin_match_controls_forbid_delete();

DROP TRIGGER IF EXISTS admin_policy_versions_forbid_update ON public.admin_policy_versions;
CREATE TRIGGER admin_policy_versions_forbid_update
  BEFORE DELETE OR UPDATE ON public.admin_policy_versions
  FOR EACH ROW EXECUTE FUNCTION public.admin_policy_versions_forbid_mutation();

ALTER TABLE public.ledger_outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_product_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_kill_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ops_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_match_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_policy_heads ENABLE ROW LEVEL SECURITY;

-- Production pre-hardening parity: these two are intentionally RLS OFF here.
ALTER TABLE public.push_control DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.ledger_outbox_events,
  public.source_observations,
  public.canonical_products,
  public.canonical_product_source_links,
  public.match_results,
  public.push_control,
  public.push_subscriptions,
  public.admin_audit_events,
  public.admin_kill_switches,
  public.opportunity_price_overrides,
  public.admin_ops_intents,
  public.admin_match_controls,
  public.admin_policy_versions,
  public.admin_policy_heads
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE
  public.ledger_outbox_events,
  public.source_observations,
  public.canonical_products,
  public.canonical_product_source_links,
  public.match_results,
  public.push_control,
  public.push_subscriptions,
  public.admin_audit_events,
  public.admin_kill_switches,
  public.opportunity_price_overrides,
  public.admin_ops_intents,
  public.admin_match_controls,
  public.admin_policy_versions,
  public.admin_policy_heads
TO service_role;

GRANT USAGE ON SEQUENCE public.canonical_product_source_links_id_seq TO service_role;
REVOKE ALL ON SEQUENCE public.canonical_product_source_links_id_seq FROM PUBLIC, anon, authenticated;

INSERT INTO public.push_control (id, push_enabled, reason, updated_by_admin_id)
VALUES (1, true, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_kill_switches (id, engaged, reason, updated_by_admin_id)
VALUES
  ('GLOBAL_OPPORTUNITY_PAUSE', false, NULL, NULL),
  ('GLOBAL_MATCHING_PAUSE', false, NULL, NULL),
  ('GLOBAL_WITHDRAW_PAUSE', false, NULL, NULL),
  ('GLOBAL_DEPOSIT_PAUSE', false, NULL, NULL),
  ('GLOBAL_ALL_PAUSE', false, NULL, NULL),
  ('MONEY_CIRCUIT', false, NULL, NULL),
  ('PUSH_KILL', false, NULL, NULL),
  ('GROWTH_PAUSE', false, NULL, NULL),
  ('REFERRAL_ACCRUAL_HALT', false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
