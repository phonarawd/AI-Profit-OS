---
name: "PUTDUK Current Master — Track G: Growth"
overview: "SEO/attribution/CAPI/ROAS + 광고 자동운영(Provider Onboarding/Standing Authorization/Campaign Orchestrator/Cursor Autonomous Ops/최종 인증). Marketing/CAPI 6건은 이전 정규화에서 GPT/Cursor 임의 Phase2 강등을 원 plan 순서 근거로 IMPORTANT_POST_CORE로 복원했다. Ads 자동화 5건은 원 plan+AGENTS.md 자기명시로 원래도 Phase2 — 변경 없음."
todos:
  - id: g-growth-001
    content: "[G-GROWTH-001] Attribution chain fixture(TDD 선행) · legacy=06 marketing-attribution-chain-fixture(pending, 배제마커 없음) · PRIORITY=IMPORTANT_POST_CORE(복원) · RISK=MEDIUM"
    status: pending
  - id: g-growth-002
    content: "[G-GROWTH-002] SDK attribution(utm-capture·consent·platform-cookies) · legacy=06 marketing-sdk-attribution(pending) · PRIORITY=IMPORTANT_POST_CORE(복원) · RISK=MEDIUM"
    status: pending
  - id: g-growth-003
    content: "[G-GROWTH-003] Signup/deposit hooks(user_attributions merge+first_deposit) · legacy=06 marketing-signup-deposit-hooks(pending) · PRIORITY=IMPORTANT_POST_CORE(복원) · RISK=MEDIUM"
    status: pending
  - id: g-growth-004
    content: "[G-GROWTH-004] CAPI metrics spec(METRICS.md SSOT) · legacy=06 marketing-capi-metrics-spec(pending) · PRIORITY=IMPORTANT_POST_CORE(복원) · RISK=LOW"
    status: pending
  - id: g-growth-005
    content: "[G-GROWTH-005] CAPI dispatcher wire(Meta/TikTok/Google adapters) · legacy=06 marketing-capi-dispatcher-wire(pending) · workers/marketing-capi-dispatcher scaffold 존재 · PRIORITY=IMPORTANT_POST_CORE(복원) · RISK=MEDIUM"
    status: pending
  - id: g-growth-006
    content: "[G-GROWTH-006] Admin ROAS health(delivery state+retry backlog) · legacy=06 marketing-admin-roas-health(pending) · PRIORITY=IMPORTANT_POST_CORE(복원) · RISK=LOW"
    status: pending
  - id: g-growth-007
    content: "[G-GROWTH-007] SEO 기초(sitemap/robots/JSON-LD) · legacy=06 marketing-seo-sitemap-jsonld(pending, 배제마커 없음) · PRIORITY=IMPORTANT_POST_CORE · RISK=LOW"
    status: pending
  - id: g-growth-008
    content: "[G-GROWTH-008] Ads Provider Onboarding · legacy=06 ads-provider-onboarding(pending, 원문 \"TRUE GAP·File-Serial 도달 전 구현0\" 명시) · PRIORITY=PHASE2(변경 없음) · RISK=MEDIUM"
    status: pending
  - id: g-growth-009
    content: "[G-GROWTH-009] Ads Budget Standing Authorization · legacy=06 ads-budget-standing-authorization(pending, 동일 자기명시) · PRIORITY=PHASE2(변경 없음) · RISK=HIGH"
    status: pending
  - id: g-growth-010
    content: "[G-GROWTH-010] Ads Campaign Orchestrator · legacy=06 ads-campaign-orchestrator(pending, 동일 자기명시) · PRIORITY=PHASE2(변경 없음) · RISK=HIGH"
    status: pending
  - id: g-growth-011
    content: "[G-GROWTH-011] Cursor Autonomous Ops Enablement · legacy=06 cursor-autonomous-ops-enablement(pending) · AGENTS.md \"지금 연결 금지\" 명시 · PRIORITY=PHASE2(변경 없음) · RISK=HIGH"
    status: pending
  - id: g-growth-012
    content: "[G-GROWTH-012] Ads Autonomous Ops Release Certification(R8 Core와 별개) · legacy=06 ads-autonomous-ops-release-certification(pending) · PRIORITY=PHASE2(변경 없음) · RISK=HIGH"
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
> TRACK = G (GROWTH)
> ```

# Track G — Growth

## Goal

성장 측정(SEO/Attribution/CAPI) 인프라 + (Phase2) 광고 자동운영.

## Priority restoration (Marketing/CAPI 6건 — 근거)

06 plan 원문 File-Serial 순번 1~7(marketing-attribution-chain-fixture ~ marketing-seo-sitemap-jsonld)에는
`ads-provider-onboarding`부터 시작하는 13~17번의 **"TRUE GAP v7.24.6"·"File-Serial 도달 전 구현0"**
같은 배제 마커가 **없다**. 1~7번은 미분화 순차 tier로 원복하고, 13~17번(ads 자동화)만 원 plan
자기명시 그대로 PHASE2를 유지한다.

```text
UNAPPROVED_PHASE2_DEMOTION(이 track, Marketing 6건) = 0  (복원 완료)
Ads 자동화 5건 = 원래부터 PHASE2(PLAN_EXPLICIT+AGENTS.md) — 변경 없음
```

## Tasks

| TASK_ID | TITLE | REQUIREMENT | SOURCE_TRACEABILITY | PRIORITY | PRIORITY_AUTHORITY | DEPENDS_ON(STRENGTH) | RISK |
|---|---|---|---|---|---|---|---|
| G-GROWTH-001 | Attribution fixture | D1~D3 TDD fixture 선행 | 06 `marketing-attribution-chain-fixture`(pending) | IMPORTANT_POST_CORE | PLAN_ORDER_ONLY | 없음 | MEDIUM |
| G-GROWTH-002 | SDK attribution | utm/consent/platform-cookies | 06 `marketing-sdk-attribution`(pending) | IMPORTANT_POST_CORE | PLAN_ORDER_ONLY | G-GROWTH-001(HARD) | MEDIUM |
| G-GROWTH-003 | Signup/deposit hooks | first_deposit→Purchase enqueue | 06 `marketing-signup-deposit-hooks`(pending) | IMPORTANT_POST_CORE | PLAN_ORDER_ONLY | G-GROWTH-001(HARD) | MEDIUM |
| G-GROWTH-004 | CAPI metrics spec | METRICS.md SSOT | 06 `marketing-capi-metrics-spec`(pending) | IMPORTANT_POST_CORE | PLAN_ORDER_ONLY | 없음 | LOW |
| G-GROWTH-005 | CAPI dispatcher wire | Meta/TikTok/Google adapters | 06 `marketing-capi-dispatcher-wire`(pending) | IMPORTANT_POST_CORE | PLAN_ORDER_ONLY | G-GROWTH-003+004(HARD) | MEDIUM |
| G-GROWTH-006 | Admin ROAS health | delivery state+retry backlog 표시 | 06 `marketing-admin-roas-health`(pending) | IMPORTANT_POST_CORE | PLAN_ORDER_ONLY | G-GROWTH-005(SOFT) | LOW |
| G-GROWTH-007 | SEO 기초 | sitemap/robots/JSON-LD | 06 `marketing-seo-sitemap-jsonld`(pending) | IMPORTANT_POST_CORE | PLAN_ORDER_ONLY | 없음(PARALLEL_SAFE) | LOW |
| G-GROWTH-008 | Ads Provider Onboarding | Meta/TikTok/Google 공식 API onboarding | 06 `ads-provider-onboarding`(pending) | PHASE2 | PLAN_EXPLICIT | G-GROWTH-005+007 완료(HARD, 원문 명시) | MEDIUM |
| G-GROWTH-009 | Ads Budget Standing Authorization | Founder 사전승인 deterministic 범위 | 06 `ads-budget-standing-authorization`(pending) | PHASE2 | PLAN_EXPLICIT | G-GROWTH-008(HARD) | HIGH |
| G-GROWTH-010 | Ads Campaign Orchestrator | Candidate→Guardrail→ACTIVE lifecycle | 06 `ads-campaign-orchestrator`(pending) | PHASE2 | PLAN_EXPLICIT | G-GROWTH-009(HARD) | HIGH |
| G-GROWTH-011 | Cursor Autonomous Ops Enablement | OpsEvent→Automation→Cloud Agent | 06 `cursor-autonomous-ops-enablement`(pending) | PHASE2 | PLAN_EXPLICIT+AGENTS.md | G-GROWTH-010(HARD) | HIGH |
| G-GROWTH-012 | Autonomous Ops Release Certification | Provider/Guardrail/Orchestrator 전부 PASS | 06 `ads-autonomous-ops-release-certification`(pending) | PHASE2 | PLAN_EXPLICIT(R8 Core와 별개 명시) | G-GROWTH-008~011(HARD) | HIGH |

## Owner / Evidence / Founder approval / Production impact

| TASK_ID | OWNER | EVIDENCE | FOUNDER_APPROVAL_REQUIRED | PRODUCTION_IMPACT |
|---|---|---|---|---|
| G-GROWTH-001~007 | packages/sdk/marketing + workers/marketing-capi-dispatcher | scaffold 존재(005) | NO | 없음(측정만) |
| G-GROWTH-008 | 신규 provider 연동 | — | **YES(OAuth/계정연결/새 채널=HIGH+HUMAN, 원문 명시)** | 있음(외부 계정) |
| G-GROWTH-009 | Admin + api-nest | admin-control-plane.v1.json과 별개 신규 | **YES(한도/계약 변경=HIGH+HUMAN)** | 있음(예산 집행 통제) |
| G-GROWTH-010 | Ads Orchestrator(신규) | — | **YES(새 message axis 등)** | 있음(광고 자동 집행) |
| G-GROWTH-011 | Cursor ops(신규) | AGENTS.md 현재 금지 | **YES(활성화 자체)** | 있음(자동화 범위) |
| G-GROWTH-012 | 전체 | — | YES(최종 판정) | 없음(인증) |

## Parallel safety

```text
Track G ↔ Track A/B/C/D/E/F = PARALLEL_SAFE (독립 workers/packages)
Track G 내부 001~007 = 대부분 PARALLEL_SAFE, 008~012만 엄격 SERIAL(원문 선행 명시)
```
