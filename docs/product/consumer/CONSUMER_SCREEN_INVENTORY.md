# CONSUMER SCREEN INVENTORY

> Phase 3 · 화면 목록 + 계약. 시각 없음.  
> 분류: `KEEP AS SCREEN` · `MERGE` · `EMBED AS SECTION` · `MODAL/SHEET` · `REMOVE FROM PRIMARY JOURNEY` · `COMPATIBILITY ROUTE ONLY`

```text
FUTURE_FIGMA_REQUIRED = YES for every KEEP/MODAL used in primary journey
APPROVED FIGMA = NONE
```

---

## Summary

| classification | count | ids |
|----------------|-------|-----|
| KEEP AS SCREEN | 26 | Landing Signup Login CompleteProfile Onboarding Home OpportunityDetail Matching MatchingResult SettlementDetail Wallet UsdtDeposit UsdtWithdraw KrwDeposit KrwWithdraw TransactionHistory TransactionDetail Referral Notifications AIInsight Profile Kyc Settings Support Guides Legal |
| EMBED AS SECTION | 3 | OpportunityList PartnerTrust Earnings |
| MODAL/SHEET | 1 | ParticipateConfirmation |
| MERGE | 1 | Security → Settings |
| REMOVE FROM PRIMARY JOURNEY | 4 | Events Strategies Membership Benefits |
| COMPATIBILITY ROUTE ONLY | 8 | `/profits` `/trades` `/ads` `/l/[variant]` `/me/events` `/me/strategies` `/me/membership` `/me/benefits` |

Overflow: OpportunityList는 Home 임베드 + 필요 시 KEEP 전체 화면.

---

## Screen contracts

각 행: Screen · User goal · Primary question · Primary CTA · Secondary CTA · Entry · Exit · Required data · Owner · Critical states · Money · Engine · Auth · KYC · Error recovery · Mobile · Desktop

### Landing

| field | value |
|-------|-------|
| Screen name | Landing |
| User goal | 퍼뜩이 부업/매칭 플랫폼임을 이해 |
| Primary question answered | 이게 뭐고 다음에 뭘 하지? |
| Primary CTA | Signup |
| Secondary CTA | Login |
| Entry points | `/` guest · ads/l |
| Exit points | Signup · Login · Onboarding |
| Required data | 없음(마케팅 카피). 금융 Fact 0 |
| Authoritative owner | Product copy (미래). Growth public = live only if used |
| Critical states | default · offline |
| Money sensitivity | NO |
| Engine sensitivity | NO |
| Authentication requirement | guest |
| KYC dependency | NO |
| Possible error recovery | 네트워크 → 재시도 |
| Mobile priority | 3초 카피 + 1 CTA |
| Desktop enhancement | 신뢰 문단 |
| classification | KEEP AS SCREEN |
| current route | `/` |
| future route decision | `/` guest variant (D-02 APPROVED) |
| future Figma required | YES |

### Signup

| field | value |
|-------|-------|
| Screen name | Signup |
| User goal | 계정 만들기 |
| Primary question answered | 어떻게 시작하지? |
| Primary CTA | 가입 (VALID_ACTION `POST /auth/signup`) |
| Secondary CTA | Login · Kakao/Google OAuth · passkey · magic link |
| Entry points | Landing · Login |
| Exit points | CompleteProfile · Onboarding |
| Required data | Auth 계약 필드만 |
| Authoritative owner | `services/api-nest` Auth |
| Critical states | loading · error · success |
| Money sensitivity | NO |
| Engine sensitivity | NO |
| Authentication requirement | guest |
| KYC dependency | NO |
| Possible error recovery | 중복/검증 오류 |
| Mobile priority | 단순 폼 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/auth/signup` |
| future route decision | KEEP |
| future Figma required | YES |

### Login

| field | value |
|-------|-------|
| Screen name | Login |
| User goal | 기존 세션 |
| Primary question answered | 어떻게 들어가지? |
| Primary CTA | 로그인 |
| Secondary CTA | Signup · OAuth · passkey · magic link |
| Entry points | Landing · expired session |
| Exit points | Home |
| Required data | credentials / oauth |
| Authoritative owner | Auth |
| Critical states | loading · error · success |
| Money sensitivity | NO |
| Engine sensitivity | NO |
| Authentication requirement | guest |
| KYC dependency | NO |
| Possible error recovery | 재시도 · 다른 방법 |
| Mobile priority | 단순 폼 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/auth/login` |
| future route decision | KEEP |
| future Figma required | YES |

### CompleteProfile

| field | value |
|-------|-------|
| Screen name | CompleteProfile |
| User goal | 표시/연락에 필요한 최소 프로필 |
| Primary question answered | 나를 어떻게 부르면 되지? |
| Primary CTA | 저장 `PATCH /auth/profile` |
| Secondary CTA | 나중에 (정책 확정 전 INTENTIONALLY 가능) |
| Entry points | Signup |
| Exit points | Onboarding · Home |
| Required data | profile 계약 |
| Authoritative owner | Auth |
| Critical states | loading · error |
| Money sensitivity | NO |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | 검증 오류 |
| Mobile priority | 최소 필드 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/auth/complete-profile` |
| future route decision | KEEP |
| future Figma required | YES |

### Onboarding

| field | value |
|-------|-------|
| Screen name | Onboarding |
| User goal | 필요 자본 · 참여 · 파트너 신뢰 |
| Primary question answered | 어떻게 돈을 벌고, 뭐가 필요하지? |
| Primary CTA | Home으로 |
| Secondary CTA | Guides · Legal |
| Entry points | Signup · Landing utility |
| Exit points | Home |
| Required data | 금융 숫자 발명 0. Partner official names |
| Authoritative owner | Product + Partner lock |
| Critical states | default |
| Money sensitivity | NO (설명만) |
| Engine sensitivity | NO |
| Authentication requirement | preferred |
| KYC dependency | NO |
| Possible error recovery | n/a |
| Mobile priority | 짧은 단계 |
| Desktop enhancement | 신뢰 문단 |
| classification | KEEP AS SCREEN |
| current route | `/onboarding` |
| future route decision | KEEP |
| future Figma required | YES |

### Home

| field | value |
|-------|-------|
| Screen name | Home |
| User goal | 지금 중요한 것 + 다음 행동 |
| Primary question answered | 지금 나에게 가장 중요한 것은 무엇이고, 다음에 뭘 하면 되지? |
| Primary CTA | 상태 의존: Participate · Deposit · Matching 보기 · Login |
| Secondary CTA | Wallet · OpportunityList overflow |
| Entry points | Primary nav · 로그인 후 |
| Exit points | Detail · Matching · Wallet · Login |
| Required data | home-read · home-money-read · feed 또는 trade · session |
| Authoritative owner | HomeRead + Money + Opportunities + Trades |
| Critical states | 전 상태 매트릭스 |
| Money sensitivity | YES |
| Engine sensitivity | YES |
| Authentication requirement | guest면 Landing 변이 |
| KYC dependency | NO |
| Possible error recovery | viewState recoverable_error |
| Mobile priority | 1 primary block |
| Desktop enhancement | 보조 insight |
| classification | KEEP AS SCREEN |
| current route | `/` |
| future route decision | `/` authenticated variant |
| future Figma required | YES — FIRST TARGET |

### OpportunityList

| field | value |
|-------|-------|
| Screen name | OpportunityList |
| User goal | 여러 기회 비교 |
| Primary question answered | 어떤 기회가 있지? |
| Primary CTA | 카드 선택 |
| Secondary CTA | Home |
| Entry points | Home overflow |
| Exit points | OpportunityDetail |
| Required data | feed items + classification |
| Authoritative owner | OpportunitiesUserService |
| Critical states | loading empty ready error auth |
| Money sensitivity | YES (RequiredCapital) |
| Engine sensitivity | YES |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | 재시도 |
| Mobile priority | 카드 리스트 |
| Desktop enhancement | 더 많은 카드 |
| classification | EMBED AS SECTION + overflow KEEP |
| current route | `/profits` COMPATIBILITY |
| future route decision | `/opportunities` 또는 Home only (D-04 APPROVED Home-first) |
| future Figma required | YES if overflow |

### OpportunityDetail

| field | value |
|-------|-------|
| Screen name | OpportunityDetail |
| User goal | 기회 이해 후 참여/입금 결정 |
| Primary question answered | 얼마가 필요하고 참여할 수 있나? |
| Primary CTA | Participate 또는 Deposit |
| Secondary CTA | Home |
| Entry points | Home · List |
| Exit points | ParticipateConfirmation · Deposit · Home |
| Required data | GET `/opportunities/:id` + buckets |
| Authoritative owner | Opportunities + LedgerBuckets |
| Critical states | loading empty stale error insufficient-capital |
| Money sensitivity | YES |
| Engine sensitivity | YES |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | stale → 목록. 404 → 목록 |
| Mobile priority | RequiredCapital + CTA |
| Desktop enhancement | 설명 확장 |
| classification | KEEP AS SCREEN |
| current route | `/profits/[id]` |
| future route decision | `/opportunities/:id` |
| future Figma required | YES |

### ParticipateConfirmation

| field | value |
|-------|-------|
| Screen name | ParticipateConfirmation |
| User goal | 필요 자본·결과·다음 단계 확인 후 참여 |
| Primary question answered | 이 금액으로 참여할까? |
| Primary CTA | Participate VALID_ACTION |
| Secondary CTA | 취소(시트 닫기) VALID_ROUTE |
| Entry points | Detail |
| Exit points | Matching · Funding · Detail |
| Required data | requiredCapital · principal · preflightToken · pricingVersion |
| Authoritative owner | Preflight + ParticipateService |
| Critical states | loading pending error disabled insufficient-capital |
| Money sensitivity | YES |
| Engine sensitivity | YES |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | 토큰 재발급 · 입금 |
| Mobile priority | sheet |
| Desktop enhancement | dialog |
| classification | MODAL/SHEET |
| current route | none |
| future route decision | sheet on Detail |
| future Figma required | YES |

### Matching

| field | value |
|-------|-------|
| Screen name | Matching |
| User goal | 실제 매칭 상태 |
| Primary question answered | 지금 맞춰지고 있나? |
| Primary CTA | 없음 또는 Home (indeterminate) |
| Secondary CTA | Cancel = FUTURE_CAPABILITY (D-05 APPROVED HIDE) |
| Entry points | Participate success |
| Exit points | MatchingResult |
| Required data | TradeExecutionState minus progress-as-truth |
| Authoritative owner | TradesExecutionService + settlement_rule |
| Critical states | pending · error · offline |
| Money sensitivity | YES (locked) |
| Engine sensitivity | YES |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | poll 재시도 |
| Mobile priority | 한 상태 + 설명 |
| Desktop enhancement | 동일 의미 |
| classification | KEEP AS SCREEN |
| current route | `/trades/[id]/execute` |
| future route decision | `/matching/:tradeId` |
| future Figma required | YES |

### MatchingResult

| field | value |
|-------|-------|
| Screen name | MatchingResult |
| User goal | 맞음/안 맞음 결과 |
| Primary question answered | 어떻게 됐지? |
| Primary CTA | Wallet 또는 다른 기회 |
| Secondary CTA | Home |
| Entry points | Matching terminal |
| Exit points | Wallet · Home · Detail |
| Required data | status + resultCode + settledProfit if success |
| Authoritative owner | trade row |
| Critical states | success error |
| Money sensitivity | YES |
| Engine sensitivity | YES |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | Failed → Support |
| Mobile priority | 결과 + 1 CTA |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | same execute route terminal |
| future route decision | same Matching screen state |
| future Figma required | YES |

### Earnings

| field | value |
|-------|-------|
| Screen name | Earnings |
| User goal | 정산된 수익 이해 |
| Primary question answered | 번 돈이 얼마지? |
| Primary CTA | Wallet |
| Secondary CTA | History |
| Entry points | Home · Wallet |
| Exit points | Wallet |
| Required data | `profitUsdt` · `GET /api/v1/trades` list |
| Authoritative owner | buckets.profitUsdt |
| Critical states | ready empty unavailable |
| Money sensitivity | YES |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | UNAVAILABLE |
| Mobile priority | 섹션 |
| Desktop enhancement | 섹션 |
| classification | EMBED AS SECTION |
| current route | `/trades` COMPATIBILITY (제목 혼란) |
| future route decision | not a tab (D-03 APPROVED) |
| future Figma required | as Wallet/Home part |

### SettlementDetail

| field | value |
|-------|-------|
| Screen name | SettlementDetail |
| User goal | 한 건 정산 설명 |
| Primary question answered | 이번 참여의 원금/수익은? |
| Primary CTA | Wallet |
| Secondary CTA | Home |
| Entry points | MatchingResult · History |
| Exit points | Wallet · Home |
| Required data | GET `/trades/:id` |
| Authoritative owner | trade + journal id |
| Critical states | loading error |
| Money sensitivity | YES |
| Engine sensitivity | YES |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | 404 → Home |
| Mobile priority | 사실 나열 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | none dedicated |
| future route decision | `/matching/:tradeId` result 또는 `/wallet/history/:id` |
| future Figma required | YES |

### Wallet

| field | value |
|-------|-------|
| Screen name | Wallet |
| User goal | 버킷 이해 + 4 rails 진입 |
| Primary question answered | 내 돈은 어디에 있고 어떻게 넣고 빼지? |
| Primary CTA | Deposit |
| Secondary CTA | Withdraw · History |
| Entry points | Primary nav |
| Exit points | rails · History · Kyc |
| Required data | WalletBuckets |
| Authoritative owner | LedgerBucketsService |
| Critical states | 전 매트릭스 |
| Money sensitivity | YES |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | 출금만 |
| Possible error recovery | 404 UNAVAILABLE |
| Mobile priority | 버킷 + 2 CTA |
| Desktop enhancement | 설명 |
| classification | KEEP AS SCREEN |
| current route | `/wallet` |
| future route decision | KEEP |
| future Figma required | YES |

### UsdtDeposit

| field | value |
|-------|-------|
| Screen name | UsdtDeposit |
| User goal | TRC20로 입금 |
| Primary question answered | 어디로 보내면 되지? |
| Primary CTA | 주소 복사 |
| Secondary CTA | 입금 문제 → Support |
| Entry points | Wallet · Funding |
| Exit points | Wallet · Opportunity |
| Required data | `GET /wallet/my-deposit-address` |
| Authoritative owner | DepositAddressService |
| Critical states | loading pending success (19conf) |
| Money sensitivity | YES |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | dispute |
| Mobile priority | 주소 + 경고(쉬운 말) |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/wallet/deposit` (혼합) |
| future route decision | `/wallet/deposit/usdt` |
| future Figma required | YES |

### KrwDeposit

| field | value |
|-------|-------|
| Screen name | KrwDeposit |
| User goal | 원화 신청 후 지정 금액 송금 |
| Primary question answered | 얼마를 어디로 보내나? |
| Primary CTA | 입금 신청 |
| Secondary CTA | 신청 상태 |
| Entry points | Wallet · Funding |
| Exit points | Wallet |
| Required data | create/list/get KRW request · payable formula |
| Authoritative owner | KrwDepositService |
| Critical states | pending success error |
| Money sensitivity | YES |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | expire/reject → 재신청 |
| Mobile priority | payable 금액 강조 |
| Desktop enhancement | 설명 |
| classification | KEEP AS SCREEN |
| current route | 없음 (deposit 혼합) |
| future route decision | `/wallet/deposit/krw` |
| future Figma required | YES |

### UsdtWithdraw

| field | value |
|-------|-------|
| Screen name | UsdtWithdraw |
| User goal | 수익(기본) 출금 |
| Primary question answered | 얼마를 어디로 빼나? |
| Primary CTA | 출금 신청 |
| Secondary CTA | Kyc · step-up |
| Entry points | Wallet |
| Exit points | Wallet · Kyc |
| Required data | buckets · withdraw · step-up |
| Authoritative owner | WithdrawIntent + StepUp + Kyc |
| Critical states | KYC disabled pending success error |
| Money sensitivity | YES |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | YES |
| Possible error recovery | KYC · step-up · min holding |
| Mobile priority | 금액 + 확인 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/wallet/withdraw/usdt` |
| future route decision | KEEP |
| future Figma required | YES |

### KrwWithdraw

| field | value |
|-------|-------|
| Screen name | KrwWithdraw |
| User goal | 수익을 원화로 |
| Primary question answered | 원화로 얼마가 나가나? |
| Primary CTA | 출금 신청 |
| Secondary CTA | Kyc |
| Entry points | Wallet · `/wallet/withdraw/krw` |
| Exit points | Wallet · Kyc |
| Required data | buckets · FX approx · withdraw asset=KRW |
| Authoritative owner | Withdraw + CurrentFx |
| Critical states | FX unavailable · KYC |
| Money sensitivity | YES |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | YES |
| Possible error recovery | FX null → KRW 추정 숨김 |
| Mobile priority | USDT 권위 + KRW 참고 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/wallet/withdraw/krw` |
| future route decision | KEEP |
| future Figma required | YES |

### TransactionHistory

| field | value |
|-------|-------|
| Screen name | TransactionHistory |
| User goal | 입출금/정산 목록 |
| Primary question answered | 무슨 일이 있었지? |
| Primary CTA | 행 선택 |
| Secondary CTA | Wallet |
| Entry points | Wallet |
| Exit points | TransactionDetail |
| Required data | user journal list **MISSING** · KRW requests PARTIAL |
| Authoritative owner | MISSING (GAP) |
| Critical states | empty unavailable |
| Money sensitivity | YES |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | UNAVAILABLE — 0건으로 위조 금지 |
| Mobile priority | 리스트 |
| Desktop enhancement | 필터는 나중 |
| classification | KEEP AS SCREEN |
| current route | `/wallet/history` |
| future route decision | KEEP |
| future Figma required | YES — empty/unavailable states |

### TransactionDetail

| field | value |
|-------|-------|
| Screen name | TransactionDetail |
| User goal | 한 건 사실 |
| Primary question answered | 이 건의 금액/상태는? |
| Primary CTA | 뒤로 |
| Secondary CTA | Support |
| Entry points | History · KRW request id |
| Exit points | History |
| Required data | KRW getById VERIFIED. generic journal MISSING |
| Authoritative owner | PARTIAL |
| Critical states | loading error |
| Money sensitivity | YES |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | 404 |
| Mobile priority | 사실 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | none generic |
| future route decision | `/wallet/history/:id` |
| future Figma required | YES |

### Referral

| field | value |
|-------|-------|
| Screen name | Referral |
| User goal | 초대와 보상 상태 |
| Primary question answered | 어떻게 초대하고 보상은 언제지? |
| Primary CTA | 공유 |
| Secondary CTA | 코드 입력 |
| Entry points | My |
| Exit points | My |
| Required data | `GET /referral/me` |
| Authoritative owner | Referral |
| Critical states | rewards off · pool wait |
| Money sensitivity | YES (표시는 config) |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | bind fail |
| Mobile priority | 공유 1 CTA |
| Desktop enhancement | 상태 목록 |
| classification | KEEP AS SCREEN |
| current route | `/me/invite` |
| future route decision | KEEP |
| future Figma required | YES |

### Notifications

| field | value |
|-------|-------|
| Screen name | Notifications |
| User goal | 실제 상태 변화 확인 |
| Primary question answered | 놓친 중요한 일이 있나? |
| Primary CTA | 항목 열기 |
| Secondary CTA | prefs |
| Entry points | My · Home badge |
| Exit points | 해당 도메인 화면 |
| Required data | `GET /me/inbox` |
| Authoritative owner | Inbox |
| Critical states | empty |
| Money sensitivity | 링크만 |
| Engine sensitivity | 링크만 |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | 재시도 |
| Mobile priority | 리스트 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/me/inbox` |
| future route decision | KEEP |
| future Figma required | YES |

### AIInsight

| field | value |
|-------|-------|
| Screen name | AIInsight |
| User goal | 퍼뜩에게 묻기 |
| Primary question answered | 지금 상황을 쉽게 설명해 줘 |
| Primary CTA | 보내기 |
| Secondary CTA | chips · Home |
| Entry points | My · Home embed |
| Exit points | deepLink (서버) |
| Required data | chips · SSE chat |
| Authoritative owner | Coach |
| Critical states | degraded · busy |
| Money sensitivity | Fact tools only |
| Engine sensitivity | Fact tools only |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | degrade 카피 |
| Mobile priority | 채팅 |
| Desktop enhancement | 사이드 |
| classification | KEEP AS SCREEN + Home EMBED |
| current route | `/me/peotteok` |
| future route decision | KEEP |
| future Figma required | YES |

### Profile

| field | value |
|-------|-------|
| Screen name | Profile |
| User goal | 내 정보 hub |
| Primary question answered | 내 계정에서 어디로 가지? |
| Primary CTA | 하위 진입 |
| Secondary CTA | Logout `POST /auth/logout` |
| Entry points | Primary My |
| Exit points | 하위 |
| Required data | session |
| Authoritative owner | Auth session |
| Critical states | auth |
| Money sensitivity | NO |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | 재로그인 |
| Mobile priority | 리스트 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/me` |
| future route decision | KEEP |
| future Figma required | YES |

### Security

| field | value |
|-------|-------|
| Screen name | Security |
| classification | MERGE into Settings |
| current route | none |
| future route decision | Settings section |
| future Figma required | as Settings |

### Kyc

| field | value |
|-------|-------|
| Screen name | Kyc |
| User goal | 출금을 위한 본인 확인 |
| Primary question answered | 출금하려면 무엇이 남았나? |
| Primary CTA | 제출 `POST /compliance/kyc/submit` |
| Secondary CTA | Wallet |
| Entry points | Withdraw · My |
| Exit points | Withdraw · My |
| Required data | `GET /compliance/kyc/status` |
| Authoritative owner | KycService |
| Critical states | pending approved rejected |
| Money sensitivity | 게이트만 |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | self |
| Possible error recovery | reject → 재제출 |
| Mobile priority | 최소 서류 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/me/kyc` |
| future route decision | KEEP |
| future Figma required | YES |

### Settings

| field | value |
|-------|-------|
| Screen name | Settings |
| User goal | 알림·보안·탈퇴 |
| Primary question answered | 어떻게 바꾸지? |
| Primary CTA | 저장 prefs |
| Secondary CTA | 탈퇴 `POST /auth/delete-account` |
| Entry points | My |
| Exit points | My |
| Required data | notification-prefs · session |
| Authoritative owner | Inbox prefs + Auth |
| Critical states | success error |
| Money sensitivity | NO |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | 재시도 |
| Mobile priority | 그룹 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/me/settings` |
| future route decision | KEEP |
| future Figma required | YES |

### Support

| field | value |
|-------|-------|
| Screen name | Support |
| User goal | 도움 · 입금 문제 |
| Primary question answered | 누가 도와주지? |
| Primary CTA | 문의 / dispute |
| Secondary CTA | Guides |
| Entry points | My · Deposit fail |
| Exit points | My |
| Required data | deposit-disputes POST |
| Authoritative owner | DepositDispute + ops |
| Critical states | success error |
| Money sensitivity | 링크 |
| Engine sensitivity | NO |
| Authentication requirement | yes |
| KYC dependency | NO |
| Possible error recovery | 재시도 |
| Mobile priority | 쉬운 경로 |
| Desktop enhancement | 동일 |
| classification | KEEP AS SCREEN |
| current route | `/me/support` |
| future route decision | KEEP |
| future Figma required | YES |

### Guides

| field | value |
|-------|-------|
| Screen name | Guides |
| User goal | USDT/원금/수익/FAQ 이해 |
| Primary question answered | 모르는 것을 쉽게 |
| Primary CTA | 하위 가이드 |
| Secondary CTA | Support |
| Entry points | My · Onboarding |
| Exit points | My |
| Required data | copy only. 금융 숫자 발명 0 |
| Authoritative owner | copy |
| Critical states | default |
| Money sensitivity | NO |
| Engine sensitivity | NO |
| Authentication requirement | no |
| KYC dependency | NO |
| Possible error recovery | n/a |
| Mobile priority | 목록 |
| Desktop enhancement | 본문 |
| classification | KEEP AS SCREEN (hub) |
| current route | `/me/guide/*` |
| future route decision | KEEP hub |
| future Figma required | YES |

### Legal

| field | value |
|-------|-------|
| Screen name | Legal |
| User goal | 약관·개인정보 |
| Primary question answered | 어떤 조건이지? |
| Primary CTA | 문서 열기 |
| Secondary CTA | My |
| Entry points | My · Signup |
| Exit points | My |
| Required data | legal copy |
| Authoritative owner | copy §50.9 |
| Critical states | default |
| Money sensitivity | NO |
| Engine sensitivity | NO |
| Authentication requirement | no |
| KYC dependency | NO |
| Possible error recovery | n/a |
| Mobile priority | 읽기 |
| Desktop enhancement | 읽기 |
| classification | KEEP AS SCREEN |
| current route | `/me/legal*` |
| future route decision | KEEP |
| future Figma required | YES |

### PartnerTrust

| field | value |
|-------|-------|
| Screen name | PartnerTrust |
| User goal | 공식 협력 이해 |
| Primary question answered | 누구와 같이 하지? |
| Primary CTA | 가이드 복귀 |
| Secondary CTA | Home |
| Entry points | Onboarding · Guides · Home |
| Exit points | 복귀 |
| Required data | Founder partner lock only |
| Authoritative owner | Founder Intent |
| Critical states | default |
| Money sensitivity | NO |
| Engine sensitivity | NO |
| Authentication requirement | no |
| KYC dependency | NO |
| Possible error recovery | n/a |
| Mobile priority | 짧은 설명 |
| Desktop enhancement | 확장 가능 |
| classification | EMBED AS SECTION |
| current route | `/me/guide/partners` |
| future route decision | embed + guide KEEP |
| future Figma required | as section |

### Events / Strategies / Membership / Benefits

| field | value |
|-------|-------|
| classification | REMOVE FROM PRIMARY JOURNEY |
| current route | `/me/events` `/me/strategies` `/me/membership` `/me/benefits` |
| future route decision | COMPATIBILITY ROUTE ONLY |
| notes | API는 membership/benefits 존재. 핵심 여정 아님 |

### Ads / Landing variants

| field | value |
|-------|-------|
| classification | COMPATIBILITY ROUTE ONLY |
| current route | `/ads` `/ads/[variant]` `/l/[variant]` |
| future route decision | 마케팅 유지 · 제품 IA 아님 |
