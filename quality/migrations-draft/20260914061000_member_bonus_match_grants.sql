-- DRAFT ONLY. 운영 DB에 적용하지 말 것.
-- 회원 추가 참여 기회. 사용량 reset/원장 변경 0.
-- 유효기간/이월 컬럼은 구조만. 활성화 트리거 없음.

CREATE TABLE IF NOT EXISTS public.member_bonus_match_grants (
  grant_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users (id),
  amount integer NOT NULL CHECK (amount > 0),
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  reclaimed integer NOT NULL DEFAULT 0 CHECK (reclaimed >= 0),
  status text NOT NULL DEFAULT 'active',
  reason text NOT NULL,
  updated_by_admin_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (used + reclaimed <= amount)
);

CREATE INDEX IF NOT EXISTS member_bonus_match_grants_user_idx
  ON public.member_bonus_match_grants (user_id, status);

COMMENT ON TABLE public.member_bonus_match_grants IS
  '추가 기회 지급/회수/소비 draft. expires_at 자동 소멸 미활성화. 멱등=idempotency_key. 감사=operator_control_audit.';
