-- GHA hosted runner 일회용 Postgres 전용. 운영 DB / supabase/migrations 승격 금지.
-- 빈 QA DB에 draft ALTER TABLE public.opportunities 가 실패하지 않게 최소 선행만 만든다.
-- 운영 데이터·demo 직원·고정 운영 비밀번호 시드 없음.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  status text NOT NULL DEFAULT 'active',
  referral_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_uq
  ON public.users (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_membership (
  user_id uuid PRIMARY KEY,
  daily_matches_used integer NOT NULL DEFAULT 0,
  daily_user_match_cap integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
