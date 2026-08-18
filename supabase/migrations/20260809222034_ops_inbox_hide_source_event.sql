-- UI §5.9.4 · Admin §9.8.8d — hide (soft) + fanout dedup source_event_id
-- schemas/ops-inbox-message.v1.json alignment

ALTER TABLE public.ops_inbox_messages
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_event_id text;

CREATE INDEX IF NOT EXISTS ops_inbox_messages_user_hidden_idx
  ON public.ops_inbox_messages (user_id)
  WHERE hidden_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ops_inbox_messages_source_event_uq
  ON public.ops_inbox_messages (user_id, source_event_id)
  WHERE source_event_id IS NOT NULL;
