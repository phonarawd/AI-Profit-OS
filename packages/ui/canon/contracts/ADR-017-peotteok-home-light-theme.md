# ADR-017 — Peotteok Home Light Theme + Visual Reference

| | |
|---|---|
| Status | Accepted (STEP3 · Home Visual Upgrade) |
| Date | 2026-08-10 |
| Supersedes (partial) | ADR-013 (PNG absolute ban → **Reference allowed, SSOT 아님**) · theme note (`lux-dark` only → Light 출시 SSOT) |
| Does not supersede | ADR-002 Brand 3-layer · PART9 live wire · Money ledger Truth |
| Contract | [`peotteok-home-visual-contract.v1.md`](./peotteok-home-visual-contract.v1.md) |

## Context

PART9 Live Wiring은 CLOSED다. 출시 인지(20~70대 · Capital Participant)를 위해 Home Experience를 Light+Purple로 올린다. Lux Dark는 개발자/트레이딩 느낌이 강해 타겟과 충돌한다.

## Decision

1. **출시 Theme SSOT = Light + Purple** (`peotteok-light` SPEC → STEP4에서 theme 적용).
2. **Lux Dark = archive/legacy** (Day-1 dual toggle 0).
3. **PNG = Visual Reference only** — 의도 추출·Gap/Contract에 첨부 허용.
   - PNG를 코드 SSOT·픽셀 QA·수치/카피 Truth로 쓰지 **않음**.
   - `docs/mockups/**` · `*mockup*.png` 레포 재반입 **금지**.
4. **SSOT 사다리:** Visual Contract → Canon Wire → Token SPEC → Components.
5. **PART9 보존:** `HomePageClient` 확장 · `HomePageV2` 금지 · API/SDK 재작성 금지.
6. **IA 라벨:** `홈 · 기회 · 수익 · 지갑 · 내정보` (`내거래` 폐기) — STEP4 `USER_TABS`+`verify:ia-tabs`.

## STEP3 산출물

| # | Artifact | Path |
|---|---|---|
| 1 | ADR | `packages/ui/canon/contracts/ADR-017-peotteok-home-light-theme.md` |
| 2 | Canon wire v2 | `packages/ui/canon/surfaces/home-visual-v2.wire.json` |
| 3 | Token SPEC | `packages/ui/tokens/peotteok-light.specification.md` |
| 4 | Impl mapping | `packages/ui/canon/contracts/home-visual-implementation-mapping.v1.md` |

**STEP3 금지:** React 구현 · CSS/`lux-theme` 적용 · 컴포넌트 수정 · mock data.

## Consequences

- `verify:lux-theme-sync`는 STEP4 적용 전까지 Lux Dark 미러 유지 가능.
- `verify:canon-surfaces`에 `home-visual-v2` 등재.
- `home-principal-slots`는 Money 하위 계약으로 유지(삭제 금지).
- mockup-governance: Reference 분석 허용 · PNG SSOT화는 Fail.

## STEP4 gate

Contract + Wire + Token SPEC + Mapping 없이 Home UI 코드 변경 **금지**.
