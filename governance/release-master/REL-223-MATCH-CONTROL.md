# REL-223 MATCH CONTROL EVIDENCE

```text
REL = REL-223
TITLE = Allocation/Manual Match Control + Bulk/Schedule/Campaign Ops
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
LOCKED_VERBS = 5
INVENTED_VERBS = 0
SERVER_ENFORCE = 1
SIDEBAR_13 = 0
LEDGER_EDIT_VERBS = 0
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0
```

## IMPLEMENTATION

- 동사 상수: `schemas/admin-match-control.v1.json` + `admin-match-control.core.cjs`
- Nest: `GET/POST /api/v1/admin/match-controls/*` · capability `all` 재사용
- LIVE apply = preview + confirm 필수 (REL-222 `decideWrite` 재사용)
- bulk/schedule/campaign = `impactCount >= 1`
- 원장 편집 동사 거부. 이 모듈은 `ledger_*` 를 쓰지 않음
- migration file-only: `20260823200000_admin_match_controls.sql` (REL-701-DB apply)
- 사이드바 12 유지

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/rel-223-match-control.cjs` | PASS (5 verbs · preview LIVE · ledger verbs 0) |

## ACCEPTANCE

수동 매칭/대량 운영이 감사 가능.

## EXIT_GATE

숨은 잔액 수정 API 가 있으면 FAIL.
