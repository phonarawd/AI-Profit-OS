# CONSUMER ACQUISITION CONTRACT

> **문서 종류:** Product · Visual · Implementation Contract  
> **TASK:** C-ACQ-001 · Track C Acquisition / Account / Trust  
> **일자:** 2026-08-20  
> **상태:** CONTRACT_READY · IMPLEMENTATION = WEB_UNWIRED · CERTIFICATION = PENDING  
> **시각 권위:** APPROVED FIGMA = NONE  
> **Auth Rule:** 재정의 0 (Nest JWT · Stage A/B · Kakao primary · Supabase Auth 0)

```text
classification = CURRENT_ACQUISITION_CONTRACT
NEW_VISUAL_LOCK = NO
NEW_CONSTITUTION = NO
NEW_ROUTE = FORBIDDEN
AUTH_RULE_REDEFINITION = FORBIDDEN
LEGAL_SSOT_MUTATION = FORBIDDEN
HOME_GEOMETRY_DEPENDENCY = FORBIDDEN
PRODUCTION_IMPACT = NONE
```

교차 SSOT:

| 개념 | 파일 |
|------|------|
| Product journey | `CONSUMER_UX_ARCHITECTURE.md` Acquisition · `CONSUMER_JOURNEY_MAP.md` |
| Screens / CTA | `CONSUMER_SCREEN_INVENTORY.md` · `CONSUMER_ROUTE_CTA_MATRIX.md` |
| Owners | `CONSUMER_DATA_STATE_OWNER_MATRIX.md` |
| Machine contract | `governance/consumer-acquisition/acquisition.v1.json` |
| Kakao runtime | C-AUTH-001 · `verify:kakao-oauth-runtime` |
| Home freeze | `governance/consumer-home-approval/home-approval-freeze.v1.json` |
| Legacy pointer | 03 `redesign-r2-acquisition-contract` (실행 큐 아님) |

---

## 0. Authority

```text
BUSINESS_TRUTH        = AuthService · Stage A/B · Kakao code exchange · session cookie aipo_session
PRODUCT_TRUTH         = 이 문서 + CONSUMER_UX_ARCHITECTURE Acquisition
PRESENTATION_TRUTH    = NEW APPROVED FIGMA ONLY
IMPLEMENTATION_TRUTH  = 2026-08-20 재실측 코드
HOME_PRESENTATION     = FOUNDER APPROVED / LOCKED (guest `/` 시각은 이 계약이 가져가지 않음)
SPARK_DASH_DNA        = trust/utility 제약만 공유. Home geometry 종속 0
```

금지된 권위 승격:

- 구 Visual Master / Canon / Lux / 고정 5탭으로 Landing/Auth/Onboarding을 복구
- Home geometry(Header/Hero/Sidebar/Bottom Nav/Home spacing)를 `/auth*` `/onboarding` `/ads` `/l/*`에 복제
- Figma 없이 픽셀·색·카드 생김새를 잠금
- 지리 시세맵 발명
- legal SSOT 문장 삭제/왜곡 · 가짜 심사용 legal
- Reviewer vs Real User · UA/IP 히어로 분기 (dual-layer cloaking)
- robots.txt를 Core 보안으로 사용
- Kakao를 랜딩 firstViewport 직행 CTA로

플랜 문구 정정(재실측):

```text
PLAN_SAID(과거)     = /auth/oauth/kakao Next page 없음 · Nest signup POST 미호출
REMEASURED(C-AUTH-001) = Nest GET+POST callback + code→token→profile IMPLEMENTED
                        thin `/auth/oauth/kakao` PRESENT
                        login/signup/complete-profile/onboarding/ads/l = PendingFigma
C-ACQ-002            = WIRE_WITHOUT_APPROVED_FIGMA (최소 실데이터) · 픽셀 발명 0
```

---

## 1. Product Contract

### 1.1 Object identity

같은 말이 아니다. 섞지 않는다.

| 객체 | 정체 | 아님 |
|------|------|------|
| Guest | 세션 없음. Landing/Ads만 본다 | Reviewer 전용 히어로 |
| Stage A | 약관 동의 + identity(Kakao/Google/Passkey/Email) | 출금 가능 프로필 |
| Stage B | displayName · phoneE164 · birthDate(만19+) · email(없을 때) | 성별 · 주민번호 · 주소 필수 |
| Kakao identity | `auth_oauth_identities.provider_subject` = Kakao `id` | authorization `code` |
| Session | Nest JWT · cookie `aipo_session` | Supabase Auth |
| 시세 맵 | 시세·가격 비교 화면 라벨 | 지리 지도 UI |
| Public Ad Surface | `/ads` `/l/[variant]` | Authenticated Core (`/profits` `/wallet` `/me`) |
| Onboarding | 가입 직후 설명. Home으로 보냄 | 수익 보장 튜토리얼 |

```text
CODE_EQUALS_PROVIDER_SUBJECT = FORBIDDEN
GENDER_FIELD = FORBIDDEN
RRN_FIELD = FORBIDDEN
FAKE_LEGAL = FORBIDDEN
GEO_PRICE_MAP = FORBIDDEN
G9_PUBLIC_MAP_BEFORE_SIGNUP = FORBIDDEN
```

### 1.2 Surfaces (유저 의미)

| Screen | 현재 경로 | 유저 의미 | 다음 |
|--------|-----------|-----------|------|
| Landing (guest Home) | `/` | 퍼뜩이 뭔지 3초 | Signup / Login / Onboarding |
| Public Ad | `/ads` · `/l/[variant]` | 광고 랜딩. 검색 noindex | Onboarding 또는 Login |
| Signup | `/auth/signup` | 계정 만들기 · Kakao primary | CompleteProfile / Onboarding |
| Login | `/auth/login` | 기존 세션 | Home |
| Kakao start | `/auth/oauth/kakao` | 카카오 연결 시작 (thin) | Nest GET start → Kakao → GET callback |
| CompleteProfile | `/auth/complete-profile` | 나를 어떻게 부르나 | Onboarding / Home |
| Onboarding | `/onboarding` | 왜 자본이 필요한지 | Home |

```text
NEW_ROUTE = FORBIDDEN
/auth/oauth/kakao = DOCUMENTED_MISSING_THEN_CLOSED (C-AUTH-001) · 새 제품 IA 아님
```

### 1.3 Auth / session wire

| 단계 | HTTP | 소유 |
|------|------|------|
| Kakao start | `GET\|POST /api/v1/auth/oauth/kakao/start` | Nest. state=CSRF+terms |
| Kakao callback | `GET /api/v1/auth/oauth/kakao/callback` | Nest. Kakao console redirect = `API_HOST` |
| Kakao complete (programmatic) | `POST /api/v1/auth/oauth/kakao/callback` `{code,state}` | Nest. code 교환 필수 |
| Signup Stage A | `POST /api/v1/auth/signup` | Nest. terms+privacy 필수 |
| Profile Stage B | `PATCH /api/v1/auth/profile` | Nest + JWT |
| Session | `GET /api/v1/auth/session` | JWT / cookie |
| Logout | `POST /api/v1/auth/logout` | JWT |

기존 유저 Kakao 재로그인 = terms 재수집 0.  
신규 Kakao = signed state 또는 POST body의 `termsAcceptedAt`+`privacyAcceptedAt` 없으면 `/auth/signup`.

### 1.4 Copy / message axes (광고·게스트)

허용 축만:

- `PRICE_COMPARISON`
- `MARKET_DISCOVERY`
- `TIME_SAVING`

공개 플로우 카피 hierarchy:

| 층 | 의미 | 금지 |
|----|------|------|
| Hero | 실제 비교 기능 | 수익/투자/보장 약속 |
| Benefit | 여러 사이트를 돌아다니지 않고 확인 | 알바·재테크 |
| Opportunity signal | `가격 차이 확인` | 시간+금액 보장 |
| CTA (잠금) | `실시간 시세 맵 열기` / `지금 비교해 보기` / `시세 맵 보기` | 가입 전 공개 맵 라우트 |

CTA 목적지 = `/onboarding` 또는 `/auth/login`. Infra §31.2d G9 `가입 전에 시세 맵부터 볼 수 있어요` = 출시 금지.

Guest/landing 금지어(스캐너 L1): 수익 · 투자 · USDT · 테더 · 보장 · 차익 · 괴리율 · 재테크 · 알바.

legal = 기존 `T.legal.*` / `/me/legal` **내용 수정 0**. 공개 접근 gap은 read-only public alias 최소 검토만.

### 1.5 Dual-layer · Core 가드

```text
Public Ad Product Surface  ≠  Authenticated Product Core
Reviewer vs Real User 분기 = FORBIDDEN
UA / IP / AdsBot 다른 히어로 = FORBIDDEN
robots.txt = 보안 아님
```

Core (`/profits/*` `/wallet/*` `/me/*`, legal public alias 예외) = 인증/인가.

`/ads` `/l/*` = Admin route로 변경 0.

---

## 2. Visual Contract

이 절은 색·radius·간격·카드 생김새를 잠그지 않는다. **보여서는 안 되는 것**과 **상태가 의미하는 것**만 계약한다.

### 2.1 화면별 presentation 상태 (2026-08-20)

| 화면 | 현재 코드 | Visual 권위 |
|------|-----------|-------------|
| guest `/` | Home Spark Dash LOCKED | Home freeze. Acquisition 시각 범위 밖 |
| `/ads` `/ads/[variant]` `/l/[variant]` | `PendingFigma title="퍼뜩"` | Approved Figma 없음 |
| `/auth/login` | `PendingFigma title="로그인"` | Approved Figma 없음 |
| `/auth/signup` | `PendingFigma title="가입"` | Approved Figma 없음 |
| `/auth/complete-profile` | `PendingFigma title="프로필"` | Approved Figma 없음 |
| `/onboarding` | `PendingFigma title="시작"` | Approved Figma 없음 |
| `/auth/oauth/kakao` | thin `redirect` → Nest GET start | 시각 발명 0 |

```text
WEB_ACQUISITION_PENDING_FIGMA = 7
KAKAO_START_PAGE = PRESENT
```

### 2.2 Forbidden presentation

- FAKE_FOMO / FAKE_ACTIVITY / 수익 보장 CTA
- 성별 필드·호칭 분기
- 주민번호 타이핑
- 지리 시세맵
- Home Header/Hero/Sidebar/Bottom Nav 복제
- 랜딩 firstViewport Kakao 직행
- IT 용어 (OAuth, callback, JWT, token)

### 2.3 State → 의미 (픽셀 아님)

| Consumer state | 보여야 하는 의미 | 보여서는 안 되는 것 |
|----------------|------------------|---------------------|
| guest | 이게 뭐고 다음에 뭘 하지 | 가짜 잔액 · 가짜 기회 수 |
| kakao unavailable | 지금은 카카오로 연결할 수 없음 | CLIENT_ID만으로 활성 |
| oauth fail | 다시 시도 / 다른 방법 | 기술 스택 에러 원문 |
| Stage A done / B incomplete | 이름·연락을 알려 주세요 (출금 전) | 출금 가능처럼 연출 |
| onboarding | 왜 자본이 필요한지 | 수익 약속 스테퍼 |

### 2.4 구현 시 visual 규칙 (다음 슬라이스)

```text
WIRE_WITHOUT_APPROVED_FIGMA = ALLOWED
INVENT_PRESENTATION = FORBIDDEN
MINIMAL_REAL_DATA_SURFACE = ALLOWED
PendingFigma 유지 + 실데이터 연결 = ALLOWED
레거시 Canon/Visual Master 복구 = FORBIDDEN
HOME_GEOMETRY_DEPENDENCY = FORBIDDEN
```

---

## 3. Implementation Contract

### 3.1 KEEP (재사용 · 재작성 0)

| Owner | 경로 |
|-------|------|
| Auth HTTP | `AuthController` · `AUTH_ROUTES` |
| Kakao exchange | `services/api-nest/kakao-oauth.core.cjs` |
| Stage A/B | `auth.stage.ts` · `user-profile.v1` |
| Session cookie | `aipo_session` · `JwtAuthGuard` |
| Next API rewrite | `apps/web/next.config.ts` `/api/v1/:path*` |
| Home guest visual | Home freeze SSOT |
| Ads rewrite | `/ads` → `/l/meta` |
| Verify | `kakao-oauth-runtime` · `auth-flows` · `auth-session-cookie` · `landing-3s` · `marketing-compliance` · `operator-footer` |

### 3.2 WIRE (이 계약 다음 슬라이스 · 이 슬라이스에서 구현 0)

| 다음 TASK | 해야 할 일 |
|-----------|------------|
| C-ACQ-002 | login/signup/complete-profile/onboarding/ads/l gap-only 실배선. GuestChrome/consent/session-cookie 보존. 맵 컴포넌트 발명 0. 새 라우트 0. 광고 카피 자유생성 0 |
| C-ACQ-003 | 실 guest/auth/error/resume · known defect 0 · `verify:acquisition-release` |

### 3.3 DO NOT INVENT

- 새 auth provider / Supabase Auth
- Google code exchange (C-AUTH-001 범위 밖)
- 성별 · 주민번호 · 주소 Day-1 필수
- 공개 지리맵 · programmatic SEO
- legal 문장 수정
- `/ads` `/l/*`를 Admin으로 변경
- Home freeze 파일 수정
- Auth/Money/Engine 규칙 재정의

### 3.4 File-level handoff (착수 지도 · 지금 수정 0)

| 파일 | 다음 분류 |
|------|-----------|
| `apps/web/app/auth/login/page.tsx` | WIRE in C-ACQ-002 · PendingFigma 유지 가능 |
| `apps/web/app/auth/signup/page.tsx` | WIRE · Kakao start + terms → POST start |
| `apps/web/app/auth/complete-profile/page.tsx` | WIRE · `PATCH /auth/profile` |
| `apps/web/app/onboarding/page.tsx` | WIRE · Home CTA |
| `apps/web/app/ads/**` · `app/l/**` | KEEP surface · copy lock · Core redirect 0 |
| `apps/web/app/auth/oauth/kakao/page.tsx` | KEEP thin |
| `packages/sdk` auth | MISSING · C-ACQ-002가 최소 client만 |
| `services/api-nest/src/auth/**` | NO_CHANGE unless bug |
| Home freeze / `HomeDesktop` / `HomeMobile` | NO_CHANGE |

---

## 4. Gap analysis (2026-08-20 재실측)

추측 금지. 아래는 파일 읽기 결과.

| 주장 | 판정 | Evidence |
|------|------|----------|
| Kakao Next page 없음 | **CLOSED** | `apps/web/app/auth/oauth/kakao/page.tsx` → Nest GET start |
| Nest Kakao callback GET 없음 | **CLOSED** | `oauthCallbackGet` · console redirect = API_HOST |
| Kakao code를 subject로 사용 | **CLOSED** | `exchangeKakaoCode` · `id`만 subject |
| login/signup Nest 호출 | **0** | 두 페이지 `PendingFigma` only |
| complete-profile PATCH | **0** | `PendingFigma` |
| onboarding 실데이터 | **0** | `PendingFigma` |
| `/ads` `/l/*` 실카피 surface | **PendingFigma** | title=`퍼뜩` |
| SDK auth module | **MISSING** | G-P1-03 |
| GuestChrome wrap on auth pages | **MISSING** | greenfield skip |
| 성별 필드 | **0** | Stage/schema `not gender` |
| 가짜 금액 하드코드 | **CLOSED** | PendingFigma. 재실측 |
| Home geometry 종속 필요 | **NO** | freeze 독립 |

```text
WEB_ACQUISITION_PENDING_FIGMA = 7
KAKAO_START_PAGE = PRESENT
KAKAO_CODE_EXCHANGE = PRESENT
SDK_AUTH_EXPORT = MISSING
REAL_IMPLEMENTATION = WEB_UNWIRED
ACQUISITION_CERTIFICATION = PENDING
```

---

## 5. Acceptance (이 슬라이스)

C-ACQ-001 done = 계약 문서 + 갭 재실측 + `verify:acquisition-contract` PASS.  
C-ACQ-002 done = gap-only 배선 + 시각 발명 0.  
C-ACQ-003 done = `verify:acquisition-release` PASS · known P0~P3 defect 0.

```text
IMPLEMENTATION_START = C-ACQ-002
CERTIFICATION = C-ACQ-003
FOUNDER_APPROVAL_REQUIRED = NO
```
