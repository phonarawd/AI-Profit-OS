-- DRAFT ONLY. 운영 DB에 적용하지 말 것.
-- supabase/migrations 에 넣지 말 것.
-- 승인된 격리 QA Postgres + “해당 QA에 초안 적용” 권한이 모두 있을 때만.
-- demo 직원·고정 비밀번호 시드 없음.

CREATE TABLE IF NOT EXISTS public.admin_staff (
  admin_id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_staff_email_lower_uq
  ON public.admin_staff (lower(email));

COMMENT ON TABLE public.admin_staff IS
  'Admin 직원 자격. public.users 비밀번호를 재사용하지 않는다.';
