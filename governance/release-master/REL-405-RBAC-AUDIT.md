# REL-405 RBAC + AUDIT FOUNDATION EVIDENCE

```text
REL = REL-405
TITLE = RBAC + Audit Foundation
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
LOCKED_ROLES = 5
INVENTED_ROLES = 0
AUDIT_DELETE = 0
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0
```

## IMPLEMENTATION

- 역할 SSOT 유지: `schemas/admin-rbac.v1.json` 5역할. 플랜 "8 role" 문구로 역할을 만들지 않음
- capability `audit` 추가: super write · finance/cs/risk read · marketing none
- 이벤트 스키마: `schemas/admin-audit.v1.json`
- 순수 쓰기/검증: `services/api-nest/admin-audit.core.cjs`
- Nest: `AdminAuditService` + `AuditEventsAdminController` + deny hook in `AdminGuard`
- migration file-only: `20260823160000_admin_audit_events.sql` (REL-701-DB apply)
- REL-214 `/admin/audit`는 honest empty 유지 (delete UI 0 · live-wire 0)

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/rel-405-rbac-audit.cjs` | PASS (5-role lock · deny+write fixture · server guard) |

## ACCEPTANCE

서버 RBAC/audit가 있다. 권한 없는 조치는 403과 함께 audit deny를 남긴다.

## EXIT_GATE

UI만 있고 서버 가드 없으면 FAIL — 페이지 + 서버 가드/스키마/쓰기가 함께 있다.
