# REL-501 — 금융/red-team 풀매트릭스

STATUS: PASS
DATE: 2026-08-22
PROTECTED_SCOPE_MUTATION: false
LIVE_DB_MONEY_MUTATION: NOT_RUN
PRODUCTION_DB_WRITE: 0

## Intent

돈 경로의 실패 모드를 QA 가드 안에서 친다.

## Covered modes

| mode | code | proof |
|---|---|---|
| idempotency | `IDEMPOTENCY_KEY_CONFLICT` | same key + different fingerprint throws |
| double_submit | `REPLAY_REUSE` | same payload fingerprint reuses |
| insufficient | `INSUFFICIENT_PRINCIPAL` | requested > principal |
| stale | `PRICE_STALE_DATA` | `settlement_rule.guardParticipate` |
| expired | `OPPORTUNITY_EXPIRED` | status ≠ available |
| blocked | `MATCH_BLOCKED` | `guardParticipate` |
| replay | `REPLAY_REUSE` | identical fingerprint accepted as reuse |

## Verify

- `pnpm verify:money-red-team`
- 포함: `qa-env-isolation-guard` · `money-unavailable` · `participate-http` · `idempotency-conflict-detection`

## Guard

production project_ref `mgsytcetsiecllmhcyox` 에서 money mutation callback 실행 0.

## Honest gap

Isolated local QA DB가 없어 실원장 mutation E2E는 `NOT_RUN`.
이 공백을 PASS로 위조하지 않는다. 핵심 실패 모드 커버는 기존 engine/fingerprint/participate 계약으로 증명한다.
