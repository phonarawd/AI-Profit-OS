-- Money §41.6 · §51.11 — wrong-chain / 오입금 disputes
-- Admin surface: /admin/wallet?tab=disputes
-- User entry: /me/support?category=deposit&kind=wrong_chain
-- NEVER: balance column UPDATE · credit without decision audit

CREATE TABLE public.deposit_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  support_ticket_id uuid REFERENCES public.support_tickets (id),
  kind text NOT NULL CHECK (kind IN ('wrong_chain', 'mis_deposit')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'credited', 'rejected')),
  linked_tx_hash text NOT NULL CHECK (char_length(linked_tx_hash) >= 8),
  network_claimed_ko text,
  amount_usdt numeric(36, 18),
  ledger_journal_id uuid,
  decided_at timestamptz,
  decided_by_admin_id uuid,
  decision_reason text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deposit_disputes_idem_uq UNIQUE (idempotency_key),
  CONSTRAINT deposit_disputes_reason_chk CHECK (
    status = 'open'
    OR (decision_reason IS NOT NULL AND char_length(decision_reason) >= 10)
  ),
  CONSTRAINT deposit_disputes_credit_journal_chk CHECK (
    status <> 'credited' OR ledger_journal_id IS NOT NULL
  )
);

CREATE INDEX deposit_disputes_status_idx
  ON public.deposit_disputes (status, created_at DESC);

CREATE INDEX deposit_disputes_user_idx
  ON public.deposit_disputes (user_id, created_at DESC);

CREATE INDEX deposit_disputes_tx_idx
  ON public.deposit_disputes (linked_tx_hash);

COMMENT ON TABLE public.deposit_disputes IS
  'Money §41.6/§51.11 wrong-chain·오입금 · Admin wallet?tab=disputes · ledger credit via admin_adjust only';

CREATE TABLE public.deposit_dispute_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.deposit_disputes (id),
  decision text NOT NULL CHECK (decision IN ('credit', 'reject')),
  admin_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) >= 10),
  ledger_journal_id uuid,
  amount_usdt numeric(36, 18),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deposit_dispute_decisions_idem_uq UNIQUE (idempotency_key)
);

CREATE INDEX deposit_dispute_decisions_dispute_idx
  ON public.deposit_dispute_decisions (dispute_id, created_at DESC);

COMMENT ON TABLE public.deposit_dispute_decisions IS
  'Money §51.11 every dispute decide is audited · credit = admin_adjust journal';

ALTER TABLE public.deposit_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_dispute_decisions ENABLE ROW LEVEL SECURITY;
