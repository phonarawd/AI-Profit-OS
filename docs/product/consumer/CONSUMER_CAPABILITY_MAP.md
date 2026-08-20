# CONSUMER CAPABILITY MAP

> Phase 3 · 현재 능력. 미래 IA가 아님.  
> Status: `VERIFIED` · `PARTIAL` · `MISSING` · `UNKNOWN`  
> Owner: `OWNER_FOUND` · `OWNER_PARTIAL` · `OWNER_MISSING`  
> Web: `WEB_WIRING_PRESENT` · `WEB_WIRING_MISSING`

```text
ROUTE_COMPATIBILITY ≠ FUTURE_PRODUCT_IA
CURRENT_WEB = Home + /profits list = Spark Dash presentation · /profits/[id] participate/preflight WIRED_MINIMAL · /trades/[id]/execute = WIRED_MINIMAL · /trades = WIRED_MINIMAL · /wallet* + /me/kyc + get-usdt = PendingFigma (B-WALLET-001 재실측)
```

| Capability | Current route | Backend owner | SDK owner | Engine owner | Money owner | Current web wiring | Current status | UX dependency | Risk |
|------------|---------------|---------------|-----------|--------------|-------------|--------------------|----------------|---------------|------|
| Auth | `/auth/*` | OWNER_FOUND AuthController | OWNER_MISSING | n/a | n/a | WEB_WIRING_MISSING | PARTIAL | all | Kakao code exchange PRESENT · login/signup PendingFigma · no SDK |
| Signup | `/auth/signup` | OWNER_FOUND POST `/auth/signup` | OWNER_MISSING | n/a | provision buckets | WEB_WIRING_MISSING | PARTIAL | Acquisition | PendingFigma |
| Login | `/auth/login` | OWNER_FOUND session/oauth/passkey/magic | OWNER_MISSING | n/a | n/a | WEB_WIRING_MISSING | PARTIAL | Acquisition | Kakao GET callback PRESENT · page PendingFigma |
| Onboarding | `/onboarding` | OWNER_MISSING product API | n/a | n/a | n/a | WEB_WIRING_MISSING | MISSING | Activation | copy only |
| Home data | `/` | OWNER_FOUND HomeRead + HomeMoneyRead + DayPulse | OWNER_FOUND home-read-model · home-money-read · user-feed | OWNER_FOUND mapper | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | Home | no activeTradeId |
| Opportunity feed | `/profits` | OWNER_FOUND GET `/opportunities` | OWNER_FOUND fetchOpportunityFeed | OWNER_FOUND classification | principal read | WEB_WIRING_PRESENT (list UI) · participate POST 0 | PARTIAL | Discovery | item untyped |
| Opportunity detail | `/profits/[id]` | OWNER_FOUND GET `/opportunities/:id` | OWNER_FOUND fetchOpportunityDetail | OWNER_FOUND | principal | WEB_WIRING_PRESENT (minimal) | PARTIAL | Detail | stale=404 |
| Quote | (preflight) | OWNER_FOUND POST `.../preflight` + detail pricing | OWNER_FOUND issuePreflight | pricing | FX on card | WEB_WIRING_PRESENT | PARTIAL | Participate | not a screen |
| Eligibility | feed bucket | OWNER_FOUND MI classify | pass-through | OWNER_FOUND | principal | WEB_WIRING_MISSING | VERIFIED (API) | CTA | participate final |
| Required Capital | card field | OWNER_FOUND | pass-through | OWNER_FOUND | compare principal | WEB_WIRING_MISSING | VERIFIED (API) | 3-second | — |
| Balance | `/wallet` | OWNER_FOUND GET `/wallet/buckets` | OWNER_FOUND fetchWalletBuckets | n/a | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | Wallet/Home | SDK zero fallback · page PendingFigma |
| Funding | deposit routes | OWNER_FOUND address + KRW | OWNER_FOUND KRW + buckets | n/a | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | shortfall | no returnTo · page PendingFigma |
| Participate | `/profits/[id]` | OWNER_FOUND POST participate | OWNER_FOUND postParticipate | guards + lock | lock principal | WEB_WIRING_PRESENT | PARTIAL | core | visual Figma 없음 |
| Matching | `/trades/[id]/execute` | OWNER_FOUND GET/POST trades | OWNER_FOUND execution-stream | OWNER_FOUND settlement_rule | lock/unlock | WEB_WIRING_PRESENT (minimal) | PARTIAL | Matching | progressPct 표시 0 |
| Cancel | none | OWNER_MISSING user | n/a | resultCode exists | unlock on terminal | WEB_WIRING_MISSING | MISSING | D-05 HIDE | — |
| Settlement | via trade success | OWNER_FOUND journal settlement | settledProfit field | MATCH_SUCCESS path | OWNER_FOUND | WEB_WIRING_MISSING | VERIFIED (API) | Result | — |
| Earnings | `/trades` compat | OWNER_FOUND profitUsdt + GET /trades list | buckets + `@aipo/sdk/trades` | count | OWNER_FOUND | WEB_WIRING_PRESENT (minimal) | PARTIAL | embed | list ≤50 · Figma 없음 |
| Wallet | `/wallet` | OWNER_FOUND | OWNER_FOUND | n/a | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | primary | PendingFigma 2026-08-20 |
| USDT Deposit | `/wallet/deposit` | OWNER_FOUND my-deposit-address | OWNER_PARTIAL (no address helper in index) | chain watchers | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | rail | observe not user · PendingFigma |
| USDT Withdraw | `/wallet/withdraw/usdt` | OWNER_FOUND withdraw+step-up | OWNER_FOUND createWithdraw | n/a | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | rail | KYC · PendingFigma |
| KRW Deposit | none dedicated | OWNER_FOUND krw-deposit-requests | OWNER_FOUND | n/a | OWNER_FOUND + Admin decide | WEB_WIRING_MISSING | PARTIAL | rail | payable formula VERIFIED · deposit 혼합 |
| KRW Withdraw | `/wallet/withdraw/krw` | OWNER_FOUND asset=KRW | OWNER_FOUND | n/a | OWNER_FOUND + FX | WEB_WIRING_MISSING | PARTIAL | rail | KYC · PendingFigma |
| History | `/wallet/history` | OWNER_PARTIAL KRW list only | OWNER_PARTIAL | n/a | journals Admin | WEB_WIRING_MISSING | PARTIAL | History | P1 · PendingFigma |
| Transaction detail | none | OWNER_PARTIAL KRW by id | OWNER_FOUND getKrwDepositRequest | n/a | PARTIAL | WEB_WIRING_MISSING | PARTIAL | Detail | — |
| KYC | `/me/kyc` | OWNER_FOUND compliance | OWNER_FOUND fetchKycStatus | n/a | OWNER_FOUND withdraw gate | WEB_WIRING_PRESENT (minimal) | PARTIAL | Withdraw | participate KYC 0 · PendingFigma |
| Referral | `/me/invite` | OWNER_FOUND referral | OWNER_FOUND fetchReferralMe | L3 on success | OWNER_FOUND | WEB_WIRING_PRESENT (minimal) | PARTIAL | Retention | no % on user DTO |
| Notifications | `/me/inbox` | OWNER_FOUND inbox+prefs | OWNER_FOUND listInbox | n/a | n/a | WEB_WIRING_PRESENT (minimal) | PARTIAL | Retention | fanout UNKNOWN |
| AI insight | `/me/peotteok` | OWNER_FOUND coach | OWNER_FOUND peotteok | OWNER_FOUND P/G/S | Fact only | WEB_WIRING_MISSING | PARTIAL | Home embed | — |
| Partners | `/me/guide/partners` | OWNER_MISSING display API | n/a | listing ebay Day-1 · yahoo FORBIDDEN | n/a | WEB_WIRING_PRESENT (Founder lock names) | PARTIAL | Trust | partnership SINGLE (Founder) · adapter catalog separate |
| Profile | `/me` | OWNER_FOUND session/profile | OWNER_FOUND fetchAuthSession · logoutAuth | n/a | n/a | WEB_WIRING_PRESENT (minimal) | PARTIAL | Account | PendingFigma |
| Settings | `/me/settings` | OWNER_FOUND prefs + delete | OWNER_FOUND prefs · deleteAuthAccount | n/a | n/a | WEB_WIRING_PRESENT (minimal) | PARTIAL | Account | PendingFigma |
| Support | `/me/support` | OWNER_FOUND disputes | OWNER_FOUND createDepositDispute | n/a | disputes | WEB_WIRING_PRESENT (minimal) | PARTIAL | Account | PendingFigma |
| Legal | `/me/legal*` | OWNER_FOUND operator-entity · copy gap | n/a | n/a | n/a | WEB_WIRING_PRESENT (nav + license facts) | PARTIAL | Account | 조문 창작 0 |
| FX | n/a | OWNER_FOUND CurrentFxApprox | OWNER_FOUND current-fx | n/a | snapshot | WEB_WIRING_MISSING | VERIFIED (API) | KRW reference | SINGLE owner. card 0 = GAP not owner |

---

## Core business flow owners

| stage | owner | web |
|-------|-------|-----|
| Opportunity | OWNER_FOUND | WEB_WIRING_MISSING |
| Quote | OWNER_FOUND (preflight+pricing) | WEB_WIRING_PRESENT |
| Eligibility | OWNER_FOUND | WEB_WIRING_MISSING |
| Funding | OWNER_FOUND | WEB_WIRING_MISSING |
| FX | OWNER_FOUND | WEB_WIRING_MISSING |
| Participate | OWNER_FOUND API / OWNER_FOUND SDK | WEB_WIRING_PRESENT |
| Matching | OWNER_FOUND | WEB_WIRING_PRESENT |
| Ledger | OWNER_FOUND | n/a |
| Settlement | OWNER_FOUND | WEB_WIRING_MISSING |
| Wallet | OWNER_FOUND | WEB_WIRING_MISSING |

```text
CURRENT_BUSINESS_CAPABILITY_MAP = COMPLETE_ENOUGH
```
