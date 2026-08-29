# §26 — Performance And Responsive UX

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| Fluid type | `clamp()` tokens · px-only font-size **금지** |
| Touch / 320px | touch-target · 5탭·CTA 클립/overflow **0** |
| Device tier | S/A/B · B-tier Virtual List 필수 (10k feed OOM 방지) |
| Perf budget | Lighthouse PWA · Core Web Vitals 목표 (CI) |
| reduced-motion | sfx/vibrate/heavy motion OFF |

## Pointer

| 교차 | SSOT |
|------|------|
| Responsive · fluid · virtual | UI `ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` §29~§30 계열 |
| packages | `packages/ui/responsive/*` · `packages/sdk/device-tier.ts` |
| PWA Lighthouse 게이트 | PWA §26 · `verify:lighthouse-pwa` |
| PUTDUK motion | → `28` |
| Copy/IA | → `22` · `25` |

## Forbidden

- 전역 `white-space:nowrap`로 320px 버튼 깨짐
- B-tier에서 Virtual List 생략
- 구현 CSS/TS를 본 파일에 복제
