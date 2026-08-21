# Account Hub `/me` — visual QA

```text
AUTHORITY = FOUNDER_APPROVED_LOCKED
DESKTOP = 192:194
MOBILE = 192:434
ROUTE = /me
PRODUCTION_COMPONENT = apps/web/app/me/AccountHub.tsx
DATA_OWNER = GET /api/v1/auth/session
FAKE_MONEY = 0
FAKE_KYC = 0
FAKE_NOTIFICATION_COUNT = 0
```

## Before apply

Production `/me` was a dark card list (`ProfileClient` + `account.module.css`).
Registry `apply = false`. Status = `LOCKED_NOT_APPLIED`.

## After apply

```text
AFTER_APPLY = LOCKED_PARITY_PASS
DESKTOP_PARITY = PASS
MOBILE_PARITY = PASS
```

One route `/me`. Desktop/Mobile are responsive presentations.
Session / logout / KYC / invite / inbox owners unchanged.

## Runtime

- 1440 = `RUNTIME_DESKTOP.png`
- 390 = `RUNTIME_MOBILE.png`
- 1024 = `RUNTIME_1024.png`
- 768 = `RUNTIME_768.png`

Compare against `REFERENCE_DESKTOP.png` / `REFERENCE_MOBILE.png`.
Also: `SIDEBYSIDE_*`, `OVERLAY_*`, `DIFF_*`.
Dynamic copy (`회원님`, onboarding stage) is not a layout failure.
Wallet sidebar keeps `잔액을 확인할 수 없음` until `/me` owns wallet numbers.

Desktop sidebar `입금하기` uses `#c9184a` / 14px / weight 800 instead of Figma `#ff2d6b` / 12.5px so axe contrast stays ≥ 4.5. Role/color family unchanged. Allowlist not expanded.

## Mobile nav

```text
ACTIVE_NAV_COUNT = 1
ACTIVE_NAV_ITEM = 더보기
```
