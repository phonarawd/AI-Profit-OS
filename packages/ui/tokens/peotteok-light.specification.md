# Peotteok Light Token Specification (STEP3)

> **Status:** APPLIED (STEP4 Theme Cutover) · runtime SSOT = `lux-fintech.ts` + `lux-theme.css`.  
> **Order lock:** Canon Wire (`home-visual-v2`) **before** this SPEC was authored.  
> **ADR:** `packages/ui/canon/contracts/ADR-017-peotteok-home-light-theme.md`  
> **Contract:** `packages/ui/canon/contracts/peotteok-home-visual-contract.v1.md`  
> **Legacy:** `luxFintechLegacyDark` / `luxDarkArchive` in `lux-fintech.ts` · dual theme Day-1 = 0.

## Mode

| Key | Value |
|---|---|
| `theme.mode` | `peotteok-light` |
| `theme.lightToggleAllowed` | `false` (single shipping theme) |
| `theme.systemToggleAllowed` | `false` |
| Legacy | `lux-dark` archived · dual theme Day-1 **0** |

## Color

| Token | Hex | Role |
|---|---|---|
| `color.bg` | `#F6F4FC` | App background |
| `color.surface` | `#FFFFFF` | Cards / sidebar |
| `color.elevated` | `#FFFFFF` | Elevated panels |
| `color.border` | `#E4E0F0` | Hairline / dividers |
| `color.text` | `#14121F` | Primary text |
| `color.textMuted` | `#6B6680` | Secondary |
| `color.accent` | `#6B3CFF` | Purple CTA / active nav |
| `color.accentMuted` | `#8B6CFF` | Hover / soft fill |
| `color.profit` | `#12B76A` | Positive / profit |
| `color.principal` | `#6B3CFF` | Align accent (light) · was blue on dark |
| `color.danger` | `#F04438` | Errors |
| `color.warning` | `#F79009` | Warnings |
| `color.heroGradientFrom` | `#2B1B6B` | Hero panel (optional) |
| `color.heroGradientTo` | `#5B3CFF` | Hero panel (optional) |

## Spacing

| Token | Value |
|---|---|
| `spacing.xs` | `4px` |
| `spacing.sm` | `8px` |
| `spacing.md` | `16px` |
| `spacing.lg` | `24px` |
| `spacing.xl` | `32px` |
| `layout.sidebar` | `240px` |
| `layout.rightRail` | `320px`–`360px` (기본값 352px) |
| `layout.header` | `64px` |
| `layout.heroDesktop` | `480px`–`600px` (v1.3 상향) |
| `layout.heroMobile` | `320px`–`420px` |
| `layout.heroIllustrationSharePct` | `46%` (v1.3, 기존 35%) |
| `layout.contentRailMax` | `1680px` (v1.3, 기존 1440px — §29.2 breakpoints.ts SSOT와 동기화) |

## Radius

| Token | Value |
|---|---|
| `radius.sm` | `8px` |
| `radius.md` | `12px` |
| `radius.lg` | `16px` |
| `radius.xl` | `20px` |

## Typography

| Token | Value |
|---|---|
| Font | Pretendard (existing) |
| `fontScale.md` | `1.0` |
| `fontScale.lg` | `1.15` |
| `fontScale.xl` | `1.3` |
| Hero title | semibold · large · high contrast |
| Body | regular · muted secondary |

## Shadow

| Token | Value |
|---|---|
| `shadow.card` | `0 1px 2px rgba(20,18,31,0.06), 0 4px 16px rgba(107,60,255,0.06)` |
| `shadow.soft` | `0 1px 3px rgba(20,18,31,0.04)` |
| Glow / neon | **forbidden** (Lux neon aesthetic archive) |

## Motion (budget)

| Token | Value |
|---|---|
| Transitions | CSS only · ≤200–300ms typical |
| `countUp` on balance/profit | **forbidden** on Home trust surfaces |
| Particles / jackpot | **forbidden** |

## STEP4 apply checklist

- [x] Port hex into `lux-fintech.ts` (shipping = peotteok-light · lux-dark archive export)  
- [x] Mirror `lux-theme.css` / `@theme`  
- [x] `html` class → `theme-peotteok-light`  
- [x] `pnpm verify:lux-theme-sync` PASS  
- [x] Home Experience surfaces consume tokens only · no ad-hoc hex in JSX (Phases 3–7)

## Forbidden at SPEC stage

- Editing `apps/web` / `packages/ui/components`  
- Editing `lux-theme.css` before Wire+Mapping Founder ack  
- Inventing extra accent colors outside this table without Contract amend  
