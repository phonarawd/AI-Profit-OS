# Progressive Performance Escalation (PPE)

SSOT: `ppe-ladder.ts` · UI audit §31–§36 / §47 · device-tier = `@aipo/sdk/device-tier`

| Level | Default | Use |
|------|---------|-----|
| 0 HTML/CSS/SVG | yes (~95%) | nav, forms, a11y |
| 1 React optimize | measured | KYC / Admin heavy |
| 2 Virtualization | list thresholds | feed >20 · ticker >50 |
| 3 Worker | Long Task >50ms | none Day-1 |
| 4 Canvas | dense viz + a11y fallback | none Day-1 |
| 5 WebGL/WebGPU | product + measured | none scoped |

Tier S/A/B changes **rendering path only** — feature parity required.
