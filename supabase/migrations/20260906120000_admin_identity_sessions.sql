-- S3 / B0 Admin 신원 · durable session · MFA · maker-checker
-- admin_rbac 에는 role/active/capability 만 둔다. 비밀번호·TOTP·backup·세션은 분리 테이블.
-- Additive · backward compatible · RLS deny-all (Nest DATABASE_URL 만 접근)

-- ============================================================
-- 1) admin_credentials
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_credentials (
  admin_id uuid PRIMARY KEY REFERENCES public.admin_rbac (admin_id) ON DELETE CASCADE,
  username_canonical text NOT NULL,
  password_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_credentials_username_len_chk
    CHECK (char_length(username_canonical) BETWEEN 3 AND 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_credentials_username_uq
  ON public.admin_credentials (username_canonical);

COMMENT ON TABLE public.admin_credentials IS
  'S3 B0 admin password — scrypt self-describing hash only. Never store TOTP/backup/session here.';
COMMENT ON COLUMN public.admin_credentials.password_hash IS
  'scrypt$N$r$p$saltB64$hashB64 (services/api-nest/src/auth/password-hash.ts). Plaintext 0.';

-- ============================================================
-- 2) admin_totp — ciphertext (복호화 가능). hash 만 저장하면 TOTP 불가.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_totp (
  admin_id uuid PRIMARY KEY REFERENCES public.admin_rbac (admin_id) ON DELETE CASCADE,
  secret_ciphertext text NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_totp IS
  'S3 B0 TOTP secret AES-256-GCM ciphertext. Backup code 와 저장 방식 분리. 로그/응답 금지.';

-- ============================================================
-- 3) admin_backup_codes — hash, 1회 소비
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_rbac (admin_id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_backup_codes_admin_idx
  ON public.admin_backup_codes (admin_id)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.admin_backup_codes IS
  'S3 B0 hashed one-time backup codes. Never encrypt-for-redisplay. Consume on use.';

-- ============================================================
-- 4) admin_sessions — 프로세스 Map revoke 금지. 재시작·다중 인스턴스 유지.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_rbac (admin_id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  access_jti text NOT NULL,
  refresh_hash text NOT NULL,
  kind text NOT NULL
    CHECK (kind IN ('password_mfa', 'code_exchange_emergency')),
  authenticator_assurance text NOT NULL
    CHECK (authenticator_assurance IN ('aal1', 'aal2')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  idle_deadline timestamptz NOT NULL,
  step_up_at timestamptz,
  user_agent_class text,
  ip_class text,
  rotated_at timestamptz,
  replaced_by_id uuid,
  reuse_detected_at timestamptz,
  revoked_at timestamptz
);

ALTER TABLE public.admin_sessions
  DROP CONSTRAINT IF EXISTS admin_sessions_replaced_by_id_fkey;
ALTER TABLE public.admin_sessions
  ADD CONSTRAINT admin_sessions_replaced_by_id_fkey
  FOREIGN KEY (replaced_by_id) REFERENCES public.admin_sessions (id);

CREATE UNIQUE INDEX IF NOT EXISTS admin_sessions_access_jti_uq
  ON public.admin_sessions (access_jti);

CREATE INDEX IF NOT EXISTS admin_sessions_admin_idx
  ON public.admin_sessions (admin_id, revoked_at);

CREATE INDEX IF NOT EXISTS admin_sessions_family_idx
  ON public.admin_sessions (family_id);

CREATE INDEX IF NOT EXISTS admin_sessions_refresh_hash_idx
  ON public.admin_sessions (refresh_hash)
  WHERE revoked_at IS NULL AND rotated_at IS NULL;

COMMENT ON TABLE public.admin_sessions IS
  'S3 B0 durable admin session. Process-memory revoke is not authority.';
COMMENT ON COLUMN public.admin_sessions.kind IS
  'password_mfa = 정상 로그인. code_exchange_emergency = 연결 코드, write 금지.';

-- ============================================================
-- 5) admin_login_challenges — password 성공 후 MFA / step-up
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_login_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_rbac (admin_id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('login_mfa', 'step_up')),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_login_challenges_token_hash_uq
  ON public.admin_login_challenges (token_hash);

COMMENT ON TABLE public.admin_login_challenges IS
  'S3 B0 short-lived MFA/step-up challenge. Generic failure. Account/MFA existence not leaked on password fail.';

-- ============================================================
-- 6) admin_code_exchanges — 연결 코드 1회 소비 (durable)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_code_exchanges (
  token_hash text PRIMARY KEY,
  consumed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

COMMENT ON TABLE public.admin_code_exchanges IS
  'S3 B0 one-time admin connection-code consume. Survives process restart.';

-- ============================================================
-- 7) admin_approval_requests — maker-checker. 자기 승인 금지.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  maker_admin_id uuid NOT NULL REFERENCES public.admin_rbac (admin_id),
  checker_admin_id uuid REFERENCES public.admin_rbac (admin_id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reason text NOT NULL CHECK (char_length(reason) >= 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CONSTRAINT admin_approval_no_self_chk
    CHECK (checker_admin_id IS NULL OR checker_admin_id <> maker_admin_id)
);

CREATE INDEX IF NOT EXISTS admin_approval_requests_status_idx
  ON public.admin_approval_requests (status, created_at DESC);

COMMENT ON TABLE public.admin_approval_requests IS
  'S3 B0 maker-checker. Self-approval forbidden. Two test admins ≠ production 2nd operator.';

-- ============================================================
-- 8) RLS
-- ============================================================

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_totp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_totp FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_backup_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_code_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_code_exchanges FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_approval_requests FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_credentials FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_totp FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_backup_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_login_challenges FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_code_exchanges FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_approval_requests FROM anon, authenticated;
