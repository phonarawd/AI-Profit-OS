-- 구글 신규 가입: authorization code를 다시 쓰지 않도록 pending hash만 둔다.
-- 운영 적용 금지(이 브랜치는 작성·검증만).

CREATE TABLE public.auth_oauth_pending_signups (
  token_hash text PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('kakao', 'google')),
  provider_subject text NOT NULL,
  email_from_provider text,
  bind_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  user_id uuid REFERENCES public.users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_oauth_pending_signups_open_idx
  ON public.auth_oauth_pending_signups (expires_at)
  WHERE consumed_at IS NULL;

CREATE INDEX auth_oauth_pending_signups_user_id_idx
  ON public.auth_oauth_pending_signups (user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.auth_oauth_pending_signups IS
  'OAuth 신규 약관 pending · token hash only · Nest consume 1회';

ALTER TABLE public.auth_oauth_pending_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_oauth_pending_signups FORCE ROW LEVEL SECURITY;
