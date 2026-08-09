-- Money §51.8a · Engine §48.13.4 — Mission auto-accrual + fanout boundary
-- Owns: accrual/idempotency/Pool/clawback = Money §51.8a
-- Fanout: settlement.completed → Nest MissionRewardEvaluator async (Rule/R1~R10 불변)
-- FORBIDDEN: G4/demo/ticker → accrual · manual per-user grant · Credits currency

ALTER TABLE public.ledger_journals
  DROP CONSTRAINT IF EXISTS ledger_journals_journal_type_check;

ALTER TABLE public.ledger_journals
  ADD CONSTRAINT ledger_journals_journal_type_check
  CHECK (journal_type IN (
    'deposit_usdt',
    'deposit_krw',
    'withdraw',
    'withdraw_refund',
    'participate_lock',
    'participate_unlock',
    'settlement',
    'merge_profit_to_principal',
    'admin_adjust',
    'referral_reward',
    'referral_clawback',
    'practice_grant',
    'practice_expire',
    'mission_reward',
    'mission_clawback',
    'fee',
    'other'
  ));

CREATE TABLE public.mission_program_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  rewards_enabled boolean NOT NULL DEFAULT false,
  accrual_halted boolean NOT NULL DEFAULT false,
  m05_min_deposit_usdt numeric(36, 18) NOT NULL DEFAULT 20,
  m07_first_settlement_usdt numeric(36, 18) NOT NULL DEFAULT 2,
  d03_daily_participate_usdt numeric(36, 18) NOT NULL DEFAULT 0,
  release_hold_hours_m05 integer NOT NULL DEFAULT 48
    CHECK (release_hold_hours_m05 BETWEEN 0 AND 168),
  release_hold_hours_m07 integer NOT NULL DEFAULT 24
    CHECK (release_hold_hours_m07 BETWEEN 0 AND 168),
  system_mission_payout_cap_per_day_usdt numeric(36, 18),
  clawback_hours_mission integer NOT NULL DEFAULT 72
    CHECK (clawback_hours_mission BETWEEN 0 AND 720),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_admin_id uuid
);

COMMENT ON TABLE public.mission_program_config IS
  'Money §51.8a · missionsRewardsEnabled = rewards_enabled (same switch · 분리 0)';

INSERT INTO public.mission_program_config (id, rewards_enabled, accrual_halted)
VALUES (1, false, false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.mission_definitions (
  id text PRIMARY KEY,
  section text NOT NULL
    CHECK (section IN (
      'daily', 'one_time', 'weekly', 'streak', 'membership', 'campaign_inline'
    )),
  title_ko text NOT NULL,
  body_ko text NOT NULL,
  icon text,
  trigger_event text NOT NULL,
  trigger_predicate jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_kind text NOT NULL
    CHECK (reward_kind IN ('none', 'practice', 'promo_profit', 'fee_coupon')),
  reward_amount_usdt numeric(36, 18),
  auto_claim boolean NOT NULL DEFAULT true CHECK (auto_claim = true),
  growth_required boolean NOT NULL DEFAULT false,
  release_hold_hours integer NOT NULL DEFAULT 0
    CHECK (release_hold_hours BETWEEN 0 AND 168),
  cap_per_user integer NOT NULL DEFAULT 1 CHECK (cap_per_user = 1),
  sort_order integer NOT NULL DEFAULT 0,
  deep_route text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'live', 'paused', 'ended')),
  campaign_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mission_definitions_trigger_live_idx
  ON public.mission_definitions (trigger_event, status)
  WHERE status = 'live';

COMMENT ON TABLE public.mission_definitions IS
  'Money §51.8a catalog · Admin growth?tab=missions · autoClaim only';

-- Day-1 money triggers (M05/M07) · reward amounts from program config at evaluate
INSERT INTO public.mission_definitions (
  id, section, title_ko, body_ko, icon, trigger_event, trigger_predicate,
  reward_kind, reward_amount_usdt, growth_required, release_hold_hours,
  sort_order, deep_route, status
) VALUES
(
  'M05', 'one_time',
  '첫 입금 보너스',
  '첫 입금이 확인되면 보너스가 자동으로 들어와요.',
  'wallet', 'deposit.confirmed',
  '{"firstDeposit":true}'::jsonb,
  'promo_profit', 1, true, 48,
  50, '/wallet', 'live'
),
(
  'M07', 'one_time',
  '첫 수익 정산 보너스',
  '첫 수익이 정산되면 보너스가 자동으로 들어와요.',
  'trade', 'settlement.completed',
  '{"firstSettlement":true}'::jsonb,
  'promo_profit', 0, true, 24,
  70, '/me/benefits', 'live'
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.mission_accruals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  mission_id text NOT NULL REFERENCES public.mission_definitions (id),
  idempotency_key text NOT NULL,
  reward_kind_snap text NOT NULL
    CHECK (reward_kind_snap IN ('none', 'practice', 'promo_profit', 'fee_coupon')),
  amount_usdt_snap numeric(36, 18) NOT NULL CHECK (amount_usdt_snap >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'pending_hold',
      'queued_pool',
      'posting',
      'released',
      'clawed_back',
      'halted',
      'skipped'
    )),
  source_event_id text,
  ledger_journal_id uuid REFERENCES public.ledger_journals (id),
  hold_until timestamptz,
  released_at timestamptz,
  clawback_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mission_accruals_idem_uq UNIQUE (idempotency_key)
);

CREATE UNIQUE INDEX mission_accruals_source_event_uq
  ON public.mission_accruals (user_id, source_event_id)
  WHERE source_event_id IS NOT NULL;

CREATE INDEX mission_accruals_release_due_idx
  ON public.mission_accruals (status, hold_until ASC)
  WHERE status IN ('pending', 'pending_hold', 'queued_pool');

CREATE INDEX mission_accruals_user_idx
  ON public.mission_accruals (user_id, created_at DESC);

COMMENT ON TABLE public.mission_accruals IS
  'Money §51.8a accrual · amountUsdtSnap frozen · ledger only after posting OK';

COMMENT ON COLUMN public.mission_accruals.amount_usdt_snap IS
  'Frozen at insert · release must not re-read live config to inflate';

ALTER TABLE public.mission_program_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_accruals ENABLE ROW LEVEL SECURITY;
