# §35 — Growth Conversion Presentation (G1~G4)

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| G1~G4 presentation | content · deposit FOMO · whale desk · ticker/counter |
| G4 Organic Hybrid (v7.22.40) | live우선 · 침묵메움 · 24h곡선 · 지터 · 실분포금액 · 마스킹 corpus · 규모레이어 |
| Default | **전부 OFF** · ON 시 audit + Growth budget/circuit |
| Admin IA | `/admin/growth?tab=content\|deposit\|whale\|ticker|…` · sidebar 13번째 **금지** |
| Modes | `ticker_mode` · `counter_mode` (off/live/demo/hybrid|blended) |
| Public identity on ticker | `displayLabel` = mask(`displayName`) only · email/legalName/userId **공개 0** · `nickname` 컬럼 **0** |
| 경계 | DayPulse/PreCTA(**§51.24**) ≠ Growth 스위치 · G4 demo를 DayPulse merge **금지** |

## Pointer

| 교차 | SSOT |
|------|------|
| G1~G4 본문 · §35.4 Organic Hybrid | Admin `ai_profit_os_04_admin_e5f6a7b8.plan.md` §35 |
| PublicTicker surface | UI `ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` §33.2a |
| Rule fanout 경계 | Engine §48.13 — ticker 투영은 분개 후 async · Rule 범위 **0** |
| Simulation gate (Growth ON 전) | → `51_PLATFORM_COMPLETENESS_AND_RULE_ENGINE.md` · Engine §51.4 |
| Lux ticker/counter 비주얼 | → `28` |
| Marketing landings/CAPI | → `27` |
| notice≠campaign | ADR-012 · Money/Admin growth tabs |
| Abuse A8/A10 | → `20` |
| CI | `verify:ticker-mode-audit` · `verify:ticker-pii-0` · `verify:ticker-organic-hybrid` · `verify:day-pulse-live-only` |

## Forbidden

- Growth OFF인데 campaign/ticker 유저 노출
- fake settlement · balance 직접 가감 · AML bypass (G3)
- G4 demo/hybrid 수치를 DayPulse·실행실·CountUp ledger에 merge
- 유저 ticker DTO에 email · legalName · raw displayName · userId
- ticker/demo 스케줄을 MATCH_SUCCESS Rule 조건에 포함
- 구현 TS 인터페이스를 본 파일에 복제
