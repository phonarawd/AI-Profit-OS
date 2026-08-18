# Phase0 → Phase1+ migration playbook (§51.13 · CONSTITUTION §14)

> **Phase0 bus = Nest in-process only.** NATS / Temporal / EKS are **not** Day-1 dependencies.
> Runtime alias: Phase0 = Runtime P0 · Phase1 = Runtime P1 (OpenNext Workers origin).

## Phase0 (now · $0)

| Layer | Host |
|-------|------|
| User PWA | OpenNext Worker `ai-profit-web` → `apps/web` |
| Admin Ops | OpenNext Worker `ai-profit-ops` → `apps/admin` |
| API | Nest Node (`services/api-nest`) on `API_HOST` |
| DB | Supabase PostgreSQL Seoul `ap-northeast-2` · ref `mgsytcetsiecllmhcyox` |
| Redis | Upstash (`REDIS_URL`) — Compose Redis **optional** |
| Push | Nest emit → `workers/push-dispatcher` (stub accept) |
| KYC objects | R2 bucket `kyc-docs` |
| Events | `InProcessEventBus` (`services/api-nest/src/events`) |

Origin SSOT=`infra/domain.manifest.json openNext.web|ops.workersDev`; Pages deploy/pages.dev origin 금지.

**Forbidden in Phase0 package/runtime:** `nats`, `temporal`, `eks`, Vercel host, Supabase Auth SoT.

## Event name continuity (오차0)

Phase0 emits the **same contract names** Phase1 will publish on NATS:

- `opportunity.*.updated`
- `settlement.*`
- `simulation.completed`
- `wallet.deposit.*` / `wallet.krw_deposit.*` / `wallet.sweep.*`

UI never shows bus tech names (NATS / Temporal / DLQ).

## Cutover checklist (Phase0 → Phase1)

1. Keep `InProcessEventBus` API surface (`emit` / `on`) stable.
2. Add NATS JetStream publisher behind the same interface — **swap adapter only**.
3. Deploy adapters / realtime / chain-watchers (Phase1 workers).
4. Expand `infra/workers.manifest.json` `phase1` list; leave `phase0` = push-dispatcher only until cutover.
5. Do **not** require NATS for local Money M1 E2E — in-process remains valid until Phase1 flag ON.

## Compose option

`docker-compose.dev.yml` = PG17 + Redis7 for machines with RAM. This PC (8GB) = **OFF**; use remote Supabase + Upstash (ADR-016).
