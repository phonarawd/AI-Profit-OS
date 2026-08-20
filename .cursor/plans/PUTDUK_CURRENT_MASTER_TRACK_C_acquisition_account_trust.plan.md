---
name: "PUTDUK Current Master — Track C: Acquisition / Account / Trust"
overview: Landing/Auth/Kakao/Signup/Onboarding + /me(Profile/Referral/Notifications/KYC/Settings/Support/Guides/Legal). CONSUMER_UX_ARCHITECTURE.md(FOUNDER APPROVED)가 Account Hub 원 스코프 중 Membership/Benefits/Events/Strategies를 primary journey에서 제거했으나 기능 자체는 이미 구현되어 호환 경로로 보존된다 — 기능 삭제가 아니라 IA 우선순위 조정.
todos:
  - id: c-auth-001
    content: "[C-AUTH-001] Kakao OAuth runtime 재검증(과거 실측: 콜백 페이지 부재) · legacy=06 auth-kakao-oauth-runtime(pending) · PRIORITY=LAUNCH_BLOCKER 후보(재확인 필요) · RISK=HIGH"
    status: completed
  - id: c-acq-001
    content: "[C-ACQ-001] Acquisition contract(Landing/Auth/Signup/Onboarding) · legacy=03 redesign-r2-acquisition-contract(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: completed
  - id: c-acq-002
    content: "[C-ACQ-002] Acquisition gap-only 구현 · legacy=03 redesign-r2-acquisition-implementation(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: completed
  - id: c-acq-003
    content: "[C-ACQ-003] Acquisition certification · legacy=03 redesign-r2-acquisition-certification(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: completed
  - id: c-acc-001
    content: "[C-ACC-001] Account Hub contract(재스코프: Profile/Referral/Notifications/KYC/Settings/Support/Guides/Legal 우선) · legacy=03 redesign-r5-account-hub-contract(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=MEDIUM"
    status: pending
  - id: c-acc-002
    content: "[C-ACC-002] Account Hub gap-only 구현(핵심 8영역) · legacy=03 redesign-r5-account-hub-implementation(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=MEDIUM"
    status: pending
  - id: c-acc-003
    content: "[C-ACC-003] Account Hub certification + Membership/Benefits/Events/Strategies 호환경로 재확인(이미 구현됨, primary journey 아님) · legacy=03 redesign-r5-account-hub-certification(pending) · PRIORITY=LAUNCH_REQUIRED(핵심)/IMPORTANT_POST_CORE(호환경로분) · RISK=MEDIUM"
    status: pending
  - id: c-acc-004
    content: "[C-ACC-004] 20/40/60~70대 실사 spotcheck(readability·3초질문·이모지·성별중성) · legacy=03 trust-age-spotcheck(pending, 구 ADR-018 H-track 종속 표현은 폐기·Home LOCK과 독립) · PRIORITY=IMPORTANT_POST_CORE · RISK=LOW"
    status: pending
isProject: false
---

> ```text
> classification = CURRENT_ACTIVE_TRACK
> CURRENT_ACTIVE_PLAN = YES
> TRACK = C (ACQUISITION / ACCOUNT / TRUST)
> ```

# Track C — Acquisition / Account / Trust

## Goal

Guest가 가입/로그인해서 실제 계정을 만들고, 계정 안에서 신뢰(약관/KYC/지원/추천)를 확인할 수 있게 한다.

## Current truth

| 항목 | 상태 | Evidence |
|---|---|---|
| Kakao 로그인 UI | login/signup = `PendingFigma` + 실배선 (C-ACQ-002) · thin start = `/auth/oauth/kakao` | 시각 완성 ≠ 이 슬라이스. SDK `@aipo/sdk/auth` PRESENT · WEB_GAP_WIRED |
| Kakao OAuth backend runtime | **IMPLEMENTED** (C-AUTH-001 · 2026-08-20) | Nest `GET+POST /api/v1/auth/oauth/kakao/callback` · `kakao-oauth.core.cjs` code→token→profile(`profile_nickname`) · `raw_profile` 저장 · 성별 strip · 기존 유저 terms 없이 세션 · 신규는 state/body terms · thin Next `/auth/oauth/kakao` → GET start. **LIVE_KAKAO_HUMAN_E2E = NOT_RUN**(Founder 계정 필요). LAUNCH_BLOCKER 후보 → **CODE_RUNTIME_CLOSED / HUMAN_E2E_OPEN** |
| Acquisition certification | **RELEASE_PASS** (C-ACQ-003 · 2026-08-20) | `verify:acquisition-release` · guest/auth/error/resume 인프로세스 · known defect 0 · ads→Core redirect 0 · PendingFigma 7 · LIVE_KAKAO_HUMAN_E2E=NOT_RUN(known defect 아님) |
| Account Hub 원 스코프 | 12+ 모듈(구 03 R5) | `CONSUMER_UX_ARCHITECTURE.md`가 D-01~D07로 Founder 승인 재정렬 |
| Membership/Benefits/Events/Strategies | **이미 구현됨**(03 `benefit-hub-surfaces`·`membership-grade-ux`·03 `invite-explain-kr-2070` 등 completed) | `CONSUMER_UX_ARCHITECTURE.md`: "PRIMARY JOURNEY에서 제거. 호환 경로만 유지. 제품 핵심이 아님" — **기능 삭제 아님, IA 우선순위만 조정** |

```text
REQUIREMENT_PRESERVED = YES (Membership/Benefits/Events/Strategies 기능 전부 보존)
IMPLEMENTATION_UPDATED = 해당 없음(이미 구현됨)
PRIMARY_NAV_PRIORITY = LOWERED (Founder 명시 승인, CONSUMER_UX_ARCHITECTURE D01~D07)
```

## Tasks

| TASK_ID | TITLE | REQUIREMENT | SOURCE_TRACEABILITY | PRIORITY | PRIORITY_AUTHORITY | DEPENDS_ON(STRENGTH) | RISK |
|---|---|---|---|---|---|---|---|
| C-AUTH-001 | Kakao OAuth 재검증 | 콜백/세션 발급 실제 동작 확인+완주 | 06 `auth-kakao-oauth-runtime`(pending) | **LAUNCH_BLOCKER 후보** | PLAN_EXPLICIT + TECHNICAL_SAFETY_REQUIREMENT(로그인 없이 launch 불가) | 없음(PARALLEL_SAFE) | HIGH |
| C-ACQ-001 | Acquisition contract | Landing/Auth/Signup/Onboarding 계약 · **CONTRACT_READY** (`CONSUMER_ACQUISITION_CONTRACT.md`) | 03 `redesign-r2-acquisition-contract`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | 없음 | HIGH |
| C-ACQ-002 | Acquisition gap-only | 갭만 구현, 기존 GuestChrome/consent 보존 | 03 `redesign-r2-acquisition-implementation`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | C-ACQ-001(SOFT)·C-AUTH-001(HARD) | HIGH |
| C-ACQ-003 | Acquisition certification | 실 guest/auth/error/resume, known defect 0 | 03 `redesign-r2-acquisition-certification`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | C-ACQ-002(HARD) | HIGH |
| C-ACC-001 | Account Hub contract(재스코프) | 8영역 계약(Profile/Referral/Notif/KYC/Settings/Support/Guides/Legal) | 03 `redesign-r5-account-hub-contract`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT + FOUNDER_EXPLICIT(재스코프) | 없음 | MEDIUM |
| C-ACC-002 | Account Hub gap-only(핵심) | 8영역 gap-only 통합 | 03 `redesign-r5-account-hub-implementation`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | C-ACC-001(SOFT) | MEDIUM |
| C-ACC-003 | Account Hub certification | route-contract matrix 100%(핵심 8영역) | 03 `redesign-r5-account-hub-certification`(pending) | LAUNCH_REQUIRED(핵심)/IMPORTANT_POST_CORE(호환경로) | PLAN_EXPLICIT + FOUNDER_EXPLICIT(재스코프) | C-ACC-002(HARD) | MEDIUM |
| C-ACC-004 | 연령대 실사 spotcheck | 20/40/60~70대 각3명 readability | 03 `trust-age-spotcheck`(pending) | IMPORTANT_POST_CORE | PLAN_ORDER_ONLY(옛 ADR-018 종속 표현은 폐기) | Home LOCK과 무관(독립) | LOW |

## Owner / Evidence / Founder approval / Production impact

| TASK_ID | OWNER | EVIDENCE | FOUNDER_APPROVAL_REQUIRED | PRODUCTION_IMPACT |
|---|---|---|---|---|
| C-AUTH-001 | services/api-nest auth + workers | Nest `auth.controller.ts` | NO | 있음(로그인 경로) |
| C-ACQ-001~003 | apps/web/app/{auth,onboarding,l} | 기존 GuestChrome/utility copy | NO | 없음(가입 UX) |
| C-ACC-001~003 | apps/web/app/me/** | 기존 KYC/inbox/benefits REAL 라우트 | NO | 없음(대부분 read) |
| C-ACC-004 | QA(코드 수정 아님) | Home freeze-qa.v1.json(별도 절차) | NO(QA 절차) | 없음 |

## Parallel safety

```text
Track C ↔ Track A/B/D/E = PARALLEL_SAFE (다른 파일/route)
Track C 내부 = 위 표 DEPENDS_ON 그대로
```
