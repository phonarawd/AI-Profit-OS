# REL-404 LIGHTHOUSE BUDGET EVIDENCE

```text
REL = REL-404
TITLE = Lighthouse CI + 성능예산 배선
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
LOCAL_FULL_LIGHTHOUSE = 0
NUMERIC_SLO_INVENTED = 0
HOME_VISUAL_REOPEN = 0
HOME_GEOMETRY_DIFF = 0
```

## IMPLEMENTATION

- 예산: `governance/performance/budgets.v1.json` — bundle / image / lazy
- 계약: `governance/performance/LIGHTHOUSE.md`
- 정적 러너: `tooling/perf/lighthouse.ci.cjs`
- 검증: `tooling/verify/rel-404-lighthouse-budget.cjs`
- CI: `gate.yml` 이 정적 게이트를 실행. 풀 LH = `lighthouse.yml` workflow_dispatch
- Home CSS/geometry 파일 0건 수정. REL-019 lock + Home freeze 재사용

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/rel-404-lighthouse-budget.cjs` | PASS (budget files + Home lock + lazy/image wiring) |

## ACCEPTANCE

성능 게이트 경로가 있다. 예산 파일이 레포에 있다.

## EXIT_GATE

Home 시각 후퇴 PR 거부 — freeze LOCKED · geometry rewrite FORBIDDEN.
