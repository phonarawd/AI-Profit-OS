---
name: "PUTDUK Current Master — Index"
overview: "살아있는 실행 인덱스. 13개 legacy plan(00~06+launch+4 post-legacy slice)과 최신 runtime evidence를 하나도 잃지 않고 Track A~G로 재편성. 이 파일은 dashboard/pointer 역할만 하며 todo 본문을 복제하지 않는다. 상세 task는 각 Track 파일 소유. 4개 선행 audit(FULL_RECONCILIATION_AUDIT · CORRECTION_ADDENDUM · FOUNDER_REQUIREMENT_PRESERVATION_AND_FLEXIBILITY_AUDIT · FINAL_PRE_MASTER_NORMALIZATION)의 결론을 authority input으로 승계."
todos:
  - id: track-a-product-data-core
    content: "[Track A] Product/Data Core · SourceObservation+Identity V1/V2+CanonicalProduct+MatchResult durable local = VERIFIED · Generic Product Profile = READY candidate(AUTO_START=NO) · Candidate~Multi-source Opportunity = PENDING · 상세=PUTDUK_CURRENT_MASTER_TRACK_A_product_data_core.plan.md"
    status: pending
  - id: track-b-user-profit-loop
    content: "[Track B] User Profit Loop · CLOSED 2026-08-20 · B-LOOP-001~002 + FEED-001 + WALLET-001~003 PASS · web Wallet 8면 PendingFigma는 CUX-007 · 상세=PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md"
    status: completed
  - id: track-c-acquisition-account-trust
    content: "[Track C] Acquisition/Account/Trust · Kakao OAuth 재검증 필요 · Account Hub는 CONSUMER_UX_ARCHITECTURE 기준 재스코프 · 상세=PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md"
    status: pending
  - id: track-d-admin-control-plane
    content: "[Track D] Admin Control Plane · admin-control-plane.v1.json(FOUNDER_REQUIREMENTS_LOCK) SUPERSET 구현 0 · apps/admin 20 route 부분 존재 · RBAC/Audit/Kill-Switch=TECHNICAL_LAUNCH_REQUIREMENT · 상세=PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md"
    status: pending
  - id: track-e-pwa
    content: "[Track E] PWA · manifest 0건(0% 구현) · 원 plan 우선순위 복원 완료(4건 LAUNCH_REQUIRED로 복원, store-bridge 2건만 원래도 v2/Phase2) · 상세=PUTDUK_CURRENT_MASTER_TRACK_E_pwa.plan.md"
    status: pending
  - id: track-f-production-infra
    content: "[Track F] Production/Infra · production migration 미적용(로컬 proof만) · production 활성화는 별도 승인 슬라이스 · 상세=PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md"
    status: pending
  - id: track-g-growth
    content: "[Track G] Growth · Marketing/CAPI 6건 원 우선순위 복원(IMPORTANT_POST_CORE) · Ads 자동화 5건은 원래도 Phase2(자기명시) · 상세=PUTDUK_CURRENT_MASTER_TRACK_G_growth.plan.md"
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


> **CURRENT MASTER AUTHORITY (2026-08-20)**
>
> ```text
> classification = CURRENT_COORDINATION_TRUTH
> CURRENT_ACTIVE_PLAN = NO  (이 파일은 INDEX — 실행 큐가 아님. 실행 큐는 각 Track 파일)
> ROLE = DASHBOARD / POINTER / DEPENDENCY_MAP / FOUNDER_AUTHORITY_SUMMARY
> TRACK_SET_FIXED_FOREVER = NO
> ```
>
> **이 문서는 헌법이 아니다.** Founder는 언제든 기능 추가·삭제·변경·우선순위 변경·architecture 교체·
> LOCKED 영역 REOPEN·Track 추가/병합을 할 수 있다. 이 문서의 역할은 "지금 팀/AI가 따라야 할
> 가장 최신 좌표"이며, 새 Founder 결정이 있으면 즉시 갱신된다.
>
> ```text
> LATEST FOUNDER DECISION > CURRENT MASTER > OLDER MASTER > LEGACY PLAN > GPT/Cursor RECOMMENDATION
> ```

# PUTDUK Current Master — Index

## 0. Authority input (읽기 전용 승계, 재감사 없음)

이 Current Master는 다음 4개 완료된 read-only audit의 결론을 그대로 승계한다(전문 재인용 금지, pointer만):

| Audit | 핵심 승계 내용 |
|---|---|
| `PUTDUK_MASTER_PLAN_FULL_RECONCILIATION_AUDIT` | 13 legacy plan inventory · 229 todo(169 completed+60 pending) 전수 reconciliation · 8분류(A~H) |
| `PUTDUK_MASTER_PLAN_RECONCILIATION_CORRECTION_ADDENDUM` | Generic Product Profile 복원 · Candidate/Listing/Opportunity ≠ Phase2 · production migration timing 분리 · MATCH != Opportunity 경계 복원 |
| `PUTDUK_FOUNDER_REQUIREMENT_PRESERVATION_AND_FLEXIBILITY_AUDIT` | Founder 요구사항 손실 0 확인 · rigid governance 위험 점검 · requirement traceability matrix |
| `PUTDUK_FINAL_PRE_MASTER_NORMALIZATION` | PWA 4건·Marketing 6건 우선순위 원복 · CanonicalProduct durable 최신 상태 반영 · MatchResult/Generic Profile 순서 모순 해소 |

## 1. Git / Legacy 상태 (파일 생성 시점 재확인)

```text
GIT_HEAD = 0345206ad2e7238658454db5d072c8fbf93dbb37
WORKTREE_DIRTY = YES (다른 세션 파일 포함 — 미변경)
LEGACY_PLAN_FILES = 13 (수정 0 · 삭제 0 · rename 0)
LEGACY_PLAN_HISTORY = PRESERVED
LEGACY_AUTO_EXECUTION = DISABLED (전 13개 동일 · 재확인)
```

## 2. Founder authority (Absolute — 이 문서 최상위 원칙)

```text
FOUNDER_REQUIREMENT_PRESERVATION = ABSOLUTE
FOUNDER_CAN_ADD_FEATURES_ANYTIME = YES
FOUNDER_CAN_CHANGE_PRIORITY_ANYTIME = YES
FOUNDER_CAN_REOPEN_LOCKED_AREAS_ANYTIME = YES
FOUNDER_CAN_CHANGE_ARCHITECTURE_WHEN_JUSTIFIED = YES
SSOT_MEANING = CURRENT_COORDINATION_TRUTH (NOT permanent constitution)
```

## 3. Locked areas (좁은 scope만 — Founder REOPEN 전까지)

| 영역 | 상태 | Reopen 조건 |
|---|---|---|
| Home Desktop | `FOUNDER_APPROVED_LOCKED` (`governance/consumer-home-approval/home-approval-freeze.v1.json`) | Founder 명시 REOPEN |
| Home Mobile | `FOUNDER_APPROVED_LOCKED` (동일 파일) | Founder 명시 REOPEN |
| Money/Ledger invariant | `HARD_INVARIANT`(double-entry·idempotency·잔액 UPDATE 0) | 재설계 아님, 확장만 가능 |
| Identity V1 메커니즘(fail-closed 평가 로직) | `HARD_INVARIANT`(재오픈 금지 = 메커니즘 한정, 카테고리/신호 확장은 자유) | 확장은 Track A에서 상시 가능 |

Home geometry는 다른 페이지에 강제되지 않는다(`home-presentation-freeze.mdc` 그대로 승계).

```text
/profits Desktop  = Founder Review Candidate (Approved=NO, Locked=NO)
/profits Mobile   = NOT_DONE
/profits/[id]     = PENDING (Opportunity Room)
```

## 4. Runtime truth (최신 재확인 — 이 문서 생성 시점)

```text
SOURCE_OBSERVATION_FOUNDATION = PASS
SOURCE_OBSERVATION_DURABLE_LOCAL = VERIFIED
IDENTITY_V1 = PASS
IDENTITY_V2 = PASS
REAL_AUTOMATED_CROSS_SOURCE_MATCH = PASS (TCG 113669 ↔ eBay 377416817781 · trading_card · COMPOSITE_STRONG)
CANONICAL_PRODUCT_FOUNDATION = PASS
PUTDUK_PD_FOUNDATION = PASS
CANONICAL_PRODUCT_PD_DURABLE_LOCAL = VERIFIED
CANONICAL_PRODUCT_SOURCE_LINK_DURABLE_LOCAL = VERIFIED
CANONICAL_PRODUCT_DURABLE_CURRENTLY_IN_PROGRESS = NO

MATCH_RESULT_DURABLE_PERSISTENCE = VERIFIED (local, CURSOR_CREATED_ISOLATED_LOCAL_POSTGRES)
GENERIC_PRODUCT_PROFILE = NOT_IMPLEMENTED   (READY candidate, AUTO_START=NO)
CANDIDATE_GENERATION = NOT_IMPLEMENTED
MULTI_SOURCE_OPPORTUNITY = NOT_IMPLEMENTED

PRODUCTION_OBSERVATION_PERSISTENCE = NOT_IMPLEMENTED
PRODUCTION_CANONICAL_PRODUCT_PERSISTENCE = NOT_IMPLEMENTED
REMOTE_SUPABASE_RUNTIME_VERIFICATION = NOT_VERIFIED
PRODUCTION_CANONICAL_PRODUCT_PG_CLIENT_WIRING = NOT_IMPLEMENTED

LOCAL VERIFIED != PRODUCTION DEPLOYED   (항상 구분 유지)
```

## 5. Current next task

```text
CURRENT_NEXT_TASK = A-PRODUCT-003 (Generic Product Profile) — READY candidate only
CURRENT_NEXT_TASK_STATUS = READY
AUTO_START = NO
PREVIOUS_TASK = A-MATCH-003 (PUTDUK_MATCH_RESULT_DURABLE_PERSISTENCE) = VERIFIED
DEPENDENCY_TO_GENERIC_PROFILE = SOFT   (HARD 아님 — 추측으로 잠그지 않음, Track A 상세 참조)
```

## 6. Track pointers (상세 task는 각 파일 소유 — 중복 없음)

| Track | 파일 | Goal |
|---|---|---|
| A | `PUTDUK_CURRENT_MASTER_TRACK_A_product_data_core.plan.md` | SourceObservation → Identity → CanonicalProduct → MatchResult → Generic Profile → Candidate → Listing → Opportunity |
| B | `PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md` | 실제 참여→매칭→정산→지갑 web 배선 |
| C | `PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md` | 가입/로그인/계정/신뢰 |
| D | `PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md` | Admin Control Plane SUPERSET |
| E | `PUTDUK_CURRENT_MASTER_TRACK_E_pwa.plan.md` | 설치형 웹앱 |
| F | `PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md` | Production 배포/보안/모니터링/E2E |
| G | `PUTDUK_CURRENT_MASTER_TRACK_G_growth.plan.md` | 성장/광고 인프라 |

`TRACK_SET_FIXED_FOREVER = NO`. Founder가 `H`(예: Marketplace/Global Expansion/AI Operations) 등 새 track을 언제든 추가할 수 있다.

## 7. Dependency graph (요약 — 상세는 Track A)

```text
[Track A] SourceObservation/Identity/CanonicalProduct/SourceLink durable  (VERIFIED — local)
   ↓ (같은 persistence 완성 단위 — 밀착 · CanonicalProduct/SourceLink/MatchResult는 governance json 상
      형제 필드로 설계된 하나의 완성 단위)
[Track A] MatchResult durable  (VERIFIED — local)
   ↓ SOFT execution-order relationship
      (HARD_DEPENDENCY_ON_MATCH_RESULT_BEFORE_GENERIC_PROFILE = NOT_PROVEN — 추측으로 HARD 잠그지 않음)
[Track A] Generic Product Profile → Candidate Generation → Listing/Variant Compatibility
   → Listing Promotion Contract → executable price/availability/fees/FX(Money·Engine 재사용)
   → Multi-source Opportunity Creation (LAUNCH_BLOCKER)
   ↓ PARALLEL_SAFE (다른 owner/file)
[Track B] participate 웹 배선 (LAUNCH_BLOCKER) ─────────┐
[Track C] Kakao OAuth 재검증 ─────────────────────────────┤ 서로 PARALLEL_SAFE
[Track D] Admin RBAC+Audit+Kill Switch(최소셋) ───────────┤ (다른 파일/도메인)
[Track E] PWA manifest ───────────────────────────────────┘
   ↓ (각 트랙 완료 후)
[Track F] production migration 적용(별도 승인 슬라이스) → 릴리스 인증(Core) → Production E2E
   ↓ (launch 이후)
[Track G] Growth/Ads (각 task의 원 plan priority/authority 적용 — G-GROWTH-001~007=IMPORTANT_POST_CORE,
   G-GROWTH-008~012만 explicit PHASE2. "나머지 전부 Phase2"로 일괄 서술하지 않음 — Track G 파일 참조)
```

`Track A ↔ Track F`(같은 `supabase/migrations/**` owner)만 `NOT_PARALLEL_SAFE` — 나머지는 기본적으로 병렬 가능.

## 8. Legacy traceability (그룹 단위 — 169건 재조사 없음)

```text
PENDING_60_INDIVIDUAL_RECONCILIATION = PASS  (전수 개별 매핑 → 각 Track 파일 legacy_mapping 컬럼)
COMPLETED_169_GROUP_RECONCILIATION = PASS    (plan/그룹 단위, FULL_RECONCILIATION_AUDIT Part C 참조)
COMPLETED_169_INDIVIDUAL_EVIDENCE_MAPPING = NOT_YET_EXPANDED  (불필요한 bureaucracy 방지 — 필요 시 확장)
```

**LOCKED/CLOSED — 새 task 불필요(참고만):**

- 03 UI/UX Home visual 10건(`redesign-r1-home-truth-preflight`~`-implementation`) — completed 유지, `SUPERSEDED_WHAT=IMPLEMENTATION`(현재 authority=Home freeze), 재오픈 금지.
- 03 `redesign-r1-home-certification`(pending) — `CLOSED_BY_NEWER_AUTHORITY`(Home freeze-qa PASS가 대체). 신규 task 없음.
- launch archive 5건(pending) — `ARCHIVE_STALE_POINTER`. 00_index 동일 id가 이미 completed. 신규 task 없음.
- 03 `admin-match-strictness-ui`(completed, 자기선언 "ABSORBED→Admin") — Track D `D-ADMIN-006`으로 traceability 연결.

## 9. Governance principles (이 Master 전체에 적용)

```text
MINIMUM GOVERNANCE / MAXIMUM CLARITY / MAXIMUM FOUNDER FLEXIBILITY / MAXIMUM SAFE AI AUTOMATION

HARD RULE 허용 조건 = 돈·DB·보안·race·transaction·identity truth·production safety를 실제로 막는 경우만
FILE-SERIAL = Track 내부 순서에만 적용. Track 간에는 적용하지 않음(Founder의 AI 병렬 활용 의도 보존)
RISK-BASED VERIFICATION = HIGH(strong verifier)/MEDIUM(bounded integration)/LOW(lightweight QA) · 전체 인증 강제 금지
STATUS LIFECYCLE = PLANNED→READY→ACTIVE→BLOCKED→VERIFIED→FOUNDER_APPROVED→LOCKED(→REOPENED 가능)→SUPERSEDED/PHASE2
  VERIFIED != FOUNDER_APPROVED != PRODUCTION_DEPLOYED (항상 구분)
NEW_RIGID_GOVERNANCE_CREATED = NO (새 constitution·visual-contract·승인 관료제 없음)
```

## 10. Zero-loss self-check (파일 생성 후 재확인 — 아래 최종 리포트에 반영)

```text
FOUNDER_REQUIREMENT_LOSS = 0
UNAPPROVED_SCOPE_REDUCTION = 0
UNAPPROVED_FEATURE_REMOVAL = 0
UNAPPROVED_PRIORITY_DEMOTION = 0
UNMAPPED_LEGACY_REQUIREMENT = 0
UNMAPPED_NEW_RUNTIME_REQUIREMENT = 0
DUPLICATE_CURRENT_OWNER = 0
UNRESOLVED_REQUIREMENT_CONFLICT = 0
```
