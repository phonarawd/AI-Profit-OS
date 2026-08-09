-- Money §49.9 — abuse/error defense · risk state · Admin risk?tab=queue
-- Nest module Owns · separate risk-service folder FORBIDDEN

CREATE TABLE public.user_risk_state (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'flagged', 'restricted', 'frozen', 'banned')),
  reason text,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_risk_state_reason_chk CHECK (
    status = 'active'
    OR (reason IS NOT NULL AND char_length(reason) >= 10)
  )
);

COMMENT ON TABLE public.user_risk_state IS
  'Money §49.9C · active→flagged→restricted→frozen→banned · separate from users.status login lifecycle';

CREATE TABLE public.risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id),
  rule_code text NOT NULL
    CHECK (rule_code ~ '^(P([1-9]|1[0-9]|2[0-4])|E([1-9]|1[0-2]))$'),
  severity text NOT NULL
    CHECK (severity IN ('info', 'warn', 'high', 'p0')),
  queue_status text NOT NULL DEFAULT 'open'
    CHECK (queue_status IN ('open', 'acked', 'resolved', 'auto_frozen')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  freeze_linked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_admin_id uuid
);

CREATE INDEX risk_signals_queue_idx
  ON public.risk_signals (queue_status, created_at DESC)
  WHERE queue_status IN ('open', 'auto_frozen');

CREATE INDEX risk_signals_user_idx
  ON public.risk_signals (user_id, created_at DESC);

CREATE INDEX risk_signals_rule_idx
  ON public.risk_signals (rule_code, created_at DESC);

COMMENT ON TABLE public.risk_signals IS
  'Money §49.9 P1~P24 · E1~E12 signals · Admin /admin/risk?tab=queue';

CREATE TABLE public.risk_signal_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES public.risk_signals (id),
  -- nullable for system circuit_open/close (no single user)
  user_id uuid REFERENCES public.users (id),
  action text NOT NULL CHECK (action IN (
    'flag', 'restrict', 'freeze', 'unfreeze', 'ban',
    'ack', 'resolve', 'circuit_open', 'circuit_close'
  )),
  admin_id uuid,
  reason text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT risk_signal_actions_idem_uq UNIQUE (idempotency_key),
  CONSTRAINT risk_signal_actions_reason_chk CHECK (
    reason IS NULL OR char_length(reason) >= 10
  ),
  CONSTRAINT risk_signal_actions_user_chk CHECK (
    action IN ('circuit_open', 'circuit_close') OR user_id IS NOT NULL
  )
);

CREATE INDEX risk_signal_actions_user_idx
  ON public.risk_signal_actions (user_id, created_at DESC);

COMMENT ON TABLE public.risk_signal_actions IS
  'Money §49.9 freeze/unfreeze/ack audit · Admin risk queue decisions';

-- Singleton money-ops circuit (E1/P24 bucket drift → open)
CREATE TABLE public.money_circuit (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  open boolean NOT NULL DEFAULT false,
  reason_code text,
  detail text,
  opened_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.money_circuit (id, open)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.money_circuit IS
  'Money §49.9 E1/P24 · BUCKET_INVARIANT_FAIL opens · withdraw/merge/participate halt';

ALTER TABLE public.user_risk_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_signal_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_circuit ENABLE ROW LEVEL SECURITY;
