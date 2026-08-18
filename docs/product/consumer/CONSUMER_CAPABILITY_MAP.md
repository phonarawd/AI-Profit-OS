# CONSUMER CAPABILITY MAP

> Phase 3 · 현재 능력. 미래 IA가 아님.  
> Status: `VERIFIED` · `PARTIAL` · `MISSING` · `UNKNOWN`  
> Owner: `OWNER_FOUND` · `OWNER_PARTIAL` · `OWNER_MISSING`  
> Web: `WEB_WIRING_PRESENT` · `WEB_WIRING_MISSING`

```text
ROUTE_COMPATIBILITY ≠ FUTURE_PRODUCT_IA
CURRENT_WEB = PendingFigma (all consumer pages)
```

| Capability | Current route | Backend owner | SDK owner | Engine owner | Money owner | Current web wiring | Current status | UX dependency | Risk |
|------------|---------------|---------------|-----------|--------------|-------------|--------------------|----------------|---------------|------|
| Auth | `/auth/*` | OWNER_FOUND AuthController | OWNER_MISSING | n/a | n/a | WEB_WIRING_MISSING | PARTIAL | all | session cookie exists, no SDK |
| Signup | `/auth/signup` | OWNER_FOUND POST `/auth/signup` | OWNER_MISSING | n/a | provision buckets | WEB_WIRING_MISSING | PARTIAL | Acquisition | — |
| Login | `/auth/login` | OWNER_FOUND session/oauth/passkey/magic | OWNER_MISSING | n/a | n/a | WEB_WIRING_MISSING | PARTIAL | Acquisition | Kakao API yes |
| Onboarding | `/onboarding` | OWNER_MISSING product API | n/a | n/a | n/a | WEB_WIRING_MISSING | MISSING | Activation | copy only |
| Home data | `/` | OWNER_FOUND HomeRead + HomeMoneyRead + DayPulse | OWNER_FOUND home-read-model · home-money-read · user-feed | OWNER_FOUND mapper | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | Home | no activeTradeId |
| Opportunity feed | `/profits` | OWNER_FOUND GET `/opportunities` | OWNER_FOUND fetchOpportunityFeed | OWNER_FOUND classification | principal read | WEB_WIRING_MISSING | PARTIAL | Discovery | item untyped |
| Opportunity detail | `/profits/[id]` | OWNER_FOUND GET `/opportunities/:id` | OWNER_FOUND fetchOpportunityDetail | OWNER_FOUND | principal | WEB_WIRING_MISSING | PARTIAL | Detail | stale=404 |
| Quote | (preflight) | OWNER_FOUND POST `.../preflight` + detail pricing | OWNER_MISSING | pricing | FX on card | WEB_WIRING_MISSING | PARTIAL | Participate | not a screen |
| Eligibility | feed bucket | OWNER_FOUND MI classify | pass-through | OWNER_FOUND | principal | WEB_WIRING_MISSING | VERIFIED (API) | CTA | participate final |
| Required Capital | card field | OWNER_FOUND | pass-through | OWNER_FOUND | compare principal | WEB_WIRING_MISSING | VERIFIED (API) | 3-second | — |
| Balance | `/wallet` | OWNER_FOUND GET `/wallet/buckets` | OWNER_FOUND fetchWalletBuckets | n/a | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | Wallet/Home | SDK zero fallback |
| Funding | deposit routes | OWNER_FOUND address + KRW | OWNER_FOUND KRW + buckets | n/a | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | shortfall | no returnTo |
| Participate | none web | OWNER_FOUND POST participate | OWNER_MISSING | guards + lock | lock principal | WEB_WIRING_MISSING | PARTIAL | core | P1 SDK |
| Matching | `/trades/[id]/execute` | OWNER_FOUND GET/POST trades | OWNER_FOUND execution-stream | OWNER_FOUND settlement_rule | lock/unlock | WEB_WIRING_MISSING | PARTIAL | Matching | progressPct timer |
| Cancel | none | OWNER_MISSING user | n/a | resultCode exists | unlock on terminal | WEB_WIRING_MISSING | MISSING | D-05 HIDE | — |
| Settlement | via trade success | OWNER_FOUND journal settlement | settledProfit field | MATCH_SUCCESS path | OWNER_FOUND | WEB_WIRING_MISSING | VERIFIED (API) | Result | — |
| Earnings | `/trades` compat | OWNER_FOUND profitUsdt + count | buckets / home-money | count | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | embed | no list |
| Wallet | `/wallet` | OWNER_FOUND | OWNER_FOUND | n/a | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | primary | — |
| USDT Deposit | `/wallet/deposit` | OWNER_FOUND my-deposit-address | OWNER_PARTIAL (no address helper in index) | chain watchers | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | rail | observe not user |
| USDT Withdraw | `/wallet/withdraw/usdt` | OWNER_FOUND withdraw+step-up | OWNER_FOUND createWithdraw | n/a | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | rail | KYC |
| KRW Deposit | none dedicated | OWNER_FOUND krw-deposit-requests | OWNER_FOUND | n/a | OWNER_FOUND + Admin decide | WEB_WIRING_MISSING | PARTIAL | rail | payable formula VERIFIED |
| KRW Withdraw | `/wallet/withdraw/krw` | OWNER_FOUND asset=KRW | OWNER_FOUND | n/a | OWNER_FOUND + FX | WEB_WIRING_MISSING | PARTIAL | rail | KYC |
| History | `/wallet/history` | OWNER_PARTIAL KRW list only | OWNER_PARTIAL | n/a | journals Admin | WEB_WIRING_MISSING | PARTIAL | History | P1 |
| Transaction detail | none | OWNER_PARTIAL KRW by id | OWNER_FOUND getKrwDepositRequest | n/a | PARTIAL | WEB_WIRING_MISSING | PARTIAL | Detail | — |
| KYC | `/me/kyc` | OWNER_FOUND compliance | OWNER_MISSING | n/a | OWNER_FOUND withdraw gate | WEB_WIRING_MISSING | PARTIAL | Withdraw | participate KYC 0 |
| Referral | `/me/invite` | OWNER_FOUND referral | OWNER_MISSING | L3 on success | OWNER_FOUND | WEB_WIRING_MISSING | PARTIAL | Retention | no % on user DTO |
| Notifications | `/me/inbox` | OWNER_FOUND inbox+prefs | OWNER_MISSING | n/a | n/a | WEB_WIRING_MISSING | PARTIAL | Retention | fanout UNKNOWN |
| AI insight | `/me/peotteok` | OWNER_FOUND coach | OWNER_FOUND peotteok | OWNER_FOUND P/G/S | Fact only | WEB_WIRING_MISSING | PARTIAL | Home embed | — |
| Partners | `/me/guide/partners` | OWNER_MISSING display API | n/a | listing ebay Day-1 · yahoo FORBIDDEN | n/a | WEB_WIRING_MISSING | PARTIAL | Trust | partnership SINGLE (Founder) · adapter catalog separate |
| Profile | `/me` | OWNER_FOUND session/profile | OWNER_MISSING | n/a | n/a | WEB_WIRING_MISSING | PARTIAL | Account | — |
| Settings | `/me/settings` | OWNER_FOUND prefs + delete | OWNER_MISSING | n/a | n/a | WEB_WIRING_MISSING | PARTIAL | Account | — |
| Support | `/me/support` | OWNER_FOUND disputes | OWNER_MISSING | n/a | disputes | WEB_WIRING_MISSING | PARTIAL | Account | — |
| Legal | `/me/legal*` | OWNER_FOUND copy | n/a | n/a | n/a | WEB_WIRING_MISSING | PARTIAL | Account | placeholder pages |
| FX | n/a | OWNER_FOUND CurrentFxApprox | OWNER_FOUND current-fx | n/a | snapshot | WEB_WIRING_MISSING | VERIFIED (API) | KRW reference | SINGLE owner. card 0 = GAP not owner |

---

## Core business flow owners

| stage | owner | web |
|-------|-------|-----|
| Opportunity | OWNER_FOUND | WEB_WIRING_MISSING |
| Quote | OWNER_FOUND (preflight+pricing) | WEB_WIRING_MISSING |
| Eligibility | OWNER_FOUND | WEB_WIRING_MISSING |
| Funding | OWNER_FOUND | WEB_WIRING_MISSING |
| FX | OWNER_FOUND | WEB_WIRING_MISSING |
| Participate | OWNER_FOUND API / OWNER_MISSING SDK | WEB_WIRING_MISSING |
| Matching | OWNER_FOUND | WEB_WIRING_MISSING |
| Ledger | OWNER_FOUND | n/a |
| Settlement | OWNER_FOUND | WEB_WIRING_MISSING |
| Wallet | OWNER_FOUND | WEB_WIRING_MISSING |

```text
CURRENT_BUSINESS_CAPABILITY_MAP = COMPLETE_ENOUGH
```
