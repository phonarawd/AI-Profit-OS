# PUTDUK Consumer UX Architecture

> **문서 종류:** PRODUCT_TRUTH — Phase 3 NEW CONSUMER UX ARCHITECTURE  
> **일자:** 2026-08-18  
> **상태:** FOUNDER APPROVED PRODUCT DECISIONS — Home presentation LOCKED · 다른 페이지 presentation 대기  
> **시각 권위:** APPROVED FIGMA = NONE · HOME PRESENTATION BASELINE = FOUNDER APPROVED / LOCKED (`governance/consumer-home-approval/home-approval-freeze.v1.json`)  
> **구현:** 본 문서는 프로덕션 UI가 아니다. Home 런타임 시각은 freeze SSOT.

```text
BUSINESS_TRUTH        = CURRENT DOMAIN / SERVER / ENGINE / MONEY / LEDGER
PRODUCT_TRUTH         = THIS FOLDER (D-01~D-07 Founder 승인)
PRESENTATION_TRUTH    = NEW APPROVED FIGMA ONLY
IMPLEMENTATION_TRUTH  = CURRENT VERIFIED CODE
PLAYWRIGHT            = VERIFICATION EVIDENCE

OLD_5TAB_AUTHORITY = NO
OLD_5TAB_AUTHORITY = 0
LUX_AUTHORITY = NO
OLD_LUX_AUTHORITY = 0
CANON_AUTHORITY = NO
OLD_CANON_AUTHORITY = 0
VISUAL_MASTER_AUTHORITY = NO
OLD_VISUAL_MASTER_AUTHORITY = 0
FAKE_STEPPER = 0
FAKE_STEPPER = FORBIDDEN
FAKE_FINANCIAL_TRUTH = 0
FAKE_PRODUCT_STATE = 0
FAKE_MATCHING_PROGRESS = 0
DEAD_CTA_IN_ARCHITECTURE = 0
OPEN_FOUNDER_DECISIONS_PHASE3 = 0
FX_TRUTH = SINGLE_OWNER
FX_DUPLICATE_ACTIVE_OWNER = 0
PARTNER_DUPLICATE_ACTIVE_OWNER = 0
KNOWN_DUPLICATE_CRITICAL_TRUTH_OWNER = 0
KNOWN_AMBIGUOUS_CRITICAL_TRUTH_OWNER = 0
```

관련:

| 개념 | SSOT |
|------|------|
| Process | `docs/product/PUTDUK_PRODUCT_DESIGN_ENGINEERING_OPERATING_SYSTEM.md` |
| Founder Intent | `docs/reference/founder-intent/` |
| Journey | `CONSUMER_JOURNEY_MAP.md` |
| Screens | `CONSUMER_SCREEN_INVENTORY.md` |
| CTA / routes | `CONSUMER_ROUTE_CTA_MATRIX.md` |
| Data owners | `CONSUMER_DATA_STATE_OWNER_MATRIX.md` |
| Screen states | `CONSUMER_SCREEN_STATE_MATRIX.md` |
| Gaps | `CONSUMER_IMPLEMENTATION_GAP_REGISTER.md` |
| Current capability | `CONSUMER_CAPABILITY_MAP.md` |
| Core Loop contract | `CONSUMER_CORE_LOOP_CONTRACT.md` (B-LOOP-001 · 2026-08-20) |

---

## Product principles

1. PUTDUK = **AI 기반 글로벌 수익 기회 초간편 매칭 플랫폼**. 유저 프레이밍 = **부업 / 부수입**.
2. 은행 앱 · 거래소 · 카지노 · 기관 대시보드 · 럭셔리 프라이빗 뱅킹으로 재설계하지 않는다.
3. **Universal Simple UX** (한국어 20~70): 쉬운 한국어, IT 용어 화면 0, 성별 분기 0.
4. **3초 이해:** 무엇을 하는지 · 어떤 기회인지 · 필요 자본 · 기대 결과 · 권위 있는 소요 시간 · 다음 행동.
5. **Required Capital**이 핵심 개념이다. 참여 전에 얼마가 필요한지 알 수 있어야 한다.
6. USDT = 원장 기준. KRW = 참고 표시. 클라이언트 FX 발명 0.
   FX_TRUTH_OWNER = `CurrentFxApprox` (`POST /me/current-fx/approx`). 카드 KRW `0` fallback은 두 번째 owner가 아니라 INVALID_IMPLEMENTATION_FALLBACK(GAP).
7. Engine / Money 상태만 보여 준다. `0` ≠ UNAVAILABLE. FX 참고 불가 = null / UNAVAILABLE / STALE / PENDING. 0 fallback 금지.
8. AI(퍼뜩)는 요약·설명·다음 행동 제안만. 잔액·수익·FX·자격·매칭·정산을 창작하지 않는다.
9. 공식 파트너(eBay · Amazon · Yahoo! JAPAN Auction)는 신뢰 맥락이다. Yahoo API/adapter/data-source = FORBIDDEN.
10. 합성 활동 · 가짜 진행률 · 가짜 대기 인원 · 가짜 희소성 = FORBIDDEN.

---

## User model

| 항목 | 값 |
|------|-----|
| Primary user | 한국 거주 · 대략 20~70세 |
| Job | 복잡한 글로벌 시장을 배우지 않고, AI가 맞춘 기회에 필요한 자본으로 참여한다 |
| Literacy | 낮은 디지털 숙련도에도 가능해야 함. 유치하거나 촌스럽지 않음 |
| Trust | 공식 글로벌 파트너 + 실제 돈 상태 + 쉬운 설명 |
| Not the user | 트레이더 터미널 사용자 · 기관 운용역 |

Guest는 Landing에서 “무엇을 하는 서비스인지”만 이해한다.  
Authenticated는 Home에서 “지금 나에게 가장 중요한 것과 다음 행동”을 이해한다.

---

## Core journey

```text
Landing → Signup/Login → Onboarding → Home
Home → OpportunityDetail → Eligibility → ParticipateConfirmation
  ├─ 자본 부족 → Funding(Wallet Deposit) → OpportunityDetail/Participate
  └─ 참여 수락 → Matching → MatchingResult → Settlement → Wallet / Home
Wallet → Deposit | Withdraw | History
Retention → Home 상태 변화 · Referral · AIInsight · Notifications
```

백엔드 개념 흐름(검증됨, 전부 완전 배선은 아님):

```text
Opportunity (GET /opportunities)
→ Quote/pricing (detail includePricing + POST preflight)
→ Eligibility (feed bucket + participate guards)
→ Funding (principalUsdt vs requiredCapitalUsdt)
→ FX (POST /me/current-fx/approx · DISPLAY ONLY)
→ Participate (POST /opportunities/:id/participate)
→ Matching (GET /trades/:id + POST execute-tick)
→ Ledger (journalType=settlement)
→ Wallet (GET /wallet/buckets)
```

`POST preflight`/`POST participate`는 `/profits/[id]`에서 실배선됐다. `/trades/[id]/execute`는 `useTradeExecution` 최소 실데이터. `/trades` 목록은 `GET /api/v1/trades` 최소 실데이터. Home·`/profits` 목록은 Spark Dash discovery만 하고 목록 POST는 0이다. 위 흐름의 **API/Engine/Money owner는 존재**한다. 상세 = `CONSUMER_CORE_LOOP_CONTRACT.md`. 과거 `/trades`=`PendingFigma`는 B-TRADES-001으로 닫혔다.

---

## Recommended IA

D-01 승인 후 **LOCKED = IA-A.**

```text
PRIMARY NAV DESTINATIONS = 3
Home
Wallet
My
```

3 destinations approved ≠ bottom tab bar approved. 시각 내비게이션 패턴은 Approved Figma 전까지 미결정.

### 후보 비교 (이력)

| ID | Primary destinations | 장점 | 단점 | 판정 |
|----|----------------------|------|------|------|
| IA-A | Home · Wallet · My | 인지 부하 최소. 매칭/기회는 작업 연속. 레거시 5탭과 무관 | 기회 목록이 커지면 Home이 답답해질 수 있음 | **LOCKED (D-01)** |
| IA-B | Home · Opportunity · Wallet · My | 피드가 길어질 때 탐색이 분명 | 기회와 Home이 중복되기 쉬움 | superseded |
| IA-C | Home · Matching · Wallet · My | 진행 중 작업을 탭으로 고정 | 매칭은 에피소드. 빈 탭이 됨 | REJECT |

레거시 고정 5탭(홈·기회·수익·지갑·내정보)은 **권위 없음**. 개수를 5에 맞추지 않는다.

이유:

- 3초 규칙의 답은 Home 한 곳이면 충분하다.
- 매칭·정산은 **목적지**가 아니라 **작업 상태**다.
- 수익(Earnings)은 별 primary destination이 아니다. Home + Wallet + 정산/내역 맥락.
- Opportunity discovery는 **Home-first**. 전체 목록은 필요할 때 맥락적으로만.
- `/profits`·`/trades`는 호환 경로일 뿐 IA가 아니다.

### Contextual model

```text
Home
→ Opportunity Detail
→ Participate Confirmation
→ Funding if needed
→ Matching
→ Settlement/Result
→ Home or Wallet
```

Account/contextual (primary nav 아님): Referral · Notifications · AI / 퍼뜩 · KYC · Settings · Support · Guides · Legal · Partner/Trust education.

---

## Screen hierarchy

```text
Acquisition
  Landing
  Signup · Login · CompleteProfile · Onboarding

Primary
  Home
  Wallet
  My (Profile hub)

Task continuation (탭 아님)
  OpportunityList (Home 섹션 + 필요 시 전체 화면)
  OpportunityDetail
  ParticipateConfirmation (sheet)
  Matching · MatchingResult
  SettlementDetail
  UsdtDeposit · KrwDeposit · UsdtWithdraw · KrwWithdraw
  TransactionHistory · TransactionDetail

Account / trust
  Referral · Notifications · AIInsight
  Kyc · Settings · Support · Guides · Legal · PartnerTrust
```

---

## Primary navigation

| Destination | User job | 미래 의미 경로 | 현재 호환 경로 |
|-------------|----------|----------------|----------------|
| Home | 지금 뭐가 중요하고 다음에 뭘 하지? | `/` | `/` |
| Wallet | 넣고 · 빼고 · 잔액 · 내역 | `/wallet` | `/wallet` |
| My | 나 · 초대 · 알림 · 퍼뜩 · 설정 · 신뢰 | `/me` | `/me` |

탭 수 · 아이콘 · 하단/상단 배치는 **시각 결정이 아니다.** 여기 적힌 것은 destination job만.  
`3 destinations approved` ≠ `bottom tab bar design approved`.

---

## Contextual navigation

| From | To | When |
|------|----|------|
| Home OpportunityCard | OpportunityDetail | 기회 선택 |
| OpportunityDetail | ParticipateConfirmation | 참여 가능(affordable) |
| OpportunityDetail / Participate | UsdtDeposit 또는 KrwDeposit | nearMiss / INSUFFICIENT_PRINCIPAL |
| Participate success | Matching | tradeId 존재 |
| MatchingResult success | Wallet 또는 Home | 정산 반영 |
| Wallet | 4 rails / History | 자금 작업 |
| My | Referral / Notifications / AIInsight / Kyc / Legal | 계정·성장·신뢰 |

---

## Task continuation

한 작업은 탭을 바꾸지 않고 이어진다.

```text
OpportunityDetail
  → ParticipateConfirmation
    → (optional) Funding → 복귀
    → Matching
      → MatchingResult
        → Home 또는 Wallet
```

복귀 토큰 개념: `returnTo = OpportunityDetail | ParticipateConfirmation`.  
구현 전 이름만. 값은 발명하지 않는다.

진행 중 매칭이 있으면 Home의 1순위 블록은 MatchingStatus다.

---

## Home job

Home은 대시보드가 아니다.

**Home이 답해야 하는 한 문장:**

```text
지금 나에게 가장 중요한 것은 무엇이고, 다음에 뭘 하면 되지?
```

우선순위(위에서 하나만 primary):

| 순위 | 조건 | Home이 보여 줄 것 | Owner |
|------|------|-------------------|-------|
| 1 | session guest/expired | Landing/재로그인 | Auth session |
| 2 | Matching InProgress/Retrying | MatchingStatus + 허용 행동 | GET `/trades/:id` |
| 3 | affordable opportunity | OpportunityCard + RequiredCapital + Participate CTA | feed + buckets |
| 4 | nearMiss only | 부족분(authoritative suggestDeposit) + Deposit CTA | classification |
| 5 | lockedHigh / empty | 정직한 empty · 입금 또는 대기 | feed counts |
| 6 | API unavailable | UNAVAILABLE · 0으로 채우지 않음 | viewState |

Home이 **같이** 둘 수 있는 보조(primary를 밀어내지 않음):

- Wallet 요약: principal / profit / locked — buckets가 있을 때만
- AIInsight: Fact/Inference/Recommendation 구분. 금액 창작 0
- PartnerTrust: 맥락 한 줄. 로고 스트립 강제 0
- Notifications: 뱃지/진입. 가짜 긴급 0

Home이 **하지 않는 것:**

- 전체 거래소 차트
- 실시간 위젯 다수
- growth demo/hybrid ticker
- `progressPct`를 퍼센트 바로미터로 표시
- `todayPossibleProfitUsdt`를 보장 수익처럼 카피

`GET /api/v1/me/home-read` 와 `GET /api/v1/me/home-money-read` 는 Home Fact 입력이다. UI가 재합산하지 않는다.

---

## Opportunity UX

### OpportunityCard (최소 · owner 있는 것만)

| UI concept | Owner | 없으면 |
|------------|-------|--------|
| Opportunity name (`assetLabel`) | OpportunityCard | 카드 생략 또는 UNAVAILABLE |
| RequiredCapital (`requiredCapitalUsdt`) | Engine/opportunity row | 참여 CTA 비활성 |
| Expected result (`expectedProfitUsdt`) | Engine pricing | UNAVAILABLE. 0 위조 금지 |
| Duration (`estimatedDurationSec`) | OpportunityCard | 시간 숨김 |
| Eligibility bucket | `affordable` / `nearMiss` / `lockedHigh` | 참여 가드에 위임 |
| Availability (`status`) | `available` / `paused` / `expired` / `circuit_open` | 참여 불가 |
| Primary CTA | Participate 또는 Deposit 또는 대기 | INTENTIONALLY_DISABLED |

표시하지 않음(유저 표면 금지 또는 INTERNAL):

- `executionPlatforms`
- `expectedSellDays`
- `sellSuccessRate`를 성공 약속으로
- listing adapter id를 거래소 용어로

Partner 맥락은 “공식 글로벌 협력”이지, 유저가 직접 이베이에서 사라는 뜻이 아니다.

### OpportunityDetail

답해야 하는 질문:

1. 무엇인가?
2. 왜 기회인가? (`arbitrageTypeKo` pass-through)
3. 얼마가 필요한가? (RequiredCapital)
4. 무엇이 일어날 수 있는가? (기대 결과 · 매칭 실패/Safe Stop 포함)
5. 얼마나 걸리는가? (authoritative duration만)
6. 조건/위험은? (compareReady, stale, circuit — 기술명 숨김)
7. 참여할 수 있는가? (bucket + 최종 participate)
8. 참여 후 무엇인가? (Matching → Settlement → Wallet)

Quote 단계는 별도 상품 화면이 아니다. Detail의 pricing + `POST .../preflight` 가 Quote다.

---

## Matching UX

### Engine → Consumer

| ENGINE STATE | resultCode | CANONICAL CONSUMER | 한국어 의미 | 허용 행동 |
|--------------|------------|--------------------|-------------|-----------|
| `running` | (없음) | MatchingInProgress | 기회를 맞추는 중 | 기다림. 진행률 숫자 금지 |
| `requeue` | `REQUEUE` | MatchingRetrying | 다시 맞추는 중 | 기다림 |
| `success` | `MATCH_SUCCESS` | Settled | 정산이 반영됨 | Wallet / Home |
| `safe_stop` | `PRICE_MOVED` `BELOW_MIN_PROFIT` `MATCH_TIMEOUT` `CIRCUIT_OPEN` | StoppedSafely | 이번에는 맞지 않음. 원금은 잠금 해제 | 다른 기회 / Home |
| `cancelled` | `CANCELLED_BY_USER` | Cancelled | 취소됨 | Home. 유저 취소 API는 현재 MISSING |
| `failed` | `SYSTEM_FAILED` | Failed | 지금은 처리할 수 없음 | Support |

```text
FAKE_STEPPER = 0
FAKE_MATCHING_PROGRESS = 0
```

`stepIndex` · `progressPct` 는 서버가 Soft 타이머 비율로 채우는 **presentation 필드**다 (`presentationProgress`). Consumer는 측정 가능한 진행으로 쓰지 않는다. 매칭 중 = **indeterminate**.

`settlement.completed` / ledger journal 이전을 “수익 확정”으로 보여 주지 않는다. `success` + `settledProfitUsdt` + journal이 있을 때만 Settled.

Soft/Hard deadline 시각은 서버 필드다. 초시계로 성공을 연출하지 않는다.

---

## Wallet UX

네 레일:

| Rail | Entry | 요구 | KYC | 금액 | Fee owner | FX | 도착/출발 | 확인 | pending | success | failure | history | recovery |
|------|-------|------|-----|------|-----------|-----|-----------|------|---------|---------|---------|---------|----------|
| USDT Deposit | Wallet | Auth | 참여와 무관 | 유저가 체인으로 보냄 | 네트워크 수수료는 체인. 앱이 발명 0 | 없음(USDT) | TRC20 주소 `GET /wallet/my-deposit-address` | 주소 표시 | `seen` / `ui_confirmed` | `ledger_credited` (19conf) | unmatched / dispute | MISSING user journal list | Support + deposit-disputes |
| USDT Withdraw | Wallet | Auth + KYC approved + step-up | **required** | USDT | deposit-config / ledger | 없음 | destination | confirm + step-up | intent | journal | reject/fail | MISSING list | Support |
| KRW Deposit | Wallet | Auth | 참여와 무관 | `requestedAmountKrw` | suffix ≠ fee | snapshot quote | 운영 안내 계좌(서버/운영 사실만) | payable 금액 확인 | `pending`/`matched` | `approved` → USDT credit | `rejected`/`expired` | request list API 있음 | 재신청 / Support |
| KRW Withdraw | Wallet | Auth + KYC + step-up | **required** | USDT 출금 → KRW rail | fee owner = Money config | snapshot | 유저 계좌(서버 필드) | confirm | intent | journal | fail | MISSING list | Support |

기본 출금 모드 = `profit`. 원금 출금은 숨기지 않되 기본이 아니다.

**KRW 입금 설명(구현 아님):**

```text
requestedAmountKrw + uniqueSuffixKrw = payableAmountKrw
```

유저 말: “보내실 금액은 요청하신 금액에 **확인용 끝자리**가 더해집니다. 끝자리는 수수료가 아닙니다.”  
TTL = 서버 `KRW_DEPOSIT_TTL_MIN`(현재 계약 120분). 화면 IT 용어 0.

1conf는 원장 입금이 아니다. “확인 중”만.

---

## Settlement UX

| 구분 | Owner | 유저 의미 |
|------|-------|-----------|
| principal | `principalUsdt` | 참여에 쓰는 원금 |
| profit | `profitUsdt` / `settledProfitUsdt` | 정산된 수익 |
| locked | `lockedUsdt` | 맞추는 동안 잠긴 금액 |
| available participate capital | `principalUsdt` only | 임의 available 합산 금지 |
| pending matching | trade `running`/`requeue` | 아직 수익 아님 |
| settled | trade `success` + settlement journal | 지갑 반영 |

Earnings는 **별 탭이 아니다.** Home 보조 또는 Wallet 섹션.

User journal/history API는 현재 MISSING → History 화면은 설계 가능하나 목록 Fact를 발명하지 않는다. KRW 입금 요청 목록만 user API가 있다.

---

## Referral UX

Owner = Money `GET/POST /api/v1/referral/*`.

| 개념 | 현재 진실 |
|------|-----------|
| invite | 프로그램 `enabled` · 초대 수 제한 없음 |
| share | `POST /referral/share` (일일 카운터) |
| bind | `POST /referral/bind` 1회 |
| reward condition | Admin program config. Day-1 default `rewardsEnabled=false` |
| reward status | edge status enum (bound … clawed_back) |
| 유저 API가 %를 직접 주지 않음 | `referral/me`는 enabled/rewardsEnabled/edges. **화면에 %/캡 하드코드 금지** |
| pool empty | `REFERRAL_POOL_WAIT` · 초대 실패가 아님 |

L1/L2/L3 영문 등급명을 유저 화면에 쓰지 않는다.

---

## AI UX

이름 = **퍼뜩**.

| 해도 됨 | 하면 안 됨 |
|---------|------------|
| 요약 · 설명 · 순위 · 개인화(disclosure) · 다음 행동 제안 | balance · profit · fee · FX · settlement · eligibility · matching fact · transaction 창작 |

| Label | 의미 |
|-------|------|
| FACT | 서버/Engine/Money 도구 결과 |
| INFERENCE | 추정. 반드시 표시 |
| RECOMMENDATION | 제안. 실행은 유저 CTA |

레인: P=Fact · G=일상(`tools=[]`) · S=조언(mutate 0).  
Surface = `/me/peotteok` 호환 + Home 임베드 가능.

---

## Partner/trust UX

Partnership과 adapter availability는 **다른 도메인**이다. 섞지 않는다.

```text
PARTNERSHIP_TRUTH_OWNER = Founder Lock
ADAPTER_AVAILABILITY_OWNER = current runtime / MI adapter catalog
PARTNERSHIP_STATUS ≠ ADAPTER_AVAILABILITY
PartnerStatus = SINGLE_OWNER
AdapterAvailability = SINGLE_OWNER
PARTNER_DUPLICATE_ACTIVE_OWNER = 0
```

| Partner | Partnership (Founder) | Adapter / data-source (technical) |
|---------|----------------------|-------------------------------------|
| eBay | OFFICIAL | Day-1 listing 가능 (INTERNAL). 유저에게 거래소 조작을 가르치지 않음 |
| Amazon | OFFICIAL | 현재 Consumer 데이터 소스로 쓰지 않음 |
| Yahoo! JAPAN Auction | OFFICIAL | Yahoo API = FORBIDDEN · Yahoo adapter = FORBIDDEN · Yahoo data-source = FORBIDDEN |

```text
Yahoo adapter unavailable
DOES NOT mean
Yahoo partnership unavailable

API ban
DOES NOT disable official partner presentation
```

배치 후보(시각 확정 아님): Opportunity 맥락 · Onboarding · Guides · Home 보조.  
로고 스트립 강제는 하지 않는다.

런타임 `market-intelligence` adapter catalog는 **AdapterAvailability** owner다. Founder partnership lock의 두 번째 진실이 아니다. Yahoo 항목이 catalog에 남아 있어도 Consumer는 Founder lock + API/adapter/data-source FORBIDDEN을 따른다. 구현 정리는 갭(G-P1-09)이지 owner 모호성이 아니다.

---

## Account/support UX

My hub:

- Profile
- Referral
- Notifications (`/me/inbox` + prefs)
- AIInsight
- Kyc (출금 게이트)
- Settings (보안 포함 MERGE)
- Support (분쟁 포함)
- Guides (USDT/원금/수익/FAQ/협력)
- Legal (약관·개인정보·라이선스·OSS)

Membership / Benefits / Events / Strategies = **PRIMARY JOURNEY에서 제거.** 호환 경로만 유지. 제품 핵심이 아님.

---

## Mobile-first priority

좁은 화면에서 한 번에 하나의 primary job.

- 한 개의 Primary CTA
- RequiredCapital과 다음 행동이 접히지 않게
- 터치 영역 · 명확한 초점 순서
- 매칭 중 indeterminate. 장식 애니메이션 0 필수

---

## Desktop enhancement

같은 Business meaning.

추가 가능: 보조 설명 · 신뢰 문단 · 병렬 안내.  
기기별 다른 잔액/자격/매칭 로직 금지.

---

## State philosophy

```text
0           = 권위 있는 숫자 영
UNAVAILABLE = 값을 쓸 수 없음
UNKNOWN     = 아직 확정 전
PENDING     = 최종 아님
STALE       = 알지만 오래됨
```

적용 상태 목록은 `CONSUMER_SCREEN_STATE_MATRIX.md`.

HomeRead `viewState`: `ready_empty` · `ready_data` · `stale` · `recoverable_error` · `blocked` · `unauthorized`.  
무단/게스트 Fact를 0으로 채우지 않는다.

---

## CTA philosophy

모든 CTA는 다음 중 정확히 하나:

```text
VALID_ROUTE
VALID_ACTION
INTENTIONALLY_DISABLED
FUTURE_CAPABILITY
DEAD
```

```text
UNCLASSIFIED_CRITICAL_CTA = 0
DEAD_CRITICAL_CTA = 0
CTA_ACCOUNTING = 100%
```

죽은 버튼 0. 조건 불만족 시 disabled reason을 갖는다.

Primary 참여 CTA 도메인 = `participate`. 카피 확정은 미래 Figma. 레거시 문구를 지금 잠그지 않는다.

---

## Presentation model

```text
Backend / Engine
↓
SDK / canonical contract
↓
server-side adapter
↓
Presentation Model
↓
React Component
```

UI 허용: format · label · visibility · 상태→한국어 · 위계.  
UI 금지: 잔액·FX·수익·수수료·자격·매칭·정산·입출금 상태 창작.

---

## Accessibility

| 요구 | Phase 3 메모 |
|------|----------------|
| keyboard-accessible flow | 핵심 CTA 순서 |
| clear focus order | Home → primary CTA |
| plain Korean | IT 용어 0 |
| touch-friendly actions | 시각 수치는 Figma |
| no color-only status | 상태 = 텍스트+아이콘 |
| zoom/reflow | 하드코드 기기 디자인 0 |
| reduced motion | 매칭 indeterminate도 모션 필수 아님 |
| error recovery | 코드 대신 다음 행동 |

---

## Performance

아키텍처가 요구하지 않음: 대형 배경 영상 · 상시 애니메이션 · 무거운 라이브 대시보드 · 무한 realtime 위젯 · 거대 클라 상태.

Premium = 명확함이지 이펙트가 아니다.

---

## Future Figma handoff

지금 Figma/Brand/Mockup 없음.

이후 파일 골격(프로세스 문서와 동일):

```text
00_Readme · 01_Foundations · 02_Primitives · 03_Components
04_Patterns · 05_Flows · 06_Screens · 07_Dev-Handoff · 90_Explorations
```

시맨틱 후보: `OpportunityCard` · `RequiredCapital` · `MatchingStatus` · `BalanceSummary` · `TransactionRow` · `PartnerBadge` · `AIInsight` · `DepositMethod`.

첫 디자인 타깃 = **Home** (Desktop + Mobile). Brand / Mockup / Figma 착수는 Founder explicit GO 전 0.

---

## Known implementation gaps

상세 = `CONSUMER_IMPLEMENTATION_GAP_REGISTER.md`.  
Core Loop 계약(2026-08-20 재실측) = `CONSUMER_CORE_LOOP_CONTRACT.md`.

Brand/Figma를 막는 비즈니스 발명 요구는 없다. Home mockup은 **owned fields + UNAVAILABLE**만 쓰면 된다.

구현 전에 막히는 것: user history API, user trade list, user cancel. participate·execute 배선은 B-PARTICIPATION-001 / B-EXECUTION-001에서 닫힘.

---

## Founder approved product decisions

```text
OPEN_FOUNDER_DECISIONS_PHASE3 = 0
D01_APPROVED = YES
D02_APPROVED = YES
D03_APPROVED = YES
D04_APPROVED = YES
D05_APPROVED = YES
D06_APPROVED = YES
D07_APPROVED = YES
```

구현하지 않는다. 아키텍처 Product Truth만.

| Decision ID | Approved product truth |
|-------------|------------------------|
| D-01 | Primary destinations = **Home · Wallet · My** (3). Opportunity는 영구 primary nav가 아니다. 구 고정 5탭 권위 0. 시각 탭 바는 미결정. |
| D-02 | Root = **`/`**. Guest → Landing/acquisition. Authenticated → Consumer Home. 같은 경로, session-aware. |
| D-03 | Earnings / Profit = **별 primary nav 아님**. Home + Wallet + 정산/내역 맥락. |
| D-04 | Opportunity discovery = **Home-first**. 전체 목록은 필요할 때 맥락적으로만. |
| D-05 | Matching cancel CTA = **HIDE** until authoritative user cancel capability/API exists and is verified. FUTURE_CAPABILITY. 죽은 Cancel 금지. |
| D-06 | Profit → Principal transfer = **HIDE** until authoritative current runtime capability is verified. 헌법/플랜 이력으로 추론하지 않음. |
| D-07 | Referral = **NO HARDCODED REWARD % · NO HARDCODED REWARD AMOUNT**. 개념·자격/상태만 (authoritative일 때). 이력 %/캡 복사 금지. |

## Open product decisions

없음.

```text
OPEN_FOUNDER_DECISIONS_PHASE3 = 0
```

기술 질문(레포가 답함)은 여기 두지 않는다.
