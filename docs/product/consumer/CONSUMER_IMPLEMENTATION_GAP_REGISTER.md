# CONSUMER IMPLEMENTATION GAP REGISTER

> Phase 3 · 고치지 않음. 구현 백로그 입력.  
> P0 = Money/Security/critical truth · P1 = core journey blocker · P2 = important · P3 = polish

```text
Phase 3 does not fix these.
```

---

## P0

| ID | capability | expected UX | current implementation evidence | gap | severity | blocks Figma? | blocks implementation? | blocks E2E? | recommended owner |
|----|------------|-------------|---------------------------------|-----|----------|---------------|------------------------|-------------|-------------------|
| G-P0-01 | Money display fallback | 결측 = UNAVAILABLE | `packages/sdk/src/wallet/fetch.ts` `asAmount` → `"0"` · `user-feed/fetch.ts` `principalUsdt` default `"0"` · opportunities `expectedProfitKrwApprox` null→`0` | ZERO used as missing. **CARD_KRW_ZERO_FALLBACK = INVALID_IMPLEMENTATION_FALLBACK = NOT FX AUTHORITY** | P0 | NO if Figma annotates UNAVAILABLE | YES before money UI | YES money E2E | SDK + Nest opportunities |
| G-P0-02 | Matching progress | indeterminate | `trades.execution.service.ts` `presentationProgress` writes `progressPct`/`stepIndex` from Soft timer | 표시하면 FAKE_STEPPER | P0 | NO if Figma has no % bar | YES if UI binds progressPct | YES if E2E asserts % | Nest presentation + future UI |

---

## P1

| ID | capability | expected UX | current implementation evidence | gap | severity | blocks Figma? | blocks implementation? | blocks E2E? | recommended owner |
|----|------------|-------------|---------------------------------|-----|----------|---------------|------------------------|-------------|-------------------|
| G-P1-01 | Consumer web wiring | 전 여정 연결 | `apps/web/app/**/page.tsx` = `PendingFigma` only | WEB_WIRING_MISSING | P1 | NO (architecture exists) | YES product UI | YES | future Consumer impl |
| G-P1-02 | Participate SDK | preflight+participate client | `@aipo/sdk/participate` + `/profits/[id]` wired 2026-08-20 | CLOSED | P1 | NO | NO | remaining = execute E2E | SDK |
| G-P1-03 | Auth SDK | signup/login/session client | no auth module in `packages/sdk` | SDK MISSING | P1 | NO | YES auth screens | YES | SDK |
| G-P1-04 | User history | 입출금/정산 목록 | ledger journals = Admin only. User KRW request list only | OWNER_PARTIAL | P1 | History empty/unavailable OK | YES full history | YES history E2E | Money API |
| G-P1-05 | User trade list | 진행/지난 매칭 목록 | `GET /api/v1/trades` session list + `/trades` WIRED_MINIMAL (2026-08-20 B-TRADES-001) | CLOSED | P1 | NO | NO | remaining = core-loop E2E | Nest trades + web |
| G-P1-06 | User cancel | D-05 APPROVED HIDE | `CANCELLED_BY_USER` enum. no user POST cancel found | OWNER_MISSING · FUTURE_CAPABILITY until API verified | P1 | NO — CTA not drawn | if cancel later exposed | if cancel later exposed | Nest trades |
| G-P1-07 | KRW deposit route | 독립 레일 | web `/wallet/deposit` only (placeholder) | route MIXED | P1 | NO | YES IA rails | partial | Web routes |
| G-P1-08 | Return after funding | 기회 복귀 | no returnTo contract in API | UX contract only | P1 | NO | YES funding loop | YES | Web + optional API |
| G-P1-09 | Yahoo adapter vs partnership | partnership OFFICIAL; adapter FORBIDDEN | `market-intelligence` Phase1 adapter catalog may include yahoo_jp | **not owner ambiguity**. AdapterAvailability GAP vs Founder PartnerStatus. Cross-domain conflation = NO | P1 | NO (UX follows Founder partnership) | NO for partner presentation | NO | Engine/adapters policy |

---

## P2

| ID | capability | expected UX | current implementation evidence | gap | severity | blocks Figma? | blocks implementation? | blocks E2E? | recommended owner |
|----|------------|-------------|---------------------------------|-----|----------|---------------|------------------------|-------------|-------------------|
| G-P2-01 | Opportunity SDK typing | typed OpportunityCard | `OpportunityFeedItem = Record<string, unknown>` | PARTIAL | P2 | NO | quality | weak | SDK |
| G-P2-02 | FX card KRW zero fallback | CurrentFxApprox only; unavailable = null/UNAVAILABLE/STALE/PENDING | CurrentFx null-safe vs card `expectedProfitKrwApprox` may emit `0` | **NOT a second FX owner**. INVALID_IMPLEMENTATION_FALLBACK (see G-P0-01). FX_DUPLICATE_ACTIVE_OWNER = 0 | P2 | use CurrentFx only | YES consistency | YES | Nest+SDK |
| G-P2-03 | Transaction detail generic | journal by id user | Admin journals only | MISSING | P2 | UNAVAILABLE | YES | YES | Money |
| G-P2-04 | Inbox fanout | 상태 변화 알림 | inbox + prefs exist. auto fanout 범위 미검증 | UNKNOWN | P2 | generic list OK | later | later | Inbox/events |
| G-P2-05 | Referral amounts on user API | 조건/상태 | `referral/me` no % fields (good) but no user-facing reward summary DTO | PARTIAL | P2 | qualitative OK | if rewards on | if rewards on | Money |
| G-P2-06 | Kakao web | OAuth 버튼 | Nest code exchange+GET callback VERIFIED (C-AUTH-001). thin `/auth/oauth/kakao` PRESENT. login/signup PendingFigma | WEB_WIRING_MISSING | P2 | NO | YES auth polish | YES oauth | Web |
| G-P2-07 | Growth modes | live only | `GrowthPublicSurface` type includes demo/hybrid | must not use | P2 | NO | YES if ticker shown | YES | Web must ignore |
| G-P2-08 | Home tradeId | 진행 매칭을 Home에 | HomeRead has no activeTradeId field | OWNER_PARTIAL | P2 | Home job still designable | YES matching priority | YES | HomeRead |
| G-P2-09 | USDT deposit user status | 입금 진행 | observe/tick not user UI. no user event list SDK | PARTIAL | P2 | “확인 중” generic | YES | YES | Money+SDK |
| G-P2-10 | KYC SDK | status/submit client | no compliance in sdk | MISSING | P2 | NO | YES kyc slice | YES | SDK |

---

## P3

| ID | capability | expected UX | current implementation evidence | gap | severity | blocks Figma? | blocks implementation? | blocks E2E? | recommended owner |
|----|------------|-------------|---------------------------------|-----|----------|---------------|------------------------|-------------|-------------------|
| G-P3-01 | Compatibility names | semantic IA | `/profits`=기회 placeholder, `/trades`=수익 placeholder | naming drift | P3 | NO | aliases | NO | Web |
| G-P3-02 | Membership/Benefits in IA | not primary | routes+API exist | noise | P3 | NO | leave compatibility | NO | Product |
| G-P3-03 | Approved Figma | presentation | NONE | expected | P3 | YES presentation | YES pixels | visual | Founder+Figma |

---

## Counts

```text
P0 = 2
P1 = 9
P2 = 10
P3 = 3
FX_ZERO_FALLBACK_REGISTERED_AS_GAP = YES
```

### Brand / Figma blockers

```text
blocks Brand Visual Direction = NONE
blocks Home Figma mockup = NONE if owned fields + UNAVAILABLE only
blocks full-app implementation Figma = G-P1-04/05/08 annotations required
```

---

## Historical gap reverify

| historical | verdict | evidence |
|------------|---------|----------|
| Participate POST web wiring | CLOSED (2026-08-20 B-PARTICIPATION-001) | SDK `issuePreflight`+`postParticipate`. `/profits/[id]` 실연결. `/profits` 목록 POST 0. 계약=`CONSUMER_CORE_LOOP_CONTRACT.md` |
| access token path | PARTIAL | SDK omits Bearer if token null; `credentials:include` + `aipo_session`. Web calls 0 |
| cancel/merge handlers | NOT_FOUND (web) | no web handlers. API `profit/merge` exists. user cancel MISSING |
| hardcoded zero | STILL_PRESENT | SDK/API fallbacks (G-P0-01) |
| fake fallback amount | NOT_FOUND | no hardcoded demo profit amount in current web/sdk |
| wallet history | STILL_PRESENT | page placeholder + user journal list MISSING |
| wallet web 8면 | STILL_PRESENT PendingFigma | B-WALLET-001 재실측 2026-08-20. backend/SDK buckets·withdraw·KRW REAL. address/KYC SDK MISSING. 계약=`CONSUMER_WALLET_CONTRACT.md` · 배선=B-WALLET-002 |
| Kakao runtime | OWNER_FOUND exchange+GET callback · thin start PRESENT · login/signup WEB_WIRING_MISSING | C-AUTH-001 · 계약=`CONSUMER_ACQUISITION_CONTRACT.md` |
| dead href | NOT_FOUND | PendingFigma has no href |
| legacy execute path | CLOSED (2026-08-20 B-EXECUTION-001) | `/trades/[id]/execute`=`useTradeExecution` 최소 실데이터. progressPct 표시 0. API execute-tick KEEP |
| user trade list | CLOSED (2026-08-20 B-TRADES-001) | `GET /api/v1/trades` + `/trades` `TradesClient`. 기존 `toState()` 투영. progressPct 표시 0 |
