# §14 — Event Contracts

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Index:** `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md` §17

## Owns

| 주제 | 잠금 |
|------|------|
| Event bus Phase0 | **in-process** only · NATS/Temporal 프로세스 **0** |
| Event bus Phase1+ | NATS JetStream · 토픽/스키마명 불변 · Phase0 동등 이벤트와 1:1 |
| Event name SSOT | `opportunity.*.updated` · `settlement.*` · `simulation.completed` · `wallet.deposit.*` · `wallet.krw_deposit.*` · `wallet.sweep.*` 등 계약 이름 |
| UI 노출 | 버스 기술명(`NATS`/`Temporal`/`DLQ`) **화면 0** |

## Pointer

| 교차 | SSOT |
|------|------|
| Engine Phase0 버스 · 토픽 해석 | Engine `ai_profit_os_02_engine_b2c3d4e5.plan.md` §2.0 |
| Money wallet/chain events | Money `ai_profit_os_01_money_c3d4e5f6.plan.md` §41·§43.7 |
| Push fanout bus | PWA `ai_profit_os_05_pwa_f6a7b8c9.plan.md` §23.5 · Phase0 in-process |
| Hosting / Compose / Phase table | Infra `ai_profit_os_06_infra_a7b8c9d0.plan.md` · Index Phase Activation |
| 원장 분개 결과 | → `17_FINANCIAL_LEDGER_STANDARD.md` |
| Chain confirm 정책 | → `43_CHAIN_SETTLEMENT_HARDENING.md` |

## Forbidden

- Phase0 필수 스택에 NATS/Temporal 기동 조건화
- 이벤트명 drift · 동일 의미 이중 토픽
- 구현 코드·워커 본문을 본 파일에 복제
