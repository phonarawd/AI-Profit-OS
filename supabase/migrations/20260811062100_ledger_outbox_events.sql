-- Money post-r0 · committed-event-publication-durability-gap
-- Phase0 Postgres transactional outbox · NATS 필수 아님
-- Clause1: ledger journal + outbox intent same TX
-- Clause2: unpublished rows replayable after crash
-- Clause3: published_at set only after delivery attempt recorded · emit() return ≠ ack

CREATE TABLE IF NOT EXISTS public.ledger_outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid REFERENCES public.ledger_journals (id),
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text
);

CREATE INDEX IF NOT EXISTS ledger_outbox_events_unpublished_idx
  ON public.ledger_outbox_events (created_at ASC)
  WHERE published_at IS NULL;

COMMENT ON TABLE public.ledger_outbox_events IS
  'Phase0 transactional outbox for ledger domain events · at-least-once delivery';

ALTER TABLE public.ledger_outbox_events ENABLE ROW LEVEL SECURITY;
