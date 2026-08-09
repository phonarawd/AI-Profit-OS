-- Money §51.7 — practice bucket onboarding
-- welcome +10 USDT 1회 · expire 7d · practice→profit/withdraw 0
-- Ledger via practice_grant / practice_expire journals only (balance UPDATE 0)

CREATE TABLE public.practice_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  grant_key text NOT NULL,
  amount_usdt numeric(36, 18) NOT NULL CHECK (amount_usdt > 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),
  expires_at timestamptz NOT NULL,
  grant_journal_id uuid REFERENCES public.ledger_journals (id),
  expire_journal_id uuid REFERENCES public.ledger_journals (id),
  idempotency_key text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_grants_idem_uq UNIQUE (idempotency_key),
  CONSTRAINT practice_grants_user_key_uq UNIQUE (user_id, grant_key)
);

CREATE INDEX practice_grants_expire_due_idx
  ON public.practice_grants (status, expires_at ASC)
  WHERE status = 'active';

CREATE INDEX practice_grants_user_idx
  ON public.practice_grants (user_id, granted_at DESC);

COMMENT ON TABLE public.practice_grants IS
  '§51.7 practice welcome/referee · 1회 grant_key · expire cron · non-withdrawable';

COMMENT ON COLUMN public.practice_grants.grant_key IS
  'practice_grant_welcome (1/user) · practice_grant_referee:{edgeId}';

ALTER TABLE public.practice_grants ENABLE ROW LEVEL SECURITY;
