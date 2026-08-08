# §41 — Onchain USDT And KRW Deposit

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| USDT 입금 | 유저별 TRC20 · TronGrid event stream · **PG사 0** |
| KRW Day-1 | 신청 → 운영자 통장 확인 → Admin **[승인]/[거절]** |
| 승인 시 | USDT 잔액 반영 + 토스트/내역 |
| 거절 시 | 잔액 **0변화** + 거절 내역·알림 |
| CSV matcher | **Day-1 필수 아님** (L2+) |
| 네트워크 유저 카피 | 화면 `TRC20` 문자열 **0** · 한글 네트워크 라벨 |

## Pointer

| 교차 | SSOT |
|------|------|
| Money §41 본문 | Money `ai_profit_os_01_money_c3d4e5f6.plan.md` §41 |
| Confirm/sweeper/locks | → `43` |
| Admin 입금설정·검수 | → `37` · `/admin/wallet` |
| Ledger credit | → `17` (19conf only) |
| Trust guide | → `38` · UI §38.8 |
| schemas | `user-deposit-address.v1` · `krw-deposit-request.v1` · `deposit-config.v1` |
| CI | `verify:krw-admin-decide` · `verify:pg-module-scan` |

## Forbidden

- Toss/Nice/Inicis/PortOne/Stripe/PayPal 등 PG사 연동
- 1conf에서 ledger credit
- 구현 워커/SQL을 본 파일에 복제
