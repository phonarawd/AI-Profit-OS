# Engine Acceptance Invariants v1 (정답표 · QA-0 문서화)

> HTTP 200이 아니라 **상태 진실**. critical 여부는 아래 + `coverage.v1.json` 표기.  
> QA-0 = 문서화 only · suite 실행·결함 수정 금지.

| id | critical | 요약 |
|---|---|---|
| INV-LEDGER-01 | yes | ledger/bucket 불변 · money corruption 0 |
| INV-IDEMPOTENCY-01 | yes | same key + same payload → 동일 결과 · 중복 side-effect 0 |
| INV-IDEMPOTENCY-03 | yes | same key + conflicting payload → 명시적 거부 (`verify:idempotency-conflict-detection`) |
| INV-ISOLATION-01 | yes | user isolation — A/B interleave · token 교차 · object id 교체 · concurrent |
| INV-LIFECYCLE-01 | yes | participate/execute lifecycle · Rule 전이 모순 0 |
| INV-FEED-AI-01 | yes | feed/home · AI 실패가 ledger를 깨뜨림 0 |
| INV-TIME-01 | yes | time (KST 경계) 상태 진실 |
| INV-PRIVACY-01 | yes | privacy delete-account 후 잔존/교차 0 |
| INV-AI-01 | yes | AI grounding / autonomy0 / fail-safe |
| INV-PERF-01 | yes | k6 scenario mix · tag threshold 메커니즘 · 수치 SLO는 제품 계약에서만 (창작 금지) |

## BLOCKED 연결

| invariant | hook 부재 시 |
|---|---|
| INV-TIME-01 | `BLOCKED_NO_CLOCK_HOOK` |
| INV-FEED-AI-01 (QA5 axis1) | `BLOCKED_NO_FAULT_HOOK` |
| INV-LEDGER-01 (QA5 axis2 recovery scan) | `BLOCKED_NO_FAULT_HOOK` |
| (other fault suites) | `BLOCKED_NO_FAULT_HOOK` |
| INV-PERF-01 (QA6) | `BLOCKED_MISSING_ORACLE` 또는 suite `UNSPECIFIED_PERF_BUDGET` |

critical + BLOCKED/SKIPPED/UNCOVERED → `ENGINE_QA_INCOMPLETE` (ACCEPTED 불가).
