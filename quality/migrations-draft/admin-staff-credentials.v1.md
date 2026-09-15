# Draft only — 운영 DDL 실행 금지

대상: 운영자 직원 자격 (Admin 로그인). `supabase/migrations` 에 넣지 않음.
적용 = Human/PO ACK + 승인된 QA DB 이후. 이 파일은 초안.

## 의도 테이블 (미적용)

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
4. 운영 `DATABASE_URL` 로 적용/검증 금지
5. 사용자 `public.users` 비밀번호를 Admin 자격으로 재사용 금지
6. Nest `AdminSessionController` 는 보호범위 파일. 이번 슬라이스는 persist 코드만. 컨트롤러는 계속 `createUnreadyStaffStore`. 새 ACK 없이 주입·ISSUED 금지.

준비 명령(승인 후):

```
psql "$CATALOG_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f quality/migrations-draft/20260915080000_admin_staff_credentials.sql
```
