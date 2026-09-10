# PUTDUK 백엔드 API 계약 맵

- **권위:** `origin/main` `c4ebcd87`의 Nest 코드 + `schemas/*.v1.json`. 추측으로 필드를 만들지 않음.
- **베이스 URL:** 고객 웹은 `https://api.hiptk.app` 만 호출 (전역 prefix `api/v1`, `services/api-nest/src/main.ts`).
- **인증:** Nest JWT. 유저 세션 쿠키 이름 `aipo_session` (`auth.constants.ts`). Supabase Auth 없음.
- **PR #222:** 아래 “#222가 바꿀 계약”만 별도. 이 브랜치에서 해당 파일을 수정하지 않음.
- **분류:** 엔드포인트/스키마는 `KEEP_BACKEND`. SDK 클라이언트는 `BLOCKED`(유지). 화면 라우트는 계약이 아님.

확인 명령:

```text
git show origin/main:services/api-nest/src/main.ts
rg "setGlobalPrefix|USER_SESSION_COOKIE_NAME" services/api-nest
rg "export const .*ROUTES" services/api-nest/src
rg "/api/v1/" packages/sdk/src
git ls-tree --name-only origin/main schemas/
```

---

## 0. 공통

| path | 현재 역할 | 참조 코드 | 제거 시 영향 | 이동 대상 | 삭제 가능 | 분류 | 근거 |
|---|---|---|---|---|---|---|---|
| `services/api-nest/src/main.ts` | `app.setGlobalPrefix("api/v1")` | 전 클라이언트 | API 전부 404 | 유지 | 아니오 | KEEP_BACKEND | prefix 변경 = 고객웹 계약 파기 |
| `GET /health` | 공개 헬스 (`@Controller("health")`, prefix 밖) | 배포/고객 프로브 | 배포 실패 | 유지 | 아니오 | KEEP_BACKEND | |
| `services/api-nest/src/health.public.ts` | 공개 바디: `ok, service=api-nest, phase=0, gitSha, gitShaSource, db, redis, warnings` | health.controller | 고객이 SHA를 못 읽음 | 유지 | 아니오 | KEEP_BACKEND | **#222가 version/buildTime/environment 추가 예정 — 이 브랜치에서 편집 금지** |
| `aipo_session` | 유저 세션 쿠키 | `auth.constants.ts`, SDK `credentials` | 로그인 파괴 | 유지 | 아니오 | KEEP_BACKEND | |
| `Authorization: Bearer` | 액세스 토큰 | SDK `getAccessToken` | 동일 | 유지 | 아니오 | KEEP_BACKEND | |

`origin/main` health에는 `version`/`buildTime`/`environment` **없음**. 고객 웹 P0는 #222가 채운다.

---

## 1. 고객 웹이 쓰는 HTTP (prefix `/api/v1`)

경로 문자열은 `*.routes.ts`와 `packages/sdk/src/**/fetch.ts`에서 확인. SDK에 없는 경로는 컨트롤러만 있고 웹이 직접 fetch할 수 있다 — **필드 스키마를 추측하지 않음.**

### 1.1 Auth

| path | 역할 | 참조 | 영향 | 대상 | 삭제 | 분류 |
|---|---|---|---|---|---|---|
| `POST /api/v1/auth/signup` | Stage A 가입 | `AUTH_ROUTES.signup` · `packages/sdk/src/auth/fetch.ts` | 가입 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `PATCH /api/v1/auth/profile` | Stage B 프로필 | `AUTH_ROUTES.profile` · sdk | 온보딩 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `GET /api/v1/auth/session` | 세션 | sdk `fetchAuthSession` | 로그인 상태 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/logout` | 로그아웃 | sdk | 세션 잔존 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/refresh` | 갱신 | `classic.ts` | 만료 후 끊김 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/oauth/:provider/start` | OAuth 시작 (sdk는 kakao) | `proof.ts`/`fetch.ts` | 소셜 로그인 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/oauth/:provider/callback` | OAuth 콜백 | sdk `finishOauth` | 동일 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/passkey/register/options` `.../verify` | 패스키 등록 | routes · verify:webauthn* | 패스키 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/passkey/authenticate/options` `.../verify` | 패스키 인증 | 동일 | 동일 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/magic-link/request` `.../verify` | 매직링크 | sdk | 이메일 로그인 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/delete-account` | 탈퇴 | sdk | 탈퇴 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/signup/classic` `.../signup/classic/verify` | 클래식 가입 | `classic.ts` | 이메일 가입 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/login` | 클래식 로그인 | `classic.ts` | 로그인 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/find-id` | 아이디 찾기 | `classic.ts` | 찾기 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/password-reset/request` `.../complete` | 비번 재설정 | `classic.ts` | 재설정 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/password/change` | 비번 변경 | `classic.ts` | 변경 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/email/resend` | 인증메일 재발송 | `classic.ts` | 재발송 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `GET /api/v1/auth/sessions` | 세션 목록 | `classic.ts` | 기기 목록 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `DELETE /api/v1/auth/sessions/:familyId` | 세션 폐기 | `classic.ts` | 원격 로그아웃 불가 | 유지 | 아니오 | KEEP_BACKEND |
| `POST /api/v1/auth/logout-all` | 전체 로그아웃 | `classic.ts` | 동일 | 유지 | 아니오 | KEEP_BACKEND |

스키마: `schemas/auth-session.v1.json` `schemas/user-profile.v1.json` `schemas/webauthn-challenge.v1.json` — KEEP_BACKEND. **두 JSON은 #222가 수정 — 이 브랜치에서 편집 금지.**

#222 예정: OAuth pending signup · 성별 필드 · 약관 API에서만 계정 생성. **미적용(main).** 발명하지 않음.

### 1.2 Wallet / 출금 step-up

컨트롤러 `@Controller("wallet")`.

| path | 역할 | 참조 | 삭제 | 분류 |
|---|---|---|---|---|
| `GET /api/v1/wallet/buckets` | 버킷 | sdk `wallet/fetch.ts` · `schemas/wallet-buckets.v1.json` | 아니오 | KEEP_BACKEND |
| `POST /api/v1/wallet/profit/merge` | 수익→원금 | routes | 아니오 | KEEP_BACKEND |
| `POST /api/v1/wallet/practice/welcome` `.../practice/expire-tick` | 체험 | routes | 아니오 | KEEP_BACKEND |
| `GET /api/v1/wallet/my-deposit-address` | USDT 주소 | routes · `user-deposit-address.v1.json` | 아니오 | KEEP_BACKEND |
| `POST /api/v1/wallet/usdt-deposits/observe` | 입금 관측(워커) | routes · `usdt-deposit-event.v1.json` | 아니오 | KEEP_BACKEND |
| `POST/GET .../chain-watcher/*` `.../chain-sweeper/*` | 체인 틱 | routes · 워커 | 아니오 | KEEP_BACKEND |
| `GET /api/v1/wallet/krw-deposit-instructions` | 원화 안내 | routes · `krw-deposit-request.v1.json` | 아니오 | KEEP_BACKEND |
| `POST /api/v1/wallet/krw-deposit-requests` | 원화 신청 | routes | 아니오 | KEEP_BACKEND |
| `POST /api/v1/wallet/deposit-disputes` | 오입금 CS | `deposit-dispute.v1.json` | 아니오 | KEEP_BACKEND |
| `GET /api/v1/wallet/withdraw/step-up/policy` | step-up 정책 | routes · `withdraw-intent.v1.json` | 아니오 | KEEP_BACKEND |
| `POST /api/v1/wallet/withdraw/step-up/challenge` | step-up 도전 | sdk | 아니오 | KEEP_BACKEND |
| `POST /api/v1/wallet/withdraw/step-up/verify` | step-up 검증 | sdk | 아니오 | KEEP_BACKEND |
| `POST /api/v1/wallet/withdraw/pin/set` | PIN | routes | 아니오 | KEEP_BACKEND |
| `POST /api/v1/wallet/withdraw` | 출금 (idempotency) | sdk | 아니오 | KEEP_BACKEND |

### 1.3 Ledger (유저)

`@Controller("me/ledger")`.

| path | 역할 | 참조 | 분류 |
|---|---|---|---|
| `GET /api/v1/me/ledger/journals` | 본인 전표 | sdk `ledger/fetch.ts` · `ledger-journal.v1.json` | KEEP_BACKEND |
| `GET /api/v1/me/ledger/journals/:journalId` | 전표 상세 | sdk | KEEP_BACKEND |

#222 예정: 전표마다 표시 방향·금액 문자열. **미적용.** 이 브랜치에서 `ledger-user-query.core.cjs` 수정 금지.

### 1.4 KYC

`@Controller("compliance")`.

| path | 역할 | 참조 | 분류 |
|---|---|---|---|
| `GET /api/v1/compliance/kyc/status` | 상태 | `COMPLIANCE_USER_ROUTES` · `kyc-status.v1.json` | KEEP_BACKEND |
| `POST /api/v1/compliance/kyc/submit` | 제출 | `kyc-submission.v1.json` | KEEP_BACKEND |

SDK에 KYC fetch 모듈 없음(`rg` 0). 웹이 직접 호출하는 계약. 필드 추측 금지. #222가 업로드 MIME/크기/신분증·얼굴 거절을 추가 — **이 브랜치에서 kyc.controller/service 수정 금지.**

### 1.5 Opportunities / participate / trades

| path | 역할 | 참조 | 분류 |
|---|---|---|---|
| `GET /api/v1/opportunities` | 피드 | sdk `user-feed/fetch.ts` · `opportunity-card.v1.json` | KEEP_BACKEND |
| `GET /api/v1/opportunities/:id` | 상세 | sdk | KEEP_BACKEND |
| `POST /api/v1/opportunities/:id/preflight` | 참여 전 토큰 | sdk `participate/fetch.ts` · `participate-request.v1.json` | KEEP_BACKEND |
| `POST /api/v1/opportunities/:id/participate` | 참여 | sdk · `participate-proof.v1.json` | KEEP_BACKEND |
| `GET /api/v1/trades` | 내 실행 목록 | sdk `trades/fetch.ts` · `trade-execution-state.v1.json` | KEEP_BACKEND |
| `GET /api/v1/trades/:id` | 실행 상태 | sdk | KEEP_BACKEND |
| `POST /api/v1/trades/:id/execute-tick` | Phase0 폴링 틱 | sdk `execution-stream` | KEEP_BACKEND |
| `GET /api/v1/trades/:id/execution` | SSE (주석/미래) | `sse-transport.ts` 상수만, Phase0 미배선 | KEEP_BACKEND — 발명 구현 금지 |

### 1.6 Home / money read / FX / pulse / trial

| path | 역할 | 참조 | 분류 |
|---|---|---|---|
| `GET /api/v1/me/home-read` | HomeReadModel | sdk `home-read-model` · `home-read-model.v1.json` | KEEP_BACKEND |
| `GET /api/v1/me/home-money-read` | 홈 머니 | sdk `home-money-read` · `home-money-read.v1.json` | KEEP_BACKEND |
| `POST /api/v1/me/current-fx/approx` | 표시용 FX | sdk `current-fx` · `current-fx-approx.v1.json` | KEEP_BACKEND |
| `GET /api/v1/me/day-pulse` | DayPulse | sdk `user-feed` · `day-opportunity-pulse.v1.json` | KEEP_BACKEND |
| `GET /api/v1/me/trial-state` | 체험 상태 | routes · `practice-grant.v1.json` | KEEP_BACKEND |
| `GET /api/v1/growth/public-surface` | 공개 그로스 | sdk `growth` | KEEP_BACKEND |

### 1.7 Membership / benefits / inbox / ux / referral / 퍼뜩 / push

| path | 역할 | 참조 | 분류 |
|---|---|---|---|
| `GET /api/v1/me/membership` | 멤버십 표시 | `MEMBERSHIP_USER_ROUTES` · `user-membership.v1.json` | KEEP_BACKEND |
| `GET /api/v1/me/benefits` `.../summary` | 혜택 | `BENEFITS_USER_ROUTES` · `mission-*.v1.json` | KEEP_BACKEND |
| `GET /api/v1/me/inbox` | 수신함 | `INBOX_USER_ROUTES` · `ops-inbox-message.v1.json` | KEEP_BACKEND |
| `POST /api/v1/me/inbox/:id/read` `.../hide` | 읽음/숨김 | routes | KEEP_BACKEND |
| `GET/PUT /api/v1/me/notification-prefs` | 알림 설정 | `notification-prefs.v1.json` | KEEP_BACKEND |
| `GET/PUT /api/v1/me/ux-prefs` | UX 설정 | `user-ux-prefs.v1.json` | KEEP_BACKEND |
| `GET /api/v1/referral/me` `POST .../bind` `POST .../share` | 초대 | `referral-*.v1.json` | KEEP_BACKEND |
| `POST /api/v1/me/peotteok/chat` (SSE) | 퍼뜩 채팅 | sdk `peotteok/chat-sse.ts` | KEEP_BACKEND |
| `GET /api/v1/me/peotteok/chips` | 칩 | sdk | KEEP_BACKEND |
| `GET/PATCH/DELETE /api/v1/me/peotteok/conversations[/:id]` | 대화 | sdk `history.ts` (워크트리/#221에 있을 수 있음 — **main 존재는 컨트롤러로 확인**) | KEEP_BACKEND |
| `GET /api/v1/push/enabled` | 푸시 공개 | sdk `push/subscribe.ts` | KEEP_BACKEND |
| `GET /api/v1/me/push/vapid-public` | VAPID | sdk | KEEP_BACKEND |
| `POST/DELETE /api/v1/me/push-subscriptions` | 구독 | `push-subscription.v1.json` | KEEP_BACKEND |

멤버십/혜택/인박스 SDK 모듈은 `packages/sdk`에 없음. 웹 직접 호출. 응답 필드를 여기서 발명하지 않음.

### 1.8 내부/워커 (고객 화면 아님, 유지)

| path | 역할 | 분류 |
|---|---|---|
| `POST` `ADAPTER_INGEST_ROUTES.ingest` | 어댑터 수집 | KEEP_BACKEND |
| `POST` trade internal reconcile/execution-confirm | 내부 틱 | KEEP_BACKEND |

---

## 2. 미래 어드민이 쓸 Admin API (`/api/v1/admin/...` 및 분리 컨트롤러)

화면(`apps/admin`)과 무관하게 **Nest Admin HTTP는 KEEP_BACKEND**. 미래 어드민 레포는 이 경로를 호출한다. Spark UI를 가져가지 않음.

인증: `POST /api/v1/admin-auth/login|mfa|refresh|step-up/start|step-up|logout-all` · ` /api/v1/admin-session`. KEEP_BACKEND.

| 영역 | 경로 상수 파일 | 주요 path (prefix `/api/v1/admin/`) | 스키마 |
|---|---|---|---|
| Users | `users.admin.controller.ts` | `GET /api/v1/admin/users` `GET .../users/:id` `POST .../pii-reveal` | — |
| Ledger | `ledger.routes.ts` | `ledger/journals` `ledger/recon` `reports/financial` `users/:userId/balance-adjust` `users/:userId/buckets` | `ledger-admin-adjust.v1.json` `ledger-recon-report.v1.json` `financial-report.v1.json` |
| Wallet admin | `wallet.routes.ts` | `wallet/deposit-config` KRW approve/reject · disputes · withdraw review · pin reset · webauthn revoke | `deposit-config.v1.json` |
| KYC admin | `compliance.routes.ts` | `compliance/kyc` approve/reject/doc-url | `kyc-*.v1.json` |
| Risk | `risk.routes.ts` | queue/catalog/circuit/user freeze… | `risk-queue.v1.json` `user-risk-state.v1.json` |
| Opportunities admin | `opportunities.routes.ts` | list/pricing/seed/asset-image/overrides | `user-opportunity-override.v1.json` `price-override-layers.v1.json` |
| Execution policy | `execution-policy.routes.ts` | get/put/stats/audit | `execution-policy.v1.json` |
| Match control | `match-control.routes.ts` | verbs/preview/confirm/apply | `admin-match-control.v1.json` |
| Membership admin | `membership.routes.ts` | `users/:id/membership` match-policy-override | `user-membership.v1.json` `user-match-policy-override.v1.json` |
| Adapters | `adapters.routes.ts` | listing legs, KPI, identity queue | `adapter-matching-kpi.v1.json` |
| Ops 3-mode | `admin-ops.routes.ts` | `ops/modes|preview|confirm|apply|rollback` | `admin-ops-mode.v1.json` |
| Kill switch | `kill-switch.routes.ts` | `system-control/switches` | `admin-kill-switch.v1.json` |
| Push kill | `push.routes.ts` | `system-control/push` | `push-kill.v1.json` |
| Source policy | `source-policy.routes.ts` | health/versions/rollback | `admin-policy-version.v1.json` |
| Audit | `audit.routes.ts` | events | `admin-audit.v1.json` |
| AI logs / pick / shadow | `ai.routes.ts` | coach/eval/pick/shadow-replay | `ai-*.v1.json` `shadow-replay-report.v1.json` |
| Simulation / reserve | `simulation.routes.ts` | run/latest/growth/reserve | `simulation-*.v1.json` |
| Referral admin | `referral.routes.ts` | growth/referral/* | `referral-*.v1.json` |
| Inbox admin | `inbox.user.routes.ts` | `users/:id/ops-messages` | `ops-inbox-message.v1.json` |
| Trades admin | `trades.admin.routes.ts` | reconcile tick | — |

`origin/main` `app.module.ts`에 `UsersAdminModule`/`MatchingPolicyModule`/`AdminIdentityModule` **없음**. 현재 워크스페이스(#221)에 보이는 파일은 main 계약이 아님. 이 맵에 런타임으로 넣지 않음.

핸드오프: `apps/admin/routes.ts`의 12모듈 href는 **화면 IA**다. API 경로와 1:1이 아니다. 미래 어드민은 위 HTTP만 쓰면 된다.

---

## 3. JSON 스키마 목록 (`schemas/`)

전부 KEEP_BACKEND. 고객 웹 직접 소비 가능성이 큰 것: `auth-session` `user-profile` `wallet-buckets` `ledger-journal` `kyc-status` `kyc-submission` `opportunity-card` `participate-*` `trade-execution-state` `home-read-model` `home-money-read` `current-fx-approx` `day-opportunity-pulse` `user-membership` `mission-*` `notification-prefs` `user-ux-prefs` `ops-inbox-message` `push-*` `withdraw-intent` `krw-deposit-request` `usdt-deposit-event`.

어드민/내부: `admin-*` `ledger-admin-adjust` `risk-*` `execution-policy` `deposit-config` 등.

확인: `git ls-tree --name-only origin/main schemas/`.

`#222`가 바꾸는 파일: `schemas/auth-session.v1.json` `schemas/user-profile.v1.json` — **이 브랜치에서 편집 금지.**

---

## 4. 고객 웹 화면 라우트 (API 아님)

`apps/web/routes.ts` — `MOVE_TO_CUSTOMER_WEB`. 백엔드 계약이 아님.

5탭: `/` `/profits` `/trades` `/wallet` `/me`  
중첩: deposit/withdraw/history, me/settings|legal|kyc|peotteok|membership|inbox|invite|benefits|guide/*, auth/*, onboarding, ads.

어드민 화면: `apps/admin/routes.ts` — `MOVE_TO_FUTURE_ADMIN` (요약만). API와 혼동 금지.

---

## 5. SDK (`packages/sdk`) — 고객 웹 클라이언트

| path | 역할 | 분류 |
|---|---|---|
| `packages/sdk/src/auth/**` | Auth HTTP | **BLOCKED** (#222가 fetch/types/test 수정) |
| `packages/sdk/src/{wallet,ledger,participate,trades,user-feed,home-*,current-fx,growth,peotteok,push,execution-stream}/**` | 고객 호출 | BLOCKED (패키지 단위 유지) |
| api-nest → sdk import | 없음 | — |

putduk-web이 이미 자체 클라이언트를 가졌는지는 이 조사에서 **확인하지 않음**(고객 웹 레포 수정/열람 금지). SDK 삭제는 #222 이후 운영자 결정.

---

## 6. PR #222가 바꿀 계약 (main 대비, 이 브랜치 미포함)

| 변경 | 고객 웹 영향 | 이 작업 |
|---|---|---|
| 공개 health에 version·buildTime·environment + 빌드 SHA | 웹이 배포 SHA를 추측하지 않음 | 파일 수정 금지 |
| OAuth pending signup + 마이그레이션 (unapplied) | 구글 신규 가입 code 재사용 방지 | 마이그레이션 추가/apply 금지 |
| user profile gender | 고객이 고른 성별만 저장 | schema/서비스 수정 금지 |
| ledger display direction + amount strings | 웹이 부호 정규식 추측 금지 | core.cjs 수정 금지 |
| KYC upload reject-before-store | 실패가 미제출로 바뀌지 않음 | kyc.* 수정 금지 |
| `quality/customer-web-contract-p0.md` | P0 기준선 문서 | 생성/덮어쓰기 금지 |

이 정리 PR은 위 계약을 **바꾸지 않음**. UI 트리 제거만 목표. 고객 웹 호출 경로는 main 기준으로 유지.

---

## 7. 계약 안정성 판정

| 질문 | 답 |
|---|---|
| 고객 웹이 쓰는 경로를 이 작업에서 바꾸는가? | 아니오 |
| 새 API를 발명하는가? | 아니오 |
| Admin 화면 제거가 Admin API를 제거하는가? | 아니오 |
| #222와 겹치는가? | sdk/auth/kyc/ledger/health/migrations/verify fixtures — **의도적으로 미터치** |
| 마이그레이션을 prod에 적용하는가? | 아니오 |

---

## 8. 문서 메타

| path | 역할 | 분류 |
|---|---|---|
| `quality/backend-api-contract-map.md` (본 파일) | 백엔드 계약 인덱스 | KEEP_BACKEND |
| `quality/backend-only-inventory.md` | 트리 분류 | KEEP_BACKEND |
| `quality/backend-only-deletion-plan.md` | 삭제 순서 | KEEP_BACKEND |
