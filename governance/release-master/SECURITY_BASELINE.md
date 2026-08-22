# Security baseline — REL-408

DATE: 2026-08-22
PRODUCTION_DB_WRITE = 0
MIGRATION_FILE_CREATED = YES
MIGRATION_APPLIED = 0

Query: `pg_class.relrowsecurity` + `pg_policies` count on `public` (read-only).
Roles: `pg_roles` login / bypassrls (read-only).

## RLS-role 실측 (읽기 전용 · 2026-08-22)

- 관측 테이블 전부 `RLS_ENABLED = true`
- Data API 기본: 정책 0건인 테이블이 다수 → anon/authenticated는 deny-by-default
- FORCE RLS 관측 예: `users`, `ledger_*`, `withdraw_*`, `ai_logs`, `admin_rbac`, `krw_deposit_requests`
- 정책 1건 관측: `user_match_policy_override_audit`, `user_membership_audit`
- `admin_control_audit` / `admin_kill_switches` 없음 → 이 배치 migration은 미적용

Roles (login / bypassrls):

| rolname | login | bypassrls |
|---|---|---|
| anon | 0 | 0 |
| authenticated | 0 | 0 |
| authenticator | 1 | 0 |
| service_role | 0 | 1 |
| postgres | 1 | 1 |
| supabase_admin | 1 | 1 |
| supabase_auth_admin | 1 | 0 |

Nest 앱 롤은 RLS를 우회할 수 있다. 권한은 AdminGuard/RBAC가 강제한다.

## Secrets scan

재실행 대상 = `pnpm verify:secrets` (T0). 이 REL에서 시크릿을 커밋하지 않는다.

## Migration file (not applied)

`supabase/migrations/20260822140000_rel405_admin_control_plane.sql`

MIGRATION_FILE_CREATED != MIGRATION_APPLIED.
fixture `committedUnapplied` = `20260822140000`.
apply는 REL-701-DB.
