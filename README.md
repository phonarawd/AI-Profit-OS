# AI Profit OS (퍼뜩 백엔드)

Nest API · Rust engine · PostgreSQL(Supabase Seoul) · Redis(Upstash) · Cloudflare Workers(API/dispatcher).
고객 웹은 별도 레포 `phonarawd/putduk-web`이다. 이 트리에 `apps/web` · `apps/admin` · `packages/ui`를 두지 않는다.

## 잠금

- Node 22 · pnpm 10.14 · Nest · Rust · Cloudflare only · Vercel 금지
- Auth = Nest JWT only (Supabase Auth 금지)
- Phase0 in-process · PG사(결제대행) 0
- DB SoT = `mgsytcetsiecllmhcyox` (서울)

## 문서

- 에이전트: `AGENTS.md` · 툴체인: `TOOLCHAIN.md`
- API 계약: `quality/backend-api-contract-map.md` · `schemas/`
- 원장/보안/복구: `CONSTITUTION/17_FINANCIAL_LEDGER_STANDARD.md` · `governance/release-master/SECURITY_BASELINE.md` · `governance/recovery/`
- 어드민은 서버 API·RBAC·감사만: `quality/admin-handoff/README.md`
- UI 어서션 인계: `quality/putduk-web-ui-assertions-handoff.md`

## 패치

이 레포는 백엔드다. 고객 웹은 `phonarawd/putduk-web`이다.
패치는 `main`에서 브랜치 → `pnpm verify:gate:fast` → `backend-ci` → PR 머지.

## 검증

```powershell
pnpm verify:gate:fast
pnpm verify:backend
pnpm verify:backend-boundary
```
