# §43 — Chain Settlement Hardening

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| Confirm ladder | **1conf** = `DEPOSIT_DETECTED` (UI only · ledger **0**) · **19conf** = `DEPOSIT_CONFIRMED` (Double-Entry) |
| Watcher | event_stream · **per-address high-frequency poll 금지** · rate-limit budgeter |
| Sweeper | Energy delegate + Treasury sweep · CONFIRMED 전 sweep **금지** |
| Participate | `minProfitUsdt` (+ `pricingVersion`) 필수 |
| Money TX | `idempotency_key` + ordered locks |
| Auth step-up | WebAuthn UX → PWA · **정책/Email OTP/PIN/recovery = 본 절 Owns** · non-WebAuthn fallback 필수 |
| Paid RPC | upgrade · Day-1 dependency **아님** |

### 잠금 조항 (삭제 금지)

1. Per-address high-frequency polling **금지**
2. Ledger credit before N confirmations **금지**
3. Sweep before CONFIRMED **금지**
4. Participate must accept `minProfitUsdt`
5. All money TX require `idempotency_key` + ordered locks
6. Withdraw step-up must have non-WebAuthn fallback
7. Paid RPC는 upgrade이지 dependency 아님

## Pointer

| 교차 | SSOT |
|------|------|
| Money §43 본문 · events | Money `ai_profit_os_01_money_c3d4e5f6.plan.md` §43 |
| USDT/KRW 입금 제품 path | → `41` |
| Ledger standard | → `17` |
| Event names | → `14` |
| WebAuthn UX | → `23` §23.6 |
| Admin PIN wipe UI | Admin §9.8.10 · 정책은 본 절 |
| workers | `workers/chain-watchers/` · `workers/chain-sweeper/` |
| CI | `verify:webauthn-fallback-pointer` · chain/settlement gates |

## Forbidden

- 구현 Rust/TS/SQL을 본 파일에 복제
- SMS OTP Day-1 필수화
