-- 고객 웹 GenderSelect 값만 서버에 둔다. 과거 행은 NULL.
-- 운영 적용 금지(이 브랜치는 작성·검증만).

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS gender text
  CHECK (gender IS NULL OR gender IN ('male', 'female'));

COMMENT ON COLUMN public.user_profiles.gender IS
  '고객 프로필 성별 · male|female · 미기입은 NULL · KYC/주민번호 아님';
