-- Classic (username/password) signup, refresh-token session rotation,
-- server-owned magic-link consent, and admin users-list support.
-- Infra Section 51.9.1 (S1F). Nest JWT auth SoT only - Supabase Auth
-- remains forbidden. Additive-only, backward-compatible: existing
-- Kakao/magic-link/passkey users and rows are untouched.
--
-- Pre-flight facts confirmed read-only before writing this migration
-- (2026-09-05, mgsytcetsiecllmhcyox):
--   public.users: 3 rows, 3 distinct lower(email), 0 case-variant dupes,
--     1 phone_e164 (distinct), 0 password_hash usage.
--   public.auth_magic_link_challenges: 3 rows, purpose CHECK currently
--     ('login','signup') only, no 'password_reset' value yet.
--   Constraint names confirmed via pg_constraint:
--     users_email_key, users_phone_e164_key,
--     auth_magic_link_challenges_purpose_check.

-- ============================================================
-- 1) users: classic-signup identity columns
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS username_canonical text,
  ADD COLUMN IF NOT EXISTS email_canonical text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

COMMENT ON COLUMN public.users.username IS
  'Classic signup login id - lowercase ascii+digit+underscore only, 4-20 chars (services/api-nest/src/auth/classic-signup.policy.ts is the SSOT for the exact character/length rule)';
COMMENT ON COLUMN public.users.username_canonical IS
  'lower(username) - always equal to username under the current charset policy; kept as a separate column so a future relaxation of the input charset never silently breaks uniqueness';
COMMENT ON COLUMN public.users.email_canonical IS
  'lower(email) for lookup/uniqueness only. Never provider-specific (no gmail dot/plus stripping) - Founder decision.';
COMMENT ON COLUMN public.users.email_verified_at IS
  'Set exactly once, the moment the classic-signup or find-id-eligible email ownership proof succeeds. NULL = not verified. Magic-link/OAuth-provided-verified emails also set this on first use.';
COMMENT ON COLUMN public.users.phone_verified_at IS
  'Always NULL today - no phone verification flow ships in this wave (S1F Section 5: phone is optional, unverified, decorative-only at signup). Column exists now so a future verification flow needs zero migration and so the phone_e164 partial-unique index below has a real predicate.';

-- Backfill email_canonical for pre-existing rows (idempotent - safe to
-- re-run; WHERE clause means a second run touches 0 rows).
UPDATE public.users
   SET email_canonical = lower(email)
 WHERE email IS NOT NULL
   AND email_canonical IS NULL;

-- Fail loud (not silently corrupt) if case-variant email duplicates exist
-- before the unique index below would otherwise fail with a generic error.
DO $$
DECLARE
  dupe_count integer;
BEGIN
  SELECT count(*) INTO dupe_count FROM (
    SELECT lower(email) AS e FROM public.users WHERE email IS NOT NULL
    GROUP BY lower(email) HAVING count(*) > 1
  ) d;
  IF dupe_count > 0 THEN
    RAISE EXCEPTION
      'classic_signup_sessions_and_admin migration aborted: % case-variant duplicate email group(s) exist - resolve manually before adding users_email_canonical_uq',
      dupe_count;
  END IF;
END $$;

DO $$
DECLARE
  dupe_count integer;
BEGIN
  SELECT count(*) INTO dupe_count FROM (
    SELECT lower(username) AS u FROM public.users WHERE username IS NOT NULL
    GROUP BY lower(username) HAVING count(*) > 1
  ) d;
  IF dupe_count > 0 THEN
    RAISE EXCEPTION
      'classic_signup_sessions_and_admin migration aborted: % case-variant duplicate username group(s) exist',
      dupe_count;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_canonical_uq
  ON public.users (username_canonical)
  WHERE username_canonical IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_canonical_uq
  ON public.users (email_canonical)
  WHERE email_canonical IS NOT NULL;

-- Unverified phone numbers must never let one user block another from
-- later claiming/verifying the same number (S1F Section 5: "미인증 번호에는
-- phone_verified_at을 부여하지 않음" + "타인이 번호를 선점하지 못하도록").
-- Replace the old table-wide UNIQUE with a partial unique on verified rows
-- only. Safe at this exact moment: pre-flight query confirmed only 1
-- non-NULL phone_e164 value exists (zero collision risk), and no row has
-- phone_verified_at set yet (the column is brand new), so dropping the old
-- constraint cannot silently let an existing collision through unnoticed.
DO $$
DECLARE
  dupe_count integer;
BEGIN
  SELECT count(*) INTO dupe_count FROM (
    SELECT phone_e164 FROM public.users WHERE phone_e164 IS NOT NULL
    GROUP BY phone_e164 HAVING count(*) > 1
  ) d;
  IF dupe_count > 0 THEN
    RAISE EXCEPTION
      'classic_signup_sessions_and_admin migration aborted: % duplicate phone_e164 group(s) exist - resolve manually before relaxing the unique constraint',
      dupe_count;
  END IF;
END $$;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_e164_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_e164_verified_uq
  ON public.users (phone_e164)
  WHERE phone_verified_at IS NOT NULL;

-- ============================================================
-- 2) user_profiles: declared_name (separate from the public display_name)
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS declared_name text;

COMMENT ON COLUMN public.user_profiles.declared_name IS
  'Name entered at classic signup. NEVER labeled or stored as an identity-verified real name - there is no verification step behind it. Deliberately separate from display_name (the public nickname the user sets/edits later); never used as the public-facing name.';

-- ============================================================
-- 3) auth_sessions: refresh-token rotation family
-- ============================================================

ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS family_id uuid,
  ADD COLUMN IF NOT EXISTS rotated_at timestamptz,
  ADD COLUMN IF NOT EXISTS replaced_by_id uuid,
  ADD COLUMN IF NOT EXISTS reuse_detected_at timestamptz;

-- Backfill: every pre-existing row becomes its own single-row family so old
-- rows remain fully valid under the new model without any special-casing.
UPDATE public.auth_sessions
   SET family_id = id
 WHERE family_id IS NULL;

ALTER TABLE public.auth_sessions
  ALTER COLUMN family_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN family_id SET NOT NULL;

ALTER TABLE public.auth_sessions
  DROP CONSTRAINT IF EXISTS auth_sessions_replaced_by_id_fkey;
ALTER TABLE public.auth_sessions
  ADD CONSTRAINT auth_sessions_replaced_by_id_fkey
  FOREIGN KEY (replaced_by_id) REFERENCES public.auth_sessions (id);

CREATE INDEX IF NOT EXISTS auth_sessions_family_idx
  ON public.auth_sessions (family_id);

COMMENT ON COLUMN public.auth_sessions.family_id IS
  'Groups one continuous refresh-token rotation chain (one per login/device). "Log out this device" revokes only this family_id; "log out all devices" revokes every family_id for the user.';
COMMENT ON COLUMN public.auth_sessions.rotated_at IS
  'Set the moment this row''s refresh token is exchanged for a new one. A non-NULL value on the row a caller is trying to reuse means token reuse - see reuse_detected_at.';
COMMENT ON COLUMN public.auth_sessions.replaced_by_id IS
  'Points at the auth_sessions row minted by this row''s rotation. NULL = this is the current, still-valid tip of the chain (or the chain was revoked/never rotated).';
COMMENT ON COLUMN public.auth_sessions.reuse_detected_at IS
  'Set when a refresh token that was already rotated (or already revoked) is presented again - triggers whole-family revocation (services/api-nest/src/auth/auth.service.ts).';

-- ============================================================
-- 4) auth_magic_link_challenges: server-owned consent + password_reset
-- ============================================================

ALTER TABLE public.auth_magic_link_challenges
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean,
  ADD COLUMN IF NOT EXISTS referral_code text;

COMMENT ON COLUMN public.auth_magic_link_challenges.terms_accepted_at IS
  'Consent captured at REQUEST time (before the email is even sent), server-owned. Fixes the cross-device/cross-tab bug where a browser sessionStorage-only consent value was unavailable when the link was opened elsewhere.';
COMMENT ON COLUMN public.auth_magic_link_challenges.privacy_accepted_at IS
  'Paired with terms_accepted_at - see that column''s comment.';
COMMENT ON COLUMN public.auth_magic_link_challenges.marketing_consent IS
  'Optional consent captured at request time, same server-owned-pending-state fix as terms_accepted_at.';
COMMENT ON COLUMN public.auth_magic_link_challenges.referral_code IS
  'Optional referral code captured at request time (was previously only in browser sessionStorage).';

ALTER TABLE public.auth_magic_link_challenges
  DROP CONSTRAINT IF EXISTS auth_magic_link_challenges_purpose_check;
ALTER TABLE public.auth_magic_link_challenges
  ADD CONSTRAINT auth_magic_link_challenges_purpose_check
  CHECK (purpose IN ('login', 'signup', 'password_reset'));

COMMENT ON TABLE public.auth_magic_link_challenges IS
  'Section 51.9 Email magic link + password reset + email verification tokens - Resend delivery - Nest consumes token - NOT Supabase Auth. purpose=password_reset added S1F (2026-09-05).';

-- ============================================================
-- 5) pending_registrations: classic signup holding area until email
--    ownership is proven. NEVER a source of session authority by itself -
--    only a users.* row (created exactly once, atomically, on first
--    successful consume) grants a session (S1F Section 5 step 5-8).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_canonical text NOT NULL,
  username text NOT NULL,
  username_canonical text NOT NULL,
  password_hash text NOT NULL,
  declared_name text NOT NULL,
  birth_date date NOT NULL,
  phone_e164 text,
  terms_accepted_at timestamptz NOT NULL,
  privacy_accepted_at timestamptz NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT false,
  referral_code text,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PUTDUK continuation session, Step 4: every OTHER constraint edit in this
-- file (auth_sessions_replaced_by_id_fkey above, auth_magic_link_
-- challenges_purpose_check above) uses DROP CONSTRAINT IF EXISTS + ADD
-- CONSTRAINT so a migration re-run (partial-failure recovery, or a
-- migration-tracking tool losing its own bookkeeping right after a commit)
-- is a no-op instead of an error. This one constraint was a bare ADD
-- CONSTRAINT with no such guard - Postgres has no ADD CONSTRAINT IF NOT
-- EXISTS syntax, so a re-run would abort with "constraint ... already
-- exists" instead of completing cleanly. Matched to the same safe pattern
-- before this migration is applied anywhere (still COMMITTED_UNAPPLIED
-- per governance/release-master/MIGRATION_READINESS.md at the time of this
-- fix, so editing the file in place is safe - no environment has consumed
-- the old text yet).
ALTER TABLE public.pending_registrations
  DROP CONSTRAINT IF EXISTS pending_registrations_token_hash_key;
ALTER TABLE public.pending_registrations
  ADD CONSTRAINT pending_registrations_token_hash_key UNIQUE (token_hash);

CREATE INDEX IF NOT EXISTS pending_registrations_email_canonical_idx
  ON public.pending_registrations (email_canonical)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS pending_registrations_username_canonical_idx
  ON public.pending_registrations (username_canonical)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.pending_registrations IS
  'Classic signup - holds a scrypt password_hash (never plaintext) plus declared identity fields until email ownership is proven via token_hash. Consuming a row is the ONLY path that creates a real public.users row for a classic signup.';
COMMENT ON COLUMN public.pending_registrations.password_hash IS
  'Self-describing scrypt hash (services/api-nest/src/auth/password-hash.ts) - plaintext password is never written to any column, log, or table.';

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_registrations FORCE ROW LEVEL SECURITY;
