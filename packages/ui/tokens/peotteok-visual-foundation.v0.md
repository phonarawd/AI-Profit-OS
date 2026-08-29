# Peotteok Visual Foundation v0

> ⚠️ **ABSORBED BY ADR-018 · HISTORICAL PRE-ADR DRAFT — NOT ACTIVE AUTHORITY**
> 2026-08-16. 본 문서는 [`ADR-018-peotteok-visual-master-reset.md`](../canon/contracts/ADR-018-peotteok-visual-master-reset.md)
> 발효 전 작성된 **direction 초안(draft)**이다. ADR-018이 정식 Visual Authority이며, 아래 Shell/Primitives 방향
> 아이디어는 새 Visual Contract 작성 시 참고 후보일 뿐 권위가 아니다. Visual Locks(`visual-locks.v1.json`)에
> 자동 등록되지 않는다. 본 문서를 ADR-018과 동급 ACTIVE authority로 인용하지 말 것.

---

> PRE-MASTER DRAFT · 2026-08-15 · PHASE 0 Visual Reset
> Not shipping CSS. Not Visual Master. Runtime remains `pd-fintech.ts`.

## Direction

Light + Purple · Calm Premium Fintech · KRW primary · USDT secondary.

## Shell

- Desktop: Sidebar · Top Header · Main · Contextual Rail
- Mobile: Top Context · Main · Bottom Navigation

## Money

KRW-first primitive. Do not add KRW labels onto USDT-first components per screen.

## Assets

Existing logo / AI / hero = LEGACY until new Brand Kit. Do not delete while referenced.

## Primitives to build before pages

Button, Input, Card, MoneyDisplay, Status, Badge, Navigation,
Modal/Sheet, Empty, Error, Loading, Skeleton, AI surface.

MoneyDisplay: KRW primary, USDT secondary, no invented FX,
zero only with ready_data Fact.

## CSS rule

Do not stack .old-card .new-card .final-card.
Replace the token/primitive/component layers in place later.

## Shell direction (not built this turn)

Desktop: Sidebar, Top Header, Main, Contextual Rail.
Mobile: Top Context, Main, Bottom Navigation.
5-tab IA stays. Current rail is Home-only; new shell promotes it.
Asset names: brand-peotteok-mark.svg, ai-peotteok-avatar.svg.
No 10MB hero. No default WebGL globe.
