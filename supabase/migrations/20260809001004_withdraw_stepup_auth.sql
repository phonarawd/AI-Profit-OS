-- Money §43.6 step-up + §43.6a Admin PIN/WebAuthn wipe + §49.3 intent support
-- NEVER: plaintext PIN · Admin PIN set · ledger mutation on wipe/revoke

CREATE TABLE public.withdraw_pin_verifiers (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  must_reset boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.withdraw_pin_verifiers IS
  'Money §43.6 Encrypted PIN verifier only · Admin wipe → must_reset · plaintext FORBIDDEN';

CREATE TABLE public.withdraw_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT withdraw_recovery_codes_hash_uq UNIQUE (user_id, code_hash)
);

CREATE INDEX withdraw_recovery_codes_user_active_idx
  ON public.withdraw_recovery_codes (user_id)
  WHERE used_at IS NULL;

COMMENT ON TABLE public.withdraw_recovery_codes IS
  'Money §43.6 one-time recovery codes · hash only · bulk Admin expose FORBIDDEN';

CREATE TABLE public.withdraw_stepup_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN (
    'webauthn',
    'email_otp',
    'pin',
    'recovery'
  )),
  challenge_hash text NOT NULL,
  origin text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX withdraw_stepup_challenges_user_active_idx
  ON public.withdraw_stepup_challenges (user_id, created_at DESC)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.withdraw_stepup_challenges IS
  'Money §43.6 step-up challenges · TTL 60s · origin allowlist=APP_HOST';

CREATE TABLE public.withdraw_credentials_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  action text NOT NULL CHECK (action IN (
    'withdraw_pin.reset',
    'webauthn.revoke'
  )),
  admin_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT withdraw_credentials_audit_idem_uq UNIQUE (idempotency_key)
);

CREATE INDEX withdraw_credentials_audit_user_id_idx
  ON public.withdraw_credentials_audit (user_id, created_at DESC);

COMMENT ON TABLE public.withdraw_credentials_audit IS
  'Money §43.6a Admin PIN wipe / WebAuthn revoke audit · ledger 불변';

-- step_up_token on intent (opaque proof after auth_ok)
ALTER TABLE public.withdraw_intents
  ADD COLUMN IF NOT EXISTS step_up_method text
    CHECK (step_up_method IS NULL OR step_up_method IN (
      'webauthn', 'email_otp', 'pin', 'recovery'
    )),
  ADD COLUMN IF NOT EXISTS step_up_verified_at timestamptz;

COMMENT ON COLUMN public.withdraw_intents.step_up_method IS
  'Money §43.6 method that satisfied step-up before auth_ok';

ALTER TABLE public.withdraw_pin_verifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_stepup_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_credentials_audit ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.withdraw_pin_verifiers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_recovery_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_stepup_challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_credentials_audit FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.withdraw_pin_verifiers FROM anon, authenticated;
REVOKE ALL ON TABLE public.withdraw_recovery_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.withdraw_stepup_challenges FROM anon, authenticated;
REVOKE ALL ON TABLE public.withdraw_credentials_audit FROM anon, authenticated;
