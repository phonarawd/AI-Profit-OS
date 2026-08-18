# CONSUMER SCREEN STATE MATRIX

> Phase 3 · 해당 없으면 `N/A`  
> `0`을 unavailable 대신 쓰지 않는다.

범례: `Y` = 설계 필수 · `N/A` = 해당 없음

| screen | default | loading | empty | pending | success | error | disabled | auth | KYC | insufficient-capital | offline/stale |
|--------|---------|---------|-------|---------|---------|-------|----------|------|-----|----------------------|---------------|
| Landing | Y | N/A | N/A | N/A | N/A | Y | N/A | guest | N/A | N/A | Y |
| Signup | Y | Y | N/A | N/A | Y | Y | Y | guest | N/A | N/A | Y |
| Login | Y | Y | N/A | N/A | Y | Y | Y | guest | N/A | N/A | Y |
| CompleteProfile | Y | Y | N/A | N/A | Y | Y | Y | Y | N/A | N/A | Y |
| Onboarding | Y | N/A | N/A | N/A | N/A | N/A | N/A | optional | N/A | N/A | Y |
| Home | Y | Y | Y | Y | Y | Y | Y | Y | N/A | Y | Y |
| OpportunityList | Y | Y | Y | N/A | Y | Y | N/A | Y | N/A | Y | Y |
| OpportunityDetail | Y | Y | Y | N/A | Y | Y | Y | Y | N/A | Y | Y |
| ParticipateConfirmation | Y | Y | N/A | Y | Y | Y | Y | Y | N/A | Y | Y |
| Matching | Y | Y | N/A | Y | N/A | Y | Y | Y | N/A | N/A | Y |
| MatchingResult | Y | N/A | N/A | N/A | Y | Y | N/A | Y | N/A | N/A | Y |
| Earnings | Y | Y | Y | N/A | Y | Y | N/A | Y | N/A | N/A | Y |
| SettlementDetail | Y | Y | N/A | N/A | Y | Y | N/A | Y | N/A | N/A | Y |
| Wallet | Y | Y | Y | N/A | Y | Y | Y | Y | Y | N/A | Y |
| UsdtDeposit | Y | Y | N/A | Y | Y | Y | Y | Y | N/A | N/A | Y |
| KrwDeposit | Y | Y | N/A | Y | Y | Y | Y | Y | N/A | N/A | Y |
| UsdtWithdraw | Y | Y | N/A | Y | Y | Y | Y | Y | Y | N/A | Y |
| KrwWithdraw | Y | Y | N/A | Y | Y | Y | Y | Y | Y | N/A | Y |
| TransactionHistory | Y | Y | Y | N/A | Y | Y | N/A | Y | N/A | N/A | Y |
| TransactionDetail | Y | Y | N/A | N/A | Y | Y | N/A | Y | N/A | N/A | Y |
| Referral | Y | Y | Y | Y | Y | Y | Y | Y | N/A | N/A | Y |
| Notifications | Y | Y | Y | N/A | Y | Y | N/A | Y | N/A | N/A | Y |
| AIInsight | Y | Y | Y | Y | Y | Y | Y | Y | N/A | N/A | Y |
| Profile | Y | Y | N/A | N/A | N/A | Y | N/A | Y | N/A | N/A | Y |
| Kyc | Y | Y | N/A | Y | Y | Y | Y | Y | Y | N/A | Y |
| Settings | Y | Y | N/A | N/A | Y | Y | Y | Y | N/A | N/A | Y |
| Support | Y | Y | N/A | Y | Y | Y | Y | Y | N/A | N/A | Y |
| Guides | Y | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Y |
| Legal | Y | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Y |
| PartnerTrust | Y | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

---

## Recovery notes

| state | rule |
|-------|------|
| loading | 스켈레톤/대기. 숫자 0 채움 금지 |
| empty | 권위 있는 빈 목록. 가짜 카드 금지 |
| pending | 입금/매칭/KYC. 최종 성공 연출 금지 |
| success | owner 확정 후 |
| error | 다음 행동. 코드 원문 숨김 |
| disabled | reason 필수 |
| auth | Login |
| KYC | Kyc 화면 (출금만) |
| insufficient-capital | Deposit + returnTo |
| offline/stale | STALE/UNAVAILABLE. 재시도 |
| unauthorized Home | Fact null (HomeRead) |

```text
STATE_COVERAGE
loading = Y
empty = Y
unavailable = via error/stale/empty
stale = Y
pending = Y
disabled = Y
success = Y
error = Y
partial = Home/Wallet sections independently
auth = Y
KYC = Y
insufficient capital = Y
```
