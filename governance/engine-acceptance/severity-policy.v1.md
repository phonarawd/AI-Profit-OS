# Engine Acceptance Severity Policy v1

> **Status:** LOCKED **before** any QA suite results (QA-0)  
> **금지:** 테스트 결과를 본 뒤 severity **재조정 금지** · PASS를 위한 severity 강등

## Severity 정의 (선고정)

| Sev | 정의 | UI 진입 |
|---|---|---|
| **P0** | cross-user data leak · money corruption · unrecoverable loss 등 catastrophic integrity/security | 차단 (`ENGINE_NOT_ACCEPTED`) |
| **P1** | core lifecycle / idempotency / authorization / fail-safe 위반 — UI 진입 차단급 | 차단 (`ENGINE_NOT_ACCEPTED`) |
| **P2** | 중요 정확성 저하 · 비치명 계약 위반 | ACCEPTED 가능(단 critical coverage·evidence 조건은 별도) |
| **P3** | 비핵심 polish / 관측 구멍(critical 아니면) | ACCEPTED 가능 |

## Defect 레코드 필수 링크

`defects.v1.json` 각 항목:

- `severity` ∈ {P0,P1,P2,P3}
- `invariant_id`
- `suite_id`
- `persona_id` (해당 시)
- `journey_id` (해당 시)
- `seed`
- `trace_id`
- `baseline_id`
- `first_observed_at` (ISO-8601)
- `repro_status` ∈ {repro_pending, repro_confirmed, unreproducible, blocked}

## 판정 연동

```text
defects.P0 > 0 OR defects.P1 > 0 → ENGINE_NOT_ACCEPTED
```

P2/P3만으로는 NOT_ACCEPTED가 되지 않는다.  
단, critical invariant가 BLOCKED/SKIPPED/UNCOVERED이면 severity와 무관하게 `ENGINE_QA_INCOMPLETE`.

## QA-0 기록

- 본 정책 고정 시각은 baseline `measuredAt` 이전이어야 한다 (파일 mtime/커밋 순서로 verifier가 존재만 확인 · 내용 재해석 금지).
- QA-0에서는 defect 전수 수집을 시작하지 않는다 — 스키마·빈 레지스트리만 잠금.
