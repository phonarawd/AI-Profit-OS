# ADR-016 — Agent Automation · Low-Spec · Docker-less

**Status:** Accepted · 2026-08-08  
**Consumes:** ideas for rules/hooks/CI/Supabase-remote (유저 확정 흡수)

## Decision

1. Cursor **rules + hooks + Husky + GitHub Actions**로 오류0 게이트 자동화
2. Phase0 DB = **원격 Supabase** (Docker Desktop 기본 OFF · 8GB)
3. 연동 = Supabase(DB) + GitHub + Cloudflare only · **Vercel 금지**
4. alwaysApply rules ≤7 · 나머지는 globs
5. commit/push = `verify:gate` PASS only · `--no-verify` deny
6. **push 후** = `gh run watch`로 GitHub Actions `gate` **실시간 감시** · FAIL→즉시 수정→재푸시→**CI green**까지 (오류0·오차0·결함0·중복0) · `git-safety.mdc`
7. stop/sessionEnd = `cleanup:lowspec`
8. 워크스테이션 실측 = **Celeron G6900 2C / ~8GB** → `NODE_OPTIONS=--max-old-space-size=1536` · `pnpm lowspec:status` · IDE 저사양 settings · 이중 AI 확장 OFF

## Artifacts

- `.cursor/rules/*` · `.cursor/hooks.json` · `.husky/pre-commit`
- `tooling/verify/*` · `tooling/cleanup/lowspec.cjs` · `tooling/lowspec/status.cjs`
- `.vscode/settings.json` (저사양) · `.npmrc` concurrency=1
- `.github/workflows/gate.yml`
- `AGENTS.md` · `TOOLCHAIN.md`

## Consequences

- 로컬=얇은 게이트 · CI=동일 gate(+향후 두꺼운 도메인 verify)
- SCM UI 커밋도 Husky로 차단
- Cursor hook `permission:deny`만 신뢰 (ask 비신뢰)
- 에이전트 push 세션 = CI watch 루프 필수 · red CI 방치 종료 금지
