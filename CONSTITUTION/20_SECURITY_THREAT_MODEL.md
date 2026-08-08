# §20 — Security Threat Model

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **주의:** Index §20(v1 Scope Lock)과 **번호 동명이인** — 본 파일 owns = **abuse A1~** threat model only.

## Owns

| 주제 | 잠금 |
|------|------|
| Abuse catalog | **A1~A14** (+ N*/M*/B*/P*/L*/R* 계열 포인터) |
| 상태 머신 | `active → flagged → restricted → frozen → banned` |
| Day-1 방어 축 | device/rate-limit · KYC · minHolding · pricingVersion · sanctions · MFA/IP(Admin) |
| Risk surface | `/admin/risk` 동결 큐 · circuit · freeze path |

### A1~A12 (핵심 · Owns 표)

| # | 공격 | 방어 포인터 |
|---|------|-------------|
| A1 | 다계정 referral farming | §42 KYC · §51.5 clawback/cap · device graph |
| A2 | 입금 후 즉시 출금 wash | Money §11.2 `minHoldingHours` · profit-only 제외 |
| A3 | participate spam | rate limit + idempotency |
| A4 | Stale arbitrage (UI lag) | `staleAt` + `pricingVersion` |
| A5 | API scrape feed | WAF + auth + pagination + bot score |
| A6 | Fake deposit (wrong chain) | chain watcher N conf · → `43` |
| A7 | Sanctioned withdraw addr | sanctions screen pre-broadcast |
| A8 | Sybil on promo | promo pool 분리 ledger + per-user cap |
| A9 | Admin credential steal | MFA + IP allowlist + short session |
| A10 | Click farm ticker/counter | SSE rate limit · `ticker_mode` audit |
| A11 | Stale price participate | pricingVersion + `PRICE_STALE` toast |
| A12 | Admin price typo drain | simulation floor + preview Confirm |

## Pointer

| 교차 | SSOT |
|------|------|
| A1~ 전수 · 상태머신 · toast 매트릭스 | Admin `ai_profit_os_04_admin_e5f6a7b8.plan.md` §10 |
| §49 P1~P24 버킷 어뷰징 | Money §49.9 · → `49_PRINCIPAL_RETENTION_AND_PROFIT_WITHDRAW.md` |
| Viral Ladder R1~R14 | Money §51.5.2 · → `51_REFERRAL_VIRAL_LADDER.md` |
| Loop L1~L24 | UI §51.24 |
| KYC / chain / ledger | → `42` · `43` · `17` |
| Growth G1~G4 남용 | → `35` |

## Forbidden

- Index §20.1/§20.2 제품 스코프를 본 파일에 재정의
- 수동 balance 가감으로 “어뷰징 복구”
- 구현 코드·PoC exploit를 본 파일에 기술
