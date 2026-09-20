# MINE-000 현재 기준 동결

- 관측일: 2026-09-20
- 상태: **PHASE 00 PASS**
- 목적: 광산 전환 전 3개 저장소·운영 DB·배포 경계를 현재 실물 기준으로 고정한다.
- 원칙: 추측 없이 현재 `main`과 운영 리소스 실측만 기록한다.

## 1. Canonical repositories

| 역할 | 저장소 | 기준 branch | 기준 SHA |
|---|---|---|---|
| Backend / API | `phonarawd/AI-Profit-OS` | `main` | `ad395b4fa9f5d82c4dd2ac64d5eafa5c7ee4e8fd` |
| User Web | `phonarawd/putduk-web` | `main` | `49fbb36d9dca527212daf49bf82765e04deaa3e6` |
| Admin / Ops | `phonarawd/putduk-ops` | `main` | `070c98e7b28a37c0a615baac18ebd9631ceab2ce` |

Audit branch:

`audit/mine-baseline-20260316`

`main` 제품 코드는 PHASE 00에서 변경하지 않았다.

## 2. Master plan authority

기존 `.cursor/plans/PUTDUK_RELEASE_MASTER.plan.md`는 예전 REL 실행계획이어서 현재 광산 전환계획과 충돌했다.

PHASE 00에서 감사 브랜치에 다음과 같이 정리했다.

- 현재 정식 경로 `.cursor/plans/PUTDUK_RELEASE_MASTER.plan.md` = 광산 PHASE 00~26 단일 실행 권위
- 기존 REL 계획 = `.cursor/plans/PUTDUK_RELEASE_MASTER.legacy-rel.plan.md`에 기존 blob 그대로 보존
- 과거 완료 증거는 참고 가능하지만 광산 PHASE 완료를 대신하지 못함

## 3. Deployment boundary — HARD LOCK

- User Web: **Cloudflare only**
- Admin / Ops: **Cloudflare only**
- Backend API: **Render**
- Vercel: **별도 프로젝트. 조회·설정 변경·연동·배포 금지**

코드 실측:

- `putduk-web/package.json`: `@opennextjs/cloudflare`, `wrangler`, Cloudflare build/preview/deploy 스크립트 존재
- `putduk-ops/package.json`: Cloudflare Workers/Vite 계열, `wrangler`, `deploy:ops` 존재
- Backend Render 운영 서비스는 관측 시점 Backend `main` 기준 SHA와 연결된 상태로 분류

이 프로젝트에서 Vercel을 배포 증거·환경설정·도메인·CI/CD·fallback으로 사용하지 않는다.

## 4. Backend application baseline

`services/api-nest/src/app.module.ts` 기준 현재 top-level 모듈:

- Common / Events
- Ledger / Wallet
- Growth / HomeRead
- Compliance / Risk
- Referral / Mission
- Opportunities / Trades
- ExecutionPolicy / Membership
- Inbox / UserUxPrefs / Push
- Loop / Adapters / Simulation
- AI / Auth
- AdminAudit / KillSwitch / AdminOps
- MatchControl / SourcePolicy / CMS

전역 API prefix는 `api/v1`.

### 4.1 보존 핵심

광산 전환 후에도 유지해야 할 기반:

- Auth
- Ledger
- Wallet
- Compliance/KYC
- Risk
- AdminAudit
- KillSwitch
- Inbox/Push
- CMS
- User preferences
- AI 기반 중 도메인 독립 영역

금융 핵심은 새 광산 시스템에서 반드시 기존 원장으로 연결한다.

### 4.2 Ledger 실물

확인된 구성:

- `ledger.admin.controller.ts`
- `ledger.buckets.service.ts`
- `ledger.money.ts`
- `ledger.posting.service.ts`
- `ledger.outbox.service.ts`
- `ledger.provision.service.ts`
- idempotency fingerprint 계층

판정: **보존**. 별도 `balance` 시스템 생성 금지.

### 4.3 Wallet 실물

`WalletModule` 컨트롤러:

- `WalletController`
- `HomeMoneyReadUserController`
- `DepositConfigAdminController`
- `KrwDepositAdminController`
- `DepositDisputeAdminController`
- `WithdrawCredentialsAdminController`
- `WithdrawReviewAdminController`
- `UserDepositAddressAdminController`

사용자 wallet 경로 계열:

- buckets
- profit merge
- practice welcome/expire
- user deposit address
- USDT observe
- chain watcher tick/status
- chain sweeper tick/status
- KRW deposit instructions/requests
- deposit disputes
- withdrawal step-up policy/challenge/verify
- withdraw PIN set
- withdraw request

관리자 wallet 경로 계열:

- deposit config/audit
- KRW deposit list/approve/reject
- deposit dispute credit/reject
- user deposit address
- withdraw PIN reset / WebAuthn revoke
- withdraw review list/get/approve/reject

판정:

- 입금/출금/버킷/보안 추가인증 = **보존**
- practice/trial은 PHASE 11 계약에 맞춰 재분류
- 내부 chain watcher/sweeper/tick 용어는 사용자 UI 노출 금지

### 4.4 KYC/Auth

Compliance는 `KycController`, `KycAdminController`, `KycService`, `KycR2Service`로 분리되어 있다.

Auth는 `AuthController`와 classic signup/password reset/find-id/magic-link/OAuth/WebAuthn 계층을 보유한다.

판정: **보존**.

### 4.5 리셀/기회/거래 핵심

`OpportunitiesModule`은 다음을 포함한다.

- Opportunities user/admin controllers
- operator mall product admin service
- participate service
- price override
- user opportunity override
- catalog/runtime seed
- FX/current price 계층

`TradesModule`은 `TradesUserController` + `TradeExecutionService`이며 기존 `settlement_rule.cjs`에 연결된다.

판정:

- Opportunity/Participation/Operator Product/Matching/Trade 세계관 = **광산으로 대체 후 제거 대상**
- 그 안에서 재사용되는 Ledger/Risk/Execution safety 기반 = **보존 후보**
- 리셀 도메인을 광산 도메인과 이름만 바꿔 동일 취급하지 않는다.

## 5. Rust engine baseline

현재 `services/engine-rust`:

- `Cargo.toml`
- `Cargo.lock`
- `src/lib.rs`
- `src/settlement_rule.rs`
- `settlement_rule.cjs`
- `testdata/`

현재 엔진은 기존 거래/정산 규칙 중심이며 광산 수익 전용 계약은 아니다.

판정:

- 정밀 계산/검증 기반은 재사용 후보
- PHASE 03에서 광산 수익계산 계약을 별도로 잠근 뒤 확장
- 기존 정산 규칙을 광산 규칙이라고 간주 금지

## 6. Supabase production baseline

Project ref:

`mgsytcetsiecllmhcyox`

실측:

- public tables: **120**
- 광산 전용 tables: **0**
- 적용 migration: **73**
- 최신 migration version: `20260916142723`
- 직접 이름으로 확인되는 리셀/기회/상품/참여/매칭/거래/추천/등급/체험 계열 잔재: 최소 35
- `trade_execution_confirmations`만 RLS 비활성 확인

### 6.1 금융/인증 보존 테이블군

대표적으로 보존 후보:

- `ledger_accounts`
- `ledger_entries`
- `ledger_journals`
- `ledger_outbox_events`
- `krw_deposit_requests`
- `usdt_deposit_events`
- `user_deposit_addresses`
- `withdraw_intents`
- withdraw credential/step-up 계열
- `kyc_status`
- `kyc_submissions`
- `kyc_decision_audit`
- `users`
- `user_profiles`
- auth session/OAuth/passkey 계열
- admin session/RBAC/audit 계열

### 6.2 제거/대체 후보 테이블군

대표적으로:

- `opportunities`
- `participate_requests`
- `match_results`
- matching policy 계열
- `trade_executions`
- `trade_execution_confirmations`
- `operator_mall_products`
- `operator_mall_participations`
- `operator_mall_settlement_journals`
- `canonical_products` 및 리셀 상품 연결 계층
- `user_opportunity_*`
- membership의 기회횟수 중심 도메인

실제 삭제는 PHASE 26까지 의존성 확인 후 순차 수행한다.

### 6.3 DB 보호장치

확인된 trigger 중:

- ledger account balance 직접 변경 방지
- ledger entries/journals update/delete 방지
- admin audit mutation 방지
- match result/source observation mutation 방지
- opportunity override 삭제/핀 제한 보호

확인된 public function 중:

- ledger mutation guard 함수
- `provision_user_bucket_accounts(uuid)` SECURITY DEFINER
- 기존 리셀/matching 보호 함수

RLS가 켜진 테이블은 많지만 명시 policy가 없는 테이블도 존재한다. Nest 서버 권위 구조를 유지하고 프론트가 Supabase를 직접 조작하지 않는 원칙을 유지한다.

보안 후속:

`trade_execution_confirmations` RLS OFF는 PHASE 20 이전에 반드시 폐기/격리 또는 보호 여부를 확정한다.

## 7. User Web route baseline

현재 실제 화면 지도와 `src/app` 구조를 대조해 다음 경로를 기준점으로 확정했다.

### 공개/인증 경로

- `/`
- `/login`
- `/signup`
- `/auth/complete-profile`
- `/auth/find-id`
- `/auth/reset-password`
- `/auth/verify-email`
- `/legal`
- `/legal/privacy`
- `/legal/terms`
- `/legal/license`
- `/legal/oss`

### 로그인 필요 경로

- `/`
- `/work`
- `/ai`
- `/invite`
- `/me`
- `/me/records`
- `/me/kyc`
- `/me/membership`
- `/me/benefits`
- `/me/events`
- `/me/inbox`
- `/me/notices`
- `/me/settings`
- `/me/support`
- `/wallet/deposit`
- `/wallet/withdraw`
- `/wallet/history`
- `/wallet/usdt-guide`

현재 하단 탭:

`홈 / 기회 / 퍼뜩AI / 초대 / 나`

광산 전환 분류:

- `/work`와 `기회` 세계관 = **광산으로 대체**
- `/invite` = 기존 리셀/추천 목적 의존성을 확인 후 사용자 핵심 IA에서 제거 후보
- `/me/membership`, `/me/benefits`, `/me/records` = 기회/등급/리셀 의미 제거 후 광산 기준 재설계
- auth/wallet/KYC/AI/settings/legal = **보존 후 UI 재설계**

### 7.1 현재 Web API 연결

확인된 실서버 호출군:

- auth login/signup/session/logout/refresh/OAuth/profile
- home-read/trial-state
- opportunities
- wallet buckets/deposit address/KRW deposit/withdraw step-up/withdraw
- ledger journals
- KYC status/submit
- membership
- referral
- 퍼뜩AI stream

프론트가 Supabase를 직접 호출하지 않고 `api.hiptk.app` Nest API를 사용한다.

### 7.2 사용자 노출 결함 — KNOWN

`src/lib/api.ts`의 API 오류 처리에서 영문 대문자 내부 오류코드가 `ApiError.message`로 선택될 수 있는 경로가 있다.

예: 서버가 한국어 메시지 없이 `AUTH_*`, `STORE_*` 등 코드만 반환할 경우 내부 코드가 UI까지 전달될 가능성.

사용자 요구와 충돌하므로 후속 사용자 UI 작업에서:

- 내부 오류코드 직접 표시 = 0
- 테스트/개발/전문용어 표시 = 0
- 사용자 문구는 쉬운 한국어만

으로 고정한다.

## 8. Admin/Ops baseline

현재 주요 메뉴/라우트:

### 실제 연결 중심

- `/` / `/catalog`: 상품 목록
- `/users`: 회원 목록
- `/users/:id`: 회원 기회·등급·주소
- `/membership/grades`: 등급별 기회
- `/money/deposit-guide`
- `/money/deposits`
- `/money/withdrawals`
- `/identity`
- `/content/notices`
- `/content/events`
- `/content/benefits`
- `/content/banners`
- `/content/messages`
- `/service/display-timing`

### 현재 코드가 미연결이라고 명시하는 화면

- `/money/transactions`
- `/money/mismatches`
- `/safety/alerts`
- `/safety/cases`
- `/safety/lists`
- `/safety/limits`
- `/reports`
- `/staff`
- `/staff/approvals`
- `/activity`
- `/activity/access`
- `/service`
- `/service/incidents`
- `/service/maintenance`
- `/service/controls`
- 일부 문의/AI 대화 기능

### 8.1 Adapter 경계

`createAdminAdapter()`는 세 모드로 나뉜다.

- live → real API adapter
- isolated-qa → in-memory isolated store
- waiting → mutation 없이 연결대기

따라서 격리시험 저장소의 성공을 운영 성공으로 인정하지 않는다.

### 8.2 현재 실제 관리자 계약

실연결 route group:

- admin session login/status/logout
- admin users/member profile
- wallet deposit config/KRW deposit/withdraw review
- KYC queue approve/reject
- CMS CRUD/publish/end
- membership/daily match cap/bonus/grade cap/presentation
- operator product/opportunity/participation 계열

### 8.3 Ops 모순/잔재 — KNOWN

`lib/admin/contract.ts`에는 현재 `main`보다 오래된 로컬 dirty branch/manifest 판정과 `schemaApplied=false`, `storeReady=false` 같은 역사값이 함께 남아 있다.

또 실제 화면에:

- 상품
- 하루 기회
- 등급
- 참여
- resellerId

도메인이 남아 있다.

판정:

- 금융/KYC/CMS/회원 실API 기반 = 보존
- 기회/등급/상품/참여 중심 운영계층 = 광산 관리/수익률/운용/정산으로 교체
- stale contract metadata = 후속 계약 잠금 단계에서 제거/재생성
- isolated QA 문구/버튼은 운영 모드에서 노출 0을 검증

## 9. CI/workflow baseline

Backend `.github/workflows`에는 다음 계열이 존재한다.

- backend CI
- CodeQL
- engine acceptance / heavy acceptance / evidence
- release acceptance/build/integration
- Cloudflare deployment
- 기존 ebay/operator mall 관련 legacy workflow

현재 GitHub Actions 사용량 소진 상태이므로 PHASE 00에서 새 workflow를 실행하지 않았다.

과거 성공 run이 존재해도 현재 광산 전환 CI PASS로 재사용하지 않는다.

`CI = NOT RUN FOR MINE-000 (quota constraint)`

이는 실패를 성공으로 위장한 것이 아니라 현재 실행 제한을 명시한 것이다.

## 10. 분류 총결론

### 보존

- Auth
- Ledger/double-entry
- Wallet buckets
- Deposits/Withdrawals
- KYC
- Admin auth/RBAC/Audit
- Risk/Kill switch
- CMS/Inbox/Push
- Cloudflare user/ops deployment architecture
- Render API architecture

### 광산으로 대체

- Opportunities
- Participation
- Matching
- Trades user journey
- Operator mall/product administration
- 기회/등급/일일기회 중심 사용자·관리자 UX

### 제거 예정

- 사용자에게 보이는 리셀/기회/상품/참여/매칭/거래 잔재
- stale reseller terminology
- 사용하지 않는 legacy routes/components after dependency proof
- obsolete legacy CI/workflows after mining system stabilization

### 보안/결함 후속

- `trade_execution_confirmations` RLS OFF
- 사용자 화면 내부 오류코드 누출 가능성
- Ops stale contract metadata
- 격리시험 기능 운영 노출 방지
- 기존 internal chain/tick 용어 사용자 노출 방지

## 11. MINE-000 pass gate

- 상태를 모르는 핵심 backend module/API domain: **0**
- 상태를 모르는 운영 DB 계층: **0**
- 상태를 모르는 user route/API domain: **0**
- 상태를 모르는 admin route/API/mock 경계: **0**
- 배포 경계 혼선: **0**
- Vercel 연동 대상: **0**
- 광산 전용 운영 테이블: **0 (확인 완료, PHASE 02에서 신규 설계 대상)**

## 12. Verdict

`MINE-000 = PASS`

PHASE 00에서 제품 기능/운영 DB를 변경하지 않았다.

다음 단계는 오직:

`PHASE 01 — 광산 계약 잠금`

관리자 명시 지시 전 자동 착수 금지.
