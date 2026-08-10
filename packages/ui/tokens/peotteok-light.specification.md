# Peotteok Light Token Specification (STEP 4.3 amend)

> **Status:** APPLIED runtime + **STEP 4.3 contract amend** (코드 변경 0 · SPEC 정합만).  
> **Runtime SSOT:** `lux-fintech.ts` + `lux-theme.css`.  
> **Order lock:** Canon Wire (`home-visual-v2`) ↔ Implementation Contract (STEP 3 ACK).  
> **ADR:** `packages/ui/canon/contracts/ADR-017-peotteok-home-light-theme.md`  
> **Contracts:** Visual v1.4 · Implementation Contract v1.1  
> **Legacy:** `luxFintechLegacyDark` / `luxDarkArchive` · dual theme Day-1 = 0.

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
| `color.principal` | `#6B3CFF` | Align accent (light) |
| `color.danger` | `#F04438` | Errors |
| `color.warning` | `#F79009` | Warnings |
| `color.heroGradientFrom` | `#2B1B6B` | Hero panel (optional) |
| `color.heroGradientTo` | `#5B3CFF` | Hero panel (optional) |

## Spacing

| Token | Value | Home use |
|---|---|---|
| `spacing.xs` | `4px` | chip gaps |
| `spacing.sm` | `8px` | tight stacks |
| `spacing.md` | `16px` | card padding rhythm |
| `spacing.lg` | `24px` | section gaps |
| `spacing.xl` | `32px` | hero internal blocks |
| `layout.sidebar` | `240px` | Shell geometry (PC Reference) |
| `layout.rightRail` | `320px`–`360px` (default **352px**) | Shell geometry |
| `layout.header` | `64px` | Shell |
| `layout.heroDesktop` | `480px`–`600px` | Hero proportions |
| `layout.heroMobile` | `320px`–`420px` | **provisional** · Founder 320–430 capture 기준 geometry |
| `layout.heroIllustrationSharePct` | `46%` | Hero visual share cap |
| `layout.contentRailMax` | `1680px` | Ultrawide cap · `breakpoints.CONTENT_RAIL` |

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
| Tabular | money · settle **COUNT** (`tabular-nums`) |

## Shadow

| Token | Value |
|---|---|
| `shadow.card` | `0 1px 2px rgba(20,18,31,0.06), 0 4px 16px rgba(107,60,255,0.06)` |
| `shadow.soft` | `0 1px 3px rgba(20,18,31,0.04)` |
| Glow / neon | **forbidden** |

## Local visual states (Home)

| State | Token / rule |
|---|---|
| Nav active | `color.accent` fill · high contrast |
| Profit positive | `color.profit` · no flash / pulse loop |
| Settle count | text emphasis · **not** profit-green USDT styling |
| Empty / idle header chip | `color.textMuted` |
| Session banner | surface + border · danger only for expired emphasis |
| Disabled / absent Fact slot | **hide** (do not invent mock) |

## Hero proportions (lock)

| Rule | Value |
|---|---|
| Desktop height | 480–600px |
| Illustration share | ≤ 46% |
| CTA contrast | surface-on-accent panel · highest contrast in hero |
| Motion | CSS ≤200–300ms · no parallax stack |

## Motion (budget)

| Token | Value |
|---|---|
| Transitions | CSS only · ≤200–300ms typical |
| `countUp` on balance/profit | **forbidden** on Home trust surfaces |
| Particles / jackpot | **forbidden** |

## STEP 4.3 / STEP 5 notes

- STEP 4.3 = **SPEC 문서 amend only** · `lux-fintech.ts` / `lux-theme.css` 추가 편집은 STEP 5에서 필요할 때만 (무단 hex 확장 금지).
- Geometry는 PC Reference rhythm에 맞추되 Fact 값은 Token으로 “만들어내지” 않음.
- Mobile hero height 토큰은 provisional · Reference B 후 amend.

## Forbidden at SPEC / apply

- Editing `apps/web` / `packages/ui/components` during STEP 4  
- Inventing extra accent colors outside this table without Contract amend  
- Styling `ledgerTotal` as currency / USDT amount  
- Chart spark tokens implying 30d series without Fact  
