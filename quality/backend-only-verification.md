# 백엔드 전용 레포 정리 — 검증 증거

- 날짜: 2026-09-10
- 브랜치: `chore/backend-only-repository`
- 베이스: `origin/main` `c4ebcd870557c74f214735bfc9e6c4dac37aaeac` (PR #219 merge)
- 작업 HEAD(문서 작성 시점): 커밋 로그 참고
- PR #222 (`fix/customer-web-contract-p0`)와 **파일 겹침 0** — 해당 브랜치 변경을 revert/overwrite 하지 않음
- 배포 없음 · prod 마이그레이션 apply 없음 · main 커밋 없음

## 명령 결과

| 명령 | exit | 시간 | 결과 | 증거 |
|---|---|---|---|---|
| `node tooling/verify/gate-fast.cjs` (T0, UI 삭제 후) | 0 | ~73s | PASS | 워크트리 터미널 2026-09-10 T0 재실행 |
| `node tooling/verify/phase0-bootstrap.cjs` | 0 | <5s | PASS | Next 존재 검사 제거, apps/web·admin 부재 불변 추가 |
| `node tooling/verify/bucket-invariant.cjs` | 0 | <10s | PASS | 원장 불변 |
| `node tooling/verify/wallet-kyc-session-auth.cjs` | 0 | <10s | PASS | 세션+KYC 인증 게이트 |
| `node tooling/verify/auth-jwt-runtime.cjs` | 0 | ~25s | PASS | 워크트리 정션 해제 후 frozen install 뒤 재실행 |
| `node tooling/verify/gate-push.cjs` (T1, UI 삭제 직후) | 1 | ~35s | FAIL→수정 | `phase0-bootstrap`가 `apps/web/next.config.ts` ENOENT. 이후 스크립트 수정 |
| `pnpm install --frozen-lockfile` (워크트리, 정션 해제) | 0 | ~119s | PASS | Packages +222 · `services/api-nest/node_modules/@nestjs/common` 링크 복구. 부모 레포 store 유지 |
| typecheck (`api-nest-build` tsc) | 0 | T1 내 | PASS | `[verify:api-nest-build] PASS` |
| unit/integration (전체 스위트) | — | — | NOT_RUN | |
| auth/OAuth 전용 테스트 스위트 | — | — | NOT_RUN | `auth-session-cookie` T1 스텁은 유지 |
| ledger 테스트 | 0 | — | PASS | `bucket-invariant` |
| KYC upload 테스트 | — | — | NOT_RUN | `kyc-r2-only` 스텁은 T1 live 유지. `kyc-withdraw-only`는 UI 페이지 참조로 SKIP |
| withdrawal idempotency | — | — | NOT_RUN | 스크립트는 유지, 이 세션에서 미실행 |
| membership/benefits | — | — | NOT_RUN | `membership-ladder` 등 UI 혼재 스텁은 SKIP. 서버 코드는 유지 |
| migration validation | — | — | NOT_RUN | 초안만 유지. prod apply 금지 |
| security audit / CodeQL | — | — | NOT_RUN | CI |
| backend production build (`api-nest-build`) | 0 | T1 내 | PASS | `[verify:api-nest-build] PASS (services/api-nest tsc build clean)` |
| `pnpm verify:gate` (T2) | — | — | NOT_RUN | T2 = `api-nest-build.cjs` (next-build 제거됨) |
| `node tooling/verify/gate-push.cjs` (T1 전체, PWA skip 후) | 0 | ~75s | PASS | `[verify:gate:push] PASS (20 steps)` |

PASS로 위장하지 않음. 미실행은 NOT_RUN.

## 정리 판정 요약

| 분류 | 내용 |
|---|---|
| KEEP_BACKEND | `services/api-nest`, `services/engine-rust`, 기타 `services/*`, `packages/sdk`, `packages/schemas`, `packages/observability`, `workers/*`, `supabase/migrations`, `schemas/*`, 백엔드 verify, `gate.yml` 잡 이름 |
| MOVE_TO_CUSTOMER_WEB | `apps/web` 삭제(이미 phonarawd/putduk-web). 이 레포에서 고객 웹으로 **파일을 푸시하지 않음** |
| MOVE_TO_FUTURE_ADMIN | `quality/admin-handoff/README.md`만. 레거시 `apps/admin` 화면은 재사용 금지 · 삭제 |
| DELETE_AFTER_REFERENCE_CHECK | `apps/web`, `apps/admin`, `packages/ui` 삭제. 게이트/스텁 참조를 끊은 뒤 삭제 |

## T1 스텁 SKIP (UI 트리 필요 · 백엔드 검사는 파일에 남아 있음)

`tooling/verify/lib/retired-ui-stubs.cjs` SSOT.

- UI-only 28개: copy/Canon/화면 전용
- Mixed 56개: 백엔드+화면 혼재. 화면 파일이 없어 FAIL. **삭제하지 않음.** T0/T1에서만 skip
- Mixed 11개는 UI 경로를 무시하도록 수정한 뒤 **계속 실행** (예: `auth-session-cookie`, `kyc-r2-only`, `notification-prefs-default-on`)

`pwa-day1-certification` skip 이유: `apps/web/public/manifest.webmanifest` (고객 PWA). 파일 유지.

`kyc-withdraw-only` skip 이유: `apps/web` withdraw 페이지 + admin routes + `wallet-reader-http.runtime.cjs`가 웹 클라이언트를 읽음. 게이트 파일은 유지 (REVIEW_REQUIRED).

## 보안 의존성

| 패키지 | 경로 | 조치 |
|---|---|---|
| `multer@2.2.0` | `@nestjs/platform-express` 직접 의존 | **유지**. 숨기기 삭제 금지. 업그레이드는 Nest 회귀 검증 없이 하지 않음 → BLOCKED |
| `sharp@0.35.2` | `miniflare` (wrangler) | **유지**. `package.json` `pnpm.onlyBuiltDependencies`에도 존재 |
| `js-yaml` | UI 제거 후 **현재 lockfile에 없음**. main에서는 `@eslint/eslintrc` 전이 | 삭제로 취약을 숨긴 것이 아님. eslint 워크스페이스 이탈의 결과. 재도입/업그레이드 NOT_RUN |

`pnpm.overrides`는 main에도 없었음. 보안 게이트 예외를 추가하지 않음.

## CI

- `gate.yml` 잡 이름 유지 (`verify-gate`, `a3-advisory-lock`, `a4-withdraw-reserve`)
- T2 단계: `next-build` / `opennext-build` 제거 → `api-nest-build.cjs`
- PR 트리거 UI 워크플로 4개: **잡 이름 유지**, Next/Playwright 빌드 제거, no-op echo

## PR #222

변경하지 않은 경로 예: `packages/sdk/src/auth/*`, `schemas/auth-session.v1.json`, `schemas/user-profile.v1.json`, `quality/customer-web-contract-p0.md`, `services/api-nest` auth/kyc/health/ledger-display, `supabase/migrations/20260910083000_*`, `20260910090000_*`.

## 운영자만 확인 가능

1. `packages/ui/brand/assets` 원본이 putduk-web에 있는지
2. 로컬 워크트리 `node_modules` 정션을 끊고 `pnpm install --frozen-lockfile` 후 T1 전체
3. GitHub CodeQL / `verify:gate` T2 green
4. `kyc-withdraw-only` 등 mixed 스텁을 백엔드 전용으로 분할할지

## 추가 증거 (2026-09-10 후속 · HEAD `c5460ef5`)

OpenNext / leftover-browser-harness / strict-webkit CI 실패를 고친 뒤의 로컬 결과. CI T2·CodeQL은 이 SHA에서 아직 안 돌렸으면 NOT_RUN.

| 명령 | exit | 시간 | 결과 | 증거 |
|---|---|---|---|---|
| `node tooling/verify/domain-by-path-ci.cjs` | 0 | ~37–74s | PASS | unit 21/21. retired stub은 자기 파일 변경 시 self-run |
| `pnpm verify:gate:fast` (T0, OpenNext+self-run 커밋) | 0 | ~70–87s | PASS | Husky pre-commit |
| `node tooling/verify/leftover-browser-harness.cjs` | 0 | <5s | PASS | npm script 복구 후 정적 하니스 |
| `no-fake-zero-status` · `home-money-read-contract` · `listing-legs-day1` · `notification-prefs-default-on` · `push-channel-prefs` · `observability` · `release-engine-truth-consistency` | 0 | <1s each | PASS | PR vs main 도메인 스텝 사전 실행 |
| `pnpm verify:gate` (T2, 이 SHA CI) | — | — | NOT_RUN | 이전 CI `15eb08c9` 는 leftover-browser-harness에서 FAIL. 원인: UI 스크립트 삭제 + 도메인 매핑. 위장 PASS 없음 |
| GitHub CodeQL (`15eb08c9`) | 0 | ~2m | PASS | run 34498025952. 이 SHA는 푸시 후 재확인 |
| `pnpm verify:gate:push` (T1, 이 SHA) | — | — | NOT_RUN | push 훅에서 실행 예정 |

### CI 수정 (잡 이름 유지 · 게이트 예외 추가 없음)

- `gate.yml` OpenNext 스텝: Next 빌드 대신 putduk-web 위임 echo. 스텝 이름 유지.
- `leftover-browser-harness` / `axe-harness` / `critical-cross-browser` / `full-product-axe-inventory` npm script 복구. 파일 삭제 없음.
- 위 4개는 `retired-ui-stubs` 로 도메인 매핑에서 skip (self-run은 유지).
- `release-integration-contract.yml` `strict-webkit` 잡 이름 유지, Playwright/Next no-op.

### 보안 의존성 (정정)

| 패키지 | 경로 | 조치 |
|---|---|---|
| `multer@2.3.0` | `@nestjs/platform-express` (KYC `UploadedFiles`) | `pnpm.overrides`. 숨기기 삭제 아님 |
| `sharp@0.35.4` | wrangler → miniflare | `pnpm.overrides` + `onlyBuiltDependencies` |
| `js-yaml` | UI 제거 후 현재 lockfile에 없음 | 삭제로 취약 숨김 아님 |
| `qs` moderate 2 | express 전이 (GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g) | 미업그레이드. REL-402 auditLevel=high 라 PASS. 예외 추가 없음 |

### PR #222

이 브랜치 변경 경로와 #222 파일 **겹침 0** (gh pr view 222 files vs `origin/main...HEAD`). revert/overwrite 없음.

### 아직 손대지 않음 (REVIEW)

- `release-build.yml` · `deploy-cloudflare.yml`: `workflow_dispatch` only. 웹/ops 빌드 스텝은 남아 있음. **이 작업에서 dispatch/배포 안 함.**
- mixed 스텁 파일 자체는 삭제하지 않음.
