---
name: "PUTDUK Current Master — Track A: Product / Data Core"
overview: Universal Matching Core + Generic Product Profile + Category-specific plugins. SourceObservation → Identity Matching → CanonicalProduct → Generic Product Profile → Candidate Generation → Listing/Variant Compatibility → Listing Promotion → executable price/availability/fees/FX → Multi-source Opportunity. 카드/시계/가방 전용 아님 — 범용 아키텍처. Money/Engine pricing/FX owner는 재설계하지 않고 재사용만 한다.
todos:
  - id: a-data-001
    content: "[A-DATA-001] SourceObservation durable local proof · STATUS=VERIFIED(local, CURSOR_CREATED_LOCAL_TEST_POSTGRES) · PRODUCTION 미적용 · RISK=HIGH · evidence=governance/global-product/source-observation-runtime.v1.json"
    status: completed
  - id: a-match-001
    content: "[A-MATCH-001] Identity Matching V1(typed identifier fail-closed) · STATUS=PASS · RISK=HIGH · 재오픈 금지(메커니즘) · evidence=governance/global-product/identity-matching.v1.json"
    status: completed
  - id: a-match-002
    content: "[A-MATCH-002] Identity Matching V2(pairwise·category profile·composite MATCH) + 최초 실제 cross-source pair(TCG 113669↔eBay 377416817781·trading_card·COMPOSITE_STRONG) · STATUS=PASS · RISK=HIGH · 재오픈 금지(메커니즘, 카테고리 확장은 자유) · evidence=governance/global-product/identity-matching.v2.json"
    status: completed
  - id: a-product-001
    content: "[A-PRODUCT-001] CanonicalProduct+PD foundation(in-process) + durable local DB proof(CanonicalProduct 테이블) · STATUS=VERIFIED(local) · RISK=HIGH · evidence=governance/global-product/canonical-product.v2.json(persistence.CANONICAL_PRODUCT_DB_RUNTIME=PASS)"
    status: completed
  - id: a-product-002
    content: "[A-PRODUCT-002] CanonicalProductSourceLink durable local · STATUS=VERIFIED(local) · RISK=HIGH · evidence=canonical-product.v2.json(CANONICAL_PRODUCT_SOURCE_LINK_DB_RUNTIME=PASS)"
    status: completed
  - id: a-match-003
    content: "[A-MATCH-003] MatchResult durable persistence · STATUS=VERIFIED(local, CURSOR_CREATED_ISOLATED_LOCAL_POSTGRES) · PRODUCTION 미적용 · RISK=HIGH · evidence=tooling/verify/match-result-durable-persistence.cjs"
    status: completed
  - id: a-product-003
    content: "[A-PRODUCT-003] Generic Product Profile(minimum: universal identity architecture + mvp 4종) · STATUS=READY candidate · AUTO_START=NO · PRIORITY=LAUNCH_REQUIRED · PRIORITY_AUTHORITY=FOUNDER_EXPLICIT · RISK=HIGH · DEPENDS_ON=A-PRODUCT-001(HARD)·A-MATCH-003(SOFT)"
    status: completed
  - id: a-product-004
    content: "[A-PRODUCT-004] Candidate Generation(첫 슬라이스) · STATUS=PASS(in-process) · PRIORITY=LAUNCH_REQUIRED · PRIORITY_AUTHORITY=FOUNDER_EXPLICIT · RISK=HIGH · DEPENDS_ON=A-PRODUCT-003(SOFT)·A-MATCH-002(HARD) · evidence=governance/global-product/candidate-generation.v1.json"
    status: completed
  - id: a-product-005
    content: "[A-PRODUCT-005] Listing / Variant Compatibility · STATUS=PASS(in-process) · PRIORITY=LAUNCH_REQUIRED · PRIORITY_AUTHORITY=FOUNDER_EXPLICIT · RISK=HIGH · DEPENDS_ON=A-PRODUCT-004(HARD) · evidence=governance/global-product/listing-variant-compatibility.v1.json"
    status: completed
  - id: a-product-006
    content: "[A-PRODUCT-006] Listing Promotion Contract · PRIORITY=LAUNCH_REQUIRED · PRIORITY_AUTHORITY=FOUNDER_EXPLICIT · RISK=HIGH · DEPENDS_ON=A-PRODUCT-005(HARD)"
    status: pending
  - id: a-product-007
    content: "[A-PRODUCT-007] executable price + availability + fees + FX wiring(Money/Engine 기존 owner 재사용, 재설계 0) · PRIORITY=LAUNCH_REQUIRED · PRIORITY_AUTHORITY=FOUNDER_EXPLICIT · RISK=HIGH · DEPENDS_ON=A-PRODUCT-006(HARD)"
    status: pending
  - id: a-product-008
    content: "[A-PRODUCT-008] Multi-source Opportunity Creation · PRIORITY=LAUNCH_BLOCKER · PRIORITY_AUTHORITY=FOUNDER_EXPLICIT · RISK=HIGH · DEPENDS_ON=A-PRODUCT-007(HARD)"
    status: pending
  - id: a-data-002
    content: "[A-DATA-002] Opportunity Reprice/Freshness(완료 슬라이스 재사용, 신규 formula 없음) · STATUS=COMPLETED · RISK=MEDIUM · evidence=services/api-nest/src/opportunities/opportunity-reprice.service.ts"
    status: completed
isProject: false
---

> 

```text
> classification = CURRENT_ACTIVE_TRACK
> CURRENT_ACTIVE_PLAN = YES
> TRACK = A (PRODUCT / DATA CORE)
> 

```
>
> Track 내부 todo는 위→아래 순서를 권장하되(File-Serial은 트랙 **내부**에만 적용), `DEPENDS_ON` 열의
> `SOFT`/`PARALLEL_SAFE` 항목은 병렬 진행 가능. `HARD`만 진짜 선행조건이다.

# Track A — Product / Data Core

## Goal

```text
UNIVERSAL MATCHING CORE + GENERIC PRODUCT PROFILE + CATEGORY-SPECIFIC PLUGINS
```

카드/시계/가방 4종 전용 구조가 아니다. 실제 글로벌 source에서 수익 기회를 자동 탐색 →
same-product 판단 → 실행 가능한 가격/조건 확인 → Opportunity 생성까지의 데이터 백본을 소유한다.

## Current truth (evidence-based, 2026-08-20 재확인)

| 항목 | 상태 | Evidence |
|---|---|---|
| SourceObservation foundation | PASS | `services/market-intelligence/src/source-observation/**` |
| SourceObservation durable(local) | VERIFIED | `governance/global-product/source-observation-runtime.v1.json` `persistence.OBSERVATION_DB_RUNTIME=PASS` |
| Identity Matching V1 | PASS | `governance/global-product/identity-matching.v1.json` |
| Identity Matching V2 + 실제 cross-source 1쌍 | PASS | `governance/global-product/identity-matching.v2.json`, `tooling/verify/canonical-product.cjs`(`proveLivePair`, TCG 113669/eBay 377416817781 pinned) |
| CanonicalProduct+PD durable(local) | VERIFIED | `canonical-product.v2.json` `persistence.CANONICAL_PRODUCT_DB_RUNTIME=PASS`(2026-08-20 재실측 — 이전 조회 `NOT_IMPLEMENTED`에서 갱신 확인) |
| CanonicalProductSourceLink durable(local) | VERIFIED | 동일 파일 `CANONICAL_PRODUCT_SOURCE_LINK_DB_RUNTIME=PASS` |
| MatchResult durable | VERIFIED(local) | `tooling/verify/match-result-durable-persistence.cjs` PASS · production 미적용 |
| Generic Product Profile(범용) | NOT_IMPLEMENTED | `tooling/verify/canonical-product.cjs`가 `GENERIC_PRODUCT_PROFILE_NOT_IMPLEMENTED`를 명시적으로 요구 |
| Candidate Generation | PASS(in-process) | `governance/global-product/candidate-generation.v1.json` · `identity-matching.v2.json.layers.candidateGeneration=IN_PROCESS_MEMORY` · matcher/canonical PIPELINE는 NOT_IMPLEMENTED 유지 |
| Listing/Variant Compatibility | PASS(in-process) | `governance/global-product/listing-variant-compatibility.v1.json` · `canonical-product.v2.json` boundaries · matcher/candidate PIPELINE는 NOT_IMPLEMENTED 유지 |
| Production 적용 | NOT_IMPLEMENTED / NOT_VERIFIED | Supabase `list_tables` 실측 — `canonical_products`/`source_observations`/`match_results` 테이블 원격 없음 |

```text
LOCAL VERIFIED != PRODUCTION DEPLOYED
```

Production 적용은 이 Track이 소유하지 않는다 — **Track F**(별도 승인 슬라이스, `F-REL-001`)로 이동.

## MatchResult ↔ Generic Product Profile 순서 (모순 해소 기록)

```text
DEFAULT_EXECUTION_ORDER = MATCH_RESULT_FIRST
HARD_DEPENDENCY_ON_MATCH_RESULT_BEFORE_GENERIC_PROFILE = NOT_PROVEN
DEPENDENCY(MatchResult durable → Generic Product Profile) STRENGTH = SOFT
```

근거: `canonical-product.v2.json`의 `persistence` 블록은 `CANONICAL_PRODUCT_DB_RUNTIME` ·
`CANONICAL_PRODUCT_SOURCE_LINK_DB_RUNTIME` · `MATCH_RESULT_DURABLE_PERSISTENCE`를 형제 필드로 묶어
"하나의 Identity/Matching Persistence 완성 단위"로 설계했다(앞 2개가 방금 PASS로 갱신되고 마지막
1개만 남은 실측이 이를 증명). Generic Product Profile은 CanonicalProduct 스키마의
`categoryProfile` 필드에 이미 직결된, 성격이 다른(매칭 로직 폭 확장) 작업이다. **architecture 법칙으로
잠그지 않는다** — `A-MATCH-003`을 먼저 끝내는 것이 자연스러운 세션 연속성(SOFT)일 뿐, `A-PRODUCT-003`이
그것 없이 시작 불가능한 것은 아니다.

## Opportunity boundary invariant (재설계 금지 대상)

```text
MATCH != OPPORTUNITY
CanonicalProduct != Listing
observed price != executable price
stale price != current price
```

Money/FX owner(`fx_snapshots`·`pricing-formula.cjs`·`fx-snapshot-formula.cjs`)는 `PROTECTED_BASELINE` —
`A-PRODUCT-007`은 이 owner를 **재사용**하는 wiring 작업이며 새 formula를 만들지 않는다.

## Generic Product Profile — 범용 필드/카테고리 (Founder가 언제든 확장)

```text
GENERIC 후보 필드 = brand · manufacturer · model · product name · category · GTIN · UPC/EAN ·
  MPN · variant · color · size · capacity · condition · structured attributes · images

현재 지원 profile(mvp, PERMANENT LIST 아님) = sneakers · trading_card · watch · luxury_bag
deferred(현재 evidence 기준, Founder 변경 가능) = electronics · general_goods
```

`categoryProfiles.mvp`/`deferred`는 `identity-matching.v2.json`의 현재 상태 기록일 뿐이며,
Founder가 이후 언제든 카테고리를 추가/재정렬할 수 있다(`FOUNDER_CAN_CHANGE_LATER`).

## Tasks

| TASK_ID | TITLE | REQUIREMENT | SOURCE_TRACEABILITY | STATUS | PRIORITY | PRIORITY_AUTHORITY | DEPENDS_ON(STRENGTH) | RISK | PARALLEL_SAFE |
|---|---|---|---|---|---|---|---|---|---|
| A-DATA-001 | SourceObservation durable local | append-only source_observations 로컬 durable 증명 | 신규(§18 orphan) · `ai_profit_os_global_observation_parser_runtime.plan.md`(completed) | COMPLETED/VERIFIED(local) | — | — | — | HIGH | — |
| A-MATCH-001 | Identity Matching V1 | typed identifier fail-closed evidence primitive | 신규(§18 orphan) | COMPLETED | — | — | A-DATA-001(HARD) | HIGH | — |
| A-MATCH-002 | Identity Matching V2 + 실제 페어 | category profile+composite MATCH+최초 real pair | 신규(§18 orphan) | COMPLETED | — | — | A-MATCH-001(HARD) | HIGH | — |
| A-PRODUCT-001 | CanonicalProduct+PD found.+durable | MATCH 이후 내부 SSOT·PD 코드·durable DB(local) | 신규(§18 orphan) · 다른 세션 완료분 | COMPLETED/VERIFIED(local) | — | — | A-MATCH-002(HARD) | HIGH | — |
| A-PRODUCT-002 | SourceLink durable local | canonicalProductSourceLink durable(local) | 신규 · 다른 세션 완료분 | COMPLETED/VERIFIED(local) | — | — | A-PRODUCT-001(HARD) | HIGH | — |
| A-MATCH-003 | MatchResult durable | 매칭 결정/증거 로그 durable persistence | 신규(§18 orphan) · 다른 세션 자체 next-slice 추천 | VERIFIED(local) | TECHNICAL_LAUNCH_REQUIREMENT | TECHNICAL_DEPENDENCY | A-PRODUCT-002(SOFT) | HIGH | NO(같은 세션/파일) |
| A-PRODUCT-003 | Generic Product Profile | 범용 identity architecture + mvp 4종 최소 구현 | 신규(§18 orphan) | READY | LAUNCH_REQUIRED | FOUNDER_EXPLICIT | A-PRODUCT-001(HARD)·A-MATCH-003(SOFT) | HIGH | YES(A-MATCH-003 완료 후 다음 후보, AUTO_START=NO) |
| A-PRODUCT-004 | Candidate Generation | 후보 쌍 탐색(첫 슬라이스) | 신규(§18 orphan) | PASS(in-process) | LAUNCH_REQUIRED | FOUNDER_EXPLICIT | A-PRODUCT-003(SOFT)·A-MATCH-002(HARD) | HIGH | YES |
| A-PRODUCT-005 | Listing/Variant Compatibility | Opportunity 전 필수 게이트 | 신규(§18 orphan) | PASS(in-process) | LAUNCH_REQUIRED | FOUNDER_EXPLICIT | A-PRODUCT-004(HARD) | HIGH | NO |
| A-PRODUCT-006 | Listing Promotion Contract | Listing→Opportunity 승격 계약 | 신규(§18 orphan) | PENDING | LAUNCH_REQUIRED | FOUNDER_EXPLICIT | A-PRODUCT-005(HARD) | HIGH | NO |
| A-PRODUCT-007 | executable price/avail/fees/FX wiring | Money/Engine 기존 owner 재사용 연결 | 신규 · Money/Engine PROTECTED_BASELINE 재사용 | PENDING | LAUNCH_REQUIRED | FOUNDER_EXPLICIT | A-PRODUCT-006(HARD) | HIGH | NO |
| A-PRODUCT-008 | Multi-source Opportunity Creation | 실제 신규 파이프라인 기반 Opportunity 발행 | 신규(§18 orphan) | PENDING | **LAUNCH_BLOCKER** | FOUNDER_EXPLICIT | A-PRODUCT-007(HARD) | HIGH | NO |
| A-DATA-002 | Opportunity Reprice/Freshness | 재사용(신규 formula 없음) | `ai_profit_os_opportunity_reprice_freshness.plan.md`(completed) | COMPLETED | — | — | A-PRODUCT-008 산출물 소비(HARD) | MEDIUM | YES |

## Owner / Evidence / Founder approval / Production impact

| TASK_ID | OWNER | EVIDENCE | FOUNDER_APPROVAL_REQUIRED | PRODUCTION_IMPACT | NOTES |
|---|---|---|---|---|---|
| A-DATA-001 | services/market-intelligence | source-observation-runtime.v1.json | NO | 없음(local only) | — |
| A-MATCH-001 | services/market-intelligence | identity-matching.v1.json | NO | 없음 | 재오픈 금지(메커니즘) |
| A-MATCH-002 | services/market-intelligence | identity-matching.v2.json | NO | 없음 | 재오픈 금지(메커니즘), 카테고리 확장은 자유 |
| A-PRODUCT-001 | services/market-intelligence | canonical-product.v2.json | NO | 없음(local only) | 다른 세션이 방금 완료 — 개입하지 않음 |
| A-PRODUCT-002 | services/market-intelligence | canonical-product.v2.json | NO | 없음 | 상동 |
| A-MATCH-003 | services/market-intelligence | match-result-durable-persistence.cjs · identity-matching.v2.json | NO | 없음(local only) | VERIFIED(local) · production 미적용 |
| A-PRODUCT-003 | services/market-intelligence | identity-matching.v2.json categoryProfiles | NO(기술 결정) | 없음 | 카테고리 목록은 Founder가 언제든 변경 |
| A-PRODUCT-004 | services/market-intelligence | candidate-generation.v1.json · tooling/verify/candidate-generation.cjs | NO | 없음(local in-process) | candidate≠MATCH · durable/production 0 |
| A-PRODUCT-005 | services/market-intelligence | listing-variant-compatibility.v1.json · canonical-product.v2.json boundaries | NO | 없음(local in-process) | SAME_VARIANT≠CP · samePhysicalItem 0 · durable/production 0 |
| A-PRODUCT-006 | services/market-intelligence + api-nest | canonical-product.v2.json pipelineAfterMatch | NO | 없음(local) | Listing 승격 = 이후 Opportunity 생성 전제 |
| A-PRODUCT-007 | api-nest opportunities | 기존 pricing-formula.cjs/fx-snapshot-formula.cjs | NO(재사용, 재설계 아님) | 없음(local) | Money/FX owner 재설계 금지 |
| A-PRODUCT-008 | api-nest opportunities | 신규 Opportunity row | NO | **있음**(실제 Opportunity 생성 로직) | production 반영은 Track F 승인 후 |
| A-DATA-002 | api-nest opportunities | opportunity-reprice.service.ts | NO | 기존 완료분 재사용 | — |

## Parallel safety

```text
Track A ↔ Track B/C/D/E = PARALLEL_SAFE (다른 파일/도메인)
Track A ↔ Track F(production migration 적용) = NOT_PARALLEL_SAFE (같은 supabase/migrations owner)
Track A 내부 = 위 표 DEPENDS_ON(STRENGTH) 열 그대로 — SOFT/PARALLEL_SAFE는 동시 진행 허용
```

## Risk-based verification

```text
HIGH(A-DATA-001~A-PRODUCT-008 전부) → strong verifier + negative test + runtime proof 필수
  (기존 tooling/verify/identity-matching-v1.cjs·-v2.cjs·canonical-product.cjs·
   source-observation-*.cjs 패턴을 확장 재사용 — 새 인증 ladder 발명 금지)
MEDIUM(A-DATA-002) → 기존 verify:opportunity-scan-surface 등 bounded 재사용
```
