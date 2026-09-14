-- DRAFT ONLY. 운영 DB에 적용하지 말 것.
-- 등급/보너스 감사 + 연출 profile. 기존 회원 행 backfill 0. 원장 쓰기 0.

CREATE TABLE IF NOT EXISTS public.operator_control_audit (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  before_json jsonb,
  after_json jsonb,
  reason text NOT NULL,
  admin_id uuid NOT NULL,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operator_control_audit_action_idx
  ON public.operator_control_audit (action, created_at DESC);

COMMENT ON TABLE public.operator_control_audit IS
  '등급 일일 정책·추가 기회·연출 profile 감사. 토큰/비밀번호/KYC 원문 금지.';

CREATE TABLE IF NOT EXISTS public.journey_presentation_profile (
  revision integer PRIMARY KEY,
  profile jsonb NOT NULL,
  reason text NOT NULL,
  updated_by_admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.journey_presentation_profile IS
  'J01 draft. v19 기본 8–15초 5단계. engine/원장/cap/grade 와 독립. 미적용 시 저장 차단.';
