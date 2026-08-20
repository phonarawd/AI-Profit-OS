-- REL-020 Push+Badge
-- APPLY_THIS_SLICE = NO · file only · production apply 0 (REL-701-DB)
-- pushEnabled kill singleton + user push_subscriptions (max 5 via service)

CREATE TABLE IF NOT EXISTS public.push_control (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  push_enabled boolean NOT NULL DEFAULT true,
  reason text,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.push_control (id, push_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.push_control IS 'REL-020 Admin pushEnabled kill · UI=REL-213';

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  endpoint text NOT NULL CHECK (endpoint LIKE 'https://%'),
  p256dh text NOT NULL,
  auth text NOT NULL,
  platform text NOT NULL DEFAULT 'web'
    CHECK (platform IN ('web', 'ios_pwa', 'android_pwa', 'desktop')),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_user_endpoint_uq UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

COMMENT ON TABLE public.push_subscriptions IS 'REL-020 Web Push endpoints · schemas/push-subscription.v1';
