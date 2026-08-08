# AI Profit OS — Agent Guide (ADR-014 · ADR-015 · ADR-016)

Cursor는 **플랜 집행기**다. 스택을 ADR 없이 바꾸지 않는다.

## 읽기 순서

1. `TOOLCHAIN.md` + `.cursor/rules/*` (always) + 해당 glob rules
2. 착수 전: `docs/CONSTITUTION_BOOTSTRAP.md` (실물·헌법·모델배정)
3. ACTIVE Index: `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md` (논리명 `*_ssot` = STALE stub)
4. 도메인 `01`~`06` **해시 파일만** · 한 채팅=한 todo · todo 접두사 `[grok-4.5|256K]` / `[composer-2.5|200K]`
5. launch = **ARCHIVE** (`ai_profit_os_launch_54c1261e.plan.md`)
6. UI → Canon + Brand + Lux · AI 이름=**퍼뜩** (앱명과 동일 · §47 Personal AI · 타프로젝트 코치명 금지)

## 연동 SSOT (ADR-016)

| 연동 | 판정 |
|------|------|
| Supabase | ✅ DB only · Seoul · ref `mgsytcetsiecllmhcyox` · Auth 금지 |
| GitHub | ✅ `phonarawd/AI-Profit-OS` · 코드만 · 시크릿 금지 |
| Cloudflare | ✅ Pages/Workers/R2 |
| Vercel | ❌ 영구 금지 |
| Docker | 옵션 · **8GB 기본 OFF** · 원격 Supabase+Upstash |

## 브랜드 (ADR-002)

- Consumer = **퍼뜩** (구 오늘수익·바로번다 폐기)
- Platform = AI Profit OS · Legal = §50.9

## 툴체인

- Node22 · pnpm@10.14 · next@16 · Tailwind v4 · Nest · Rust
- `pnpm verify:gate` PASS 전 commit/push 금지 (hook+husky)
- done = 도메인 `verify:*` PASS + `pnpm cleanup:lowspec`

## Phase0 RAM

- 프로세스 1개 · 서브에이전트 병렬 금지 · E2E는 CI
- `NODE_OPTIONS=--max-old-space-size=2048`

## 금지

스택 재제안 · Vercel · PG사 SDK · Supabase Auth · 목업 픽셀 · 화면 IT용어 · 난수 정산 · 잔액 UPDATE · `--no-verify` · `.env` 커밋
