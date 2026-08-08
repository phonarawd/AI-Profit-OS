-- Wallet / deposit / withdraw · §37 · §41 · §43 · §49
-- PG사(결제대행) path = 0

CREATE TABLE public.deposit_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config_version integer NOT NULL DEFAULT 1 CHECK (config_version >= 1),
  krw jsonb NOT NULL,
  usdt_onchain jsonb NOT NULL,
  pricing_guards jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_admin_id uuid NOT NULL
);

COMMENT ON TABLE public.deposit_config IS 'Singleton Admin deposit config · schemas/deposit-config.v1 · no PG사 fields';

CREATE TABLE public.user_deposit_addresses (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  trc20_address text NOT NULL UNIQUE CHECK (char_length(trc20_address) >= 30),
  derivation_index integer NOT NULL UNIQUE CHECK (derivation_index >= 0),
  qr_payload text NOT NULL,
  last_seen_tx_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_deposit_addresses IS '§41 per-user TRC20 · shared address FORBIDDEN';

CREATE TABLE public.krw_deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  requested_amount_krw integer NOT NULL CHECK (requested_amount_krw >= 1),
  payable_amount_krw integer NOT NULL CHECK (payable_amount_krw >= 1),
  unique_suffix_krw integer NOT NULL CHECK (unique_suffix_krw >= 0),
  deposit_code text NOT NULL CHECK (char_length(deposit_code) >= 4),
  depositor_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'matched', 'approved', 'expired', 'rejected', 'manual_review')),
  expires_at timestamptz NOT NULL,
  admin_note text,
  ledger_journal_id uuid REFERENCES public.ledger_journals (id),
  idempotency_key text NOT NULL UNIQUE,
  decided_at timestamptz,
  decided_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX krw_deposit_requests_active_payable_uq
  ON public.krw_deposit_requests (payable_amount_krw)
  WHERE status IN ('pending', 'matched', 'manual_review');

CREATE INDEX krw_deposit_requests_user_id_idx ON public.krw_deposit_requests (user_id);
CREATE INDEX krw_deposit_requests_status_idx ON public.krw_deposit_requests (status);

CREATE TABLE public.usdt_deposit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  tx_hash text NOT NULL,
  to_address text NOT NULL,
  amount_usdt numeric(36, 18) NOT NULL CHECK (amount_usdt > 0),
  confirmations integer NOT NULL DEFAULT 0 CHECK (confirmations >= 0),
  status text NOT NULL DEFAULT 'seen'
    CHECK (status IN ('seen', 'ui_confirmed', 'ledger_credited', 'swept', 'ignored')),
  ledger_journal_id uuid REFERENCES public.ledger_journals (id),
  idempotency_key text NOT NULL UNIQUE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usdt_deposit_events_tx_uq UNIQUE (tx_hash, to_address)
);

CREATE INDEX usdt_deposit_events_user_id_idx ON public.usdt_deposit_events (user_id);

CREATE TABLE public.withdraw_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  mode text NOT NULL CHECK (mode IN ('profit', 'principal', 'combined')),
  amount_usdt numeric(36, 18) NOT NULL CHECK (amount_usdt > 0),
  asset text NOT NULL CHECK (asset IN ('USDT', 'KRW')),
  debit_profit_usdt numeric(36, 18) NOT NULL DEFAULT 0 CHECK (debit_profit_usdt >= 0),
  debit_principal_usdt numeric(36, 18) NOT NULL DEFAULT 0 CHECK (debit_principal_usdt >= 0),
  require_principal_confirm boolean NOT NULL DEFAULT false,
  principal_confirm_token text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'confirmed',
      'auth_ok',
      'ledger_posted',
      'broadcasting',
      'queued',
      'completed',
      'rejected',
      'failed_refund_buckets'
    )),
  destination text,
  ledger_journal_id uuid REFERENCES public.ledger_journals (id),
  idempotency_key text NOT NULL UNIQUE,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT withdraw_intents_mode_amounts_chk CHECK (
    (mode = 'profit' AND debit_principal_usdt = 0 AND debit_profit_usdt = amount_usdt)
    OR (mode = 'principal' AND debit_profit_usdt = 0 AND debit_principal_usdt = amount_usdt AND require_principal_confirm)
    OR (mode = 'combined' AND debit_profit_usdt + debit_principal_usdt = amount_usdt AND require_principal_confirm)
  )
);

CREATE INDEX withdraw_intents_user_id_idx ON public.withdraw_intents (user_id);
CREATE INDEX withdraw_intents_status_idx ON public.withdraw_intents (status);
