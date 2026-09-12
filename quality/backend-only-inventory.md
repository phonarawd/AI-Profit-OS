# PUTDUK 백엔드 전용 레포 — Stage 1 인벤토리

- **기준 커밋:** `origin/main` `c4ebcd870557c74f214735bfc9e6c4dac37aaeac` (Merge PR #219)
- **조사일:** 2026-09-10
- **정리 브랜치:** `chore/backend-only-repository` (`origin/main`에서 분기, PR #221/#222 커밋 0)
- **분류 값(항목당 정확히 1개):** `KEEP_BACKEND` | `MOVE_TO_CUSTOMER_WEB` | `MOVE_TO_FUTURE_ADMIN` | `DELETE_AFTER_REFERENCE_CHECK`
- **불확실:** `REVIEW_REQUIRED` / `BLOCKED` — 삭제 금지, 이 문서에만 기록
- **Stage 1 제약:** 코드/설정/lockfile 변경 0 · 커밋 0 · 운영 DB apply 0 · 배포 0

## 0. 조사에 사용한 명령

```text
git status --short --branch
git rev-parse HEAD
git log -1 --format="%H %s"
git remote -v
git branch -vv
git branch -a
git worktree list
git fetch origin main
git log -1 --format="%H %s" origin/main
git merge-base origin/main origin/fix/customer-web-contract-p0
git log --oneline origin/main..origin/fix/customer-web-contract-p0
gh pr view 222 --json number,title,state,baseRefName,headRefName,files,commits,url,mergeable,mergeStateStatus
gh pr view 221 --json number,title,state,baseRefName,headRefName,changedFiles,url,mergeable
gh pr list --state open --limit 30
git ls-tree --name-only origin/main
git ls-tree -r --name-only origin/main apps/web apps/admin packages/ui services/api-nest
git grep / rg  (apps/web, @aipo/ui, storybook, playwright, wrangler, aipo_session)
```

현재 Cursor 워크스페이스는 PR #221 브랜치 `chore/d1-zero-known-defect-20260904` @ `4c6f22fa` 이다. 이 트리는 D1 감사 전용(초안, DO NOT MERGE, +52706/−8113, 677 files)이라 **정리 기준이 아니다.** 인벤토리 경로는 모두 `git ls-tree origin/main`으로 확인했다.

---

## 1. Git / 브랜치 / 워킹트리

| 항목 | 값 | 분류 |
|---|---|---|
| 조사 시점 워크스페이스 브랜치 | `chore/d1-zero-known-defect-20260904` → PR #221 | REVIEW_REQUIRED (이 브랜치에서 정리 금지) |
| 워크스페이스 HEAD | `4c6f22fa` Show KRW as the primary user-facing amount… | — |
| 워크스페이스 dirty | `governance/release-master/rel-106-profits/*.png`, `rel-113-wallet/*.png`, `tooling/cleanup/*.cjs`, `tooling/lowspec/status.cjs` | KEEP_BACKEND (증거 PNG·로컬 정리기 · 이번 작업에서 커밋하지 않음) |
| remote | `origin` = `https://github.com/phonarawd/AI-Profit-OS.git` | KEEP_BACKEND |
| `origin/main` | `c4ebcd87` Merge PR #219 | 정리 베이스 |
| 로컬 `main` | `a3e5304d` (origin/main보다 2 커밋 behind) | — |
| 정리 워크트리 | `_worktree-backend-only` @ `chore/backend-only-repository` = `c4ebcd87` | KEEP_BACKEND |
| 기존 워크트리 | `_worktree-onboarding-20260906` (`feat/product-onboarding-v2-20260906`) | REVIEW_REQUIRED (이번 작업 비대상) |
| 기존 워크트리 | `C:\Users\PC\Desktop\AI_PROFIT_OS_CONTRACT_P0` (`fix/customer-web-contract-p0` = PR #222) | **BLOCKED** — 파일 수정/덮어쓰기 금지 |

**판정:** 정리 커밋은 `chore/backend-only-repository`(main 베이스)에서만 한다. PR #221 워킹트리·PR #222 워크트리와 섞지 않는다.

---

## 2. PR #222 ↔ PR #221 관계

| | PR #222 | PR #221 |
|---|---|---|
| 제목 | 고객 웹 P0 계약: 구글 약관 pending · 성별 · 원장 표시 · KYC 업로드 · health 버전 | DO NOT MERGE - D1 zero-known-defect audit CI/evidence only |
| 브랜치 | `fix/customer-web-contract-p0` | `chore/d1-zero-known-defect-20260904` |
| base | `main` (`c4ebcd87`와 merge-base 동일) | `main` |
| 상태 | OPEN · MERGEABLE · mergeStateStatus=`BLOCKED` | DRAFT · MERGEABLE · UNSTABLE |
| 규모 | +1710/−69 · **40 files** · 커밋 9 | +52706/−8113 · **677 files** |
| URL | https://github.com/phonarawd/AI-Profit-OS/pull/222 | https://github.com/phonarawd/AI-Profit-OS/pull/221 |
| `main`에 없는 커밋 | `299cac9c`…`0fa38d77` (9개) | D1 감사 라인 (현재 워크스페이스) |
| `222`에 없는 main 커밋 | 없음 (main fast-forward 가능) | 해당 없음 |

### PR #222 파일 목록 (이 브랜치에서 revert/overwrite **금지**)

`.gitignore` · `packages/sdk/src/auth/{auth-release.test.ts,fetch.ts,types.ts}` · `quality/customer-web-contract-p0.md` · `schemas/auth-session.v1.json` · `schemas/user-profile.v1.json` · `services/api-nest/ledger-user-query.core.cjs` · `services/api-nest/package.json` · `services/api-nest/scripts/write-nest-build-info.cjs` · `services/api-nest/src/auth/{auth.constants,auth.controller,auth.module,auth.routes,auth.service,auth.stage,auth.stage.runtime.test,identity-proof.*,oauth-identity.service,oauth-pending-signup*}` · `services/api-nest/src/auth/privacy-account.service.ts` · `services/api-nest/src/compliance/{kyc-upload.contract*,kyc.controller,kyc.service}` · `services/api-nest/src/config/{nest-build-info.ts,nest-provenance.ts}` · `services/api-nest/src/health.{controller,public,public.runtime.test}.ts` · `services/api-nest/src/ledger/ledger-customer-display.runtime.test.ts` · `supabase/migrations/20260910083000_oauth_pending_signup.sql` · `supabase/migrations/20260910090000_user_profile_gender.sql` · `tooling/verify/{auth-flows.cjs,auth-identity-proof.runtime.cjs,fixtures/migrations-applied.v1.json,user-ledger-query.cjs}`

**관계 요약:** #221과 #222는 서로 다른 목적(#221=D1 감사 증거, #222=고객 웹 API 계약)이며 공통 베이스만 `main`이다. #222는 `apps/web`·`apps/admin`·`packages/ui`를 건드리지 않는다. 이 정리 브랜치는 #222와 파일 겹침 없이 UI 트리 삭제를 계획할 수 있다. **단 `packages/sdk`·`schemas/*`·`services/api-nest`·`supabase/migrations`·`tooling/verify`는 #222 활성 영역이므로 이 작업에서 내용 변경 금지.**

`origin/main`의 공개 health는 `ok/service/phase/gitSha/db/redis/warnings`만 있다. `version`·`buildTime`·`environment`는 **#222가 추가할 필드**다. 이 브랜치에서 health를 고치면 #222와 충돌한다 → **BLOCKED**.

---

## 3. 디렉터리 구조 (`origin/main` 최상위)

| path | 현재 역할 | 참조 | 제거 시 영향 | 이동 대상 | 삭제 가능 | 분류 | 근거 |
|---|---|---|---|---|---|---|---|
| `.cursor/` | 에이전트 규칙·훅 | `stack-lock.cjs` mustExist | T0 FAIL | 유지 | 아니오 | KEEP_BACKEND | 백엔드 운영 규칙. UI 전용 규칙은 후속 정리 후보 |
| `.github/` | Actions | gate/deploy | CI 소실 | 유지+백엔드 재구성 | 아니오(일괄) | KEEP_BACKEND (워크플로 단위로 아래 세분) | |
| `.husky/` | pre-commit/pre-push | `prepare` | 게이트 우회 | 유지 | 아니오 | KEEP_BACKEND | T0/T1 |
| `AGENTS.md` `TOOLCHAIN.md` `CONSTITUTION/` | 스택/에이전트 SSOT | stack-lock | T0 FAIL | 유지 | 아니오 | KEEP_BACKEND | |
| `COMPANY_REGISTRATION_SUMMARY.md` `FOOTER_LICENSE_COPY.md` | 법인/라이선스 | 법적 문서 | 준법 공백 | 유지 | 아니오 | KEEP_BACKEND | 법률 문서 편집 금지 |
| `PRE_IMPLEMENTATION_MASTER_AUDIT.md` | 구현 전 감사 | 문서 | 이력 소실 | 유지 | 아니오 | KEEP_BACKEND | 출시 증거 |
| `apps/` | Next 고객웹+어드민 | workspace `apps/*`, stack-lock | 화면 패키지 잔존 | 아래 세분 | 트리 단위만 | — | |
| `assets/` | `.gitkeep`만 | 없음 | 없음 | — | 예(빈 폴더) | DELETE_AFTER_REFERENCE_CHECK | 앱 런타임 에셋 아님 |
| `docker-compose.dev.yml` | 로컬 Docker(기본 OFF) | `docker:up` | 로컬 옵션 소실 | 유지 | 아니오 | KEEP_BACKEND | Phase0 원격 DB가 기본 |
| `docs/` | 부트스트랩·ops·kyb | 문서 | 운영 문서 소실 | 세분 | 아니오(일괄) | KEEP_BACKEND | |
| `eval/` | AI eval | ai-eval 게이트 | eval 소실 | 유지 | 아니오 | KEEP_BACKEND | 퍼뜩 가드 |
| `governance/` | 보안·복구·릴리스 증거 | 다수 verify | 출시 증거 소실 | 세분 | 아니오(일괄) | KEEP_BACKEND | 현재 릴리스 증거 삭제 금지 |
| `infra/` | 도메인/워커/웹·ops wrangler | stack-lock, deploy | 배포 경로 붕괴 | 세분 | 아니오(일괄) | 세분 | |
| `package.json` `pnpm-lock.yaml` `pnpm-workspace.yaml` | 모노레포 SSOT | 전 CI | 설치 불가 | 유지 후 백엔드 재구성 | 아니오 | KEEP_BACKEND | Stage 4+에서만 편집 |
| `packages/` | ui/sdk/schemas/observability | workspace | 세분 | 세분 | — | 세분 | |
| `schemas/` | HTTP/원장 JSON 계약 | api-nest, verify | 계약 소실 | 유지 | 아니오 | KEEP_BACKEND | 고객웹·미래 어드민 계약 |
| `scripts/` | boundary/night-guard | package scripts | 훅 검증 소실 | 유지 | 아니오 | KEEP_BACKEND | |
| `services/` | Nest·Rust·AI 엔진 | 백엔드 런타임 | API 사망 | 유지 | 아니오 | KEEP_BACKEND | |
| `supabase/` | 마이그레이션(작성만) | verify:migrations | 스키마 이력 소실 | 유지 | 아니오 | KEEP_BACKEND | prod apply 금지 |
| `tooling/` | verify/deploy/e2e/cleanup | 전 게이트 | CI 사망 | 세분 | 아니오(일괄) | 세분 | |
| `workers/` | CF Workers(어댑터·프록시) | wrangler, gate | 수집/프록시 소실 | 세분 | 아니오(일괄) | 세분 | |
| `rust-toolchain.toml` | Rust 1.85 pin | stack-lock, gate cargo | engine-rust CI FAIL | 유지 | 아니오 | KEEP_BACKEND | |

파일 수(`git ls-tree -r origin/main`): `apps/web` 270 · `apps/admin` 47 · `packages/ui` 286 · `services/api-nest` 336 · `packages/sdk` 57.

---

## 4. package.json / pnpm workspace / lockfile

| path | 현재 역할 | 참조 | 제거 시 영향 | 이동 대상 | 삭제 가능 | 분류 | 근거 |
|---|---|---|---|---|---|---|---|
| `pnpm-workspace.yaml` | `apps/*` `packages/*` `services/*` `workers/*` `tooling/*` | pnpm install | 워크스페이스 붕괴 | 유지, `apps/*`는 참조 절단 후 제거 | 아니오 | KEEP_BACKEND | Stage 4에서 `apps/*` 제거 후보 |
| `package.json` | 루트 스크립트 400+ · `dev:web`/`dev:admin`/`cf:deploy:web`/`verify:web-lint`/`verify:next-build` 등 UI 다수 | Husky, CI | 스크립트 공백 | 유지 후 UI 스크립트 제거 | 아니오 | KEEP_BACKEND | 백엔드 `verify:gate*`·`dev:api` 유지 |
| `pnpm-lock.yaml` | lock SSOT | `pnpm install --frozen-lockfile` | CI 설치 FAIL | 유지, 화면 패키지 제거 후 재생성 | 아니오 | KEEP_BACKEND | Stage 4에서만 재생성 |
| `package.json` `pnpm.overrides` | `sharp@0.35.4` `js-yaml@4.3.2` `multer@2.3.0` | REL-402 audit | 보안 게이트 | 유지 | 아니오 | KEEP_BACKEND | 숨기기 삭제 금지. 실제 의존 경로는 Stage 4 별도 커밋 |
| `package.json` `onlyBuiltDependencies` | `esbuild` `sharp` `@nestjs/core` | pnpm | 빌드 훅 | 유지 | 아니오 | KEEP_BACKEND | Nest 유지. sharp는 Next/이미지 경로인지 확인 전 유지 |

확인: `Get-Content package.json`; `Get-Content pnpm-workspace.yaml`.

---

## 5. `apps/web` — 고객 화면 (이미 `phonarawd/putduk-web`으로 분리된 대상)

**현재 역할:** Next@16 퍼뜩 PWA. `package.json` name=`@aipo/web`. 의존: `@aipo/ui` `@aipo/sdk` `@aipo/schemas` `next@16.3.3` `tailwindcss@4`.

**참조 코드:** `pnpm-workspace.yaml` `apps/*` · 루트 `dev:web` `cf:deploy:web*` · `tooling/verify/stack-lock.cjs` mustExist `apps/web/package.json` `apps/web/routes.ts` · `domain-by-path.cjs` `apps/web/**` → `web-lint.cjs` · 수십 개 `verify:*`가 페이지 파일을 직접 `read()` · `infra/domain.manifest.json` `openNext.web.app=apps/web` · `infra/web/wrangler.toml` · UI Playwright.

**제거 시 영향:** T0 `verify:stack-lock` 즉시 FAIL. 경로 도메인 verify 다수 FAIL. 이 레포에서 고객 화면 빌드/배포 불가. **고객 웹 런타임은 putduk-web이 담당한다고 가정하나, 이 레포의 CF 웹 배포 경로가 아직 살아있는지는 REVIEW_REQUIRED.**

**이동 대상:** 고객 화면 코드는 putduk-web. 이 레포에는 남기지 않음. 법률/브랜드 원본은 루트·`docs/kyb`·governance에 유지.

**삭제 가능:** 참조 절단(별도 커밋) 후에만. 지금 삭제하면 T0 불가.

| path | 역할 | 분류 |
|---|---|---|
| `apps/web/package.json` | Next 앱 매니페스트 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/next.config.ts` `open-next.config.ts` `postcss.config.mjs` `tsconfig.json` `eslint.config.mjs` | 화면 전용 빌드 | DELETE_AFTER_REFERENCE_CHECK |
| `apps/web/middleware.ts` | Next 미들웨어 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/routes.ts` | 5탭 IA + nested 라우트 SSOT · `verify:ia-tabs` | MOVE_TO_CUSTOMER_WEB (putduk-web IA). 백엔드 라우트 아님 |
| `apps/web/app/page.tsx` `HomePageClient.tsx` `HomeDesktopClient.tsx` `GuestFirstVisit.tsx` | 홈 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/app/profits/**` | 기회 목록/상세 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/app/trades/**` | 수익/실행 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/app/wallet/**` | 지갑/입출금/내역 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/app/me/**` | 내정보·KYC·퍼뜩·멤버십·수신함·초대·혜택·설정·가이드·약관 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/app/auth/**` | 로그인/가입/OAuth 콜백/매직링크 | MOVE_TO_CUSTOMER_WEB (서버 인증은 Nest 유지) |
| `apps/web/app/onboarding/**` | 온보딩 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/app/ads/**` `app/l/**` | 랜딩/광고 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/app/dev/spark-dash-*` | SparkDash 픽스처 | DELETE_AFTER_REFERENCE_CHECK |
| `apps/web/app/globals.css` `guest-first-visit.css` `pwa-shell.css` | 화면 CSS | DELETE_AFTER_REFERENCE_CHECK |
| `apps/web/components/**` | spark-dash-home 등 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/lib/**` | 웹 전용 매퍼 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/public/brand` `icons` `manifest.webmanifest` `sw.js` `spark-dash` `account-hub` | PWA/브랜드 미러 | MOVE_TO_CUSTOMER_WEB. 공식 브랜드 원본은 `packages/ui/brand` — 원본 삭제 전 핸드오프 |
| `apps/web/public/kyb` | 화면용 KYB 사본 | REVIEW_REQUIRED — 법률 마크. `docs/kyb`와 중복 여부 확인 전 삭제 금지 |
| `apps/web/scripts/**` | 웹 에셋 파이프라인 | DELETE_AFTER_REFERENCE_CHECK |
| `apps/web/AGENTS.md` `CLAUDE.md` | Next 에이전트 스텁 | DELETE_AFTER_REFERENCE_CHECK |

확인: `git ls-tree -r --name-only origin/main apps/web/`.

---

## 6. `apps/admin` — 레거시 운영 화면 (미래 어드민 레포. 재구현 금지)

**현재 역할:** Next@16 Ops UI. name=`@aipo/admin`. Spark CSS(`spark-admin.css`). `@aipo/ui` copy 의존(`routes.ts`가 `@aipo/ui/copy/ko` import).

**참조:** stack-lock mustExist `apps/admin/package.json` `routes.ts` · `dev:admin` `cf:deploy:ops*` · `infra/ops/wrangler.toml` · `domain.manifest.json` `openNext.ops.app=apps/admin` · `verify:admin-routes` `rel-201`…`rel-221` 다수가 `apps/admin/app/admin/**/page.tsx`를 읽음 · Playwright `admin-*.spec.cjs`.

**제거 시 영향:** T0 stack-lock FAIL. 레거시 Ops 화면 이 레포에서 소실. **Admin API(`services/api-nest` `@Controller("admin")`)는 유지.** 화면만 제거. 미래 어드민은 SparkDash/Lux 재사용 금지 — 핸드오프 요약만 남김.

**삭제 가능:** 참조 절단 후. 화면을 새 어드민으로 “옮기는” 것이 아니라 핸드오프 후 이 레포에서 제거.

| path | 역할 | 분류 |
|---|---|---|
| `apps/admin/package.json` `next.config.ts` `open-next.config.ts` `postcss.config.mjs` | 화면 빌드 | DELETE_AFTER_REFERENCE_CHECK |
| `apps/admin/routes.ts` | 12모듈 IA + child tabs | MOVE_TO_FUTURE_ADMIN (요약만 `quality/admin-handoff/`) |
| `apps/admin/app/admin/page.tsx` 및 users/ledger/wallet/compliance/risk/opportunities/adapters/support/system-control/audit/ai-logs/growth/** | 레거시 화면 | DELETE_AFTER_REFERENCE_CHECK (재구현 금지) |
| `apps/admin/app/spark-admin.css` `globals.css` | Spark/Toss 잔재 | DELETE_AFTER_REFERENCE_CHECK |
| `apps/admin/components/**` `lib/**` `public/**` | 화면 전용 | DELETE_AFTER_REFERENCE_CHECK |

확인: `git ls-tree -r --name-only origin/main apps/admin/`.

---

## 7. `packages/ui` — Canon/Lux/Brand/카피 (화면 전용)

**현재 역할:** 디자인 토큰, Canon wire, Visual Contract, 한글 카피, Lux 컴포넌트, 브랜드 키트. api-nest는 `@aipo/ui`를 **import하지 않음** (`rg "@aipo/ui" services/api-nest` = 주석만).

**참조:** `apps/web` `apps/admin` · stack-lock mustExist lux/brand · `verify:packages-ui-typecheck` · `no-it-jargon` `canon-surfaces` `brand-assets` 등 · `domain-by-path` `packages/ui/**`.

**제거 시 영향:** 화면 패키지 컴파일 불가. T0 stack-lock FAIL. 백엔드 런타임은 직접 의존 0. 브랜드 원본(`packages/ui/brand/assets`)은 고객웹/법적 자산 — **파일 자체를 이 레포에서 지우기 전 putduk-web 보유 여부 REVIEW_REQUIRED.** 공식 브랜드 자산 편집/삭제는 하드룰 금지에 가깝다.

| path | 역할 | 분류 |
|---|---|---|
| `packages/ui/package.json` | UI 패키지 | DELETE_AFTER_REFERENCE_CHECK |
| `packages/ui/tokens/**` `components/lux/**` | Lux/Toss Premium 잔재 | DELETE_AFTER_REFERENCE_CHECK |
| `packages/ui/canon/**` | 화면 Functional/Visual SSOT | MOVE_TO_CUSTOMER_WEB (putduk-web이 이미 갖고 있으면 이 레포에서 삭제) |
| `packages/ui/copy/ko/**` | 화면 카피 | MOVE_TO_CUSTOMER_WEB |
| `packages/ui/copy/ko` 중 admin 네비 | 레거시 어드민 라벨 | MOVE_TO_FUTURE_ADMIN (핸드오프 표만) |
| `packages/ui/brand/**` | Brand Kit | REVIEW_REQUIRED — 법률/브랜드 자산. 삭제 전 확인 |
| `packages/ui/performance/**` `responsive/**` | 화면 성능/뷰포트 | DELETE_AFTER_REFERENCE_CHECK |
| `packages/ui/components/**` | React 화면 컴포넌트 | MOVE_TO_CUSTOMER_WEB / DELETE_AFTER_REFERENCE_CHECK |

Storybook: `git ls-tree -r origin/main \| Select-String storybook` → **0 파일**. Storybook 패키지 없음.

---

## 8. 화면 에셋 / 폰트 / 이미지

| path | 역할 | 분류 |
|---|---|---|
| `apps/web/public/**` | PWA 아이콘·스파크 대시 정적 | MOVE_TO_CUSTOMER_WEB |
| `apps/web/app/icon.png` `favicon.ico` | 앱 아이콘 | MOVE_TO_CUSTOMER_WEB |
| `packages/ui/brand/assets/**` | 브랜드 키트 | REVIEW_REQUIRED |
| `governance/release-master/**/*.png` | 릴리스 런타임 스크린샷 증거 | KEEP_BACKEND | 현재 릴리스 증거 삭제 금지 |
| `governance/consumer-home-approval/**` | 홈 geometry freeze | MOVE_TO_CUSTOMER_WEB 또는 KEEP 증거. **삭제 금지(승인 증거)** → KEEP_BACKEND (증거) |
| `governance/figma/**` `governance/visual-reconciliation/**` | 시각 거버넌스 | DELETE_AFTER_REFERENCE_CHECK (화면 전용 문서) 단 중복 확인 후 |
| `assets/` | 빈 keep | DELETE_AFTER_REFERENCE_CHECK |

확인: `git ls-tree origin/main apps/web/public packages/ui/brand assets`.

---

## 9. Next.js / Tailwind / Storybook / UI 전용 패키지

| path | 역할 | 분류 |
|---|---|---|
| `apps/web/next.config.ts` `apps/admin/next.config.ts` | Next 설정 | DELETE_AFTER_REFERENCE_CHECK |
| `apps/web/postcss.config.mjs` `apps/admin/postcss.config.mjs` | Tailwind v4 PostCSS | DELETE_AFTER_REFERENCE_CHECK |
| `packages/ui` tailwind 의존 | UI 토큰 CSS | DELETE_AFTER_REFERENCE_CHECK |
| Storybook | 없음 | — |
| `packages/sdk` | 고객 웹 HTTP 클라이언트(React). api-nest import 0 | **BLOCKED** — PR #222가 `packages/sdk/src/auth/*` 수정 중. 삭제/이동 금지 |
| `packages/schemas` | 공유 JSON 스키마 패키지 | KEEP_BACKEND |
| `packages/observability` | 관측 패키지 | KEEP_BACKEND |

확인: Glob `next.config.*` `tailwind.config.*` `*.stories.*` `.storybook/**` — Storybook 0, Tailwind는 PostCSS 플러그인으로 앱에 존재.

---

## 10. Playwright: UI vs 어드민 vs 백엔드

설정:

- `tooling/e2e/playwright.config.cjs` — 고객+어드민 브라우저
- `tooling/e2e/playwright.cross-browser.config.cjs`
- `tooling/verify/responsive/playwright.config.cjs` — Canon 뷰포트 (화면)

| spec | 역할 | 분류 |
|---|---|---|
| `home-closure` `profits-closure` `wallet-closure` `kyc-closure` `landing-guest` `peotteok-closure` 등 고객 화면 | UI E2E | DELETE_AFTER_REFERENCE_CHECK |
| `admin-entry-closure` `admin-spark-shell` `critical-admin-cross-browser` `full-product-axe-admin` `leftover-browser-admin` | 어드민 화면 E2E | DELETE_AFTER_REFERENCE_CHECK |
| `auth-rate-limit.spec.cjs` | 브라우저에서 인증 한도 | REVIEW_REQUIRED — API 한도는 `verify:auth-rate-limit`가 백엔드. 스펙이 UI 의존이면 삭제 후보 |
| `ledger-user-query.spec.cjs` `ledger-history-matrix.spec.cjs` `money-red-team.spec.cjs` | 돈 경로 브라우저 | REVIEW_REQUIRED — 백엔드 `verify:user-ledger-query` 등과 중복. UI 없으면 삭제, API 테스트는 유지 |
| `happy-path.placeholder.spec.cjs` | 플레이스홀더 | DELETE_AFTER_REFERENCE_CHECK |
| `tooling/verify/responsive/**` | 화면 구조 diff | DELETE_AFTER_REFERENCE_CHECK |

백엔드 단위/런타임 테스트(`services/api-nest/**/*.runtime.test.ts`, `tooling/verify/*.runtime.cjs`)는 **KEEP_BACKEND**.

---

## 11. Cloudflare / 정적 / 웹 배포

| path | 역할 | 분류 |
|---|---|---|
| `infra/web/wrangler.toml` | 고객 OpenNext Workers | REVIEW_REQUIRED — putduk-web 배포로 완전히 이전됐는지 미확인. **지금 삭제 금지** |
| `infra/ops/wrangler.toml` | 레거시 어드민 OpenNext | REVIEW_REQUIRED — 운영 ops.hiptk.app 경로. 삭제 전 운영자 확인 |
| `infra/ops/access-policy.json` | CF Access | KEEP_BACKEND (운영 정책) |
| `infra/domain.manifest.json` | 호스트 SSOT (`api.hiptk.app` / `app.hiptk.app` / `ops.hiptk.app`) | KEEP_BACKEND — API 호스트 유지. web/ops 필드는 참조 확인 전 유지 |
| `infra/hosts.manifest.json` `infra/workers.manifest.json` | 워커/호스트 | KEEP_BACKEND |
| `infra/api/runtime.json` `infra/api/cloudflared.render.yml` | Nest/Render | KEEP_BACKEND |
| `infra/r2/` | KYC/이미지 버킷 설정 | KEEP_BACKEND |
| `infra/phase0-migration-playbook.md` | 마이그레이션 플레이북 | KEEP_BACKEND — 적용 지시가 아님 |
| `workers/web-proxy/**` | 고객 오리진 프록시 | REVIEW_REQUIRED — 프로덕션 라우팅일 수 있음. 삭제 금지 |
| `workers/ops-proxy/**` | 어드민 오리진 프록시 | REVIEW_REQUIRED | 삭제 금지 |
| `workers/*-adapter` `chain-*` `push-dispatcher` `marketing-capi-dispatcher` `api-stub` | 백엔드 워커 | KEEP_BACKEND |
| `apps/web/open-next.config.ts` `apps/admin/open-next.config.ts` | 화면 OpenNext | DELETE_AFTER_REFERENCE_CHECK (앱 삭제와 함께) |

`workers/fashionphile-parser`는 **origin/main에 없음** (현재 #221 워크스페이스에만 존재). 정리 대상 아님.

---

## 12. GitHub Actions

| path | 웹/어드민 때문에 도는가 | 분류 |
|---|---|---|
| `.github/workflows/gate.yml` | 설치는 전체 워크스페이스. 잡은 A3/A4 PG · REL-40x/50x · cargo · `pnpm verify:gate`. **main의 verify:gate T2 = next-build + opennext-build** (gate.yml 자체에 next 잡 이름은 없고 `verify:gate` 한 스텝이 둘을 실행) | KEEP_BACKEND — 잡 이름 `verify-gate` 변경 금지. 내부 스텝만 백엔드로 재구성 |
| `codeql.yml` | 보안 | KEEP_BACKEND |
| `engine-acceptance.yml` `engine-acceptance-heavy.yml` `engine-current-epoch-finalize-once.yml` `engine-evidence-refresh-check.yml` | 엔진 | KEEP_BACKEND |
| `ebay-fault-injection.yml` `provision-ebay-adapter-secrets.yml` | 어댑터 | KEEP_BACKEND |
| `release-acceptance.yml` `release-integration-contract.yml` `release-build.yml` | 릴리스. release-build는 웹 아티팩트 포함 가능 | REVIEW_REQUIRED — 웹 스텝만 절단, 워크플로 이름 유지 |
| `deploy-cloudflare.yml` | `surface=web\|ops\|workers\|all` | KEEP_BACKEND (workers/API). web/ops 입력은 참조 확인 전 유지 |
| `deploy-staging.yml` | 스테이징 웹/ops | REVIEW_REQUIRED |
| `consumer-spark-worldclass.yml` | 고객 Spark UI QA | DELETE_AFTER_REFERENCE_CHECK |
| `spark-global-ui-qa.yml` | 글로벌 UI QA | DELETE_AFTER_REFERENCE_CHECK |
| `critical-axe.yml` `critical-cross-browser.yml` | 화면 a11y/브라우저 | DELETE_AFTER_REFERENCE_CHECK |
| `lighthouse.yml` | 화면 성능 | DELETE_AFTER_REFERENCE_CHECK |

확인: `git ls-tree origin/main .github/workflows/`; `git grep apps/web origin/main -- .github/workflows`.

**중요 (`origin/main` 실측, #221 게이트와 다름):**

| 티어 | `origin/main` `gate-tiers.cjs` |
|---|---|
| T0 always | `stack-lock` `secrets` `plans-ssot` **`brand-consumer`** |
| T1 always | `brand-assets` `opennext-workers-origin` `next-major-pin` `tailwind-v4` `lux-theme-sync` `dark-leak-guard` `no-admin-in-web` `ia-tabs` `admin-routes` `admin-boundary` `cf-deploy-packages` + 백엔드 항목 + `api-nest-build` |
| T2 | **`next-build.cjs` `opennext-build.cjs`** |

`gate.yml`의 `pnpm verify:gate`는 따라서 **고객/어드민 Next 빌드를 아직 돌린다.** #221 워크스페이스의 “T1 프론트 extras 0 · T2=api-nest-build만”은 이 베이스에 없다. 백엔드 전용 재구성은 이 파일을 main 기준으로 바꾸는 별도 커밋이 필요하다. T0 `stack-lock` + `brand-consumer`가 `apps/web`·`packages/ui` 존재를 강제한다.

---

## 13. 백엔드가 실제로 참조하는 파일

api-nest `package.json` 의존: `@aipo/ai-platform` `feature-platform` `market-intelligence` `memory-service` `shadow-replay-engine` `simulation-engine` `user-twin-service` + Nest + `pg` + `ioredis` + `cookie-parser`.

**`@aipo/ui` `@aipo/sdk` `@aipo/web` `@aipo/admin` import 0.**

주석에만 `apps/web` 경로가 등장 (`classic-signup.policy.ts`, `trades.execution.service.ts` 등). 런타임 의존 아님.

KEEP_BACKEND (런타임):

- `services/api-nest/**`
- `services/engine-rust/**`
- `services/ai-platform` `feature-platform` `market-intelligence` `memory-service` `shadow-replay-engine` `simulation-engine` `user-twin-service` `marketing-attribution`
- `packages/schemas` `packages/observability`
- `schemas/*.v1.json`
- `supabase/migrations/**`
- `workers/` (프록시 제외하고 어댑터·스위퍼·푸시)
- `tooling/verify` 백엔드 스크립트 · `tooling/security` · `tooling/deploy` 중 API/워커 · `tooling/engine-acceptance`
- `infra/api` `infra/r2` `infra/*.manifest.json`

`packages/sdk`: 백엔드 비참조. 고객 웹 계약 클라이언트. **PR #222  overlapped → BLOCKED (유지).**

---

## 14. 백엔드 테스트 픽스처

| path | 역할 | 분류 |
|---|---|---|
| `tooling/verify/fixtures/**` | 마이그레이션 적용 목록, UI typecheck negative 등 | KEEP_BACKEND (백엔드 픽스처) / UI negative는 삭제 후보 |
| `tooling/verify/fixtures/migrations-applied.v1.json` | 적용 버전 감사 | KEEP_BACKEND — **#222가 수정 중. 이 브랜치에서 편집 금지** |
| `tooling/verify/fixtures/packages-ui-typecheck-negative.fixture.tsx` | UI tsc 네거티브 | DELETE_AFTER_REFERENCE_CHECK |
| `services/engine-rust/testdata/**` | R1–R10 골든 | KEEP_BACKEND |
| `services/api-nest/**/*.runtime.test.ts` | Nest 런타임 | KEEP_BACKEND |
| `packages/sdk/src/**/*.test.ts` | SDK 계약 테스트 | BLOCKED (#222) |

---

## 15. API 계약 문서

`origin/main`에 `quality/` 없음. 계약 권위는 코드+스키마:

| path | 역할 | 분류 |
|---|---|---|
| `schemas/*.v1.json` | 요청/응답/원장 계약 | KEEP_BACKEND |
| `services/api-nest/src/**/*.routes.ts` | 경로 테이블 | KEEP_BACKEND |
| `packages/sdk/src/**/fetch.ts` | 고객 웹이 호출하는 경로 미러 | BLOCKED (유지, #222) |
| `governance/engine-acceptance/acceptance-contract.v1.md` | 엔진 수락 | KEEP_BACKEND |
| `packages/ui/canon/contracts/*.md` | **시각** 계약 | MOVE_TO_CUSTOMER_WEB / DELETE_AFTER_REFERENCE_CHECK |
| `quality/customer-web-contract-p0.md` | #222가 추가할 P0 계약 문서 | **이 브랜치에 없음. 생성/덮어쓰기 금지** |

상세 경로는 `quality/backend-api-contract-map.md`.

---

## 16. DB 마이그레이션 (`origin/main`)

`supabase/migrations/` 53개. 전부 **KEEP_BACKEND**. prod apply 금지. #222가 추가할 2개(`20260910083000_oauth_pending_signup.sql`, `20260910090000_user_profile_gender.sql`)는 이 브랜치에 없음 — **추가하지 않음**.

대표:

- identity/auth: `20260808205844_identity_nest_auth.sql` `20260808224856_auth_oauth_passkey_stage_a_b.sql`
- ledger/wallet: `20260808205846_*` `20260808205848_*` `20260808234957_*` `20260809001004_withdraw_stepup_auth.sql` `20260811062000_idempotency_*` `20260811062100_ledger_outbox_*` `20260901224000_withdraw_stepup_token_single_use.sql` `20260902155632_withdraw_broadcast_tron.sql`
- KYC: `20260809000351_kyc_decision_audit.sql`
- matching/membership: `20260809101114_user_membership_match_policy.sql` `20260820013000_match_results.sql`
- admin ops: `20260823160000`–`20260823210000` (audit, kill switch, overrides, ops intents, match controls, policy versions)
- `20260902032000_production_schema_parity.sql`

확인: `git ls-tree --name-only origin/main supabase/migrations/`.

---

## 17. Auth / Ledger / Wallet / KYC / Matching / Membership / Benefits / Notification

모두 `services/api-nest/src/**` — **KEEP_BACKEND**.

| 영역 | 경로 | 비고 |
|---|---|---|
| Auth | `src/auth/**` `jwt.core.cjs` `auth-rate-limit.cjs` | JWT + 쿠키 `aipo_session`. Supabase Auth 없음 |
| Admin auth | `src/common/admin-auth.controller.ts` `admin-session.controller.ts` | 어드민 **API**. 화면 아님 |
| Ledger | `src/ledger/**` `ledger-user-query.core.cjs` | 복식 · 유저 GET `/me/ledger` |
| Wallet | `src/wallet/**` | 입금/출금/step-up/idempotency |
| KYC | `src/compliance/**` | 업로드/상태/어드민 승인. #222가 업로드 거절 강화 — 이 브랜치에서 수정 금지 |
| Matching | `src/opportunities/**` `src/trades/**` `src/match-control/**` `src/execution-policy/**` `services/engine-rust/**` | 엔진+ Nest |
| Membership | `src/membership/**` | 유저 GET `/me/membership` + 어드민 override |
| Benefits | `src/missions/**` | GET `/me/benefits` |
| Notification | `src/inbox/**` `src/push/**` | inbox + web-push + ops-inbox |
| Health | `src/health*.ts` | GET `/health` (prefix 밖). #222 필드 추가 예정 |

`origin/main` `app.module.ts` imports: Common, Events, Ledger, Wallet, Growth, HomeRead, Compliance, Risk, Referral, Mission, Opportunities, Trades, ExecutionPolicy, Membership, Inbox, UserUxPrefs, Push, Loop, Adapters, Simulation, Ai, Auth, AdminAudit, KillSwitch, AdminOps, MatchControl, SourcePolicy.  
`ProductOnboarding`/`MatchingPolicy`/`UsersAdmin`는 **main에 없음** (다른 브랜치 잔여). 이 인벤토리에 런타임으로 넣지 않음.

---

## 18. Ops / security / recovery 문서

| path | 분류 |
|---|---|
| `docs/ops/**` `docs/CONSTITUTION_BOOTSTRAP.md` | KEEP_BACKEND |
| `governance/security/**` (`AUDIT_EXCEPTIONS.md`, `dependency-audit.v1.json`, headers, action pins) | KEEP_BACKEND |
| `governance/recovery/**` | KEEP_BACKEND |
| `governance/release-master/**` `governance/release-inventory/**` `governance/engine-acceptance/**` | KEEP_BACKEND |
| `tooling/security/**` | KEEP_BACKEND |
| `governance/admin/**` | KEEP_BACKEND (어드민 **정책** API 계약). 화면 재구현 자료로 쓰지 말 것 |

---

## 19. 레거시 UI/어드민 문서

| path | 분류 |
|---|---|
| `packages/ui/canon/contracts/**` | MOVE_TO_CUSTOMER_WEB / DELETE_AFTER_REFERENCE_CHECK |
| `governance/platform-redesign/**` `governance/consumer-acquisition/**` | 화면 리디자인 — DELETE_AFTER_REFERENCE_CHECK 또는 고객웹. 홈 승인 JSON은 KEEP 증거 |
| `governance/pwa/**` `governance/responsive/**` `governance/performance/**` | 화면 — DELETE_AFTER_REFERENCE_CHECK (PWA 서버 계약 `push` 스키마는 KEEP) |
| `governance/figma/**` `governance/visual-reconciliation/**` | DELETE_AFTER_REFERENCE_CHECK |
| `apps/web/AGENTS.md` Next 스텁 | DELETE_AFTER_REFERENCE_CHECK |

---

## 20. 웹/어드민 때문에 도는 CI 스텝

**항상(게이트 본체, 백엔드):** `gate.yml` A3 lock · A4 withdraw · REL-402 audit · adapter machine auth · REL-405..408 · REL-222/223/224 (어드민 **API**) · REL-501..508 · cargo test · `pnpm verify:gate` → T0 always + T1 backend extras + `api-nest-build`.

**T0 always가 웹을 강제:** `stack-lock.cjs`가 `apps/web` `apps/admin` `packages/ui` 파일 존재 검사. UI 트리 삭제 전 이 검사를 백엔드 전용으로 바꾸는 **별도 커밋** 필수.

**T1 (`origin/main`):** `gate-tiers.cjs`의 `T1_PUSH`가 **매 푸시마다** `ia-tabs` `admin-routes` `next-major-pin` `tailwind-v4` `lux-theme-sync` `opennext-workers-origin` 등을 실행한다. `#221`에만 있는 `t1-by-path.cjs` 프론트 제외 로직은 이 베이스에 없다.

**T0 domainSteps:** `apps/web/**` 변경(삭제 diff 포함) 시 `web-lint` 등 경로 매핑이 실행됨. 삭제 커밋 전에 `domain-by-path.cjs` 절단 필요.

**별도 UI 워크플로:** lighthouse, spark-global-ui-qa, consumer-spark-worldclass, critical-axe, critical-cross-browser — 화면 전용.

**배포:** `deploy-cloudflare.yml` surface=web/ops 는 화면. workers는 백엔드.

---

## 21. 패키지/서비스 분류 총표

| path | 분류 | 삭제 가능 |
|---|---|---|
| `services/api-nest` | KEEP_BACKEND | 아니오 |
| `services/engine-rust` | KEEP_BACKEND | 아니오 |
| `services/ai-platform` `feature-platform` `market-intelligence` `memory-service` `shadow-replay-engine` `simulation-engine` `user-twin-service` `marketing-attribution` | KEEP_BACKEND | 아니오 |
| `packages/schemas` `packages/observability` | KEEP_BACKEND | 아니오 |
| `packages/sdk` | BLOCKED (PR #222) | 아니오 |
| `packages/ui` | DELETE_AFTER_REFERENCE_CHECK (브랜드 REVIEW) | 참조 절단 후 |
| `apps/web` | MOVE_TO_CUSTOMER_WEB | 참조 절단 후 이 레포에서 제거 |
| `apps/admin` | MOVE_TO_FUTURE_ADMIN / DELETE_AFTER_REFERENCE_CHECK | 참조 절단 후. 화면 재사용 금지 |
| `workers/*-adapter` `chain-*` `push-dispatcher` `api-stub` `_shared` | KEEP_BACKEND | 아니오 |
| `workers/web-proxy` `workers/ops-proxy` | REVIEW_REQUIRED | 아니오 |
| `supabase/migrations` | KEEP_BACKEND | 아니오 |
| `schemas/` | KEEP_BACKEND | 아니오 |

---

## 22. Stage 1 결론 (삭제 실행 없음)

1. 정리 베이스는 `origin/main` `c4ebcd87`이다. PR #221 워크스페이스에서 삭제/커밋하지 않는다.
2. PR #222(40 files)와 파일 겹침 없이 `apps/web`·`apps/admin`·`packages/ui`를 제거할 **계획**은 가능하다.
3. **지금 삭제하면 T0 `stack-lock`이 FAIL**한다. 참조 절단 커밋이 선행되어야 한다.
4. `packages/sdk`, Nest auth/KYC/ledger/health, 해당 마이그레이션·verify는 #222 영역 → **BLOCKED**.
5. 운영 웹/ops 배포 매니페스트·프록시는 역할 미확정 → **삭제 금지**.
6. Storybook 없음. Tailwind/Next는 화면 앱에만 있다.
7. 백엔드는 `@aipo/ui`를 쓰지 않는다.

다음: `quality/backend-only-deletion-plan.md` 순서대로 참조 절단 후 삭제.
