# Peotteok Home — V2 Delta Sync (H5/H6/H6.5 Delta vs Visual Master V2)

| | |
|---|---|
| Status | **DELTA SYNC COMPLETE — V2 REBASE PASS** (Runtime/CSS/API/DB/Asset 변경 **0**) |
| Date | 2026-08-16 |
| Todo | `redesign-r1-home-visual-master-v2-rebase` — `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| Authority class | **Delta Sync** — H5(Visual)·H6(Implementation)·H6.5(Contract Sync)를 재작성하지 않고, V2 Visual Master(`peotteok-home-visual-master-intake.v2.md`) 기준으로 **바뀐 것만** 명시한다 |
| Governs | H5/H6/H6.5 각 절의 UNCHANGED/DELTA_REQUIRED/OBSOLETED_BY_V2/NEW_V2_REQUIREMENT 판정 + Asset Part B V2 재조사 + H7 게이트 재확정 |
| Runtime code changed by this document | **0** |
| Inputs | `peotteok-home-visual-master-intake.v2.md`(본 세션 신설) · `peotteok-home-visual-contract.v2.md`(H5) · `peotteok-home-implementation-contract.v2.md`(H6) · `peotteok-home-contract-sync.v1.md`(H6.5) · `peotteok-home-product-contract.v1.md`(H4) · 실제 코드 재확인(§1) |
| Next step | Asset Production Part B(`redesign-r1-home-visual-asset-production`, V2 기준 매트릭스는 §20) → H7(`redesign-r1-home-implementation`). 본 문서는 둘 다 착수를 승인하지 않는다 |

---

## 0. 이 문서가 하는 일 / 하지 않는 일

```text
한다:   H5/H6/H6.5의 각 절을 V2 Visual Master와 대조하여 UNCHANGED/DELTA_REQUIRED/
        OBSOLETED_BY_V2/NEW_V2_REQUIREMENT 중 하나로 판정한다.
        H4 Functional Truth가 V2 때문에 훼손되지 않았음을 재확인한다.
        Asset Part B 매트릭스를 V2 기준으로 재조사(KEEP/MODIFY/REMOVE/NEW_REQUIREMENT)한다.
        H7_CONTRACT_READY_AFTER_V2 / ASSET_PART_B_V2_READY 게이트를 확정한다.

하지 않는다: H5/H6/H6.5 전체 재작성 · React/CSS/API/DB/Money/Engine/Auth 변경 · asset 생성 ·
            carousel 구현 · Actual Profit binding · 신규 server aggregate · H7 착수 ·
            기존 KRW/Actual Profit/Average Return/RightRail Zone B/CategoryFilter 결론의 임의 반전
```

---

## 1. 재확인한 실제 파일 (V2 세션 추가분)

| 파일/개념 | 확인한 것 |
|---|---|
| `packages/ui/components/opportunity/OpportunityCard.tsx` | `aiConfidenceScore`가 이미 `data-field="aiConfidenceScore"`로 표시되나 `hidden md:block`(Desktop 전용, Mobile 숨김) — 기존 MATCH 요구사항 그대로, V2가 이를 바꾸지 않음 |
| `packages/ui/components/trust/MarketPartnerLeg.tsx` | buy/sell 시장 표시는 **파트너 로고 이미지**(`packages/ui/brand/markets`)로만 렌더 — 국가 flag 자산·flag emoji 사용 0건(코드 실측) |
| `packages/ui/brand/markets/*` | country/flag 관련 키 0건(grep 확인) — 국가 flag 아이콘 자산은 현재 레포에 없음 |
| `packages/ui/canon/surfaces/home-visual-v2.wire.json` | `factSurface.rightRail: settlementCompletedToday`(C01) 불변 확인 — V2 이미지가 이 zone을 안 보여준다고 삭제 근거가 되지 않음(§16) |
| `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` / H1·H4·H5·H6·H6.5 문서 | 이전 커밋(`519f5ba`) 이후 다른 세션이 이 파일들을 변경하지 않았음을 재확인(`git diff --stat` 0) |

---

## 2. Desktop V2 Structural Delta (vs H5 §2)

| H5 §2 요소 | V2 이미지 관찰 | 판정 |
|---|---|---|
| Greeting → AI summary → Asset summary → Discovery → 3-category | 순서 4/5 확인(Greeting/AI summary/Discovery/3-category), Asset summary는 이 capture에 시각적으로 없음(intake §8 재확인) | **UNCHANGED** — 순서 자체는 V1/H5와 동일, Asset summary 위치는 텍스트(H5 §5 + 본 세션 프롬프트 §2)로 재확인되어 유지 |
| AI summary 3-stat(발견한 기회·평균 수익률·평균 처리시간) | 그대로 확인(아이콘+donut 스타일로 시각 강화) | **UNCHANGED**(Fact 요구 동일) / **DELTA_REQUIRED**(시각 표현만: 아이콘 3종+선그래프+donut을 신규 시각 요소로 추가, 데이터 영향 0) |
| 3-category 카드 = 단순 카테고리 소개 | 여전히 카테고리 요약(범위 표기)이나, §3(Secondary Reference)의 구체성을 흡수하라는 명시적 업그레이드 지시 있음 | **DELTA_REQUIRED** — §4에서 상세 |
| Right Rail 4-zone(Progress-COUNT/Trust/Insight, Zone B 별도) | Zone A(COUNT)가 이 capture에 없음, "진행 현황"(Zone B 개념)이 최상단으로 재배치, Trust/Insight는 그대로 확인 | **DELTA_REQUIRED**(zone 순서: Zone B가 위로) / **UNCHANGED**(Zone A 존재 요구, Trust/Insight 내용) — §16에서 상세 |
| Sidebar IA(홈·기회·수익·지갑·내정보) | 동일 확인 | **UNCHANGED** |

---

## 3. Mobile V2 Structural Delta (vs H5 §3)

| H5 §3 요소 | V2 이미지 관찰 | 판정 |
|---|---|---|
| Header → Greeting+AI summary(1열, Desktop과 동일 3-stat) | Greeting 확인, AI summary는 **itemCount 단일 stat만** 확인(3-stat 아님) | **DELTA_REQUIRED** — Mobile AI summary는 3-stat 전부가 아니라 itemCount만으로도 성립 가능(§10에서 이 delta가 오히려 유리한 이유 설명) |
| Asset summary(원금/예상수익/실제수익 3-슬롯, 입금/출금 풀와이드) | 그대로 확인, "실제 수익" 슬롯에 "연결 예정" 표기 | **UNCHANGED**(구조) — "연결 예정" 리터럴은 §10에서 별도 처리(임의 확정 금지) |
| Featured opportunity(단일 지배 카드 + carousel dots) | 그대로 확인 + "AI 추천" 배지 + adjacent-card peek 신규 관찰 | **UNCHANGED**(핵심 구조) / **NEW_V2_REQUIREMENT**(배지 카피, peek 시각 디테일 — 데이터 영향 0) |
| Update/Trust 2열 압축 카드 | 콘텐츠가 "진행중"(Zone B 스테퍼)+"최근확인"(asOf + 3행 health-ish 리스트)로 관찰 — 기존 "Update slot + Trust 리스트" 조합과 다름 | **DELTA_REQUIRED** — §14/§17에서 상세, Trust 불릿리스트 요구 자체는 유지 |
| BottomNav(5탭, 홈 active) | 동일 확인 | **UNCHANGED** |

---

## 4. Opportunity Presentation Delta (vs H5 §10 · H6 §8 OpportunityCard)

Secondary Reference에서 참고 허용된 요소를 기존 `OpportunityCardModel` 필드와 대조:

| Reference가 보여주는 요소 | 기존 필드/컴포넌트(실측) | 판정 |
|---|---|---|
| 대표 상품 이미지 | `ProductImage`(§18에서 재확인) | UNCHANGED |
| 구체적 상품명("롤렉스 서브마리너 126610LN") | `assetLabel`(기존) | UNCHANGED |
| 시장/국가 context("미국 → 일본") | `buyMarketLabelKo`/`sellMarketLabelKo` + 기존 `corridorText()`(텍스트 조합, 이미 배선) | UNCHANGED(Fact) / **DELTA_REQUIRED**(시각 강조 방식만 — flag 아이콘화는 §8에서 조건부) |
| 필요 금액(₩+약USDT) | `requiredCapitalUsdt` | UNCHANGED |
| 예상 수익(₩+약USDT) | `expectedProfitUsdt` | UNCHANGED |
| 예상 처리 시간(단일 opportunity) | `estimatedDurationSec`(H6.5 SYNCED_READY, gap-only) | UNCHANGED |
| 상태 배지("매칭 가능") | `bucket`/`ctaLockReasonKo` 기반 기존 lock badge 로직과 동일 개념(NEW 배지 카피만 가능성) | UNCHANGED(Fact) / 카피 문구는 H7 확정 |
| CTA("수익 벌기") | 기존 `T.execution.ctaEarn` | UNCHANGED |
| AI 신뢰도(aiConfidenceScore) | Reference엔 시각적으로 안 보이나, 기존 코드가 이미 Desktop에서 `data-field="aiConfidenceScore"`로 표시 중(§1) | **UNCHANGED** — Functional MATCH 요구 그대로(Secondary가 안 보여준다고 삭제 근거 아님) |
| "AI 추천" 배지(Mobile) | 없음(신규 배지) — 그러나 밑바탕 선택 로직은 기존 `hero = affordable[0]`(H4/H5/H6 MATCH) | **NEW_V2_REQUIREMENT**(카피/배지만, 데이터 0) |

**결론: Opportunity 카드의 필요한 모든 Fact는 이미 존재한다.** V2가 요구하는 "구체성 업그레이드"는 100% 기존 필드의 시각 표현 강화이며, 신규 서버 필드가 필요한 요소는 0건이다.

---

## 5. H4 Functional Truth Preservation

재확인 결과 Money/Engine/Auth/Session/Wallet/Opportunity FSM/Settlement/Safe Stop/SDK/mutations/existing actions 어디에도 V2로 인한 재작성 압력이 없다:

```text
Money 필드(principalUsdt/todayPossibleProfitUsdt/profitUsdt/settlementCompletedTodayCount) = 0 변경
Engine 필드(estimatedDurationSec/Soft60/Hard90) = 0 변경
Opportunity FSM/Settlement/Safe Stop = 0 변경
기존 mutation(createWithdraw/participate/deposit) = 0 변경
```

H4 §12 Functional Conflicts 표(영구 이모지·Legacy asset·Visual Master 예시 숫자·"실제 수익" name-match 거부·다음 업데이트 리터럴)의 5개 판정 전부 V2 이미지에도 **동일하게 적용됨을 재확인**했다(V2에도 👋 이모지·"오늘 오후 2:00"·예시 숫자가 그대로 등장하나, 처리 방식은 이미 H4/H5/H6.5가 확정한 그대로 유지).

```text
H4_FUNCTIONAL_TRUTH_PRESERVED = YES (삭제·재작성 0)
```

---

## 6. H5 Delta Sync (Visual Contract v2 · section-level)

| H5 §(Visual Contract v2) | V2 판정 |
|---|---|
| §2.1 Left Sidebar | UNCHANGED |
| §2.2 Main hierarchy(Greeting→AI summary→Asset summary→Discovery→3-category) | UNCHANGED(순서) / DELTA_REQUIRED(AI summary 시각 요소: 아이콘 3종+line chart+donut 추가) |
| §2.3 Right Rail(Zone A~E) | DELTA_REQUIRED — Zone 존재 자체는 UNCHANGED, **Zone B가 최상단으로 재배치**되는 순서 delta(§16) |
| §3 Mobile Composition | DELTA_REQUIRED — AI summary가 3-stat이 아니라 itemCount 단일(§10), Update/Trust 2열의 콘텐츠가 Progress+Health-ish로 재정의(§14/§17) |
| §3.1 Density/Touch | UNCHANGED |
| §4 Shared Design Language | UNCHANGED |
| §5 Layout Hierarchy(px 관계) | UNCHANGED(관계) — 정확한 px는 여전히 `PENDING_CALIBRATION_FROM_MASTER`(V2 이미지도 스크린샷일 뿐 정밀 측정 불가) |
| §6 Typography Hierarchy | UNCHANGED |
| §7 Card/Geometry Contract | UNCHANGED |
| §8 Color/Tone Contract | UNCHANGED(Light/Purple/Lavender 방향 V2도 동일) |
| §9.1 KRW/USDT | UNCHANGED(§9 delta에서 재확인) |
| §9.2/§9.3 원금·예상·실제수익 3-슬롯 | UNCHANGED(3-슬롯 분리 원칙 V2도 동일, Secondary의 "총자산" 합산은 명시적으로 배제) |
| §9.4 입금/출금 | UNCHANGED |
| §10 Opportunity Visual Hierarchy | DELTA_REQUIRED — §4에서 상세(구체성 업그레이드, 신규 필드 0) |
| §11 AI Visual Treatment | UNCHANGED(로봇 identity·역할 경계 동일) / DELTA_REQUIRED(로봇 포즈가 "0<" 스타일로 구체화, §20 Asset Part B에서 재조사) |
| §12 Update/Trust Presentation | DELTA_REQUIRED — §14/§17 |
| §13 Navigation Presentation | UNCHANGED |
| §14 Responsive Intent | UNCHANGED(Desktop/Mobile 분리 원칙 그대로, "carousel adjacent-peek" 신규 시각 디테일만 추가) |
| §15 Accessibility | UNCHANGED |
| §16 Asset Requirement Matrix | DELTA_REQUIRED — §20에서 V2 매트릭스로 재확정 |
| §17 VISUAL_ONLY_EXAMPLE Handling | UNCHANGED(원칙), 예시 숫자 목록만 V2 것으로 갱신(intake §6) |
| §18 H4 Unresolved Carry-Forward | UNCHANGED(전부 재확인, §9~§13 delta 참고) |
| §19 Forbidden Legacy Reuse | UNCHANGED |
| §20 H6 Handoff | UNCHANGED(요구사항 목록 자체는 유효, 값만 V2로 갱신) |

OBSOLETED_BY_V2 판정 = **0건**(H5의 어떤 절도 V2로 인해 완전히 폐기되지 않았다 — 전부 UNCHANGED 또는 DELTA_REQUIRED).

---

## 7. H6 Delta Sync (Implementation Contract v2 · 지정 8개 파일)

| 파일 | H6 기존 분류 | V2로 실제로 바뀌는가 | 이유 |
|---|---|---|---|
| `HomeExperience.tsx` | REPLACE(조립)+REWIRE(숨김슬롯) | **변경 없음** | 조립 순서 자체(Greeting→AI→Asset→Discovery→Category, RightRail 분리)는 V2에서도 동일 — 내부 zone 순서(RightRail Zone B 우선)만 후속 컴포넌트 내부 문제, 최상위 조립 파일의 분류에는 영향 없음 |
| `HomePrincipalRail.tsx` | REWIRE(+actual-profit·withdraw sub-slot) | **변경 없음** | KRW/원금/예상수익/실제수익/출금 요구사항 전부 UNCHANGED(§9/§10) |
| `BalanceAwareHome.tsx` | INVESTIGATE(세분화: 7a REWIRE/7b REPLACE/7c INVESTIGATE/7d INVESTIGATE/7e REWIRE) | **변경 없음** | Opportunity 카드 "구체성 업그레이드"는 `OpportunityCard.tsx` 내부 필드 바인딩 문제이며 `BalanceAwareHome`의 5분류 경계 자체를 바꾸지 않음 |
| `OpportunityCard.tsx` | REWIRE(바인딩)+REPLACE(스킨) | **변경 없음**(분류) / 요구사항 강화 | §4에서 확인된 "구체성" 요소 전부 기존 필드 재사용이므로 바인딩 REWIRE 범위 내. `estimatedDurationSec` 슬롯 추가 요구는 그대로 유지 |
| `HomeRightRail.tsx` | INVESTIGATE(COUNT는 REWIRE 확정, Zone B는 결정 대기) | **변경 없음**(분류) / 순서 요구사항만 추가 | Zone B가 시각적으로 위로 온다는 사실이 "INVESTIGATE→결정"을 앞당기지 않는다(H6.5 DEFER 불변, §16) |
| `ProductImage.tsx` | KEEP(H5 §16 REUSE) | **변경 없음** | V2 Reference의 상품 이미지도 동일 adapter로 충분(§18) |
| `BottomNav5.tsx` | REWIRE(반응형 골격 유지·마크만 대기) | **변경 없음** | Sidebar/BottomNav IA·구조 V2에서도 동일 확인 |
| `AppHeader.tsx` | REWIRE(사실상 NO_CHANGE에 가까움) | **변경 없음** | 헤더 골격 V2에서도 동일(알림/아바타 슬롯) |

**결론: H6의 5분류(KEEP/REWIRE/REMOVE_FROM_RUNTIME/REPLACE/INVESTIGATE) 중 V2로 실제 재분류가 필요한 파일 = 0건.** V2는 "무엇을 보여줄지"의 세부 디테일(아이콘·donut·peek·배지)만 추가했고, "어떤 파일이 그 책임을 지는가"는 바뀌지 않았다.

---

## 8. H6.5 Delta Sync

### 8.1 바뀌지 않는 것(프롬프트 §21 원문 재확인 — 임의 반전 0)

```text
KRW prerequisite               = 불변(§9)
Actual Profit prerequisite     = 불변(§10)
Average Return prerequisite    = 불변(§11)
Update Slot synced             = 불변(§13)
CategoryFilter Home removal    = 불변(§22 재확인)
RightRail Zone B defer         = 불변(§16, Zone 재배치가 데이터 축을 만들지 않음)
Desktop/Mobile separate authority = 불변(§25 재확인, V2도 Primary 2장을 각자 독립 authority로 등록)
```

### 8.2 V2로 실제로 추가되는 delta(신규 발견, 반전 아님)

| 항목 | 신규 delta |
|---|---|
| Mobile AI summary | 3-stat 전체가 아니라 **itemCount 단일**로도 성립 — Mobile 경로는 Average Return/Processing-time 두 prerequisite에 걸리지 않고 즉시 SYNCED_READY(§11) |
| RightRail Zone 순서 | Zone B(진행현황)가 시각적으로 Zone A(COUNT)보다 위 — Zone B가 실제 bind되기 전까지는 순서 변경의 실질 영향 0(§16) |
| Mobile "최근확인" 3행(시장데이터/처리시스템/보안시스템) | 신규 관찰 — Fact 근거 0, static Trust copy로 흡수(§14), live status로 채택 금지 |
| 국가 context flag 표기 | 신규 관찰 — flag emoji 사용 위험, 기존 텍스트 corridor 유지 권고(§8) |
| "총자산" 합산(Secondary Reference) | 명시적 위반 사례 발견·배제(intake §3에서 이미 처리) |

---

## 9. KRW 결정 (V2 이후)

```text
KRW_BINDING_REQUIRED_BEFORE_VISUAL_CERTIFICATION (불변)
```

V2 Primary 두 이미지(Desktop/Mobile) 모두 KRW를 헤드라인 숫자로, USDT를 보조(약 USDT 병기)로 유지한다 — Founder rule과 100% 일치. 현재 runtime의 USDT-primary fail-safe라는 이유로 이 hierarchy를 바꾸지 않는다(프롬프트 §8 명시 재확인). H7 구현 착수 가능(기존 fail-safe)과 Founder 시각 인증(KRW 실배선 필요)의 구분은 H6.5와 동일하게 유지한다.

---

## 10. Actual Profit 결정 (V2 이후)

```text
ACTUAL PROFIT DATA = PRE_H7_BINDING_REQUIRED (불변)
ACTUAL PROFIT SLOT = SYNCED_READY (불변)
```

Mobile V2의 "실제 수익 ⓘ 연결 예정"은 **visual placeholder intent only**로 취급한다. `연결 예정`/`0`/`+₩32,000`/`N/A`/`-`를 runtime literal로 임의 사용하지 않는다. "연결 예정"이라는 정확한 4글자를 지금 copy SSOT(`packages/ui/copy/ko/*`)에 확정 등록하지도 않는다(H7/Founder가 absent-state copy를 확정할 때 참고 후보로만 기록) — 기존 absent-state 패턴(`HomePrincipalRail`의 `factState: ready|guest|absent|loading`)과 동기화해서 처리한다는 H6.5 §11 결론을 그대로 승계한다.

---

## 11. Average Return 결정 (V2 이후)

```text
AVERAGE RETURN % = REQUIRED_AND_SERVER_PREREQUISITE / H7_BLOCKER FOR NUMBER (불변)
```

Desktop V2가 다시 "예상 평균 수익률 2.8%"를 보여주더라도, 이 숫자를 V2 runtime 요구사항으로 복원하지 않는다. 신규 서버 집계 없이는 숫자 표시 금지 — Desktop AI summary 3-stat row는 H5 §2.2가 이미 계약한 `scanIdle`/`scanEmpty` 대체 카피(데이터 미도달 시 전체 행 대체)로만 진행 가능.

**신규 확인(V2 delta):** Mobile V2 AI summary는 이 2개 blocked stat(평균 수익률·평균 처리시간)을 요구하지 **않는다** — itemCount 단일 stat만 시각적으로 확인됨. 따라서 **Mobile AI summary 경로는 이 prerequisite에 걸리지 않고 즉시 SYNCED_READY**다. 이는 H7에게 실질적인 이득이다(Mobile을 먼저 완결 가능).

---

## 12. Processing Time 결정

```text
individual estimatedDurationSec = SYNCED_READY (불변)
category processing range       = DEFERRED_BY_CONTRACT (불변)
```

Mobile V2의 "약 1~2분"(Featured 카드, 단일 opportunity)은 실제 `estimatedDurationSec`로 대체 가능한 자리다(authoritative presentation으로 전환). Desktop V2의 category 카드 범위("약 1~3분" 등, Watches/Trading Cards/Luxury Bags 각각)는 H4 §7이 요청한 Engine 재확인이 여전히 미이행 상태이므로 `3~5분`/`1~3분`/`2~4분` 같은 카테고리별 임의 숫자를 발명하지 않는다(H6.5 §5 결론 재확인, V2가 이를 뒤집을 실측 근거를 제공하지 않았다).

---

## 13. Update / Recent-Check 결정

```text
UPDATE_SLOT_CONTRACT = SYNCED (불변)
```

"오늘 오후 2:00"(Desktop V2 RightRail)은 사용 금지 재확인(H4/H5/H6.5와 동일 사유 — 백엔드에 스케줄 개념 없음). 기존 `asOf`/`scanEmpty`/`scanIdle` 폴백 체인만 사용한다.

**신규 확인(V2 delta, 경미):** Mobile/Desktop V2의 "1분 전" 상대시간 표기는 실제 `DayPulseResponse.asOf`로부터 계산되는 **표시 형식**(절대 시각 대신 상대 시간)일 뿐 신규 Fact가 아니다 — `SYNCED` 결론 안에서 **DELTA_REQUIRED(표시 형식만)**로 명시: H7이 `asOf`를 상대시간("N분 전")으로 포맷하는 것은 허용되며 오히려 더 정직한 표현이다. 다만 이 포맷 변환 자체도 이번 세션에서 구현하지 않는다.

---

## 14. System Health / Trust 결정

Mobile V2 "최근 확인"(시장 데이터/처리 시스템/보안 시스템 "정상")과 Desktop Secondary Reference "퍼뜩 시스템 상태"(5행) 모두 대응하는 backend Fact가 **0건**이다(H4 Money/Opportunity/DayPulse Semantics Matrix 전체 재확인, 실측).

```text
LIVE_SYSTEM_HEALTH_CLAIM = NOT_SUPPORTED (신규 Fact 없이 발명 금지)
```

**처리 방향:** 이 항목은 별도의 "실시간 헬스체크" UI로 신규 계약하지 않고, 이미 존재하는 **Trust static copy 요구사항**(H4 §9/§12.2 "안전하고 신뢰할 수 있어요" — 원금 상태 확인·처리 상태 확인·개인정보 보호)의 톤과 같은 축으로 흡수한다. 즉 "시장 데이터/처리 시스템/보안 시스템"류 문구는 **정적 신뢰 카피**로만 다루며, 실시간으로 모니터링되는 live status indicator로 구현하지 않는다(프롬프트 §14가 명시한 "static Trust copy와 live status를 명확히 분리" 요건을 이렇게 충족한다).

---

## 15. CTA Ownership (V2 이후 재감사)

V2 이미지들이 추가하는 CTA 표면:

| CTA | 위치 | 기존 action | 신규 여부 |
|---|---|---|---|
| "기회 확인하기"(Desktop Discovery 티저) | Main | 기존 discovery-teaser 역할(H6.5 §10에서 이미 Hero CTA 역할 승계로 확정) | 재사용, 신규 아님 |
| "기회 보기 →"(카드별, Desktop/Mobile) | 각 Opportunity 카드 | 기존 `data-action="participate"` | 재사용, 신규 아님 |
| "수익 벌기"(Secondary Reference 카드) | Opportunity 카드 | 동일 participate action | 재사용, 신규 아님(문구 후보 차이는 카피 확정 시 H7이 단일화) |
| "모두 보기 →"(Mobile 추천 기회 섹션) | Featured 상단 | 기존 `/profits` 목록 이동(신규 mutation 없음, 순수 네비게이션) | 신규 **네비게이션 링크**, mutation 0 |
| "전체보기 →"(RightRail 진행현황) | RightRail | 기존 `/trades` 이동(`HomeRightRail` 기존 `home-right-rail-total-link` 패턴과 동일 축) | 재사용 패턴, 신규 아님 |
| "더보기"(퍼뜩 인사이트) | RightRail | 기존 `/me/guide/market-weekly` | 재사용, 신규 아님 |
| 입금/출금(Asset Summary) | Main/Mobile | 기존 deposit link + withdraw 신규 트리거(H6.5 §11에서 이미 확정) | 변경 없음 |

```text
duplicate mutation = 0
duplicate handler = 0
duplicate participate action = 0
```

V2에서 CTA 표면(버튼 개수)은 늘었으나(예: "모두 보기"·"전체보기"·"더보기" 각 섹션 링크), 이들은 전부 **순수 네비게이션**이며 기존 action ownership을 공유한다 — 신규 mutation은 0건이다.

---

## 16. RightRail 결정

```text
COUNT zone(Zone A)         = READY(존재 요구 불변, 위치만 PENDING_CALIBRATION)
individual stepper(Zone B) = DEFER(불변)
```

V2 Primary가 "진행 현황"(Zone B)을 RightRail 최상단에 배치하고 Zone A(COUNT)를 이 capture에서 보여주지 않는 것은 **순서에 대한 시각 delta**일 뿐, Zone B의 데이터 바인딩 가능 여부를 바꾸지 않는다. 실제 참여-건별 FSM 노출 API가 여전히 존재하지 않으므로(재확인, §1) 없는 FSM 데이터를 시각 때문에 발명하지 않는다. Zone A는 C01 Functional lock(`settlementCompletedToday`)이 존재를 요구하므로, V2가 시각적으로 보여주지 않아도 삭제되지 않는다 — 정확한 위치는 `PENDING_CALIBRATION_FROM_MASTER`로 남긴다.

---

## 17. Mobile Carousel 결정

carousel은 H6에서 이미 NEW mechanism으로 확인되었다(불변). V2가 추가한 시각 디테일(AI 추천 배지·pagination dots·adjacent-card peek)은 H6 §16/§18이 이미 요구한 "신규 컴포넌트 + keyboard/touch/aria/focus/reduced-motion" 계약 범위 내의 **구현 디테일**이며 새로운 접근성 요구사항을 추가하지 않는다. 이번 세션에서 구현하지 않는다(불변).

```text
CAROUSEL_CONTRACT = SYNCED_READY (계약만, V2 디테일 반영 · 런타임 0)
```

---

## 18. Product Image 결정

```text
ProductImage.tsx = KEEP (불변)
existing product-image adapter = REUSE (불변)
```

Secondary Reference의 상품 이미지 스타일(시계/트레이딩카드/명품가방 실사 스타일)은 기존 `assetImageUrl`/`ProductImage` adapter 경로로 충분히 표현 가능하다고 판단한다(신규 이미지 파이프라인 불필요). 목업 이미지 자체를 runtime product image로 하드코딩하지 않는다(재확인, 이번 세션 이미지 생성 0).

---

## 19. Country Route / Global Currency Context (Forward Note Only)

§15/§9(프롬프트) 원칙을 그대로 기록만 한다 — 이번 세션은 실행하지 않는다:

```text
Yahoo Japan adapter = PERMANENTLY_FORBIDDEN(불변, product-drift-lock.mdc/Engine §0.0.1c와 동일 축)
일본 자체는 금지 아님 — Mercari Japan 등은 별도 Global Data authority
KRW primary + native market currency contextual + USDT secondary 원칙은 향후 Global Parser 연동 시 재확인 대상(신규 계약 필요, 본 세션 범위 밖)
```

이번 Home visual rebase에서 FX/runtime을 구현하지 않으며 Global Parser track과 Home runtime을 섞지 않는다(재확인).

---

## 20. Asset Part B V2 Matrix (재조사 · 생성 0)

| Asset(H6.5 handoff) | V2 재조사 결과 | 판정 |
|---|---|---|
| `peotteok-ai-robot-home-summary-v1` | Desktop V2에서 로봇이 "0<" 포즈로 더 구체화(팔을 벌린 친근한 자세) + Mobile V2에서 로봇+돋보기 포즈 확인 — identity(귀·눈·색상)는 V1 설명과 동일 계열, 포즈만 구체화 | **MODIFY_REQUIREMENT**(identity 유지, 포즈 레퍼런스만 V2로 갱신) |
| `peotteok-ai-robot-home-cta-v1` | Discovery 티저 로봇 포즈("0<" 계열)가 Desktop V2에서 확인됨 | **MODIFY_REQUIREMENT**(동일 사유) |
| `peotteok-home-hero-support-graphic-v1` | Desktop V2에서 로봇 옆 line-chart+donut 조합으로 구체화 관찰 | **MODIFY_REQUIREMENT**(그래픽 소재가 "차트/도넛" 계열로 더 구체화됨, 방향은 H1과 동일) |
| Featured opportunity 대표 이미지(시계/카드/가방) | 기존 REUSE 판정 유지, Secondary Reference가 실사 스타일 참고를 강화 | **KEEP_REQUIREMENT** |
| Trust 보조 일러스트 | V2에서도 텍스트만으로 성립 가능(그림 없이 "안전하고 신뢰할 수 있어요" 문구만 확인) | **KEEP_REQUIREMENT**(DEFER 유지) |
| 퍼뜩 인사이트 아이콘(globe) | V2에서도 지구본 아이콘으로 확인, Brand Kit 벡터 재사용 우선 검토 방향 불변 | **KEEP_REQUIREMENT**(INVESTIGATE 유지) |
| **(신규 후보)** 국가 context 표시용 flag/route 아이콘 | §8/§4에서 발견 — 국가 flag 자산이 레포에 없고 emoji 사용은 금지 | **NEW_REQUIREMENT(INVESTIGATE 우선)** — 기본값은 기존 텍스트 corridor 유지(자산 불필요), Founder가 flag 아이콘을 원하면 별도 자산 신설 여부 결정 |
| **(신규 후보)** AI summary 아이콘 3종(검색/그래프/시계) | Desktop V2 AI summary row에서 확인 | **NEW_REQUIREMENT(INVESTIGATE 우선)** — Brand Kit 기존 벡터 재사용 검토를 먼저(퍼뜩 인사이트 globe와 동일 원칙), 신규 제작을 기본값으로 가정하지 않음 |

```text
NO PLACEHOLDER RUNTIME 유지 · 자산 생성 = 0(이번 세션)
```

---

## 21. Legacy V1 Presentation Removal Impact

V1 Visual Master의 시각 authority가 V2로 교체된 것은 **presentation 문서/이미지 레벨**의 승계이며, H6 §3~§21의 KEEP/REWIRE/REMOVE_FROM_RUNTIME/REPLACE/INVESTIGATE 분류(`HomeHero`/`HomeHeroIllustration` REMOVE_FROM_RUNTIME 등)에는 영향이 없다(§7 재확인, 8개 파일 전부 분류 불변). 즉 "V1 presentation 제거"는 이미 H6가 계획한 legacy removal(HomeHero 등)과 동일한 범위이며, V2가 이를 확대하거나 축소하지 않는다.

---

## 22. 최종 판정

### Verdict

```text
HOME_VISUAL_MASTER_V2_REBASE = PASS
```

### PASS 조건 재확인(프롬프트 §36)

| 조건 | 상태 |
|---|---|
| Desktop Primary V2 registered | ✅(intake §1/§2) |
| Mobile Primary V2 registered | ✅(intake §1/§4) |
| Secondary reference role locked | ✅(intake §1/§3, REFERENCE_ONLY/NOT_AUTHORITY) |
| V1 superseded/historical | ✅(intake §9/§10, 배너 추가·본문 삭제 0) |
| H4 functional truth preserved | ✅(§5) |
| H5 delta synced | ✅(§6, OBSOLETED_BY_V2=0) |
| H6 delta synced | ✅(§7, 재분류 필요 파일=0) |
| H6.5 delta synced | ✅(§8, 기존 결론 반전 0) |
| KRW prerequisite preserved | ✅(§9) |
| Actual Profit ambiguity not faked | ✅(§10) |
| Average Return fake value = 0 | ✅(§11) |
| Update fake schedule = 0 | ✅(§13) |
| Desktop/Mobile authority mixing = 0 | ✅(intake §1.1, 이미지 역할 실측 판정) |
| fake product data runtime = 0 | ✅(§18, 이번 세션 이미지/데이터 생성 0) |
| duplicate CTA/mutation ambiguity = 0 | ✅(§15) |
| Asset Part B requirement refreshed | ✅(§20) |
| runtime changes = 0 | ✅ |
| assets generated = 0 | ✅ |

### H7_CONTRACT_READY_AFTER_V2

```text
YES
```

### ASSET_PART_B_V2_READY

```text
YES
```

Asset Part B(`redesign-r1-home-visual-asset-production`)는 §20 매트릭스(MODIFY 3건 + KEEP 3건 + NEW/INVESTIGATE 2건)를 입력으로 착수할 수 있는 상태다. 단, 착수 자체는 본 세션에서 하지 않는다(§32/§38 STOP 조건).

### H7_RUNTIME_START_ALLOWED

```text
NO
```

Asset Part B가 아직 남아 있기 때문이다(§20 매트릭스가 착수 가능 상태가 됐다는 것과 실제 제작 완료는 다르다).

---

## Document Control

| | |
|---|---|
| Fake binding count | 0 |
| New backend feature invented | 0 |
| New server aggregate invented | 0 |
| Runtime implementation | 0 |
| CSS implementation | 0 |
| Asset generated | 0 |
| DB migration | 0 |
| New mutation/scheduler | 0 |
| H4/H5/H6/H6.5 원문 재작성 | 0(본 문서에서 delta만 기록, 원문 수정 0) |
| H6.5 기존 결론 반전 | 0(§8.1 재확인) |
| H7/Asset Part B 착수 | NO |
| Next authorized step | Asset Production Part B(`redesign-r1-home-visual-asset-production`, §20 매트릭스 기준) → H7(`redesign-r1-home-implementation`) |
