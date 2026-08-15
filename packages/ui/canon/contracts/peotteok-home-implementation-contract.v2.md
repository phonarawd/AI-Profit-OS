# Peotteok Home — Implementation Contract v2 (H6 · ADR-018 · KEEP/REWIRE/REMOVE_FROM_RUNTIME/REPLACE/INVESTIGATE)

| | |
|---|---|
| Status | **CONTRACT COMPLETE — IMPLEMENTATION PLANNING ONLY** (React/CSS 변경 0 · H7 미착수) |
| Date | 2026-08-16 |
| Todo | `redesign-r1-home-implementation-contract` (H6) — `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| Authority class | **Implementation Authority** (ADR-018 §3 사다리 3단계) — H4 Functional Authority·H5 Visual Authority를 실제 코드 구조에 매핑만 함(재확정 금지) |
| Governs | Home(`/`) 화면의 **KEEP/REWIRE/REMOVE_FROM_RUNTIME/REPLACE/INVESTIGATE 최종 분류** + Desktop/Mobile 구현 매핑 + H7 실행 계획. React/CSS/API/DB/Money/Engine/Auth **실제 변경 0** |
| Inputs | `ADR-018-peotteok-visual-master-reset.md` · `peotteok-home-visual-master-intake.v1.md`(H1, 특히 §10 preview) · `peotteok-home-product-contract.v1.md`(H4) · `peotteok-home-visual-contract.v2.md`(H5) · 실제 코드(§3 전수 실측) |
| Runtime code changed by this document | **0** |
| Next step | H6.5 contract sync(`redesign-r1-home-contract-sync`) — 본 문서는 그 착수를 승인하지 않는다(§22) |

---

## 0. 이 문서가 하는 일 / 하지 않는 일

```text
한다:   H1 preview 분류를 실제 코드 재실측으로 검증·정정하여 최종 KEEP/REWIRE/REMOVE_FROM_RUNTIME/
        REPLACE/INVESTIGATE를 확정한다. Desktop/Mobile 구현 책임을 매핑한다(REUSE/REWIRE/NEW/REMOVE/
        INVESTIGATE). H7이 "추측 없이" 실행 가능한 file-level plan을 만든다.

하지 않는다: React/CSS 구현 · 컴포넌트 작성 · 자산 생성 · API/SDK/DB/Money/Engine/Auth 변경 ·
            scheduler 생성 · H6.5/H7/Brand Assets Part B/Visual Lock 착수
```

**방법론 준수:** H1 §10의 preview 분류를 그대로 베끼지 않았다. 아래 §3은 본 세션에서 실제 파일을 다시 읽고
필요한 경우 H1 preview를 **정정**한 결과다(정정 사례는 각 행의 "H1 preview와 다른 점"에 명시).

---

## 1. Authority Chain (재확인만 · 재정의 0)

```text
ADR-018 §3 Visual Authority Hierarchy
  → H1 Visual Master Intake (Desktop/Mobile 등록)
  → H4 Product Contract (Functional Authority — 본 문서가 재확정하지 않음)
  → H5 Visual Contract v2 (Visual Authority — 본 문서가 재확정하지 않음)
  → H6 (본 문서) — 구현 매핑만
  → H6.5 contract sync → H7 presentation implementation
```

Canon wire functional 필드(`route`/`state`/`factSurface`/`forbidden`/`navLabels`/`heroTimeline`)는 참조만 하며
재정의하지 않는다(`home-visual-v2.wire.json`, `home-principal-slots.wire.json`).

---

## 2. Legacy Replacement Safety Gate 재확인 (03 plan 기존 게이트 · 본 문서가 집행 기준을 구체화)

### Safety-A — 5분류 의무

```text
분류 없이 새 컴포넌트 추가 금지. §3 표가 이 5분류의 최종 확정본이다.
```

### Safety-B — Runtime/Interaction/Data uniqueness = 0 (중복 금지 목록 재확인)

```text
duplicate page shell · duplicate sidebar · duplicate header · duplicate bottom nav
duplicate sticky CTA · duplicate modal/sheet · duplicate primary CTA
duplicate click handler · duplicate submit · duplicate mutation
duplicate participate request · duplicate withdraw request · duplicate toast
duplicate API fetch · duplicate polling · duplicate subscription/listener
duplicated business logic
```

실측된 **현재 중복 위험 지점**(§17/§21에서 구체적으로 재확인):

- Hero CTA(`data-testid="home-hero-cta"`, `#home-opportunity` 앵커) + BalanceAwareHome sticky CTA(`data-testid="home-sticky-cta"`) + 신규 discovery-teaser CTA(H5 §2.2) + 카드 내부 참여 CTA(`data-cta="earn"`) = **4곳의 CTA 후보**가 이미/앞으로 존재 — H7은 이를 Safety-B 준수 **단일 활성 CTA 체계**로 통합해야 한다(§15).
- `BottomNav5`(desktop=sidebar, mobile=bottomnav)는 **이미 단일 반응형 컴포넌트**이므로 "duplicate sidebar/bottom nav" 위험이 낮다(REWIRE 대상, 신규 병렬 컴포넌트 추가 금지).

### Safety-C — old+new 동시 렌더 금지

```text
Forbidden H7 architecture: OLD HOME + NEW HOME
Required: PRESERVED BUSINESS/DATA/ACTION LOGIC → NEW FOUNDER-APPROVED PRESENTATION ONLY
old presentation runtime reference = 0 · new Home presentation runtime = 1
```

§21 File-Level Plan은 이 원칙에 따라 REPLACE 대상 파일의 **렌더 호출 지점 제거**(REMOVE_FROM_RUNTIME)를 명시한다 — 파일을 남겨두더라도 Home 트리에서 두 번 렌더되는 상태를 허용하지 않는다.

---

## 3. File-by-File Forensic Matrix (실측 · 최종 분류)

| # | 파일 | 현재 책임 | 기능 의존 | 프레젠테이션 의존 | H6 분류 | 이유(H1 preview와 다른 점 포함) | H7 action |
|---|---|---|---|---|---|---|---|
| 1 | `apps/web/app/page.tsx` | 서버 컴포넌트, 세션 쿠키 read, `HomePageClient`에 위임 | `hasUserSessionCookie` | 없음 | **KEEP** | H1과 동일. 순수 세션 게이트, 시각 요소 0. `verify:home-live-wire`가 이 파일의 배선 패턴을 앵커로 씀 | NO_CHANGE |
| 2 | `apps/web/app/HomePageClient.tsx` | 4개 fetch(`Promise.allSettled`: home-read-model/opportunity-feed/day-pulse/growth) orchestration, unauthorized 판정, truth 구성, `HomeExperience`에 props 전달 | `@aipo/sdk/home-read-model`·`user-feed`·`growth`, `opportunity-card-map.ts` | `HomeExperience`, `HomeSessionBanner` import | **REWIRE** | H1과 동일 축이나 실측으로 정정: `opportunity.itemCount`는 타입에 있으나 **읽지 않음**(client truth에 없음) · `principalKrwApprox`는 애초에 `HomeReadModelResponse`에 필드 자체가 없어 전달 불가(H4 §4 gap과 동일) | MODIFY(gap-only: itemCount 추출+전달 추가, fetch/session 로직 100% 보존) |
| 3 | `packages/ui/components/home/HomeExperience.tsx` | JSX 조립(ticker/DayPulse sr-only/counter 숨김 슬롯 + `home-dashboard-grid`: Hero→PrincipalRail→BalanceAwareHome + RightRail) + `useHomeChrome().setScanStatus` 컨텍스트 브릿지 | `HomeChromeContext` | Hero/PrincipalRail/BalanceAwareHome/RightRail/DayPulse/HomePayoutCounter/LivePayoutTicker | **REPLACE**(조립 순서) + **REWIRE**(숨김 슬롯·컨텍스트 브릿지) | H1과 동일 결론(REPLACE)이나 세분화 필요: 3개 숨김 슬롯(`data-home-slot="ticker/day-pulse/counter"`, C01 lock)과 scan-status 브릿지는 **기능 유지 필수** — 통째로 지우면 C01/ticker/counter 회귀. `verify:home-live-wire`가 `HomeExperience.tsx` 소스에 `BalanceAwareHome` 리터럴 포함을 검사하므로, 대체 조립본도 이 마운트를 유지하거나 verify를 별도 L2 변경으로 갱신해야 함(본 문서는 갱신하지 않음, H7 flag) | MODIFY in place 권장(숨김 슬롯+컨텍스트 보존, 본문 JSX만 교체) — 전체 삭제 후 재작성 금지 |
| 4 | `packages/ui/components/home/HomeHero.tsx` | 4단 타임라인 Hero(`T.home.hero.timeline`) + CTA + 삽화 슬롯 | `home-visual-v2.wire.json heroTimeline`(용어 lock) | `HomeHeroIllustration` | **REPLACE** | H1과 동일. **주의:** `heroTimeline`(`AI 스캔→기회 발견→참여→정산 확인`)은 ADR-018 §8상 기능적 term-lock으로 계속 유효 — Hero 컴포넌트를 지워도 이 4단계 **개념**은 어딘가(예: RightRail Zone B 개별 스테퍼, 또는 AI summary 처리 설명)에 보존해야 하며 조용히 폐기하면 안 됨(§9 Zone B와 연결 검토는 H7) | REMOVE_FROM_RUNTIME(렌더 호출 제거) · 파일은 다른 라우트 미사용 확인됨(grep) → 완전 삭제는 H7 최종 판단 |
| 5 | `packages/ui/components/home/HomeHeroIllustration.tsx` | robot+globe 정적 삽화(`<picture>` desktop/mobile 반응형 소스) | 없음 | `avatar` 계열 자산 아님, `hero-illustration-*` 자산 | **REPLACE** | H1과 동일. `<picture>` 반응형 소스 전환 **기법**은 새 자산에도 재사용 가능한 패턴(자산만 교체) | REMOVE_FROM_RUNTIME(현재 렌더 호출 제거) · 새 asset 확정 후(Brand Assets Part B) 유사 패턴으로 재생성은 H7 |
| 6 | `packages/ui/components/opportunity/HomePrincipalRail.tsx`(export alias `HomeMoneySurface`) | 원금+오늘가능수익 2-article 그리드, KRW 조건 분기(존재하나 미도달), 입금 CTA | `T.feed.*`, `formatUsdt`, Money Fact(`principalUsdt`/`todayPossibleProfitUsdt`) | 없음(순수 presentation+data) | **REWIRE** | H1과 동일이나 정밀화: KRW 분기 로직은 **실재**(이미 조건부 렌더 존재) — "배선 안 됨"이 아니라 "상위에서 값이 안 내려옴"(§12). 실제 수익 슬롯·출금 CTA는 **이 파일에 아예 존재하지 않음**(신규 sub-slot 추가 필요, §11/§15) | MODIFY(actual-profit article 추가[데이터 미바인딩 상태로만] + withdraw CTA 추가, 기존 principal/estimated article 및 KRW 분기 로직 100% 보존) |
| 7 | `packages/ui/components/opportunity/BalanceAwareHome.tsx`(export alias `HomeOpportunity`) | scanHero 텍스트 헤더 + `CategoryFilterChips`(단일선택 필터) + `hero=affordable[0]` 강조 + 나머지 그리드 + nearMiss/lockedHigh + `MarketPartnerTrustStrip` + `peotteok` 텍스트 1줄 + mobile sticky CTA | `T.feed.*`, bucket 분류 데이터(Engine §0.0.5.1 pass-through) | `CategoryFilterChips`, `OpportunityCard`, `MarketPartnerTrustStrip`, `MotionCTA` | **INVESTIGATE**(파일 전체를 한 분류로 묶을 수 없음 — 아래 세분류가 최종 답) | H1은 REWIRE 단일 분류였으나 실측 결과 **내부에 REWIRE·REPLACE가 혼재**해 파일 단위 단일 분류가 부정확함이 확인됨(정정). `verify:balance-aware-feed`가 `data-testid="section-affordable/near-miss/locked-high"`·`peotteokLine`·`OpportunityCard` 리터럴 포함을 하드 검사하므로 이 마커들은 **문자 그대로 보존 또는 verify 동반 갱신**이 필요(본 문서는 갱신 안 함, §17/§21 flag) | 아래 세분류 참고 |
| 7a | ↳ `hero=affordable[0]` 강조 로직 · bucket 분류(affordable/nearMiss/lockedHigh) · `nAffordable`/`nExtra`/`suggest` 계산 | 순수 데이터 로직 | Engine §0.0.5.1 pass-through | 없음 | **REWIRE** | 데이터 정확 · Mobile "단일 지배 카드" 요구와 100% MATCH(H5 §3) | 보존, 그대로 새 프레젠테이션에 연결 |
| 7b | ↳ `scanHero` 헤더(`T.feed.homeTitle`/`homeScanSub`) | 텍스트 블록 | copy만 | 없음 | **REPLACE** | H5의 Greeting+AI summary 카드가 이 자리를 대체 — 현재는 "오늘 벌 수 있는 기회" 제목 1개뿐, robot·3-stat 없음 | REMOVE_FROM_RUNTIME(현재 헤더 블록), 신규 컴포넌트로 대체 |
| 7c | ↳ `peotteok` 텍스트 1줄(`T.feed.peotteokLine`) | 텍스트 요약 | `nAffordable`/`suggest`/`nExtra` | 없음 | **INVESTIGATE** | `verify:balance-aware-feed`가 `peotteokLine` 리터럴 존재를 하드 검사 — 완전 삭제는 verify FAIL 유발. 그러나 H5 AI summary 카드가 이 역할을 흡수하려 함 → **문구 자체를 새 AI summary 카드 내부로 이식**하는 방식이면 verify 문자열 보존과 새 프레젠테이션이 공존 가능(H7이 정확한 방법 결정) | INVESTIGATE 유지 — H7이 verify 갱신 여부와 함께 결정 |
| 7d | ↳ `CategoryFilterChips` 단일선택 필터 호출 지점(Home 내부) | UI 상호작용 | `category` state | `CategoryFilterChips.tsx`(컴포넌트 자체는 `/profits`와 공유) | **INVESTIGATE** | H1은 컴포넌트를 KEEP으로 봤으나, 실측(`ProfitsPageClient.tsx`에서도 import)으로 **컴포넌트 파일 자체는 삭제·수정 불가**(cross-route 공유)임을 확인 · Desktop 새 Master는 "3-카테고리 동시노출"이라 **단일선택 필터라는 UX 자체**가 맞지 않을 수 있음 — 컴포넌트는 KEEP, **Home 내부 호출 여부/방식**만 재검토 필요 | 컴포넌트 파일: NO_CHANGE(공유) · Home 호출부: H7이 유지/제거/Mobile 전용 재배치 결정 |
| 7e | ↳ nearMiss/lockedHigh 섹션 · `MarketPartnerTrustStrip` · mobile sticky CTA(`home-sticky-cta`) | 데이터+프레젠테이션 혼합 | bucket 데이터, `MotionCTA` | 없음 | **REWIRE** | 로직·존재 자체는 보존, 새 레이아웃 내 배치 위치만 재조정(§9/§15 CTA 단일화 대상) | 보존, 배치만 이동 |
| 8 | `packages/ui/components/opportunity/OpportunityCard.tsx` | 카드 시각(이미지+뱃지+3단 dl+partner leg+price compare+adapter health+CTA) | `requiredCapitalUsdt`/`expectedProfitUsdt`/`aiConfidenceScore` 필드 바인딩 | `ProductImage`, `Badge`, `MotionCTA`, `OpportunityScanBadge`, `PriceCompareMargin`, `AdapterHealthChip`, `MarketPartnerLeg` | **REWIRE**(필드 바인딩) + **REPLACE**(시각 skin) | H1과 결론 동일(REPLACE)이나 정밀화: 필드 바인딩 자체(`data-field="requiredCapitalUsdt"` 등)는 **그대로 재사용**해야 함 — skin만 교체. `estimatedDurationSec`/범위 표기는 **현재 카드에 슬롯 자체가 없음**(신규 추가, §13) | MODIFY(내부 바인딩 유지, JSX 구조/클래스만 교체, `estimatedDurationSec` 슬롯 추가) |
| 9 | `packages/ui/components/opportunity/CategoryFilterChips.tsx` | 시계/카드/가방 단일선택 칩 | 없음 | 없음 | **KEEP**(파일 자체) | `/profits`(`ProfitsPageClient.tsx`)와 **공유 컴포넌트** — Home 요구만으로 이 파일을 수정·삭제하면 `/profits` 회귀. 7d와 연결 | NO_CHANGE(파일) — Home 내 사용 여부는 7d에서 결정 |
| 10 | `packages/ui/components/home/HomeRightRail.tsx` | 4개 섹션: total(COUNT)+todayPossible / TOP3 opportunities / scan·confirm·progress·settle COUNT grid | `T.home.rightRail.*`, `formatUsdt`, `countCell`(absent≠0) | `ProductImage` | **INVESTIGATE** | H1과 동일(INVESTIGATE 유지, 실측으로 재확인). COUNT 섹션(C01 lock)은 **그대로 필수 보존** — `home-visual-v2.wire.json forbidden: ledgerTotal_as_usdt` 위반 절대 금지. 개별 참여 스테퍼(H5 Zone B)는 **이 파일에 존재하지 않는 새 데이터 축** — 만들려면 신규 서브컴포넌트, 데이터 없으면 드롭 | COUNT 그리드: REWIRE(레이아웃만 재배치) · Zone B 스테퍼: §11/§18 결정 대기(생성 보류 가능) |
| 11 | `packages/ui/components/shell/AppShellRoot.tsx` | **전역** 셸(모든 라우트 공용): `BottomNav5`+`AppHeader`+children+`SiteFooter` 래핑, `data-shell-geometry="sidebar-240\|header-64\|rail-352"` 속성 보유 | `HomeChromeProvider` | `BottomNav5`, `AppHeader`, `SiteFooter` | **INVESTIGATE** | H1과 동일 결론이나 근거 보강: 이 파일은 **Home 전용이 아니라 앱 전체 셸**이다 — Home Visual Master는 오직 Home 화면만 촬영했으므로, 이 파일의 시각 변경은 Home 밖(예 `/wallet`, `/profits`) 화면에도 영향을 준다. `data-shell-geometry` 속성이 옛 ADR-017 수치(240/64/352)를 문자열로 하드코딩 중 — 이 값 자체는 시각 렌더에 관여하지 않는 diagnostic 속성으로 보이나, 존재만으로 옛 수치를 문서화하고 있어 새 Contract와 혼동 위험 | 골격(HomeChromeProvider+children 배치): REWIRE · `data-shell-geometry` 리터럴: H7에서 갱신 또는 제거 검토(기능 영향 0 확인 필요) · 전역 블라스트 레디어스 있는 변경은 Home 단독 권한 밖일 수 있음 — Founder 확인 권장 |
| 12 | `packages/ui/components/shell/AppHeader.tsx` | **전역** 헤더: scan chip, tier badge, notification, avatar(default=`avatar-512.png`) | `useHomeChrome` | 없음 | **REWIRE** | H1과 동일. 정밀화: `DEFAULT_AVATAR = "/brand/assets/ai/avatar-512.png"`는 **유저 프로필 아바타 fallback**으로 쓰이는데 brand manifest는 이 자산을 `role: "peotteok_avatar"`(AI 아바타)로 라벨링 — 기존부터 있던 의미 혼동. H5의 AI robot pose 신규 자산은 **AI summary/discovery 카드용**이며 이 전역 헤더 fallback을 자동 대체하는 근거가 아님(별도 결정 필요) | 헤더 골격: NO_CHANGE(Home 전용 변경 근거 없음) · avatar 자산 교체는 이 헤더가 아니라 §19 자산 매트릭스 범위에서만, 전역 fallback 교체는 별도 브랜드 결정 |
| 13 | `packages/ui/components/shell/BottomNav5.tsx` | **전역** 반응형 sidebar(desktop)↔bottomnav(mobile) 단일 컴포넌트, IA 5탭, 인라인 `✦` 브랜드 마크, invite 카드 | `usePathname` | 없음 | **REWIRE** | H1과 동일. 실측 확인: `BrandMark.tsx`를 import하지 않고 **자체 인라인 `✦` span**을 그림(별도 파일) — legacy 마크 위치는 이 파일 67~78행, `BrandMark.tsx`가 아님(정정) | 반응형 골격/IA: NO_CHANGE(MATCH) · `✦` 인라인 마크: §19 결정 대기, 대체 전까지 유지 |
| 14 | `packages/ui/components/shell/SiteFooter.tsx` | **전역** 푸터: operator 법적 고지 2줄만 | `T.operator.footer`, `T.legal.operator` | 없음 | **KEEP** | H1은 INVESTIGATE(파트너 스트립 포함 추정)였으나 실측 결과 **파트너 스트립은 이 파일에 없음**(그건 `BalanceAwareHome`의 `MarketPartnerTrustStrip`) — SiteFooter는 순수 법적 텍스트뿐, Home Visual Master 스크린샷 범위와 무관(정정: INVESTIGATE→KEEP) | NO_CHANGE |
| 15 | `packages/ui/components/shell/HomeChromeContext.tsx` | scanStatus 값을 `AppHeader`↔`HomeExperience` 사이에 전달하는 Context | 없음 | 없음 | **KEEP** | 순수 유틸리티, 시각 요소 0, 로직 정확 | NO_CHANGE(단, §9 AI summary 신규 도입 시 scan-status 중복 표시 위험은 §17에서 별도 확인) |
| 16 | `packages/ui/components/home/HomeSessionBanner.tsx` | guest/expired 배너(제목+본문+로그인 CTA) | `T.home.session.*` | 없음 | **REWIRE** | H1 미언급 파일(직접 실측으로 발견) — 로직 단순·정확, 현재 스타일(`rounded-lux-xl`/`shadow-lux-soft`)이 새 카드 지오메트리 방향과 충돌 없어 보임 | 로직 보존, 카드 시각만 새 카드 스타일과 정합 확인(경미) |
| 17 | `packages/ui/lib/format-usdt.ts` | 순수 포맷터 | 없음 | 없음 | **KEEP** | 순수 함수, 시각/기능 변경 대상 아님 | NO_CHANGE |
| 18 | `packages/ui/components/lux/HomePayoutCounter.tsx` / `LivePayoutTicker.tsx` | 카운터/티커(현재 `mode="off"`) | Growth 도메인, C01 lock | 없음 | **KEEP** | H1과 동일. `verify:home-live-wire`가 `data-ledger-unit="count"`·USDT suffix 금지를 하드 검사 — 절대 건드리지 않음 | NO_CHANGE |
| 19 | `packages/ui/components/loop/DayPulse.tsx`(sr-only 렌더) | DayPulse 데이터 sr-only 표시 | `DayPulseModel` | 없음 | **KEEP** | 시각 영향 0(`sr-only`), 기능 유지 | NO_CHANGE |
| 20 | `packages/ui/components/product/ProductImage.tsx` | 상품 이미지 adapter(카드/썸네일 variant) | `assetImageUrl`/`assetIcon`/`assetImageSource` | 없음 | **KEEP**(H5 §16 REUSE) | 신규 제작 불필요, 기존 adapter로 충분 | NO_CHANGE |
| 21 | `packages/ui/components/trust/MarketPartnerTrustStrip.tsx` | 파트너 신뢰 스트립(§38.10) | Brand markets manifest | 없음 | **REWIRE** | 존재·로직 보존, `BalanceAwareHome` 내 배치 위치만 새 레이아웃에 맞게 이동 가능 | 보존, 배치 위치만 H7 결정 |
| 22 | `apps/web/lib/opportunity-card-map.ts` | Nest feed item → `OpportunityCardModel` pass-through 매퍼 | `OpportunityFeedItem`(`Record<string,unknown>`) | 없음 | **REWIRE** | 실측: `estimatedDurationSec`는 Nest 응답에 **실제로 도달**(`opportunities.user.service.ts:362`)하나 이 매퍼가 **읽지 않음**(진짜 순수 gap, 백엔드 변경 불필요) | MODIFY(1개 필드 추가 매핑: `item.estimatedDurationSec` → `estimatedDurationSec`, 기존 매핑 100% 보존) |
| 23 | `packages/ui/components/opportunity/opportunity-types.ts`(`OpportunityCardModel`) | 카드 데이터 타입 | 없음 | 없음 | **REWIRE** | `estimatedDurationSec?: number` 필드가 타입에 없음(신규 optional 필드 추가만, breaking 아님) | MODIFY(optional 필드 1개 추가) |
| 24 | `packages/ui/brand/assets/ai/avatar-512.png` | 현재 AppHeader 기본 아바타 + brand manifest `peotteok_avatar` 라벨 | 없음 | AppHeader(전역), 잠재적으로 신규 AI summary(사용 안 함 확정, §19) | **REPLACE**(Home AI 신규 자산으로 대체 대상) | ADR-018 §13 재확인 · 단, 전역 AppHeader fallback 교체는 별도 결정(§19) | 제작 후(Part B) Home AI summary/discovery 슬롯에만 신규 자산 적용 — AppHeader 전역 fallback은 별건 |
| 25 | `packages/ui/brand/assets/ai/hero-illustration-{desktop,mobile}.{webp,avif}` | 현재 Home Hero 삽화 | 없음 | `HomeHeroIllustration.tsx` | **REPLACE** | ADR-018 §13 재확인, Home 전용(다른 라우트 미사용 확인) | 제작 후(Part B) 신규 asset로 교체, 파일 자체는 §17 목록에서 REMOVE 검토 |

---

## 4. KEEP Matrix (요약)

```text
apps/web/app/page.tsx
packages/ui/components/shell/SiteFooter.tsx                 (H1: INVESTIGATE → 정정: KEEP)
packages/ui/components/shell/HomeChromeContext.tsx
packages/ui/lib/format-usdt.ts
packages/ui/components/lux/HomePayoutCounter.tsx / LivePayoutTicker.tsx
packages/ui/components/loop/DayPulse.tsx (sr-only render)
packages/ui/components/product/ProductImage.tsx
packages/ui/components/opportunity/CategoryFilterChips.tsx (파일 자체만 — /profits 공유)
```

## 5. REWIRE Matrix (요약)

```text
apps/web/app/HomePageClient.tsx                              (+itemCount 배선 추가)
packages/ui/components/opportunity/HomePrincipalRail.tsx      (+actual-profit·withdraw sub-slot 추가)
packages/ui/components/opportunity/OpportunityCard.tsx        (데이터 바인딩만 · skin은 REPLACE)
packages/ui/components/opportunity/BalanceAwareHome.tsx §7a/7e (hero선택·bucket·nearMiss·partnerTrust·sticky)
packages/ui/components/home/HomeRightRail.tsx                 (COUNT 그리드 레이아웃만)
packages/ui/components/shell/AppHeader.tsx                    (전역, 변경 근거 없음 — 사실상 NO_CHANGE에 가까움)
packages/ui/components/shell/BottomNav5.tsx                   (반응형 골격 유지 · 마크만 대기)
packages/ui/components/shell/AppShellRoot.tsx                 (골격만 · 전역 블라스트 주의)
packages/ui/components/home/HomeSessionBanner.tsx             (경미)
packages/ui/components/trust/MarketPartnerTrustStrip.tsx      (배치만)
apps/web/lib/opportunity-card-map.ts                          (+estimatedDurationSec 매핑)
packages/ui/components/opportunity/opportunity-types.ts       (+estimatedDurationSec 필드)
```

## 6. REMOVE_FROM_RUNTIME Matrix (요약 — 파일 삭제 아님, 렌더 호출 제거만)

```text
packages/ui/components/home/HomeHero.tsx              (HomeExperience에서 렌더 호출 제거)
packages/ui/components/home/HomeHeroIllustration.tsx  (동일)
packages/ui/components/opportunity/BalanceAwareHome.tsx §7b scanHero 헤더 블록 (호출부만, 파일은 REWIRE 대상 잔존)
```

## 7. REPLACE Matrix (요약 — 새 프레젠테이션 필요)

```text
packages/ui/components/home/HomeExperience.tsx (조립 JSX)
packages/ui/components/home/HomeHero.tsx + HomeHeroIllustration.tsx (컴포넌트 자체)
packages/ui/components/opportunity/OpportunityCard.tsx (시각 skin)
packages/ui/components/opportunity/BalanceAwareHome.tsx §7b/§7d (scanHero 헤더 · 카테고리 노출 방식)
packages/ui/brand/assets/ai/avatar-512.png / hero-illustration-* (Home 전용 사용처만)
```

## 8. INVESTIGATE Matrix (요약 — H7 전 별도 결정 필요)

```text
packages/ui/components/opportunity/BalanceAwareHome.tsx §7c peotteokLine (verify 리터럴 보존 방법)
packages/ui/components/opportunity/BalanceAwareHome.tsx §7d CategoryFilterChips 호출 여부/방식
packages/ui/components/home/HomeRightRail.tsx Zone B(개별 참여 스테퍼) 데이터 축
packages/ui/components/shell/AppShellRoot.tsx data-shell-geometry 리터럴 + 전역 블라스트 범위
packages/ui/components/shell/BottomNav5.tsx 인라인 ✦ 마크 대체 여부(브랜드 결정 대기)
```

---

## 9. Desktop Implementation Mapping (`home-visual-desktop`)

| H5 요소 | 판정 | 근거 |
|---|---|---|
| Left Sidebar | **REWIRE EXISTING COMPONENT**(`BottomNav5` desktop 모드) | 이미 반응형 사이드바 역할 수행(MATCH IA) |
| Main content area(컨테이너) | **REWIRE EXISTING COMPONENT**(`home-dashboard-grid`/`home-dashboard-main` CSS 클래스 구조) | 그리드 컨셉 자체는 유지, 내부 순서만 재배치 |
| Greeting | **NEW PRESENTATION COMPONENT REQUIRED** | 현재 이런 블록 자체가 없음(H4 §8 확인) |
| AI summary(로봇+3-stat) | **NEW PRESENTATION COMPONENT REQUIRED** | 현재 `peotteok` 텍스트 1줄뿐 — 카드+로봇+3-stat 구조 없음. 3-stat 중 `발견한 기회 건수`는 `itemCount`(배선만 필요)로 READY 근접, 나머지 2개는 서버 집계 자체가 없음(§13) |
| Asset(Money) summary | **REWIRE EXISTING COMPONENT**(`HomePrincipalRail`) | 원금/예상수익 기반 견고, sub-slot 추가만 필요 |
| principal 슬롯 | **REWIRE EXISTING COMPONENT** | 이미 존재·정확 |
| estimated profit 슬롯 | **REWIRE EXISTING COMPONENT** | 이미 존재·정확 |
| actual profit 슬롯 | **NEW PRESENTATION COMPONENT REQUIRED**(단, §11 결정 전까지 데이터리스) | 현재 슬롯 자체가 없음 · 바인딩 금지(§11) |
| Opportunity discovery 섹션 | **NEW PRESENTATION COMPONENT REQUIRED** | 현재 `scanHero` 텍스트뿐, 로봇+그래픽 없음 |
| 3 category cards | **REWIRE EXISTING COMPONENT**(데이터/카드) + **NEW PRESENTATION COMPONENT REQUIRED**(동시노출 레이아웃) | 데이터 이미 충분(MATCH), 레이아웃(단일필터→3동시)만 신규 |
| Right Rail(컨테이너) | **REWIRE EXISTING COMPONENT**(`HomeRightRail`) | 내부 재배치만 |
| progress/state — COUNT(Zone A) | **REWIRE EXISTING COMPONENT** | C01 lock 그대로 |
| progress/state — 개별 스테퍼(Zone B) | **INVESTIGATE** | 데이터 축 미확정(§18) |
| update 슬롯 | **REWIRE EXISTING COMPONENT**(위치)+ 데이터 결정(§14) | 위치는 기존 rail 패턴 재사용 |
| trust content | **NEW PRESENTATION COMPONENT REQUIRED**(콘텐츠) but 카드 스타일은 REWIRE(기존 `home-money-card` 클래스 관행) | 신규 카피, 기존 시각 관행 재사용 |
| insight entry | **NEW PRESENTATION COMPONENT REQUIRED**(티저 UI) + **REUSE EXISTING ROUTE**(`/me/guide/market-weekly`, 실측 확인 — 실 구현 존재) | 링크 대상은 이미 살아있음 |

---

## 10. Mobile Implementation Mapping (`home-visual-mobile`)

Desktop CSS 축소가 아니라 **독립 매핑**(H5 §3 원칙 재확인).

| H5 요소 | 판정 | 근거 |
|---|---|---|
| Mobile Header | **REUSE EXISTING COMPONENT**(`AppHeader`) | 전역 컴포넌트, 이미 반응형(MATCH) |
| Greeting / AI summary | **NEW PRESENTATION COMPONENT REQUIRED**(Desktop과 **같은 컴포넌트**, 배치 prop/CSS만 다름) | 공유 컴포넌트 + device-specific 배치 원칙(§17 responsive) |
| Large asset summary | **REWIRE EXISTING COMPONENT**(`HomePrincipalRail`, 이미 `home-money-grid` 반응형 클래스 보유) | Desktop과 동일 컴포넌트, 이미 모바일 대응 CSS 존재 |
| deposit 컨트롤 | **REUSE EXISTING COMPONENT**(`T.feed.ctaDeposit` Link) | 변경 불필요 |
| withdraw 컨트롤 | **NEW PRESENTATION COMPONENT REQUIRED**(트리거만) + **REUSE EXISTING MUTATION**(`createWithdraw`, `@aipo/sdk/wallet`) | §15에서 "신규 트리거는 `/wallet/withdraw`로의 **내비게이션 링크**로 구현"을 권고(step-up 챌린지 UI 중복 방지) |
| dominant featured opportunity | **REWIRE EXISTING COMPONENT**(`hero=affordable[0]` 로직) + **NEW PRESENTATION COMPONENT REQUIRED**(지배적 시각 처리) | 데이터 MATCH, 시각 강조만 신규 |
| carousel intent | **NEW PRESENTATION COMPONENT REQUIRED** | 현재 캐러셀/스와이프 메커니즘 전무(단순 `<ul>` 그리드) |
| update/trust presentation | **NEW PRESENTATION COMPONENT REQUIRED**(2열 압축 레이아웃) | Desktop 4-zone rail과 다른 레이아웃, 콘텐츠는 공유 |
| BottomNav5 | **REUSE EXISTING COMPONENT** | 이미 모바일 바텀내비 그 자체(MATCH, 변경 불필요) |

**공유 가능 기능 배선(Desktop/Mobile 공통, 프레젠테이션만 분리):** 4개 fetch(`HomePageClient`) · `hero=affordable[0]` 선택 로직 · bucket 분류 · `HomePrincipalRail` 데이터 props · `createWithdraw`/`T.feed.ctaDeposit` 액션 · IA 라벨/href. 이 배선을 Desktop/Mobile 각각 다시 구현하지 않는다(중복 fetch/중복 mutation 금지, Safety-B).

---

## 11. Actual Profit — Critical Blocker Handling

```text
ACTUAL_PROFIT_VISUAL_SLOT     = APPROVED   (H5 §9.3 승계)
ACTUAL_PROFIT_RUNTIME_BINDING = UNRESOLVED (H4 §5 승계 · 본 문서로 해소 0)
```

| 항목 | 실측 |
|---|---|
| 바인딩이 필요할 컴포넌트/wire | `HomePrincipalRail.tsx`(§3 #6) 내 신규 sub-slot · 상위로는 `HomeExperience`→`HomePageClient`→`fetchHomeReadModel`(`HomeReadModelResponse`) 체인 |
| forbidden-key guard 위치 | `services/api-nest/src/wallet/home-money-read.map.ts` `FORBIDDEN_RESPONSE_KEYS`(`profitUsdt` 포함) → `assertHomeMoneyReadForbiddenKeys()`가 해당 키 존재 시 **throw**(실측 확인, 코드 인용 완료) |
| H7 전 필요한 계약 결정 | (1) "실제 수익"의 시간 범위(오늘 vs 전체 누적) Founder/Money-owner 확정 (2) 전체누적이면 위 guard 해제 승인(Money 도메인 소유) (3) 오늘범위면 신규 일일집계 read-model 승인 — **셋 다 H6/H7 권한 밖** |
| 데이터리스 슬롯 유지 가능성 | **가능.** `HomePrincipalRail`은 이미 `absent≠0`/`factState` 패턴(`principal`/`profit` article 모두 `ready`/`guest`/`absent`/`loading` 4-state)을 갖고 있음 — 신규 actual-profit article도 동일 패턴으로 "데이터 없음" 상태를 정직하게 표시 가능(가짜 zero 없이) |
| Fake zero / 하드코딩 / 파생값 발명 | **0** — 본 문서·H7 모두 금지 유지 |

**판정:**

```text
H7_PREREQUISITE_DECISION_REQUIRED — 위 (1)(2)/(3) Founder/Money-owner 결정
```

이 결정이 나기 전까지 H7은 actual-profit **슬롯의 존재(레이아웃·타이포·위계)** 는 구현할 수 있으나, **숫자 데이터는 렌더하지 않는다**(플레이스홀더 숫자·가짜 zero 금지 — "준비 중"류의 정직한 absent 상태만 허용). §23에서 `READY_WITH_PRE_H7_DECISION`으로 게이트 분류.

---

## 12. KRW Primary / USDT Secondary — Implementation Boundary

| 항목 | 실측 |
|---|---|
| 현재 USDT 소스 | `HomeReadModelResponse.money.principalUsdt`(Money `WalletBuckets.principalUsdt`) — 실측 정확 |
| 기존 KRW/FX 인프라 | `services/api-nest/src/opportunities/fx-snapshot.service.ts` — Frankfurter 기반, **"fail closed rather than fabricate a KRW display rate"**(주석 원문 확인) · `usd_krw_frank` 컬럼, `rate_provenance` 기록 |
| Home이 기대하는 KRW 필드 | `HomeExperience`/`HomePrincipalRail` props에 `principalKrwApprox?: string \| null` **이미 존재**(컴포넌트 시그니처 확인) — 즉 프론트 소비 지점은 이미 준비됨 |
| 배선 누락 지점(정확) | `HomeReadModelResponse` 타입 자체에 `principalKrwApprox` 필드가 **없음**(`packages/sdk/src/home-read-model/types.ts` 실측) → `HomePageClient`가 채울 방법이 원천적으로 없음. 이는 "클라이언트가 안 읽음" 문제가 아니라 **서버 응답 스키마에 필드가 없는** 문제 |
| Fail-safe 동작(현재 실제 동작) | `HomePrincipalRail`이 `principalKrwApprox`가 null/undefined면 **자동으로 USDT-primary 렌더로 폴백**(`T.feed.balanceUsdtPrimary`) — 이미 정확히 동작 중, 깨진 상태 아님 |
| FX 불가 시 프레젠테이션 | 기존 fail-safe(USDT-primary) 그대로 유지 — 새 "FX unavailable" 전용 UI 상태를 발명하지 않는다(§16 참고) |

**판정:** KRW-primary "완전 구현"은 **서버 스키마 확장**(`HomeReadModelResponse.money.principalKrwApprox` 추가 + `fx-snapshot.service.ts` 소비)이 필요하며 이는 H6/H7 UI 권한 밖(Money-adjacent 신규 API 필드 — 별도 L2 변경). **H7은 지금 당장 아무것도 깨지지 않는다** — 현재 fail-safe(USDT-primary)가 이미 안전한 기본값이므로, KRW 배선 전에도 Home UI는 정상 동작한다. §23에서 `READY`(fail-safe 경로)로 게이트 분류, 완전 KRW-primary는 별도 Money-adjacent 트랙.

---

## 13. Opportunity Data Mapping — Gaps/Boundaries

| 요소 | 소스(실측) | 경계 |
|---|---|---|
| opportunity items/category/requiredCapital/expectedProfit/aiConfidence | `OpportunityFeedResponse.items` → `toOpportunityCardModel()` → `OpportunityCardModel` | MATCH, 변경 불필요 |
| `itemCount` | `HomeReadModelResponse.opportunity.itemCount`(서버 존재) → `HomePageClient`가 읽지 않음(순수 클라 gap) | **READY**(gap-only, 배선만 추가) |
| `estimatedDurationSec` | Nest `opportunities.user.service.ts:362`에서 응답에 실제 포함 → `opportunity-card-map.ts`/`OpportunityCardModel` 둘 다 미매핑(순수 클라 gap, 백엔드 변경 0) | **READY**(gap-only, §3 #22/#23 반영) |
| 평균 수익률(%) 집계 | 서버 어디에도 필드 없음(그렙 0건, `packages/sdk/src` 전체 확인) | **BLOCKED for 실データ** — 신규 서버 집계 필요(H6/H7 권한 밖). H7은 이 stat을 **생략하거나 absent 상태로만** 표시 가능(발명 금지) |
| 평균 처리시간 집계 | 개별 `estimatedDurationSec`는 있으나 **집계(평균)** 필드는 없음 | **BLOCKED for 집계값** — 개별 값 표시는 READY, 평균은 서버 집계 필요 |
| featured opportunity 선택 | `BalanceAwareHome`의 `hero = affordable[0]` | MATCH, 변경 불필요 |

**서버 집계가 필요하다고 판단되는 항목(명시적 flag, H6/H7에서 생성하지 않음):**

```text
opportunity.averageMarginPercent(가칭) — 없음, 신규 서버 필드 필요
opportunity.averageEstimatedDurationSec(가칭) — 없음, 신규 서버 필드 필요
```

---

## 14. Update Slot — Implementation Decision

H5가 승계한 3개 후보(`DayPulseResponse.asOf` / `scanIdle` / `scanEmpty`) 중 실제 데이터 가용성을 재확인한 결과, **결정적으로 유효한 단일 옵션이 아니라 상태별 폴백 체인**이 안전하다(허구 스케줄 미발명, 기존 필드만 사용):

```text
IF DayPulse fetch 성공 && pulse.asOf 존재       → "최근 확인: {asOf 표시}" (DayPulseResponse.asOf)
ELSE IF viewState === "ready_empty"/"loading"   → T.home.header.scanEmpty ("오늘 요약 준비 중")
ELSE (guest/expired/error/기타)                  → T.home.header.scanIdle ("AI가 기회를 살펴보는 중")
```

이 폴백 체인은 기존 3개 필드/카피 조합만 사용하며 새 스케줄러·새 backend truth를 만들지 않는다. **오늘 오후 2:00 리터럴은 이 결정에도 등장하지 않는다**(영구 배제). H7은 이 체인을 그대로 구현하면 되며, 추가 결정 불필요 — §23에서 `READY`로 분류.

---

## 15. CTA / Action Ownership

| Action | 기존 handler/mutation(실측) | 신규 프레젠테이션 트리거 | 중복 위험 통제 |
|---|---|---|---|
| 입금(deposit) | `Link href="/wallet/deposit"`(`T.feed.ctaDeposit`, `HomePrincipalRail`) | 없음(재사용) | 신규 버튼 추가 금지 — 위치만 새 카드로 이동 |
| 출금(withdraw) | `createWithdraw()`(`@aipo/sdk/wallet`, step-up 별도) — Home에 진입점 없음 | **신규**: Home Asset summary 내 버튼 | **권고: 인라인 mutation이 아니라 `/wallet/withdraw` 내비게이션 링크로 구현**(step-up UI 중복 구현 방지, Safety-B) — H7 최종 결정 |
| 기회 탐색/이동 | `HomeHero` cta(`#home-opportunity`) · discovery 티저(신규) · 카드 클릭(`/profits/[id]`) | 신규 discovery 티저 CTA | **3개 후보가 이미/앞으로 공존** → H7에서 **단일 활성 CTA**로 통합 필수(§2 Safety-B) |
| 참여(수익 벌기) | `OpportunityCard` `data-action="participate"` · mobile sticky(`home-sticky-cta`) | 없음(재사용) | 기존에도 "PC 카드 내부 1개 + Mobile sticky 1개"로 **이미 분리 설계**(동시 노출 아님) — 유지 |
| 알림(notification) | `AppHeader notificationHref="/me/inbox"`(실 구현 확인) | 없음 | 재사용 |
| 퍼뜩 AI 진입 | `/me/peotteok`(실 구현 확인, route 존재) — Home에 링크 없음 | H5가 신규 진입점을 요구하지 않음(Master에 명시 없음) | **추가하지 않음**(발명 금지 원칙 유지) |
| 퍼뜩 인사이트 진입 | `/me/guide/market-weekly`(실 구현 확인) — Home teaser 없음 | 신규 티저 카드 CTA | 신규 mutation 없음(순수 네비게이션), 중복 위험 없음 |

**H7 필수 결과:** 위 표의 "3개 후보 공존" 지점을 **단일 활성 CTA**로 정리한 최종 CTA 지도 — 이는 이 문서가 확정하지 않고 H7 실행 시점에 코드로 확정한다(계획만 승인).

---

## 16. State Implementation Contract

| 상태 | data owner | presentation owner | 재사용 컴포넌트/state | 신규 요구 | 금지되는 가짜 fallback |
|---|---|---|---|---|---|
| loading | `HomePageClient`(`viewState="loading"` 로컬) | `HomeExperience`/자식 전체 | 기존 `viewState` prop 전파 | 없음(기존 패턴 재사용) | 로딩 중 원금 `0` 표시 금지(기존 `moneyStateAllowsValue` 가드 유지) |
| ready_data | `HomeReadModelResponse.viewState` | 전체 | 기존 | 없음 | — |
| ready_empty | 동일 | `BalanceAwareHome` empty 분기(기존) | 기존 `emptyCopy` 로직 | 없음 | mock opportunity로 empty 채우기 금지(기존 forbidden) |
| partial_data | 섹션별 독립 state(`money.state`/`opportunity.state`)로 사실상 표현(H4 §11) | 각 컴포넌트 섹션 단위 | 기존 섹션별 조건부 렌더 | 신규 top-level enum 발명 금지(H4 재확인) | 섹션 일부만 준비됐는데 전체를 ready로 위장 금지 |
| error(`recoverable_error`) | 동일 | `BalanceAwareHome`/`HomePrincipalRail` 각자의 absent 처리 | 기존 | 없음 | 에러를 empty로 위장 금지 |
| session expired | `sessionStatus="expired"` + `sessionBanner` | `HomeSessionBanner` | 기존 그대로 | 새 카드 스타일 정합만(경미, §3 #16) | — |
| wallet unavailable | `money: null`(독립) | `HomePrincipalRail` absent 분기 | 기존 | actual-profit 신규 슬롯도 동일 absent 패턴 적용(§11) | — |
| opportunity unavailable | `opportunity: null`(독립) | `BalanceAwareHome` | 기존 | 없음 | — |
| FX unavailable | **전용 슬롯 없음**(§12) | `HomePrincipalRail`의 기존 USDT-primary fallback이 사실상 이 상태를 흡수 | 기존 fallback 재사용 | 신규 "FX 불가" 전용 UI 상태 발명 금지 | 임의 환율로 KRW 표시 금지(`fake_krw_rate` forbidden 불변) |

---

## 17. Responsive Implementation Strategy

- **Sidebar↔BottomNav 전환**: `BottomNav5.tsx`의 기존 반응형 CSS 클래스 체계(`md:` 접두사 브레이크포인트)를 그대로 재사용한다. 새 px 임계값을 H6/H7이 발명하지 않는다 — 기존 구현값을 그대로 유지(정확한 값 재확인은 CSS 파일 실측이나, 클래스명 자체가 이미 Tailwind `md`(`packages/ui/tokens/breakpoints.ts` `md=768`) 컨벤션을 따름).
- **RightRail 콘텐츠 리플로우**: Desktop 전용 컬럼 → Mobile은 `HomeRightRail`을 아예 마운트하지 않고, 그 콘텐츠(Update/Trust)를 Mobile 전용 2열 압축 컴포넌트로 별도 마운트한다(같은 컴포넌트를 CSS로 숨기는 방식이 아니라, §10처럼 device-specific 프레젠테이션 컴포넌트 분리를 권장 — 중복 마운트/중복 fetch 없이 데이터만 공유).
- **Desktop 3-카드 영역 ↔ Mobile 지배카드/캐러셀**: 완전히 분리된 프레젠테이션 컴포넌트 트리(§10) — CSS `display:none` 트릭으로 두 마크업을 동시에 DOM에 렌더하지 않는다(Safety-C, 중복 DOM 방지 및 접근성 트리 오염 방지).
- **Sticky/fixed 요소**: 현재 Mobile sticky CTA(`bottom: calc(3.5rem + env(safe-area-inset-bottom,0px))`)가 이미 `safe-area-inset-bottom`을 고려 중(실측 확인) — 이 패턴을 새 단일 CTA 체계(§15)에도 재사용한다.
- **Overflow**: Desktop 3-카드 그리드는 고정 3-up(가로 스크롤 없음), Mobile 캐러셀은 의도된 가로 스와이프(§14 H5 재확인) — 구현 시 `overflow-x` 스크롤 컨테이너 + dot indicator 동기화가 필요(신규 컴포넌트, §10).
- **터치 레이아웃**: 기존 `touch-target` 유틸리티 클래스(AppHeader/BottomNav5에서 이미 사용 확인)를 새 인터랙션 요소(carousel dot, 신규 withdraw 버튼)에도 동일 적용.
- 제3의 태블릿 전용 디자인을 발명하지 않는다(H5 §14 재확인) — 두 authority 사이의 브레이크포인트 전환만 구현.

CSS 작성은 본 문서 범위 밖(H7).

---

## 18. Accessibility Implementation Handoff

| H5 요건 | H7 구현 요구사항(계획만) |
|---|---|
| 포커스 가시성 | 신규 인터랙션 요소(AI summary 카드 내부 링크, carousel dot, withdraw 버튼) 전부 기존 `:focus-visible` 컨벤션 상속 확인 필요 — 신규 focus 스타일 시스템 발명 금지 |
| 시맨틱 내비게이션 | Greeting=`<h1>`/AI summary=`<h2>` 등 기존 `BalanceAwareHome`의 heading 레벨 관행(`scanHero`가 `<h1>`이었음, 대체 시 heading 레벨 승계 필요 — 현재 `h1`이 `BalanceAwareHome`에 있었으므로 신규 Greeting/AI summary 배치 시 어느 블록이 `h1`을 갖는지 H7이 명시 결정) |
| 키보드 조작성 | carousel(신규)은 키보드 화살표/tab 이동 가능해야 함 — 신규 캐러셀 컴포넌트 요구사항에 포함(§16 자산 매트릭스와 별개로 컴포넌트 요구사항) |
| 터치 타깃 최소 | 기존 `touch-target` 클래스 재사용(§17) |
| 텍스트 확대 | 기존 `fontScale` 토큰 재사용, 신규 컴포넌트도 동일 스케일 상속 |
| 모션 감소 | 신규 carousel 자동전환(있다면)·AI summary 로봇 진입 애니메이션은 `prefers-reduced-motion` 분기 필수 — 기존 `MotionCTA`가 이미 이 패턴을 가지고 있어(사용처 확인됨) 동일 유틸 재사용 권장 |
| 색만으로 전달 금지 | actual/estimated profit "+" 기호 유지(기존 `OpportunityCard`의 `+{expectedProfitUsdt}` 패턴 이미 존재, 신규 슬롯도 동일 관행 승계) |
| 이미지 alt | `ProductImage`(기존)는 이미 `alt` prop 필수 구조 — 신규 AI robot 자산도 동일 패턴(`assetImageAltKo` 관행) 적용 필요 |
| carousel 접근성(유지 시) | `aria-live`/`role="group"` 및 dot 버튼 각각의 `aria-label`(예: "N번째 기회로 이동") 신규 요구사항으로 등재 |

구현은 H7. 본 절은 요구사항 승계만.

---

## 19. Asset Implementation Matrix (최종 · 생성 0)

| Asset | Desktop 사용 | Mobile 사용 | 공유/기기전용 | 요구 치수/비율 의도 | 투명도 | 반응형 동작 | Fallback 정책 | 구현 소비자 |
|---|---|---|---|---|---|---|---|---|
| `peotteok-ai-robot-home-summary-v1` | AI summary 카드 내 로봇 | 동일(1열 재배치) | 공유(동일 identity) | `PENDING_CALIBRATION_FROM_MASTER`(정사각/세로 비율 등 Master 재측정 필요) | 필요(카드 배경과 합성) | 신규 AI summary 컴포넌트 내부, `HomeHeroIllustration`의 `<picture>` desktop/mobile 소스 전환 **기법** 재사용 검토 | **NO PLACEHOLDER RUNTIME** — 자산 없으면 `MISSING_VISUAL_ASSET` 마킹, 레이아웃 공간만 보존 | 신규 `HomeAiSummary`(가칭) 컴포넌트 |
| `peotteok-ai-robot-home-cta-v1` | Discovery 티저 로봇 | 동일 | 공유 | `PENDING_CALIBRATION_FROM_MASTER` | 필요 | 동일 기법 | 동일 | 신규 `HomeOpportunityDiscovery`(가칭) 컴포넌트 |
| `peotteok-home-hero-support-graphic-v1` | Greeting/AI summary 보조 그래픽 | Desktop/Mobile 별도 필요 여부 미확정(H5 §16 승계) | 자산 제작 단계에서 확정 | `PENDING_CALIBRATION_FROM_MASTER` | 상황에 따라 | 동일 기법 후보 | 동일 | 위와 동일 컴포넌트군 |
| Featured opportunity 대표 이미지 | 3-카드 각각 | 1-지배 카드 | 공유 | 기존 `ProductImage` variant(`card`/`thumb`) 규격 그대로 | 기존 정책 그대로 | 기존 adapter 그대로 | 기존 정책 그대로(신규 자산 아님) | `OpportunityCard`/`HomeRightRail`(기존 소비자 유지) |
| Trust 보조 일러스트 | 선택적 | 선택적 | 미확정 | 해당 없음(DEFER) | 해당 없음 | 해당 없음 | 텍스트만으로 대체 가능(H5 §16 확인) — 자산 없이도 H7 완결 가능 | 신규 Trust 카드(텍스트만이면 자산 소비자 없음) |
| 퍼뜩 인사이트 아이콘 | 인사이트 티저 | 동일 | 공유(추정) | Brand Kit 기존 벡터 재사용 우선 검토(신규 제작 기본값 아님) | 해당 없음(벡터 재사용 시) | 해당 없음 | 아이콘 없이 텍스트 링크만으로도 H7 완결 가능 | 신규 Insight 티저 컴포넌트 |

**금지 재확인:** emoji robot · cheap SVG · CSS-built mascot · clipart · random external image · legacy dark avatar(`avatar-512.png`) 강제 재사용 — **NO PLACEHOLDER RUNTIME**, 자산 확정 전 H7이 해당 슬롯을 빈 자리로 두는 것은 허용되나 저품질 대체물로 채우는 것은 금지.

Brand Assets Part B(`redesign-r1-home-visual-asset-production`)는 본 문서 완료 후에도 **착수하지 않는다**(선행조건: H6 completed — 본 문서로 충족되었으나, 실제 착수는 YAML 순서상 H6.5 다음·H7 이전 위치에서 별도로 진행).

---

## 20. Legacy Removal Plan (H7 체크리스트 · 실행은 H7)

| 대상 | 분류 | 근거 |
|---|---|---|
| Legacy Hero(`HomeHero.tsx` 4단 타임라인) | **REMOVE**(렌더 호출) | §3 #4, H5 신규 Master에 대응 없음 |
| Legacy illustration(robot+globe, `HomeHeroIllustration.tsx`) | **REMOVE**(렌더 호출) + 자산 교체 대기 | §3 #5 |
| Legacy avatar(`avatar-512.png`) | **INVESTIGATE**(전역 AppHeader vs Home 전용 사용 분리 필요) | §3 #24, §19 |
| Old Sidebar 프레젠테이션 | **KEEP 골격 / REWIRE 스킨** | `BottomNav5`가 이미 반응형 사이드바 — 전면 교체 대상 아님 |
| Old Header 프레젠테이션 | **KEEP**(변경 근거 없음, 전역) | §3 #12 |
| Old RightRail 프레젠테이션 | **REWIRE**(레이아웃 재배치, COUNT 로직 보존) | §3 #10 |
| Old opportunity cards(스킨) | **REPLACE**(스킨) / **REWIRE**(바인딩) | §3 #8 |
| Old Mobile 프레젠테이션(단일 그리드, 캐러셀 없음) | **REPLACE** | §10 |
| Old BottomNav 중복 위험 | **없음 확인**(단일 반응형 컴포넌트, 중복 인스턴스 없음) | §3 #13 |
| Old CSS/classes(`home-hero__*`, `home-dashboard-grid` 등) | **INVESTIGATE**(H7이 재사용 가능한 이름은 유지, Hero 전용 클래스는 REMOVE 대상) | 실제 CSS 파일(`lux-theme.css`/`component.css`) 정밀 대조는 H7 |
| Old imports(`HomeHero`/`HomeHeroIllustration` import 문) | **REMOVE**(HomeExperience 교체 시 자동 제거) | §3 #3/#4/#5 |
| Old actions bound only to legacy presentation | **없음 확인** — 실측 결과 모든 액션(deposit/participate/notification)이 데이터 계층에 바인딩되어 있고 legacy presentation에만 종속된 액션은 발견되지 않음 | §15 |

H7은 이 표의 REMOVE 항목이 **새 프레젠테이션 배포 후에도 렌더 트리에 남아있지 않음**을 확인해야 한다(Safety-C).

---

## 21. H7 File-Level Implementation Plan (실행 0 · 계획만)

| 파일 | 액션 | 최소 diff 의도 |
|---|---|---|
| `apps/web/app/HomePageClient.tsx` | **MODIFY** | `opportunity.itemCount` 추출 1줄 + prop 전달 1줄 추가만. fetch/session 로직 무변경 |
| `packages/ui/components/home/HomeExperience.tsx` | **MODIFY** | 숨김 슬롯(ticker/DayPulse/counter)+컨텍스트 훅 보존, `home-dashboard-grid` 내부 JSX만 신규 구성으로 교체 |
| `packages/ui/components/home/HomeHero.tsx` | **DELETE/REMOVE_RUNTIME_REFERENCE** | `HomeExperience`에서 import+렌더 제거. 파일 삭제 여부는 H7이 최종 판단(다른 참조 0 확인됨) |
| `packages/ui/components/home/HomeHeroIllustration.tsx` | **DELETE/REMOVE_RUNTIME_REFERENCE** | 동일 |
| `packages/ui/components/opportunity/HomePrincipalRail.tsx` | **MODIFY** | 기존 2-article 구조에 actual-profit article(데이터리스) + withdraw CTA 링크 추가 |
| `packages/ui/components/opportunity/BalanceAwareHome.tsx` | **MODIFY** | `scanHero` 헤더 블록 제거, `peotteokLine` 처리 방식 결정 반영(§8 INVESTIGATE), `CategoryFilterChips` 호출 여부 반영, 나머지(hero선택/bucket/nearMiss/trust strip/sticky) 무변경 |
| `packages/ui/components/opportunity/OpportunityCard.tsx` | **MODIFY** | 내부 `data-field` 바인딩 유지, JSX 마크업/클래스 교체, `estimatedDurationSec` 슬롯 추가 |
| `packages/ui/components/opportunity/opportunity-types.ts` | **MODIFY** | `estimatedDurationSec?: number` 필드 추가 |
| `apps/web/lib/opportunity-card-map.ts` | **MODIFY** | `estimatedDurationSec` 매핑 1줄 추가 |
| `packages/ui/components/home/HomeRightRail.tsx` | **MODIFY** | COUNT 그리드 보존, 레이아웃 재배치, update 슬롯 §14 폴백 체인 반영, Zone B는 데이터 축 결정 전 보류 가능 |
| **신규 파일**(가칭, 정확한 이름/위치는 H7) | **CREATE** | `HomeGreeting`, `HomeAiSummary`, `HomeOpportunityDiscovery`, `HomeCategoryGrid`(Desktop 3-카드 동시노출 레이아웃), `HomeFeaturedCarousel`(Mobile), `HomeUpdateTrustCompact`(Mobile 2열), `HomeInsightTeaser` |
| `packages/ui/components/shell/AppShellRoot.tsx` | **NO_CHANGE**(현재 판단) 또는 **MODIFY**(경미, `data-shell-geometry` 리터럴만) | 전역 블라스트 범위 — Home 단독 권한 밖 가능성, Founder 확인 권장 |
| `packages/ui/components/shell/AppHeader.tsx` | **NO_CHANGE** | 변경 근거 없음(§3 #12) |
| `packages/ui/components/shell/BottomNav5.tsx` | **NO_CHANGE**(브랜드 결정 대기) | ✦ 마크 교체는 별도 트리거 필요 |
| `packages/ui/components/shell/SiteFooter.tsx` | **NO_CHANGE** | §3 #14 |
| 기타 KEEP 목록(§4) | **NO_CHANGE** | — |

광범위 재작성(전체 폴더 rewrite, 무관 파일 동시 수정)을 피하고 위 표의 diff만 수행하는 것이 H7의 의무다.

---

## 22. H6.5 Handoff Requirements

H6.5(`redesign-r1-home-contract-sync`)가 착수 시 반드시 검증해야 할 것(본 문서는 이 검증을 수행하지 않음):

```text
1. 기능 필드 ↔ 프레젠테이션 슬롯 일치 — §3/§9/§10의 모든 REWIRE/REPLACE 대상이 H4 factSurface와 충돌 없는지 재대조
2. Desktop/Mobile authority 일치 — home-visual-desktop/home-visual-mobile 두 surfaceId가 H5·H6 전체에서 혼동 없이 유지됐는지
3. Money semantics — 원금/예상수익/실제수익 3-슬롯 분리가 §11/§3 #6 어디에서도 합산되지 않았는지
4. Actual-profit unresolved 상태 — H7_PREREQUISITE_DECISION_REQUIRED가 조용히 해소되지 않았는지(§11)
5. KRW/USDT 위계 — §12의 fail-safe 경로가 §9 Desktop/§10 Mobile 매핑과 일치하는지
6. Opportunity 필드 — itemCount/estimatedDurationSec 배선 계획(§13)이 §9/§10 매핑과 정합하는지
7. Processing-time 동작 — §13/§14 폴백 체인이 §16 접근성 요건(비-색상 전달 등)과 충돌 없는지
8. Update 슬롯 — §14 결정이 실제로 서버 필드 3종만 사용했는지 재검증
9. Asset 요구사항 — §19 매트릭스가 Brand Assets Part B 착수 조건(H6 completed)과 YAML 위치(H6.5 다음·H7 이전)에 정확히 맞물리는지
10. Legacy replacement 안전성 — §20/§21이 Safety-A/B/C 위반 없이 작성됐는지(중복 CTA/셸/fetch 등)
11. CTA ownership — §15의 "3개 후보 공존" 문제가 H6.5 시점까지 실제로 해소되지 않았음(계획 단계임)을 재확인
12. Responsive 동작 — §17이 제3 디자인을 발명하지 않았는지, 기존 브레이크포인트만 재사용했는지
```

H6.5는 위 12개 항목을 **검증**하는 것이며, 본 문서가 대신 수행하지 않는다(착수 금지, Task 지시 재확인).

---

## 23. H7 Entry Gates

| 항목 | 게이트 | 근거 |
|---|---|---|
| Actual profit | **READY_WITH_PRE_H7_DECISION** | 슬롯 레이아웃은 즉시 구현 가능(§11) · 숫자 데이터는 Founder/Money-owner 결정 후에만(H7_PREREQUISITE_DECISION_REQUIRED) |
| KRW wiring | **READY** | 기존 fail-safe(USDT-primary)가 이미 안전 기본값(§12) · 완전 KRW-primary는 별도 Money-adjacent 트랙(H7 비차단) |
| Opportunity count(`itemCount`) | **READY** | 순수 gap-only 클라이언트 배선(§13) |
| Average return 집계(%) | **BLOCKED**(실데이터) / READY(absent-safe 생략 표시) | 서버 필드 자체가 없음(§13) — 신규 서버 집계는 H6/H7 권한 밖 |
| Processing duration(개별값) | **READY** | `estimatedDurationSec` gap-only 배선(§13, §3 #22/#23) |
| Processing duration(카테고리 범위) | **READY_WITH_PRE_H7_DECISION** | 카테고리별 실제 차등 여부 Engine 데이터 재확인 필요(H4 §7 미확증 승계) |
| Update slot | **READY** | §14 폴백 체인 확정(기존 필드 3종만 사용) |
| Assets(로봇 2종+보조 그래픽) | **BLOCKED** | Brand Assets Part B 미착수(H6 completed 조건은 충족했으나 실제 제작은 별도 File-Serial 위치) — H7은 자산 의존 슬롯을 `MISSING_VISUAL_ASSET`로 유지한 채 나머지 진행 가능 |

Money/backend 관련 결정(actual profit 시간범위, KRW 서버 필드, 평균 수익률 집계)은 본 문서 권한 밖이며 여기서 대신 결정하지 않는다.

---

## Document Control

| | |
|---|---|
| Fake binding count | 0 |
| New backend feature invented | 0 |
| Runtime implementation | 0 |
| React/CSS 변경 | 0 |
| H1 preview 대비 정정된 분류 | SiteFooter(INVESTIGATE→KEEP) · BalanceAwareHome(단일 REWIRE→세분화 INVESTIGATE) · CategoryFilterChips(파일 KEEP 유지·Home 호출부만 INVESTIGATE로 정밀화) · BrandMark.tsx는 Home 렌더 경로에 없음(별도 발견) |
| Desktop surfaceId | `home-visual-desktop` |
| Mobile surfaceId | `home-visual-mobile` |
| H6.5/H7/Brand Assets Part B/Visual Lock started by this document | NO |
| Next authorized step | H6.5 contract sync(`redesign-r1-home-contract-sync`) |
