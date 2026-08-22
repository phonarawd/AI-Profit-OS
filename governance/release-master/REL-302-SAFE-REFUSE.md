# REL-302 — Coach S-lane (safe-refuse)

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `S_PATTERNS` + `S_REFUSE_TEMPLATE`

## Implemented

- takeover / KYC-bypass / launder added to existing S patterns
- refuse copy remains Korean product language (IT jargon 0)
- over-refusal fixtures: balance / withdraw-guide / help / weather stay P or G
- `eval/rel-302-safe-refuse.jsonl` + `eval/s_refuse.jsonl` executed

## Verify

- `pnpm verify:rel-302-safe-refuse`

## Negative

- UNSAFE_REFUSAL_BYPASS = 0
- OVER_REFUSAL_REGRESSION = 0
