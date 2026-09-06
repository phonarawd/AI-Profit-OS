-- S3 / 3.4 퍼뜩 대화 이력
-- Redis working-state 와 다른 층. 유저 JWT 스코프만. production apply 는 S5 이후.

CREATE TABLE IF NOT EXISTS public.peotteok_conversations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users (id),
  title text NOT NULL CHECK (char_length(btrim(title)) >= 1 AND char_length(title) <= 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS peotteok_conversations_user_updated_idx
  ON public.peotteok_conversations (user_id, updated_at DESC);

COMMENT ON TABLE public.peotteok_conversations IS
  '퍼뜩 대화 목록. conversationId 단독으로 다른 유저 이력을 읽지 못한다.';

CREATE TABLE IF NOT EXISTS public.peotteok_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.peotteok_conversations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id),
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  body text NOT NULL,
  lane text,
  deep_link text,
  citation jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS peotteok_messages_owner_conv_idx
  ON public.peotteok_messages (user_id, conversation_id, created_at);

COMMENT ON TABLE public.peotteok_messages IS
  '퍼뜩 메시지. 조회는 항상 user_id = 세션 유저.';

ALTER TABLE public.peotteok_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peotteok_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.peotteok_conversations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.peotteok_messages FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.peotteok_conversations TO postgres, service_role;
GRANT ALL ON TABLE public.peotteok_messages TO postgres, service_role;
