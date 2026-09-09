-- S3/3.2: 약관·개인정보 동의 버전 + 카카오 최초 프로필 이미지 URL
-- 하위 호환 ADD COLUMN. 이 슬라이스는 production apply 하지 않는다.

ALTER TABLE public.pending_registrations
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_version text;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS privacy_version text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.pending_registrations.terms_version IS
  '이용약관 문서 버전. 동의 시각만으로는 어떤 문서인지 알 수 없다.';
COMMENT ON COLUMN public.pending_registrations.privacy_version IS
  '개인정보 처리방침 문서 버전.';
COMMENT ON COLUMN public.user_profiles.avatar_url IS
  '선택 동의로 받은 최초 프로필 이미지 URL. 재로그인으로 덮어쓰지 않는다.';
