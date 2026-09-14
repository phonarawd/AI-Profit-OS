-- DRAFT ONLY. 운영 DB에 적용하지 말 것.
-- 등급별 하루 기본 기회. 기존 user_membership 행 UPDATE/backfill 0.

CREATE TABLE IF NOT EXISTS public.membership_grade_daily_policy (
  revision integer PRIMARY KEY,
  caps jsonb NOT NULL,
  reason text NOT NULL,
  updated_by_admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.membership_grade_daily_policy IS
  'Q11 draft. 신규 sprout 기본 5. 기존 회원 행을 일괄 덮지 않음. 감사는 operator_control_audit.';
