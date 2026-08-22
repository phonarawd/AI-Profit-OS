# REL-304 — numeric-grounding + fact-freshness

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `collectGroundedNumerics` + `guardAnswer` + `P_UNAVAILABLE_TEMPLATE`

## Implemented

- grounded items keep `source` + `asOf`
- stale Fact + money tool → refresh (not current truth)
- null profit stays unknown, not 0
- empty facts → UNAVAILABLE (REL-007)
- `eval/rel-304-grounding.jsonl` executed

## Verify

- `pnpm verify:rel-304-grounding`
- `pnpm verify:numeric-grounding`
- `pnpm verify:fact-freshness`

## Negative

- UNGROUNDED_CURRENT_CLAIM = 0
- STALE_AS_CURRENT = 0
- FAKE_MONEY = 0
- FAKE_MATCH_TRUTH = 0
- FAKE_SETTLEMENT_TRUTH = 0
