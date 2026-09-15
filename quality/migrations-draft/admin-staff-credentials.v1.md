# 초안 이력 — 공식 승격됨

대상: 운영자 직원 자격 (Admin 로그인).
공식 DDL: `supabase/migrations/20260916080000_admin_staff_credentials.sql` (시드 행 없음).

## 의도 테이블

`public.admin_staff`

- `admin_id` uuid pk
- `email` citext unique not null
- `password_hash` text not null (`scrypt$…` from password-hash.ts)
- `role` text not null (admin-rbac.v1 역할만)
- `status` text not null (`active` | `disabled`)
- `created_at` / `updated_at` timestamptz

SQL 초안: `quality/migrations-draft/20260915080000_admin_staff_credentials.sql` (`citext` 대신 `text` + `lower(email)` UNIQUE. 시드 행 없음.)

## 검증 절차 (적용 전)

1. 초안 SQL을 승인된 격리 QA Postgres 에서만 dry-run
2. `admin-staff-login.isolation.cjs` · `admin-staff-login.persist.isolation.cjs` PASS
3. STORE_UNREADY → ready 전환은 persist preflight가 컬럼을 확인한 뒤에만
4. 운영 적용은 공식 `supabase/migrations` + REL-701-DB founder 채널만
5. 사용자 `public.users` 비밀번호를 Admin 자격으로 재사용 금지
6. Nest `AdminSessionController` 는 placeholder 로 `createUnreadyStaffStore` 를 넘기고, `loginStaff` 가 격리 QA 또는 ops `PostgresService` persist 를 해석한다.

준비 명령(승인 후):

```
psql "$CATALOG_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f quality/migrations-draft/20260915080000_admin_staff_credentials.sql
```
