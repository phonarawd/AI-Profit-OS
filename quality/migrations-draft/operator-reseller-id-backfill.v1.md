# Draft only — 운영 backfill 실행 금지

대상: 기존 `public.users.referral_code IS NULL` 행에만 고유 리셀러 ID mint.
표시 필드 = `resellerId`. 인증 토큰으로 쓰지 않는다.

## 의도 SQL (미적용)

```sql
-- 운영 DATABASE_URL 에서 실행 금지.
-- 이미 있는 referral_code 는 유지. 타인 재사용 금지 (UNIQUE).
-- mint 함수는 앱의 mintReferralCode 와 동일 알파벳/길이.
```

적용 전:

1. 승인된 격리 QA Postgres
2. `reseller-id.isolation.cjs` · `reseller-id.persist.isolation.cjs` PASS
3. `applied: false` 가 유지되는지 확인

가입 시 발급은 기존 `classic-signup` / `auth.service` 의 `mintReferralCode` + UNIQUE 재시도가 권위다.
기존 회원 backfill 은 이 초안만. 운영 적용 아님.
