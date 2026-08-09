# §17 — Financial Ledger Standard

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Index:** `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md` §17

## Owns

| 주제 | 잠금 |
|------|------|
| Ledger truth | **USDT only** · Double-Entry Journal · `user.balance +=` **금지** |
| Idempotency | 모든 money TX = `idempotency_key` + ordered locks |
| KRW 표시 | `fx_snapshot_id` projection only · snapshot 없는 ≈원화 **금지** |
| Trace | UI 금액 → `ledger_entry_id` 또는 `opportunity_id` |
| Admin 잔액 조정 | double-entry + audit + reason · 직접 column UPDATE **0** |
| 구현 경로 | `services/api-nest` ledger/wallet/compliance · `services/wallet-service` **금지** |
| DB SoT | **단일 PostgreSQL** (ADR-001) · 이중 Postgres **금지** |

## Pointer

| 교차 | SSOT |
|------|------|
| 분개·minHolding·출금수수료 | Money `ai_profit_os_01_money_c3d4e5f6.plan.md` §11·§11.1·§11.2 |
| 버킷 분개 · principal/profit | Money §49 · → `49_PRINCIPAL_RETENTION_AND_PROFIT_WITHDRAW.md` |
| 유저별 금융 KPI 화면 | → `39_USER_FINANCIAL_LEDGER.md` · Admin §9.8.7 |
| 입금/출금 체인·원화 | → `41` · `43` |
| schemas | `wallet-buckets.v1` · `withdraw-intent.v1` · `user-financial-summary.v1` (schemas todo) |
| CI | `verify:bucket-invariant` · `verify:pg-module-scan` · `verify:withdraw-fee-ledger` |
| Agent rule | `.cursor/rules/money-ledger.mdc` |

## Forbidden

- 잔액 컬럼 직접 UPDATE
- 난수·타이머로 settlement 금액 생성
- PG사(결제대행) SDK를 ledger path에 도입
- 구현 SQL/Rust/TS를 본 파일에 복제
