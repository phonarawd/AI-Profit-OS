# AI Profit OS — Toolchain Lock (ADR-015 · 오류0)

작업(기능 구현) **전에** 이 문서의 PASS가 필수다.
이 레포는 **백엔드 전용**. 고객 웹 툴체인(Next/Tailwind)은 putduk-web.

## 잠금 조합 (2026-08 · 이 플랫폼 기준)

| 층 | SSOT | 금지 |
|----|------|------|
| Runtime | **Node.js 22.14+** (engines `<23`) | Node 18/20로 다운 |
| Package manager | **pnpm@10.14.0** (`packageManager` 필드) | npm/yarn/**bun install SSOT** |
| API | NestJS (Node) | Supabase Auth · Next/React를 이 레포에 재도입 |
| Engine | Rust (`rust-toolchain.toml`) | JS 원장 핵심 |
| DB | PostgreSQL **17** (Compose) / managed 단일 | 두 번째 Postgres · **PG사(결제대행)** |
| Cache | Redis 7 | — |
| Edge | Cloudflare Workers (API stub · push-dispatcher · R2) | Pages deploy/pages.dev origin · Vercel 병행 · 이 레포 OpenNext web/ops |
| Events Runtime P0 | Nest in-process | NATS/Temporal 필수화 |
| Monorepo | pnpm workspaces (backend packages only) | bun/npm workspaces SSOT |

## 1회 설치 (Windows)

```powershell
# Node 22 (fnm/nvm-windows 권장) — 이미 v22.14.0 이면 OK
node -v

# pnpm SSOT (corepack — npm 글로벌 pnpm과 혼선 시 PATH에서 npm\pnpm 제거)
corepack enable
corepack prepare pnpm@10.14.0 --activate
# 새 터미널에서:
pnpm -v   # 10.14.x

# Rust (engine-rust)
winget install Rustlang.Rustup
# 또는: https://rustup.rs
# 설치 후 새 터미널:
rustup show
cargo -V

# Docker Desktop — 옵션만 (8GB Runtime P0 기본 OFF · 원격 Supabase+Upstash 권장)
# docker -v
# pnpm docker:up   # RAM 여유 시에만 · ADR-016 Docker-less 기본

# Cloudflare CLI (repo-local 권장)
pnpm add -Dw wrangler
pnpm exec wrangler -v
```

## Supabase (이 레포 전용 · Docker-less 기본)

- Project ref: `mgsytcetsiecllmhcyox` · Region **Seoul `ap-northeast-2`**
- URL / anon: `.env` (`SUPABASE_*` · gitignore)
- Auth: **Nest only** — Supabase Auth 병행 금지
- `DATABASE_URL`: Dashboard → Database → URI (Nest money 전 필수)
- Redis: **Upstash** URL을 `REDIS_URL`에 (Docker Redis 불필요)
- 마이그레이션: `supabase/migrations` + MCP/`db push` · 대시보드 DDL 금지

## Runtime P0 Bootstrap hosts (§51.13 · $0)

| Host | 경로 |
|------|------|
| Customer web | putduk-web (이 레포 밖) |
| API | Nest Node · `infra/api/runtime.json` · `API_HOST` :4000 |
| DB | Supabase Seoul · `DATABASE_URL` |
| Redis | Upstash · `REDIS_URL` |
| KYC | R2 `kyc-docs` · `infra/r2/kyc-docs.toml` |
| Bus | Nest **in-process** · NATS/Temporal/EKS **0** |
| Workers | `push-dispatcher` · `api-stub` · `infra/workers.manifest.json` |

- Host inventory: `infra/hosts.manifest.json` · domain SSOT: `infra/domain.manifest.json`
- Cutover: `infra/phase0-migration-playbook.md`
- Verify: `pnpm verify:phase0-bootstrap` (in `verify:gate`)
- Compose=`pnpm docker:up` **옵션만** (8GB OFF)

## 자동화 게이트 (ADR-016)

```powershell
pnpm verify:gate:fast      # commit 전 (T0 · ~30s)
pnpm verify:gate:push      # push 전 (T1 · infra+stubs)
pnpm verify:gate           # CI / main (T2)
pnpm cursor:sync-plans    # Plan SSOT → %USERPROFILE%\.cursor\plans hardlink (todo UI drift 방지)
pnpm cleanup:lowspec      # 작업 후 렉 방지
pnpm lowspec:status       # RAM/Docker/Cursor 압력 확인 (이 PC=Celeron 2C/8GB)
```

- 이 PC: `NODE_OPTIONS=--max-old-space-size=1536` · Docker OFF · 프로세스 1개
- Cursor hooks: `.cursor/hooks.json` (project isolation only · `preToolUse` + `beforeTabFileRead`)
- Plan SSOT: 워크스페이스 `.cursor/plans` only · `verify:plans-ssot` in T0 · stale home aliases quarantine
- Husky: pre-commit → `verify:gate:fast` · pre-push → `verify:gate:push`
- CI: `.github/workflows/backend-ci.yml` → T2 `verify:gate`
- Rules: always ≤7 + domain globs · catalog `tooling/verify/CATALOG.md`
- Git: **슬라이스=T0 commit** · **push=세션 stop/명시** = `.cursor/rules/git-auto-commit-push.mdc`

## 검증

```powershell
cd C:\Users\PC\Desktop\AI_PROFIT_OS
pnpm verify:stack-lock
```

PASS 없으면 기능 구현 착수 **금지**.

## 디렉터리 골격

```
services/      # api-nest · engine-rust · 지원 서비스
workers/       # push-dispatcher · api-stub · adapters
schemas/       # JSON 계약 SSOT
supabase/      # migrations
tooling/verify # CI gates · backend/run-all
quality/       # 백엔드 문서·인계
```

## bun / npm 정책

- **bun**: 런타임/테스트 실험만 가능. `bun install` / lockfile SSOT **금지**
- **npm**: `npm install` **금지** (`preinstall` 차단)
- CI·로컬 모두 `pnpm-lock.yaml` 단일
