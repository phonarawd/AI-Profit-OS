# GREENFIELD ENGINE PRESERVATION MANIFEST

Reset safety lock. Not a UI document.
Recorded 2026-08-18. Source HEAD `2d4a720d931d5f9523f9ffd6d63c6b7b2d082bcb` plus dirty Business files kept in Active.

## Runtime / Infrastructure

| path | entry | callers | runtime use | why preserved |
|---|---|---|---|---|
| `services/api-nest/src/main.ts` | Nest bootstrap | process | HTTP API | server runtime |
| `services/api-nest/src/app.module.ts` | AppModule | main | module graph | wallet/auth/fx wiring |
| `infra/**` | wrangler / domain.manifest | deploy | OpenNext Workers | host lock |
| `workers/**` | adapters / proxies | Nest / CF | FX, markets, web-proxy | engine inputs |
| `apps/web/next.config.ts` | rewrites | Next | `/api/v1` proxy, `/ads`→`/l` | API contract |
| `apps/web/open-next.config.ts` | OpenNext | CF deploy | worker origin | infra |

## Authentication / Session

| path | entry | callers | runtime use | why preserved |
|---|---|---|---|---|
| `services/api-nest/src/auth/**` | AuthModule, jwt-auth.guard | controllers | JWT + session | Auth Truth |
| `apps/web/lib/session-cookie.ts` | `USER_SESSION_COOKIE_NAME=aipo_session` | pages (presence only) | cookie name parity | session presence, not login UI |

## API

Nest controllers/routes under `services/api-nest/src/**` including wallet, opportunities, current-fx, home-read, ledger, risk, compliance, trades, growth, AI coach. Callers: SDK + rewrite `/api/v1/:path*`.

## Database

`supabase/migrations/**` — Postgres SoT. Do not delete.

## Money / Ledger / Wallet / Deposit / Withdraw

| path | why |
|---|---|
| `services/api-nest/src/ledger/**` | double-entry, buckets |
| `services/api-nest/src/wallet/**` | buckets, KRW deposit, withdraw, dirty current-tree changes |
| `packages/sdk/src/wallet/**` | `fetchWalletBuckets`, withdraw, KRW deposit client |
| `schemas/krw-deposit-request.v1.json` | request contract |

## FX

| path | why |
|---|---|
| `services/api-nest/src/current-fx/**` | server approx, no client multiply |
| `services/api-nest/src/opportunities/fx-snapshot.service.ts` | snapshot fact |
| `packages/sdk/src/current-fx/**` | dirty client; `asNullableDecimal` already validates |

## Opportunity / Quote / Eligibility / Participate / Matching / Settlement

| path | why |
|---|---|
| `services/api-nest/src/opportunities/**` | facts, participate |
| `services/api-nest/src/trades/**` | execution / settlement loop |
| `packages/sdk/src/user-feed/**` | feed/detail/day-pulse client |
| `packages/sdk/src/home-read-model/**` | home-read DTO |
| `packages/sdk/src/home-money-read/**` | home-money-read DTO |
| `services/engine-rust/**` | matching / engine |

## Risk / Compliance / KYC / Idempotency

`services/api-nest/src/risk/**`, `compliance/**`, wallet KYC guards, ledger idempotency keys.

## SDK

`packages/sdk/**` including dirty `current-fx` and wallet. `device-tier.ts` is runtime policy, not Consumer visual.

## Required Environment Configuration

Root `.env` is backup-only. New git must not commit it. Runtime still needs `API_HOST` and existing Nest/Supabase secrets from operator env.

## Required Rewrites / Proxy

`apps/web/next.config.ts`: `/api/v1/:path*` → `API_HOST`; `/ads` → `/l/meta`; `/ads/:variant` → `/l/:variant`.

## Files That Must Survive

- `services/api-nest/**`
- `services/engine-rust/**`
- `supabase/migrations/**`
- `packages/sdk/**`
- `packages/schemas/**`
- `workers/**`
- `infra/**`
- `apps/web/lib/session-cookie.ts`
- `apps/web/next.config.ts` rewrite block
- `apps/admin/**` (sources not rewritten this reset)
- Admin `@aipo/ui` keep-set (see `docs/GREENFIELD_ADMIN_UI_IMPORT_GRAPH.md`)

## Mixed UI / Business Files

| file | extract | visual fate |
|---|---|---|
| `packages/ui/components/home-clean-v1/home-clean-money.ts` | none — SDK `current-fx` already validates decimals | DELETE |
| `apps/web/lib/opportunity-card-map.ts` | none — facts live in SDK `user-feed` | DELETE |
| `apps/web/app/home-clean/mapHomeReadModelToCleanViewModel.ts` | none — DTO in SDK | DELETE |
| `apps/web` wallet/auth pages | none this phase — no new form/UX | skeleton, no API UI |
| `packages/ui/copy/ko/principal-profit.ts` | keep `walletBuckets` (Money labels) | keep file for Admin |
| `packages/ui/copy/ko/trust.ts` | keep `disclaimer` only for Admin TaxDisclaimerBlock | slim |

## Unknowns

- `packages/ui/canon/surfaces/admin-*.wire.json` — Admin functional spec, not Consumer visual. KEPT.
- `apps/web/public/kyb/**` — legal license artifact. KEPT.
- `_tmp_mockup_preview` was absent from source at execution time.
