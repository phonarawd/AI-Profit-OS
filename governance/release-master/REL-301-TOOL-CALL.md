# REL-301 — Coach G-lane (tools=[])

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `toolsForLane` + `routeAssistant` + `guardAnswer`

## Implemented

- G/S `tools=[]` unchanged
- `requestedTools` on G ignored
- fake tool-result / G fabricated money blocked in `guardAnswer`
- `eval/rel-301-tool-call.jsonl` + `eval/g_no_money.jsonl` executed

## Verify

- `pnpm verify:rel-301-tool-call`
- `pnpm verify:ai-general-no-money-tools`

## Negative

- FAKE_TOOL_RESULT = 0
- UNAUTHORIZED_TOOL_CALL = 0
- SECOND_TOOL_ROUTER_CREATED = 0
