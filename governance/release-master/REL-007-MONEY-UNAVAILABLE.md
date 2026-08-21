# REL-007 MONEY 0 → UNAVAILABLE EVIDENCE

```text
REL = REL-007
TITLE = money 0 fallback → UNAVAILABLE + Bootstrap spec 검증
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-007
FIRST_EXECUTION_TODO = REL-008
```

## Changed paths

- `apps/web/lib/opportunity-card-map.ts` — missing money → `""` (no `"0"` invent)
- `packages/ui/components/opportunity/money-display.ts` — `UNAVAILABLE` / 화면 카피 `확인할 수 없음`
- `packages/ui/components/opportunity/OpportunityCard.tsx` — `data-money-state`
- `packages/ui/components/opportunity/OpportunityDetail.tsx` — `data-money-state`
- `packages/ui/components/opportunity/ParticipateProofPanel.tsx` — `data-money-state`
- `apps/web/components/spark-dash-home/format.ts` — `moneyState()`
- `tooling/e2e/lib/money-unavailable.cjs`
- `tooling/e2e/specs/money-unavailable.spec.cjs`
- `tooling/verify/money-unavailable.cjs`

Intentionally untouched: HomeDesktop / HomeMobile geometry, SDK `asAmount → "0"` (home-money-read-contract), execute preview `"12.50"` (REL-109), Money/Engine owners, production DB.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/money-unavailable.cjs` | PASS (missing → UNAVAILABLE, real `"0"`/`"0.00"` stays ready) |
| `CI=true pnpm verify:gate:fast` | PASS |
| `CI=true pnpm verify:gate:push` | PASS |
| GitHub `gate.yml` / `verify-gate` | SUCCESS `32392487318` |

FAKE MONEY invent-0 on card/detail/proof format path = 0. Home freeze visual redesign = 0.

## ACCEPTANCE

UNAVAILABLE 경로 실증. Home freeze 시각 재설계 0.

## Git

```text
REMOTE_MAIN_BEFORE = 06d688a2674ac9cf37f9be7cad5be64499121495
BRANCH = rel/REL-007-money-unavailable
HEAD_SHA = 98e450b838ee0aa00732f52f74d9433b9ddb650d
PR = https://github.com/phonarawd/AI-Profit-OS/pull/6
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32392487318
MERGE_METHOD = merge
MERGE_COMMIT = a1e327d7412ef6e30fa811e549796da69e8b3ff4
REMOTE_MAIN_AFTER = a1e327d7412ef6e30fa811e549796da69e8b3ff4
ADMIN_BYPASS_USED = 0
FORCE_PUSH_USAGE = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
```

## EXIT_GATE

missing→0 invent on consumer card/detail/proof format path closed. REL-007 PASS — REL-008 착수 가능.
