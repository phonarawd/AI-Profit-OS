# Visual Regression Harness (`verify:responsive`)

Playwright multi-viewport harness for Canon **structure**, not raw pixels (ADR-013 · audit §45).

PART8c also locks: `fluid-type` · `touch-target` · `device-tier` S/A/B · TanStack `VirtualList` / `VirtualOpportunityList` / `VirtualTicker` · `DeviceTierApply`.

## Locked viewports

`390 / 430 / 768 / 1024 / 1366 / 1440 / 1920 / 2560 / 3440 / 3840`

SSOT: `viewports.json` ↔ `packages/ui/tokens/breakpoints.ts#RESPONSIVE_HARNESS_VIEWPORTS`

## Diff mode

| Allowed | Forbidden |
|---------|-----------|
| Canon `blocks[].id` order | `toHaveScreenshot` / pixelmatch |
| `data-canon` + `data-canon-block` DOM order | Photo/mockup pixel QA |
| Content-rail max-width at ≥1920 | Full-page screenshot baselines |

## Markers (components)

```html
<main data-canon="landing-3s">
  <div data-canon-block="brand">…</div>
  <h1 data-canon-block="headline">…</h1>
</main>
```

Legacy alias: `data-landing-block` (Landing3s) is accepted by the extractor.

## Run

```bash
# Local / CI thin gate — Node structure only (no browser, 8GB-safe)
pnpm verify:responsive

# Optional Playwright browser pass (CI or when browsers installed)
RESPONSIVE_PW=1 pnpm verify:responsive
```

Playwright config: `tooling/verify/responsive/playwright.config.cjs`
