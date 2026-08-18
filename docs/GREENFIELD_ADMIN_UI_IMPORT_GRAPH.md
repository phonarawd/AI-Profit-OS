# GREENFIELD ADMIN UI IMPORT GRAPH

HARD GATE lock. Recorded 2026-08-18 before any `packages/ui` deletion.

`ADMIN_UI_GRAPH_LOCKED = YES`

## Direct imports (`apps/admin/**`)

| admin file | specifier | resolved file |
|---|---|---|
| `app/globals.css` | `@aipo/ui/tokens/lux-theme.css` | `packages/ui/tokens/lux-theme.css` |
| 9 admin pages | `@aipo/ui/components/SearchParamsBoundary` | `packages/ui/components/SearchParamsBoundary.tsx` |
| `app/admin/growth/page.tsx` | `@aipo/ui/components/trust` | barrel `packages/ui/components/trust/index.ts` → used symbol `TaxDisclaimerBlock` |
| `app/admin/growth/page.tsx` | `@aipo/ui/copy/ko` | `T.admin` |
| `app/admin/users/[id]/finance/page.tsx` | `@aipo/ui/components/wallet/BucketBreakdown` | `packages/ui/components/wallet/BucketBreakdown.tsx` |
| `app/admin/users/[id]/finance/page.tsx` | `@aipo/ui/copy/ko` | `T.walletBuckets` |

No other `@aipo/ui` specifiers in `apps/admin`.

## Indirect / transitive

### SearchParamsBoundary.tsx

- `react` (external)
- `../copy/ko` → `T.common.loading`

### TaxDisclaimerBlock.tsx

- `../../copy/ko` → `T.trust.disclaimer`

### BucketBreakdown.tsx

- `../../copy/ko` → `T.walletBuckets`

### trust/index.ts barrel (current)

Re-exports every trust component. Admin only instantiates `TaxDisclaimerBlock`.
If the barrel stays byte-identical, **all** trust modules become typecheck deps.
**Decision:** slim barrel to `TaxDisclaimerBlock` only. Admin import path `@aipo/ui/components/trust` unchanged. Other trust files are Consumer visual → DELETE.

### copy/ko/index.ts barrel (current)

Re-exports every copy module. Admin + keep-set need: `admin`, `common`, `trust.disclaimer`, `walletBuckets`.
**Decision:** slim barrel. Keep `admin.ts`, `common.ts`, slim `trust.ts` to `disclaimer`, keep `principal-profit.ts` (`walletBuckets` is Money label).

### lux-theme.css

`@import` chain (Admin visual compat, not Consumer Truth):

- `./component.css`
- `./motion.css`
- `../responsive/fluid-type.css`
- `../responsive/touch-target.css`
- `../responsive/container.css`
- Pretendard CDN (external)
- `tailwindcss`
- `@source "../components"` — scan leftover; empty after delete is OK

Admin `layout.tsx` uses `lux-*` classes. `lux-theme.css` bytes kept.

## ADMIN_UI_KEEP_SET

1. `packages/ui/components/SearchParamsBoundary.tsx` (bytes kept)
2. `packages/ui/components/wallet/BucketBreakdown.tsx` (bytes kept)
3. `packages/ui/components/trust/TaxDisclaimerBlock.tsx` (bytes kept)
4. `packages/ui/components/trust/index.ts` (slim barrel)
5. `packages/ui/copy/ko/admin.ts`
6. `packages/ui/copy/ko/common.ts`
7. `packages/ui/copy/ko/trust.ts` (slim to disclaimer)
8. `packages/ui/copy/ko/principal-profit.ts`
9. `packages/ui/copy/ko/index.ts` (slim barrel)
10. `packages/ui/tokens/lux-theme.css`
11. `packages/ui/tokens/component.css`
12. `packages/ui/tokens/motion.css`
13. `packages/ui/responsive/fluid-type.css`
14. `packages/ui/responsive/touch-target.css`
15. `packages/ui/responsive/container.css`
16. `packages/ui/brand/brand.manifest.json` (name-only)
17. `packages/ui/package.json` (exports slimmed)
18. `packages/ui/tsconfig.json` (new, typecheck only)
19. `packages/ui/components/product/image-hosts.ts` (Admin `next.config.ts` indirect)
20. `packages/ui/copy/ko/practice.ts` (`T.practice.adminNote` on Admin finance)
21. `packages/ui/tokens/lux-fintech.ts` (stack-lock token module · Admin-compat, not Consumer visual authority)

## Not keep

Any other `packages/ui` file is Consumer visual unless listed UNKNOWN in the classification doc.
