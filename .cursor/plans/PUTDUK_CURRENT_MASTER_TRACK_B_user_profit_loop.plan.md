---
name: "PUTDUK Current Master — Track B: User Profit Loop"
overview: "실제 참여→매칭→정산→지갑까지 web 배선. 백엔드(ParticipateService·Rust guardParticipate·settlement_rule·LedgerPostingService)는 대부분 실재하나 web에서 호출하는 코드가 없다(실측: web participate POST 0). /trades·execute는 그린필드 리셋으로 PendingFigma placeholder로 교체되어 가짜 금액 결함은 이미 닫혔으나 실기능은 아직 없다. User Opportunity Feed 정책은 Founder 신규 지시."
todos:
  - id: b-loop-001
    content: "[B-LOOP-001] Core Loop contract(참여/preflight/실행/정산 Product·Visual·Implementation Contract) · legacy=03 redesign-r4-core-loop-contract(pending) · PRIORITY=LAUNCH_BLOCKER · RISK=HIGH"
    status: completed
  - id: b-participation-001
    content: "[B-PARTICIPATION-001] web participate/preflight 실배선(현재 0건 — 가장 확실한 단일 launch blocker) · legacy=03 redesign-r4-core-loop-implementation(pending) 하위 · PRIORITY=LAUNCH_BLOCKER · RISK=HIGH"
    status: completed
  - id: b-execution-001
    content: "[B-EXECUTION-001] execute 페이지 실데이터 배선(현재 PendingFigma placeholder) · FAKE_FINANCIAL_VALUE_BUG=CLOSED(이미 해결) · REAL_IMPLEMENTATION=REQUIRED · legacy=03 redesign-r4-core-loop-implementation 하위 · PRIORITY=LAUNCH_BLOCKER · RISK=HIGH"
    status: pending
  - id: b-trades-001
    content: "[B-TRADES-001] /trades 실데이터 배선(현재 PendingFigma placeholder) · legacy=03 redesign-r4-core-loop-implementation 하위 · PRIORITY=LAUNCH_REQUIRED · RISK=MEDIUM"
    status: pending
  - id: b-loop-002
    content: "[B-LOOP-002] Core Loop certification(성공/Safe-Stop 실제 E2E) · legacy=03 redesign-r4-core-loop-certification(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH · DEPENDS_ON=B-PARTICIPATION-001+B-EXECUTION-001(HARD)"
    status: pending
  - id: b-feed-001
    content: "[B-FEED-001] User Opportunity Feed Policy(참여 성공/진행중 → main feed 제거·다른 유저는 계속 노출·재노출 가능·cooldown/diversity·완전 랜덤 금지) · Founder 직접 지시(신규, 어떤 legacy plan에도 없음) · PRIORITY=LAUNCH_REQUIRED · RISK=MEDIUM"
    status: pending
  - id: b-wallet-001
    content: "[B-WALLET-001] Wallet contract 재정합(Spark Dash) · legacy=03 redesign-r3-wallet-contract(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
  - id: b-wallet-002
    content: "[B-WALLET-002] Wallet gap-only 구현(기능 대부분 REAL, 시각 정합만) · legacy=03 redesign-r3-wallet-implementation(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
  - id: b-wallet-003
    content: "[B-WALLET-003] Wallet certification · legacy=03 redesign-r3-wallet-certification(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
isProject: false
---

> ```text
> classification = CURRENT_ACTIVE_TRACK
> CURRENT_ACTIVE_PLAN = YES
> TRACK = B (USER PROFIT LOOP)
> ```

# Track B — User Profit Loop

## Goal

실제 Opportunity에 대한 참여→매칭→정산→지갑 반영까지 **web에서 끝까지 동작**하게 만든다.
백엔드 재설계가 아니라 **배선(wiring)**이 핵심이다.

## Current truth (evidence-based)

| 항목 | 상태 | Evidence |
|---|---|---|
| `ParticipateService` + Rust `guardParticipate` | 백엔드 실재 | `services/api-nest`, `services/engine-rust` |
| web participate 호출 | **0건** | 과거 forensic 실측(`docs/CURRENT_PROJECT_AUDIT.md`, 참고자료 — 재확인 필요, 아래 NOTES) |
| `/trades` | `PendingFigma title="수익"` | `apps/web/app/trades/page.tsx`(2026-08-20 재실측) |
| `/trades/[id]/execute` | `PendingFigma title="진행"` | `apps/web/app/trades/[id]/execute/page.tsx`(2026-08-20 재실측) |
| 가짜 금액(하드코딩 `0`·가짜 `12.50 USDT`) | **CLOSED** | 그린필드 리셋으로 두 페이지 모두 PendingFigma로 교체됨 — 재실측 확인, Founder 질문 불필요 |
| Wallet buckets/deposit/withdraw/KYC | 대부분 REAL | Supabase 실측(`ledger_accounts`·`withdraw_intents`·`kyc_status` 등 8+ 테이블) |
| `/profits` UI | Spark Dash(`ProfitsDesktopClient`) | `apps/web/app/profits/page.tsx` |

```text
FAKE_FINANCIAL_VALUE_BUG = CLOSED   (더 이상 존재하지 않음)
REAL_TRADES_IMPLEMENTATION = REQUIRED   (placeholder만 있고 기능은 없음 — 별개 사실)
```

**NOTES(투명성):** web participate 호출 부재는 그린필드 리셋 이전 forensic 문서의 실측이다.
`B-LOOP-001` 착수 시 **가장 먼저** 현재 `/profits/[id]`가 실제로 participate를 호출하는지
재확인해야 한다(reconfirm-first 원칙, 추측 금지).

**B-LOOP-001 재실측 (2026-08-20):** `/profits/[id]`=`PendingFigma` · `apps/web` POST participate/preflight **0** · SDK participate export **MISSING** · `useTradeExecution` EXISTS/unwired · Nest owners KEEP. 계약=`docs/product/consumer/CONSUMER_CORE_LOOP_CONTRACT.md`.

## User Opportunity Feed Policy (Founder 직접 지시 — B-FEED-001)

```text
같은 Opportunity를 이미 참여 성공/진행 중인 user → active feed에서 제거
다음 eligible opportunity 자동 채움
다른 user는 eligibility 있으면 계속 볼 수 있음
같은 CanonicalProduct라도 new real Opportunity가 생기면 재노출 가능
완전 random refresh 금지 — stable ranked dynamic feed
cooldown/diversity 가능
participated opportunities → /trades
Admin이 user/segment별 visibility/repeat/frequency/allocation 제어 (→ Track D와 연결)
```

## Tasks

| TASK_ID | TITLE | REQUIREMENT | SOURCE_TRACEABILITY | PRIORITY | PRIORITY_AUTHORITY | DEPENDS_ON(STRENGTH) | RISK |
|---|---|---|---|---|---|---|---|
| B-LOOP-001 | Core Loop contract | 참여/preflight/실행/정산 계약 문서화+갭분석 | 03 `redesign-r4-core-loop-contract`(pending) | **LAUNCH_BLOCKER** | PLAN_EXPLICIT(legacy가 이미 이 todo를 R4로 명명) | Track A `A-PRODUCT-008` 산출물 없어도 기존 legacy seed로 착수 가능(SOFT) | HIGH |
| B-PARTICIPATION-001 | web participate 배선 | `/profits/[id]` → `POST participate` 실연결 | 03 `redesign-r4-core-loop-implementation`(pending) 하위 | **LAUNCH_BLOCKER** | PLAN_EXPLICIT + 실측(old audit) | B-LOOP-001(SOFT) | HIGH |
| B-EXECUTION-001 | execute 실데이터 | PendingFigma → 실제 `useTradeExecution` 배선 | 03 `redesign-r4-core-loop-implementation`(pending) 하위 | **LAUNCH_BLOCKER** | PLAN_EXPLICIT + 실측(2026-08-20) | B-PARTICIPATION-001(HARD) | HIGH |
| B-TRADES-001 | /trades 실데이터 | PendingFigma → 실제 거래 목록 | 03 `redesign-r4-core-loop-implementation`(pending) 하위 | LAUNCH_REQUIRED | PLAN_EXPLICIT | B-EXECUTION-001(SOFT) | MEDIUM |
| B-LOOP-002 | Core Loop certification | 성공/Safe-Stop 실 E2E, known defect 0 | 03 `redesign-r4-core-loop-certification`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | B-PARTICIPATION-001+B-EXECUTION-001(HARD) | HIGH |
| B-FEED-001 | User Opportunity Feed Policy | 참여성공/진행중 제거+재노출+cooldown | 신규(Founder 직접 지시, 어떤 legacy plan에도 없음) | LAUNCH_REQUIRED | **FOUNDER_EXPLICIT** | Track A `A-PRODUCT-008`(SOFT — legacy seed로 우선 구현 가능) | MEDIUM |
| B-WALLET-001 | Wallet contract | 지갑 4레일 계약 재정합(Spark Dash) | 03 `redesign-r3-wallet-contract`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | 없음(PARALLEL_SAFE) | HIGH |
| B-WALLET-002 | Wallet gap-only 구현 | 시각 정합만(기능 대부분 REAL) | 03 `redesign-r3-wallet-implementation`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | B-WALLET-001(SOFT) | HIGH |
| B-WALLET-003 | Wallet certification | money/security 100%, known defect 0 | 03 `redesign-r3-wallet-certification`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | B-WALLET-002(HARD) | HIGH |

## Owner / Evidence / Founder approval / Production impact

| TASK_ID | OWNER | EVIDENCE | FOUNDER_APPROVAL_REQUIRED | PRODUCTION_IMPACT |
|---|---|---|---|---|
| B-LOOP-001 | apps/web + packages/sdk | CONSUMER_UX_ARCHITECTURE.md core journey | NO | 없음(설계) |
| B-PARTICIPATION-001 | apps/web/app/profits | ParticipateService(기존) | NO | 있음(실참여 트리거) — 기존 idempotency/KYC/practice 가드 재사용, 신규 money 로직 0 |
| B-EXECUTION-001 | apps/web/app/trades | useTradeExecution(기존 훅) | NO | 있음(실행 화면 노출) |
| B-TRADES-001 | apps/web/app/trades | 기존 trade_executions 테이블 | NO | 없음(read only) |
| B-LOOP-002 | apps/web + tooling/verify | 신규 verify:core-loop-release(legacy 명명 그대로 재사용) | NO | 없음(QA) |
| B-FEED-001 | services/api-nest opportunities | balance-aware-feed.ts(기존, 확장) | NO(정책 값은 Admin이 조정 — Track D) | 있음(feed 노출 로직 변경) |
| B-WALLET-001~003 | apps/web/app/wallet | 기존 Wallet REAL 라우트(buckets/deposit/withdraw) | NO | 없음(시각만) |

## Parallel safety

```text
Track B ↔ Track A = PARALLEL_SAFE (B-PARTICIPATION-001은 legacy seed Opportunity로 먼저 착수 가능)
Track B ↔ Track C/D/E = PARALLEL_SAFE
Track B 내부 = 위 표 DEPENDS_ON 그대로
```

## Risk-based verification

```text
HIGH(참여/실행/정산/지갑 전부) → 강한 verifier + negative test + runtime proof
  (참여/정산 이중 실행 방지, idempotency, 잔액 불변 회귀 필수 — 기존 verify:participate-http·
   verify:execute-rule-loop·verify:bucket-invariant 재사용/확장)
MEDIUM(B-TRADES-001, B-FEED-001) → bounded integration verifier
```
