# CONSUMER WALLET CONTRACT

> **문서 종류:** Product · Visual · Implementation Contract  
> **TASK:** B-WALLET-001 · Track B User Profit Loop  
> **일자:** 2026-08-20  
> **상태:** CONTRACT_READY · IMPLEMENTATION = WEB_UNWIRED · CERTIFICATION = PASS  
> **시각 권위:** APPROVED FIGMA = NONE · Spark Dash DNA = CONSTRAINT_ONLY  
> **Money Rule:** 재정의 0 (Ledger · buckets · 1/19conf · KRW Admin 승인 · KYC/step-up KEEP)

```text
classification = CURRENT_WALLET_CONTRACT
NEW_VISUAL_LOCK = NO
NEW_CONSTITUTION = NO
MONEY_RULE_REDEFINITION = FORBIDDEN
PG_GATEWAY = FORBIDDEN
PRODUCTION_IMPACT = NONE
```

교차 SSOT:

| 개념 | 파일 |
|------|------|
| Product journey | `CONSUMER_UX_ARCHITECTURE.md` Wallet UX · `CONSUMER_JOURNEY_MAP.md` Funding/Wallet |
| Screens / CTA | `CONSUMER_SCREEN_INVENTORY.md` · `CONSUMER_ROUTE_CTA_MATRIX.md` |
| Owners | `CONSUMER_DATA_STATE_OWNER_MATRIX.md` |
| Machine contract | `governance/consumer-wallet/wallet.v1.json` |
| Home freeze | `governance/consumer-home-approval/home-approval-freeze.v1.json` |
| Legacy pointer | 03 `redesign-r3-wallet-contract` (실행 큐 아님) |

---

## 0. Authority

```text
BUSINESS_TRUTH        = LedgerPostingService · LedgerBucketsService · Deposit/Withdraw/KYC
PRODUCT_TRUTH         = 이 문서 + CONSUMER_UX_ARCHITECTURE Wallet UX
PRESENTATION_TRUTH    = NEW APPROVED FIGMA ONLY
IMPLEMENTATION_TRUTH  = 2026-08-20 재실측 코드
HOME_PRESENTATION     = FOUNDER APPROVED / LOCKED (이 계약이 geometry를 가져오지 않음)
SPARK_DASH_DNA        = money/trust 제약만 공유. Home/Profits geometry 종속 0
```

금지된 권위 승격:

- 구 Visual Master / Canon / Lux / 고정 5탭으로 Wallet 화면을 복구
- Home geometry(Header/Hero/Sidebar/Bottom Nav/Home spacing)를 `/wallet*`에 복제
- Figma 없이 픽셀·색·카드 생김새를 잠금
- `asAmount` 결측 `"0"`을 잔액 진실로 승격 (G-P0-01)
- 1conf를 입금 완료로 승격
- principal+profit를 “총자산/출금가능”으로 합산
- PG사 · 잔액 column UPDATE · payable/FX 클라 재계산

플랜 문구 정정(재실측):

```text
PLAN_SAID(B-WALLET-002) = 시각 정합만(기능 대부분 REAL)
REMEASURED              = backend REAL · SDK PARTIAL · web 8면 PendingFigma
B-WALLET-002            = WIRE_WITHOUT_APPROVED_FIGMA (최소 실데이터) · 픽셀 발명 0
```

---

## 1. Product Contract

### 1.1 Object identity

같은 말이 아니다. 섞지 않는다.

| 객체 | 정체 | 아님 |
|------|------|------|
| principalUsdt | 참여에 쓰는 원금 (`wallet_buckets`) | 출금 기본 · 합산 available |
| profitUsdt | 출금 기본 버킷 · 정산 누적 수익 | 참여 자본 |
| lockedUsdt | 매칭 중 잠금 | 사라진 원금 · 손실 |
| practiceUsdt | 연습 잔액 | 출금/참여/수익 승격 |
| liabilityUsdt | 네 버킷 합 (불변식) | 유저 “총자산” 라벨 |
| WalletBuckets | `GET /api/v1/wallet/buckets` | HomeMoneyRead 별 공식 · 클라 합산 |
| UsdtDepositAddress | `GET /api/v1/wallet/my-deposit-address` TRC20 | 유저가 고르는 네트워크 |
| UsdtDepositEvent | `usdt_deposit_events` · observe/tick | 유저가 누르는 입금 버튼 |
| 1conf / ui_confirmed | 체인에서 보임 · **원장 0** | 잔액 반영 |
| 19conf / ledger_credited | `deposit_usdt` journal 후 잔액 | “거의 완료” 연출 |
| KrwDepositRequest | `requestedAmountKrw + uniqueSuffixKrw = payableAmountKrw` | 수수료 · 클라 덧셈 |
| KrwCredit | Admin `approved` + journal | pending/matched를 입금 완료 |
| WithdrawIntent | `POST /api/v1/wallet/withdraw` · default `mode=profit` | practice debit · PG 출금 |
| StepUpToken | challenge/verify 후 단기 토큰 | 비밀번호만으로 출금 |
| KycStatus | `none\|pending\|approved\|rejected` | 참여/입금 게이트 |
| HistoryFact | user journal list `GET /api/v1/wallet/journals` · KRW request list PARTIAL | 가짜 0건 목록 |
| GetUsdtGuide | `/me/guide/get-usdt` 교육 | 5번째 머니 레일 |

```text
PRINCIPAL_PLUS_PROFIT_AS_AVAILABLE = FORBIDDEN
PRACTICE_TO_PROFIT_OR_WITHDRAW = FORBIDDEN
ONE_CONF_EQUALS_CREDITED = FORBIDDEN
MISSING_AS_ZERO = FORBIDDEN
PG_GATEWAY = FORBIDDEN
LEDGER_COLUMN_UPDATE = FORBIDDEN
KYC_ON_DEPOSIT = FORBIDDEN
KYC_ON_PARTICIPATE = FORBIDDEN
KYC_ON_WITHDRAW = REQUIRED
```

불변식(서버):

```text
principalUsdt + profitUsdt + lockedUsdt + practiceUsdt = liabilityUsdt
```

### 1.2 Four rails

레일 = 머니 mutation 경로. Overview/History/KYC/가이드는 레일이 아니다.

| Rail | 유저 의미 | 현재 경로 | 요구 | 성공 | 실패 회복 |
|------|-----------|-----------|------|------|-----------|
| USDT Deposit | 트론으로 테더 보내기 | `/wallet/deposit` (혼합) | Auth | 19conf journal → principal | unmatched → Support/dispute |
| KRW Deposit | 지정 금액 송금 후 운영 확인 | `/wallet/deposit` (혼합) | Auth | Admin approved → USDT credit | expire/reject → 재신청 |
| USDT Withdraw | 수익(기본)을 테더로 | `/wallet/withdraw/usdt` | Auth+KYC+step-up | intent → ledger | KYC/step-up/min holding |
| KRW Withdraw | 수익을 원화로 | `/wallet/withdraw/krw` | Auth+KYC+step-up | intent · FX snapshot | FX null → KRW 추정 숨김 |

호환 경로(IA가 아님):

| 화면 | 현재 경로 | 의미 |
|------|-----------|------|
| Wallet | `/wallet` | 버킷 + 4레일 입구 (D-01 primary) |
| UsdtDeposit + KrwDeposit | `/wallet/deposit` | 혼합. 미래 분리=`/wallet/deposit/usdt`·`/wallet/deposit/krw` (G-P1-07) |
| WithdrawChooser | `/wallet/withdraw` | 테더/원화 선택 |
| TransactionHistory | `/wallet/history` | journal `GET /api/v1/wallet/journals` · KRW list PARTIAL |
| Kyc | `/me/kyc` | 출금만 |
| GetUsdtGuide | `/me/guide/get-usdt` | 테더 준비 쉬운 말. mutation 0 |

```text
FUTURE_ROUTE_SPLIT_NOT_REQUIRED_FOR_WIRE = YES
MIXED_DEPOSIT_ROUTE_KEEP_FOR_B-WALLET-002 = YES
PROFIT_MERGE_CTA = D-06 HIDE
RETURN_TO_API_FIELD = FORBIDDEN (G-P1-08 UX only)
```

### 1.3 State machine

#### Buckets (read)

| 서버 | Consumer | 유저 의미 | 다음 |
|------|----------|-----------|------|
| 200 + 네 버킷 | Ready | 어디에 얼마 | rails |
| 401 | AuthRequired | 로그인 필요 | Login |
| 404 buckets | Unavailable | 지금은 숫자를 못 봄 | 0으로 채우지 않음 |

#### USDT Deposit

| 서버 | Consumer | 유저 의미 |
|------|----------|-----------|
| address ready | AddressReady | 이 주소로 보내면 됨 |
| `seen` / 1conf `ui_confirmed` | Confirming | 확인 중. 아직 잔액 아님 |
| `ledger_credited` 19conf | Credited | 원금 반영 |
| unmatched / reorg / dust | Problem | Support · 분쟁 |

observe / chain-watcher / sweeper = **유저 화면 아님**.

#### KRW Deposit

| `KrwDepositStatus` | Consumer | 유저 의미 |
|--------------------|----------|-----------|
| `pending` | WaitingTransfer | 이 금액을 보내세요 (payable) |
| `matched` | Reviewing | 확인 중 |
| `approved` | Credited | USDT 원금 반영 |
| `expired` / `rejected` | TryAgain | 다시 신청 |
| `manual_review` | Reviewing | 확인 중 |

```text
requestedAmountKrw + uniqueSuffixKrw = payableAmountKrw
suffix ≠ fee
TTL = KRW_DEPOSIT_TTL_MIN (120)
creditedUsdt = trunc18(payableKrw / usdtKrw)   // 서버 only
```

#### Withdraw

가드 순서(서버 고정): `withdrawApplyBlocked` → KYC approved → step-up → risk/minHolding → insert.

| 서버 | Consumer | 유저 의미 |
|------|----------|-----------|
| KYC none/rejected | NeedKyc | 본인 확인 (`/me/kyc`) |
| KYC pending | KycReviewing | 출금 폼 숨김 |
| `WITHDRAW_STEP_UP_REQUIRED` | NeedStepUp | 한 번 더 확인 |
| intent created | Submitted | 접수됨. 잔액은 journal 후 |
| reject/fail | Failed | Support |

```text
DEFAULT_WITHDRAW_MODE = profit
PRINCIPAL_WITHDRAW = reachable, not default
COMBINED_WITHDRAW = reachable, not default
PRACTICE_WITHDRAW = 403 PRACTICE_NOT_WITHDRAWABLE
```

#### KYC

| `kycStatus` | 입금 | 참여 | 출금 |
|-------------|------|------|------|
| none / pending / rejected / approved | 가능 | 가능 | **approved만** |

### 1.4 Money / guard invariants

| 규칙 | Owner | 위반 시 |
|------|-------|---------|
| 버킷 합 = liability | LedgerBucketsService | 서버 throw · UI 합산 금지 |
| 잔액 column 직접 UPDATE | Ledger | 금지 (journal only) |
| 참여 자본 = principal only | Participate/Ledger | `INSUFFICIENT_PRINCIPAL` |
| 1conf ledger 0 | `USDT_UI_CONFIRMATIONS=1` | 잔액 연출 금지 |
| 19conf만 credit | `USDT_LEDGER_CONFIRMATIONS=19` | 조기 완료 금지 |
| KRW credit | Admin decide + journal | 유저 self-approve 0 |
| KRW payable | 서버 suffix | 클라 덧셈 0 |
| FX | CurrentFxApprox / deposit snapshot | 두 번째 공식 0 · 결측=숨김 |
| 출금 default | `mode ?? "profit"` | principal 기본 금지 |
| KYC | 출금만 | 입금/참여 게이트 0 |
| practice | Risk + ledger | 출금/참여/수익 승격 금지 |
| PG사 | 전 경로 | Toss/Nice/Stripe 등 0 |
| userId | JWT session only | body/query userId 신뢰 0 |
| idempotency | withdraw · KRW create | 같은 키 다른 payload = conflict |
| suggestDepositUsdt | Engine §0.0.5.1 | 클라 shortfall 뺄셈 0 |
| 네트워크 이름 | `deposit-network-plain-ko` | 유저 surface `TRC20`/`ERC20` 0 |

### 1.5 Failure → recovery

| code / 상태 | 유저 회복 |
|-------------|-----------|
| buckets 401 | Login |
| buckets 404 / 결측 | UNAVAILABLE (`—`). `"0"` 금지 |
| address UNAVAILABLE | Support |
| USDT unmatched / wrong-chain | `/me/support` · `POST /wallet/deposit-disputes` |
| KRW expire/reject | 재신청 |
| `KYC_WITHDRAW_REQUIRED` | `/me/kyc` |
| KYC pending | 대기. 출금 폼 숨김 |
| `WITHDRAW_STEP_UP_REQUIRED` | step-up 재시도 |
| `WITHDRAW_APPLY_BLOCKED` | 지금은 뺄 수 없음 |
| `PRACTICE_NOT_WITHDRAWABLE` | 연습금은 뺄 수 없음 |
| FX null (KRW 출금) | USDT만. KRW 추정 숨김 |
| History journal MISSING | UNAVAILABLE. 빈 0건으로 위조 금지 |
| `AUTH_REQUIRED` | Login |

Funding 복귀 `returnTo` = UX 개념만. API 필드 발명 금지.

### 1.6 CTA domain

```text
Wallet primary destinations = 넣기 · 빼기 · 내역
Withdraw default copy domain = 수익만 빼기
Forbidden = 총자산 · 출금가능합 · 연습금을 수익처럼 · 입금 완료(1conf) · PG 결제
Profit→원금 CTA = D-06 HIDE (API KEEP)
GetUsdtGuide CTA = 테더 준비 이해 · mutation 0
```

픽셀 카피 확정은 미래 Figma. domain과 금지어만 지금 잠근다.

---

## 2. Visual Contract

```text
VISUAL_CLASS = CONSTRAINT_ONLY
APPROVED_FIGMA_WALLET = NONE
NEW_VISUAL_LOCK = NO
DOES_NOT_APPROVE_PIXELS = YES
HOME_GEOMETRY_DEPENDENCY = FORBIDDEN
PROFITS_GEOMETRY_DEPENDENCY = FORBIDDEN
LEGACY_VISUAL_RECOVERY = FORBIDDEN
SPARK_DASH_DNA_SHARE = CONSTRAINT_ONLY
```

이 절은 색·radius·간격·카드 생김새를 잠그지 않는다. Spark Dash와 맞춘다는 말은 **Home/Profits 레이아웃을 베끼는 것이 아니다.** Home freeze가 이미 잠근 **머니/신뢰 제약**만 공유한다.

공유 제약(Home freeze · Spark Dash money truth):

```text
FAKE_FOMO = 0
FAKE_MONEY = 0
FAKE_DURATION = 0
USDT_PRIMARY = YES
KRW_SECONDARY = YES
FX_SECOND_TRUTH = 0
MISSING_AS_ZERO = FORBIDDEN
```

### 2.1 화면별 presentation 상태 (2026-08-20)

| 화면 | 현재 코드 | Visual 권위 |
|------|-----------|-------------|
| Home | Spark Dash LOCKED | Wallet 범위 밖. geometry 가져오기 금지 |
| `/profits` | Spark Dash discovery | Wallet visual 권위 아님 |
| `/wallet` | `PendingFigma title="지갑"` | Approved Figma 없음 |
| `/wallet/deposit` | `PendingFigma title="입금"` | 혼합 레일 · Figma 없음 |
| `/wallet/withdraw` | `PendingFigma title="출금"` | Figma 없음 |
| `/wallet/withdraw/usdt` | `PendingFigma title="테더 출금"` | Figma 없음 |
| `/wallet/withdraw/krw` | `PendingFigma title="원화 출금"` | Figma 없음 |
| `/wallet/history` | `PendingFigma title="내역"` | Figma 없음 |
| `/me/kyc` | `PendingFigma title="본인 확인"` | Figma 없음 |
| `/me/guide/get-usdt` | `PendingFigma title="테더 준비"` | Figma 없음 |

레거시 `packages/ui/components/wallet/*` · `GetUsdtGuide` · Canon withdraw-mode = **presentation authority 0**. Money copy/plain-ko 제약은 KEEP.

### 2.2 Forbidden presentation

- FAKE_FOMO / FAKE_ACTIVITY / FAKE_MONEY
- 결측 버킷을 `0`으로 채움
- principal+profit “총자산” / “출금가능”
- practice를 출금·수익처럼
- 1conf·pending KRW를 “입금 완료”
- 입금/출금 가짜 % 바 · 초시계 성공
- 유저 surface `TRC20` · `ERC20` · `BEP20` · `journal` · `step-up` · `preflight`
- PG 결제창 · 카드 결제
- Home Hero/Sidebar/Bottom Nav geometry 복제
- `/dev/spark-dash-*` fixture를 실지갑 숫자로

### 2.3 State → 의미 (픽셀 아님)

| Consumer state | 보여야 하는 의미 | 보여서는 안 되는 것 |
|----------------|------------------|---------------------|
| Ready | 원금 / 수익 / 잠김 분리. USDT 권위 | 합산 총자산 · 결측 0 |
| AddressReady | 보낼 곳 + 네트워크 쉬운 말 | 체인 티커 · TRC20 뱃지 |
| Confirming (1conf) | 확인 중 | 잔액 증가 · 완료 폭죽 |
| Credited (19conf / KRW approved) | 원금 반영 | journal id |
| WaitingTransfer | 보낼 **payable** 금액 | suffix=수수료 |
| NeedKyc / KycReviewing | 출금 전 본인 확인 | 입금도 막힌 것처럼 |
| Submitted | 출금 접수 | 즉시 잔액 0 |
| History UNAVAILABLE | 지금은 목록을 못 봄 | 가짜 빈 내역=아무 일도 없음 |
| FX unavailable | USDT만 | ≈ ₩0 |

### 2.4 구현 시 visual 규칙 (다음 슬라이스)

```text
WIRE_WITHOUT_APPROVED_FIGMA = ALLOWED
INVENT_PRESENTATION = FORBIDDEN
MINIMAL_REAL_DATA_SURFACE = ALLOWED
PendingFigma 유지 + 실데이터 연결 = ALLOWED
레거시 Canon/Visual Master/Wallet 컴포넌트 복구 = FORBIDDEN
HOME_GEOMETRY_COPY = FORBIDDEN
```

B-WALLET-002는 **가짜 돈을 넣지 않는 실배선**이 목표다. 픽셀 완료는 Approved Figma 이후(B-WALLET-003은 money/security, 시각 lock 아님).

---

## 3. Implementation Contract

### 3.1 KEEP (재사용 · 재작성 0)

| Owner | 경로 |
|-------|------|
| Buckets | `services/api-nest/src/ledger/ledger.buckets.service.ts` |
| Ledger | `LedgerPostingService` · journal only |
| Routes | `WALLET_USER_ROUTES` · `COMPLIANCE_USER_ROUTES` |
| USDT address | `deposit-address.service.ts` |
| USDT observe | `usdt-deposit.service.ts` · `chain-watcher.stages.ts` |
| KRW | `krw-deposit.service.ts` · `krw-deposit.apply.ts` · `krw-deposit.money.ts` |
| Withdraw | `withdraw-intent.service.ts` · `withdraw-stepup.service.ts` |
| KYC gate | `compliance/kyc-gate.ts` · `withdraw-kyc.guard.ts` |
| Dispute | `deposit-dispute.service.ts` |
| Profit merge API | `profit-merge.service.ts` (CTA HIDE) |
| Suggest href | `deposit-suggest.ts` (Engine pointer only) |
| Schemas | `schemas/wallet-buckets.v1.json` · `schemas/withdraw-intent.v1.json` |
| SDK wallet | `fetchWalletBuckets` · `fetchMyDepositAddress` · `fetchKycStatus` · `listWalletJournals` · `createWithdraw` · KRW request helpers · step-up |
| Verify | `bucket-invariant` · `deposit-confirm-stages` · `withdraw-mode-default` · `kyc-withdraw-only` · `pg-module-scan` · `wallet-kyc-session-auth` · `wallet-live-wire` · `withdraw-flow-wire` · `wallet-gap-wire` · `wallet-release` |

### 3.2 WIRE (이 계약 다음 슬라이스 · 이 슬라이스에서 구현 0)

| 다음 TASK | 해야 할 일 |
|-----------|------------|
| B-WALLET-002 | DONE — SDK address/KYC/journal 갭 배선. 레거시 UI 복구 0 · Home 수정 0 · web 8면 PendingFigma 유지 |
| B-WALLET-003 | DONE — `verify:wallet-release` money/security 인프로세스 E2E · known defect 0 · 시각 lock 아님 |

B-WALLET-002 배선 최소:

| 화면 | 실연결 |
|------|--------|
| `/wallet` | `GET /wallet/buckets` · 결측=UNAVAILABLE |
| `/wallet/deposit` | `GET /wallet/my-deposit-address` + KRW create/list (혼합 KEEP) |
| `/wallet/withdraw*` | KYC status → step-up → `POST /wallet/withdraw` default profit |
| `/wallet/history` | KRW list PARTIAL · journal `GET /api/v1/wallet/journals` |
| `/me/kyc` | `GET/POST /api/v1/compliance/kyc/*` |
| `/me/guide/get-usdt` | 교육 copy · mutation 0 · 네트워크 한글 경고 |

### 3.3 DO NOT INVENT

- PG사 SDK/결제창
- 새 FX/payable/fee 공식
- returnTo API 필드
- 클라 `suggestDepositUsdt` / payable 재계산
- practice 출금·참여
- 입금/출금 가짜 stepper
- profit merge CTA (D-06)
- Home freeze 파일 수정
- 레거시 Wallet Canon/Visual Master 복구
- 새 primary nav / 5번째 레일

### 3.4 File-level handoff (착수 지도 · 지금 수정 0)

| 파일 | 다음 분류 |
|------|-----------|
| `apps/web/app/wallet/page.tsx` | WIRE buckets |
| `apps/web/app/wallet/deposit/page.tsx` | WIRE mixed rails |
| `apps/web/app/wallet/withdraw/**` | WIRE withdraw+step-up |
| `apps/web/app/wallet/history/page.tsx` | WIRE KRW list · journal UNAVAILABLE |
| `apps/web/app/me/kyc/page.tsx` | WIRE compliance |
| `apps/web/app/me/guide/get-usdt/page.tsx` | WIRE guide copy only |
| `packages/sdk/src/wallet/fetch.ts` | KEEP + address/KYC/journal · `asAmount→"0"` 금지 |
| `services/api-nest/src/wallet/**` | journals 라우트만 추가 · 4레일 owner NO_REWRITE |
| `services/api-nest/src/ledger/ledger.user-journal.*` | consumer read projection only · posting NO_CHANGE |
| Home / spark-dash-home | NO_CHANGE |

---

## 4. Gap analysis (2026-08-20 재실측)

추측 금지. 아래는 파일 읽기 결과.

| 주장 | 판정 | Evidence |
|------|------|----------|
| `/wallet*` 가 buckets/withdraw를 호출한다 | **FALSE** | 8면 모두 `PendingFigma` |
| Nest GET buckets | **OWNER_FOUND** | `WalletController.getBuckets` → `LedgerBucketsService` |
| Nest GET my-deposit-address | **OWNER_FOUND** | `DepositAddressService.getOrCreate` |
| Nest USDT 1/19conf | **OWNER_FOUND** | `USDT_UI_CONFIRMATIONS=1` · `USDT_LEDGER_CONFIRMATIONS=19` |
| Nest KRW create/list/get + Admin decide | **OWNER_FOUND** | `krw-deposit.apply.ts` · TTL 120 |
| Nest POST withdraw default profit | **OWNER_FOUND** | `mode ?? "profit"` · practice 403 |
| Nest KYC 출금만 | **OWNER_FOUND** | `kyc-gate.ts` participate/deposit 무관 |
| SDK buckets/withdraw/KRW/step-up | **PRESENT** | `packages/sdk/src/wallet` + `index.ts` |
| SDK my-deposit-address | **PRESENT** | `fetchMyDepositAddress` |
| SDK KYC | **PRESENT** | `fetchKycStatus` · `submitKyc` |
| User journal/history API | **PRESENT** | `GET /api/v1/wallet/journals` session-scoped projection |
| SDK 결측 `"0"` fallback | **CLOSED** | missing bucket → `wallet_buckets_unavailable` |
| 가짜 금액 하드코드 (페이지) | **CLOSED** | PendingFigma |
| PG사 | **ABSENT** | `verify:pg-module-scan` KEEP |
| Home geometry 종속 필요 | **NO** | freeze + 이 계약 |
| Money Rule 재정의 필요 | **NO** | 기존 KEEP |

```text
WEB_WALLET_PAGES = 8
WEB_WALLET_PENDING_FIGMA = 8
WEB_WALLET_BUCKETS_FETCH = 0
SDK_WALLET_BUCKETS_EXPORT = PRESENT
SDK_DEPOSIT_ADDRESS_EXPORT = PRESENT
SDK_KYC_EXPORT = PRESENT
BACKEND_WALLET = OWNER_FOUND
USER_JOURNAL_LIST = PRESENT
FAKE_FINANCIAL_VALUE_BUG = CLOSED
REAL_IMPLEMENTATION = WEB_UNWIRED
WALLET_CERTIFICATION = PASS
```

---

## 5. Acceptance

B-WALLET-001 done = 계약 문서 + 갭 재실측 + `verify:wallet-contract` PASS.  
B-WALLET-002 done = SDK address/KYC/journal 갭 배선 + 결측≠0 + Home 무수정 + domain verify PASS · web 8면 PendingFigma 유지.  
B-WALLET-003 done = `verify:wallet-release` PASS (USDT 1conf≠credit · 19conf 1회 · KRW pending/matched≠credit · approve 1회 · default mode=profit · KYC 출금만 · practice 403 · session isolation · missing≠0 · known defect 0).

```text
IMPLEMENTATION_START = B-WALLET-002
CERTIFICATION = B-WALLET-003
WALLET_CERTIFICATION = PASS
FOUNDER_APPROVAL_REQUIRED = NO
```
