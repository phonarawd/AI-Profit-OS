-- PUTDUK desk · 체험 운용자본 (practice 와 분리)
-- 적용은 사람이 staging 검토 후. 이 파일만으로 운영 DB에 넣지 않는다.
-- 신규 가입 온보딩 = trial_grant_welcome 약 1만 원 1회
-- practice_grant_welcome 자동지급은 Nest 가입 훅에서 끈다 (모듈·가드는 유지)

ALTER TABLE public.ledger_accounts
  DROP CONSTRAINT IF EXISTS ledger_accounts_bucket_check;

ALTER TABLE public.ledger_accounts
  ADD CONSTRAINT ledger_accounts_bucket_check
  CHECK (
    bucket IS NULL
    OR bucket IN (
      'principal',
      'profit',
      'locked',
      'practice',
      'trial_principal',
      'trial_locked'
    )
  );

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
    'trial_grant',
    'fee',
    'other'
  ));

CREATE OR REPLACE FUNCTION public.provision_user_bucket_accounts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ledger_accounts (code, owner_type, owner_user_id, account_kind, bucket)
  VALUES
    ('USER:' || p_user_id::text || ':principal', 'user', p_user_id, 'user_bucket', 'principal'),
    ('USER:' || p_user_id::text || ':profit', 'user', p_user_id, 'user_bucket', 'profit'),
    ('USER:' || p_user_id::text || ':locked', 'user', p_user_id, 'user_bucket', 'locked'),
    ('USER:' || p_user_id::text || ':practice', 'user', p_user_id, 'user_bucket', 'practice'),
    ('USER:' || p_user_id::text || ':trial_principal', 'user', p_user_id, 'user_bucket', 'trial_principal'),
    ('USER:' || p_user_id::text || ':trial_locked', 'user', p_user_id, 'user_bucket', 'trial_locked')
  ON CONFLICT (owner_user_id, bucket) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.provision_user_bucket_accounts(uuid) IS
  'Creates principal/profit/locked/practice/trial_principal/trial_locked accounts';

CREATE OR REPLACE VIEW public.wallet_buckets
WITH (security_invoker = true)
AS
SELECT
  u.id AS user_id,
  COALESCE(p.balance_usdt, 0) AS principal_usdt,
  COALESCE(f.balance_usdt, 0) AS profit_usdt,
  COALESCE(l.balance_usdt, 0) AS locked_usdt,
  COALESCE(c.balance_usdt, 0) AS practice_usdt,
  COALESCE(tp.balance_usdt, 0) AS trial_principal_usdt,
  COALESCE(tl.balance_usdt, 0) AS trial_locked_usdt,
  COALESCE(p.balance_usdt, 0)
    + COALESCE(f.balance_usdt, 0)
    + COALESCE(l.balance_usdt, 0)
    + COALESCE(c.balance_usdt, 0) AS liability_usdt,
  GREATEST(
    COALESCE(p.updated_at, '-infinity'::timestamptz),
    COALESCE(f.updated_at, '-infinity'::timestamptz),
    COALESCE(l.updated_at, '-infinity'::timestamptz),
    COALESCE(c.updated_at, '-infinity'::timestamptz),
    COALESCE(tp.updated_at, '-infinity'::timestamptz),
    COALESCE(tl.updated_at, '-infinity'::timestamptz)
  ) AS as_of
FROM public.users u
LEFT JOIN public.ledger_accounts p
  ON p.owner_user_id = u.id AND p.bucket = 'principal'
LEFT JOIN public.ledger_accounts f
  ON f.owner_user_id = u.id AND f.bucket = 'profit'
LEFT JOIN public.ledger_accounts l
  ON l.owner_user_id = u.id AND l.bucket = 'locked'
LEFT JOIN public.ledger_accounts c
  ON c.owner_user_id = u.id AND c.bucket = 'practice'
LEFT JOIN public.ledger_accounts tp
  ON tp.owner_user_id = u.id AND tp.bucket = 'trial_principal'
LEFT JOIN public.ledger_accounts tl
  ON tl.owner_user_id = u.id AND tl.bucket = 'trial_locked';

COMMENT ON VIEW public.wallet_buckets IS
  '§49 projection · liability = principal+profit+locked+practice · trial_* 는 별도 칸';

CREATE TABLE public.trial_program_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  welcome_krw integer NOT NULL DEFAULT 10000 CHECK (welcome_krw >= 1),
  profit_cap_krw integer NOT NULL DEFAULT 5000 CHECK (profit_cap_krw >= 0),
  default_max_participations smallint NOT NULL DEFAULT 1
    CHECK (default_max_participations BETWEEN 1 AND 3),
  required_capital_krw_min integer NOT NULL DEFAULT 1000,
  required_capital_krw_max integer NOT NULL DEFAULT 10000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.trial_program_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.trial_program_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.trial_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  grant_key text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('active', 'failed_fx')),
  amount_usdt numeric(36, 18),
  amount_krw integer,
  fx_snapshot_id text REFERENCES public.fx_snapshots (id),
  grant_journal_id uuid REFERENCES public.ledger_journals (id),
  fail_reason text,
  idempotency_key text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trial_grants_idem_uq UNIQUE (idempotency_key),
  CONSTRAINT trial_grants_user_key_uq UNIQUE (user_id, grant_key)
);

CREATE INDEX trial_grants_user_idx
  ON public.trial_grants (user_id, granted_at DESC);

COMMENT ON TABLE public.trial_grants IS
  '체험 1만 원 1회 · FX 없으면 journal 0 · failed_fx 재시도';

ALTER TABLE public.trial_grants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.trial_user_state (
  user_id uuid PRIMARY KEY REFERENCES public.users (id),
  max_participations smallint NOT NULL DEFAULT 1
    CHECK (max_participations BETWEEN 1 AND 3),
  participations_used integer NOT NULL DEFAULT 0
    CHECK (participations_used >= 0),
  profit_credited_krw numeric(18, 2) NOT NULL DEFAULT 0
    CHECK (profit_credited_krw >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_user_state ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.trial_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trade_executions (id),
  user_id uuid NOT NULL REFERENCES public.users (id),
  funding_source text NOT NULL CHECK (funding_source IN ('trial', 'own_principal')),
  profit_usdt numeric(36, 18) NOT NULL DEFAULT 0,
  profit_krw numeric(18, 2) NOT NULL DEFAULT 0,
  capped boolean NOT NULL DEFAULT false,
  status text NOT NULL
    CHECK (status IN ('settled', 'unlocked', 'profit_held_fx')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trial_settlements_trade_uq UNIQUE (trade_id)
);

ALTER TABLE public.trial_settlements ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.referral_slot_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  referrer_user_id uuid NOT NULL REFERENCES public.users (id),
  edge_id uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_slot_grants_user_uq UNIQUE (user_id)
);

CREATE INDEX referral_slot_grants_referrer_idx
  ON public.referral_slot_grants (referrer_user_id, granted_at DESC);

COMMENT ON TABLE public.referral_slot_grants IS
  '초대 기회 슬롯 · 장부 금액 0 · 친구 본인입금+업무1회+초대자 본인입금';

ALTER TABLE public.referral_slot_grants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS trial_eligible boolean NOT NULL DEFAULT false;

ALTER TABLE public.participate_requests
  ADD COLUMN IF NOT EXISTS funding_source text NOT NULL DEFAULT 'own_principal'
    CHECK (funding_source IN ('trial', 'own_principal'));

ALTER TABLE public.trade_executions
  ADD COLUMN IF NOT EXISTS funding_source text NOT NULL DEFAULT 'own_principal'
    CHECK (funding_source IN ('trial', 'own_principal'));

REVOKE ALL ON FUNCTION public.provision_user_bucket_accounts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_user_bucket_accounts(uuid) TO postgres, service_role;
