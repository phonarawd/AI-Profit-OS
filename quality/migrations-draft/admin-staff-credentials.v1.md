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

## 검증 절차 (적용 전)

1. 초안 SQL을 승인된 격리 QA Postgres 에서만 dry-run
2. `admin-staff-login.isolation.cjs` PASS
3. STORE_UNREADY → ready 전환은 persist preflight가 컬럼을 확인한 뒤에만
4. 운영 `DATABASE_URL` 로 적용/검증 금지
5. 사용자 `public.users` 비밀번호를 Admin 자격으로 재사용 금지
