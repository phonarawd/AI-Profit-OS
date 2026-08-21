# REL-116 UsdtWithdraw (`/wallet/withdraw/usdt`)

BASE: `rel/REL-111-119-money-loop` from `origin/main` `da2cca0`
DATE: 2026-08-21
STATUS: PRODUCTION_READY_CANDIDATE (Founder visual approval pending)
FIGMA: no §2 frame — node-id not invented

## Route

- ONE ROUTE: `/wallet/withdraw/usdt`
- Presentation: existing `WithdrawLiveForm` + `wallet.module.css`

## Data truth

- Owner = `POST /api/v1/wallet/withdraw` after step-up
- Success = accepted request copy only
- 403 = `지금은 출금할 수 없어요.`
- credit / `출금 완료` = 0

## Verify

- `verify:usdt-withdraw-closure`
- `verify:withdraw-flow-wire`

## Screenshots

`governance/release-master/rel-116-usdt-withdraw/`
