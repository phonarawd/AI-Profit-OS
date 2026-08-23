# Admin RBAC + Audit Foundation (REL-405)

STATUS: LOCKED
LOCKED_ROLES = 5
INVENTED_ROLES = 0
AUDIT_DELETE = 0
USER_APP_ADMIN_IA: FORBIDDEN
USER_JWT_ADMIN_200: FAIL
PROTECTED_SCOPE_MUTATION: true

플랜 문구의 "8 role"은 실행 입력이 아니다. 역할 SSOT는
`schemas/admin-rbac.v1.json`의 5개만이다: `super` · `finance` · `cs` · `risk` ·
`marketing`. `role_6` / `role_7` / `role_8` 창작 금지.

## EXIT_GATE

UI만 있고 서버 가드가 없으면 FAIL. `/admin/audit` 페이지(REL-214)는 honest empty를
유지해도 된다. 서버 `AdminGuard` + `audit` capability + `admin_audit_events` 쓰기
경로가 있어야 PASS.

## Matrix

| role | `audit` | notes |
|---|---|---|
| super | write | `all` wildcard + explicit |
| finance | read | list/get |
| cs | read | list/get |
| risk | read | list/get |
| marketing | none | 403 + audit deny |

`rbac` write는 계속 super만. 13번째 사이드바 / `/admin/rbac` top-level 금지.
reserved child = `/admin/audit?tab=rbac`.

## Audit event

SSOT = `schemas/admin-audit.v1.json`

- who / what / target / time / mode / result(`preview|applied|denied|rolled_back`) / reason
- PII dump · bearer/token · money reconstruction 금지
- delete/wipe/update 금지 (append-only trigger)

## Server

- 쓰기: `services/api-nest/admin-audit.core.cjs` + `AdminAuditService`
- 거부: `AdminGuard` 403 + `result=denied` write
- 읽기: `GET /api/v1/admin/audit/events` · `GET /api/v1/admin/audit/events/:id`
  (`audit:read` 분류 후에만 200)
- 테이블: `supabase/migrations/20260823160000_admin_audit_events.sql`
  (file only · production apply = REL-701-DB)
