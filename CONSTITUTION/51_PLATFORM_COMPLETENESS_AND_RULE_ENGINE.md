# §51 — Platform Completeness · Rule Engine · Ops

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** Index §51 · Engine §51 · Money/UI/Admin/Infra 교차  
> **영구 배제:** 규제·법무 추가 절 / Legal Sign-off / KR 규제 전용 / Whale AML EDD 전용 — 재제안 **금지**

## Owns

| 주제 | 잠금 |
|------|------|
| **§51.1 ADR** | ADR-001~016 잠금표 (Single PG · Brand 3층 · Nest Auth · Stack Lock · Toolchain · Agent Automation …) |
| **§51.2 MATCH_SUCCESS** | pointer → Engine §48.13 · `settlement_rule.rs` · golden · `verify:match-success-rule` |
| **§51.3 sellSuccessRate** | Historical display only · 유저 라벨 **「과거 유사 매칭」** · Rule 입력 **0** |
| **§51.4 Simulation** | M0.5 · Growth ON 전 PASS 필수 · `simulation-report.v1` |
| **§51.5 Referral** | owns → `51_REFERRAL_VIRAL_LADDER.md` (초대∞ · Ladder · Pool) |
| **§51.5b Notice≠Campaign** | notice=운영사실(보상0) · campaign=예산 프로모 · ADR-012 |
| **§51.6 CS** | support ticket · Admin queue · SYSTEM_FAILED→CS |
| **§51.7 Practice** | 1회 지급 · participate/withdraw **403** · 만료 |
| **§51.8 KRW copy** | payableAmount 한글 · Money/UI pointer |
| **§51.9 Auth** | Nest JWT + OAuth(Google/Kakao) + Passkey · **Supabase Auth 0** |
| **§51.9.1 Stage A/B** | 온보딩 필드 · Infra owns · UI forms pointer |
| **§51.10 Analytics** | D1/D7 cohort · first_deposit→2nd participate |
| **§51.11 Dispute** | wrong-chain · 오입금 · duplicate deposit playbook |
| **§51.13 Bootstrap** | Phase0 Nest+PG+Redis · NATS/Temporal **후순위** |
| **§51.14 USDT conf UX** | 1conf toast · 19conf credit · 중간 participate **불가** |
| **§51.15 Adapter KPI** | SKU fail rate alert · compareReady=false audit |
| **§51.16 Participate proof** | hash 저장 · success/safe_stop 대조 |
| **§51.17 SafeStop trust** | ledger 집계 유저 표면 · 낙첨 프레이밍 **0** |
| **§51.18 Capital journey** | unlock=settlement 횟수+잔액 · deposit-only paywall **금지** |
| **§51.18a Membership UX** | `/me/membership` · 100% 보장 카피 **0** |
| **§51.19 Adapter health chip** | stale CTA lock reason ko |
| **§51.20 Market briefing** | simulation 기반 · 투자권유 **금지** |
| **§51.21 DepositWhyGate** | §47 template path · first deposit |
| **§51.22 CI gates** | Index §51.22 목록 · `verify:gate` 상위 |
| **§51.23 교차표** | 주제별 SSOT 1곳 + pointer (중복0) |
| **§51.24 Loop/DayPulse/PreCTA** | live 집계 only · G4 merge **0** · Preflight 412 |

### ADR 핵심 (오차0 · 요약)

| ADR | 결정 |
|-----|------|
| ADR-001 | PostgreSQL **단일** (Supabase Seoul `mgsytcetsiecllmhcyox`) |
| ADR-002 | Platform=AI Profit OS · Consumer/AI=**퍼뜩** · Legal=§50.9 · retired=`오늘수익`·`바로번다` |
| ADR-006 | User Auth = Nest JWT only · Supabase Auth **병행 금지** |
| ADR-007 | CTA=`수익 벌기` · Soft60/Hard90 전등급 · yahoo_jp FORBIDDEN · orchestrate≠실체결 |
| ADR-009 | `executionMode=orchestrate` only |
| ADR-012 | Notice ≠ Campaign |
| ADR-013 | Canon/PUTDUK/Brand > 사진목업 |
| ADR-014~016 | Cursor=집행기 · Node22·pnpm@10.14·next@16 · hooks/Husky/CI · Docker-less 기본 |

## Pointer

| 교차 | SSOT |
|------|------|
| Index §51 ADR·CI·교차 | Index `ai_profit_os_00_index_a1b2c3d4.plan.md` §51 |
| Rule 전문 | Engine §48.13 · → `48` |
| Simulation | Engine §51.4 |
| Referral | → `51r` · Money §51.5 |
| CS/Dispute | Admin §51.6/10 · A14 |
| Auth Stage | Infra §51.9 · §51.9.1 |
| Trust surfaces UI | UI §51.14/16~21/24 |
| Personal AI | → `47` |
| Buckets | → `49` |
| Settings/DET | → `50` |
| schemas (todo) | `simulation-report.v1` · `participate-proof.v1` · `support-ticket.v1` · `referral-program.v1` |
| CI | `verify:match-success-rule` · `verify:simulation-gate` · `verify:support-surfaces` · `verify:participate-proof` · `verify:deposit-ai-template-path` · `verify:market-briefing-no-investment-advice` · `verify:day-pulse-live-only` · `verify:preflight-may-stop` · `verify:stack-lock` · `verify:gate` |

## Forbidden

- 정산 규칙을 §51에 재정의 (SSOT=§48.13)
- Referral 전문을 본 파일에 복제 (→ `51r`)
- notice에 reward · L1만 티어 가산으로 현금 파밍
- DayPulse/G4 demo 수치 merge · 가짜 presence
- 규제/법무 절 재제안 · 이중 Postgres · Supabase Auth
- 구현 코드·스키마 JSON을 본 파일에 복제
