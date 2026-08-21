# Plan Authority Matrix

> 인덱스. 9개 플랜 본문을 복제하지 않는다.  
> 실측 `status: pending` 개수 = 2026-08-18 workspace YAML · 2026-08-19 재실측 동일.  
> 전 9파일: `AUTO_EXECUTION = DISABLED`.  
> 레거시 pending을 completed로 바꾸지 않음 (`PENDING_STATUS_FALSIFIED = NO`).

```text
LEGACY_PLAN_COUNT = 9
LEGACY_PLAN_AUTO_EXECUTION = 0
LEGACY_PLAN_CONSUMER_PRESENTATION_AUTHORITY = 0
LEGACY_LAUNCH_AUTO_EXECUTION = 0
FUTURE_ACTIVE_PLAN_SYSTEM = PRESERVED
PENDING_STATUS_FALSIFIED = NO
```

미래 실행 허용 조건 (이 9파일이 아님):

```text
Founder explicit approval
AND
file contains CURRENT_ACTIVE_PLAN = YES
AND
not one of the 9 hashed legacy files below
```

---

## 00 Index

| 필드 | 값 |
|------|-----|
| file | `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md` |
| historical role | 플랫폼 재설계 인덱스 · 게이트 · ADR 교차 |
| current classification | `FOUNDER_INTENT_INDEX` |
| pending count | **0** |
| auto execution | `DISABLED` |
| Consumer presentation authority | `NO` |
| Business/reference value | HIGH — 스택·Money/Engine 교차·거버넌스 이력 |
| runtime revalidation | Index 본문의 “현재/다음” 실행 큐는 이력. runtime = 코드 |
| replacement/current owner | 본 라이브러리 + 미래 CURRENT ACTIVE 플랜 |

승계(본문 삭제 없음): `00~06 실행 SSOT` · Light+Purple · 고정 5탭 · Visual Master · 구 Home 시각 권위.

---

## 01 Money

| 필드 | 값 |
|------|-----|
| file | `.cursor/plans/ai_profit_os_01_money_c3d4e5f6.plan.md` |
| historical role | USDT 원장 · 입출금 · KYC 게이트 · referral |
| current classification | `HIGH_VALUE_BUSINESS_REFERENCE` |
| pending count | **0** |
| auto execution | `DISABLED` |
| Consumer presentation authority | `NO` |
| Business/reference value | HIGH — ledger / PG-free / buckets / idempotency |
| runtime revalidation | `CURRENT_RUNTIME_WINS` — 수수료·minHolding·clawback 등 수치는 runtime 재검증 |
| replacement/current owner | `services/api-nest` + `supabase` + Money verify |

보존 의도: USDT ledger truth · KRW projection · double-entry · idempotency · PG-free · principal/profit/locked · Money invariants · referral 보상 개념.

---

## 02 Engine

| 필드 | 값 |
|------|-----|
| file | `.cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md` |
| historical role | 기회 발견 · 참여 · 매칭 · 정산 · AI 추상 |
| current classification | `HIGH_VALUE_ENGINE_REFERENCE` |
| pending count | **0** |
| auto execution | `DISABLED` |
| Consumer presentation authority | `NO` |
| Business/reference value | HIGH — matching / settlement / required capital / AI Fact |
| runtime revalidation | 타이밍·밴드·provider 선택 = runtime. 타이머 연출·구 매칭 시각 시퀀스 ≠ UI 권위 |
| replacement/current owner | `services/engine-rust` + Engine verify |

보존: opportunity discovery · required capital · eligibility · participate · matching · settlement · deterministic state · AI abstraction · 글로벌 시장 복잡도 은닉.

---

## 02.5 Engine Acceptance QA

| 필드 | 값 |
|------|-----|
| file | `.cursor/plans/ai_profit_os_02_5_engine_acceptance_qa_fd1cd7cc.plan.md` |
| historical role | Pre-UI engine acceptance 증거 |
| current classification | `HISTORICAL_ACCEPTANCE_EVIDENCE` |
| pending count | **0** |
| auto execution | `DISABLED` |
| Consumer presentation authority | `NO` |
| Business/reference value | MEDIUM — QA0~QA9 증거 경로 |
| runtime revalidation | `ENGINE_ACCEPTED_FOR_UI` / `UI_UX_ENTRY_GATE=OPEN` = **이력 증거만**. 현재 runtime 수락을 함의하지 않음 |
| replacement/current owner | `governance/engine-acceptance/` + `verify:engine-acceptance` (재실행 ≠ 03 UI 자동 착수) |

---

## 03 UI/UX

| 필드 | 값 |
|------|-----|
| file | `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| historical role | Consumer UX · Home · Canon · Visual Master 큐 |
| current classification | `SUPERSEDED_CONSUMER_UX_REFERENCE` |
| pending count | **14** (기대 14 · 실측 14) |
| auto execution | `DISABLED` |
| Consumer presentation authority | `NO` |
| Business/reference value | LOW for presentation · 일부 copy/legal/trust 의도만 추출 |
| runtime revalidation | pending를 completed로 바꾸지 않음 |
| replacement/current owner | 미래 `NEW CONSUMER UX ARCHITECTURE` (Phase 3 · Founder GO 후) |

---

## 04 Admin

| 필드 | 값 |
|------|-----|
| file | `.cursor/plans/ai_profit_os_04_admin_e5f6a7b8.plan.md` |
| historical role | Founder/Admin ops · 12모듈 · growth |
| current classification | `ADMIN_FOUNDER_INTENT_REFERENCE` |
| pending count | **17** (기대 17 · 실측 17) |
| auto execution | `DISABLED` |
| Consumer presentation authority | `NO` |
| Business/reference value | HIGH — Admin runtime 보존 · Organic Hybrid 생산 권위는 폐기 |
| runtime revalidation | Admin 런타임 코드가 현재 진실. 본 플랜 pending ≠ 자동 착수 |
| replacement/current owner | `apps/admin` 런타임 + `governance/admin/admin-control-plane.v1.json` + 미래 CURRENT ACTIVE Admin 플랜 |

Admin 재설계·KYB 삭제는 본 Phase 범위 밖.
04 pending 17을 본 lock으로 completed 위조하지 않음.
Control Plane runtime 구현 ≠ 본 매트릭스 행.

---

## 05 PWA

| 필드 | 값 |
|------|-----|
| file | `.cursor/plans/ai_profit_os_05_pwa_f6a7b8c9.plan.md` |
| historical role | install · push · WebAuthn · store bridge |
| current classification | `FUTURE_PWA_INTENT_REFERENCE` |
| pending count | **7** (기대 7 · 실측 7) |
| auto execution | `DISABLED` |
| Consumer presentation authority | `NO` |
| Business/reference value | HIGH for capability intent · LOW for Lux/icon/Brand 시각 |
| runtime revalidation | theme/icon/Light manifest = SUPERSEDED. install/manifest/update/push/WebAuthn/store/OpenNext 의도 보존 |
| replacement/current owner | 미래 CURRENT ACTIVE PWA 플랜 + 승인 Figma 아이콘 |

---

## 06 Infra

| 필드 | 값 |
|------|-----|
| file | `.cursor/plans/ai_profit_os_06_infra_a7b8c9d0.plan.md` |
| historical role | Cloudflare/OpenNext · attribution · ads ops |
| current classification | `INFRA_GROWTH_REFERENCE` |
| pending count | **17** (기대 17 · 실측 17) |
| auto execution | `DISABLED` |
| Consumer presentation authority | `NO` |
| Business/reference value | HIGH — hosting/observability/attribution/SEO/release |
| runtime revalidation | `CURRENT_RUNTIME_REVALIDATION_REQUIRED` — provider·auth·CAPI 선택값은 runtime |
| replacement/current owner | `infra/` + `workers/` + 미래 CURRENT ACTIVE Infra 플랜 |

보존: Cloudflare/OpenNext · observability · attribution · analytics · UTM · deep links · referral · SEO · OG · release/rollback.

---

## Old Launch Plan

| 필드 | 값 |
|------|-----|
| file | `.cursor/plans/ai_profit_os_launch_54c1261e.plan.md` |
| historical role | 통합 아카이브 pointer |
| current classification | `ARCHIVE_ONLY` |
| pending count | **5** (기대 5 · 실측 5) |
| auto execution | `DISABLED` |
| Consumer presentation authority | `NO` |
| Business/reference value | ARCHIVE — “ACTIVE=00~06” 문구는 승계됨 |
| runtime revalidation | n/a |
| replacement/current owner | 본 라이브러리. launch로 구현 착수 금지 |

이력 pending 5를 completed로 바꾸지 않음.

---

## Home presentation (2026-08-19)

| 필드 | 값 |
|------|-----|
| file | `governance/consumer-home-approval/home-approval-freeze.v1.json` |
| classification | `FOUNDER_APPROVED_HOME_LOCK` |
| 03 `redesign-r1-home-certification` | **pending 유지** (이력 · 구 Visual Master/H11 경로 ≠ Home freeze) |
| other Consumer pages | 승인 Figma 없음 → placeholder only |

Home freeze ≠ 03 R1 certification 완료. 03 pending 14를 completed로 바꾸지 않음.

---

## Admin Control Plane (2026-08-19)

| 필드 | 값 |
|------|-----|
| file | `governance/admin/admin-control-plane.v1.json` |
| plan pointer | 04 `§9.11` |
| classification | `FOUNDER_REQUIREMENTS_LOCK` |
| runtime | `NOT_IMPLEMENTED` |
| 04 pending | **17 유지** (위조 0 · 신규 todo 0) |
| CURRENT_ACTIVE | `NO` |
| Consumer presentation | `NO` |

```text
PUTDUK Admin = BUSINESS OPERATING CONTROL PLANE
ADMIN_CONTROL_PLANE_RUNTIME = 0
LEGACY_04_PENDING_FALSIFIED = NO
```

기존 12모듈 IA · §36 · §9.8.9 · 3-mode · 한국어 RBAC는 유지.
본 lock은 미래 CURRENT ACTIVE Admin 구현의 SUPERSET.
구현 착수 = Founder 승인 + `CURRENT_ACTIVE_PLAN = YES` Admin 플랜. 레거시 04 File-Serial 자동 큐 아님.

---

## Post-legacy slices (2026-08-19)

레거시 9파일이 아님. File-Serial은 `CURRENT_ACTIVE_PLAN = YES`일 때만. 완료 슬라이스는 `NO`.

| file | classification | pending | CURRENT_ACTIVE |
|------|----------------|---------|----------------|
| `ai_profit_os_opportunity_reprice_freshness.plan.md` | `COMPLETED_SLICE` | **0** | `NO` |
| `ai_profit_os_global_observation_parser_runtime.plan.md` | `COMPLETED_SLICE` | **0** | `NO` |
| `ai_profit_os_ebay_source_observation_bridge.plan.md` | `COMPLETED_SLICE` | **0** | `NO` |
| `ai_profit_os_global_observation_chrono24.plan.md` | `COMPLETED_SLICE` | **0** | `NO` |

```text
CURRENT_ACTIVE_PLAN_YES_COUNT = 0
```

---

## Future plan system (보존)

| 도구 | 상태 |
|------|------|
| 워크스페이스 `.cursor/plans/*.plan.md` 편집 SSOT | PRESERVED |
| `pnpm cursor:sync-plans` hardlink | PRESERVED |
| `pnpm verify:plans-ssot` | PRESERVED · integrity(frontmatter/`CURRENT_ACTIVE`/legacy pending) |
| Cursor Plan UI | PRESERVED |
| 레거시 9파일 File-Serial 자동 큐 | **DISABLED** |
