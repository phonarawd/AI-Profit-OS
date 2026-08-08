# ADR-016 — Agent Automation · Low-Spec · Docker-less

**Status:** Accepted · 2026-08-08  
**Consumes:** ideas for rules/hooks/CI/Supabase-remote (유저 확정 흡수)

## Decision

1. Cursor **rules + hooks + Husky + GitHub Actions**로 오류0 게이트 자동화
2. Phase0 DB = **원격 Supabase** (Docker Desktop 기본 OFF · 8GB)
3. 연동 = Supabase(DB) + GitHub + Cloudflare only · **Vercel 금지**
4. alwaysApply rules ≤7 · 나머지는 globs
5. commit/push = `verify:gate` PASS only · `--no-verify` deny
6. stop/sessionEnd = `cleanup:lowspec`

## Artifacts

- `.cursor/rules/*` · `.cursor/hooks.json` · `.husky/pre-commit`
- `tooling/verify/*` · `tooling/cleanup/lowspec.cjs`
- `.github/workflows/gate.yml`
- `AGENTS.md` · `TOOLCHAIN.md`

## Consequences

- 로컬=얇은 게이트 · CI=동일 gate(+향후 두꺼운 도메인 verify)
- SCM UI 커밋도 Husky로 차단
- Cursor hook `permission:deny`만 신뢰 (ask 비신뢰)
