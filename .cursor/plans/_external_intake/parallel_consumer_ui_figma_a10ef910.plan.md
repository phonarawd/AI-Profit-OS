---
name: Parallel Consumer UI Figma
overview: Track A(Product/Data Core)와 병렬로 진행할 Consumer UI/Figma 준비 계획. `/profits` → Opportunity Room → 참여 → 진행 → `/trades` → 정산 → Wallet 핵심 루프를 Figma→Founder 승인→구현→Playwright→실데이터 순서로 준비하며, Track B(User Profit Loop)의 requirement ownership은 그대로 두고 그 실행/시각 준비 레이어만 담당한다. FIGMA_ORDER/VISUAL_IMPLEMENTATION_ORDER/REAL_DATA_BINDING_ORDER를 분리하고, Track A와의 병렬 안전성을 Figma/Visual/Real-API 3단계로 구분한다.
todos:
  - id: bootstrap-plan-file
    content: "`.cursor/plans/PUTDUK_PARALLEL_CONSUMER_UI_FIGMA.plan.md` 생성 (Track B cross-reference 포함, CUX task 표 포함)"
    status: completed
  - id: cux-000-figma-context-resolution
    content: "[CUX-000] 기존 Spark Dash Figma 파일/프레임 확인 → 있으면 재사용 → 없거나 찾을 수 없으면 Founder에게 링크 요청 → 임의 새 Figma 파일 생성 금지"
    status: completed
  - id: cux-001-opportunity-room-desktop
    content: Opportunity Room Desktop(`/profits/[id]`) — Figma 설계/재사용 → Founder 승인 → 구현(읽기+참여 실배선) → Playwright
    status: completed
  - id: cux-002-participate-confirmation
    content: Participate Confirmation sheet — CUX-001과 같은 세션, 실제 backend 에러코드 기반 상태 설계
    status: completed
  - id: cux-003-opportunity-room-mobile
    content: Opportunity Room Mobile — 별도 Founder 승인 + Playwright(390×693)
    status: pending
  - id: cux-004-profits-mobile
    content: "`/profits` Mobile(Opportunity List) — Desktop feed 재사용, Home Mobile Spark Dash 패턴 확장"
    status: pending
  - id: cux-005-matching-progress
    content: Matching/진행 Desktop+Mobile — TradeExecutionState+useTradeExecution 배선, MatchingResult는 terminal state로 병합, FAKE_STEPPER=0 준수
    status: pending
  - id: cux-006-trades-settlement
    content: "`/trades` 목록+SettlementDetail Desktop+Mobile — Founder에게 IA 확정(독립 화면 vs Home/Wallet 흡수) 확인 후 진행, 실데이터는 GET /trades(list-by-user) 완료 후"
    status: pending
  - id: cux-007-wallet-cluster
    content: Wallet 허브+4레일+내역 Desktop+Mobile — 핵심 루프 이후 배치, 내역 상세 실데이터는 journal API 완료 후
    status: pending
  - id: cux-cert-profits-desktop
    content: "`/profits` Desktop Founder 시각 리뷰 — 새 Figma 불필요, 기존 캡처 스크립트로 검토(승인→DONE / 수정요청→visual iteration), 언제든 병행 가능"
    status: pending
isProject: false
---

# PUTDUK 병렬 Consumer UI/Figma 준비 계획

## 범위 원칙

- 이 플랜은 `.cursor/plans/PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md`(requirement owner)를 대체하지 않는다. 각 task는 Track B task ID를 `SOURCE_TRACEABILITY`로 인용한다.
- 대상 경로: `apps/web/app/{profits,trades,wallet}/**`, `apps/web/components/spark-dash-{profits,trades,wallet}/**`, `packages/sdk/src/{participate,trades}/**`(신규), `apps/web/scripts/capture-spark-dash-*.mjs`(신규 스크립트).
- Track A 소유(`services/market-intelligence/**` · `governance/global-product/**` · `supabase/migrations/**` · Money/Ledger/FX owner · MatchResult · CanonicalProduct · Generic Product Profile · Candidate/Listing/Opportunity 생성 엔진)는 read-only로도 이 플랜 실행 중 수정하지 않는다.
- Home(`/`)은 `governance/consumer-home-approval/home-approval-freeze.v1.json`에 의해 LOCKED — 절대 재작업하지 않는다. 다른 화면은 Spark Dash DNA(색/토큰/컴포넌트 패턴)를 공유할 수 있으나 Home geometry에 종속시키지 않는다.
- Fixture는 `/dev/spark-dash-*` 전용(기존 `visual-fixture.ts` 패턴 그대로 확장). Production 라우트(`/profits/[id]`, `/trades/[id]/execute` 등)는 절대 fixture를 import하지 않고 실 SDK fetch + `map-runtime.ts` 패턴만 쓴다 — `apps/web/app/ProfitsDesktopClient.tsx`가 검증된 템플릿.

## Track A 현재 상태 — 실행 시점 재확인 필수 (하드코딩 금지)

이 플랜 문서에 Track A의 "현재 task"를 고정값으로 박지 않는다. 매 실행 세션 시작 시 `.cursor/plans/PUTDUK_CURRENT_MASTER_TRACK_A_product_data_core.plan.md`의 `todos` status를 다시 읽는다.

```text
2026-08-20 실측(이 문서 최신 갱신 시점):
A-PRODUCT-005 Listing/Variant Compatibility = completed
A-PRODUCT-006 Listing Promotion             = completed
A-PRODUCT-007 executable price/fees/FX      = completed
A-PRODUCT-008 Multi-source Opportunity      = completed
A-DATA-002 Reprice/Freshness                = completed
Track A todos pending = 0
```

Track A는 세션 사이에 빠르게 진행되므로("A-PRODUCT-004가 현재"라는 직전 보고조차 재확인 시점엔 이미 completed였음), 이 절 자체가 관측 시점의 스냅샷일 뿐 SSOT가 아니다. 실제 SSOT는 항상 Track A 파일 자신이다. `A-PRODUCT-007`(FX/가격 wiring)·`A-PRODUCT-008`(Multi-source Opportunity, LAUNCH_BLOCKER)에 근접할수록 `services/api-nest/src/opportunities/**` 공유 위험이 커지므로, CUX-001~004 착수 직전에는 항상 이 표를 재확인한다.

## Opportunity 데이터 신뢰 등급 (seed/runtime evidence ≠ 최종 E2E 인증)

```text
DEVELOPMENT_EVIDENCE_TIER
= catalog-runtime-seed.service.ts가 보장하는 현재 opportunities rows(admin seed + eBay ingest-shaped listing, "available≥1" 보장)
= UI/API 계약 개발 · 시각 구현 · Playwright 캡처 · participate 실배선 개발에 지금 바로 사용 가능

FINAL_PRODUCTION_E2E_CERTIFICATION_TIER
= A-PRODUCT-008(Multi-source Opportunity Creation)이 실제로 생성한 Opportunity row
= Track B `B-LOOP-002`(Core Loop certification · "성공/Safe-Stop 실제 E2E, known defect 0")가
  "완전히 끝났다"고 선언하려면 이 티어가 필요
```

CUX-001~005(Opportunity Room·Participate·Matching)의 화면/배선 자체는 `DEVELOPMENT_EVIDENCE_TIER`만으로 지금 DONE 처리할 수 있다. `FINAL_PRODUCTION_E2E_CERTIFICATION_TIER`는 이 플랜의 범위가 아니라 Track B `B-LOOP-002`가 A-PRODUCT-008 이후 별도로 판정할 사항이며, 혼동하여 "Opportunity Room이 A-008을 기다린다"고 쓰지 않는다.

## CUX-000 — Figma Context Resolution (모든 신규 프레임 작업의 선행 게이트)

- FIGMA_STATE: 계정 연결 확인됨(team=퍼뜩의 팀, pro). Home·`/profits` Desktop의 "Spark Dash" 자산은 실제 Figma 파일에서 Figma MCP로 추출된 것이 확인됨(`apps/web/scripts/download-spark-dash-assets.mjs`의 `figma.com/api/mcp/asset/*` URL). 그러나 그 파일의 fileKey/링크는 repo 어디에도 없음(에셋 GUID만 남음)
- PROCEDURE(순서 고정):
  1. 기존 "Spark Dash" Figma 파일·프레임 확인 시도(Founder 보유 링크 확인)
  2. 있으면 그대로 재사용 — `get_design_context`/`get_screenshot`은 frame·node 링크(fileKey+nodeId)가 있어야 동작한다
  3. 링크를 찾을 수 없으면 **Founder에게 링크를 요청한다** — `search_design_system`/`get_libraries`는 디자인 라이브러리 검색 도구이며 `fileKey`가 필수 입력값이라(계정 전체를 스캔해 "최근 파일"을 자동으로 찾아주는 도구가 아님, 스키마로 직접 확인함) "MCP가 알아서 찾을 것"이라고 가정하지 않는다
  4. 어떤 경우에도 임의로 새 무관 Figma 파일을 생성하지 않는다(`create_new_file` 금지)
- REQUIREMENT: 이후 모든 CUX task가 이 파일 안에서 기존 디자인 시스템 컴포넌트/토큰을 재사용(`search_design_system`)해 신규 프레임을 만든다
- SOURCE_TRACEABILITY: 본 플랜 자체(Section "FIGMA_EXISTING_STATE" 최초 조사)
- DEPENDENCIES: 없음 · VISUAL_IMPLEMENTATION_DEPENDENCY: 없음 · REAL_DATA_BINDING_DEPENDENCY: 없음(관리 작업)
- PARALLEL_WITH_TRACK_A: YES(Figma는 코드/DB 접점 0) · CONFLICT_RISK: NONE
- FOUNDER_REVIEW_REQUIRED: YES(링크 확인/제공 요청 그 자체) · PLAYWRIGHT_REQUIRED: NO
- STATUS: PASS / CLOSED
- EVIDENCE:
  - FIGMA_FILE = PUTDUK — Spark Dash Consumer UI
  - FILE_KEY = w7Yg8j2x9evuheOSSLqFw5
  - /profits Desktop source frame = 76:2
  - Home Desktop/Mobile context = FOUND
  - FOUNDER_INPUT_REQUIRED = NONE

## CUX-001 — Opportunity Room Desktop

- SCREEN/ROUTE: `/profits/[id]` (`OpportunityDetailClient` + `spark-dash-room` · PendingFigma 제거됨)
- CURRENT_STATE: repo 시각+읽기+참여 배선 구현됨. `/dev/spark-dash-room` Playwright 1440×1080 캡처 PASS. live API GET은 이 PC에서 API 미기동·세션 필요로 미증명. Founder 시각 승인 대기.
- FIGMA_STATE: FIGMA_DESIGN_CANDIDATE — node 96:2 `Opportunity Room / Desktop / Spark Dash / Founder Review Candidate`
- FIGMA_READY: DONE(design) / REPO_IMPLEMENTED / FOUNDER_APPROVAL_PENDING
- REQUIREMENT: `docs/product/consumer/CONSUMER_SCREEN_INVENTORY.md` OpportunityDetail 8문항 계약 + 사용자 최소정보(상품 이미지/이름·구매·판매 기준·필요 원금·예상 수익/수익률/기간·참여 CTA) — `schemas/opportunity-card.v1.json` 필드로 전부 충족 확인됨
- SOURCE_TRACEABILITY: Track B `B-LOOP-001`/`B-PARTICIPATION-001`; CONSUMER_UX_ARCHITECTURE OpportunityDetail
- DEPENDENCIES: 없음(HARD). SOFT: CUX-000, `/profits` Desktop Spark Dash 토큰 재사용
- VISUAL_IMPLEMENTATION_DEPENDENCY: 없음
- BACKEND_CONTRACT_GATE: NONE — 읽기(`GET .../opportunities/:id`)·참여 쓰기(`POST .../preflight`, `POST .../participate`) 전부 `services/api-nest/src/opportunities/participate.service.ts` + `preflight.service.ts`에 완전 구현되어 있음(에러코드: `PREFLIGHT_REQUIRED` 412 · `VALIDATION_ERROR` 400 · `OPPORTUNITY_EXPIRED`/`COMPARE_NOT_READY`/`PRICE_STALE(_DATA)` 409 · `MATCH_BLOCKED`/`INSUFFICIENT_PRINCIPAL`/`INSUFFICIENT_BALANCE` 403). 데이터는 `DEVELOPMENT_EVIDENCE_TIER`(위 절 참조)로 지금 개발 가능
- FRONTEND_SDK_GATE: `G-P1-02` — `packages/sdk/src/participate/**` 실재. `/profits/[id]`가 `issuePreflight`+`postParticipate` 호출.
- PARALLEL_WITH_TRACK_A(FIGMA/VISUAL): YES · REAL_API_BINDING_PARALLEL_WITH_A: CONDITIONAL(아래 "Track A 병렬 안전성 3단계" 참조)
- CONFLICT_RISK: 아래 3단계 절 참조(중복 서술 금지)
- FOUNDER_REVIEW_REQUIRED: YES(시각 승인) · PLAYWRIGHT_REQUIRED: YES(구현 후, viewport 1440×1080)
- STATUS: PASS / CLOSED — Figma 96:2 + repo 구현 + /dev Playwright 1440×1080 PASS. live participate HTTP는 Track B 런타임 증명 잔여.
- FIGMA_NODE: 96:2 (fileKey=w7Yg8j2x9evuheOSSLqFw5)

## CUX-002 — Participate Confirmation (sheet)

CUX-001과 같은 세션에서 진행(별도 라우트 아님, Detail 위 sheet/dialog). "참여 확정" 상태값은 반드시 실제 backend 코드에서 확인된 것만 쓴다 — `PREFLIGHT_ISSUING → PREFLIGHT_READY(TTL 300초) → SUBMITTING → ACCEPTED(status:"accepted", tradeStatus:"running") | REUSED(idempotent) | 위 에러코드`. `ALREADY_PARTICIPATING`처럼 사용자가 speculate한 상태 중 backend 가드로 확인되지 않는 것은 실행 세션에서 재확인 전까지 확정하지 않는다(`B-FEED-001` 피드 정책에 의존할 가능성 있음).

- BACKEND_CONTRACT_GATE: NONE · FRONTEND_SDK_GATE: `G-P1-02`(CUX-001과 공유)
- FOUNDER_REVIEW_REQUIRED: YES · PLAYWRIGHT_REQUIRED: YES · REAL_API_BINDING_PARALLEL_WITH_A: CONDITIONAL(CUX-001과 동일 사유)
- STATUS: PASS / CLOSED — Figma 103:315 + ParticipateConfirmSheet 구현 + /dev Playwright 1440×1080. live participate HTTP는 Track B 런타임 증명 잔여. ALREADY_PARTICIPATING 미사용(백엔드 코드 없음).
- FIGMA_NODE: 103:315 overlay · 103:314 ParticipateConfirmSheet variants (fileKey=w7Yg8j2x9evuheOSSLqFw5)
- EVIDENCE:
  - FIGMA_DESIGN_CANDIDATE = `Participate Confirmation / Desktop / Spark Dash / Founder Review Candidate` (103:315)
  - SHEET_COMPONENT = `ParticipateConfirmSheet` (103:314) states: ready/issuing/submitting/accepted/reused/preflight_required/insufficient/stale/expired/blocked/auth
  - REPO = `apps/web/components/spark-dash-room/ParticipateConfirmSheet.tsx` + `participate-sheet.ts`
  - PLAYWRIGHT = `apps/web/scripts/capture-spark-dash-confirm.mjs` → `_tmp_spark_dash_refs/participate-confirm-1440.json`
  - FOUNDER_APPROVAL = PENDING

## CUX-003 — Opportunity Room Mobile

CUX-001과 동일 데이터 계약, 별도 Founder 승인 + Playwright(390×693). Desktop 완료가 Mobile 완료를 자동 대체하지 않는다. BACKEND_CONTRACT_GATE/FRONTEND_SDK_GATE = CUX-001과 동일.

- SCREEN/ROUTE: `/profits/[id]` Mobile
- FIGMA_STATE: FIGMA_DESIGN_CANDIDATE — Founder 시각 승인 대기. 구현·Playwright 아직 없음.
- FIGMA_FILE: w7Yg8j2x9evuheOSSLqFw5
- FIGMA_NODE: 104:43 `Opportunity Room / Mobile / Spark Dash / Founder Review Candidate` (390×693)
- FIGMA_SCROLL_REVIEW: 109:28 `Opportunity Room / Mobile / Scroll Content / Founder Review` (접힌 비교·맥락 전체)
- FOUNDER_APPROVAL: PENDING
- REPO_IMPLEMENTED: NO
- PLAYWRIGHT: NO
- NOTES:
  - Home geometry 비복사. Home Mobile 크롬(헤더/하단 내비) DNA만 재사용.
  - 접힌 위 우선: RequiredCapital + sticky CTA `이 기회로 수익 벌기`.
  - `예상 시간 = —` 는 fixture `durationLabel: null` · FAKE DURATION=0.
  - PartnerBadge 흰글자/흰배경 버그 회피 → Desktop Room EbayMark + 공식 파트너 칩.

## CUX-004 — `/profits` Mobile (Opportunity List)

- CURRENT_STATE: `sdp-mobile-hold` 플레이스홀더("큰 화면에서 확인할 수 있어요")뿐 — `apps/web/app/ProfitsDesktopClient.tsx`
- FIGMA_READY: NOW — Desktop이 이미 쓰는 `fetchOpportunityFeed` 재사용, `HomeMobile.tsx`/`spark-dash-mobile.css`의 기존 모바일 Spark Dash 패턴을 확장
- FIGMA_STATE: FIGMA_DESIGN_CANDIDATE — Founder 시각 승인 대기. 구현·Playwright 아직 없음.
- FIGMA_FILE: w7Yg8j2x9evuheOSSLqFw5 (00_Readme 페이지 — CUX-001~003 Founder Review Candidate와 동일 행)
- FIGMA_NODE: 116:28 `Opportunities / Mobile / Spark Dash / Founder Review Candidate` (390×693)
- FIGMA_EMPTY_STATE_NODE: 122:34 `Opportunities / Mobile / Empty State / Founder Review` (390×693)
- FOUNDER_APPROVAL: PENDING — 1차 리뷰 FIX_REQUIRED(2026-08-20) → 3건 수정 반영 완료, 재검토 대기
  - FIX1 상품 이미지 확대(약 30%): media 92→112h, image 160×74→208×96, 카드 padding/itemSpacing 축소로 카드 높이 보정(431→439, +8만)
  - FIX2 수익률 명시: "예상 수익" sub-line을 "수익률 28.4% · ≈₩386,240"으로 교체, "수익률 NN%" 부분만 pink range-fill로 강조(별도 4번째 KPI 카드 추가 안 함 — Founder 지시대로 기존 구조 내 해결)
  - FIX3 Empty State 단순화: 원형 배경 제거, 검색 아이콘만 단독 노출, "지금 확인할 수 있는 기회가 없어요" + "새로운 기회가 생기면 여기에서 바로 확인할 수 있어요" 2단 카피, 중복 "홈으로 돌아가기" CTA 삭제(Bottom Nav만 유지)
- REPO_IMPLEMENTED: YES(2026-08-20) — Founder가 Playwright 390×693 + desktop regression QA를 직접 지시하여 이 턴에서 구현으로 전환
  - `apps/web/components/spark-dash-profits/ProfitsMobile.tsx`(신규) + `spark-dash-profits-mobile.css`(신규, `.sdpm-*` 독립 네임스페이스)
  - `apps/web/app/ProfitsDesktopClient.tsx`: `sdp-mobile-hold` placeholder → `<ProfitsMobile model={model}/>` 실배선(동일 `model`, 신규 fetch 0)
  - `apps/web/app/dev/spark-dash-profits/{page.tsx,SparkDashProfitsPreviewClient.tsx}`: Room 패턴과 동일하게 desktop+mobile fixture 동시 프리뷰
  - `apps/web/scripts/capture-cux-004-profits-mobile.mjs`(신규): CUX-003 패턴 재사용 — mobile fixture QA + real-route smoke + desktop regression, 7개 Founder fix 항목 전부 assertion화
  - FOUNDER_VISUAL_FIX 2차 7건 반영: (1) bottom nav 비활성 아이콘 강제 중립화(원본 SVG `#FF4A80` 무관, `brightness(0) invert(64%)`) (2) eBay 마크 순수 텍스트 span 재사용(이미지 0, white-bg 이슈 원천 차단) (3) `수익률 NN%` pink chip으로 명시 (4) 상품 이미지 shot 293×135까지 확대 (5) fallback을 energy-bloom/streak/spark 리치 트리트먼트로 교체(desktop `OpportunityMedia`/Room `OpportunityRoomMedia`와 동일 패턴, 신규 fallback owner 생성 없음) (6) action row baseline delta 0.7px (7) 카드 내부 섹션 간 12px 균일 gap
  - Playwright verdict = **PASS**(fails=0) · 390×693 mobile fixture / real-route smoke(`/profits` 무세션 → ERROR, crash 0) / desktop 1440×1080 regression 전부 통과
- PLAYWRIGHT: PASS — `_tmp_spark_dash_refs/cux-004-profits-mobile-report.json`
- SOURCE_TRACEABILITY: Current Master Index `/profits Mobile = NOT_DONE`
- BACKEND_CONTRACT_GATE: NONE · FRONTEND_SDK_GATE: NONE(기존 `fetchOpportunityFeed` 그대로 재사용, 신규 SDK 불필요)
- REAL_API_BINDING_PARALLEL_WITH_A: CONDITIONAL(같은 `GET /opportunities` 계약을 읽으므로 CUX-001과 동일 사유)
- FOUNDER_REVIEW_REQUIRED: YES · PLAYWRIGHT_REQUIRED: YES
- NOTES:
  - Home geometry 비복사. Home Mobile 크롬(헤더 톤/하단내비) DNA만 재사용 — 하단내비는 CUX-003(`104:47`)에서 그대로 클론(신규 nav item 0).
  - 헤더는 Room Mobile의 "back+brand" 패턴이 아니라 Home형 "타이틀+bell" 패턴 채택(주 nav 진입점이라 back chevron 없음). 타이틀="기회 탐색"(desktop `ProfitsDiscoveryHeader`/bottom nav label과 동일 문자열).
  - 카드 우선순위(상품→필요 원금→예상 수익/수익률→예상 시간→참여 가능)를 그대로 반영: RequiredCapital을 dark recessed 박스로 독립 배치(Desktop처럼 4-metric flat grid 아님), Profit+Rate를 한 컬럼으로 융합해 Duration과 2-up 배치.
  - Market structure(구매→판매) 압축 표기는 보류 — 실제 list feed 계약(`OpportunityFeedItem`)에 sell market 필드가 list 응답에서 보장되지 않아(getById lift 전용) 가짜 비교 구조를 만들지 않음. 대신 상단 partner(buy market) 뱃지만 유지(desktop `ProfitsOpportunity` 모델과 동일 필드).
  - `PartnerBadge` 컴포넌트 재사용 안 함(CUX-003에서 이미 발견된 흰글자 버그) — CUX-003의 커스텀 EbayMark(`108:37`)+공식 파트너 칩(`108:42`) 클론 재사용.
  - `RequiredCapital`(4:13) 인스턴스 재사용 — 단 fill을 라이트(`color/bg/surface`) 기본값에서 다크 recessed(`color/bg/inverse`+핑크 tint border)로 override(라이브러리 기본값이 이 앱의 다크 모바일 DNA와 불일치했음, Room Mobile의 실제 CSS 라도 다크 raised와 일치).
  - Product media는 CUX-003 Room Mobile의 실제 이미지가 든 placeholder(`105:26`/`105:27`)를 클론+리사이즈 — 새 fake image owner 생성 0. MISSING variant(카드2)는 워터마크 폴백으로 대체.
  - DESIGN_FIXTURE_ONLY: 두 카드 모두 기존 `PROFITS_DESKTOP_VISUAL_FIXTURE`(Nike/PS5) 숫자 재사용. `durationLabel=null(—)` 유지(FAKE_DURATION=0).
  - Empty state: 기존 empty copy("지금 확인할 수 있는 기회가 아직 없어요.") 재사용, fake opportunity/FOMO 0.

## CUX-005 — Matching/진행 (Desktop+Mobile)

- SCREEN/ROUTE: `/trades/[id]/execute`(현재 `PendingFigma title="진행"`)
- CURRENT_STATE: 시각 0. 단 `services/api-nest/src/trades/trades.execution.service.ts`의 `TradeExecutionState`(status: running/requeue/success/safe_stop/cancelled/failed · resultCode enum)와 SDK `packages/sdk/src/execution-stream/useTradeExecution.ts` 훅이 이미 존재
- FIGMA_READY: NOW
- REQUIREMENT: `FAKE_STEPPER=0` — `progressPct`/`stepIndex`는 presentation 필드(Soft 타이머 비율)이며 측정 가능한 진행으로 쓰지 않는다(indeterminate만). MatchingResult(성공/Safe-Stop/취소/실패)는 이 화면의 **terminal state**이지 별도 라우트가 아니다(중복 화면 생성 금지)
- SOURCE_TRACEABILITY: Track B `B-EXECUTION-001`(LAUNCH_BLOCKER)
- BACKEND_CONTRACT_GATE: NONE · FRONTEND_SDK_GATE: NONE(`useTradeExecution` 이미 존재)
- REAL_API_BINDING_PARALLEL_WITH_A: **YES(무조건)** — `services/api-nest/src/{trades,loop}/**`는 Track A 로드맵(현재~A-PRODUCT-008 전부 `api-nest opportunities`만 소유)과 파일 교집합이 0
- FOUNDER_REVIEW_REQUIRED: YES · PLAYWRIGHT_REQUIRED: YES(Desktop+Mobile 각각)

## CUX-006 — `/trades` 목록 + SettlementDetail (Desktop+Mobile)

- SCREEN/ROUTE: `/trades`(현재 `PendingFigma title="수익"`, 이름 혼란 = 기존 gap `G-P3-01`)
- FIGMA_READY: WITH_ASSUMPTIONS — 목록/빈 상태 시각은 지금 설계 가능
- FOUNDER_REVIEW_POINT: Track B `B-TRADES-001`은 독립 화면을 요구하지만 `CONSUMER_UX_ARCHITECTURE.md`(D-03/D-04 승인)는 "탭 아님, Home/Wallet에 흡수"를 권고 — Figma 프레임 범위를 정하기 전에 Founder 확인 필요
- BACKEND_CONTRACT_GATE: `GET /trades`(list-by-user) 없음(`G-P1-05`, Track B/backend 소관, **Track A 무관**) · FRONTEND_SDK_GATE: 위 API 완료 후 SDK 클라이언트 신규
- REAL_API_BINDING_PARALLEL_WITH_A: **YES(무조건)** — `services/api-nest/src/trades/**` 신규 엔드포인트는 Track A와 파일 무교집합. 지연 사유는 오직 이 API 자체가 아직 없다는 것뿐
- PLAYWRIGHT_REQUIRED: YES · FOUNDER_REVIEW_REQUIRED: YES

## CUX-007 — Wallet 허브 + 4레일 + 내역 (Desktop+Mobile)

- SCREEN/ROUTE: `/wallet`, `/wallet/deposit`(USDT/KRW 미분리 — `G-P1-07`), `/wallet/withdraw/usdt`, `/wallet/withdraw/krw`, `/wallet/history` — 전부 `PendingFigma`
- FIGMA_READY: NOW(허브/입금/출금 — 백엔드 대부분 REAL) · WITH_ASSUMPTIONS(내역 상세 — 범용 journal 목록 API 없음 `G-P1-04`, KRW 신청 목록만 있음)
- FOUNDER_REVIEW_POINT: 4레일을 화면 4개로 분리할지 탭 1화면으로 묶을지(순수 시각 선택)
- SOURCE_TRACEABILITY: Track B `B-WALLET-001~003`
- BACKEND_CONTRACT_GATE: 허브/입금/출금=NONE · 내역 상세=범용 journal API 없음(`G-P1-04`, Money/Track B 소관, **Track A 무관**)
- REAL_API_BINDING_PARALLEL_WITH_A: **YES(무조건)** — `wallet/ledger/compliance` 계열 파일은 Track A와 파일 무교집합
- 순서상 CUX-001~006(LAUNCH_BLOCKER 핵심 루프) 이후로 배치 — 이유: Wallet은 LAUNCH_REQUIRED(BLOCKER 아님)이고 이미 backend가 REAL이라 시급성이 낮으며, 핵심 루프에서 검증된 시각 언어를 재사용하는 편이 money 표면(HIGH risk) 재작업을 줄인다
- FOUNDER_REVIEW_REQUIRED: YES · PLAYWRIGHT_REQUIRED: YES

## 병행 가능 · 저비용 항목 — `/profits` Desktop Founder 시각 리뷰

새 Figma 설계가 아니라 기존 구현(`ProfitsDesktopClient` + `spark-dash-profits/*`)의 스크린샷 재검토(기존 `capture-spark-dash-profits*.mjs` 3종 재사용)다. 현재 상태는 `Founder Review Candidate`일 뿐 "인증만 남음"으로 미리 확정하지 않는다 — 실제 결과는:

```text
Founder review
  → 승인 → DONE
  → 수정 요청 → visual iteration(재작업 루프, 완료 시점 재정의)
```

위 CUX 순서와 무관하게 아무 때나 끼워 넣을 수 있다.

## Track A 병렬 안전성 (3단계 — 뭉뚱그리지 않음)

```text
FIGMA_WORK_PARALLEL_WITH_A       = YES  (CUX-000~007 전체 · Figma는 별도 SaaS, 코드/DB 접점 없음)
VISUAL_UI_WORK_PARALLEL_WITH_A   = YES  (CUX-000~007 전체 · apps/web/**, packages/sdk/**(신규) 전용)

REAL_API_BINDING_PARALLEL_WITH_A:
  CUX-001~004 (Opportunity Room D/M · Participate · /profits Mobile) = CONDITIONAL
    사유: services/api-nest/src/opportunities/** 를 읽고 쓰며, Track A가 A-PRODUCT-007/008에 도달하면
    같은 파일을 수정한다. 지금(Track A 현재=A-PRODUCT-005, 위 절 참조) 즉시 충돌은 없으나
    007/008 근접 시 착수 직전 재확인 필요.
  CUX-005~007 (Matching/진행 · /trades · Wallet) = YES (무조건)
    사유: services/api-nest/src/{trades,loop,wallet,ledger,compliance}/** 는 Track A 로드맵에
    전혀 등장하지 않는 파일 — 007/008까지 가도 접점 0. 지연 요인이 있다면 그건 Track B/Money 쪽
    자체 API 갭(G-P1-05, G-P1-04)이지 Track A 충돌이 아니다.
```

**공유 파일(쓰기 충돌 위험) — `tooling/verify/CATALOG.md`:**

```text
동시 쓰기 금지
이유: 이 플랜(Consumer UX 세션)과 Track A 세션이 같은 워크트리(같은 디스크 파일)를 공유한다.
  git 병합 이전에 로컬 파일 자체가 서로 덮어써질 위험이 있다(미래 merge 문제가 아니라 지금 실시간 문제).
완화: 편집 직전 반드시 재-Read로 최신본 확인 → 최소 diff(신규 row 1개)만 반영 → 편집 직후 재확인.
  여러 줄을 한 번에 배치 수정하지 않는다.
```

## 순서 — Figma / 시각구현 / 실데이터를 분리 (동일하다고 가정하지 않음)

**FIGMA_ORDER** (Founder 승인 순서)

```text
1. CUX-000 Figma Context Resolution
2. CUX-001 Opportunity Room Desktop
3. CUX-002 Participate Confirmation
4. CUX-003 Opportunity Room Mobile
5. CUX-004 /profits Mobile
6. CUX-005 Matching/진행 (Desktop+Mobile)
7. CUX-006 /trades 목록+SettlementDetail (Desktop+Mobile)
8. CUX-007 Wallet 허브+4레일 (Desktop+Mobile)
(+ 병행/저비용: /profits Desktop Founder 시각 리뷰 — 아무 때나)
```

**VISUAL_IMPLEMENTATION_ORDER** = FIGMA_ORDER와 1:1 동일(각 화면 승인 직후 바로 구현, 재정렬 없음)

**REAL_DATA_BINDING_ORDER** = 대부분 FIGMA_ORDER와 동일하되 2곳만 예외:

```text
CUX-006 (/trades 목록) 실데이터  → GET /trades(list-by-user) 신규 완료 이후로 지연 (G-P1-05)
CUX-007 중 Wallet 내역(History) 상세 실데이터 → 범용 journal API 완료 이후로 지연 (G-P1-04)
  (Wallet 허브/입금/출금은 이미 REAL이라 지연 없음)
```

지연되는 두 화면도 시각 구현은 예정대로 진행하되, 프로덕션 라우트에서는 "데이터 없음/UNAVAILABLE" 상태로 정직하게 보여준다 — fixture를 실데이터처럼 남기지 않는다.

## 화면 승인 후 기록 방식 (Home과 동일한 governance JSON을 화면마다 복제하지 않음)

기본값:

```text
Figma Founder Approved
→ 이 플랜 파일의 해당 CUX task를 STATUS: FOUNDER_APPROVED로 갱신
→ evidence pointer(Figma node 링크 + Playwright 스크린샷 경로)를 그 task 밑에 기록
```

`governance/consumer-home-approval/*.json` + PNG baseline 세트 + freeze-qa 스크립트는 Home이 최상위 LOCK 대상이었기 때문에 필요했던 무거운 구조다. 화면마다 기본으로 복제하지 않는다. JSON governance 파일은 향후 만들 실제 verifier(예: `opportunity-room-live-wire`류)가 구조적으로 그것을 요구할 때만, 그 verifier 범위에 한해 최소로 만든다.

## 절대 금지 (재확인)

React/Next 코드 수정 · Figma 실제 수정 · Home 수정 · API/DB/Migration 구현 · Production 배포 · Current Master 우선순위 재설계 · 레거시 플랜 삭제 · 새 Visual Master/Canon 계층 · 화면별 과도한 governance JSON 선제 생성. 이번 세션은 계획만 생성/수정했고 코드/Figma/DB 변경 0.
