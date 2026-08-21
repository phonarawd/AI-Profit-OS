---
name: Wallet Master Contract
overview: 퍼뜩 Wallet 4-rail(KRW/USDT 입금·출금) Master Contract를 레포 실측과 글로벌 UX 조사로 확정한다. 구현·커밋은 하지 않으며, 승인 후 `_tmp_home_clean/v1/phase6/`에 MD/JSON만 기록한다. Visual Master 전에는 UI 코딩을 시작하지 않는다.
todos:
  - id: write-master-md-json
    content: 승인 후 _tmp_home_clean/v1/phase6/ HC6_08 Wallet Master Contract MD+JSON 기록 (소스 0, 기존 증거 보존)
    status: completed
  - id: stop-no-impl
    content: Visual Master/코드/쿠및/푸시 없이 Founder 보고 후 정지
    status: completed
isProject: false
---

# Wallet Funding & Withdrawal Master Contract

이 플랜은 **제품 소스 구현이 아니다.** 승인 후 허용 write는 아래 두 파일만이다.

- [_tmp_home_clean/v1/phase6/HC6_08_WALLET_FUNDING_WITHDRAWAL_MASTER_CONTRACT.md](_tmp_home_clean/v1/phase6/HC6_08_WALLET_FUNDING_WITHDRAWAL_MASTER_CONTRACT.md)
- [_tmp_home_clean/v1/phase6/HC6_08_WALLET_FUNDING_WITHDRAWAL_MASTER_CONTRACT.json](_tmp_home_clean/v1/phase6/HC6_08_WALLET_FUNDING_WITHDRAWAL_MASTER_CONTRACT.json)

기존 HC6-08 Home/FX 증거는 삭제·변조하지 않는다. Home Architecture C / Home FX / HC6-09 / Phase 7은 범위 밖이다.

```text
WALLET_MASTER_CONTRACT_RESULT=READY
IMPLEMENTATION_EXECUTED=NO
VISUAL_MASTER_REQUIRED_BEFORE_UI_IMPLEMENTATION=YES
DESIGN_BEFORE_IMPLEMENTATION=REQUIRED
DEPOSIT_IMPLEMENTATION_COMPLETE=NO
HC6_08_COMPLETE=NO
HC6_09_NOT_STARTED
PHASE_7_NOT_STARTED
USDT_V1_NETWORK_DECISION=PROVEN_EXISTING
NETWORK_DECISION_REQUIRED=NO
VISUAL_MASTER_FRAME_COUNT=STRUCTURE_DRIVEN
AUTHORITATIVE_FRAMES=26
PUBLIC_RELEASE_READY=NOT_JUDGED_IN_THIS_PLAN
HOME_CLEAN_HC6_08_WALLET_FUNDING_WITHDRAWAL_MASTER_CONTRACT_PATCHED
```

---

## 1. EXECUTIVE DECISION (Q1–Q7)

**Q1. Page IA** — 기존 production route를 유지하고, 사용자 mental model만 고친다.

- `/wallet` 자산 + 입금/출금/내역 CTA
- `/wallet/deposit` 방법 선택 → KRW 또는 USDT rail (query `tab` 유지, 새 deposit 하위 route 추가 금지)
- `/wallet/withdraw` 방법 선택 → KRW 또는 USDT rail
- `/wallet/withdraw/krw` · `/wallet/withdraw/usdt` deep link 유지 ([apps/web/routes.ts](apps/web/routes.ts) `USER_NESTED_ROUTES`)
- `/wallet/history` 통합 타임라인 유지 (4 silo route 금지)
- 사용자가 이해해야 할 말: 입금 / 출금 / 원화 / USDT. `TRC20`/`ERC20`/`crypto` 유저 노출 금지 (Canon `forbidden`)

**Q2. 공유 UI** — `WalletTransferShell` + `TransferMethodSelector` + fact/status/copy/QR primitive만 공유.

**Q3. 분리할 금융 로직** — `KrwDepositFlow` / `UsdtDepositFlow` / `KrwWithdrawalFlow` / `UsdtWithdrawalFlow`. `UniversalTransferForm` 금지. `SHARED_VISUAL_LANGUAGE=YES` · `SHARED_FINANCIAL_TRUTH=NO`.

**Q4. Backend 준비된 rail**

- KRW Deposit: **PROVEN** (create/list/get + quote/final + admin approve → `deposit_krw` → principal). Consumer UI **CHAIN_BREAK**.
- USDT Deposit: address + watcher + ledger **PROVEN**. Consumer list/status GET **NOT_FOUND**. UI는 address/copy만 PARTIAL.
- KRW/USDT Withdraw: intent POST + step-up + fee quote-on-create **PARTIAL**. GET/quote-before-submit/dest validation/ledger follow-up **NOT_FOUND**.

**Q5. 구현 전 새 backend가 필요한 것 (이번 PLAN에서 만들지 않음)**

- Consumer-safe KRW 입금 계좌 instruction (`deposit-config.krw`는 Admin GET만)
- `GET` USDT deposit events (own rows)
- `GET` withdraw intent + **submit 전** fee quote
- USDT withdraw destination format validation
- withdraw `auth_ok` → ledger_posted follow-up
- KRW withdraw 은행 계좌 destination owner
- 통합 history read API

**Q6. Visual Master** — `VISUAL_MASTER_FRAME_COUNT=STRUCTURE_DRIVEN`. 고정 20 frames로 구조를 생략하지 않는다. Structural screens **13** × Desktop 1440 + Mobile 390 = **26** authoritative frames. 단순 status만 variant. `NO_FUTURE_STRUCTURAL_REDESIGN` > `FRAME_MINIMIZATION`.

**Q7. Implementation order** — Master Contract → Visual Master → Founder design review → missing consumer-safe reads → shared shell → KRW Deposit → USDT Deposit → KRW Withdraw → USDT Withdraw → Activity → runtime → visual recon → Founder approval. 이것은 **개발 순서**다. `PUBLIC_RELEASE_READY`는 이번 PLAN에서 판정하지 않는다.

---

## 2. CURRENT REPO TRUTH (PROVEN)

### Route map

| User route | Exists | Current role | Keep/Change |
|---|---|---|---|
| `/wallet` | YES | buckets + CTA | KEEP route · REPLACE presentation |
| `/wallet/deposit` | YES | `tab=usdt\|krw` wire UI | KEEP · method cards로 재구성 |
| `/wallet/withdraw` | YES | mode=profit/principal + USDT form | KEEP · 방법 선택 먼저 |
| `/wallet/withdraw/usdt` | YES | USDT form | KEEP deep link |
| `/wallet/withdraw/krw` | YES | KRW form (dest 없음) | KEEP deep link |
| `/wallet/history` | YES | empty copy only | KEEP · read model 후 채움 |
| `/me/guide/get-usdt` | YES | 교육 | KEEP · Wallet과 분리 |
| `/dev/*` | YES | Home preview only | Wallet production과 혼동 금지 |

### Backend rail matrix

| Rail | Backend | API | SDK | DB | Ledger | Consumer UI |
|---|---|---|---|---|---|---|
| KRW Deposit | PROVEN | PROVEN user+admin | PROVEN | PROVEN | PROVEN `deposit_krw`→principal | CHAIN_BREAK (create 미연결, 계좌 instruction 없음) |
| USDT Deposit | PROVEN observe/credit | PARTIAL (address YES, user list NO) | NOT_FOUND address/list | PROVEN | PROVEN `deposit_usdt`→principal | PARTIAL (raw fetch+copy, QR/status 0) |
| KRW Withdrawal | PARTIAL intent | PARTIAL POST only | PARTIAL create | PROVEN table | NOT_FOUND post | PARTIAL form, dest/bank 0 |
| USDT Withdrawal | PARTIAL intent | PARTIAL POST only | PARTIAL create | PROVEN table | NOT_FOUND broadcast | PARTIAL form, review/fee GET 0 |

### Locked KRW Deposit semantics (유지)

[schemas/krw-deposit-request.v1.json](schemas/krw-deposit-request.v1.json) · [krw-deposit.apply.ts](services/api-nest/src/wallet/krw-deposit.apply.ts)

- `requestedAmountKrw` + `uniqueSuffixKrw` = `payableAmountKrw`
- suffix role = `bank_transfer_identification` · **fee 아님**
- quote = request-time estimate · final = approval-time `creditedUsdt`
- Home `POST /api/v1/me/current-fx/approx` **사용 금지**
- TTL 120분 · status: pending/matched/approved/expired/rejected/manual_review

### USDT network (추측 금지)

[wallet.types.ts](services/api-nest/src/wallet/wallet.types.ts) `DepositConfigUsdtOnchain.network: "TRC20"`는 patch 불가. 유저 라벨 SSOT = [network-plain-ko.ts](services/api-nest/src/wallet/network-plain-ko.ts) `트론`. Canon `trc20_user_render` 금지.

- 유저별 주소 · shared address 금지
- `qrPayload` = **address only** ([tron-address.ts](services/api-nest/src/wallet/tron-address.ts) L75)
- 1conf = `ui_confirmed` · ledger 0 · toast `DEPOSIT_DETECTED`
- 19conf = `ledger_credited` · toast `DEPOSIT_CONFIRMED`
- dust `< 0.01` ignore · idempotency `tx_hash+to_address`
- SUPPORT_COUNT=1 → dropdown 강제 금지

### Money buckets (alias 신설 금지)

`principalUsdt` / `profitUsdt` / `lockedUsdt` / `practiceUsdt` / `liabilityUsdt`

- 입금 credit = **principal only**
- 출금 default mode=`profit` · principal 경로는 숨김 금지 · practice 출금 403
- `availableUsdt` 발명 금지

### Withdraw truth

[withdraw-intent.service.ts](services/api-nest/src/wallet/withdraw-intent.service.ts)는 `auth_ok` insert까지. 주석: ledger posting은 follow-up. GET list/by-id 없음. fee는 create 시점에만 quote. destination은 저장만 하고 `isTrc20AddressFormat` 미적용. KRW dest 은행 스키마 없음.

Idempotency: KRW deposit은 key reuse. Withdraw UI는 submit마다 `newWithdrawIdempotencyKey()` → **재시도가 새 intent**. Contract: intent 단위로 key persist.

현재 Wallet 페이지는 전부 `'use client'`. global wallet store 없음. loading 실패 시 `EMPTY_BUCKETS` 0 주입 = **fake zero 결함**.

---

## 3. GLOBAL RESEARCH → PEOTTEOK

출처: Coinbase Help receive/multi-network, Binance FAQ deposit/withdraw, Kraken withdraw+review, Robinhood Crypto transfers, Crypto.com deposit help, Circle Mint confirmations/address-per-chain. 복제 금지.

| Global pattern | Why | Peotteok |
|---|---|---|
| Asset 다음 network를 address/QR과 같은 화면 | 오송금 감소 | USDT: 지원 네트워크(트론) + 주소 + 복사를 한 핵심 영역. 선택 UI 없음 |
| QR + copy | 수동 타이핑 실수 감소 | QR payload = server `qrPayload`(address). fake QR 금지 |
| Wrong-network 경고 | 비가역 | 기존 `NetworkPlainWarning` 유지. 화면 전체 적색 금지 |
| Withdraw = input → Review → auth → submit | 실수 방지 | USDT/KRW 모두 REVIEW_STEP 필수. 숫자는 server fact만 |
| Fee는 confirm 화면의 server 값 | 클라 계산 사고 방지 | submit 전 quote API 필요. 없으면 fee를 지어내지 않음 |
| Address book / whitelist | 반복 출금 안전 | V1 REJECT (backend 없음). 최근 주소 발명 금지 |
| 확인수 노출 (14/20) | 트레이더용 | REJECT. 사용자는 `입금 확인 중` / `입금 완료`만 |
| Trading-terminal / neon | 숙련자 | REJECT. Home family · light · money-first |

---

## 4. TARGET UX (4 rails)

**Deposit method (20–70대):** 카드 2장. `원화로 입금 — 은행에서 보내요` / `USDT로 입금 — 거래소·지갑에서 보내요`. 코드-only 탭 폐기. `/wallet` CTA는 `/wallet/deposit`(선택 화면). `?tab=`·`suggest` deeplink는 유지.

**KRW Deposit hero:** `payableAmountKrw` (실제 송금할 금액). 신청 금액·식별 금액은 secondary. 예상 USDT는 quote가 있을 때만. 승인 후 hero = `creditedUsdt`. 만료/거절은 이유 + 다시 신청.

**USDT Deposit hero:** 네트워크(트론) + 전체 주소 + 복사. QR은 payload 있을 때만. 상태 API 없으면 status 섹션을 만들지 않음 (`FAKE_PROGRESS=FORBIDDEN`).

**Withdraw method:** `원화로 출금 — 은행 계좌로 받아요` / `USDT로 출금 — 외부 지갑으로 보내요`. 그 다음 버킷 모드(수익 기본 / 원금 확인 시트).

**KRW/USDT Withdraw:** Entry → Review(주소·네트워크·금액·수수료·차감 = server) → step-up(기존) → 접수. 즉시 실행 금지. fee/total/receive를 클라 계산 금지.

**History:** 통합 timeline. rail execution table은 분리 유지. 없는 API를 클라에서 합쳐 가짜 내역 만들지 않음.

**Route vs sheet:** transfer는 route (refresh/resume). Review는 같은 route의 step. Principal confirm은 기존 sheet 유지.

---

## 5. DATA / NAMING / COMPONENTS

기존 이름 우선: `KrwDepositRequest`, `UserDepositAddress`, `UsdtDepositEvent`, `WithdrawIntent`, `WithdrawMode`, `WithdrawAsset`. 새 SSOT 이름 금지. `cryptoDeposit` 금지. 내부 `networkKey=TRC20` · 유저 `트론`.

권장 tree:

```text
WalletPage → WalletAssetSummary + WalletPrimaryActions + WalletActivityList
WalletDepositPage → TransferMethodSelector + KrwDepositFlow | UsdtDepositFlow
WalletWithdrawPage → TransferMethodSelector + KrwWithdrawalFlow | UsdtWithdrawalFlow
```

SDK: UI가 raw path를 흩어 호출하지 않음. 기존 `@aipo/sdk/wallet` 확장. address fetch를 SDK로 옮기는 것은 Visual Master 이후 구현 슬라이스.

Client = format/display/state only. KRW↔USDT, fee, debit, confirmation 계산 금지.

---

## 6. VISUAL / RESPONSIVE / A11Y

**Family:** peotteok-light · Home과 같은 플랫폼, Home 레이아웃 복제 금지. crypto neon / terminal / casino 금지.

**Desktop 1440:** AppShell sidebar 240 + header 64. content max 720–800px는 **planning candidate only**. Visual Master가 content/card width · padding · gap · CTA · header · radius · type · money/address geometry를 exact token 또는 exact design decision으로 닫는다. `ARBITRARY_IMPLEMENTER_GEOMETRY=FORBIDDEN`.

**Mobile 390:** padding 16은 candidate. header 기존 64, bottom nav 47 + safe area. CTA sticky above nav. 주소 `break-all`. overflow 0. touch **48px** (repo `luxFintech.touch.minPx`). Mobile geometry도 Visual Master에서 exact close.

**Breakpoints:** 기존 `390 / 768 / 1280` only. 1440·1024는 test point. 새 BP 금지.

**Money type:** Pretendard · `tabular-nums` · KRW `formatKrwSigned` · USDT suffix secondary. loading 중 `₩0`/`0 USDT` 금지.

**Status:** pending/processing/complete/error/expired = text+icon+shape. 색만으로 의미 전달 금지.

**Visual Master 26 frames (structure-driven):** Overview, Deposit method, KRW Entry, KRW Instruction/Pending, KRW Approved, USDT Address Ready, Withdraw method, KRW Entry, KRW Review, USDT Entry, USDT Review, Transfer Result, History. 각 Desktop+Mobile. USDT processing/complete · reject/expire · withdraw terminal은 variant.

Figma → code: design fixture sample 허용 · product runtime hardcode 금지. token/component intent만 연결. 각 필드에 binding owner 기록.

---

## 7. TEST / ORDER / GATES

구현 후 targeted verify: `wallet-live-wire` · `withdraw-flow-wire` · `krw-deposit-fx-semantics` · `deposit-network-plain-ko` · `bucket-invariant` · `pg-module-scan` · `no-it-jargon`. 풀 monorepo test 금지.

Playwright 최소 (1440×1080 + 390×693): deposit method, KRW main, USDT main, withdraw method, USDT withdraw review. metric PASS ≠ visual PASS.

**IMPLEMENTATION_PRIORITY (개발 순서 only):** P0 KRW+USDT Deposit · P1 KRW+USDT Withdrawal · P2 Unified History. `PUBLIC_RELEASE_GATE`와 동일하지 않다. Deposit만으로 public release ready 판정 금지. `PUBLIC_RELEASE_READY=NOT_JUDGED_IN_THIS_PLAN`. 4 rail 구조는 처음부터 IA/Visual에 포함.

**Open Founder decisions:** 없음 (네트워크는 repo가 닫음). 다음 한 가지 행동만: **Wallet Visual Master 제작**.

**Safety:** APP/API/SDK/SCHEMA/DB/LEDGER/MONEY/FX/UI/CSS/ROUTE change = 0. COMMIT/PUSH/STASH = 0.
