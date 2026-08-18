-- Money post-r0 · idempotency-conflict-detection-invariant-gap
-- Same idempotency_key + semantically different payload → conflict (not silent reuse)
-- Fingerprint algorithm is implementation detail · invariant = conflict detection

ALTER TABLE public.ledger_journals
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

COMMENT ON COLUMN public.ledger_journals.request_fingerprint IS
  'Canonical semantic fingerprint for idempotency conflict detection · null=legacy pre-wave1';

ALTER TABLE public.participate_requests
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

COMMENT ON COLUMN public.participate_requests.request_fingerprint IS
  'Canonical semantic fingerprint for idempotency conflict detection · null=legacy pre-wave1';
