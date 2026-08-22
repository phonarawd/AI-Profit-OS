# REL-300 — Coach P-lane (Fact-only)

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `renderFactAnswer` + `routeAssistant` + `FactToolService`

## Implemented

- empty Fact → `P_UNAVAILABLE_TEMPLATE` (invented USDT 0)
- missing `profitUsdt` → UNAVAILABLE, not `0`
- `eval/rel-300-fact-only.jsonl` executed by `verify:rel-300-fact-only`
- existing `verify:ai-coach-fact-only` still live

## Verify

- `pnpm verify:rel-300-fact-only`
- `pnpm verify:ai-coach-fact-only`

## Negative

- FAKE_FACT = 0
- FAKE_MONEY = 0
- SECOND_AI_RUNTIME_CREATED = 0
