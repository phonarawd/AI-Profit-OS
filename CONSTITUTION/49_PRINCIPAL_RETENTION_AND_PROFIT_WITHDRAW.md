# §49 — Principal Retention And Profit Withdraw

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** Money §49 (+ §49.2a · §49.9)

## Owns

| 주제 | 잠금 |
|------|------|
| 4버킷 | `principal` · `profit` · `locked` · `practice` |
| 불변식 | `principal+profit+locked+practice = user_usdt_liability` |
| 출금 기본 | `mode=profit` (수익만) · 진입 `?mode=profit` |
| 원금 출금 | **언제든 도달 가능** · 숨김/고객센터-only **금지** · PrincipalConfirmSheet 필수 |
| combined | principal 분도 확인 토큰 필수 |
| 참여 재원 | `requiredCapital` = **principal만** · profit 참여는 merge 후만 |
| settlement | 유저 마진 → **profit만 +** · `requiredCapital` → principal 복귀 · 플랫폼 마진≠유저 profit |
| practice | withdraw / participate / merge→profit **403** · 현금화 0 |
| merge | profit→principal atomic · idempotency |
| 성공 영수증 3CTA | `수익만 출금` · `원금에 합치기` · `나중에` |
| §49.2a | `principalUsdt` Fact · deposit `?suggest=&oppId=` · 강제 입금 금지 |
| 출금 가드 순서 | withdrawApplyBlocked → KYC → WebAuthn/OTP/PIN → circuit → bucket FOR UPDATE → mode 상한 → confirmToken |
| 어뷰징 | P1~P24 · E1~E12 (Money §49.9) · practice→profit·presentation=credit·시트우회 **0** |

## Pointer

| 교차 | SSOT |
|------|------|
| Money §49 본문 · API · 상태머신 | Money `ai_profit_os_01_money_c3d4e5f6.plan.md` §49 |
| Ledger double-entry | → `17` |
| KYC · chain auth | → `42` · `43` |
| minHolding / 출금수수료 | Money §11.2 |
| Admin 버킷·순유입 | → `39` · Admin §9.8.7 |
| 성공 UI 연동 | → `48` |
| 설정·본인진행 카피 | → `50` (§50.1b) |
| 퍼뜩 P Fact | → `47` |
| schemas (todo) | `wallet-buckets.v1` · `withdraw-page.v1` → `withdraw-intent.v1` |
| copy | `packages/ui/copy/ko/principal-profit.ts` |
| CI | `verify:bucket-invariant` · `verify:withdraw-mode-default` · `verify:principal-withdraw-reachable` · `verify:practice-non-withdrawable` · `verify:settlement-profit-only` · `verify:balance-aware-feed` · `verify:presentation-cannot-credit` |

## Forbidden

- 원금 출금 메뉴 숨김·불가·고객센터-only
- practice / G4 demo / 연출 완료를 profit으로 승격
- settlement가 유저 수익을 principal에 기입
- 출금 기본을 principal로 열기
- 잔액 컬럼 직접 UPDATE · 클라 금액 trust
- 구현 SQL/서비스 코드를 본 파일에 복제
