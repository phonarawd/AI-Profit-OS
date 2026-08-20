# CONSUMER ACCOUNT HUB CONTRACT

> **문서 종류:** Product · Visual · Implementation Contract  
> **TASK:** C-ACC-001 · Track C Acquisition / Account / Trust  
> **일자:** 2026-08-20  
> **상태:** CONTRACT_READY · IMPLEMENTATION = WEB_UNWIRED · CERTIFICATION = NOT_STARTED  
> **시각 권위:** APPROVED FIGMA = NONE  
> **재스코프:** Profile / Referral / Notifications / KYC / Settings / Support / Guides / Legal 우선

```text
classification = CURRENT_ACCOUNT_HUB_CONTRACT
NEW_VISUAL_LOCK = NO
NEW_CONSTITUTION = NO
NEW_ROUTE = FORBIDDEN
AUTH_RULE_REDEFINITION = FORBIDDEN
MONEY_RULE_REDEFINITION = FORBIDDEN
LEGAL_SSOT_MUTATION = FORBIDDEN
HOME_GEOMETRY_DEPENDENCY = FORBIDDEN
PRODUCTION_IMPACT = NONE
```

교차 SSOT:

| 개념 | 파일 |
|------|------|
| Product journey | `CONSUMER_UX_ARCHITECTURE.md` Account/support · `CONSUMER_JOURNEY_MAP.md` |
| Screens / CTA | `CONSUMER_SCREEN_INVENTORY.md` · `CONSUMER_ROUTE_CTA_MATRIX.md` |
| Owners | `CONSUMER_DATA_STATE_OWNER_MATRIX.md` |
| Machine contract | `governance/consumer-account-hub/account-hub.v1.json` |
| Wallet / KYC money | `CONSUMER_WALLET_CONTRACT.md` (B-WALLET-001 · 출금 게이트만) |
| Acquisition / session | `CONSUMER_ACQUISITION_CONTRACT.md` (C-ACQ-001 · Stage A/B) |
| Home freeze | `governance/consumer-home-approval/home-approval-freeze.v1.json` |
| Legacy pointer | 03 `redesign-r5-account-hub-contract` (실행 큐 아님) |

---

## 0. Authority

```text
BUSINESS_TRUTH        = Auth session · Referral · Inbox/prefs · KycService · deposit-disputes · legal copy
PRODUCT_TRUTH         = 이 문서 + CONSUMER_UX_ARCHITECTURE Account/support UX (D-01~D07)
PRESENTATION_TRUTH    = NEW APPROVED FIGMA ONLY
IMPLEMENTATION_TRUTH  = 2026-08-20 재실측 코드
HOME_PRESENTATION     = FOUNDER APPROVED / LOCKED (이 계약이 geometry를 가져가지 않음)
SPARK_DASH_DNA        = trust 제약만 공유. Home/Profits geometry 종속 0
```

금지된 권위 승격:

- 구 Visual Master / Canon / Lux / 고정 5탭 / 레거시 4그룹(profile/security/money/help)으로 My hub를 복구
- Home geometry(Header/Hero/Sidebar/Bottom Nav/Home spacing)를 `/me*`에 복제
- Figma 없이 픽셀·색·카드 생김새를 잠금
- Membership / Benefits / Events / Strategies를 다시 primary journey로 승격
- 호환 4경로를 삭제하거나 “미구현”으로 위조
- KYC를 참여/입금 게이트로 확장
- legal 문장 삭제/왜곡 · 가짜 심사용 legal
- 성별 필드·호칭 분기 · 주민번호 타이핑
- 추천 % / L1·L2·L3 영문 등급을 유저 화면에 하드코드

플랜 문구 정정(재실측):

```text
PLAN_SAID(원 03 R5)     = 12+ 모듈 전수 · 4그룹 profile/security/money/help
FOUNDER_RESCOPE         = 8영역 우선. AIInsight=/me/peotteok 는 인접 KEEP (이 계약 primary 아님)
PLAN_SAID(호환경로)     = Membership/Benefits/Events/Strategies 이미 구현됨
REMEASURED              = backend membership/benefits OWNER_FOUND
                        · Events/Strategies user API 0
                        · web 호환 4면 + primary 18면 = 전부 PendingFigma
REQUIREMENT_PRESERVED = YES
FUNCTION_DELETE       = FORBIDDEN
PRIMARY_NAV_PRIORITY  = LOWERED
C-ACC-002             = WIRE_WITHOUT_APPROVED_FIGMA (최소 실데이터) · 픽셀 발명 0
```

---

## 1. Product Contract

### 1.1 Object identity

같은 말이 아니다. 섞지 않는다.

| 객체 | 정체 | 아님 |
|------|------|------|
| Profile | `/me` hub. session으로 하위 진입 | Wallet · Home · 멤버십 홈 |
| Session | `GET /api/v1/auth/session` · cookie `aipo_session` | Supabase Auth · body userId |
| Referral | `GET /api/v1/referral/me` + bind/share | % 하드코드 · 월간 초대캡 |
| ReferralEdge | bind 1회 · status enum | 초대 실패 = pool wait |
| Notifications | `GET /api/v1/me/inbox` + read/hide | 가짜 FOMO · 합성 활동 |
| NotificationPrefs | `GET/PUT /api/v1/me/notification-prefs` | 테마 토글 |
| KycStatus | `none` / `pending` / `approved` / `rejected` | 참여 자격 · 입금 자격 |
| KycSubmit | `POST /api/v1/compliance/kyc/submit` | 주민번호 전문 · 성별 |
| Settings | 알림 prefs + 탈퇴. 보안 MERGE | 별 Security 라우트 |
| Support | 도움 + `POST /api/v1/wallet/deposit-disputes` | 새 티켓 API 발명 |
| Guides | `/me/guide/*` copy. 금융 숫자 발명 0 | Wallet Fact · Engine Rule |
| PartnerTrust | Founder partnership lock (`/me/guide/partners`) | adapter catalog · Yahoo API |
| Legal | 약관4종 copy §50.9 | 화면에서 조문 창작 |
| Membership/Benefits | 호환 GET only | primary nav · Rule 입력 |
| Events/Strategies | 호환 페이지 only | user API · primary CTA |

```text
SECURITY_EQUALS_OWN_ROUTE = false
KYC_EQUALS_PARTICIPATE_GATE = false
PARTNERSHIP_EQUALS_ADAPTER = false
REFERRAL_PERCENT_HARDCODE = FORBIDDEN
L1_L2_L3_USER_LABEL = FORBIDDEN
```

### 1.2 Primary 8 areas (유저 의미)

| Area | 현재 경로 | 유저 질문 | Primary CTA | Auth |
|------|-----------|-----------|-------------|------|
| Profile | `/me` | 내 계정에서 어디로 가지? | 하위 진입 · 로그아웃 | yes |
| Referral | `/me/invite` | 어떻게 초대하고 보상은 언제지? | 공유 · 코드 연결 | yes |
| Notifications | `/me/inbox` | 놓친 중요한 일이 있나? | 항목 열기 · 읽음 | yes |
| KYC | `/me/kyc` | 출금하려면 무엇이 남았나? | 제출 | yes |
| Settings | `/me/settings` | 어떻게 바꾸지? | prefs 저장 · 탈퇴 | yes |
| Support | `/me/support` | 누가 도와주지? | 문의 / 입금 분쟁 | yes |
| Guides | `/me/guide/*` | 모르는 것을 쉽게 | 하위 가이드 | no |
| Legal | `/me/legal*` | 어떤 조건이지? | 문서 열기 | no |

Guides 하위(허브 인덱스 페이지 없음 · 발명 금지):

| 경로 | 의미 |
|------|------|
| `/me/guide/usdt` | 테더 안내 |
| `/me/guide/get-usdt` | 테더 준비 (Wallet 계약과 공유) |
| `/me/guide/principal` | 원금 안내 |
| `/me/guide/revenue` | 수익 안내 |
| `/me/guide/faq` | 자주 묻는 질문 |
| `/me/guide/partners` | 공식 협력 (PartnerTrust embed) |
| `/me/guide/market-weekly` | 시세 안내 · 투자권유 0 |

Legal 하위:

| 경로 | 의미 |
|------|------|
| `/me/legal` | 약관 허브 |
| `/me/legal/terms` | 이용약관 |
| `/me/legal/privacy` | 개인정보 |
| `/me/legal/license` | 라이선스 |
| `/me/legal/oss` | 오픈소스 |

```text
PRIMARY_AREA_COUNT = 8
PRIMARY_PAGE_COUNT = 18
NEW_ROUTE = FORBIDDEN
GUIDE_INDEX_ROUTE = FORBIDDEN
SECURITY_OWN_ROUTE = FORBIDDEN
```

### 1.3 Adjacent / compatibility (삭제 금지)

| 분류 | 경로 | 판정 |
|------|------|------|
| AIInsight | `/me/peotteok` | KEEP. Home embed 가능. **C-ACC-001 primary 8 아님** |
| Membership | `/me/membership` | COMPATIBILITY · `GET /api/v1/me/membership` KEEP |
| Benefits | `/me/benefits` | COMPATIBILITY · `GET /api/v1/me/benefits` KEEP |
| Events | `/me/events` | COMPATIBILITY · user API 0 · 페이지 KEEP |
| Strategies | `/me/strategies` | COMPATIBILITY · user API 0 · 페이지 KEEP |

```text
REQUIREMENT_PRESERVED = YES
FUNCTION_DELETE = FORBIDDEN
PRIMARY_NAV_PRIORITY = LOWERED
COMPAT_PAGE_COUNT = 4
C-ACC-003 = 호환경로 재확인 (핵심 8영역 인증과 분리)
```

레거시 4그룹은 **매핑 hint**일 뿐 IA가 아니다.

| 구 그룹 | 현재 |
|---------|------|
| profile | Profile |
| security | Settings에 MERGE |
| money | Wallet primary nav. Account Hub는 KYC 게이트만 |
| help | Support + Guides + Legal |

### 1.4 State machine (픽셀 아님)

| Area | Consumer states | 유저 의미 | 다음 |
|------|-----------------|-----------|------|
| Profile | auth / error | 하위 목록 | 해당 화면 · 재로그인 |
| Referral | enabled · rewards off · pool wait · bound · share limit | 조건/상태. pool wait ≠ 초대 실패 | 공유 또는 설명 |
| Notifications | empty · message · error | 빈 목록은 진실 | 딥링크 또는 재시도 |
| KYC | none · pending · approved · rejected | 출금만 막힘 | 제출 / 대기 / 재제출 / Wallet |
| Settings | default · saved · error | 저장됨 | My |
| Support | default · queued · error | 접수됨 | My / Guides |
| Guides / Legal | default | 읽기 | My |

`CONSUMER_SCREEN_STATE_MATRIX.md` 준수. 결측을 `0`으로 채우지 않는다.

### 1.5 Money / Auth / Legal invariants

| 규칙 | Owner | 위반 시 |
|------|-------|---------|
| KYC_ON_WITHDRAW = REQUIRED | `kyc-gate.ts` `assertWithdrawKyc` | 출금 403 |
| KYC_ON_PARTICIPATE = FORBIDDEN | `participateGate` `kycRequired: false` | Wallet/Loop 계약 위반 |
| KYC_ON_DEPOSIT = FORBIDDEN | 동일 | 입금 막음 금지 |
| GENDER_FIELD = FORBIDDEN | Auth Stage B · KYC submit | 화면/스키마 분기 금지 |
| RRN_FIELD = FORBIDDEN | KYC `rrnFull` never | 주민번호 타이핑 금지 |
| userId | JWT session only | body/query userId 신뢰 0 |
| Referral % | Admin program only | 유저 DTO/% 하드코드 금지 |
| invite cap | `inviteCountUnlimited: true` | 월간 캡 발명 금지 |
| Legal 문장 | `packages/ui/copy/ko/legal.ts` | 페이지에서 조문 창작 금지 |
| Guides 숫자 | copy only | Wallet/Engine Fact 재계산 금지 |
| Partnership | Founder lock | adapter 가용성과 혼용 금지 |
| Auth | Nest JWT only | Supabase Auth 금지 |

```text
AUTH_RULE_REDEFINITION = FORBIDDEN
MONEY_RULE_REDEFINITION = FORBIDDEN
LEGAL_SSOT_MUTATION = FORBIDDEN
SUPABASE_AUTH = FORBIDDEN
GENDER_FIELD = FORBIDDEN
RRN_FIELD = FORBIDDEN
KYC_ON_WITHDRAW = REQUIRED
KYC_ON_PARTICIPATE = FORBIDDEN
KYC_ON_DEPOSIT = FORBIDDEN
```

### 1.6 CTA domain

`CONSUMER_ROUTE_CTA_MATRIX.md` KEEP. 이 슬라이스에서 CTA를 재분류하지 않는다.

| 화면 | CTA | class |
|------|-----|-------|
| Profile | 초대/알림/본인확인/설정/지원/안내/약관 | VALID_ROUTE |
| Profile | 로그아웃 | VALID_ACTION `POST /auth/logout` |
| Referral | 공유 / 코드 연결 | VALID_ACTION |
| Notifications | 항목 / 읽음 | VALID_ROUTE / VALID_ACTION |
| KYC | 제출 | VALID_ACTION (none/rejected) |
| Settings | prefs 저장 / 탈퇴 | VALID_ACTION |
| Support | 분쟁 | VALID_ACTION |
| Events 등 | primary 열기 | INTENTIONALLY_DISABLED · COMPATIBILITY |

```text
DEAD_CRITICAL_CTA = 0
UNCLASSIFIED_CRITICAL_CTA = 0
```

픽셀 카피 확정은 미래 Figma. IT 용어(API, token, JWT, KYC 영문 코드) 유저 표면 0.

---

## 2. Visual Contract

```text
VISUAL_CLASS = CONSTRAINT_ONLY
APPROVED_FIGMA_ACCOUNT_HUB = NONE
APPROVED FIGMA = NONE
NEW_VISUAL_LOCK = NO
DOES_NOT_APPROVE_PIXELS = YES
HOME_GEOMETRY_DEPENDENCY = FORBIDDEN
LEGACY_VISUAL_RECOVERY = FORBIDDEN
SPARK_DASH_DNA_SHARE = CONSTRAINT_ONLY
```

이 절은 색·radius·간격·카드 생김새를 잠그지 않는다. **보여서는 안 되는 것**과 **상태가 의미하는 것**만 계약한다.

### 2.1 화면별 presentation 상태 (2026-08-20)

| 화면 | 현재 코드 | Visual 권위 |
|------|-----------|-------------|
| primary 18 | `PendingFigma` + 한국어 title | Approved Figma 없음 |
| compat 4 | `PendingFigma` | 동일. 삭제 금지 |
| `/me/peotteok` | `PendingFigma` | 인접 KEEP. 이 계약 시각 범위 아님 |
| Home | Spark Dash LOCKED | Account Hub가 가져가지 않음 |

```text
WEB_ACCOUNT_HUB_PRIMARY_PENDING_FIGMA = 18
WEB_ACCOUNT_HUB_COMPAT_PENDING_FIGMA = 4
WEB_ME_TOTAL_PENDING_FIGMA = 23
```

### 2.2 Forbidden presentation

- FAKE_FOMO / FAKE_ACTIVITY / 가짜 알림 / 가짜 초대 보상액
- 성별 필드·호칭 분기 · 주민번호 타이핑
- 추천 % · L1/L2/L3 영문 등급 · 멤버십을 My 기본 랜딩으로
- Home Header/Hero/Sidebar/Bottom Nav 복제
- Guides/Legal에 하드코드 수익·잔액
- IT 용어 (OAuth, JWT, token, multipart, journal)
- 레거시 Canon Account Hub 복구

### 2.3 State → 의미 (픽셀 아님)

| Consumer state | 보여야 하는 의미 | 보여서는 안 되는 것 |
|----------------|------------------|---------------------|
| Profile auth | 어디로 가는지 | 잔액/수익 발명 |
| Referral rewards off | 지금은 보상 프로그램이 꺼져 있음 | 가짜 % |
| Referral pool wait | 잠시 대기. 초대는 됨 | 초대 실패 |
| Inbox empty | 지금은 알림 없음 | 합성 카드 |
| KYC none/rejected | 출금 전에 본인 확인 | 참여 차단처럼 연출 |
| KYC pending | 확인 중 | 출금 가능 연출 |
| KYC approved | 출금 가능 | 참여 자격으로 오해 |
| Support queued | 접수됨 | 즉시 환불 약속 |
| Guides/Legal | 쉬운 설명 / 조건 | 투자 권유 · 조문 창작 |

### 2.4 구현 시 visual 규칙 (다음 슬라이스)

```text
WIRE_WITHOUT_APPROVED_FIGMA = ALLOWED
INVENT_PRESENTATION = FORBIDDEN
MINIMAL_REAL_DATA_SURFACE = ALLOWED
PendingFigma 유지 + 실데이터 연결 = ALLOWED
레거시 Canon/Visual Master 복구 = FORBIDDEN
HOME_GEOMETRY_DEPENDENCY = FORBIDDEN
```

C-ACC-002는 **가짜 돈을 넣지 않는 실배선**이 목표다. 픽셀 완료는 Approved Figma 이후.

---

## 3. Implementation Contract

### 3.1 KEEP (재사용 · 재작성 0)

| Owner | 경로 |
|-------|------|
| Session / logout / delete | `AuthController` · `AUTH_ROUTES` |
| Referral | `ReferralController` · `REFERRAL_USER_ROUTES` |
| Inbox + prefs | `InboxUserController` · `INBOX_USER_ROUTES` |
| KYC HTTP | `KycController` · `COMPLIANCE_USER_ROUTES` |
| KYC gate | `services/api-nest/src/compliance/kyc-gate.ts` |
| Support dispute | `WalletController` `POST wallet/deposit-disputes` |
| Membership read | `GET /api/v1/me/membership` |
| Benefits read | `GET /api/v1/me/benefits` · `/me/benefits/summary` |
| Legal copy | `packages/ui/copy/ko/legal.ts` · `verify:legal-plain-ko` |
| Route table | `apps/web/routes.ts` `USER_ROUTE_PATHS` |
| SDK session | `fetchAuthSession` (Acquisition KEEP) |
| SDK KYC | `fetchKycStatus` · `submitKyc` (Wallet KEEP) |
| Verify keep | `auth-flows` · `ops-inbox` · `notification-prefs-default-on` · `kyc-surfaces` · `wallet-kyc-session-auth` · `legal-plain-ko` · `invite-explain-surfaces` · `referral-*` · `wallet-contract` |

### 3.2 WIRE (이 계약 다음 슬라이스 · 이 슬라이스에서 구현 0)

| 다음 TASK | 해야 할 일 |
|-----------|------------|
| C-ACC-002 | 핵심 8영역 gap-only 배선. PendingFigma 18 유지. 새 라우트 0. SDK referral/inbox/logout/delete/disputes 갭만. 호환 4면 삭제 0 |
| C-ACC-003 | `verify:account-hub-release` · 핵심 8영역 route-contract 100% · 호환경로 재확인 · known defect 0 |

### 3.3 DO NOT INVENT

- 새 `/me/*` 라우트 · `/me/guide` 인덱스 · `/me/security`
- Membership/Benefits/Events/Strategies 삭제 또는 primary 복귀
- participate/deposit KYC 게이트
- 성별 · 주민번호 · 추천 %
- legal 문장 수정
- 새 분쟁/티켓 API
- Inbox fanout 발명 (G-P2-04 UNKNOWN)
- Home freeze 파일 수정
- Auth / Money / Engine 규칙 재정의
- Supabase Auth

### 3.4 File-level handoff (착수 지도 · 지금 수정 0)

| 파일 | 다음 분류 |
|------|-----------|
| `apps/web/app/me/page.tsx` | WIRE later · PendingFigma 유지 |
| `apps/web/app/me/invite/page.tsx` | WIRE later |
| `apps/web/app/me/inbox/page.tsx` | WIRE later |
| `apps/web/app/me/kyc/page.tsx` | WIRE later · Wallet과 공유 |
| `apps/web/app/me/settings/page.tsx` | WIRE later |
| `apps/web/app/me/support/page.tsx` | WIRE later |
| `apps/web/app/me/guide/**` · `legal/**` | WIRE later · copy KEEP |
| `apps/web/app/me/{membership,benefits,events,strategies}/page.tsx` | KEEP 호환 PendingFigma |
| `apps/web/app/me/peotteok/page.tsx` | KEEP 인접. 이 슬라이스 범위 밖 |
| `packages/sdk` referral/inbox | MISSING → C-ACC-002 |
| `packages/sdk` KYC/session | KEEP PRESENT |
| `services/api-nest` account owners | NO_CHANGE unless bug |
| Home freeze / `HomeDesktop` / `HomeMobile` | NO_CHANGE |

---

## 4. Gap analysis (2026-08-20 재실측)

추측 금지. 아래는 파일 읽기 결과.

| 주장 | 판정 | Evidence |
|------|------|----------|
| `/me` 등 primary 18이 실데이터 | **FALSE** | 전부 `PendingFigma` + title |
| 호환 4면이 풍부 UI | **FALSE** | 전부 `PendingFigma`. 페이지 자체는 존재 |
| Nest referral/inbox/kyc/disputes | **OWNER_FOUND** | 각 controller + session userId |
| Nest membership/benefits GET | **OWNER_FOUND** | `me/membership` · `me/benefits` |
| Events/Strategies user API | **MISSING** | routes 0. 페이지 호환만 |
| SDK KYC | **PRESENT** | `fetchKycStatus` · `submitKyc` (Wallet) |
| SDK session | **PRESENT** | `fetchAuthSession` |
| SDK logout / delete-account | **MISSING** | `packages/sdk/src/auth/fetch.ts` export 0 |
| SDK referral / inbox / prefs / disputes | **MISSING** | index export 0 |
| 성별/주민번호 필드 | **0** | KYC `NEVER: rrnFull · gender` · Stage B not gender |
| 가짜 금액 하드코드 | **CLOSED** | 그린필드 PendingFigma |
| Home geometry 종속 필요 | **NO** | freeze 독립 |
| 호환 기능 삭제 필요 | **NO** | REQUIREMENT_PRESERVED |

```text
WEB_ACCOUNT_HUB_PRIMARY_PENDING_FIGMA = 18
WEB_ACCOUNT_HUB_COMPAT_PENDING_FIGMA = 4
SDK_KYC_EXPORT = PRESENT
SDK_AUTH_SESSION_EXPORT = PRESENT
SDK_REFERRAL_EXPORT = MISSING
SDK_INBOX_EXPORT = MISSING
BACKEND_ACCOUNT_HUB = OWNER_FOUND
REAL_IMPLEMENTATION = WEB_UNWIRED
```

---

## 5. Acceptance (이 슬라이스)

C-ACC-001 done = 계약 문서 + 갭 재실측 + `verify:account-hub-contract` PASS.  
C-ACC-002 done = 핵심 8영역 gap-only 배선 + 시각 발명 0 + 호환 4면 보존.  
C-ACC-003 done = Account Hub certification PASS (핵심 8영역 route-contract 100% · 호환경로 재확인).

```text
IMPLEMENTATION_START = C-ACC-002
IMPLEMENTATION = WEB_UNWIRED
CERTIFICATION = C-ACC-003
FOUNDER_APPROVAL_REQUIRED = NO
```
