# Token × Spark Dash collision plan (REL-009)

`APPLY_NOW = 0`. This is an inventory + safe-migration plan only.
Do not rewrite Home CSS. Do not alias Spark Dash tokens onto PUTDUK tokens.

## Families

| family | owner path | prefix | role |
|---|---|---|---|
| PUTDUK / peotteok-light | `packages/ui/tokens/putduk-theme.css` · `component.css` · `motion.css` | `--color-pd-*` · `--space-pd-*` · `--layout-pd-*` | shared design-system tokens (Admin + generic UI) |
| Spark Dash Home | `apps/web/components/spark-dash-home/spark-dash-home.css` | `--sd-*` | **LOCKED Home Desktop** local tokens |
| Spark Dash Mobile | `apps/web/components/spark-dash-home/spark-dash-mobile.css` | `--sdm-*` | **LOCKED Home Mobile** local tokens |

## Observed collisions (semantic, not same-name)

| topic | PUTDUK | Spark Dash | risk if merged |
|---|---|---|---|
| canvas | `--color-pd-bg` `#f6f4fc` light | `--sd-navy` `#07101d` / `--sdm-navy` `#08111f` | Home would lose freeze look |
| accent | `--color-pd-accent` `#6b3cff` | `--sd-pink` `#ff2d6b` / `--sdm-pink` `#ff2e63` | brand/CTA hue drift |
| sidebar width | `--layout-pd-sidebar` `240px` | `--sd-sidebar` `220px` | Home geometry break |
| header | `--layout-pd-header` `64px` | Home header is local CSS | do not bind other pages to Home header |
| KRW secondary | PUTDUK text-muted purple-gray | `--sd-krw-dark` / `--sd-krw-light` | money hierarchy must stay USDT primary |

Same-name token overlap: **0**. Prefixes already isolate (`--pd-*` vs `--sd-*` vs `--sdm-*`).

## Safe migration (later REL, not this one)

1. Keep Home `--sd-*` / `--sdm-*` private. Never import them into `packages/ui/tokens`.
2. Non-Home consumer pages may copy Spark Dash *language* (navy/pink/stage) as **new** `--putduk-*` tokens after Founder-approved Figma, without reading Home CSS as SSOT.
3. Do not `@import` Home CSS from `/profits` or `/trades` to “reuse geometry”.
4. PUTDUK tokens stay for Admin and generic primitives until a dedicated token REL.
5. Code Connect remains candidate-only until a frame is Founder-approved.

`HOME_RETROACTIVE_VISUAL_REDESIGN = NO`
