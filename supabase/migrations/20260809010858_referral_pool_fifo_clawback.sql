-- Money §51.5 — Pool FIFO · clawback · accrual halt · share spam counter
-- FORBIDDEN: capPerReferrerMonth / per-user invite-count reject

ALTER TABLE public.referral_program_config
  ADD COLUMN IF NOT EXISTS accrual_halted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.referral_program_config.accrual_halted IS
  '§51.5 emergency cash accrual halt · invites continue';

CREATE TABLE public.referral_payout_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_id uuid NOT NULL REFERENCES public.referral_edges (id),
  level text NOT NULL CHECK (level IN ('L2', 'L3')),
  beneficiary_user_id uuid NOT NULL REFERENCES public.users (id),
  amount_usdt numeric(36, 18) NOT NULL CHECK (amount_usdt > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'held',
      'queued_pool',
      'released',
      'clawed_back',
      'cancelled'
    )),
  hold_until timestamptz,
  idempotency_key text NOT NULL,
  journal_id uuid REFERENCES public.ledger_journals (id),
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  clawed_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_payout_idem_uq UNIQUE (idempotency_key)
);

CREATE INDEX referral_payout_fifo_idx
  ON public.referral_payout_queue (status, enqueued_at ASC);
CREATE INDEX referral_payout_edge_idx
  ON public.referral_payout_queue (edge_id);

COMMENT ON TABLE public.referral_payout_queue IS
  '§51.5 Promo Pool FIFO · queued_pool ≠ invite failure';

CREATE TABLE public.referral_program_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  previous_payload jsonb,
  next_payload jsonb,
  changed_by_admin_id uuid NOT NULL,
  change_reason text NOT NULL CHECK (char_length(change_reason) >= 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.referral_share_daily (
  user_id uuid NOT NULL REFERENCES public.users (id),
  day_utc date NOT NULL,
  share_count integer NOT NULL DEFAULT 0 CHECK (share_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_utc)
);

COMMENT ON TABLE public.referral_share_daily IS
  '§51.5 sharePerUserPerDay spam only · NOT invite-count cap';

ALTER TABLE public.referral_edges
  ADD COLUMN IF NOT EXISTS l2_hold_until timestamptz,
  ADD COLUMN IF NOT EXISTS l2_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS clawback_journal_id uuid REFERENCES public.ledger_journals (id);

ALTER TABLE public.referral_payout_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_program_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_share_daily ENABLE ROW LEVEL SECURITY;
