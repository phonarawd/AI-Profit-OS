# REL-305 — conversation-state bounded-memory

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `conversation-state.cjs` + `ConversationStateService`

## Implemented

- userId+conversationId key + ownership fail-closed
- MAX_TURNS sliding window unchanged
- turn text secret/token redaction on existing owner
- absolute lifetime / TTL cap unchanged
- ConversationStateService still does not own durable `memory.append`
- `eval/rel-305-bounded-memory.jsonl` executed

## Verify

- `pnpm verify:rel-305-bounded-memory`
- `pnpm verify:conversation-state-bounded`

## Negative

- UNBOUNDED_MEMORY_CREATED = 0
- SECRET_EXPOSURE_CREATED = 0
- SECOND_MEMORY_OWNER_CREATED = 0
