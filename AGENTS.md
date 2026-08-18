# AI Profit OS — Agent Guide (ADR-014 · ADR-015 · ADR-016)

Cursor는 **플랜 집행기**다. 스택을 ADR 없이 바꾸지 않는다.

## 읽기 순서

1. `TOOLCHAIN.md` + `.cursor/rules/*` (always) + 해당 glob rules
2. 착수 전: `docs/CONSTITUTION_BOOTSTRAP.md` (실물·헌법·모델배정) · 헌법 Consumer presentation 권위 0
3. **Authority:** `docs/reference/founder-intent/` · **Process:** `docs/product/PUTDUK_PRODUCT_DESIGN_ENGINEERING_OPERATING_SYSTEM.md` · Index 00 = `FOUNDER_INTENT_INDEX` (실행 SSOT 아님)
4. **Plan SSOT:** 편집·todo `status` = 워크스페이스 `.cursor/plans/ai_profit_os_*.plan.md` **만** · `%USERPROFILE%\.cursor\plans` = hardlink 미러(자동 sync) · 드리프트 시 `pnpm cursor:sync-plans` · `verify:plans-ssot`
5. 레거시 `00`~`06`+launch **해시 9파일** = REFERENCE · `LEGACY_00_06_FILE_SERIAL_AUTO_EXECUTION = 0` · `LEGACY_LAUNCH_PLAN_AUTO_EXECUTION = 0` · pending=이력 · Consumer presentation 권위 0
6. **미래 CURRENT ACTIVE 플랜만** File-Serial (`CURRENT_ACTIVE_PLAN = YES` · 위 9파일 아님) · `FUTURE_ACTIVE_PLAN_SYSTEM = PRESERVED` · 한 채팅=한 todo · 접두사 `[grok-4.5|256K]` / `[composer-2.5|200K]`
7. launch = **ARCHIVE_ONLY** (`ai_profit_os_launch_54c1261e.plan.md`) · 자동 실행 0
8. Consumer UI → `.cursor/rules/greenfield-ui.mdc` (VISUAL_TRUTH=APPROVED_FIGMA_ONLY · 레거시 Home/Canon/Visual Master 복구 금지) · AI 이름=**퍼뜩**

## 연동 SSOT (ADR-016)

| 연동 | 판정 |
|------|------|
| Supabase | ✅ DB only · Seoul · ref `mgsytcetsiecllmhcyox` · Auth 금지 |
| GitHub | ✅ `phonarawd/AI-Profit-OS` · 코드만 · 시크릿 금지 |
| Cloudflare | ✅ Pages/Workers/R2 |
| Vercel | ❌ 영구 금지 |
| Docker | 옵션 · **8GB 기본 OFF** · 원격 Supabase+Upstash |

## 브랜드 (ADR-002)

- Consumer = **퍼뜩** (레거시 소비자 브랜드명 재등장 금지)
- Platform = AI Profit OS · Legal = §50.9

## 툴체인

- Node22 · pnpm@10.14 · next@16 · Tailwind v4 · Nest · Rust
- **commit/push 시점** = 3-tier (`git-auto-commit-push.mdc`) · **슬라이스=todo 완료→T0 commit** · **push=세션 stop/명시→T1** · atomic
- commit → `pnpm verify:gate:fast` · push → `pnpm verify:gate:push` · CI/main → `pnpm verify:gate` (T2)
- push 후 **`gh run watch`로 GitHub `gate` CI 감시** · FAIL이면 즉시 수정→재푸시→green까지 (`.cursor/rules/git-safety.mdc`)
- GitHub 도착물 = **오류0 · 오차0 · 결함0 · 중복0** (로컬 T1 + 원격 T2 CI green)
- **슬라이스 done** = domain verify PASS + T0 commit · **세션 done** = cleanup (+ push 시 CI green)

## Phase0 RAM (이 PC = Celeron G6900 2C / ~8GB)

- 프로세스 1개 · 서브에이전트 병렬 0 · E2E/release = CI
- `NODE_OPTIONS=--max-old-space-size=1536` · Docker OFF
- 상태: `pnpm lowspec:status` · 정리: `pnpm cleanup:lowspec`
- 이중 AI 확장(Continue 등)·rust-analyzer 상시 ON 금지 (engine 작업 때만)


## 금지

스택 재제안 · Vercel · PG사 SDK · Supabase Auth · 목업 픽셀 · 화면 IT용어 · 난수 정산 · 잔액 UPDATE · `--no-verify` · `.env` 커밋

## Cursor Autonomous Ops (v7.24.6 · 계획만 · enable 0)

- 설계 SSOT = Infra §31.9~§31.11 · rules `standing-authorization` · `ads-orchestrator` · `cursor-autonomous-ops` · `founder-ops-dashboard`
- Founder Dashboard UX = 04 `admin-ops` (`/admin` 흡수 · sidebar 13 금지)
- Standing Authorization / Budget Guardrail enforce = 06 `ads-budget-standing-authorization` (deterministic · prompt-only 금지)
- Ads Orchestrator ≠ CAPI. CAPI Owns = 기존 Marketing 7
- **지금** Skill/Agent/Automation/Cloud/Bugbot/MCP/provider 연결 **금지** — 06 레거시 플랜 auto-execution DISABLED · enablement는 CURRENT ACTIVE 플랜이 명시할 때까지 0
- production deploy = 기존 `.github/workflows/deploy-cloudflare.yml` `workflow_dispatch` HUMAN · Agent가 production deploy token 보유 0
- 「퍼뜩의 최종 자동운영 출시 준비 완료」 판정 = 06 `ads-autonomous-ops-release-certification` PASS만 · R8 Core Infra PASS로 대체 금지 (v7.24.7)
