# CONSUMER CORE LOOP CONTRACT

> **문서 종류:** Product · Visual · Implementation Contract  
> **TASK:** B-LOOP-001 · Track B User Profit Loop  
> **일자:** 2026-08-20  
> **상태:** CONTRACT_READY · IMPLEMENTATION = EXECUTION_WIRED  
> **시각 권위:** APPROVED FIGMA = NONE  
> **Engine Rule:** 재정의 0 (`settlement_rule.cjs` KEEP)

```text
classification = CURRENT_CORE_LOOP_CONTRACT
NEW_VISUAL_LOCK = NO
NEW_CONSTITUTION = NO
ENGINE_RULE_REDEFINITION = FORBIDDEN
PRODUCTION_IMPACT = NONE
```

교차 SSOT:

| 개념 | 파일 |
|------|------|
| Product journey | `CONSUMER_UX_ARCHITECTURE.md` · `CONSUMER_JOURNEY_MAP.md` |
| Screens / CTA | `CONSUMER_SCREEN_INVENTORY.md` · `CONSUMER_ROUTE_CTA_MATRIX.md` |
| Owners | `CONSUMER_DATA_STATE_OWNER_MATRIX.md` |
| Machine contract | `governance/consumer-loop/core-loop.v1.json` |
| Legacy pointer | 03 `redesign-r4-core-loop-contract` (실행 큐 아님) |

---

## 0. Authority

```text
BUSINESS_TRUTH        = ParticipateService · PreflightService · TradesExecutionService · settlement_rule.cjs · Ledger
PRODUCT_TRUTH         = 이 문서 + CONSUMER_UX_ARCHITECTURE Core journey
PRESENTATION_TRUTH    = NEW APPROVED FIGMA ONLY
IMPLEMENTATION_TRUTH  = 2026-08-20 재실측 코드
HOME_PRESENTATION     = FOUNDER APPROVED / LOCKED (이 계약 범위 밖)
PROFITS_LIST_UI       = Spark Dash discovery (participate visual 권위 아님)
```

금지된 권위 승격:

- 구 Visual Master / Canon / Lux / 고정 5탭으로 Core Loop 화면을 복구
- Home geometry를 `/profits/[id]` · `/trades` · execute에 종속
- Figma 없이 픽셀·색·카드 생김새를 잠금
- `progressPct` / `stepIndex`를 측정 가능한 진행으로 승격
- Engine Rule · pricing · FX · ledger posting을 이 슬라이스에서 재작성

---

## 1. Product Contract

### 1.1 Object identity

같은 말이 아니다. 섞지 않는다.

| 객체 | 정체 | 아님 |
|------|------|------|
| Opportunity | `opportunities.id` 실행 가능 행 | CanonicalProduct · Listing · MatchResult · SourceObservation |
| RequiredCapital | `requiredCapitalUsdt` (opportunity row) | 클라 합산 · KRW 환산 원장 |
| PreflightToken | Nest HMAC `pf1` · TTL 300s · `userId`+`opportunityId` 바인딩 | 클라 위조 · 딥링크 스킵 |
| ParticipateRequest | `participate_requests` + `idempotencyKey` + `request_fingerprint` | 두 번째 참여 의사 |
| amountUsdt | **=** `requiredCapitalUsdt` (decimal string) | 임의 부분 금액 |
| tradeId | `trade_executions.id` · participate `accepted` 시 발급 | opportunityId |
| ParticipateProof | `proofHash` SHA256 · buy/sell/expected/fxSnapshot/pricingVersion | 유저가 편집하는 영수증 |
| Matching | trade `running` / `requeue` | 수익 확정 |
| Settlement | `success` + `MATCH_SUCCESS` + `journalType=settlement` + `settledProfitUsdt` | `presentationProgress` |
| SafeStop | `safe_stop` + unlock journal (`participate_unlock`) | 실패 연출 · 원금 소멸 |

```text
MATCH_EQUALS_OPPORTUNITY = false
PROGRESS_PCT_EQUALS_SETTLEMENT = false
EXPECTED_PROFIT_EQUALS_SETTLED_PROFIT = false
PRINCIPAL_PLUS_PROFIT_AS_AVAILABLE = FORBIDDEN
```

### 1.2 Stages (유저 의미)

Quote는 별 화면이 아니다. Detail pricing + `POST /api/v1/opportunities/:id/preflight` 가 Quote다.

```text
Discovery          GET /api/v1/opportunities
Detail             GET /api/v1/opportunities/:id
Quote / Preflight  POST /api/v1/opportunities/:id/preflight
Eligibility        feed bucket + participate guards (최종은 POST)
Funding            부족 시 Wallet Deposit · shortfall = suggestDepositUsdt
Participate        POST /api/v1/opportunities/:id/participate
Matching           GET /api/v1/trades/:id + POST …/execute-tick
Settlement         MATCH_SUCCESS → journalType=settlement
Wallet             GET /wallet/buckets
```

호환 경로(IA가 아님):

| 화면 | 현재 경로 | 의미 |
|------|-----------|------|
| OpportunityList | `/profits` | Discovery overflow (D-04 Home-first) |
| OpportunityDetail | `/profits/[id]` | 참여 결정 |
| ParticipateConfirmation | sheet on Detail (전용 route 없음) | preflight 후 확정 |
| Matching + Result | `/trades/[id]/execute` | 진행 · 결과 |
| Earnings(비탭) | `/trades` | D-03 별 primary nav 아님. 참여 목록 호환 |

### 1.3 State machine

| ENGINE | resultCode | Consumer | 유저 의미 | 다음 |
|--------|------------|----------|-----------|------|
| (preflight issued) | — | QuoteReady | 확인함. 아직 잠금 아님 | Participate 또는 닫기 |
| `accepted` + `running` | — | MatchingInProgress | 맞추는 중 | 대기 |
| `requeue` | `REQUEUE` | MatchingRetrying | 다시 맞추는 중 | 대기 |
| `success` | `MATCH_SUCCESS` | Settled | 원금 복귀 + 수익 반영 | Wallet / Home |
| `safe_stop` | `PRICE_MOVED` `BELOW_MIN_PROFIT` `MATCH_TIMEOUT` `CIRCUIT_OPEN` | StoppedSafely | 이번엔 안 맞음. 원금 잠금 해제 | Home / 다른 기회 |
| `cancelled` | `CANCELLED_BY_USER` | Cancelled | 취소됨 | Home. 유저 cancel API = MISSING (D-05 HIDE) |
| `failed` | `SYSTEM_FAILED` | Failed | 지금은 처리 못 함 | Support |

```text
FAKE_STEPPER = 0
FAKE_MATCHING_PROGRESS = 0
FAKE_FINANCIAL_TRUTH = 0
```

`stepIndex` · `progressPct` = Soft 타이머 **presentation** (`presentationProgress`). Consumer = **indeterminate**.

Settled 판정 = `success` **그리고** `settledProfitUsdt` **그리고** settlement journal. 하나만으로 “수익 확정” 금지.

### 1.4 Money / guard invariants

| 규칙 | Owner | 위반 시 |
|------|-------|---------|
| `amountUsdt` = `requiredCapitalUsdt` | ParticipateService | `VALIDATION_ERROR` |
| 참여 자본 = `principalUsdt` only | Ledger buckets | `INSUFFICIENT_PRINCIPAL` |
| KYC | 출금만 | participate 경로 KYC 가드 0 |
| practice → 참여/출금 승격 | Risk + ledger | 금지 |
| 잔액 column 직접 UPDATE | Ledger | 금지 (journal only) |
| 같은 idempotency + 다른 payload | fingerprint | 409 conflict |
| 외부 HTTP on participate | ParticipateService | 금지 |
| userId | JWT session only | body/query userId 신뢰 0 |
| Rule 입력 | `settlement_rule.cjs` | ticker/mission/demo/난수 0 |

### 1.5 Participate failure → recovery

| code | 유저 회복 |
|------|-----------|
| `PREFLIGHT_REQUIRED` | 확인 다시 (토큰 재발급) |
| `INSUFFICIENT_PRINCIPAL` / `INSUFFICIENT_BALANCE` | Funding → 복귀 |
| `PRICE_STALE` / `PRICE_STALE_DATA` | 목록/상세 새로고침 |
| `OPPORTUNITY_EXPIRED` | 목록 |
| `MATCH_BLOCKED` / `COMPARE_NOT_READY` / `CIRCUIT` | 참여 불가 설명 |
| `VALIDATION_ERROR` | 금액=RequiredCapital |
| `AUTH_REQUIRED` | Login |
| `CAPITAL_BAND_LOCKED` / `DAILY_MATCH_CAP` / `NO_SLOTS` | Home 설명 (IT 코드 숨김) |

### 1.6 Proof · freshness · recovery

- Preflight TTL = **300s**. 만료 = 재발급. 스킵 딥링크 금지.
- Participate는 `preflight.assertValid` 필수. 없으면 412 `PREFLIGHT_REQUIRED`.
- 가격 신선도 = `guardParticipate` + `stale_at` + `DEFAULT_PRICE_STALE_MAX_SEC`. 클라 TTL 발명 금지.
- Proof는 participate 시 저장. success/safe_stop에서 **같은 숫자**를 보여 준다. 클라가 proof를 재계산하지 않는다.
- 네트워크 끊김: poll 재시도. trade 404 → Home. 가짜 %로 복구 금지.
- Funding 복귀 토큰 `returnTo` = UX 개념만. API 필드 발명 금지 (G-P1-08).

### 1.7 CTA domain

```text
Primary participate domain = participate
Copy lock (product-drift) = 수익 벌기 · 상세 허용 = 이 기회로 수익 벌기
Forbidden = 이 상품으로… · 매칭 참여 · 구매하기 · 판매하기 · 거래하기
Cancel matching CTA = FUTURE_CAPABILITY (D-05 HIDE)
```

픽셀 카피 확정은 미래 Figma. domain과 금지어만 지금 잠근다.

---

## 2. Visual Contract

```text
VISUAL_CLASS = CONSTRAINT_ONLY
APPROVED_FIGMA_CORE_LOOP = NONE
NEW_VISUAL_LOCK = NO
DOES_NOT_APPROVE_PIXELS = YES
HOME_GEOMETRY_DEPENDENCY = FORBIDDEN
LEGACY_VISUAL_RECOVERY = FORBIDDEN
```

이 절은 색·radius·간격·카드 생김새를 잠그지 않는다. **보여서는 안 되는 것**과 **상태가 의미하는 것**만 계약한다.

### 2.1 화면별 presentation 상태 (2026-08-20)

| 화면 | 현재 코드 | Visual 권위 |
|------|-----------|-------------|
| Home | Spark Dash LOCKED | Home freeze SSOT. Core Loop 범위 밖 |
| `/profits` | `ProfitsDesktopClient` Spark Dash | Discovery only. Founder Review Candidate. participate visual 아님 |
| `/profits/[id]` | `OpportunityDetailClient` 최소 실데이터 표면 | Approved Figma 없음 · WIRE_WITHOUT_APPROVED_FIGMA |
| ParticipateConfirmation | 라우트/컴포넌트 없음 | Approved Figma 없음 |
| `/trades` | `PendingFigma title="수익"` | Approved Figma 없음 · 제목은 호환 잔여 |
| `/trades/[id]/execute` | `TradeExecuteClient` 최소 실데이터 (`useTradeExecution`) | Approved Figma 없음 · WIRE_WITHOUT_APPROVED_FIGMA |

### 2.2 Forbidden presentation

- FAKE_FOMO / FAKE_ACTIVITY / FAKE_STEPPER / FAKE_MATCHING_PROGRESS
- `progressPct`를 퍼센트 바·초시계 성공 연출로
- 가짜 금액 · 하드코드 수익 · 결측을 `0`으로 채움
- 매칭 중 “수익 확정”
- 유저 표면 `executionPlatforms` · `expectedSellDays` · 판매성공률
- IT 용어 (API, token, circuit, preflight, journal)
- Home 레이아웃을 Detail/Matching에 복제

### 2.3 State → 의미 (픽셀 아님)

| Consumer state | 보여야 하는 의미 | 보여서는 안 되는 것 |
|----------------|------------------|---------------------|
| QuoteReady | 필요 자본 · 기대 결과 · 안 맞을 수 있음 | 잠긴 것처럼 연출 |
| MatchingInProgress / Retrying | 맞추는 중 / 다시 맞추는 중 | % · 단계 숫자 · 당첨 게이지 |
| Settled | 원금 복귀 + 정산 수익 | journal 전 확정 |
| StoppedSafely | 이번엔 안 맞음 · 원금 해제 | 손실 연출 · 원금 사라짐 |
| Failed | 지금은 처리 못 함 | 재시도 가장 성공 |
| insufficient-capital | 부족분(서버 suggest) + 입금 | 클라 뺄셈 |

### 2.4 구현 시 visual 규칙 (다음 슬라이스)

```text
WIRE_WITHOUT_APPROVED_FIGMA = ALLOWED   (기능 배선)
INVENT_PRESENTATION = FORBIDDEN
MINIMAL_REAL_DATA_SURFACE = ALLOWED
PendingFigma 유지 + 실데이터 연결 = ALLOWED
레거시 Canon/Visual Master 복구 = FORBIDDEN
```

B-PARTICIPATION-001 / B-EXECUTION-001 / B-TRADES-001은 **가짜 돈을 넣지 않는 실배선**이 목표다. 픽셀 완료는 Approved Figma 이후.

---

## 3. Implementation Contract

### 3.1 KEEP (재사용 · 재작성 0)

| Owner | 경로 |
|-------|------|
| Preflight | `services/api-nest/src/loop/preflight.service.ts` |
| Participate | `services/api-nest/src/opportunities/participate.service.ts` |
| Routes | `OPPORTUNITY_USER_ROUTES` · `TRADE_USER_ROUTES` |
| Rule | `services/engine-rust/settlement_rule.cjs` (`guardParticipate` · `evaluateExecution`) |
| Execute | `services/api-nest/src/trades/trades.execution.service.ts` |
| Ledger | `LedgerPostingService` · buckets · `participate_lock` / `settlement` / `participate_unlock` |
| Schemas | `schemas/participate-request.v1.json` · `schemas/participate-proof.v1.json` |
| SDK feed | `fetchOpportunityFeed` · `fetchOpportunityDetail` |
| SDK participate | `issuePreflight` · `postParticipate` |
| SDK execution | `useTradeExecution` (execute 페이지 연결) |
| SDK wallet | `fetchWalletBuckets` |
| Verify | `participate-http` · `preflight-may-stop` · `participate-web-wire` · `execute-rule-loop` · `participate-proof` · `match-success-rule` · `bucket-invariant` |

### 3.2 WIRE (이 계약 다음 슬라이스 · 이 슬라이스에서 구현 0)

| 다음 TASK | 해야 할 일 |
|-----------|------------|
| B-PARTICIPATION-001 | DONE — SDK `preflight`+`participate` · `/profits/[id]` POST 실연결 · confirmation dialog |
| B-EXECUTION-001 | DONE — `/trades/[id]/execute` → `useTradeExecution` · 상태 테이블 준수 |
| B-TRADES-001 | `/trades` 실목록. list-by-user API 없으면 발명 금지 · UNAVAILABLE 또는 기존 GET만 |
| B-LOOP-002 | `verify:core-loop-release` 실 E2E (이 슬라이스에서 신설 0) |
| B-FEED-001 | 참여 성공/진행 중 feed 제거 (별 계약) |

### 3.3 DO NOT INVENT

- 새 pricing / FX / fee / marketId
- participate KYC 게이트
- 유저 cancel API
- trade list API (없으면)
- returnTo API 필드
- 클라 `suggestDepositUsdt` 재계산
- 난수 매칭 · 가짜 stepper
- Home freeze 파일 수정

### 3.4 File-level handoff (착수 지도 · 지금 수정 0)

| 파일 | 다음 분류 |
|------|-----------|
| `packages/sdk/src/index.ts` | WIRED participate/preflight export |
| `apps/web/app/profits/[id]/page.tsx` | WIRED real detail + confirm |
| `apps/web/app/trades/[id]/execute/page.tsx` | WIRED `useTradeExecution` (최소 실데이터) |
| `apps/web/app/trades/page.tsx` | REPLACE PendingFigma → list or honest UNAVAILABLE |
| `apps/web/app/profits/page.tsx` | KEEP discovery. participate POST 넣지 말 것 (카드는 Detail로) |
| `services/api-nest/**` participate/preflight/execute | NO_CHANGE unless bug |
| `services/engine-rust/settlement_rule.cjs` | NO_CHANGE |

---

## 4. Gap analysis (2026-08-20 재실측)

추측 금지. 아래는 파일 읽기 결과.

| 주장 | 판정 | Evidence |
|------|------|----------|
| `/profits/[id]`가 participate를 호출한다 | **TRUE** | `OpportunityDetailClient` → `issuePreflight` + `postParticipate` |
| web `POST …/participate` | **1건** | `/profits/[id]` only. `/profits` 목록 POST 0 |
| SDK participate/preflight export | **PRESENT** | `packages/sdk/src/participate` + `index.ts` |
| `useTradeExecution` | **EXISTS · WIRED** | `TradeExecuteClient` import · cookie session tick |
| `GET` feed/detail SDK | **EXISTS** | `fetchOpportunityFeed` · `fetchOpportunityDetail` |
| `/profits` 목록 UI | **DISCOVERY ONLY** | 카드는 Detail로. 목록 POST participate 0 |
| Nest POST preflight | **OWNER_FOUND** | `PreflightService.issue` · TTL 300 · `mayStopRequired` |
| Nest POST participate | **OWNER_FOUND** | `ParticipateService` · KYC0 · amount=required · idempotency |
| Nest GET/POST trades | **OWNER_FOUND** | `TRADE_USER_ROUTES` · `settlement_rule.cjs` |
| User trade list API | **MISSING** | `GET /trades/:id` only (G-P1-05) |
| User cancel API | **MISSING** | D-05 HIDE |
| 가짜 금액 하드코드 | **CLOSED** | 그린필드 PendingFigma. 재실측 확인 |
| Engine Rule 재정의 필요 | **NO** | 기존 Rule KEEP |

```text
FAKE_FINANCIAL_VALUE_BUG = CLOSED
WEB_PARTICIPATE_POST = 1
SDK_PARTICIPATE_EXPORT = PRESENT
BACKEND_CORE_LOOP = OWNER_FOUND
REAL_IMPLEMENTATION = EXECUTION_WIRED
CORE_LOOP_CERTIFICATION = NOT_THIS_SLICE
```

---

## 5. Acceptance (이 슬라이스)

B-LOOP-001 done = 계약 문서 + 갭 재실측 + `verify:core-loop-contract` PASS.  
B-PARTICIPATION-001 done = SDK export + `/profits/[id]` 실배선 + `verify:participate-web-wire` PASS.  
B-EXECUTION-001 done = `/trades/[id]/execute` → `useTradeExecution` + `verify:execute-web-wire` PASS.

```text
IMPLEMENTATION_START = B-PARTICIPATION-001
CERTIFICATION = B-LOOP-002
FOUNDER_APPROVAL_REQUIRED = NO
```
