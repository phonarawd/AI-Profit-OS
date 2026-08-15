# Peotteok Home — Product Contract v1 (H4 · Functional Truth)

| | |
|---|---|
| Status | **DRAFT COMPLETE — FUNCTIONAL AUTHORITY REGISTERED** |
| Date | 2026-08-16 |
| Todo | `redesign-r1-home-product-contract` (H4) — `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| Authority class | **Functional Authority** (ADR-018 §3 두 번째 사다리) — Visual Authority(Founder Visual Master/H5/H6)와 분리 |
| Governs | Home(`/`) 화면의 **기능/데이터 진실만**. geometry·색·spacing·hero 배치는 본 문서 범위 밖(H5 Owns) |
| Runtime code changed by this document | **0** |
| Inputs | `peotteok-home-visual-master-intake.v1.md`(H1) §9 Functional Conflict Matrix · `home-visual-v2.wire.json` · `home-principal-slots.wire.json` · 실제 `services/api-nest/src/**` 코드 실측 |
| Next step | H5 New Visual Contract(`redesign-r1-home-visual-contract`) — 본 문서의 FUNCTIONAL_BINDING_REQUIRED/UNRESOLVED 항목을 그대로 승계 |

---

## 0. 이 문서가 하는 일 / 하지 않는 일

```text
한다:   Home에 필요한 각 기능적 사실(Fact)이 실제 backend/코드에 존재하는지 실측 증명
        존재하면 → 정확한 SSOT 필드/경로 기록
        존재하지 않으면 → 발명하지 않고 FUNCTIONAL_BINDING_REQUIRED/UNRESOLVED/NOT_SUPPORTED로 기록

하지 않는다: geometry/색/spacing/hero 배치 설계(H5) · component 매핑(H6) · React/CSS/API/DB 변경 · 새 backend 발명
```

---

## 1. Home Route / State Truth

| 항목 | 실측 |
|---|---|
| Route | `/` — `apps/web/app/page.tsx`(서버 컴포넌트, 세션 쿠키 read) → `HomePageClient.tsx`(클라이언트, fetch 오케스트레이션) → `HomeExperience`(presentation) |
| Session 판단 | `hasUserSessionCookie(cookies())` — 세션 없으면 인증 API 호출 스킵(401 콘솔 잡음 방지) |
| Top-level viewState | `HomeViewState = ready_empty \| ready_data \| stale \| recoverable_error \| blocked \| unauthorized`(+ 클라이언트 로컬 `loading`) — `packages/sdk/src/home-read-model/types.ts` |
| Session sub-status | `HomeSessionStatus = guest \| authenticated \| expired` — `guest`/`expired`는 별도 `sessionBanner`(배너 UI)로 표시, 메인 viewState와 분리된 채널 |
| Guest 처리 | `hasSession=false`면 `fetchHomeReadModel`/`fetchOpportunityFeed`/`fetchDayPulse` 호출 자체를 스킵, `fetchGrowthPublicSurface`만 호출(공개 티커) |
| 401 처리 | 4개 fetch 중 하나라도 401 감지 시 전체를 `unauthorized`+`sessionBanner="expired"`로 전환(부분 인증 불가 원칙) |

**분류: MATCH.** 기존 라우트/세션/뷰스테이트 구조는 새 Visual Master 요구사항과 상충 없음 — H7에서 REWIRE(보존+재연결) 대상.

---

## 2. Data Source Matrix

| Fact 그룹 | Fetch 함수 | 실제 응답 타입 | 소스 서비스(실측) |
|---|---|---|---|
| Home money/opportunity 통합 | `fetchHomeReadModel()` | `HomeReadModelResponse` | `packages/sdk/src/home-read-model` → Nest 조합(Money `home-money-read` + Engine `todayPossibleProfitUsdt`) |
| Opportunity feed(카드 리스트) | `fetchOpportunityFeed()` | `OpportunityFeedResponse` | `services/api-nest/src/opportunities/opportunities.user.service.ts` (`toUserCard`/`projectCapitalProviderUserSurface`) |
| DayPulse(정산 카운트/세이프스톱) | `fetchDayPulse()` | `DayPulseResponse` | Nest `DayPulseService.getToday` |
| Growth 공개 surface(티커/카운터) | `fetchGrowthPublicSurface()` | `GrowthPublicSurfaceResponse` | Growth 도메인(현재 `tickerMode=off`) |
| Wallet 원장 buckets(참고용 · Home 직접소비 금지) | `GET /api/v1/wallet/buckets` | `WalletBucketsView` | `services/api-nest/src/ledger/ledger.buckets.service.ts` — **Home에서 직접 호출하지 않음**(§3 참고) |

**중복 fetch 금지 확인:** 위 4개(HomeReadModel/OpportunityFeed/DayPulse/GrowthPublicSurface)가 Home의 유일한 fetch 경로다. H5/H6/H7에서 새 fetch 경로를 추가하면 Legacy Replacement Safety Gate(Data uniqueness) 위반.

---

## 3. Money Semantics Matrix

| 개념 | SSOT 필드(실측) | 실제 의미(코드 확인) | 현재 Home 노출 |
|---|---|---|---|
| **원금(principal)** | `WalletBuckets.principalUsdt` = `HomeReadModelResponse.money.principalUsdt` | "근무 중 원금" — 참여 재원, profit/locked와 합산 금지(Money §49.2a 잠금) | ✅ 노출(`HomePrincipalRail`) |
| **예상 수익(오늘 가능)** | `HomeReadModelResponse.opportunity.todayPossibleProfitUsdt` / top-level `todayPossibleProfitUsdt` | "affordable" 버킷 기회들의 `expectedProfitUsdt` 합 — **Engine 산출**, `provenance.todayPossibleProfitUsdt.provenance === "server_derived"` | ✅ 노출(`HomePrincipalRail`) |
| **실현/출금가능 수익(전체 누적)** | `WalletBuckets.profitUsdt` | "출금 가능 수익" — `trades.execution.service.ts` `finalizeMatchSuccess()`에서 `MATCH_SUCCESS` 정산마다 `expectedProfitUsdt`를 `profit` bucket에 credit(누적). `POST /wallet/profit/merge`로 principal로 병합 가능 | ❌ Home 미노출 — **§5 참고(하드 가드 존재)** |
| **오늘 정산 건수** | `HomeReadModelResponse.money.settlementCompletedTodayCount` / DayPulse `settlementCompletedToday` | Asia/Seoul 기준 오늘 완료된 settlement **COUNT**(C01 lock, USDT 아님) | ✅ 노출(`HomeRightRail` "오늘 정산") |
| **Locked(진행 중 잠금)** | `WalletBuckets.lockedUsdt` | 참여 중 캐피탈 잠금 | ❌ Home 미노출(원래부터 Home 대상 아님 — `forbiddenWithoutContract: lockedUsdt_home_split`) |
| **Practice** | `WalletBuckets.practiceUsdt` | 연습 자금, 출금/참여 불가 | ❌ Home 미노출(Home 대상 아님) |

**모든 버킷 합계(원금+수익+잠금+연습) = 부채(liability) 불변식** — Home에서 이 4개를 합산해 "총 자산"을 만들지 않는다(기존 `bucket-invariant` 불변식과 별개 축이지만 같은 원칙).

---

## 4. KRW / USDT Binding Rules

| 항목 | 실측 |
|---|---|
| USDT primary(현재 라이브) | `HomePrincipalRail`은 `principalKrwApprox`가 없으면 USDT 단독 표시(`T.feed.balanceUsdtPrimary`) — **현재 런타임 실제 동작** |
| KRW primary(Visual Master 요구) | `HomePrincipalRail`은 이미 `principalKrwApprox` prop을 받아 KRW-primary+USDT-secondary 렌더 분기를 갖고 있음(컴포넌트 로직 존재) |
| **실제 배선 상태** | `HomePageClient.tsx`가 `principalKrwApprox`를 **채우지 않음**(항상 `undefined`→`null`) — 즉 KRW 표시 분기는 코드에 있으나 데이터가 한 번도 도달하지 않음 |
| FX 소스(실측) | `services/api-nest/src/opportunities/fx-snapshot.service.ts` — Frankfurter(`usd_krw_frank`) 등 provider 기반 · `rate_provenance` 기록 · **"fail closed rather than fabricate a KRW display rate"**(스테일 시 실패, 임의 환율 표시 금지) — 현재는 **기회 가격 카드용**으로만 소비, Home 원금 KRW 환산에는 미연결 |
| Fact registry 잠금 | `fact-state-registry`: `principalUsdt`는 KRW 재계산 UI **0**(`fx_recalc_in_ui` 금지 — `home-principal-slots.wire.json forbidden`) |

**분류:**
- USDT secondary = **MATCH**(이미 정확히 이 방향으로 동작)
- KRW primary = **FUNCTIONAL_BINDING_REQUIRED** — FX 인프라(Frankfurter fx-snapshot, fail-closed 정책)는 이미 존재, `principalKrwApprox` 계산·전달 배선만 없음. UI에서 직접 환율 재계산은 금지(`fx_recalc_in_ui`) — 서버가 계산해 `principalKrwApprox`(및 asOf/provenance)로 내려줘야 한다.

---

## 5. Actual vs Estimated Profit Contract — "실제 수익" 정밀 판정

지시받은 대로 이름만 보고 바인딩하지 않고 실제 semantics를 증명한다.

### 5.1 후보 필드 실측

| 후보 | 실측 결과 |
|---|---|
| `WalletBuckets.profitUsdt` | **누적(all-time) 실현·출금가능 수익.** `trades.execution.service.ts:262-271` — 매 `MATCH_SUCCESS` 정산 시 `expectedProfitUsdt`(참여 시점 Engine 산출값)를 `profit` bucket에 **credit**, 감소는 `POST /wallet/profit/merge`(principal로 병합) 또는 출금 시에만. **"오늘"로 범위가 좁혀지지 않는다** — 계정 생성 이후 전체 누적. |
| "오늘의 실현 수익"(today-scoped) | **쿼리 자체가 존재하지 않는다.** 오늘 날짜의 `settlement` journal 중 해당 유저 `profit` bucket credit만 합산하는 별도 집계가 필요 — 현재 어떤 서비스도 이 집계를 제공하지 않음(DayPulse는 COUNT만, `profitUsdt`는 all-time 누적만). |
| `todayPossibleProfitUsdt` | 이미 §3에서 "예상 수익"으로 확정 — **실현되지 않은 예상치**이므로 "실제 수익" 후보 아님(혼동 금지, ADR-018 §16 정책과 동일 축). |
| `FinancialReportBucket.settlementUserProfitUsdt` | `ledger.types.ts` — **Admin 재무 리포트용**(period 단위 집계), 유저 개인 Home Fact 파이프라인과 무관한 별도 축. |

### 5.2 하드 가드 발견 — `profitUsdt`는 Home에 노출이 명시적으로 금지되어 있다

`services/api-nest/src/wallet/home-money-read.map.ts`:

```ts
const FORBIDDEN_RESPONSE_KEYS = [
  "availableUsdt", "todayPossible", "todayPossibleProfitUsdt",
  "profitUsdt", "lockedUsdt", "practiceUsdt", "liabilityUsdt", "ledgerTotal",
] as const;
// assertHomeMoneyReadForbiddenKeys() — 이 키가 있으면 throw
```

`schemas/home-money-read.v1.json` description: *"NEVER: ... **profit/locked sum into Home** ..."*

이것은 "아직 안 배선됨"이 아니라 **런타임에서 능동적으로 막고 있는 하드 가드**다. Money 도메인이 의도적으로 `profitUsdt`를 Home 응답 경로에서 배제해 왔다(다른 도메인이 소유해야 할 필드를 Money의 좁은 Home 엔드포인트가 leak하지 않도록 하는 방어).

### 5.3 판정

```text
FUNCTIONAL_BINDING_UNRESOLVED
```

- `WalletBuckets.profitUsdt`는 실제로 존재하고 "실현/출금가능 수익" 의미가 명확히 증명된다.
- 그러나 (a) Visual Master의 "실제 수익"이 **오늘 범위**인지 **전체 누적**인지 원본 이미지만으로 확정할 수 없고, (b) 설령 전체 누적으로 확정해도 이를 Home에 노출하려면 **기존의 명시적 forbidden-key 가드를 해제하는 결정**이 필요하다 — 이는 H4가 단독으로 내릴 수 없는 결정(가드를 만든 Money 도메인/Founder 승인 필요).
- **가짜 binding을 만들지 않는다.** H5/H6 착수 전 Founder/Money-owner가 다음을 확정해야 한다: (1) "실제 수익"의 시간 범위(오늘 vs 전체누적) (2) 전체누적이면 `profitUsdt`의 Home 노출 가드 해제 승인 (3) 오늘범위면 신규 일일집계 read-model 승인(신규 backend 계산 필요 — API 필드 추가이지 SDK/DB 스키마 재발명은 아님).

---

## 6. Opportunity Binding Contract

| Visual Master 요소 | SSOT(실측) | 분류 |
|---|---|---|
| 카테고리(시계/카드/가방/전체) | `CategoryFilterChips`(`watch`/`trading_card`/`luxury_bag`) — `OpportunityFeedItem.category` | MATCH |
| 필요 금액 | `requiredCapitalUsdt`(`OpportunityCardModel`) | MATCH |
| 예상 수익(절대 USDT) | `expectedProfitUsdt`(`OpportunityCardModel`) | MATCH |
| **예상 수익률(%)** | 없음 — `requiredCapitalUsdt`/`expectedProfitUsdt`로부터 파생 가능하나 **서버에 이 필드 자체가 없음** | FUNCTIONAL_BINDING_REQUIRED — 서버 산출 신규 필드 필요(클라이언트 재계산 금지 · H2/H3 forensic에서 `sumAffordableExpectedProfitUsdt` 클라이언트 계산이 이미 결함으로 제거된 전례) |
| 발견한 기회 건수 | `HomeReadModelResponse.opportunity.itemCount` — **타입에 존재, `HomePageClient`/`HomeExperience`에 미배선**(gap) | FUNCTIONAL_BINDING_REQUIRED(배선만 필요, 신규 backend 불필요) |
| 평균 수익률(%, 집계) | 없음 | FUNCTIONAL_BINDING_REQUIRED(신규 서버 집계) |
| Desktop 3-카테고리 동시 표시 | feed가 여러 카테고리 items를 한 번에 반환(현재는 클라이언트 필터 UI만 단일 카테고리 표시) — 데이터는 이미 충분 | MATCH(구현은 presentation 배치 문제, 신규 데이터 불필요) |
| Mobile 단일 지배 카드 | `BalanceAwareHome`의 `hero = affordable[0]` 로직이 이미 "단일 강조 카드" 개념을 가짐 | MATCH(캐러셀 UI만 신규, 데이터 불필요) |
| AI 신뢰도 | `aiConfidenceScore`(0-100) | MATCH |

---

## 7. Processing-Time Contract

| 항목 | 실측 |
|---|---|
| 코어 실행 SLA | `Soft60`/`Hard90`(초) — `services/engine-rust/settlement_rule.rs` 룰 SSOT, T0=`participateAcceptedAt`, Soft 목표 60s, Hard 상한 90s, 초과 시 `MATCH_TIMEOUT` |
| **per-item 필드** | `estimated_duration_sec`(DB) → `estimatedDurationSec`(초, `opportunities.user.service.ts:362`) — **INTERNAL 주석이 달려 있으나 실제로는 `USER_SURFACE_STRIP_KEYS`에 없어 strip되지 않고 유저 응답에 도달함.** 단 `apps/web/lib/opportunity-card-map.ts`가 이 필드를 `OpportunityCardModel`에 매핑하지 않아 **UI에는 도달하지 않음**(2단계 gap: wire엔 있으나 카드모델엔 없음) |
| 목표값(Engine 문서) | "목표 ≤60(CTA후≈1분) · 정산≠연출" — 분 단위 방향과 일치 |
| 카테고리별 정확한 범위(예: 시계 1~3분 vs 카드 1~2분) | `estimated_duration_sec`가 카테고리별로 실제 다른 값을 갖는지 **본 세션에서 확증 불가**(DB seed 데이터 조회 권한 범위 밖) — 값 자체 조작 발명 금지 |
| 레거시 일 단위 | `expectedSellDays` — `USER_SURFACE_STRIP_KEYS`에 포함되어 **유저 응답에서 100% strip**됨(코드로 확인) · Home 재사용 대상 자체가 없음 |

**판정:**
- "분 단위" 방향 자체 = **MATCH**(Soft60/Hard90 + `estimatedDurationSec` 모두 분 단위 스케일과 일치, 일 단위 레거시는 이미 완전히 격리됨)
- 정확한 단일 처리시간 노출(예: "약 1~3분") = **FUNCTIONAL_BINDING_REQUIRED**(배선 gap: `estimatedDurationSec`를 `OpportunityCardModel`에 매핑 + Soft/Hard 상한과 결합해 범위 문자열로 가공하는 서버/copy 로직 필요)
- 카테고리별 차등 범위 = **FUNCTIONAL_BINDING_UNRESOLVED**(데이터가 실제로 카테고리마다 다른지 미확증 — H5/H6 전에 Engine 실측 데이터로 재확인 필요, 다르지 않다면 균일 범위로 계약해야 함)

---

## 8. AI Summary Functional Contract

퍼뜩 AI가 Home에서 계약 가능한 실제 서버 데이터:

| AI 요약 요소 | 실제 소스 | 분류 |
|---|---|---|
| "시장 탐색 중"/"기회 살펴보는 중" | `AppHeader` scan chip · `T.home.header.scanIdle`("AI가 기회를 살펴보는 중") — **이미 존재하는 카피/슬롯** | MATCH |
| "오늘 정산 {n}건" | `T.home.header.scanSettled` + DayPulse count | MATCH |
| 기회 설명(카테고리·필요금액·예상수익) | §6 Opportunity Binding | MATCH |
| 처리 안내(분 단위) | §7 Processing-Time | FUNCTIONAL_BINDING_REQUIRED |
| Safe Stop 설명 | Engine `safe_stop` 상태(`settlement_rule.rs` 결과코드) — 유저 카피는 `T.execution.*`에 존재(기존 결과 화면), **Home summary에는 아직 연결 안 됨** | FUNCTIONAL_BINDING_REQUIRED(기존 카피 재사용, 신규 카피 발명 금지) |
| "발견한 기회 N건 / 평균 수익률 X% / 평균 처리시간 Y분" 통합 요약 줄 | 3개 sub-facts 각각 §6/§7 판정을 따름 — **서버가 집계해 하나의 요약 fact로 내려줘야 하며 클라이언트가 3개를 임의로 조합/재계산하지 않는다** | FUNCTIONAL_BINDING_REQUIRED |

**금지 재확인(퍼뜩 AI 권한 경계):** 퍼뜩 AI가 자금 자동운용/자동매매/수익보장/자금 직접이동을 수행하는 것으로 보이는 문구·기능은 Home summary에 포함하지 않는다 — 기존 `ai-coach-fact-only.cjs`/`ai-coach-no-autonomy.cjs`/`ai-general-no-money-tools.cjs` 정책과 완전히 동일 축(신규 원칙 발명 아님).

---

## 9. Update Schedule Slot — "다음 기회 업데이트 예정" 재확정

H1 판정을 재확인(repo 재검색 결과 동일): `nextScanAt`/`scanScheduleAt`/`scan_interval` 등 스케줄 개념이 **레포 전체에 0건**.

```text
NOT_SUPPORTED_AS_LITERAL_RUNTIME_TRUTH
```

새 scheduler를 만들지 않는다. 대신 아래 **실제 지원되는 대체 slot** 중 하나로 시각적 슬롯을 유지할 수 있다(전부 이미 존재하는 필드/카피):

| 대체 옵션 | SSOT | 지원 여부 |
|---|---|---|
| 최근 확인/갱신 시각 | `DayPulseResponse.asOf` (`pulse.asOf`) | ✅ 이미 존재 |
| "AI가 기회를 살펴보는 중" | `T.home.header.scanIdle` | ✅ 이미 존재하는 카피 |
| "오늘 요약 준비 중" | `T.home.header.scanEmpty` | ✅ 이미 존재하는 카피 |

어떤 대체 옵션을 쓸지는 H5(Visual Contract)가 결정한다 — 본 문서는 "지원되는 후보 목록"만 계약한다.

---

## 10. CTA / Action Ownership (중복 방지)

| Action | 기존 owner(실측) | 중복 위험 |
|---|---|---|
| 입금(deposit) | `T.feed.ctaDeposit` → `/wallet/deposit` (`HomePrincipalRail`) | H5/H6는 이 CTA를 **재사용**해야 하며 두 번째 입금 버튼을 새로 만들지 않는다 |
| 출금(withdraw) | Home에 **현재 없음**(지갑 탭에서만) — Visual Master가 Home에 출금 버튼을 요구하면 **신규 진입점 추가**(mutation 자체는 기존 wallet withdraw API 재사용, 신규 API 금지) | FUNCTIONAL_BINDING_REQUIRED(신규 UI 진입점, 기존 mutation 재사용) |
| 기회 탐색/이동 | `HomeHero` cta(`#home-opportunity` 앵커) · `BalanceAwareHome` 카드별 `/profits/[id]` 이동 | 새 "기회 보기" CTA가 이 둘과 별도로 추가되면 중복 — H6에서 **단일화** 필수 |
| 참여(수익 벌기) | `OpportunityCard`의 `MotionCTA`(`data-action="participate"`) · Mobile sticky CTA(`data-testid="home-sticky-cta"`) | 이미 2곳 존재(카드 내부 + sticky) — 이것도 "중복"이 아니라 **PC/Mobile 각 1개**로 설계된 것으로 실측됨(같은 화면에서 2개 동시 노출 금지 원칙 유지) |
| 알림(notification) | `AppHeader`(`notificationHref="/me/inbox"`) | 재사용 |
| AI 진입(퍼뜩 채팅) | 라우트 `/me/peotteok` 존재(확인) · **Home에 진입 링크 없음** | FUNCTIONAL_BINDING_REQUIRED(신규 진입점, 기존 라우트/기능 재사용, 신규 API 금지) |

---

## 11. Loading / Empty / Error States

`HomeReadModelResponse`는 **계층적 state** 구조다 — 최상위 `viewState` 1개 + 섹션별(`money.state`/`opportunity.state`/`growth.state`) 독립 state.

| 사용자 요청 state | 실제 대응 |
|---|---|
| loading | 클라이언트 로컬 초기값(`HomeClientViewState = HomeViewState \| "loading"`) — 서버 타입엔 없음(fetch 전 임시 상태) |
| ready_data | `viewState="ready_data"` |
| ready_empty | `viewState="ready_empty"` |
| partial_data | **정확히 이 이름의 top-level state는 없음** — 섹션별 state가 서로 다를 수 있음(예: `money.state="ready_data"`이나 `opportunity.state="stale"`)로 사실상 partial을 표현. 새 top-level enum 발명 대신 **기존 섹션별 state 조합을 그대로 노출**하는 것을 권고 |
| error | `viewState="recoverable_error"` |
| session expired | `sessionStatus="expired"` + `sessionBanner="expired"`(메인 viewState와 분리된 채널) |
| wallet unavailable | `money.state`(독립) — `money: null`이면 전체 미가용 |
| opportunity unavailable | `opportunity.state`(독립) — `opportunity: null`이면 전체 미가용 |
| FX unavailable | **현재 상태 슬롯 자체가 없음**(§4 KRW 바인딩이 없으므로 당연히 그 state도 없음) — §4가 FUNCTIONAL_BINDING_REQUIRED로 해소되면 이 state도 같이 신설되어야 함 |

**fake zero 금지 재확인:** `money.state`가 `ready_data`가 아니면 `principalUsdt`를 `0`으로 표시하지 않는다(이미 `moneyStateAllowsValue()`로 코드에 구현되어 있음 — MATCH, 보존 대상).

---

## 12. Functional Conflicts / Resolutions (H1 carry-forward)

| 항목 | H1 판정 | H4 확정 |
|---|---|---|
| 영구 UI 이모지(👋/✨) | VISUAL_FUNCTIONAL_CONTRACT_CONFLICT | **유지.** Visual Master의 예시일 뿐 — 기존 emoji policy(영구 Product UI = Unicode Emoji 금지 · toast 예외)가 우선한다. runtime에 literal emoji를 계약하지 않는다. H5가 브랜드 아이콘 대체 여부를 결정 |
| Legacy AI avatar/hero(`avatar-512.png`·`hero-illustration-*`) | REPLACE + ASSET_PRODUCTION_REQUIRED | **유지.** 본 H4에서 신규 asset 생성 0. H6.5 이후 `redesign-r1-home-visual-asset-production`(구 Part B) 담당 |
| Visual Master 예시 숫자(₩1,720,000·2.8%·7건·1.5%~3.2% 등) | VISUAL_ONLY_EXAMPLE | **유지.** 어떤 코드/설정/seed에도 하드코딩하지 않는다 — 실제 값은 §6/§7/§3의 SSOT 필드에서 온다 |
| "실제 수익"=`profitUsdt` 단순 name-match | (H1은 FUNCTIONAL_BINDING_REQUIRED로 잠정 표기) | **H4에서 정정: FUNCTIONAL_BINDING_UNRESOLVED**(§5) — name-match만으로 확정하지 않음, hard guard 발견으로 상향 |
| "다음 업데이트 오후 2:00" | NOT_SUPPORTED | **유지 + 대체안 구체화**(§9) |

**Blocking conflict count = 0.** 위 전부는 FUNCTIONAL_BINDING_REQUIRED/UNRESOLVED/NOT_SUPPORTED로 기록 가능했고, 본 계약서 작성 자체를 막는 항목은 없었다.

---

## 13. H5(Visual Contract)에 넘길 visual-only 영역

```text
geometry(sidebar/rightRail/hero 치수) · 색·타이포·spacing · 카드 시각 skin
Desktop 3-카테고리/Mobile 캐러셀의 정확한 레이아웃·인터랙션(dot indicator 등)
Update Schedule slot의 최종 문구·아이콘 선택(§9 후보 중 택1)
이모지(👋/✨) 대체 방식 최종 결정(§12)
"실제 수익" UI 표시 방식(§5 Founder 결정 이후에만 착수)
```

## 14. H6(Implementation Contract)에 넘길 concerns

```text
KEEP/REWIRE/REMOVE_FROM_RUNTIME/REPLACE/INVESTIGATE 5분류 최종 확정(H1 §10 preview 승계)
CTA 단일화 구현 방법(§10 — 특히 새 "기회 보기" CTA와 기존 Hero/sticky CTA 충돌 해소)
FX/KRW 배선 구현 방법(§4 — Founder가 KRW-primary 승인 시)
`estimatedDurationSec` → `OpportunityCardModel` 매핑 구현(§7)
`itemCount` → HomeExperience props 배선 구현(§6)
출금/AI 진입 신규 CTA의 정확한 배치(§10)
```

## 15. Unresolved Blocker Count

```text
BLOCKING_CONFLICT = 0
FUNCTIONAL_BINDING_UNRESOLVED = 1  (§5 "실제 수익" 시간범위+가드해제 — Founder/Money-owner 결정 필요)
FUNCTIONAL_BINDING_REQUIRED = 다수 (§4 KRW, §6 itemCount/평균수익률, §7 처리시간 배선, §8 AI요약 집계, §9 대체 slot 선택, §10 출금/AI 진입 CTA)
NOT_SUPPORTED = 1 (§9 다음 업데이트 리터럴 시각)
```

H4는 위 미해결 항목들을 **기록**했을 뿐 해소하지 않았다 — 해소는 H5(Visual 선택)·H6(구현 매핑)·Founder 결정(§5) 몫이다.

---

## Document Control

| | |
|---|---|
| Fake binding count | 0 |
| New backend feature invented | 0 |
| Runtime implementation | 0 |
| H5/H6/H7 started by this document | NO |
| Visual Master geometry/색/spacing 결정 | 0(본 문서 범위 밖) |
