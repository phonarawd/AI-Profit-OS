# Peotteok Light Token Specification (STEP 4.3 amend)

> ⚠️ **PARTIAL SUPERSEDE (VISUAL AUTHORITY) — 2026-08-16**
> **[`ADR-018-peotteok-visual-master-reset.md`](../canon/contracts/ADR-018-peotteok-visual-master-reset.md)** 가
> ADR-017 Home Visual 시각 권위를 종료·승계했다. 본 SPEC 중 **Home-geometry 값**(Hero 480–600px·illustration ≤46%·
> sidebar 240px·rightRail 320–360px 등, §"Hero proportions"·`layout.*`)은 **NON-AUTHORITATIVE for new visual
> implementation**이며 새 Home Visual Master에서 다시 추출해야 한다(ADR-018 §6).
> 반면 **Color 표(§Color)는 현재 런타임 미러(`lux-fintech.ts`)로 계속 작동 중**이다 — 이번 마이그레이션은 실행 코드를
> 바꾸지 않으므로 색 hex는 그대로 shipping 상태다. 새 Visual Master가 새 색을 확정하기 전까지 색 표는 "현재 shipping
> 값"으로만 참고하고, Home 화면 시각 기준(권위)으로는 인용하지 않는다. 이 결정은 당시에는 유효했지만, 새 Visual
> Master Reset(ADR-018)에 의해 시각 권위가 **superseded**되었다.

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
| Glow / neon | **uncontrolled neon aesthetic forbidden** · Approved Visual Master glow는 progressive enhancement + 예산으로만 (`peotteok-performance-target.mdc`) |

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
| Transitions | CSS ≤200–300ms typical (**기본**) · advanced motion = progressive enhancement |
| `countUp` on balance/profit | **forbidden** on Home trust surfaces (윤리) |
| Jackpot / gambling particles | **forbidden** (윤리) |
| Decorative particles / WebGL / canvas | 기술명 영구금지 아님 · **static 선호** · Master+예산+§4 8조건 |
| PO local slowness | `BLOCKED_LOCAL_*` — Visual Master 다운그레이드 사유 아님 |

## STEP 4.3 / STEP 5 notes

- STEP 4.3 = **SPEC 문서 amend only** · `lux-fintech.ts` / `lux-theme.css` 추가 편집은 STEP 5에서 필요할 때만 (무단 hex 확장 금지).
- Geometry는 PC Reference rhythm에 맞추되 Fact 값은 Token으로 “만들어내지” 않음.
- Mobile hero height 토큰은 provisional · Reference B 후 amend.

## Forbidden at SPEC / apply

- Editing `apps/web` / `packages/ui/components` during STEP 4  
- Inventing extra accent colors outside this table without Contract amend  
- Styling `ledgerTotal` as currency / USDT amount  
- Chart spark tokens implying 30d series without Fact  
