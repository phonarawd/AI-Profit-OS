# ADR-017 — Peotteok Home Light Theme + Visual Reference

| | |
|---|---|
| Status | Accepted · **STEP 4.1 amended** (Home Visual Upgrade) |
| Date | 2026-08-10 |
| Supersedes (partial) | ADR-013 (PNG absolute ban → **Reference allowed, SSOT 아님**) · theme note (`lux-dark` only → Light 출시 SSOT) |
| Does not supersede | ADR-002 Brand 3-layer · PART9 live wire · Money ledger Truth |
| Visual Contract | [`peotteok-home-visual-contract.v1.md`](./peotteok-home-visual-contract.v1.md) (v1.4 Fact amend) |
| Implementation Contract | [`peotteok-home-visual-implementation-contract.v1.md`](./peotteok-home-visual-implementation-contract.v1.md) (**STEP 3 APPROVED / LOCKED**) |
| Conflict Resolution | [`peotteok-home-conflict-resolution.v1.md`](./peotteok-home-conflict-resolution.v1.md) (STEP 2 · Founder ACK) |
| Implementation Gate | [`peotteok-home-implementation-gate.v1.md`](./peotteok-home-implementation-gate.v1.md) (STEP 4.4) |

## Context

PART9 Live Wiring은 CLOSED다. 출시 인지(20~70대 · Capital Participant)를 위해 Home Experience를 Light+Purple로 올린다. Lux Dark는 개발자/트레이딩 느낌이 강해 타겟과 충돌한다.

Forensic → Conflict → Implementation Contract 이후, STEP 0.5에서 `ledgerTotal`이 **정산 완료 COUNT**임이 잠겼다. UI가 이를 USDT 금액으로 보이면 **semantic data-binding defect**다. STEP 4는 이 Fact 표면을 ADR/Contract/Wire/Token에 고정하고, STEP 5 코드는 그 후에만 허용한다.

## Decision

1. **출시 Theme SSOT = Light + Purple** (`peotteok-light` SPEC → runtime theme 적용 유지).
2. **Lux Dark = archive/legacy** (Day-1 dual toggle 0).
3. **PNG = Geometry Reference only** — 레이아웃·밀도·비율·시각 위계만.
   - 목업 숫자·상태·FSM·VIP·차트·도넛·Fact **복제 금지**.
   - `docs/mockups/**` · `*mockup*.png` 레포 재반입 **금지**.
4. **SSOT 사다리 (STEP 3 LOCK A):**
   ```text
   Backend Fact > Product Contract > IA > Implementation Contract > Visual Contract > PC Reference
   ```
5. **PART9 보존 (LOCK C):** `HomePageClient` 최소 binding만 · `HomePageV2` 금지 · fetch→mapper→SDK→Nest→DB→ledger→auth **재작성 금지** · 병렬 파이프라인 금지.
6. **IA 라벨:** `홈 · 기회 · 수익 · 지갑 · 내정보` (`내거래` 폐기).
7. **C01 Fact lock (STEP 4.1 핵심):**
   - `ledgerTotal` = 오늘 성공 정산 **COUNT** (settlement completed count)
   - UI에서 USDT 금액으로 재해석 **금지**
   - Mock 숫자 주입 **금지**
   - 누적 수익 USDT 슬롯 = 전용 데이터 계약 전 **미표시**
   - STEP 5 첫 슬라이스 = C01 semantic binding fix → 이후 Shell→Hero→Money→Opp→Rail
8. **Money Fact surface:** Home = `principalUsdt` + today-possible derived only · 사용가능/참여중 분할 금지 · 30일 차트/growth% 금지.
9. **RightRail Fact surface:** settle count + today possible + TOP3 only · scan/confirm/progress · 도넛 금지.
10. **Mobile:** Reference B 없음 · **provisional structural stack only** · PC 축소로 visual geometry 최종 확정 금지.

## Founder 3 LOCKS (STEP 3 ACK · 불변)

| Lock | Rule |
|---|---|
| A Data SSOT | Fact > Contract > Reference · `ledgerTotal`=COUNT |
| B Geometry Reference | 레이아웃/밀도/비율/위계만 · 숫자/상태 복제 0 |
| C PART9 Boundary | Experience/CSS/copy 중심 · orchestration 최소 · core 동결 |

## Artifacts

| # | Artifact | Path | STEP |
|---|---|---|---|
| 1 | ADR (본 문서) | `…/ADR-017-peotteok-home-light-theme.md` | 4.1 |
| 2 | Visual Contract v1.4 | `…/peotteok-home-visual-contract.v1.md` | 4.1 |
| 3 | Implementation Contract | `…/peotteok-home-visual-implementation-contract.v1.md` | 3 ACK |
| 4 | Canon wire v2 | `…/surfaces/home-visual-v2.wire.json` | 4.2 |
| 5 | Token SPEC | `…/tokens/peotteok-light.specification.md` | 4.3 |
| 6 | Impl mapping | `…/home-visual-implementation-mapping.v1.md` | 4.1/4.4 |
| 7 | Implementation Gate | `…/peotteok-home-implementation-gate.v1.md` | 4.4 |

## Consequences

- STEP 4 구간에서 **React/CSS/컴포넌트 코드 변경 금지** (문서·wire·token SPEC만).
- STEP 5는 Implementation Gate Founder 승인 후에만.
- `verify:canon-surfaces` · `home-principal-slots` 유지.
- mockup-governance: Reference 분석 허용 · PNG SSOT화 Fail.

## STEP 5 gate (코드)

Implementation Gate ✅ + C01을 **첫 구현 슬라이스**로 실행하기 전 Home UI 의미/바인딩 변경 **금지**.
