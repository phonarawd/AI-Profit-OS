# Progressive Performance Escalation (PPE)

SSOT: `ppe-ladder.ts` · UI audit §31–§36 / §47 · device-tier = `@aipo/sdk/device-tier`  
**PO LOCK:** `.cursor/rules/peotteok-performance-target.mdc`

## Governing (요약)

| 잠금 | 의미 |
|------|------|
| Developer machine ≠ user baseline | PO 저사양 PC로 제품 시각/성능을 맞추지 않음 |
| Target range | **GLOBAL AVERAGE → HIGH-END** |
| Goal | **PREMIUM VISUAL QUALITY + PRODUCTION PERFORMANCE** |
| Prefer | static optimized artwork + 가벼운 구현 (**엔지니어링** 선호) |
| Not auto-ban | WebGL · runtime 3D · canvas · blur · glow · advanced motion (기술명만으로 영구 금지 ❌) |
| Hard ethics ban | money count-up · gambling/jackpot dopamine · fake profit claims |
| Conflict | `VISUAL_PERFORMANCE_CONFLICT` → PO 결정 · 일방 Visual Master 다운그레이드 금지 |
| Local fail | `BLOCKED_LOCAL_ENVIRONMENT` / `BLOCKED_LOCAL_OOM` ≠ 제품 결함 자동승격 |

Canon wire = Functional SSOT · Approved Visual Master = Visual SSOT.  
성능 때문에 API/SDK/DB/settlement/AI 권위를 재작성하지 않는다.

| Level | Default | Use |
|------|---------|-----|
| 0 HTML/CSS/SVG | yes (~95%) | nav, forms, a11y · **preferred baseline** |
| 1 React optimize | measured | KYC / Admin heavy |
| 2 Virtualization | list thresholds | feed >20 · ticker >50 |
| 3 Worker | Long Task >50ms | measured only |
| 4 Canvas | dense viz + a11y fallback | Visual Master + budget 충족 시 |
| 5 WebGL/WebGPU | product + measured | Visual Master 실질 필요 + §4 8조건 ALL |

Tier S/A/B changes **rendering path only** — feature parity required.  
High-end may get non-essential progressive enhancement; core money/nav/AI truth must not diverge.
