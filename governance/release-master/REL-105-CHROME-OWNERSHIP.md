# REL-105 Consumer Chrome Ownership Repair

BASE: origin/main `e8d6582f1d4a374f42dda4b948d1c2fbbef81401`
BRANCH: `rel/REL-105-110-core-opportunity-loop`
DATE: 2026-08-21

## Root chrome

- BEFORE: `RootLayout` mounted `AppShellRoot(USER_TABS)` around every consumer route
- AFTER: `RootLayout` owns `DeviceTierApply` + `ToastHost` + `PwaRuntime` + `ObsRuntime` only
- Leftover 5-tab chrome is scoped to `/wallet/**` and `/me/**` via `LegacyAppShell`

## Runtime

- Local Next: `http://127.0.0.1:3000` (`apps/web`, non-production)
- `verify:part5-shell-toast` PASS
- `verify:ia-tabs` PASS
- `verify:landing-guest-closure` PASS
- `verify:home-closure` PASS (13/13 Playwright)

## Not done

- Home Desktop/Mobile geometry not changed
- push / PR deferred to the REL-106~110 batch
