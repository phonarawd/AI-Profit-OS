# REL-105 FINAL GUEST VISUAL CLOSURE

BASE: origin/main `e8d6582f1d4a374f42dda4b948d1c2fbbef81401`
BRANCH: `rel/REL-105-110-core-opportunity-loop`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)

## Scope

Guest `/` presentation only. `/ads` Landing3s not redesigned. Home visual files restored to HEAD and left unchanged.

## Direction

Spark Dash DNA from locked Home freeze + committed assets:

- navy `#07101d`
- pink `#ff2d6b`
- wordmark + `brand-spark.svg`
- neon bolt `hero-lightning-neon.svg`
- existing landing copy (`T.landing.*`)

Figma registry `governance/figma/PUTDUK_FIGMA_PROJECT_REGISTRY.json`:

- `approvedAuthority = 0`
- Home `46:2` / `72:762` = BACKUP, not applied
- GuestFirstVisit has no Approved Visual Master

## Runtime

Local Next `http://127.0.0.1:3000` (`apps/web`, non-production)

`verify:home-closure` PASS (13/13 Playwright)
`verify:landing-guest-closure` PASS

## Screenshots

`governance/release-master/rel-105-guest-visual/`

- `guest-desktop-1440.png`
- `guest-desktop-1920.png`
- `guest-mobile-390.png`
- `guest-tablet-768.png`
- `guest-tablet-1024.png`
- `member-home-1440.png`

## Auth gate

- 401 / `unauthorized` → `GuestFirstVisit`
- thrown network/5xx → `HomeSessionUnavailable` (not confirmed guest)

## Not done

- Founder visual approval
- push / PR deferred to the REL-106~110 batch
