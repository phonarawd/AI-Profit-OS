# PUTDUK Mining Deployment Boundary

- Decision date: 2026-09-21
- Status: LOCKED
- Scope: PUTDUK MINE OS release program

## 1. Production deployment boundary

The production path is fixed as:

`Cloudflare -> dedicated PUTDUK mining Render backend -> Supabase`

Responsibilities:

- Cloudflare
  - production DNS and custom domains
  - User Web deployment
  - Admin/Ops deployment
  - SSL / proxy / edge protection in front of public origins
- Render
  - dedicated PUTDUK mining Backend API runtime
  - NestJS API
  - Rust `mining_profit_cli` runtime packaged with the backend deployment
  - server-side wallet / ledger / mining settlement execution
  - scheduled mining settlement execution when enabled by the release phase
- Supabase
  - PostgreSQL data authority
  - existing ledger / wallet authority
  - mining schema and settlement records

## 2. Legacy Render isolation

Existing Render services created for the former reseller / eBay matching system are legacy infrastructure.

Rules:

- Do not reuse a legacy reseller/eBay Render service for PUTDUK mining production.
- Do not copy legacy eBay/product API environment variables into the mining backend.
- Do not modify or delete the legacy services during mining phases unless a later explicit cleanup phase authorizes it.
- The mining backend must be a new dedicated service with its own environment boundary.

Recommended production naming:

- `putduk-mine-api-prod`
- `putduk-mine-api-staging`

Names are operational labels, not API contract values.

## 3. Public routing

User Web and Admin/Ops must call the public API hostname controlled through Cloudflare DNS/proxy.

The public API hostname must resolve/proxy to the dedicated Render mining backend. Clients must not depend on a Render-generated hostname as their long-term API contract.

## 4. Backend packaging rule

The backend deployment artifact must contain both:

- compiled NestJS API
- release-built Rust `mining_profit_cli`

`MINING_PROFIT_ENGINE_BIN` must point to the packaged release binary. A deployment where NestJS is present but the Rust calculator binary is missing is a failed deployment.

The Rust calculator remains the single financial calculation authority for mining profit. TypeScript must not duplicate the mining profit formula.

## 5. Financial path

All financial mutations continue through the existing backend ledger path:

`Web/Ops -> Nest domain service -> LedgerPostingService -> PostgreSQL transaction`

Forbidden:

- direct financial writes from User Web to Supabase
- direct financial writes from Admin/Ops to Supabase
- a separate mining balance system
- bypassing ledger idempotency / outbox / double-entry posting

## 6. Scheduler rule

Daily mining settlement may be triggered by a dedicated server-side scheduler/cron, but financial safety must never depend on scheduler single-run behavior alone.

Duplicate-payment protection remains enforced by application and database idempotency constraints, including settlement identity, accrual assignment uniqueness and ledger journal idempotency.

## 7. Explicit exclusions

- Vercel is not part of the PUTDUK mining deployment path.
- Cloudflare Workers are not the mining financial backend runtime while the backend depends on the native Rust CLI process model.
- Existing reseller/eBay Render services are not the mining backend.

## 8. Change control

Changing this deployment boundary requires a new explicit administrator/founder instruction. Individual implementation phases must not silently replace Render with another backend runtime or reuse a legacy Render service.
