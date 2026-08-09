-- Money §42 — KYC Admin approve/reject audit + retention pointer
-- Tables kyc_status / kyc_submissions already exist (identity_nest_auth)

CREATE TABLE IF NOT EXISTS public.kyc_decision_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  submission_id uuid NOT NULL REFERENCES public.kyc_submissions (id),
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  admin_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kyc_decision_audit_idem_uq UNIQUE (idempotency_key),
  CONSTRAINT kyc_decision_reject_reason_chk CHECK (
    decision <> 'rejected'
    OR (reason IS NOT NULL AND char_length(reason) >= 10)
  )
);

CREATE INDEX IF NOT EXISTS kyc_decision_audit_user_id_idx
  ON public.kyc_decision_audit (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS kyc_decision_audit_created_at_idx
  ON public.kyc_decision_audit (created_at DESC);

COMMENT ON TABLE public.kyc_decision_audit IS
  'Money §42.3 Admin compliance?tab=kyc approve/reject audit · push KYC_APPROVED/REJECTED';

-- Retention settings key (default 5 years after account close · §42.2.1)
CREATE TABLE IF NOT EXISTS public.kyc_retention_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retention_years integer NOT NULL DEFAULT 5 CHECK (retention_years >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.kyc_retention_settings (id, retention_years)
VALUES (1, 5)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.kyc_retention_settings IS
  'Money §42.2.1 KYC doc retention after delete — default 5y · cron+audit owns expiry';

ALTER TABLE public.kyc_decision_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_retention_settings ENABLE ROW LEVEL SECURITY;
