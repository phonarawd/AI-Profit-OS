-- 운영자 CMS (공지/이벤트/혜택/배너/알림). 시드 글 없음.
-- 손님 API는 published 만. draft/ended 는 숨김.
-- 토토·베팅 테이블 금지. FX 컬럼 없음.

CREATE TABLE IF NOT EXISTS public.cms_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL
    CHECK (kind IN ('notice', 'event', 'benefit', 'banner', 'notification')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'ended')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text,
  published_at timestamptz,
  ended_at timestamptz,
  created_by_admin_id uuid NOT NULL,
  updated_by_admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_posts_title_len CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  CONSTRAINT cms_posts_body_len CHECK (char_length(body) <= 8000),
  CONSTRAINT cms_posts_image_https CHECK (
    image_url IS NULL OR image_url LIKE 'https://%'
  ),
  CONSTRAINT cms_posts_published_ts CHECK (
    status <> 'published' OR published_at IS NOT NULL
  ),
  CONSTRAINT cms_posts_ended_ts CHECK (
    status <> 'ended' OR ended_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS cms_posts_kind_status_idx
  ON public.cms_posts (kind, status, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS cms_posts_created_idx
  ON public.cms_posts (created_at DESC);

COMMENT ON TABLE public.cms_posts IS
  '운영자 공지/이벤트/혜택/배너/알림. 시드 0. 손님 노출은 published 만.';

ALTER TABLE public.cms_posts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cms_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.cms_posts TO service_role;
GRANT ALL ON TABLE public.cms_posts TO postgres;
