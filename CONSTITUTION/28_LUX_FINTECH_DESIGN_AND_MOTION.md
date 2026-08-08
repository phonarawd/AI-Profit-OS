# §28 — Lux Fintech Design And Motion

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| Palette SSOT | `packages/ui/tokens/lux-fintech.ts` · Lux Dark 고정 |
| Motion | CountUp · MotionCTA · Receipt · reduced-motion 존중 |
| G4 visual primitives | Ticker / Counter **컴포넌트·토큰** (모드/시드 Owns → `35`) |
| User App bg | Lux Dark · white background default **금지** |
| Brand 시각 | Brand Kit ready assets only · 사진 목업 **0** |

## Pointer

| 교차 | SSOT |
|------|------|
| Lux 본문 · 컴포넌트 | UI `ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` · `packages/ui/components/lux/` |
| tokens | `packages/ui/tokens/lux-fintech.ts` |
| 5탭·레이아웃 | → `22` |
| G1~G4 Admin 모드 | → `35` |
| PWA theme_color | → `23` |
| Mockup governance | ADR-013 · `verify:mockup-governance` |

## Forbidden

- `#1A56FF` 등 Lux 외 하드코딩 테마
- 카지노 사운드·게임형 위장 모션
- 토큰 값을 본 파일에 이중 정의
