# §37 — Wallet And User Admin Ops

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| 입금 설정 | 원화 대표계좌 · TronGrid/onchain 설정 · `deposit-config` |
| 유저 반영 | Admin 원화 계좌 → user 원화 탭 **≤300ms** SSE |
| 회원 운영 | 잔액 조정(ledger trace) · 차단 · IP · 기본 유저 ops |
| Admin routes | `/admin/wallet?tab=deposit-settings|review|…` · `/admin/users` |

## Pointer

| 교차 | SSOT |
|------|------|
| Admin §37 본문 | Admin `ai_profit_os_04_admin_e5f6a7b8.plan.md` §37 · §9.7~9.8 |
| USDT/KRW 입금 path | → `41` |
| Ledger 조정 분개 | → `17` · Money §11 |
| 유저360·금융전수 | → `39` · Admin §9.8.7~9.8.10 |
| Capability block / 쪽지 / 멤버십 | Admin §9.8.4a·8d·9·10 |
| schemas | `deposit-config.v1` · `user-capability.v1` |

## Forbidden

- Admin 잔액 컬럼 직접 UPDATE
- 유저앱에 admin route 노출
- 구현 코드를 본 파일에 복제
