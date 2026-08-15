# Peotteok Home — Contract Sync (H6.5 · ADR-018 · H4↔H5↔H6 정합성 검증)

| | |
|---|---|
| Status | **SYNC COMPLETE — CONTRACT READY FOR H7 HANDOFF** (Runtime/CSS/Asset/API/DB 변경 **0**) |
| Date | 2026-08-16 |
| Todo | `redesign-r1-home-contract-sync` (H6.5) — `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| Authority class | **Sync Authority** — H4(Functional)·H5(Visual)·H6(Implementation) 세 Authority를 재정의하지 않고 정합성만 검증·기록한다. 충돌 발견 시 ADR-018 §3 사다리(Functional wins) 그대로 적용 |
| Governs | H4/H5/H6 3문서 간 모순 검출·해소, H7 Entry Gate 최종 확정, Asset Part B handoff 명세. **새 Functional/Visual/Implementation 판단을 창작하지 않는다** — 이미 3문서에 있는 판단을 대조·확정만 |
| Runtime code changed by this document | **0** |
| Inputs | `peotteok-home-product-contract.v1.md`(H4) · `peotteok-home-visual-contract.v2.md`(H5) · `peotteok-home-implementation-contract.v2.md`(H6) · `ADR-018-peotteok-visual-master-reset.md` · `peotteok-home-visual-master-intake.v1.md`(H1) · 실제 코드 재확인(§1) |
| Next step | Asset Production Part B(`redesign-r1-home-visual-asset-production`) → H7(`redesign-r1-home-implementation`). 본 문서는 둘 중 어느 것도 착수를 승인하지 않는다(§22) |

---

## 0. 이 문서가 하는 일 / 하지 않는 일

```text
한다:   H4/H5/H6 3문서를 실제로 재대조하여 모순 0을 확인하거나 발견된 모순을 해소한다.
        KRW/USDT·Actual Profit·Average Return·Processing Duration 등 미해결 항목을
        SYNCED_READY / PRE_H7_PREREQUISITE / ASSET_PART_B_REQUIRED / DEFERRED_BY_CONTRACT /
        REMOVE_FROM_H7_SCOPE / BLOCKED 6분류 중 하나로 확정한다.
        H7_CONTRACT_READY 와 H7_RUNTIME_START_ALLOWED 를 분리 판정한다.

하지 않는다: React/CSS 구현 · 컴포넌트 작성 · 자산 생성/이미지 생성 · DB 마이그레이션 ·
            Money/FX/서버 집계 구현 · Actual Profit API 구현 · carousel 구현 · 신규 mutation/스케줄러 ·
            H4/H5/H6가 이미 확정한 Functional/Visual 판단의 재창작 · H7 착수
```

---

## 1. 재확인한 실제 파일 (추측 0)

| 파일 | 확인한 것 |
|---|---|
| `apps/web/app/HomePageClient.tsx` | `principalKrwApprox`를 `HomeExperience`에 전달하지 **않음**(props에서 아예 누락) · `itemCount` 미추출 확인 |
| `packages/ui/components/home/HomeExperience.tsx` | `principalKrwApprox = null` 기본값으로만 `HomePrincipalRail`에 전달 · `<HomeHero />`가 **현재도 렌더 중**(H6 계획상 REMOVE_FROM_RUNTIME 대상이나 아직 미실행 — 정상, H7 전) · `railProgress` scan/confirm/progress는 항상 `null` |
| `packages/ui/components/opportunity/HomePrincipalRail.tsx` | 2-article(원금/오늘가능수익) + KRW 분기 로직 실재 · actual-profit/withdraw 슬롯 **없음** · `factState: ready\|guest\|absent\|loading` 패턴 확인 |
| `packages/ui/components/opportunity/BalanceAwareHome.tsx` | `scanHero`/`peotteokLine`/`CategoryFilterChips`/sticky CTA 전부 확인 · `hero=affordable[0]` 로직 확인 |
| `packages/ui/components/home/HomeRightRail.tsx` | COUNT 4-cell(`scan/confirm/progress/settle`) 확인 · scan/confirm/progress는 `HomeExperience`가 항상 `null` 전달 → `countCell()`이 항상 `absent`로 렌더(현재 **가짜 데이터 0**, 정직한 빈 상태) |
| `services/api-nest/src/wallet/home-money-read.map.ts` | `FORBIDDEN_RESPONSE_KEYS`에 `profitUsdt` 포함 + `assertHomeMoneyReadForbiddenKeys()` throw 확인 |
| `services/api-nest/src/opportunities/fx-snapshot.service.ts` | "fail closed rather than fabricate a KRW display rate" 주석 원문 확인 · 이 서비스는 **기회 가격 카드용 marketplace 정규화 + legacy KRW-approx display leg**이며 Home 원금 KRW 환산에는 미연결 확인 |
| `packages/sdk/src/home-read-model/types.ts` | `HomeReadModelResponse`에 `principalKrwApprox` 필드 **자체가 없음**(타입 전체 재확인) · `opportunity.itemCount: number` 존재 확인 |
| `apps/web/lib/opportunity-card-map.ts` | `estimatedDurationSec` 미매핑 확인(pass-through 매퍼) |
| `services/api-nest/src/opportunities/opportunities.user.service.ts` + `services/market-intelligence/src/capital-provider-projection.cjs` | `estimatedDurationSec`가 `USER_SURFACE_STRIP_KEYS`(블록리스트, `executionPlatforms`/`expectedSellDays`만 포함)에 **없어** 실제로 유저 응답에 도달함을 메커니즘 레벨로 확인(`projectCapitalProviderUserSurface`가 `{...card}` 복사 후 strip-list만 delete하는 블록리스트 방식) |
| `packages/ui/canon/surfaces/home-visual-v2.wire.json` | `factSurface.money=["principalUsdt","todayPossibleProfitUsdt"]` · `factSurface.forbiddenWithoutContract`에 `cumulativeProfitUsdt`·`scan_count`·`confirm_count`·`progress_count` 포함 확인(ADR-018 §8상 계속 유효한 functional lock) |
| `packages/ui/canon/surfaces/home-principal-slots.wire.json` | blocks 4개(`principalBalance`/`balanceKrwOrUsdt`/`ctaDeposit`/`todayPossibleProfit`)뿐 — actual-profit/withdraw block **아직 없음** · `forbidden`에 `fx_recalc_in_ui`/`fake_krw_rate` 확인 |
| `tooling/verify/balance-aware-feed.cjs` | `BalanceAwareHome.tsx` 소스 문자열에 `peotteokLine`/`sectionAffordable`/`sectionNearMiss`/`sectionLockedHigh`/`OpportunityCard` 등 **리터럴 substring 검사**(DOM/런타임 검사 아님) 확인 |
| `tooling/verify/home-live-wire.cjs` | `HomeExperience.tsx`를 읽지 않음(page/HomePageClient만 대상) — §14 정정 사유 |
| `packages/ui/components/shell/AppShellRoot.tsx` | `data-shell-geometry="sidebar-240\|header-64\|rail-352"` 확인 · 레포 전체 grep 결과 이 속성을 **소비하는 CSS/JS/verify 0건**(순수 진단용 문자열, 기능 영향 0 재확인) |
| `packages/ui/components/shell/BottomNav5.tsx` | 인라인 `✦` span(67~76행 상당) 확인 · `BrandMark` import는 `packages/ui/components/home/**` 어디에도 없음(H6 발견 재확인) |
| `apps/web/app/wallet/withdraw/page.tsx` + `packages/sdk/src/wallet/*` | 기존 USDT/KRW 탭 + KYC 게이트 + `mode` 쿼리(기본 `profit`) 이미 구현·`createWithdraw` SDK 존재 확인 — Home 신규 mutation 불필요 재확인 |
| `apps/web/app/me/guide/market-weekly/page.tsx` + `market-weekly-briefing.wire.json` | 라우트 실존 확인 · `forbidden: investment_advice/buy_now_cta/sell_now_cta/guaranteed_profit` 확인(Home teaser 카피가 나중에 이 축을 넘지 않아야 함) |

**결론: H4/H5/H6가 인용한 실측 전부가 실제 코드와 100% 일치한다.** 날조·과장·누락된 실측 없음.

---

## 2. KRW / USDT Sync

```text
A. Founder Visual Requirement   KRW PRIMARY = REQUIRED           (H1 §6 · H4 §4 · H5 §9.1 3문서 일치)
B. Current Runtime Capability   KRW Home binding = NOT READY     (HomeReadModelResponse에 필드 자체 없음, §1 실측)
C. H7 영향                      READY_FOR_IMPLEMENTATION_START,
                                 PREREQUISITE_FOR_VISUAL_CERTIFICATION
```

- USDT secondary는 **이미 정확히 동작**한다(fail-safe, `principalKrwApprox` 부재 시 `HomePrincipalRail`이 자동으로 USDT-primary 렌더). 이것은 결함이 아니라 설계된 폴백이다.
- 그러나 이 폴백이 "USDT-primary로 영구 출시해도 된다"는 뜻은 **아니다**. H4 §4는 KRW-primary를 `FUNCTIONAL_BINDING_REQUIRED`로 명시했고, 이는 서술적 기록(존재하지 않음)일 뿐 "생략 승인"이 아니다. H6 §12/§23이 KRW를 `READY`로 게이트 분류한 것은 **"H7 구현 착수가 지금 당장 깨지지 않는다"**는 의미이며, Founder의 KRW-primary 요구를 해제한 것이 **아니다** — H6.5가 이 구분을 명시적으로 복원한다.

### 최종 판정

```text
KRW_BINDING_REQUIRED_BEFORE_VISUAL_CERTIFICATION
```

- **세 번째 옵션(`EXPLICIT_TEMPORARY_CONTRACT_ALLOWED`) 미채택 사유:** H4/H5/H6 어디에도 "Founder가 USDT-primary 출시를 명시 승인했다"는 문장이 없다. H6 §12의 "H7은 지금 당장 아무것도 깨지지 않는다"는 **구현 착수 가능성**에 대한 Implementation Authority의 판단일 뿐, Visual/Founder 승인의 대체가 아니다.
- **의미:**
  1. H7은 `HomePrincipalRail`의 기존 3-state(`ready`/`guest`/`absent`/`loading`) 패턴을 그대로 사용해 Asset Summary 원금 카드를 **지금 구현 시작**할 수 있다(기존 fail-safe 그대로, 신규 발명 없음).
  2. 이 카드는 `redesign-r1-home-certification`(H11) Visual Lock 승인·Founder visual approval(ADR-018 §11) 단계에서 **KRW-primary가 실제로 표시될 때까지 최종 인증되지 않는다** — USDT-primary 상태로는 Approved Visual Master(§9.1 KRW=primary)와 시각적으로 불일치하기 때문이다.
  3. KRW 배선(서버 `principalKrwApprox` 필드 + `fx-snapshot.service.ts` Home 소비)은 Money-adjacent 별도 L2 변경이며 H7 Home presentation 작업과 **병렬 진행 가능** — 전체 H7을 막지 않는다.
- **클라이언트 임의 환율 계산 재확인:** `home-principal-slots.wire.json forbidden: fx_recalc_in_ui, fake_krw_rate` — 이 두 항목은 그대로 유효하며 H6.5가 해제하지 않는다.

---

## 3. Actual Profit Sync

```text
ACTUAL_PROFIT_VISUAL_SLOT     = APPROVED    (H5 §9.3 · 위계/타이포/위치만 계약, 데이터 미선택)
ACTUAL_PROFIT_RUNTIME_BINDING = UNRESOLVED  (H4 §5 → H5 §9.3/§18 → H6 §11 동일하게 승계, 조용히 해소된 적 없음)
```

### 이중 가드 확인(H4가 실측한 것 + 본 문서가 추가로 대조한 것)

| 가드 | 위치 | 내용 |
|---|---|---|
| Money 런타임 하드가드 | `services/api-nest/src/wallet/home-money-read.map.ts` | `FORBIDDEN_RESPONSE_KEYS`에 `profitUsdt` 포함 → 존재 시 `throw`(§1 실측) |
| Canon wire 시맨틱 가드 | `packages/ui/canon/surfaces/home-visual-v2.wire.json factSurface.forbiddenWithoutContract` | `cumulativeProfitUsdt` 등재(§1 실측) — "계약 없이는 금지"이며, 이 계약을 H4/H5/H6 중 누구도 아직 작성하지 않았다 |

이 두 가드는 **서로 다른 계층(런타임 코드 vs Canon 기능 계약)**이며, 하나만 풀어서는 안 된다. H1(intake) §9가 이미 두 가드를 함께 인지했고(line 197 상당) H4에 해소를 위임했으나, H4는 Money 런타임 가드만 명시적으로 조사했고 Canon wire의 `forbiddenWithoutContract` 해제 절차를 별도로 언급하지 않았다. **본 문서가 이 gap을 명시적으로 봉합한다:** 향후 Founder/Money-owner 결정이 나오면 그 결정은 **두 가드 모두**를 겨냥해야 한다(Money 도메인의 guard 해제 + Canon wire `home-visual-v2.wire.json`에 actual-profit을 `factSurface.money`로 명시 추가하는 L2 변경).

### 시간범위 미확정 재확인

`WalletBuckets.profitUsdt` = 전체 누적(all-time) 출금가능 수익(H4 §5.1, `trades.execution.service.ts` MATCH_SUCCESS 정산 credit 실측 인용) — "오늘"로 범위가 좁혀지지 않는다. Visual Master의 "+₩32,000"이 오늘인지 전체인지는 원본 이미지만으로 확정 불가(H5 §17 VISUAL_ONLY_EXAMPLE 재확인). `/wallet/withdraw` 페이지의 기본 `mode=profit`(§1 실측)은 "출금 가능 수익=profit bucket" 의미를 다시 확인해주지만, 이 역시 "오늘 vs 전체" 질문에는 답하지 않는다.

### 최종 판정

```text
PRE_H7_BINDING_REQUIRED   (데이터/숫자 — Founder/Money-owner 결정 필요, 두 가드 동시 해제 필요)
SYNCED_READY              (슬롯 레이아웃·타이포·위계만 — HomePrincipalRail의 기존 absent 패턴으로 데이터 없이 구현 가능)
```

- 3번째 옵션(`EXISTING_AUTHORITATIVE_FIELD_MATCH_CONFIRMED`)은 **명시적으로 미채택** — name-match만으로 확정하지 않는다는 H4의 원칙을 재확인하며, 근거 없는 3번 선택을 금지한 지시를 따른다.
- "슬롯 레이아웃만 빈 상태로 구현"이 H5 Visual Contract·사용자 UX에 맞는지 검증한 결과: **맞다.** `HomePrincipalRail`은 이미 원금/예상수익 두 article 모두 `ready`/`guest`/`absent`/`loading` 4-state 패턴(실측 확인)을 가지고 있어, actual-profit article을 같은 패턴으로 추가하면 "준비 중" 같은 정직한 absent 표시가 기존 컴포넌트 관용구와 100% 일치한다. 새 UX 패턴 발명이 필요 없다 — 따라서 이 항목을 prerequisite로 올리되(데이터 기준), 슬롯 자체는 H7 Contract 범위에 남긴다.
- 금지 재확인: 0 표시·—·N/A 임의사용·hardcode·estimated를 actual로 사용·principal/profit 합산 — 전부 H4~H6에서 이미 0건이며 본 문서도 발명하지 않는다.

---

## 4. Average Return % Sync

- 서버 aggregate 필드 부재 재확인(그렙 0건, `packages/sdk/src` 전체 · `HomeReadModelResponse`/`OpportunityCardModel` 전체 재확인).
- H1 §4/H5 §2.2가 AI summary 3-stat row(발견한 기회 건수·평균 수익률·평균 처리시간) 중 하나로 이를 **요구**하는 것은 사실이나, H5 §2.2가 이미 명시적 폴백을 계약해 두었다: *"데이터 미도달 시 기존 scanIdle/scanEmpty 카피 상태로 대체(발명 금지)"*.
- 3-stat 중 **1/3만 READY**(itemCount, gap-only)이고 **2/3(평균 수익률·평균 처리시간)는 서버 필드 0**이다. H7은 두 가지 합격 경로 중 하나를 택할 수 있다: (a) 3개 stat이 모두 준비될 때까지 전체 행을 `scanIdle`/`scanEmpty` 대체 카피로 표시, 또는 (b) 각 stat을 `HomePrincipalRail`과 동일한 개별 `absent` 상태로 독립 표시. 둘 다 "가짜 숫자 0" 원칙을 지키므로 H6.5가 하나를 강제하지 않는다 — 단 **평균값을 클라이언트에서 계산·표시하는 세 번째 경로는 계약되지 않는다**(금지 재확인).

### 최종 판정

```text
REQUIRED_AND_SERVER_PREREQUISITE   (평균 수익률 숫자 자체 — 신규 서버 집계 필요, H7_BLOCKER)
```

- `C. REPLACEABLE_BY_EXISTING_AUTHORITATIVE_VALUE`는 **미채택** — H4/H5 어디에도 이를 대체할 기존 authoritative 값이 없다(itemCount는 별개 stat이며 평균 수익률의 대체값이 아니다).
- 클라이언트 평균 계산·카드 임의 평균·`expectedProfit/principal` 임의 계산·샘플 숫자 표시 = 전부 금지 유지, 본 문서가 발명하지 않음.

---

## 5. Processing Duration Sync

| 구분 | 판정 | 근거 |
|---|---|---|
| Individual `estimatedDurationSec`(카드별) | **SYNCED_READY** | Nest 응답에 실도달(§1 메커니즘 확인) · `opportunity-card-map.ts`/`opportunity-types.ts` 매핑 1줄 추가만(백엔드 변경 0) |
| Soft60/Hard90 SLA 방향(분 단위) | **SYNCED_READY** | Engine SLA와 개별 필드 모두 분 단위로 일치(H4 §7 MATCH 재확인) |
| Category-specific 범위(예: 시계 1~3분 vs 카드 1~2분) | **DEFERRED_BY_CONTRACT** | 아래 참고 |

**발견한 sync gap:** H4 §7이 "카테고리별 차등 여부는 H5/H6 전에 Engine 실측 데이터로 재확인 필요"라고 명시적으로 요청했으나, H5·H6 어느 문서도 이 재확인을 실제로 수행하지 않았다(양쪽 다 H4의 `FUNCTIONAL_BINDING_UNRESOLVED` 상태를 그대로 재인용만 함). 본 세션도 Engine DB 실측 조회 권한이 없어 이 gap을 닫을 수 없다 — **닫지 않고 명시적으로 이관한다.**

### 최종 판정

```text
individual duration  → SYNCED_READY
category/section range → DEFERRED_BY_CONTRACT (Engine 실측 데이터 재확인이 먼저 필요 · H7이 카테고리 범위 숫자를 발명하지 않음)
```

H7은 카드별 실제 `estimatedDurationSec` 표시(예: "예상 처리 ~2분")는 구현 가능하나, "시계 1~3분" 같은 카테고리 집계 범위는 실제 카테고리 간 차등이 Engine 데이터로 확인되기 전까지 구현하지 않는다.

---

## 6. Update Slot Sync

H4 §9 후보 3종(asOf/scanIdle/scanEmpty) = H5 §12.1 동일 3종 = H6 §14 동일 3종을 순서화한 폴백 체인. **3문서 완전 일치, 발견된 불일치 0.** 리터럴 "오늘 오후 2:00"은 H1→H4→H5→H6 어디에도 runtime truth로 사용되지 않음(전부 재확인). 신규 scheduler·신규 backend update schedule = 0.

```text
UPDATE_SLOT_CONTRACT = SYNCED
```

---

## 7. Opportunity Data Sync

| 필드 | 판정 | 비고 |
|---|---|---|
| `itemCount` | **SYNCED_READY** | backend 도달, client mapping gap only(§1 재확인) |
| `estimatedDurationSec`(개별) | **SYNCED_READY** | backend 도달, client mapping gap only(§1 메커니즘 재확인) |
| average return(%) 집계 | **BLOCKED**(실데이터) / 카드 자체는 대체 표시로 SYNCED_READY | §4 참고 |
| average processing duration 집계 | **BLOCKED**(실데이터) / 개별값은 SYNCED_READY | §5 참고 |
| featured opportunity 선택(`hero=affordable[0]`) | **SYNCED_READY** | 기존 로직 재사용, 데이터 불필요 |

H7 wiring 가능 항목(itemCount/estimatedDurationSec)과 서버 집계가 필요한 항목(평균 수익률/평균 처리시간)은 **서로 다른 축**이라는 H4/H6의 구분이 정확하며 본 문서가 재확인한다.

---

## 8. Desktop / Mobile Authority Sync

- surfaceId `home-visual-desktop`/`home-visual-mobile` 분리가 H5 전체·H6 §9/§10 전체에서 혼동 없이 유지됨을 재확인(교차 인용 0건 — Desktop 절이 Mobile Master를 참고하거나 반대의 경우 발견되지 않음).
- H6 §17이 명시한 원칙 재확인: `BottomNav5`(Sidebar↔BottomNav 전환)는 **이미 단일 반응형 컴포넌트**이므로 유지 대상이고, 이것과 "Desktop 3-카드 그리드 ↔ Mobile 캐러셀"을 **혼동하지 않는다** — 후자만 별도 프레젠테이션 트리 요구(Safety-C, `display:none` 금지)가 적용된다. 두 원칙이 H6 §17에서 이미 정확히 분리되어 있음을 확인했다.
- Mobile을 Desktop 축소본으로 사용하는 문구·로직 = 0건 확인.

```text
DESKTOP_MOBILE_AUTHORITY_SYNC = CONFLICT_0
```

---

## 9. Mobile Carousel Sync

H1 §5(dot indicator·swipe intent) = H5 §3/§10.2/§14(동일 intent, 정확한 dot 개수/카드 크기만 `PENDING_CALIBRATION_FROM_MASTER`) = H6 §10/§16/§18(NEW PRESENTATION COMPONENT REQUIRED + keyboard/touch/aria/focus/reduced-motion 요구사항 명시). **3문서 일치.** 접근성 요구사항(H6 §18)이 실제로 계약되어 있음을 재확인 — keyboard 화살표/tab, `aria-live`/`role="group"`, dot별 `aria-label`, `prefers-reduced-motion` 분기 전부 문서화됨.

```text
CAROUSEL_CONTRACT = SYNCED_READY (계약만 · 런타임 구현 0 · 본 세션에서도 구현하지 않음)
```

---

## 10. CTA Sync / Duplicate Prevention

실측된 4개 후보(Hero/sticky/discovery-teaser/카드)를 역할 기준으로 재분해하면 **실제 중복 위험은 1곳뿐**이다:

| 역할 | 현재/계획 후보 | 중복 위험 | 해소 |
|---|---|---|---|
| 기회 탐색/이동(Desktop 상단) | 기존 Hero CTA(`#home-opportunity`) **+** 신규 discovery-teaser CTA | **있음** | Hero 자체가 REMOVE_FROM_RUNTIME 대상(H6 §3 #4) — 제거되면 discovery-teaser CTA가 이 역할을 1:1 승계, 중복이 자동 해소됨 |
| 참여(수익 벌기, Desktop) | 카드 내부 `data-action="participate"` | 없음 | Mobile sticky와 뷰포트 배타적(H6 §15 기존 판단 재확인) |
| 참여(수익 벌기, Mobile) | sticky CTA(`home-sticky-cta`) | 없음 | 위와 동일 |
| 입금 | `T.feed.ctaDeposit` → `/wallet/deposit` | 없음 | REUSE |
| 출금(신규) | Asset Summary 내 링크 | 없음(신규 단일 진입점) | REUSE mutation(§11) |
| AI 진입(퍼뜩 채팅) | 없음 | 없음 | **추가하지 않음**(H6 §15 재확인 — Visual Master 미요구) |

### 최종 CTA ownership

```text
PRIMARY(탐색/이동, Desktop)  = discovery-teaser CTA (Hero CTA 역할 승계 · Hero 컴포넌트 REMOVE_FROM_RUNTIME과 동시 처리)
PRIMARY(참여, per-card)      = 기존 OpportunityCard data-action="participate" (REUSE)
PRIMARY(참여, Mobile sticky) = 기존 home-sticky-cta (REUSE · Desktop 카드 CTA와 뷰포트 배타)
SECONDARY(입금)              = 기존 T.feed.ctaDeposit (REUSE)
SECONDARY(출금, 신규 진입점) = 신규 트리거 → 기존 /wallet/withdraw 내비게이션 (REUSE mutation)
SECONDARY(인사이트)          = 신규 트리거 → 기존 /me/guide/market-weekly 내비게이션 (REUSE route)
REMOVE                       = HomeHero 컴포넌트 자체(역할은 위로 승계, 기능 소멸 아님)
NO_ACTION(추가 금지)         = AI 채팅 진입점(Visual Master 미요구)
```

CTA visual duplication = 0(위 표로 확정) · mutation duplication = 0(참여/입금/출금 모두 기존 mutation 재사용, 신규 mutation 0건).

---

## 11. Withdraw UX Sync

H5 §9.4가 Asset Summary 카드 내 출금 CTA를 **명시적으로 요구**함을 재확인(입금 CTA와 대칭 위계). 실제 `/wallet/withdraw/page.tsx` 재확인 결과 currency 탭(USDT/KRW)·KYC 게이트(`useWithdrawKycGate`)·모드 선택(기본 `mode=profit`, Money §49.4 §42 준수)이 이미 완비되어 있어 Home에서 새로 만들 이유가 없다.

```text
presentation = NEW (Asset Summary 카드 내 트리거)
business action = REUSE (/wallet/withdraw 내비게이션 · createWithdraw 기존 mutation)
```

H6 §15의 "인라인 mutation이 아니라 `/wallet/withdraw` 내비게이션 링크로 구현" 권고를 재확인·유지한다(step-up/KYC UI 중복 구현 방지).

---

## 12. Right Rail / CategoryFilter Sync

### 12.1 COUNT grid(Zone A)

`settlementCompletedToday`=COUNT, C01 lock — H4/H5/H6 전부 일치, `home-visual-v2.wire.json forbidden: ledgerTotal_as_usdt` 불변. **SYNCED_READY.**

### 12.2 Zone B 개별 참여 스테퍼 — 발견한 sync gap + 판정

**발견:** H5 §2.3/§18이 "실제 FSM 바인딩은 H4가 이미 FUNCTIONAL_BINDING_REQUIRED로 남겨둔 상태를 그대로 승계"라고 서술하지만, **H4 본문(§3 Money Semantics Matrix, §12 H1 carry-forward 표) 어디에도 "개별 참여 스테퍼"가 등장하지 않는다.** 실제 origin은 **H1** `peotteok-home-visual-master-intake.v1.md` §4(Desktop Visual Intent)·§9(Functional Conflict Matrix, "Right Rail 진행 현황" 행)이다. H4는 이 H1 항목을 §12 carry-forward 표에 포함하지 못했다 — **인용 출처 오류(H5→H4 잘못된 pointer)이며, 판단 내용 자체의 모순은 아니다**(H1의 원판정 FUNCTIONAL_BINDING_REQUIRED를 H4/H5/H6 누구도 반박하지 않았다).

**해소:** 본 문서가 origin을 H1로 정정 기록한다. H4를 소급 수정하지 않는다(내용 모순이 아니라 인용 정밀도 문제이므로 최소수정 원칙상 완결된 H4 본문을 건드릴 필요가 없다 — 아래 Sync Matrix가 정정된 출처를 담는다).

**추가 확인:** `home-visual-v2.wire.json factSurface.forbiddenWithoutContract`에 `scan_count`/`confirm_count`/`progress_count`가 등재되어 있다(§1 실측) — 이는 "계약 없이는 금지"이며, 지금까지 이를 허용하는 계약이 작성된 적이 없다. 현재 런타임(`HomeRightRail.tsx`)도 이 3필드를 항상 `null`(→ `absent` 렌더)로만 다뤄 실제로 이 금지를 위반한 적이 없다(§1 실측, 가짜 데이터 0).

### 최종 판정

```text
Zone A(COUNT)   = KEEP (그대로 REWIRE 레이아웃만)
Zone B(스테퍼)  = DEFER
```

- Visual Master가 이 슬롯을 명확히 요구하는 것은 맞다(불명확해서 DEFER가 아니다) — 그러나 이를 채울 실제 FSM 데이터 축이 백엔드에 존재하지 않고, Canon wire가 계약 없는 도입을 명시적으로 금지한다.
- "기존에 있으니까 남김"이 아니다 — 기존 코드는 이미 항상-absent라 사실상 아무것도 채우고 있지 않다. "새 Master에 안 보이니까 지운다"도 아니다 — 지울 business logic 자체가 없다(FSM 노출 API가 원래 없음).
- H7 옵션: (a) Zone B 서브블록을 정직한 absent 상태로 유지, 또는 (b) 데이터 축이 없으므로 이번 릴리스에서 서브블록 자체를 생략. 둘 다 허용되며, 실제 데이터 바인딩은 Engine/Money가 참여 건별 FSM 노출을 신규로 계약하기 전까지 금지 상태를 유지한다.

### 12.3 CategoryFilterChips

| 대상 | 판정 |
|---|---|
| 컴포넌트 파일(`CategoryFilterChips.tsx`) | **COMPONENT_KEEP** — `/profits`(`ProfitsPageClient.tsx`)와 실측 공유 확인(§1), Home 요구만으로 수정·삭제 불가 |
| Home 호출 여부 | **HOME_USAGE_REMOVE_FROM_HOME** |

**근거:** H5 §2.2가 Desktop을 "3-category **동시** 노출"(단일 필터 뷰 아님)로, §3이 Mobile을 "ONE dominant featured card + carousel"로 명시한다. 단일-선택 카테고리 필터 UI는 이 두 프레젠테이션 어느 쪽과도 맞지 않는다(Desktop은 이미 3개를 동시에 보여주므로 필터가 필요 없고, Mobile은 캐러셀이 카테고리 필터가 아니라 단일 지배 카드 탐색이다). H6 §3 #7d가 "INVESTIGATE"로 남겨둔 이 항목을 본 문서가 H5 텍스트 근거로 확정한다.

---

## 13. peotteokLine / Verifier Literal 조사

**정정 발견:** H6 §3 #3이 "verify:home-live-wire가 HomeExperience.tsx 소스에 BalanceAwareHome 리터럴 포함을 검사"라고 서술했으나, 실제로 이 검사를 수행하는 스크립트는 **`verify:balance-aware-feed.cjs`**(548~567행 상당)다. `verify:home-live-wire.cjs`는 `page.tsx`/`HomePageClient.tsx`만 읽고 `HomeExperience.tsx`를 전혀 읽지 않는다(§1 실측, 스크립트 원문 대조). **경미한 오귀속이며 검증 내용 자체는 정확하다** — H7이 어느 verify를 신경 써야 하는지 알 수 있도록 본 문서가 정정한다.

**peotteokLine 원인 판정:**

```text
verify:balance-aware-feed.cjs가 BalanceAwareHome.tsx 소스에서 검사하는 항목:
  data-testid="section-affordable" / "section-near-miss" / "section-locked-high"
  "sectionAffordable" / "sectionNearMiss" / "sectionLockedHigh" (T.feed.* 카피 키 이름의 substring)
  "peotteokLine" (T.feed.peotteokLine 카피 키 이름의 substring — T.feed.peotteokLineCountOnly도 이 substring을 포함하므로 후자만 남아도 통과)
  "OpportunityCard" (컴포넌트 import)
```

- 이것은 **파일 소스 텍스트에 대한 정적 substring 검사**이며 DOM 렌더 결과나 런타임 동작을 확인하지 않는다.
- **판정: legacy implementation literal 검사(구현 세부사항 proxy)이며, business contract 요구사항 자체는 아니다.** H4 Money/Opportunity Semantics Matrix 어디에도 "정확히 `peotteokLine`이라는 문자열이 파일에 있어야 한다"는 기능 요건은 없다 — 실제 요건은 "nAffordable/suggestDeposit/nearMissExtra 정보가 사용자에게 어딘가에 정확히 전달되어야 한다"는 사실(Fact) 요건이며, 현재 verifier는 그 요건을 "정확히 이 카피 키를 참조하는가"로 근사 검사하고 있을 뿐이다.
- `data-testid="section-*"`/`OpportunityCard` 리터럴은 DOM 구조 앵커에 더 가까워 회귀 방지 가치가 있다(H6 §3 #7a/#7e가 이미 "보존" 대상으로 계획).

### 최종 판정

```text
PEOTTEOK_LINE_VERIFIER = LEGACY_IMPLEMENTATION_LITERAL (business contract 요구 아님)
H7_COMPANION_DECISION_REQUIRED:
  옵션 A — T.feed.peotteokLine 또는 peotteokLineCountOnly 참조를 새 AI summary 카드 내부로 이식(verify 문자열 보존, verifier 변경 0)
  옵션 B — 새 프레젠테이션이 이 역할을 완전히 대체한다고 판단하면, 같은 커밋에서 verify:balance-aware-feed.cjs의 해당 needle을 명시적으로 갱신(리뷰 동반)
  금지 — verify를 끄기 · 검증 문자열만 속이기 · dead hidden JSX로 literal만 유지
```

본 항목은 runtime 수정 없이 **판단 근거만** H7에 넘긴다(지시 재확인).

---

## 14. AppShellRoot / BottomNav / Global Blast Radius Sync

- `AppShellRoot.tsx`/`AppHeader.tsx`/`SiteFooter.tsx`는 전역 셸(모든 라우트 공용, `{children}` 래핑 구조로 실측 확인)이며 Home Visual Master는 Home 화면만 촬영했으므로 이 3개 파일의 시각 변경은 Home 밖 라우트(`/wallet`, `/profits` 등)에도 영향을 준다 — H4/H5/H6·본 문서 모두 일치.
- `data-shell-geometry="sidebar-240|header-64|rail-352"`(`AppShellRoot.tsx`)는 레포 전체에서 **이 속성을 소비하는 CSS/JS/verify가 0건**임을 재확인(신규 grep) — H6의 "기능 영향 0 확인 필요" 요청을 본 문서가 실측으로 충족한다. 갱신/제거는 안전하나 H6.5 범위(runtime 0)에서는 수행하지 않는다.
- `BottomNav5.tsx` 인라인 `✦`는 `BrandMark.tsx`를 import하지 않음(재확인) — `packages/ui/components/home/**` 전체에서 `BrandMark` 참조 0건 확인, H6의 발견이 정확함을 검증.

```text
GLOBAL_BLAST_RADIUS_SYNC = CONFLICT_0 (골격 변경은 Home-local presentation으로 해결 가능하며, 전역 파일 변경이 필요하면 Founder 확인이 필요하다는 H6 §3 #11 권고를 유지)
```

---

## 15. Asset Contract Sync

| Asset | H1 §11 | H5 §16 | H6 §19 | 일치 여부 |
|---|---|---|---|---|
| `peotteok-ai-robot-home-summary-v1` | ASSET_PRODUCTION_REQUIRED | 동일 | 동일 + 소비자 컴포넌트(`HomeAiSummary` 가칭) 지정 | ✅ |
| `peotteok-ai-robot-home-cta-v1` | ASSET_PRODUCTION_REQUIRED | 동일 | 동일 + 소비자(`HomeOpportunityDiscovery` 가칭) 지정 | ✅ |
| `peotteok-home-hero-support-graphic-v1` | ASSET_PRODUCTION_REQUIRED | 동일 | 동일 | ✅ |
| Featured opportunity 이미지 | REUSE 가능성 높음 | REUSE(H5 §16) | REUSE(§19, 기존 `ProductImage` variant) | ✅ |
| Trust 보조 일러스트 | 필수 여부 미정 | DEFER(텍스트만으로 가능) | DEFER(§19) | ✅ |
| 인사이트 아이콘 | Brand Kit 재검토 우선 | INVESTIGATE | INVESTIGATE(§19, 벡터 재사용 우선) | ✅ |

이름·소비 컴포넌트·desktop/mobile 공유 여부·비율(`PENDING_CALIBRATION_FROM_MASTER`)·fallback(`NO PLACEHOLDER RUNTIME`, `MISSING_VISUAL_ASSET` 마킹)이 H1→H5→H6에서 **완전히 일치**한다. 발견된 불일치 0.

**추가 확인(신규):** 인사이트 티저의 최종 라우팅 타겟 `/me/guide/market-weekly`(실제 라우트 존재 확인)의 Canon wire `market-weekly-briefing.wire.json forbidden`에 `investment_advice`/`buy_now_cta`/`sell_now_cta`/`guaranteed_profit`이 등재되어 있다 — H7이 Home 티저 카피를 작성할 때 이 축을 넘지 않아야 한다는 요구사항을 H6.5가 명시적으로 이관한다(H1 §9가 이미 언급했으나 H5/H6 본문에 재인용되지 않았던 항목).

```text
ASSET_CONTRACT_SYNC = CONFLICT_0
이번 H6.5에서 이미지 생성 = 0 (재확인)
```

---

## 16. Legacy Removal Sync

| 대상 | H6 분류 | 재확인 결과 |
|---|---|---|
| `HomeHero.tsx`/`HomeHeroIllustration.tsx` | REMOVE_FROM_RUNTIME(렌더 호출만) | `HomeExperience.tsx`가 **현재도** `<HomeHero />`를 렌더 중(§1 실측) — 계획대로 아직 미실행, 정상(H7 전) |
| `HomeExperience.tsx` | REPLACE(조립) + REWIRE(숨김 슬롯) | 숨김 슬롯 3개(`ticker`/`day-pulse`/`counter`, C01 lock) + `useHomeChrome().setScanStatus` 브릿지 실재 확인 — H7이 삭제하면 회귀 위험, 보존 대상 재확인 |
| `BalanceAwareHome.tsx` 내부 | 세분화(REWIRE/REPLACE/INVESTIGATE 혼재) | §1/§13 실측으로 재확인 |
| `OpportunityCard.tsx` | REWIRE(바인딩) + REPLACE(스킨) | `data-field` 바인딩과 `data-action="participate"` 실재 확인, skin 교체와 독립적으로 보존 가능 |

business logic·handlers·fetch·mutation·polling·listeners가 REMOVE 대상에 섞여 있지 않음을 재확인(H6 §20 "Old actions bound only to legacy presentation = 없음 확인"과 본 문서의 §1 실측이 일치). Safety-C(old+new 동시 렌더 금지)는 H7이 `HomeExperience.tsx`를 in-place 교체할 때 지켜야 할 요건으로 명확히 계약되어 있다.

```text
LEGACY_REMOVAL_SAFETY = CONFLICT_0 (H7 실행 시 지킬 경계가 명확함 · 본 문서가 runtime을 먼저 건드리지 않음)
```

---

## 17. State Contract Sync

H4 §11(loading/ready_data/ready_empty/partial_data/error/session-expired/wallet-unavailable/opportunity-unavailable/FX-unavailable) = H6 §16(동일 9-state, data owner/presentation owner/재사용 컴포넌트/금지 fallback 명시) — **완전 일치**. H5는 별도 state 목록을 만들지 않고 H4의 state를 시각 표현 문제로만 다룬다(올바른 권한 분리, 시각 authority가 state를 재정의하지 않음).

- fake zero · fake success · stale를 fresh처럼 · error를 empty로 위장 — H4/H6 모두 명시적으로 금지, 실제 코드(`moneyStateAllowsValue`)로 이미 구현·보존 확인.
- FX-unavailable은 전용 state가 없고 기존 USDT-primary fallback이 사실상 이 상태를 흡수한다는 H6 §16 판단이 §2(KRW sync)의 결론과 일치한다.

```text
STATE_CONTRACT_SYNC = CONFLICT_0
```

---

## 18. Accessibility Sync

H5 §15(대비/포커스/터치타깃/텍스트확대/모션저감/색-독립 전달) = H6 §18(동일 6항목 + carousel 전용 aria/keyboard 요구 추가) — H5가 요구한 것을 H6가 구현 요구사항으로 정확히 승계했으며 축소·누락 0건. `MotionCTA`가 이미 reduced-motion 처리 패턴(주석 재확인: "off when reduced-motion / data-tier=b")을 가지고 있어 신규 carousel도 같은 유틸을 재사용할 수 있다는 H6 판단을 재확인.

```text
ACCESSIBILITY_SYNC = CONFLICT_0 (구현은 H7)
```

---

## 19. H6.5 Sync Matrix (필수)

| Surface / Field | H4 Functional | H5 Visual | H6 Implementation | Final H6.5 Decision | H7 Ready? |
|---|---|---|---|---|---|
| KRW primary | FUNCTIONAL_BINDING_REQUIRED | REQUIRED(§9.1) | READY(fail-safe, §12) | **PRE_H7_PREREQUISITE**(Visual Certification만 차단, 구현 착수는 허용) | 착수 YES / 인증 NO |
| USDT secondary | MATCH | MATCH | READY | **SYNCED_READY** | YES |
| principal(원금) | MATCH | 1차 위계 | REWIRE(기존) | **SYNCED_READY** | YES |
| expected profit(예상수익) | MATCH | 2차 위계 | REWIRE(기존) | **SYNCED_READY** | YES |
| actual profit(실제수익) | UNRESOLVED(§5) | APPROVED slot/UNRESOLVED binding | READY_WITH_PRE_H7_DECISION | **PRE_H7_PREREQUISITE**(데이터) / SYNCED_READY(슬롯) | 슬롯 YES / 데이터 NO |
| settlement count | MATCH(COUNT, C01) | Zone A COUNT | REWIRE(레이아웃만) | **SYNCED_READY** | YES |
| itemCount | FUNCTIONAL_BINDING_REQUIRED(gap-only) | 3-stat 중 1개 | READY(§13) | **SYNCED_READY** | YES |
| average return(%) | FUNCTIONAL_BINDING_REQUIRED(신규 집계) | 3-stat 중 1개 | BLOCKED(실데이터)/READY(absent) | **PRE_H7_PREREQUISITE**(숫자) | 카드 YES / 숫자 NO |
| estimatedDurationSec(개별) | FUNCTIONAL_BINDING_REQUIRED(gap-only) | 카드 위계 6번 | READY(§13) | **SYNCED_READY** | YES |
| processing range(카테고리) | UNRESOLVED(Engine 재확인 요청, 미이행) | 카드 위계 참고 | READY_WITH_PRE_H7_DECISION | **DEFERRED_BY_CONTRACT** | NO(발명 금지) |
| update slot | 대체안 3종 후보 | 동일 3종 | 폴백 체인 확정 | **SYNCED_READY** | YES |
| deposit CTA | MATCH | REUSE(§9.4) | REUSE | **SYNCED_READY** | YES |
| withdraw CTA | FUNCTIONAL_BINDING_REQUIRED(신규 진입점) | REQUIRED(§9.4) | NEW trigger/REUSE mutation | **SYNCED_READY** | YES |
| opportunity CTA(탐색) | 중복위험 식별 | teaser 요구 | 단일화 의무(§15) | **SYNCED_READY**(§10 CTA map으로 확정) | YES |
| Desktop categories | MATCH(데이터) | 3-동시노출 | REWIRE+NEW 레이아웃 | **SYNCED_READY** | YES |
| Mobile featured opportunity | MATCH(hero=affordable[0]) | 단일 지배 카드 | REWIRE+NEW 강조 | **SYNCED_READY** | YES |
| carousel | FUNCTIONAL_BINDING_REQUIRED(신규 UI) | dot indicator 요구 | NEW+a11y 요구명시 | **SYNCED_READY**(계약만) | 계약 YES / 런타임 NO(금지) |
| RightRail COUNT | MATCH(C01) | Zone A | REWIRE | **SYNCED_READY** | YES |
| RightRail stepper(Zone B) | (H1 origin, §12.2 정정) | Zone B 요구 | INVESTIGATE | **DEFERRED_BY_CONTRACT** | NO(데이터축 부재) |
| Trust | FUNCTIONAL_BINDING_REQUIRED(신규 카피) | 방향성 MATCH | NEW 카피+기존 카드 스타일 | **SYNCED_READY** | YES |
| Insight(인사이트) | FUNCTIONAL_BINDING_REQUIRED(링크 여부) | 티저 링크 의도 | REUSE route+NEW 티저 UI | **SYNCED_READY** | YES |
| AI summary asset | — | ASSET_PRODUCTION_REQUIRED | 동일 | **ASSET_PART_B_REQUIRED** | NO |
| AI CTA asset | — | ASSET_PRODUCTION_REQUIRED | 동일 | **ASSET_PART_B_REQUIRED** | NO |
| support graphic | — | ASSET_PRODUCTION_REQUIRED | 동일 | **ASSET_PART_B_REQUIRED** | NO |
| legacy hero removal | — | — | REMOVE_FROM_RUNTIME 계획 | **SYNCED_READY**(계획 확정, 실행은 H7) | YES |
| CategoryFilterChips(컴포넌트) | — | — | KEEP(파일) | **SYNCED_READY**(COMPONENT_KEEP) | YES |
| CategoryFilterChips(Home 호출) | — | 3동시/1지배 불일치 | INVESTIGATE | **REMOVE_FROM_H7_SCOPE**(Home 호출부만) | YES(사용 안 함으로 확정) |
| peotteokLine verifier | — | — | INVESTIGATE | **PRE_H7_PREREQUISITE**(companion 결정, §13) | YES(택1 필요) |
| AppShellRoot 전역 블라스트 | — | — | INVESTIGATE | **SYNCED_READY**(변경 불필요 확정, 안전성 실측 완료) | YES |

**모호한 표기("나중에 볼 것"/"probably"/"maybe") = 0건.**

---

## 20. Conflicts Found / Resolved 요약

| # | 발견 | 유형 | 해소 |
|---|---|---|---|
| 1 | H5 §2.3/§18이 Right Rail Zone B FUNCTIONAL_BINDING_REQUIRED를 "H4가 남김"으로 서술하나 H4 본문에 해당 항목 없음 | 인용 출처 오류(내용 모순 아님) | §12.2에서 origin을 H1로 정정 기록. H4/H5 소급 수정 불필요(판단 내용 자체는 3문서 무모순) |
| 2 | Actual Profit 해소 경로가 Money 런타임 가드(1개)만 명시되고 Canon wire `forbiddenWithoutContract:cumulativeProfitUsdt` 가드(2개째)와의 관계가 명시적으로 연결되지 않음 | 미완결 cross-reference(내용 모순 아님) | §3에서 "두 가드 동시 해제 필요"로 명시 봉합 |
| 3 | H6 §3 #3이 `verify:home-live-wire`를 `HomeExperience.tsx`↔`BalanceAwareHome` 리터럴 검사 주체로 오귀속(실제로는 `verify:balance-aware-feed`) | 검증 스크립트 이름 오귀속(검사 내용 자체는 정확) | §13에서 정정 기록, H7이 올바른 verify를 신경 쓰도록 명시 |
| 4 | H4 §7이 요청한 "카테고리별 처리시간 차등 Engine 재확인"이 H5·H6 어디에서도 수행되지 않음 | 미이행 요청(모순 아니라 미완결) | §5에서 DEFERRED_BY_CONTRACT로 명시 이관, 발명 금지 재확인 |

**블로킹 모순(하나가 다른 하나와 정면으로 반대되는 판단) = 0건.** 위 4건 전부 "인용 정밀도/미완결 요청"류이며, 어떤 두 문서도 서로 반대 결론을 내린 적은 없다.

---

## 21. KRW 최종 판정 (§24 대응)

```text
KRW_BINDING_REQUIRED_BEFORE_VISUAL_CERTIFICATION
```

§2 전체가 근거다. `EXPLICIT_TEMPORARY_CONTRACT_ALLOWED`는 Founder의 명시적 승인 문장이 3문서 어디에도 없어 미채택. "USDT-primary fallback이 있으니 문제 없다"는 결론은 **명시적으로 거부한다** — 이는 구현 착수 가능성과 최종 시각 인증을 혼동하는 FAIL 패턴이며, 본 문서는 그 구분을 유지한다.

## 22. Actual Profit 최종 판정 (§23 대응)

```text
데이터/숫자 바인딩 = PRE_H7_PREREQUISITE (Founder/Money-owner 결정 · 이중 가드 동시 해제 필요)
슬롯 레이아웃      = SYNCED_READY (기존 absent 패턴 재사용, 신규 UX 발명 0)
```

Visual 슬롯을 데이터 없이 남기는 것은 Founder-approved 결과와 모순되지 않는다 — H5 §9.3이 이미 이 조합(`APPROVED` 슬롯 + `UNRESOLVED` 바인딩)을 명시적으로 승인했기 때문이다. 가짜 UI 우회 = 0(hardcode/0표시/추정치를 실제로 사용 금지 전부 유지).

---

## 23. H7 Gate 최종 판정

```text
H7_CONTRACT_READY        = YES
H7_RUNTIME_START_ALLOWED = NO
```

- **H7_CONTRACT_READY = YES 사유:** §1~§19에서 재확인한 모든 실측이 H4/H5/H6 서술과 100% 일치하고, §20의 4건은 전부 비차단(non-blocking) 인용/이관 이슈이며 본 문서가 전부 명시적으로 봉합했다. Sync Matrix(§19)의 모든 행이 6분류 중 하나로 확정되었고 모호 표기 0건이다.
- **H7_RUNTIME_START_ALLOWED = NO 사유:** Asset Production Part B(`redesign-r1-home-visual-asset-production`)가 아직 착수되지 않았다. `peotteok-ai-robot-home-summary-v1`/`peotteok-ai-robot-home-cta-v1`/`peotteok-home-hero-support-graphic-v1` 3개 asset이 `ASSET_PART_B_REQUIRED`로 남아 있고, H1/H5/H6 전 문서가 일관되게 "NO PLACEHOLDER RUNTIME"을 요구한다 — 이 asset들 없이 H7이 AI summary/discovery 카드를 완성 상태로 구현할 수 없다. 이것은 **정상 상태**이며 H6.5의 실패가 아니다(§32 STOP 조건과 일치).

---

## Document Control

| | |
|---|---|
| Fake binding count | 0 |
| New backend feature invented | 0 |
| New Functional/Visual judgment invented(H4/H5/H6 재확정 외) | 0 |
| Runtime implementation | 0 |
| CSS implementation | 0 |
| Asset generated | 0 |
| DB migration | 0 |
| New mutation/scheduler | 0 |
| H4/H5/H6 text modified | 0(모든 발견은 본 문서에서 정정 기록만, 소급 수정 없음) |
| Blocking contradiction found | 0 |
| Non-blocking gap found and resolved | 4(§20) |
| H7/Brand Assets Part B started by this document | NO |
| Next authorized step | Asset Production Part B(`redesign-r1-home-visual-asset-production`) → H7(`redesign-r1-home-implementation`) |
