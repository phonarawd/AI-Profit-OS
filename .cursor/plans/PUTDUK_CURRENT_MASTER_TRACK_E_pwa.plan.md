---
name: "PUTDUK Current Master — Track E: PWA"
overview: "설치형 웹앱(manifest/Serwist/push/badge/WebAuthn/store bridge). 0% 구현(manifest.json 자체 repo에 없음 — drift 없이 원 plan pending과 완전히 일치). 이전 정규화에서 4건의 우선순위 오류(GPT/Cursor 임의 Phase2 강등)를 원 plan 텍스트 근거로 복원했다 — Founder 결정 사항이 아니라 plan 원문 File-Serial 순서 + 배제 마커 유무로 판정."
todos:
  - id: e-pwa-001
    content: "[E-PWA-001] Native shell(manifest=퍼뜩·ADR-017 Peotteok Light색·Serwist·Install·SW update) · legacy=05 pwa-native-shell(pending, 1번째 · 배제마커 없음) · PRIORITY=LAUNCH_REQUIRED(복원) · RISK=MEDIUM"
    status: pending
  - id: e-pwa-002
    content: "[E-PWA-002] Push+Badge(VAPID·sdk/push·Admin push kill) · legacy=05 pwa-push-badge(pending, 원문 \"Runtime P0 in-process\" 명시) · PRIORITY=LAUNCH_REQUIRED(복원) · RISK=MEDIUM"
    status: pending
  - id: e-pwa-003
    content: "[E-PWA-003] 자동 Push 채널 필터(notice/campaign/opportunity) · legacy=05 pwa-auto-fanout-prefs(pending, 배제마커 없음) · PRIORITY=LAUNCH_REQUIRED(복원) · RISK=LOW"
    status: pending
  - id: e-pwa-004
    content: "[E-PWA-004] WebAuthn UX/RP + haptics(Money §43 fallback) · legacy=05 pwa-webauthn-haptics(pending, 배제마커 없음) · PRIORITY=LAUNCH_REQUIRED(복원) · RISK=MEDIUM"
    status: pending
  - id: e-pwa-005
    content: "[E-PWA-005] Store bridge scaffold(TWA+assetlinks+Capacitor) · legacy=05 store-bridge-scaffold(pending, 원문 \"v2 only·Day-1 게이트 제외\" 명시) · PRIORITY=PHASE2(원 plan 자기명시, 변경 없음) · RISK=LOW"
    status: pending
  - id: e-pwa-006
    content: "[E-PWA-006] Uptodown Console listing · legacy=05 store-bridge-uptodown-listing(pending, 원문 \"Day-1 제외\" 명시) · PRIORITY=PHASE2(변경 없음) · RISK=LOW"
    status: pending
  - id: e-pwa-007
    content: "[E-PWA-007] PWA certification(manifest/install/offline/push dedup/WebAuthn/reduced-motion) · legacy=05 redesign-pwa-certification(pending) · PRIORITY=LAUNCH_REQUIRED(핵심 4건 기준) · RISK=MEDIUM"
    status: pending
isProject: false
---
<!-- REL-017-AUTHORITY-STAMP -->
```text
EXECUTION_AUTHORITY = NO
CONTENT_AUTHORITY = YES
SUPERSEDED_FOR_EXECUTION_BY = PUTDUK_RELEASE_MASTER.plan.md
```
<!-- /REL-017-AUTHORITY-STAMP -->


> ```text
> classification = CURRENT_ACTIVE_TRACK
> CURRENT_ACTIVE_PLAN = YES
> TRACK = E (PWA)
> ```

# Track E — PWA

## Goal

설치 가능한 웹앱(manifest/Serwist/install/update) + 보안 UX(Push/Badge/WebAuthn).

## Current truth

```text
apps/web/public/manifest*.json = 0건 (실측, Glob 확인)
Service Worker/Serwist 배선 = 발견되지 않음
→ 05 plan pending 7/7과 완전히 일치. drift 없음.
```

## Priority restoration (근거 — 추측 아님)

05 plan 원문 File-Serial 순서를 그대로 인용:

| 순번 | legacy_todo_id | 원문 배제 마커 | 복원된 판정 |
|---|---|---|---|
| 1 | `pwa-native-shell` | 없음 | LAUNCH_REQUIRED |
| 2 | `pwa-push-badge` | 없음(오히려 **"Runtime P0 in-process"** 명시 — 현재 phase 스코프) | LAUNCH_REQUIRED |
| 3 | `pwa-auto-fanout-prefs` | 없음 | LAUNCH_REQUIRED |
| 4 | `pwa-webauthn-haptics` | 없음 | LAUNCH_REQUIRED |
| 5 | `store-bridge-scaffold` | **"v2 only §24.3"·"Day-1 게이트 제외"** | PHASE2(변경 없음) |
| 6 | `store-bridge-uptodown-listing` | **"v2 only §24.3b"·"Day-1 제외"** | PHASE2(변경 없음) |
| 7 | `redesign-pwa-certification` | — | 1~4 완료 후 게이트 |

```text
UNAPPROVED_PHASE2_DEMOTION(이 track) = 0  (1~4 복원 완료, priority_authority=PLAN_ORDER_ONLY+PLAN_EXPLICIT)
```

## Tasks

| TASK_ID | TITLE | REQUIREMENT | SOURCE_TRACEABILITY | PRIORITY | PRIORITY_AUTHORITY | DEPENDS_ON(STRENGTH) | RISK |
|---|---|---|---|---|---|---|---|
| E-PWA-001 | Native shell | manifest+Serwist+install+SW update UX | 05 `pwa-native-shell`(pending) | LAUNCH_REQUIRED | PLAN_ORDER_ONLY | 승인 Figma 아이콘 필요(SOFT) | MEDIUM |
| E-PWA-002 | Push+Badge | VAPID+Badge+Admin kill | 05 `pwa-push-badge`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT("Runtime P0") | E-PWA-001(SOFT)·Track B 매칭/정산 이벤트(SOFT, 알릴 이벤트 필요) | MEDIUM |
| E-PWA-003 | 자동 Push 필터 | notice/campaign/opportunity prefs | 05 `pwa-auto-fanout-prefs`(pending) | LAUNCH_REQUIRED | PLAN_ORDER_ONLY | E-PWA-002(HARD) | LOW |
| E-PWA-004 | WebAuthn/haptics | RP+Money §43 fallback+reduced-motion | 05 `pwa-webauthn-haptics`(pending) | LAUNCH_REQUIRED | PLAN_ORDER_ONLY | 없음(PARALLEL_SAFE) | MEDIUM |
| E-PWA-005 | Store bridge scaffold | TWA+assetlinks+Capacitor | 05 `store-bridge-scaffold`(pending) | PHASE2 | PLAN_EXPLICIT("Day-1 제외") | E-PWA-004(HARD, 원문 명시) | LOW |
| E-PWA-006 | Uptodown listing | Console listing+publication criteria | 05 `store-bridge-uptodown-listing`(pending) | PHASE2 | PLAN_EXPLICIT | E-PWA-005(HARD) | LOW |
| E-PWA-007 | PWA certification | 1~4 통합 인증, known defect 0 | 05 `redesign-pwa-certification`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | E-PWA-001~004(HARD) | MEDIUM |

## Owner / Evidence / Founder approval / Production impact

| TASK_ID | OWNER | EVIDENCE | FOUNDER_APPROVAL_REQUIRED | PRODUCTION_IMPACT |
|---|---|---|---|---|
| E-PWA-001 | apps/web/public + app | 승인 Figma 아이콘(대기) | 아이콘/색상 승인 시 필요 | 없음 |
| E-PWA-002 | apps/web + workers/push-dispatcher(scaffold 존재) | workers/push-dispatcher | NO | 없음 |
| E-PWA-003 | apps/web + api-nest | notification_prefs 테이블 | NO | 없음 |
| E-PWA-004 | apps/web | Money §43 fallback 계약 | NO | 있음(인증 fallback) |
| E-PWA-005~006 | apps/web + native shell | — | Day-1 이후 재검토 시 Founder 확인 | 없음 |
| E-PWA-007 | tooling/verify | Lighthouse CI | NO | 없음(QA) |

## Parallel safety

```text
Track E ↔ Track A/B/C/D/F/G = PARALLEL_SAFE (독립 manifest/SW, 승인 Figma만 외부 의존)
```
