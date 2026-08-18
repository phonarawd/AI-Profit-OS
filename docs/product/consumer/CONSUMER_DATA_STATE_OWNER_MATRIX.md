# CONSUMER DATA / STATE OWNER MATRIX

> Phase 3 · UI Fact 소유자. UI는 owner를 발명하지 않는다.  
> `client computation allowed?` = 포맷/비교 표시만. 금액 산출 금지.

```text
FAKE_FINANCIAL_TRUTH = 0
ZERO_NE_UNAVAILABLE = YES
```

---

## Core facts

| UI concept | domain concept | owner | source path | SDK type | API endpoint/controller | Engine dependency | Money sensitivity | client computation allowed? | formatting allowed? | fallback | unknown behavior |
|------------|----------------|-------|-------------|----------|-------------------------|-------------------|-------------------|-----------------------------|---------------------|----------|------------------|
| RequiredCapital | `requiredCapitalUsdt` | Engine/opportunity row | `opportunities.required_capital_usdt` | feed item field (untyped Record) | `GET /api/v1/opportunities` `GET /opportunities/:id` | classification uses same | YES | NO (must equal participate amount) | YES | UNAVAILABLE hide CTA | 참여 불가 |
| WalletBalance / participate capital | `principalUsdt` | Money ledger projection | `wallet_buckets.principal_usdt` | `WalletBucketsResponse` · HomeMoneyRead | `GET /wallet/buckets` · `GET /me/home-money-read` | no | YES | NO | YES | UNAVAILABLE not 0 | Home viewState |
| ProfitBalance | `profitUsdt` | Money | `wallet_buckets.profit_usdt` | `WalletBucketsResponse` | `GET /wallet/buckets` | settlement credits | YES | NO | YES | UNAVAILABLE | hide withdraw amount |
| LockedBalance | `lockedUsdt` | Money | `wallet_buckets.locked_usdt` | same | same | participate lock | YES | NO | YES | UNAVAILABLE | Matching 설명만 |
| PracticeBalance | `practiceUsdt` | Money | `wallet_buckets.practice_usdt` | same | same | no | YES | NO | YES | hide from primary | 출금/수익 승격 금지 |
| LiabilityCheck | `liabilityUsdt` | Money invariant | sum buckets | same | same | no | YES | NO | NO user surface | n/a | Admin/recon |
| Eligibility | feed `bucket` | Engine MI §0.0.5.1 | `classifyAffordability` via Nest | feed item `bucket` | opportunities list/detail | YES | YES | NO | label only | hide CTA | participate가 최종 |
| SuggestDeposit | `suggestDepositUsdt` | Engine MI | balance-aware feed | feed field | same | YES | YES | NO | YES | hide deposit hint | Funding CTA만 |
| NearMissCap | `nearMissCapUsdt` | execution-policy feed | policy or Day-1 formula in MI | feed | same | YES | YES | NO | NO user number unless owned | hide | — |
| MatchingStatus | `trade_executions.status` | Engine+Nest | trade row | `TradeExecutionState` | `GET /api/v1/trades/:id` | `settlement_rule.cjs` | YES | NO | map to Korean | UNAVAILABLE | Home 우선순위 스킵 |
| MatchingResultCode | `result_code` | Engine rule | evaluateExecution | `TradeExecutionResultCode` | execute-tick + GET | YES | YES | NO | map | hide | — |
| ProgressPct | presentation timer | Nest `presentationProgress` | Soft elapsed ratio | `progressPct` | same | NO (not Rule credit) | NO as truth | NO as % bar | FORBIDDEN as stepper | do not display | indeterminate |
| SettlementStatus | journal + trade success | Money+Engine | `ledger_journals` type settlement · trade success | `settledProfitUsdt` | trade GET | YES | YES | NO | YES | not Settled | — |
| Profit (settled) | `settledProfitUsdt` | Money post | trade + journal | TradeExecutionState | same | YES | YES | NO | YES | hide | — |
| ExpectedProfit | `expectedProfitUsdt` | Engine pricing | opportunity / trade | card + trade | opportunities · trades | YES | YES | NO | YES | UNAVAILABLE | 보장 카피 금지 |
| FXReference | KRW approx | Money/FX snapshot · **SINGLE OWNER** | `fx_snapshots` via CurrentFxApprox | `CurrentFxApproxResponse` | `POST /api/v1/me/current-fx/approx` | no | YES display only | NO | YES | **null → UNAVAILABLE/STALE/PENDING. never 0** | snapshot 없음 = KRW 참고 없음 |
| OpportunityKrwApprox | `expectedProfitKrwApprox` | **NOT AN OWNER** · invalid card fallback | `expected_profit_krw_approx` | card number | opportunities | snapshot at price | YES | NO | YES | **API may emit 0 if null — GAP G-P0-01/G-P2-02. NOT authority** | Consumer는 CurrentFxApprox만. 0 fallback 금지 |
| DepositStatus USDT | `usdt_deposit_events.status` | Money | events | none user list SDK | observe = not user UI | chain | YES | NO | map | pending 설명 | 1conf ≠ credited |
| DepositStatus KRW | `KrwDepositStatus` | Money | `krw_deposit_requests` | `KrwDepositRequest` | `GET/POST /wallet/krw-deposit-requests` | no | YES | NO | map | UNAVAILABLE | — |
| PayableKrw | requested+suffix | Money | create request | same | POST krw | no | YES | NO | explain suffix | n/a | — |
| WithdrawStatus | withdraw intent | Money | `withdraw_intents` | SDK createWithdraw | `POST /wallet/withdraw` | no | YES | NO | map | UNAVAILABLE | — |
| WithdrawStepUp | step-up | Auth/Money | challenge/verify | SDK types | `/wallet/withdraw/step-up/*` | no | NO | NO | — | retry | — |
| KycStatus | `kyc_status` | Money compliance | kyc | none dedicated SDK | `GET /compliance/kyc/status` | no | gate | NO | map | UNAVAILABLE | block withdraw |
| ReferralRewardStatus | edge/payout status | Money | `referral_edges` | none SDK | `GET /referral/me` | L3 on MATCH_SUCCESS | YES | NO | map Korean, no L1/L2/L3 label | hide % | rewardsEnabled=false |
| PartnerStatus | Founder lock | Product · **SINGLE OWNER** | founder-intent | n/a | n/a | adapter ≠ partnership | NO | NO | official names | no fake partner | Yahoo partnership remains OFFICIAL |
| AdapterAvailability | MI adapter catalog | Engine/runtime · **SINGLE OWNER** | market-intelligence catalog | n/a | n/a | listing ingest only | NO | NO | INTERNAL | never imply partnership | Yahoo API/adapter/data-source FORBIDDEN |
| HomeViewState | HomeReadModel | Engine mapper | HomeReadService | `HomeReadModelResponse` | `GET /me/home-read` | feed+money+growth | YES | NO | label | unauthorized Fact null | — |
| HomePrincipal | principal on Home | Money | home-money-read | `HomeMoneyReadResponse` | `GET /me/home-money-read` | no | YES | NO | YES | state≠ready → null | — |
| SettlementCountToday | count not USDT | Money projection | DayPulse/settlement | HomeMoneyRead | same | YES count | COUNT only | NO as money | NO currency | hide | — |
| TodayPossibleProfit | server_derived sum | Engine HomeRead | affordable∧available∧compareReady | HomeRead | `GET /me/home-read` | YES | YES | NO | YES | null | 보장 금지 |
| Session | JWT cookie | Auth | `aipo_session` | none | `GET /auth/session` | no | NO | presence only | — | guest | Login |
| DayPulse | live aggregates | Engine/Money | day-pulse | `DayPulseResponse` | `GET /me/day-pulse` | YES | COUNT | NO | NO fake presence | hide if off | — |
| AIInsight | coach | Engine AI | chips/chat | peotteok types | `GET/POST /me/peotteok/*` | Fact tools | NO invent | NO | label FACT/INFERENCE | degrade | — |
| Inbox | ops messages | Inbox | `ops_inbox` | none SDK | `GET /me/inbox` | no | NO | NO | — | empty | — |
| UsdtAddress | TRC20 | Money | `user_deposit_addresses` | none typed in index | `GET /wallet/my-deposit-address` | no | YES | NO | copy | UNAVAILABLE | Support |
| Membership | ladder display | Engine | user_membership | none | `GET /me/membership` | no Rule input | NO | NO | not primary | hide | REMOVE PRIMARY |
| Benefits | missions | Money | benefits | none | `GET /me/benefits` | events | PARTIAL | NO | not primary | hide | REMOVE PRIMARY |

---

## Duplicate truth audit

Invalid implementation fallback ≠ second Truth owner. GAP으로만 기록한다.

```text
FX_TRUTH_OWNER = CurrentFxApprox / POST /me/current-fx/approx
FX_TRUTH = SINGLE_OWNER
FX_INVALID_ZERO_FALLBACK = REGISTERED_GAP
FX_ZERO_FALLBACK_IS_AUTHORITY = NO
FX_DUPLICATE_ACTIVE_OWNER = 0
CARD_KRW_ZERO_FALLBACK = INVALID_IMPLEMENTATION_FALLBACK = GAP = MUST NOT BE USED FOR NEW CONSUMER UX

authoritative 0 ≠ UNAVAILABLE
FX unavailable → null / UNAVAILABLE / STALE / PENDING
never 0 fallback
```

```text
PARTNERSHIP_TRUTH_OWNER = Founder Lock
ADAPTER_AVAILABILITY_OWNER = MI adapter catalog / runtime
PARTNER_ADAPTER_CONCEPT_CONFLATED = NO
PARTNER_DUPLICATE_ACTIVE_OWNER = 0
```

| Fact | verdict | notes |
|------|---------|-------|
| Balance / principal | SINGLE_OWNER | `wallet_buckets` · 여러 read API는 동일 투영 |
| Profit bucket | SINGLE_OWNER | `profitUsdt` |
| FX display | SINGLE_OWNER | owner = CurrentFxApprox. card KRW `0` = INVALID_IMPLEMENTATION_FALLBACK (G-P0-01 / G-P2-02), not a second owner |
| RequiredCapital | SINGLE_OWNER | opportunity row · participate equality |
| Eligibility | SINGLE_OWNER | MI classification · participate final |
| Matching | SINGLE_OWNER | `trade_executions` + settlement_rule |
| Settlement | SINGLE_OWNER | settlement journal + trade success |
| Deposit/Withdraw | SINGLE_OWNER | Nest wallet |
| PartnerStatus | SINGLE_OWNER | Founder lock: eBay/Amazon/Yahoo! JAPAN Auction = OFFICIAL |
| AdapterAvailability | SINGLE_OWNER | runtime/MI catalog. Yahoo adapter FORBIDDEN ≠ partnership OFF |
| Home principal vs feed principal | SINGLE_OWNER | both ledger principal |

```text
KNOWN_DUPLICATE_CRITICAL_TRUTH_OWNER = 0
KNOWN_AMBIGUOUS_CRITICAL_TRUTH_OWNER = 0
```

구현 리팩터는 Phase 3에서 하지 않는다.

---

## Presentation model rule

```text
Backend / Engine → SDK → server adapter → Presentation Model → React
```

포맷 OK. 비즈니스 진실 생성 금지.

SDK 주의: `asAmount` / `mapNearMissExtraCount` 가 결측을 `"0"`으로 채움 → **구현 갭**. 아키텍처 fallback은 UNAVAILABLE.
