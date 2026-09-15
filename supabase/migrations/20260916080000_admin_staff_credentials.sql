-- Additive Admin staff credentials. 시드 행 없음. 기존 행 DELETE 금지.
-- 첫 직원은 founder가 password-hash.ts scrypt 해시를 만들어 INSERT.
-- public.users / admin_credentials 비밀번호를 재사용하지 않는다.

CREATE TABLE IF NOT EXISTS public.admin_staff (
  admin_id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL
    CHECK (role IN ('super', 'finance', 'cs', 'risk', 'marketing')),
  status text NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_staff_email_lower_uq
  ON public.admin_staff (lower(email));

COMMENT ON TABLE public.admin_staff IS
  'Admin 직원 자격. public.users / admin_credentials 비밀번호를 재사용하지 않는다. 시드 없음.';

ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;
