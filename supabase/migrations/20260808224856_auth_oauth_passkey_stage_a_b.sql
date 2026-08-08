-- Infra §51.9 + §51.9.1 · Nest JWT Auth SSOT
-- OAuth/Passkey identities · Stage A contact optional · delete-account anonymize
-- FORBIDDEN: FK to auth.users · Supabase Auth as session SoT

-- Stage A may create users with only OAuth/Passkey identity (email/phone at Stage B).
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_contact_chk;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text;

COMMENT ON COLUMN public.users.anonymized_at IS '§51.9 delete-account · PII scrubbed after ledger/pending guards';

CREATE TABLE public.auth_oauth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('kakao', 'google')),
  provider_subject text NOT NULL,
  email_from_provider text,
  raw_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz,
  CONSTRAINT auth_oauth_identities_provider_subject_uq UNIQUE (provider, provider_subject)
);

CREATE INDEX auth_oauth_identities_user_id_idx
  ON public.auth_oauth_identities (user_id)
  WHERE unlinked_at IS NULL;

COMMENT ON TABLE public.auth_oauth_identities IS
  '§51.9 Nest OAuth SoT · Kakao primary / Google · NOT Supabase Auth identities';

CREATE TABLE public.auth_passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0 CHECK (sign_count >= 0),
  transports text[] NOT NULL DEFAULT '{}',
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX auth_passkeys_user_id_idx
  ON public.auth_passkeys (user_id)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE public.auth_passkeys IS
  '§51.9 WebAuthn/Passkey credentials · Nest verify only · Admin revoke via §9.8';

CREATE TABLE public.auth_magic_link_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL DEFAULT 'login'
    CHECK (purpose IN ('login', 'signup')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_magic_link_challenges_email_idx
  ON public.auth_magic_link_challenges (email)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.auth_magic_link_challenges IS
  '§51.9 Email magic link · Resend delivery · Nest consumes token · NOT Supabase Auth';

-- Identity proof for Stage A: contact OR live OAuth OR live Passkey
CREATE OR REPLACE FUNCTION public.users_stage_a_identity_ok(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_user_id
        AND (u.email IS NOT NULL OR u.phone_e164 IS NOT NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.auth_oauth_identities o
      WHERE o.user_id = p_user_id AND o.unlinked_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.auth_passkeys p
      WHERE p.user_id = p_user_id AND p.revoked_at IS NULL
    );
$$;

COMMENT ON FUNCTION public.users_stage_a_identity_ok(uuid) IS
  '§51.9.1 Stage A identity · email|phone|oauth|passkey';

REVOKE ALL ON FUNCTION public.users_stage_a_identity_ok(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.users_stage_a_identity_ok(uuid) TO postgres, service_role;

ALTER TABLE public.auth_oauth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_magic_link_challenges ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.auth_oauth_identities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.auth_passkeys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.auth_magic_link_challenges FORCE ROW LEVEL SECURITY;
