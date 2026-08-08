# §48 — AI Execution Room And Policy

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** UI §48 (+ §48.3a/b) · Engine §48.13 (+ .1~.3)

## Owns

| 주제 | 잠금 |
|------|------|
| 유저 3면 | **진행실** · **성공 영수증** · **안전 중단** · Canon wire 100% (사진 PNG≠픽셀 SSOT · ADR-013) |
| Admin 정책면 | `/admin/execution-policy` · 실조건 ↔ 연출 **분리** |
| Primary CTA | `수익 벌기` · 배지 `직접 사지 않아요`/`직접 팔지 않아요` · `구매하기`/`판매하기` **0** |
| 결과 enum | `MATCH_SUCCESS` · `REQUEUE` · `PRICE_MOVED` · `BELOW_MIN_PROFIT` · `MATCH_TIMEOUT` · `CANCELLED_BY_USER` · `CIRCUIT_OPEN` · `SYSTEM_FAILED` |
| Soft / Hard | Soft **60s** · Hard **90s** · T0=`participateAcceptedAt` · **전 등급 동일** |
| REQUEUE | `maxRematch` ∧ `now+retryWait < hard` · 아니면 terminal |
| MATCH_TIMEOUT | Hard 도달 → safe_stop · 잔액 **불변** · credit 0 |
| 성공 UI | `settlement.completed` 후에만 · CountUp=ledger만 · 배지 `확정 지급` |
| 안전중단 UI | 잔액 불변 · `(지급 안 됨)` · 추천 카드 |
| 카피 3줄 | 보통 1분 / 다시 맞추는 중 / 시간 지나 안전정지 (`T.execution.*`) |
| 긴장감 (§48.3b) | 과정 Fact·스텝·적합도 표시 수렴만 · 가짜 대기인원·난수 성공·당첨게이지 **0** |
| 썸네일 (§48.3a) | `assetImageUrl` · 캡션 `시세 참고용` · Engine §0.0.6 pointer |
| 연출 | `presentation.duration` = UI progress only · ledger/성공 **변경 0** |
| MATCH_SUCCESS Rule | Engine §48.13 R1~R10 · 난수·`successRatePercent`·연출타이머 **금지** |
| matchStrictness | `lenient\|standard\|tight\|scarce\|custom` → 실조건 맵 · 관측 %는 읽기전용 |
| orchestrateTruth | 시세 조건 충족 정산 · 외부 실체결/입찰 **아님** (ADR-009 `orchestrate` only) |

## Pointer

| 교차 | SSOT |
|------|------|
| UI 3면·Admin·카피·긴장감 | UI `ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` §48 |
| Rule · participate · golden · strictness | Engine `ai_profit_os_02_engine_b2c3d4e5.plan.md` §48.13 |
| Index Soft/Hard 원칙 | Index §20.2 |
| 성공 후 3CTA | → `49` |
| Rule pointer (완성도) | → `51` §51.2 |
| Canon | `packages/ui/canon/surfaces/execution-*.wire.json` · `admin-execution-policy.wire.json` |
| schemas (todo) | `execution-policy.v1` · `trade-execution-state.v1` · `participate-request.v1` |
| copy | `packages/ui/copy/ko/execution.ts` |
| CI | `verify:execution-surfaces` · `verify:canon-surfaces` · `verify:match-success-rule` · `verify:match-strictness` · `verify:match-tension-surface` · `verify:no-success-rate-percent` · `verify:presentation-cannot-credit` · `verify:asset-image-surface` |

## Forbidden

- `Math.random` / `successRatePercent` / 연출 만료로 MATCH_SUCCESS·credit
- 등급별 Soft/Hard 단축 · “빠른 매칭권” · 대기특권으로 성공 구매
- 가짜 `matchWaitersCount` · G4 demo 수치를 진행실에 merge
- 유저 surface에 IT(`timeout`/`SLA`/`hard`) · `MATCH FAILURE` 영문
- `이베이 판매 완료` 등 유저가 판 것처럼 읽히는 시스템 문구
- 사진 PNG 목업 픽셀 QA · 구현 SQL/Rust/TS 본 파일 복제
