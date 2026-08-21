# Home `/` — visual QA

```text
AUTHORITY = SCREENSHOT_FREEZE_LOCKED
FIGMA_46_2 = BACKUP
FIGMA_72_762 = BACKUP
CODE_MUTATION = 0
```

## Captures

- `RUNTIME_UNAVAILABLE_*` = local `/` when `home-read` throws → `HomeSessionUnavailable`. Honest fail-closed. Not the locked Home chrome.
- `RUNTIME_DESKTOP.png` / `RUNTIME_MOBILE.png` = production `HomeDesktop` / `HomeMobile` with existing `stubAuthenticatedEmptyHome`. Money is `—` / unavailable. FAKE_MONEY = 0.
- Overlay vs `governance/consumer-home-approval/baselines/approved-home-*-1440/390.png`.

## Verdict

Locked Home chrome is present on the production `/` member path. Empty feed vs freeze populated snapshot is data, not a geometry redesign. Pixel-diff alone is not FAIL.

```text
HOME_RUNTIME_PARITY = LOCKED_CHROME_PASS
MEANINGFUL_REGRESSION = NO
```
