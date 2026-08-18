# CONSUMER JOURNEY MAP

> Phase 3 · PRODUCT_TRUTH · 시각 없음  
> SSOT 교차: `CONSUMER_UX_ARCHITECTURE.md`

```text
FAKE_STEPPER = FORBIDDEN
FAKE_ACTIVITY = FORBIDDEN
```

---

## Acquisition

| field | value |
|-------|-------|
| entry | `/` · `/ads` · `/l/[variant]` · 초대 링크 |
| user goal | 퍼뜩이 뭔지 3초 이해 · 가입/로그인 |
| system truth | Auth API `POST /api/v1/auth/*` · session cookie `aipo_session` · Growth public surface는 demo/hybrid 사용 금지 |
| CTA | Signup · Login · (utility) 시작 |
| next state | Signup/Login → CompleteProfile/Onboarding |
| failure recovery | AUTH 실패 → 다시 시도. OAuth 실패 → 이메일/패스키. 광고 랜딩은 noindex |
| screens | Landing · Signup · Login |
| classification | KEEP AS SCREEN |
| notes | 현재 web = PendingFigma. `/ads` `/l/*` = COMPATIBILITY / 마케팅 |

---

## Activation

| field | value |
|-------|-------|
| entry | 가입 직후 |
| user goal | 왜 필요한 자본이 있는지 · 어떻게 참여하는지 이해 |
| system truth | Profile `PATCH /auth/profile` · practice welcome은 signup provision(유저 primary 아님) |
| CTA | 시작하기 → Home |
| next state | authenticated Home |
| failure recovery | 프로필 미완 → CompleteProfile. 스킵 가능 여부는 Founder D-02 범위 밖 구현 이슈 |
| screens | CompleteProfile · Onboarding |
| classification | KEEP AS SCREEN |
| notes | PartnerTrust · 면책을 온보딩에 짧게. Guest 온보딩에 수익 보장 카피 0 |

---

## Opportunity Discovery

| field | value |
|-------|-------|
| entry | Home · (overflow) OpportunityList |
| user goal | 지금 참여 가능한 기회와 필요 자본 |
| system truth | `GET /api/v1/opportunities` · principal from ledger · classification Engine `affordable/nearMiss/lockedHigh` · stale row 제외 |
| CTA | 카드 → OpportunityDetail · affordable → Participate · nearMiss → Deposit |
| next state | Detail 또는 Funding |
| failure recovery | unauthorized → Login. empty → 정직한 빈 상태. stale/error → UNAVAILABLE |
| screens | Home · OpportunityList · OpportunityDetail |
| classification | List = EMBED AS SECTION + overflow KEEP. Detail = KEEP |

---

## Participation

| field | value |
|-------|-------|
| entry | OpportunityDetail |
| user goal | 이 기회에 필요한 자본으로 참여 |
| system truth | `POST /opportunities/:id/preflight` (TTL 300s) → `POST /opportunities/:id/participate` · amountUsdt **=** requiredCapitalUsdt · KYC 불필요 · principal lock |
| CTA | ParticipateConfirmation primary |
| next state | `status=accepted` `tradeStatus=running` → Matching |
| failure recovery | `PREFLIGHT_REQUIRED` → 재확인. `INSUFFICIENT_PRINCIPAL` → Funding. `PRICE_STALE*` → 목록 복귀. `MATCH_BLOCKED`/`COMPARE_NOT_READY`/`CIRCUIT` → 불가 설명. `AUTH_REQUIRED` → Login |
| screens | ParticipateConfirmation (MODAL/SHEET) |
| classification | MODAL/SHEET |
| notes | SDK participate 함수 없음 (GAP). Web wiring 없음 |

---

## Funding

| field | value |
|-------|-------|
| entry | nearMiss · INSUFFICIENT_PRINCIPAL · Home 우선순위 4 |
| user goal | 부족한 참여 자본 채우기 |
| system truth | shortfall = Engine `suggestDepositUsdt` (클라 계산 금지). 입금 후 principal 재조회 |
| CTA | UsdtDeposit 또는 KrwDeposit |
| next state | 입금 pending → 복귀 대기. credited → OpportunityDetail/Participate |
| failure recovery | KRW reject/expire → 재신청. USDT unmatched → dispute/Support. FX null → KRW 추정 숨김 |
| screens | UsdtDeposit · KrwDeposit |
| classification | KEEP AS SCREEN |

---

## Matching

| field | value |
|-------|-------|
| entry | participate success `tradeId` |
| user goal | 실제 매칭 상태 이해 |
| system truth | `GET /api/v1/trades/:id` · Phase0 `POST .../execute-tick` · Rule = `settlement_rule.cjs` |
| CTA | 대기(indeterminate). 취소 = FUTURE_CAPABILITY · D-05 APPROVED HIDE |
| next state | success → Settlement. safe_stop/failed → Home. requeue → 계속 대기 |
| failure recovery | 네트워크 → 재시도 poll. trade 없음 → Home. 가짜 % 복구 없음(표시 금지) |
| screens | Matching |
| classification | KEEP AS SCREEN (탭 아님) |
| notes | `progressPct` = timer presentation. Consumer indeterminate |

---

## Settlement

| field | value |
|-------|-------|
| entry | `MATCH_SUCCESS` finalize |
| user goal | 원금 복귀 + 수익 반영 확인 |
| system truth | ledger `journalType=settlement` · principal unlock · profit credit · `settledProfitUsdt` |
| CTA | Wallet 보기 · Home으로 |
| next state | Wallet / Home ready_data |
| failure recovery | success 전 “수익 확정” 금지. journal 없으면 Settled 아님 |
| screens | MatchingResult · SettlementDetail |
| classification | Result KEEP. Detail KEEP if trade GET으로 설명 가능 |

---

## Wallet

| field | value |
|-------|-------|
| entry | Primary nav · Funding · Settlement |
| user goal | 잔액 이해 · 4 rails · 내역 |
| system truth | `GET /wallet/buckets` · KRW deposit CRUD · withdraw + step-up + KYC · USDT address |
| CTA | 입금/출금/내역 |
| next state | rail screens |
| failure recovery | buckets 404 → UNAVAILABLE. KYC → Kyc. step-up fail → 재시도 |
| screens | Wallet · UsdtDeposit · UsdtWithdraw · KrwDeposit · KrwWithdraw · TransactionHistory · TransactionDetail |
| classification | KEEP. History 목록 owner PARTIAL (KRW requests only; journal list MISSING) |

---

## Retention

| field | value |
|-------|-------|
| entry | 재방문 Home · notification |
| user goal | 돈/기회/매칭이 바뀌었는지 |
| system truth | 실제 상태 변화만. DayPulse live counts. ticker demo/hybrid 사용 금지 |
| CTA | Home next-best-action |
| next state | Discovery / Matching / Wallet |
| failure recovery | 합성 활동으로 채우지 않음 |
| screens | Home · Notifications · AIInsight |
| classification | Home KEEP. 나머지 EMBED/KEEP |

---

## Referral

| field | value |
|-------|-------|
| entry | My · 공유 |
| user goal | 초대 · 보상 조건/상태 |
| system truth | `GET /referral/me` · bind · share · `rewardsEnabled` 기본 false |
| CTA | 초대 공유 · 코드 입력 |
| next state | edge status. pool wait ≠ 실패 |
| failure recovery | 이미 bind · share limit · rewards off면 정성 설명 |
| screens | Referral |
| classification | KEEP AS SCREEN |

---

## Account/Support

| field | value |
|-------|-------|
| entry | My |
| user goal | 본인확인 · 설정 · 도움 · 약관 |
| system truth | KYC `/compliance/kyc/*` · inbox · support disputes · legal copy |
| CTA | 각 하위 화면 |
| next state | 해당 작업 완료 후 My/Wallet |
| failure recovery | KYC reject → 재제출. Support |
| screens | Profile · Kyc · Settings · Support · Guides · Legal · PartnerTrust |
| classification | KEEP 또는 EMBED (inventory 참조) |

---

## Intentionally excluded from primary journey

```text
Events
Strategies
Membership
Benefits
Ads variants
practice grant as earnings
profit→principal merge (D-06 APPROVED HIDE)
user cancel matching (until API · D-05 APPROVED HIDE)
```
