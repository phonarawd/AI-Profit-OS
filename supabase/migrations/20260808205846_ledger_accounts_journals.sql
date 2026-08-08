-- Double-entry ledger · §17 · Money §49
-- Truth currency = USDT · balance column = projection only (posting path)
-- FORBIDDEN: app-role direct balance UPDATE (guarded in rls_ledger_guards)

CREATE TABLE public.ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  owner_type text NOT NULL CHECK (owner_type IN ('system', 'user')),
  owner_user_id uuid REFERENCES public.users (id),
  account_kind text NOT NULL CHECK (account_kind IN (
    'user_bucket',
    'opportunity_pool',
    'ops_pool',
    'promo_pool',
    'treasury',
    'fee_revenue',
    'fx_clearing',
    'suspense'
  )),
  bucket text CHECK (
    bucket IS NULL
    OR bucket IN ('principal', 'profit', 'locked', 'practice')
  ),
  currency text NOT NULL DEFAULT 'USDT' CHECK (currency = 'USDT'),
  balance_usdt numeric(36, 18) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ledger_accounts_owner_chk CHECK (
    (owner_type = 'system' AND owner_user_id IS NULL)
    OR (owner_type = 'user' AND owner_user_id IS NOT NULL AND account_kind = 'user_bucket' AND bucket IS NOT NULL)
  ),
  CONSTRAINT ledger_accounts_user_bucket_uq UNIQUE (owner_user_id, bucket)
);

CREATE INDEX ledger_accounts_owner_user_id_idx
  ON public.ledger_accounts (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

COMMENT ON TABLE public.ledger_accounts IS 'Chart of accounts · user buckets principal/profit/locked/practice';
COMMENT ON COLUMN public.ledger_accounts.balance_usdt IS 'Projection only · mutate via ledger posting (app.ledger_posting=on)';

CREATE TABLE public.ledger_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  journal_type text NOT NULL CHECK (journal_type IN (
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
    'fee',
    'other'
  )),
  reference_type text,
  reference_id text,
  memo text,
  fx_snapshot_id text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ledger_journals_reference_idx
  ON public.ledger_journals (reference_type, reference_id);

CREATE INDEX ledger_journals_created_at_idx
  ON public.ledger_journals (created_at DESC);

COMMENT ON TABLE public.ledger_journals IS 'Immutable journal headers · idempotency_key UNIQUE';

CREATE TABLE public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid NOT NULL REFERENCES public.ledger_journals (id),
  account_id uuid NOT NULL REFERENCES public.ledger_accounts (id),
  direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount_usdt numeric(36, 18) NOT NULL CHECK (amount_usdt > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ledger_entries_journal_id_idx ON public.ledger_entries (journal_id);
CREATE INDEX ledger_entries_account_id_idx ON public.ledger_entries (account_id);

COMMENT ON TABLE public.ledger_entries IS 'Immutable journal lines · never UPDATE/DELETE';

-- System chart of accounts (seed)
INSERT INTO public.ledger_accounts (code, owner_type, account_kind, bucket, balance_usdt) VALUES
  ('SYS:OPPORTUNITY_POOL', 'system', 'opportunity_pool', NULL, 0),
  ('SYS:OPS_POOL', 'system', 'ops_pool', NULL, 0),
  ('SYS:PROMO_POOL', 'system', 'promo_pool', NULL, 0),
  ('SYS:TREASURY', 'system', 'treasury', NULL, 0),
  ('SYS:FEE_REVENUE', 'system', 'fee_revenue', NULL, 0),
  ('SYS:FX_CLEARING', 'system', 'fx_clearing', NULL, 0),
  ('SYS:SUSPENSE', 'system', 'suspense', NULL, 0);

-- Helper: provision 4 user bucket accounts (called by Nest on signup)
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
    ('USER:' || p_user_id::text || ':practice', 'user', p_user_id, 'user_bucket', 'practice')
  ON CONFLICT (owner_user_id, bucket) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_user_bucket_accounts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_user_bucket_accounts(uuid) TO postgres, service_role;

COMMENT ON FUNCTION public.provision_user_bucket_accounts(uuid) IS
  'Creates principal/profit/locked/practice accounts for a Nest user';

-- Read model aligned to schemas/wallet-buckets.v1.json
CREATE OR REPLACE VIEW public.wallet_buckets
WITH (security_invoker = true)
AS
SELECT
  u.id AS user_id,
  COALESCE(p.balance_usdt, 0) AS principal_usdt,
  COALESCE(f.balance_usdt, 0) AS profit_usdt,
  COALESCE(l.balance_usdt, 0) AS locked_usdt,
  COALESCE(c.balance_usdt, 0) AS practice_usdt,
  COALESCE(p.balance_usdt, 0)
    + COALESCE(f.balance_usdt, 0)
    + COALESCE(l.balance_usdt, 0)
    + COALESCE(c.balance_usdt, 0) AS liability_usdt,
  GREATEST(
    COALESCE(p.updated_at, '-infinity'::timestamptz),
    COALESCE(f.updated_at, '-infinity'::timestamptz),
    COALESCE(l.updated_at, '-infinity'::timestamptz),
    COALESCE(c.updated_at, '-infinity'::timestamptz)
  ) AS as_of
FROM public.users u
LEFT JOIN public.ledger_accounts p
  ON p.owner_user_id = u.id AND p.bucket = 'principal'
LEFT JOIN public.ledger_accounts f
  ON f.owner_user_id = u.id AND f.bucket = 'profit'
LEFT JOIN public.ledger_accounts l
  ON l.owner_user_id = u.id AND l.bucket = 'locked'
LEFT JOIN public.ledger_accounts c
  ON c.owner_user_id = u.id AND c.bucket = 'practice';

COMMENT ON VIEW public.wallet_buckets IS
  '§49 bucket projection · principal+profit+locked+practice = liability';
