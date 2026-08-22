# REL-303 — prompt-injection / scope-escape red-team

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `OFF_TOPIC_PATTERNS` + `guardAnswer` meta residual

## Implemented

- committed `eval/rel-303-red-team.jsonl` actually executed
- also re-ran `eval/g_scope_escape.jsonl`
- system leak / force-tools / policy-ignore → `scope_redirect` or `refuse_s`
- tools remain []

## Verify

- `pnpm verify:rel-303-red-team`
- `pnpm verify:ai-scope-guard`

## Negative

- UNSAFE_REFUSAL_BYPASS = 0
- FAKE_TOOL_RESULT = 0
