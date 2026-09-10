# 고객 웹 P0 계약 (phonarawd/AI-Profit-OS)

이 문서 하나만 고객 웹 워커가 읽는다. 비밀값·토큰·이메일·전화·주소는 적지 않는다.

## 수정 전 기준선

기록 시각: 2026-09-10 로컬.

| 항목 | 값 |
|---|---|
| 로컬 절대 경로 | `C:\Users\PC\Desktop\AI_PROFIT_OS` (Git 경계). 작업 worktree: `C:\Users\PC\Desktop\AI_PROFIT_OS_CONTRACT_P0` |
| remote | `https://github.com/phonarawd/AI-Profit-OS.git` |
| 작업 전 메인 체크아웃 | `chore/d1-zero-known-defect-20260904` @ `4c6f22fabc485a8ac910582bd41dcb7bd1b53575` (PR #221). dirty 파일 유지, 되돌리지 않음 |
| GitHub main | `c4ebcd870557c74f214735bfc9e6c4dac37aaeac` |
| production deploy 기록 | `3366bbe6cac8b1b188550ba651927ecc58f011bf` |
| 이 브랜치 시작 SHA | `c4ebcd870557c74f214735bfc9e6c4dac37aaeac` |
| 패키지 매니저 | pnpm 11.4.0 (레포 lock `packageManager: pnpm@10.14.0`) |
| Node | v24.19.0 (레포 engines: `>=22.14.0 <23`) |
| PR #221 | 열림. 증거 전용 `chore/d1-zero-known-defect-20260904`. 이 작업과 섞지 않음 |
| 기존 customer-web-contract 브랜치/PR | 없음 → 신규 `fix/customer-web-contract-p0` |

고객 웹(`C:\Users\PC\Desktop\PUTDUK_WEB`)과 어드민은 읽기 전용. `api.hiptk.app` 런타임 SHA는 이 작업에서 확인하지 못함.

### 배포 환경변수 이름만

Nest가 읽는 이름(`phase0.env.ts` / `.env.example`): `NODE_ENV`, `PORT`, `ROOT_DOMAIN`, `APP_HOST`, `OPS_HOST`, `API_HOST`, `DATABASE_URL`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_REGION`, `SUPABASE_PROJECT_REF`, `JWT_USER_SECRET`, `JWT_ADMIN_SECRET`, `OAUTH_KAKAO_CLIENT_ID`, `OAUTH_KAKAO_CLIENT_SECRET`, `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`, `R2_KYC_BUCKET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_KYC_ENCRYPTION_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADAPTER_INGEST_TOKEN`, `INTERNAL_WALLET_TICK_TOKEN`.

공개 health SHA: 런타임은 `RENDER_GIT_COMMIT`만. 빌드 주입은 `services/api-nest/scripts/write-nest-build-info.cjs`가 `CF_PAGES_COMMIT_SHA` 또는 `git rev-parse`로 baked SHA를 쓴다. 운영 배포는 하지 않는다.

### 고객 웹이 호출하는 API (PUTDUK_WEB `src/lib/api.ts`, 읽기 전용)

인증: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/signup/classic`, `POST /api/v1/auth/signup/classic/verify`, `POST /api/v1/auth/find-id`, `POST /api/v1/auth/password-reset/request`, `POST /api/v1/auth/password-reset/complete`, `POST /api/v1/auth/email/resend`, `POST /api/v1/auth/oauth/google/start`, `POST /api/v1/auth/oauth/google/callback`, `PATCH /api/v1/auth/profile`, `GET /api/v1/auth/session`, `POST /api/v1/auth/logout`.

기회/거래: `GET /api/v1/opportunities`, `GET /api/v1/opportunities/:id`, `POST /api/v1/opportunities/:id/preflight`, `POST /api/v1/opportunities/:id/participate`, `GET /api/v1/trades`, `GET /api/v1/trades/:id`, `POST /api/v1/trades/:id/execute-tick`.

홈/지갑: `GET /api/v1/me/home-read`, `GET /api/v1/me/home-money-read`, `POST /api/v1/me/current-fx/approx`, `GET /api/v1/me/trial-state`, `GET /api/v1/wallet/buckets`, `GET /api/v1/wallet/my-deposit-address`, `GET /api/v1/wallet/krw-deposit-instructions`, `POST /api/v1/wallet/krw-deposit-requests`, `GET /api/v1/me/ledger/journals`, `POST /api/v1/wallet/withdraw`, `GET /api/v1/wallet/withdraw/step-up/policy`, `POST /api/v1/wallet/withdraw/step-up/challenge`, `POST /api/v1/wallet/withdraw/step-up/verify`.

기타: `GET /api/v1/compliance/kyc/status`, `POST /api/v1/compliance/kyc/submit`, `GET /api/v1/me/membership`, `GET /api/v1/me/benefits`, `GET /api/v1/referral/me`, `POST /api/v1/me/peotteok/chat`.

### 이 SHA(main)에서 확인한 매핑

| 고객 웹 호출 | main `c4ebcd87` Nest | 비고 |
|---|---|---|
| `POST /auth/oauth/google/start` | `POST /api/v1/auth/oauth/:provider/start` | `authorizeUrl` |
| `POST /auth/oauth/google/callback` | `POST /api/v1/auth/oauth/:provider/callback` | 신규+약관없음 → `TERMS_REQUIRED` (code 이미 소비됨) |
| `PATCH /auth/profile` | 있음 | `displayName`, `phoneE164`, `birthDate`, `email?`. gender 금지 필드 |
| `GET /auth/session` | 있음 | `sessionId`, `userId`, `issuer`, `issuedAt`, `expiresAt`, `revoked`, `onboardingStage` |
| `GET /me/ledger/journals` | 있음 | `items[]` + 사용자 entry. 표시 메타 없음 |
| `GET/POST compliance/kyc/*` | 있음 | R2 밀봉 저장. MIME/매직/크기 검증 없음 |
| `GET /health` | `GET /health` (prefix 밖) | `service`, `environment`, `gitSha`. version/buildTime 없음 |
| `POST /auth/login`, `signup/classic`, `find-id`, `password-reset/*` | **없음** | `BLOCKED_CONTRACT` — 추측 구현하지 않음. PR #221 쪽에 있을 수 있으나 섞지 않음 |

### 성별 선택값 (고객 웹 READ ONLY)

`GenderSelect` / `Gender`: `"male" | "female"` (빈 문자열은 미선택 로컬 상태). DB `user_profiles`에 gender 컬럼 없음.

### 원장 journalType (enum + 생성 위치, main)

| journalType | 생성 위치 |
|---|---|
| deposit_usdt | `wallet/usdt-deposit.service.ts` |
| deposit_krw | `wallet/krw-deposit.service.ts` |
| withdraw | enum만. 출금은 intent만 생성 (원장 후속) |
| withdraw_refund | enum만. 생성 위치 없음 |
| participate_lock | `opportunities/participate.service.ts` |
| participate_unlock | `trades/trades.execution.service.ts` |
| settlement | `trades/trades.execution.service.ts` |
| merge_profit_to_principal | `wallet/profit-merge.service.ts` |
| admin_adjust | `ledger/ledger.admin.service.ts`, `wallet/deposit-dispute.service.ts` |
| referral_reward | `referral/referral.pool.service.ts` |
| referral_clawback | `referral/referral.clawback.service.ts` |
| practice_grant | `ledger/practice-grant.service.ts` |
| practice_expire | `ledger/practice-grant.service.ts` |
| mission_reward | `missions/mission.accrual.service.ts` |
| mission_clawback | enum만. 생성 위치 없음 |
| fee | `wallet/withdraw-fee.service.ts` (라인 빌더) |
| other | `referral/referral.pool.service.ts` |

### KYC (main)

저장소: Cloudflare R2, 키 `kyc/{userId}/{submissionId}/{hash}.enc`, AES-GCM 밀봉. 이미지 디코드 없음. `idDoc` 필수, `selfie` 선택. `idDocType`: `kr_id` \| `driver` \| `passport`.

## 구현 후 계약

아래 절은 이 브랜치 코드가 확정한 요청/응답이다. 추측 필드를 쓰지 말 것.

### 런타임 버전 — `GET /health`

응답(추가 필드 포함, 기존 db/redis 유지):

```json
{
  "ok": true,
  "service": "api-nest",
  "phase": 0,
  "gitSha": "hex 또는 null",
  "gitShaSource": "RENDER_GIT_COMMIT | BUILD_INJECTED | null",
  "environment": "production | staging | development | test",
  "version": "0.0.0",
  "buildTime": "ISO-8601 또는 null",
  "db": { "configured": true, "ok": true },
  "redis": { "configured": true, "ok": true },
  "warnings": []
}
```

금지: env 전체, 토큰, DB 주소, 내부 IP, secret, 사용자 데이터.

### Google 약관

1. `POST /api/v1/auth/oauth/google/start` body `{}`. 응답 `{ ok, provider, status, authorizeUrl? }`. Set-Cookie `aipo_oauth_bind` (httpOnly, SameSite=Lax, 10분).
2. 기존 사용자 `POST /api/v1/auth/oauth/google/callback` `{ code, state }` → **200** 세션 (기존과 동일: `ok, stage, onboarding, session, accessToken, issuer`).
3. 신규 + 약관 없음 → **400** `{ code: "TERMS_REQUIRED", message: "TERMS_REQUIRED", pendingToken, expiresInSec }`. 계정/세션 없음. code/state 재전송 금지.
4. 약관 확정 `POST /api/v1/auth/oauth/google/complete` `{ pendingToken, termsAcceptedAt, privacyAcceptedAt, marketingConsent?, referralCode? }` + 같은 bind 쿠키 → **200** 세션. pending 1회용. 성공 후 같은 토큰 재시도는 같은 사용자 세션(idempotent).
5. bind 쿠키 없거나 불일치 → **400** `OAUTH_BIND_MISMATCH`. 만료/재사용(계정 만들기 전) → **400** `OAUTH_PENDING_INVALID`.

### 성별

`PATCH /api/v1/auth/profile` 선택 필드 `gender`: `"male" | "female"`만. 생략 시 기존 값 유지. 과거 사용자 `null`.  
성공 **200** `{ ok: true, onboardingStage: "B_complete", gender: "male"|"female"|null }`. 이 응답 전에 성공으로 표시하지 말 것.  
`GET /api/v1/auth/session`에 `gender` 동일. Stage A/KYC body의 자유 문자열 gender는 거부.

마이그레이션: `supabase/migrations/20260910090000_user_profile_gender.sql` — 작성·검증만. 운영 DB 적용 금지.

### 원장 표시 — `GET /api/v1/me/ledger/journals`

기존 `items[], total, limit, offset` 유지. 각 journal에 `display` 추가. 고객 웹은 `display`를 읽고 정규식/부호 추측을 하지 말 것. 내부 시스템 entry는 기존처럼 사용자 라인만 남긴다.

```json
{
  "journalType": "deposit_usdt",
  "display": {
    "displayKey": "ledger.deposit_usdt",
    "labelKo": "USDT 입금",
    "direction": "credit",
    "customerVisible": true,
    "amountUsdt": "10.5",
    "amountSource": "user_bucket_net",
    "multiEntryPolicy": "sum_user_bucket_signed",
    "status": "posted"
  }
}
```

모르는 `journalType`: `displayKey=ledger.unknown`, `direction=neutral`, `labelKo=확인 필요`, `amountSource=unknown`. 금액은 decimal 문자열.

### KYC 업로드

검증은 저장/상태 갱신 **전**. 실패해도 `kycStatus`를 `none`으로 바꾸지 않는다.

| 항목 | 값 |
|---|---|
| MIME/매직 | jpeg (`image/jpeg`), png (`image/png`), webp (`image/webp`), heic (`image/heic`) |
| 파일당 최대 | 5242880 |
| 총합 최대 | 8388608 |
| 필요 파일 | `idDoc` 필수, `selfie` 필수(이 계약) |
| 오류 코드 | `KYC_FILE_REQUIRED`, `KYC_FILE_TOO_LARGE`, `KYC_TOTAL_TOO_LARGE`, `KYC_FILE_TYPE`, `KYC_ID_SELFIE_REQUIRED` |

상태 코드: 검증 실패 **400**, 이미 pending/approved **409**, 성공 **200** (Nest 기본 POST, 본문 `KycSubmissionV1`). `@HttpCode(201)` 없음.

상수 원본: `services/api-nest/src/compliance/kyc-upload.contract.ts`.

새 약관 확정: `POST /api/v1/auth/oauth/google/complete`. 고객 웹은 code/state를 다시 보내지 않는다.

## 자동검사 (이 브랜치에서 실행한 것만)

실행 환경: Node v22.14.0 (`fnm`) · pnpm 10.14.0 · worktree `C:\Users\PC\Desktop\AI_PROFIT_OS_CONTRACT_P0`. 실행하지 않은 항목은 PASS로 쓰지 않음.

| 검사 | 명령 | 횟수 | 종료 | 판정 |
|---|---|---|---|---|
| unit-health | `node --test --experimental-strip-types services/api-nest/src/health.public.runtime.test.ts` | 2 | 0 | PASS |
| unit-oauth-pending | `node --test --experimental-strip-types services/api-nest/src/auth/oauth-pending-signup.runtime.test.ts` | 2 | 0 | PASS (1회차 ESM FAIL 후 수정) |
| unit-gender | `node --test --experimental-strip-types services/api-nest/src/auth/auth.stage.runtime.test.ts` | 2 | 0 | PASS (1회차 ESM FAIL 후 수정) |
| unit-kyc-upload | `node --test --experimental-strip-types services/api-nest/src/compliance/kyc-upload.contract.runtime.test.ts` | 2 | 0 | PASS (1회차 총합 한도 FAIL 후 수정) |
| unit-ledger-display | `node --test --experimental-strip-types services/api-nest/src/ledger/ledger-customer-display.runtime.test.ts` | 2 | 0 | PASS (1회차 ESM FAIL 후 수정) |
| unit-sdk-auth | `node --experimental-strip-types --test packages/sdk/src/auth/auth-release.test.ts` | 2 | 0 | PASS (1회차 `o` 미정의 FAIL 후 수정) |
| api-nest-build / tsc | `node tooling/verify/api-nest-build.cjs` | 3 | 0 | PASS (1회차 ProfileGender FAIL 후 수정) |
| nest-production-provenance | `node tooling/verify/nest-production-provenance.cjs` | 2 | 0 | PASS |
| auth-flows | `node tooling/verify/auth-flows.cjs` | 1 | 0 | PASS |
| privacy-purge | `node tooling/verify/privacy-purge.cjs` | 1 | 0 | PASS |
| user-ledger-query | `node tooling/verify/user-ledger-query.cjs` | 2 | 0 | PASS (1회차 selftest 30s 타임아웃 후 90s) |
| kyc-withdraw-only | `node tooling/verify/kyc-withdraw-only.cjs` | 1 | 0 | PASS |
| wallet-kyc-session-auth | `node tooling/verify/wallet-kyc-session-auth.cjs` | 2 | 0 | PASS (1회차 데코레이터 창 FAIL 후 수정) |
| secrets | `node tooling/verify/secrets.cjs` | 1 | 0 | PASS |
| brand-consumer | `node tooling/verify/brand-consumer.cjs` | 1 | 0 | PASS |
| auth-identity-proof | `node tooling/verify/auth-identity-proof.runtime.cjs` | 2 | 0 | PASS (selftest 50) |
| auth-jwt-runtime | `node tooling/verify/auth-jwt-runtime.cjs` | 1 | 0 | PASS |
| stack-lock | `node tooling/verify/stack-lock.cjs` | 1 | 0 | PASS (Node 22·pnpm 10) |
| plans-ssot | `node tooling/verify/plans-ssot.cjs` | 1 | 0 | PASS |
| acquisition-release | `node tooling/verify/acquisition-release.cjs` | 1 | 0 | PASS |
| write-nest-build-info | `node services/api-nest/scripts/write-nest-build-info.cjs` | 1 | 0 | PASS |
| migration-sql-sanity | 로컬 SQL 존재·DDL·비밀패턴 없음 | 1 | 0 | PASS |
| verify:gate:fast | `node tooling/verify/gate-fast.cjs` | 2 | 0 | PASS 19 steps (1회차 wallet-kyc-session-auth FAIL). 포함: auth-surfaces, onboarding-experiential, pg-module-scan, bucket-invariant, auth-session-cookie, auth-rate-limit |
| nest 전용 lint 스크립트 | 없음 | 0 | — | NOT_RUN |
| verify:gate:push 전체 | 저사양·중복 회피 | 0 | — | NOT_RUN (겹치는 T1 일부는 위에서 PASS) |
| 운영 DB 마이그레이션 적용 | 금지 | 0 | — | NOT_RUN |
| 운영 배포 | 금지 | 0 | — | NOT_RUN |

MERGED: NO. DEPLOYED: NO.
