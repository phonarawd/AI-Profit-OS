# Home Geometry Lock - Supersession Record

Status: home-geometry-lock.v1.json is SUPERSEDED by home-geometry-lock.v2.json,
effective 2026-09-05 (D1-S1C session), per an explicit Founder decision
(HOME_LOCK_DECISION=C_WITH_A_SEMANTICS, given in the D1-S1C mandate section 1.1).

## What HOME_LOCK_DECISION=C_WITH_A_SEMANTICS means

Per the mandate:

- governance/consumer-home-approval/home-approval-freeze.v1.json,
- the Founder-approved screenshot baselines it records, and
- HomeDesktopClient.tsx plus the current Spark Dash Home component family

are the current Home approval authority (this is "semantics A" - Option A from
FOUNDER-GATE-HOME_LOCK_DECISION.md: the Home restructure that replaced
HomePageClient.tsx with HomeDesktopClient.tsx was already approved).

home-geometry-lock.v1.json is treated as Option C's legacy mechanism: a
byte-hash lock written for an earlier milestone (the HomePageClient.tsx era),
now superseded by home-approval-freeze.v1.json's own, newer, still-current
authority (dated 2026-08-19, which already names HomeDesktopClient.tsx as
productionHome.client - not HomePageClient.tsx).

## What was NOT done on a guess

Per the mandate's explicit conditions, this supersession was only executed
AFTER independently verifying visual equivalence - not assumed from the
Founder decision text alone:

1. All 13 approved baseline PNGs (governance/consumer-home-approval/
   baselines/*.png) were re-hashed and re-verified byte-for-byte against
   home-approval-freeze.v1.json's own recorded sha256/bytes - 13/13 match
   exactly (see D1S1C-06-HOME-LOCK.md).
2. The current candidate (chore/d1-zero-known-defect-20260904 @ 98c3e9f3)
   was rendered fresh at every required viewport (desktop 1280/1366/1440/
   1680/1920, mobile 320/360/375/390/412/430) via a real Next.js dev server +
   Playwright chromium, and compared against the approved baselines both
   structurally (apps/web/scripts/freeze-home-qa.mjs's DOM/geometry
   measurements - byte-for-byte identical numeric output to the approved
   2026-08-19 measurement) and visually (direct side-by-side image
   inspection of all 11 viewport pairs).
3. Zero meaningful differences were found in geometry, typography, money
   hierarchy, CTA, navigation, AI visual, or first-viewport composition. Two
   apparent differences were found, investigated, root-caused, and confirmed
   to be QA-tooling artifacts unrelated to Home's own source/CSS (see
   D1S1C-06-HOME-LOCK.md for the full evidence chain):
   - Next.js 16's dev-mode indicator overlapping the mobile bottom-nav Home
     icon (fixed in the QA capture scripts, not in any Home file).
   - This session's own new screenshot script initially used the wrong
     viewport height for the 412/430 mobile sanity checks (a testing bug in
     the new script, not a Home difference).

## What changed as a result

1. `governance/responsive/home-geometry-lock.v2.json` (new) - the same 12-file
   list minus `apps/web/app/HomePageClient.tsx` (deleted by commit 848161ce;
   not required by home-approval-freeze.v1.json's productionHome pointer),
   with sha256/bytes recomputed fresh at the verified-equivalent candidate
   head 98c3e9f379f8c757a0fa6c5a2f0a2abd9ffd30d6.
2. `tooling/verify/device-tier-system.cjs` now reads home-geometry-lock.v2.json
   as the active Home geometry authority (its other, unrelated
   responsibilities - detectDeviceTier signal checks, large-screen-safety
   viewport checks, DEVICE_TIER.md content checks - are untouched).
3. `governance/responsive/home-geometry-lock.v1.json` itself is left
   byte-for-byte UNCHANGED (it declares its own `"rewrite": "FORBIDDEN"`,
   which this session honors) - it remains on disk as a historical record of
   the pre-restructure lock, no longer the active authority.

## What did NOT change

- No Home source file (HomeDesktop.tsx, HomeMobile.tsx, *.css, assets.ts,
  format.ts, map-runtime.ts, types.ts, visual-fixture.ts) was edited by this
  supersession - their CURRENT bytes were only read and hashed, never
  written to.
- No approved baseline PNG was edited, replaced, or regenerated.
- home-approval-freeze.v1.json itself was not edited.
