-- Nest JWT identity SoT · ADR-006
-- FORBIDDEN: FK to auth.users · Supabase Auth SDK as session SoT
-- System schema `auth` may exist as platform default — not app SoT.

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone_e164 text UNIQUE,
  password_hash text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'banned', 'deleted')),
  referral_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_contact_chk CHECK (email IS NOT NULL OR phone_e164 IS NOT NULL)
);

COMMENT ON TABLE public.users IS 'App user SoT · Nest Auth only · NOT auth.users';

CREATE TABLE public.auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  issuer text NOT NULL DEFAULT 'ai-profit-os-nest'
    CHECK (issuer = 'ai-profit-os-nest'),
  device_id text,
  device_label text,
  ip text,
  refresh_jti text UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_sessions_user_id_idx ON public.auth_sessions (user_id);
CREATE INDEX auth_sessions_active_idx ON public.auth_sessions (user_id)
  WHERE revoked = false;

COMMENT ON TABLE public.auth_sessions IS 'Nest JWT sessions · schemas/auth-session.v1 · Supabase Auth FORBIDDEN';

CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  terms_accepted_at timestamptz NOT NULL,
  privacy_accepted_at timestamptz NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT false,
  display_name text CHECK (display_name IS NULL OR (char_length(display_name) BETWEEN 2 AND 40)),
  birth_date date,
  onboarding_stage text NOT NULL DEFAULT 'A'
    CHECK (onboarding_stage IN ('A', 'B_incomplete', 'B_complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_ux_prefs (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  tone_band text NOT NULL DEFAULT 'mid'
    CHECK (tone_band IN ('young', 'mid', 'senior')),
  font_scale text NOT NULL DEFAULT 'md'
    CHECK (font_scale IN ('md', 'lg', 'xl')),
  deposit_pref text NOT NULL DEFAULT 'usdt'
    CHECK (deposit_pref IN ('usdt', 'krw')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_membership (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  membership text NOT NULL DEFAULT 'sprout'
    CHECK (membership IN ('sprout', 'entry', 'core', 'high', 'vip')),
  max_capital_band text NOT NULL DEFAULT 'micro'
    CHECK (max_capital_band IN ('micro', 'small', 'mid', 'high', 'whale')),
  daily_user_match_cap integer NOT NULL DEFAULT 0 CHECK (daily_user_match_cap >= 0),
  match_strictness text NOT NULL DEFAULT 'standard'
    CHECK (match_strictness IN ('lenient', 'standard', 'tight', 'scarce', 'custom')),
  admin_force boolean NOT NULL DEFAULT false,
  ai_perk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  fulfill_rate_7d numeric(8, 6),
  daily_matches_used integer NOT NULL DEFAULT 0 CHECK (daily_matches_used >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_capability (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  match_blocked boolean NOT NULL DEFAULT false,
  withdraw_apply_blocked boolean NOT NULL DEFAULT false,
  reason text,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_capability_reason_chk CHECK (
    (NOT match_blocked AND NOT withdraw_apply_blocked)
    OR (reason IS NOT NULL AND char_length(reason) >= 10)
  )
);

CREATE TABLE public.notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  master boolean NOT NULL DEFAULT true,
  opportunity boolean NOT NULL DEFAULT true,
  wallet boolean NOT NULL DEFAULT true,
  notice boolean NOT NULL DEFAULT true,
  campaign boolean NOT NULL DEFAULT true,
  ops_message boolean NOT NULL DEFAULT true,
  strategy_match boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kyc_status (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  kyc_status text NOT NULL DEFAULT 'none'
    CHECK (kyc_status IN ('none', 'pending', 'approved', 'rejected')),
  submission_id uuid,
  decided_at timestamptz,
  reject_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kyc_reject_reason_chk CHECK (
    kyc_status <> 'rejected'
    OR (reject_reason IS NOT NULL AND char_length(reject_reason) >= 10)
  )
);

CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id),
  legal_name text NOT NULL,
  phone_e164 text NOT NULL,
  birth_date date NOT NULL,
  id_doc_type text NOT NULL CHECK (id_doc_type IN ('kr_id', 'driver', 'passport')),
  id_doc_r2_key text NOT NULL CHECK (id_doc_r2_key LIKE 'kyc/%'),
  selfie_r2_key text CHECK (selfie_r2_key IS NULL OR selfie_r2_key LIKE 'kyc/%'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason text,
  decided_by_admin_id uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX kyc_submissions_user_id_idx ON public.kyc_submissions (user_id);

ALTER TABLE public.kyc_status
  ADD CONSTRAINT kyc_status_submission_fk
  FOREIGN KEY (submission_id) REFERENCES public.kyc_submissions (id);
