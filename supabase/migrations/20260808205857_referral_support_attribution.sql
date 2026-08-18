-- Referral / support / attribution / ops inbox · §51.5 · §51.6 · Infra §31

CREATE TABLE public.referral_program_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  rewards_enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_admin_id uuid,
  CONSTRAINT referral_program_no_monthly_cap_chk CHECK (
    NOT (config ? 'capPerReferrerMonth')
  )
);

COMMENT ON TABLE public.referral_program_config IS
  '§51.5 singleton · invite monthly cap field FORBIDDEN';

CREATE TABLE public.referral_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.users (id),
  referee_user_id uuid NOT NULL REFERENCES public.users (id),
  code text NOT NULL,
  bound_at timestamptz NOT NULL DEFAULT now(),
  levels_achieved text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'bound'
    CHECK (status IN (
      'bound',
      'l1_done',
      'l2_pending_hold',
      'l2_released',
      'l3_done',
      'held_risk',
      'clawed_back',
      'queued_pool'
    )),
  qualifying_deposit_usdt numeric(36, 18),
  computed_l2_referrer_usdt numeric(36, 18),
  idempotency_keys text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_edges_not_self_chk CHECK (referrer_user_id <> referee_user_id),
  CONSTRAINT referral_edges_referee_uq UNIQUE (referee_user_id)
);

CREATE INDEX referral_edges_referrer_idx ON public.referral_edges (referrer_user_id);
CREATE INDEX referral_edges_status_idx ON public.referral_edges (status);

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  category text NOT NULL CHECK (category IN ('deposit', 'withdraw', 'trade', 'account', 'other')),
  subject_ko text NOT NULL,
  body_ko text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'pending_user', 'resolved', 'escalated')),
  linked_trade_id uuid REFERENCES public.trade_executions (id),
  linked_tx_hash text,
  sla_due_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_tickets_user_id_idx ON public.support_tickets (user_id);
CREATE INDEX support_tickets_status_idx ON public.support_tickets (status);

CREATE TABLE public.user_attributions (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  first_touch jsonb NOT NULL,
  last_touch jsonb NOT NULL,
  consent_marketing boolean NOT NULL DEFAULT false,
  consent_at timestamptz NOT NULL,
  first_deposit_at timestamptz,
  first_deposit_usdt numeric(36, 18),
  capi_sent_events text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ops_inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  template text NOT NULL
    CHECK (template IN ('OPS_NOTICE', 'OPS_KYC', 'OPS_DEPOSIT', 'OPS_WITHDRAW', 'OPS_CUSTOM')),
  title_ko text NOT NULL CHECK (char_length(title_ko) <= 40),
  body_ko text NOT NULL CHECK (char_length(body_ko) <= 500),
  href text,
  read_at timestamptz,
  created_by_admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ops_inbox_messages_user_id_idx ON public.ops_inbox_messages (user_id);

CREATE TABLE public.tendency_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  memo_ko text NOT NULL,
  created_by_admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tendency_memos_user_id_idx ON public.tendency_memos (user_id);

CREATE TABLE public.admin_rbac (
  admin_id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  role text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_rbac IS 'Ops admin matrix · Nest-issued ops JWT · schemas/admin-rbac.v1';
