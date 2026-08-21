---
name: "PUTDUK Current Master — Track F: Production / Infra"
overview: "production persistence wiring · migration readiness · security · secrets · RLS/app-role verification · logging/monitoring/alerts · backup/recovery · deployment · browser/device QA · performance · rollback/runbook · release certification · Production E2E. Production DB write/migration apply는 이 Master 생성 세션은 물론 이 Track의 실행 세션에서도 Founder/GPT 별도 승인 전까지 실행하지 않는다 — migration 파일 존재 != production 적용."
todos:
  - id: f-rel-001
    content: "[F-REL-001] SourceObservation+CanonicalProduct 원격 Supabase migration 적용(별도 승인 슬라이스) · SOURCE=Correction Addendum §D(신규) · PRIORITY=LAUNCH_REQUIRED · CURRENT_NEXT_TASK 아님(Track A 로컬 proof + 아래 F-REL-006 보안준비 선행) · Founder/GPT 명시 승인 전 apply_migration 금지 · RISK=HIGH"
    status: pending
  - id: f-rel-002
    content: "[F-REL-002] Backend-data alignment certification(API·SDK·Nest import·FSM·migration head·RLS·idempotency 1:1) · legacy=06 redesign-r7-backend-data-certification(pending) · PRIORITY=IMPORTANT_POST_CORE · RISK=HIGH"
    status: pending
  - id: f-rel-003
    content: "[F-REL-003] Infra release certification(Core 한정 — Ads 자동화 제외 원문 명시) · legacy=06 redesign-r8-infra-release-certification(pending) · PRIORITY=LAUNCH_REQUIRED(Core) · RISK=HIGH"
    status: pending
  - id: f-rel-004
    content: "[F-REL-004] Phase1 adapter ingest host binding · legacy=06 phase1-adapter-ingest-host-binding(pending, 원문 \"Runtime P1\" 명시) · PRIORITY=PHASE2(변경 없음) · RISK=MEDIUM"
    status: pending
  - id: f-rel-005
    content: "[F-REL-005] Observability(cache/R2/Web Vitals/correlation/PII redaction/gradual deploy/DR drill) · legacy=06 infra-observability-late(pending, 원문 \"R8 late\" 자기명시) · PRIORITY=IMPORTANT_POST_CORE · RISK=MEDIUM"
    status: pending
  - id: f-rel-006
    content: "[F-REL-006] Security/secrets/RLS-role/backup·rollback baseline(신규, launch 전 필수) · SOURCE=Founder 요구사항 §20(신규, 어떤 legacy todo에도 명시적으로 없었음 — 이번 Master에서 최초 명문화) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
  - id: f-rel-007
    content: "[F-REL-007] Production E2E(인증 세션 실 브라우저 E2E) · SOURCE=신규(과거 forensic 실측 \"NOT FOUND\") · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
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
> TRACK = F (PRODUCTION / INFRA)
> ```
>
> ```text
> PRODUCTION_MIGRATION_APPLY = FOUNDER/GPT 명시 승인 전 금지
> PRODUCTION_DB_WRITE = 금지(이 Master 생성 세션 · 이후 실행 세션 모두)
> LOCAL VERIFIED != PRODUCTION DEPLOYED (항상 구분)
> ```

# Track F — Production / Infra

## Goal

Track A/B/C/D/E의 로컬 검증 결과를 **안전하게** production에 반영하고, 실제 launch를 인증한다.

## Current truth

```text
supabase/migrations/20260819210000_source_observations.sql   = 파일 존재, 원격 미적용
supabase/migrations/20260819220000_canonical_products.sql    = 파일 존재, 원격 미적용
PRODUCTION_OBSERVATION_PERSISTENCE = NOT_IMPLEMENTED
PRODUCTION_CANONICAL_PRODUCT_PERSISTENCE = NOT_IMPLEMENTED
REMOTE_SUPABASE_RUNTIME_VERIFICATION = NOT_VERIFIED
Supabase list_tables 실측(read-only) = source_observations/canonical_products/match_results
  테이블 원격 없음 · 기존 70+ 테이블(Money/Engine/Admin/AI/Growth)은 이미 production RLS ON
```

## Tasks

| TASK_ID | TITLE | REQUIREMENT | SOURCE_TRACEABILITY | PRIORITY | PRIORITY_AUTHORITY | DEPENDS_ON(STRENGTH) | RISK |
|---|---|---|---|---|---|---|---|
| F-REL-001 | Production migration 적용 | source_observations+canonical_products 원격 반영 | 신규(Correction Addendum §D) | LAUNCH_REQUIRED | FOUNDER_EXPLICIT(승인 게이트) | Track A 로컬 proof 종료(HARD)+F-REL-006(HARD) | HIGH |
| F-REL-002 | Backend-data alignment | API/SDK/FSM/RLS/idempotency 1:1 | 06 `redesign-r7-backend-data-certification`(pending) | IMPORTANT_POST_CORE | PLAN_EXPLICIT | 없음 | HIGH |
| F-REL-003 | Infra release cert(Core) | 배포/cache/R2/에러/세션/rollback | 06 `redesign-r8-infra-release-certification`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT(원문: Ads 제외) | F-REL-002(SOFT) | HIGH |
| F-REL-004 | Phase1 adapter host binding | NEST_ADAPTER_INGEST_URL 등 | 06 `phase1-adapter-ingest-host-binding`(pending) | PHASE2 | PLAN_EXPLICIT("Runtime P1") | phase-activation.mdc Phase1 활성화(HARD) | MEDIUM |
| F-REL-005 | Observability(R8 late) | Web Vitals+correlation+DR drill | 06 `infra-observability-late`(pending) | IMPORTANT_POST_CORE | PLAN_EXPLICIT("R8 late" 자기명시) | F-REL-003(SOFT) | MEDIUM |
| F-REL-006 | Security/secrets/RLS baseline | secret scan+RLS role 실증+backup/rollback runbook | 신규(Founder §20) | LAUNCH_REQUIRED | FOUNDER_EXPLICIT | 없음 | HIGH |
| F-REL-007 | Production E2E | 인증 세션 실 브라우저 E2E | 신규(과거 forensic "NOT FOUND") | LAUNCH_REQUIRED | TECHNICAL_SAFETY_REQUIREMENT | Track B 핵심 task 완료(HARD) | HIGH |

## Owner / Evidence / Founder approval / Production impact

| TASK_ID | OWNER | EVIDENCE | FOUNDER_APPROVAL_REQUIRED | PRODUCTION_IMPACT |
|---|---|---|---|---|
| F-REL-001 | supabase/migrations + Supabase MCP | 로컬 durable proof(Track A) | **YES(필수, 명시)** | **있음(원격 스키마 변경)** |
| F-REL-002 | 전체 repo | governance/platform-redesign/route-contract-matrix.v1.json | NO | 없음(검증) |
| F-REL-003 | infra/domain.manifest.json + workers | 기존 OpenNext Workers 배포 | NO(배포 자체는 기존 workflow_dispatch HUMAN 유지) | 있음(릴리스) |
| F-REL-004 | workers + api-nest | phase-activation.mdc | NO(Phase1 활성화는 별개 결정) | 있음(adapter 경로) |
| F-REL-005 | infra/observability | — | NO | 없음(관측) |
| F-REL-006 | infra/security + supabase | RLS 실측(전 테이블 ON 확인됨) | NO(baseline 구축)/YES(정책값 변경 시) | 없음(강화) |
| F-REL-007 | tooling/verify + Playwright | 과거 forensic 실측 | NO | 없음(QA) |

## Parallel safety

```text
Track F(F-REL-001, migration 적용) ↔ Track A = NOT_PARALLEL_SAFE (같은 supabase/migrations owner — 순차)
Track F(그 외 전부) ↔ Track A/B/C/D/E/G = PARALLEL_SAFE(읽기 전용 준비성 감사)
```

## Risk-based verification

```text
HIGH(001,003,006,007) → production 영향 실측 + rollback plan 필수 + Founder 승인 게이트
MEDIUM(002,004,005) → bounded integration verifier
```
