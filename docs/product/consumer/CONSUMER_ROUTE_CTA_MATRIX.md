# CONSUMER ROUTE / CTA MATRIX

> Phase 3 · `DEAD_CTA_IN_ARCHITECTURE = 0` · `UNCLASSIFIED_CRITICAL_CTA = 0`  
> 분류(행당 정확히 1개): `VALID_ROUTE` · `VALID_ACTION` · `INTENTIONALLY_DISABLED` · `FUTURE_CAPABILITY` · `DEAD`

`/profits/[id]` participate/preflight는 실배선. `/trades/[id]/execute`는 `useTradeExecution` 최소 실데이터. `/trades` 목록은 `GET /api/v1/trades` 최소 실데이터. Home·`/profits` 목록 presentation은 discovery only(목록 POST 0). 아래는 **아키텍처 매핑**이다. 계약=`CONSUMER_CORE_LOOP_CONTRACT.md`.

불변식:

```text
TOTAL_CRITICAL_CTA
=
VALID_ROUTE
+ VALID_ACTION
+ INTENTIONALLY_DISABLED
+ FUTURE_CAPABILITY
+ DEAD
```

---

## Critical CTA table

| source | CTA | condition | action | destination | current route | future route decision | Backend action | success | failure | status |
|--------|-----|-----------|--------|-------------|----------------|------------------------|----------------|---------|---------|--------|
| Landing | 시작하기(가입) | guest | VALID_ROUTE | Signup | `/auth/signup` | KEEP | — | Signup | — | mapped |
| Landing | 로그인 | guest | VALID_ROUTE | Login | `/auth/login` | KEEP | — | Login | — | mapped |
| Signup | 가입 | valid fields | VALID_ACTION | CompleteProfile | `/auth/complete-profile` | KEEP | `POST /api/v1/auth/signup` | session | validation | mapped |
| Signup | 카카오 | oauth available | VALID_ACTION | Home/CompleteProfile | oauth callback | KEEP | `POST /auth/oauth/kakao/*` | session | oauth fail | mapped |
| Signup | 구글 | oauth available | VALID_ACTION | Home/CompleteProfile | oauth callback | KEEP | `POST /auth/oauth/google/*` | session | oauth fail | mapped |
| Signup | 로그인으로 | guest | VALID_ROUTE | Login | `/auth/login` | KEEP | — | Login | — | mapped |
| Login | 로그인 | valid | VALID_ACTION | Home | `/` | KEEP | Auth session | Home | auth error | mapped |
| Login | 가입으로 | guest | VALID_ROUTE | Signup | `/auth/signup` | KEEP | — | Signup | — | mapped |
| Login | 패스키 | supported | VALID_ACTION | Home | `/` | KEEP | passkey authenticate | Home | fail | mapped |
| Login | 매직링크 | email | VALID_ACTION | Home | `/` | KEEP | magic-link | Home | fail | mapped |
| CompleteProfile | 저장 | auth | VALID_ACTION | Onboarding | `/onboarding` | KEEP | `PATCH /auth/profile` | Onboarding | validation | mapped |
| Onboarding | Home으로 | done | VALID_ROUTE | Home | `/` | KEEP | — | Home | — | mapped |
| Home | Participate | affordable + auth | VALID_ROUTE | OpportunityDetail / sheet | `/profits/[id]` | `/opportunities/:id` | — | Detail | — | mapped |
| Home | 입금하기 | nearMiss / shortfall | VALID_ROUTE | UsdtDeposit or KrwDeposit | `/wallet/deposit` | rail split | — | Deposit | — | mapped |
| Home | 진행 보기 | matching active + tradeId | VALID_ROUTE | Matching | `/trades/[id]/execute` | `/matching/:tradeId` | `GET /trades/:id` | Matching | 404 Home | mapped |
| Home | 지갑 | auth | VALID_ROUTE | Wallet | `/wallet` | KEEP | — | Wallet | — | mapped |
| Home | 로그인 | guest | VALID_ROUTE | Login | `/auth/login` | KEEP | — | Login | — | mapped |
| Home | 더 많은 기회 | itemCount>1 | VALID_ROUTE | OpportunityList | `/profits` | D-04 | `GET /opportunities` | List | empty | mapped |
| OpportunityList | 카드 | item | VALID_ROUTE | OpportunityDetail | `/profits/[id]` | `/opportunities/:id` | GET detail | Detail | 404 | mapped |
| OpportunityDetail | 이 기회로 참여 | affordable | VALID_ROUTE | ParticipateConfirmation | sheet | sheet | POST preflight | sheet | PREFLIGHT/stale | mapped |
| OpportunityDetail | 자본 채우기 | nearMiss or INSUFFICIENT | VALID_ROUTE | Deposit | `/wallet/deposit` | rails | — | Deposit | — | mapped |
| OpportunityDetail | 참여 불가 | paused/expired/circuit/lockedHigh | INTENTIONALLY_DISABLED | — | — | — | — | — | reason=status/bucket | mapped |
| ParticipateConfirmation | 참여 확정 | preflight+principal>=required | VALID_ACTION | Matching | `/trades/[id]/execute` | `/matching/:tradeId` | `POST /opportunities/:id/participate` | trade running | codes below | mapped |
| ParticipateConfirmation | 닫기 | always | VALID_ROUTE | OpportunityDetail | back | back | — | Detail | — | mapped |
| Matching | 취소 | D-05 no | FUTURE_CAPABILITY | — | — | — | user cancel MISSING | — | — | future |
| Matching | Home | always | VALID_ROUTE | Home | `/` | KEEP | — | Home | — | mapped |
| MatchingResult | 지갑 보기 | success | VALID_ROUTE | Wallet | `/wallet` | KEEP | — | Wallet | — | mapped |
| MatchingResult | 다른 기회 | safe_stop/failed | VALID_ROUTE | Home | `/` | KEEP | — | Home | — | mapped |
| MatchingResult | 고객지원 | failed | VALID_ROUTE | Support | `/me/support` | KEEP | — | Support | — | mapped |
| SettlementDetail | 지갑 보기 | settled | VALID_ROUTE | Wallet | `/wallet` | KEEP | GET `/trades/:id` | Wallet | 404 Home | mapped |
| SettlementDetail | Home | always | VALID_ROUTE | Home | `/` | KEEP | — | Home | — | mapped |
| Wallet | 테더 입금 | auth | VALID_ROUTE | UsdtDeposit | `/wallet/deposit` | `/wallet/deposit/usdt` | — | UsdtDeposit | — | mapped |
| Wallet | 원화 입금 | auth | VALID_ROUTE | KrwDeposit | `/wallet/deposit` | `/wallet/deposit/krw` | — | KrwDeposit | — | mapped |
| Wallet | 테더 출금 | auth | VALID_ROUTE | UsdtWithdraw | `/wallet/withdraw/usdt` | KEEP | — | UsdtWithdraw | — | mapped |
| Wallet | 원화 출금 | auth | VALID_ROUTE | KrwWithdraw | `/wallet/withdraw/krw` | KEEP | — | KrwWithdraw | — | mapped |
| Wallet | 내역 | auth | VALID_ROUTE | History | `/wallet/history` | KEEP | journal list MISSING | History UNAVAILABLE ok | — | mapped |
| Wallet | 수익→원금 | D-06 off | INTENTIONALLY_DISABLED | — | — | optional later | `POST /wallet/profit/merge` | — | — | mapped |
| UsdtDeposit | 주소 복사 | address ready | VALID_ACTION | same | `/wallet/deposit` | `/wallet/deposit/usdt` | `GET /wallet/my-deposit-address` | copied | UNAVAILABLE | mapped |
| UsdtDeposit | 문제 신고 | auth | VALID_ACTION | Support | `/me/support` | KEEP | `POST /wallet/deposit-disputes` | Support | fail | mapped |
| KrwDeposit | 입금 신청 | requestedAmount+name | VALID_ACTION | pending view | future krw route | `/wallet/deposit/krw` | `POST /wallet/krw-deposit-requests` | payable shown | validation | mapped |
| UsdtWithdraw | 출금 | KYC+step-up+amount | VALID_ACTION | pending | `/wallet/withdraw/usdt` | KEEP | `POST /wallet/withdraw` | intent | KYC/step-up/guard | mapped |
| KrwWithdraw | 출금 | KYC+step-up+FX | VALID_ACTION | pending | `/wallet/withdraw/krw` | KEEP | `POST /wallet/withdraw` asset=KRW | intent | KYC/FX null | mapped |
| UsdtWithdraw | 본인 확인 | kyc not approved | VALID_ROUTE | Kyc | `/me/kyc` | KEEP | GET kyc status | Kyc | — | mapped |
| History | 행 | item exists | VALID_ROUTE | TransactionDetail | none | `/wallet/history/:id` | KRW get or FUTURE journal | Detail | UNAVAILABLE | mapped |
| TransactionDetail | 뒤로 | always | VALID_ROUTE | History | `/wallet/history` | KEEP | — | History | — | mapped |
| Referral | 공유 | enabled | VALID_ACTION | share sheet | `/me/invite` | KEEP | `POST /referral/share` | share | daily limit | mapped |
| Referral | 코드 연결 | unbound | VALID_ACTION | same | `/me/invite` | KEEP | `POST /referral/bind` | bound | already/invalid | mapped |
| Notifications | 항목 | message | VALID_ROUTE | deep target or same | `/me/inbox` | KEEP | read/hide | target | — | mapped |
| Notifications | 읽음 | item | VALID_ACTION | same | `/me/inbox` | KEEP | `POST /me/inbox/:id/read` | read | — | mapped |
| AIInsight | 보내기 | auth | VALID_ACTION | same | `/me/peotteok` | KEEP | `POST /me/peotteok/chat` | answer | degrade | mapped |
| AIInsight | 칩 | chip | VALID_ACTION | same | `/me/peotteok` | KEEP | chips + chat | answer | — | mapped |
| Profile | 초대 | auth | VALID_ROUTE | Referral | `/me/invite` | KEEP | — | Referral | — | mapped |
| Profile | 알림 | auth | VALID_ROUTE | Notifications | `/me/inbox` | KEEP | — | Notifications | — | mapped |
| Profile | 퍼뜩 | auth | VALID_ROUTE | AIInsight | `/me/peotteok` | KEEP | — | AIInsight | — | mapped |
| Profile | 본인 확인 | auth | VALID_ROUTE | Kyc | `/me/kyc` | KEEP | — | Kyc | — | mapped |
| Profile | 설정 | auth | VALID_ROUTE | Settings | `/me/settings` | KEEP | — | Settings | — | mapped |
| Profile | 고객지원 | auth | VALID_ROUTE | Support | `/me/support` | KEEP | — | Support | — | mapped |
| Profile | 안내 | any | VALID_ROUTE | Guides | `/me/guide/*` | KEEP | — | Guides | — | mapped |
| Profile | 약관 | any | VALID_ROUTE | Legal | `/me/legal` | KEEP | — | Legal | — | mapped |
| Profile | 로그아웃 | auth | VALID_ACTION | Landing | `/` | KEEP | `POST /auth/logout` | guest | — | mapped |
| Kyc | 제출 | none/rejected | VALID_ACTION | pending | `/me/kyc` | KEEP | `POST /compliance/kyc/submit` | pending | validation | mapped |
| Settings | 알림 저장 | auth | VALID_ACTION | same | `/me/settings` | KEEP | `PUT /me/notification-prefs` | saved | — | mapped |
| Settings | 탈퇴 | confirm | VALID_ACTION | Landing | `/` | KEEP | `POST /auth/delete-account` | deleted | — | mapped |
| Support | 분쟁 | auth | VALID_ACTION | same | `/me/support` | KEEP | `POST /wallet/deposit-disputes` | queued | — | mapped |
| Guides | 하위 | any | VALID_ROUTE | guide page | `/me/guide/*` | KEEP | — | page | — | mapped |
| Legal | 하위 | any | VALID_ROUTE | legal page | `/me/legal/*` | KEEP | — | page | — | mapped |
| Primary nav | Home | always | VALID_ROUTE | Home/Landing | `/` | KEEP | — | Home | — | mapped |
| Primary nav | Wallet | auth else Login | VALID_ROUTE | Wallet or Login | `/wallet` | KEEP | — | Wallet | Login | mapped |
| Primary nav | My | auth else Login | VALID_ROUTE | Profile or Login | `/me` | KEEP | — | Profile | Login | mapped |
| Compatibility | /profits | any | VALID_ROUTE | OpportunityList meaning | `/profits` | alias or retire later | feed | List | — | mapped |
| Compatibility | /trades | any | VALID_ROUTE | Home or Wallet (not Earnings tab) | `/trades` | retire as tab | — | redirect Home/Wallet | — | mapped |
| Events 등 | 열기 | primary journey | INTENTIONALLY_DISABLED | — | `/me/events` etc | COMPATIBILITY | — | — | not primary | mapped |

---

## Participate failure codes (VALID_ACTION failure)

| code | user recovery |
|------|----------------|
| `PREFLIGHT_REQUIRED` | 확인 다시 |
| `INSUFFICIENT_PRINCIPAL` / `INSUFFICIENT_BALANCE` | Funding |
| `PRICE_STALE` / `PRICE_STALE_DATA` | 목록 새로고침 |
| `OPPORTUNITY_EXPIRED` | 목록 |
| `MATCH_BLOCKED` | 참여 불가 설명 |
| `COMPARE_NOT_READY` | 대기/목록 |
| `VALIDATION_ERROR` | 금액=RequiredCapital |
| `AUTH_REQUIRED` | Login |
| membership/circuit (toast from risk) | Home 설명 |

---

## Counts

N-01 재집계: 이전 표는 **70행**. `Matching 취소`를 mapped와 future에 겹쳐 세면 71이 되고, 주장 총 72와 1이 비었다. 표에서 빠진 것은 SettlementDetail(KEEP AS SCREEN) CTA 2개 — `지갑 보기` · `Home`. Compatibility `/profits`·`/trades`는 별 타입이 아니라 `VALID_ROUTE`(호환 경로). 죽은 CTA로 세지 않는다.

```text
TOTAL_CRITICAL_CTA = 72
VALID_ROUTE = 45
VALID_ACTION = 23
INTENTIONALLY_DISABLED = 3
FUTURE_CAPABILITY = 1
DEAD = 0
UNCLASSIFIED_CRITICAL_CTA = 0
DEAD_CRITICAL_CTA = 0
UNMAPPED_CRITICAL_CTA = 0
dead = 0
accounting exact = 45+23+3+1+0 = 72
```

INTENTIONALLY_DISABLED = OpportunityDetail 참여 불가 · Wallet 수익→원금 (D-06 HIDE) · Events 등 primary journey 제거.

Cancel matching = `FUTURE_CAPABILITY` (D-05 HIDE). 죽은 버튼으로 그리지 않는다.
