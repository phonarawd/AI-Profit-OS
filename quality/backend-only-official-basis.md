# 백엔드 전용 레포 전환 — 공식 기준 조사 (1단계)

- 기준 커밋: `86f159648578be7031f58393f3f011c8c249433f` (branch `chore/backend-only-repository` · PR #223)
- 조사일: 2026-09-11 · 근거는 아래 공식 문서 URL을 WebFetch/GitHub API로 실제 열어 확인한 내용만 사용 (블로그·AI 답변 0)
- 관련 산출물: `quality/backend-file-ownership.json` · `quality/backend-dependency-graph.json` (생성기 `tooling/backend/ownership-graph.cjs`) · `quality/backend-deletion-ledger.md` · `quality/backend-residual-report.md`

## 0. 읽는 법

각 절의 표는 다음 5열이다: **공식 문서 URL · 현재 레포 상태 · 적용한 결정 · 적용하지 않은 이유 · 검증 방법**. 후속 단계(6단계 CI 교체 · 8단계 패키지 정리 · 9단계 Cloudflare 잔재)는 이 표의 결정과 절차를 그대로 따른다.

## 1. GitHub Actions workflow syntax

공식: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax (확인 절: `jobs.<job_id>.needs` · `jobs.<job_id>.if` · `concurrency` · `jobs.<job_id>.timeout-minutes` · `jobs.<job_id>.strategy` · `on.<push|pull_request>.<paths|paths-ignore>` · `permissions`)

| 항목 | 공식 문서 내용 (확인) | 현재 레포 상태 | 적용한 결정 | 적용하지 않은 이유 | 검증 방법 |
|---|---|---|---|---|---|
| `jobs.<job_id>.needs` | 선행 job 성공 필수 · 실패/skip 시 의존 job도 skip · `if: always()`로 강제 실행 가능 | `engine-acceptance.yml` qa2→qa1, qa-matrix→qa2, aggregator(`if: always()`) · `engine-acceptance-heavy.yml` qa4→qa5→qa6→qa7(조건)→qa8 | 백엔드 workflow의 needs 체인은 그대로 유지 · UI workflow는 job 자체가 echo no-op이므로 needs 재설계 없이 파일 삭제 | 삭제 대상 workflow(consumer-spark-worldclass · critical-axe · critical-cross-browser · spark-global-ui-qa)는 needs를 쓰지 않아 대체 체인이 필요 없음 | `quality/backend-file-ownership.json` `workflows[].jobs[].needs` · 6단계 후 `gh workflow view <name>` |
| `concurrency` | 같은 group의 run은 1개만 진행 · `cancel-in-progress` | `gate.yml` `gate-${{ github.ref }}` cancel-in-progress=true · deploy/engine/release workflow는 cancel-in-progress=false | `backend-required` workflow(6단계)에도 `concurrency: gate-${{ github.ref }}` + cancel-in-progress=true 유지 | 배포·수락 workflow는 취소 시 반쪽 아티팩트가 남으므로 false 유지 | workflow YAML diff 리뷰 · `gh run list --workflow gate.yml` 동시 run 1개 확인 |
| `timeout-minutes` | job 기본 360분 · 명시 권장 | 18개 workflow 중 `engine-evidence-refresh-check.yml` `evidence-only` job과 `release-integration-contract.yml` `release-contract-static` job만 timeout 미지정 | 6단계에서 두 job에 `timeout-minutes` 추가 (백엔드 static 검증 = 10~15분) | 이 단계는 조사만 · workflow 수정은 6단계 | `workflows[].jobs[].timeoutMinutes` null 항목 0 확인 |
| `jobs.<job_id>.if` | matrix 적용 전 평가 · `!`로 시작하면 `${{ }}` 필수 | `deploy-cloudflare.yml` `if: inputs.target == 'production'` 등 · `engine-acceptance.yml` `inputs.qa_phase` 분기 | `surface=web|ops` 분기 step 제거 시 `if` 표현식만 삭제 (`workers|all`만 남김) | - | YAML 파서 `parseWorkflow` 결과의 `if` 필드 diff |
| `strategy.matrix` · `fail-fast: false` | 실패 후 나머지 셀 계속 | `engine-acceptance.yml` `qa-matrix` (suite QA3~QA8 · fail-fast false) | 유지 (백엔드 엔진 수락) | - | `workflows[].jobs[].strategy` |
| `paths` 필터 | glob 매칭 · 삭제된 경로 필터는 트리거만 안 함 | `ebay-fault-injection.yml` · `engine-acceptance.yml` · `engine-evidence-refresh-check.yml` · `release-integration-contract.yml`이 paths 사용 · `release-integration-contract.yml`의 paths에 `tooling/e2e/specs/critical-cross-browser.spec.cjs`·`.github/workflows/critical-cross-browser.yml`(삭제 대상) 포함 | 6단계에서 삭제되는 경로를 paths 목록에서 제거 | 존재하지 않는 경로가 남아도 문법 오류는 아니지만 죽은 필터는 잔재 | 생성기 `missing:` 노드 0 확인 |
| `permissions` | 최소 권한 · 워크플로/job 단위 | 18개 중 `engine-acceptance.yml`만 `permissions` 미선언(기본값) · 나머지는 `contents: read`(codeql은 job에 `security-events: write`, finalize-once는 `contents: write`) | 6단계에서 `engine-acceptance.yml`에 `permissions: contents: read` 추가 검토 — 단 이 파일은 `acceptance_workflow_hash`로 동결(POST_QA0_CONTROLLED_WORKFLOW_AMENDMENT_V1) | 해시 동결 파일은 L7 amendment(`tooling/engine-acceptance/amend-acceptance-workflow-hash.cjs`) 없이 수정 금지 | `tooling/verify/engine-acceptance.cjs` PASS 유지 |

## 2. GitHub rulesets · required status checks

공식: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets · https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets (`Require status checks to pass before merging` · strict/loose) · https://docs.github.com/en/rest/repos/rules (`GET/PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}`)

### 2.1 GitHub 현재 상태 (2026-09-11 · `gh api` 읽기 재확인)

- classic branch protection: `main` 없음 (404).
- 룰셋 `main-gate-required` id `20576556` active · include `refs/heads/main` · rules: `deletion` · `non_fast_forward` · `required_status_checks` (`strict_required_status_checks_policy: true` · `do_not_enforce_on_create: true` · contexts `[verify-gate]`) · `pull_request` (`required_approving_review_count: 0` · `require_extra_approval_for_unattributed_changes: true`) · bypass `RepositoryRole 5 always` · updated_at `2026-08-21`.
- 룰셋 `release-train-rel502-gate-required` id `21919415` active · include `refs/heads/release/train-production-v1` + `refs/heads/release/auth-wallet-rel502-v1-20260828` · 같은 규칙.
- 계정 권한 admin=true (bypass always).
- **드리프트 (6단계 실측):** 라이브 룰셋 20576556 context 는 여전히 `verify-gate`. 레포 초안 tooling/github/main-gate.ruleset.json context 는 `backend-required` (라이브 PUT 0). 옛 드리프트는 파일 `gate / verify-gate` vs 라이브 `verify-gate`. apply-main-gate.ps1 은 AIPO_APPLY_LIVE_RULESET=1 없으면 exit 1. rust-engine/release-evidence 가 같은 SHA 에서 Founder red 이면 PUT 금지.

| 항목 | 공식 문서 내용 (확인) | 현재 레포 상태 | 적용한 결정 | 적용하지 않은 이유 | 검증 방법 |
|---|---|---|---|---|---|
| required status check 이름 | `required_status_checks[].context` = 커밋에 보고되는 status check context 이름 · Actions job은 job 이름으로 보고 | required context `verify-gate` = `gate.yml`의 job id `verify-gate` | `backend-required`로 전환 시 새 workflow의 **job id**를 `backend-required`로 만들고 룰셋 context를 같은 문자열로 교체 · 전환 순서: (1) 새 job이 main PR에서 최소 1회 성공 보고 → (2) `PUT` 으로 context 교체 → (3) 옛 job 삭제 | 이 단계는 push/룰셋 변경 없음 | `gh api repos/phonarawd/AI-Profit-OS/rulesets/20576556 --jq '.rules[] \| select(.type=="required_status_checks")'` |
| strict vs loose | strict = 베이스 최신 상태 요구(기본) | strict=true | 유지 (main 합격 = CI T2 green 원칙과 일치) | - | 위 jq 출력 `strict_required_status_checks_policy` |
| 규칙 계층 | 여러 룰셋은 합산 · 가장 엄격한 규칙 적용 | main 룰셋 1개 + release-train 룰셋 1개(다른 ref) | `release/*` 룰셋은 백엔드 release train용이므로 그대로 둠 · context 교체는 두 룰셋 모두 필요 | - | 두 ruleset id 모두 `PUT` 대상으로 6단계 체크리스트에 명시 |
| REST 갱신 | `PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}` body에 `name·target·enforcement·bypass_actors·conditions·rules` · `rules`는 **배열 전체**를 보냄(부분 갱신 없음) · `required_status_checks.parameters.required_status_checks[]`·`strict_required_status_checks_policy` 필수 | `tooling/github/apply-main-gate.ps1`이 `gh api -X PUT ... --input main-gate.ruleset.json`으로 전체 body를 보냄 (형식은 공식과 일치 · 내용은 드리프트) | 6단계 절차: `main-gate.ruleset.json`의 context를 `backend-required`로, `deletion·non_fast_forward·pull_request` 규칙은 라이브 JSON 그대로 복사 후 `PUT` · 응답 `.rules`로 검증 | - | `gh api -X PUT repos/phonarawd/AI-Profit-OS/rulesets/20576556 --input tooling/github/main-gate.ruleset.json` → `.rules[].type` 4개 + context 확인 |
| UI 이름 job 삭제 가능성 | required가 아닌 check는 삭제해도 merge 차단 없음 | `worldclass-ui` · `live-axe` · `full-product-web` · `full-product-admin` · `consumer-engines` · `admin-chromium` · `webkit-home-session` · `leftover-race` · `strict-webkit` · `admin-spark-qa`는 룰셋 context가 아님 | 해당 workflow 파일 삭제 (6단계) — required check 이름 유지 필요 없음 | 과거 문서(`quality/backend-only-inventory.md`)의 REVIEW_REQUIRED는 라이브 룰셋 확인으로 해소 | 위 ruleset jq 결과에 해당 이름 0 |

## 3. GitHub Actions secure use

공식: https://docs.github.com/en/actions/reference/security/secure-use

| 항목 | 공식 문서 내용 (확인) | 현재 레포 상태 | 적용한 결정 | 적용하지 않은 이유 | 검증 방법 |
|---|---|---|---|---|---|
| `GITHUB_TOKEN` 최소 권한 | 기본 read-only 권장 · job별 상향 | 17/18 workflow `permissions: contents: read` (codeql job `security-events: write` · finalize-once `contents: write`) · `engine-acceptance.yml` 미선언 | 6단계 신설 `backend-required`도 `permissions: contents: read` | `engine-acceptance.yml`은 해시 동결 → amendment 절차 없이 수정 금지 | `workflows[]` permissions grep · `tooling/verify/workflow-action-pin.cjs` |
| 액션 full-length SHA pin | SHA pin이 유일한 immutable 참조 | 17/18 workflow SHA pin(`# v6` 주석) · `engine-acceptance.yml`만 `@v6`/`@v4` 태그 32건 (`workflows[].unpinnedUses`) | `governance/security/workflow-action-pins.v1.json` + `workflow-action-pin.cjs` 유지 · engine-acceptance는 amendment 대상으로 기록 | 해시 동결 파일 | `pnpm verify:workflow-action-pin` |
| `pull_request_target`·`workflow_run` 주의 | 신뢰되지 않은 코드 checkout 금지 | `release-acceptance.yml`이 `workflow_run`(engine-acceptance 완료) 사용 · fork PR checkout 없음 · `workflow_dispatch` 이벤트만 판정 | 유지 | - | `on.workflow_run.workflows` 값과 `if:` 조건 리뷰 |
| 스크립트 인젝션 | 컨텍스트 값은 env로 전달 | `deploy-cloudflare.yml`이 `${{ inputs.* }}`를 `run:` 인라인에 직접 사용 (`--check-surface "${{ inputs.worker_set }}"` 등) | 6단계 SPLIT 시 `inputs.*`를 `env:`로 옮김 | 이 단계는 수정 없음 | 6단계 diff |

## 4. pnpm workspace · filter · install

공식: https://pnpm.io/workspaces (`pnpm-workspace.yaml` 필수 · `workspace:` 프로토콜) · https://pnpm.io/filtering (`--filter <name>` · `<name>...` 의존 포함 · `{dir}` glob · `failIfNoMatch`) · https://pnpm.io/cli/install (`--frozen-lockfile`: CI 기본 true · lockfile 불일치 시 실패) · https://pnpm.io/installation (Node/pnpm 호환표: pnpm 10 = Node 18/20/22/24/26)

| 항목 | 공식 문서 내용 (확인) | 현재 레포 상태 | 적용한 결정 | 적용하지 않은 이유 | 검증 방법 |
|---|---|---|---|---|---|
| `pnpm-workspace.yaml` `packages` | glob 목록으로 워크스페이스 프로젝트 정의 | `packages/*` `services/*` `workers/*` `tooling/*` (apps/* 이미 제거) | 유지 · `packages/*`는 sdk MOVE·schemas DELETE 후 `packages/observability`만 남으므로 glob 유지 가능 | glob을 개별 경로로 바꿀 필요 없음 | `pnpm ls -r --depth -1` 프로젝트 목록 |
| `--filter <name>...` | 이름 + 모든 의존(workspace) 선택 | `release-build.yml` `pnpm --filter @aipo/api-nest... build` (Nest + 7개 @aipo/* 서비스) · 같은 파일의 `pnpm --filter @aipo/web build:cf` · `@aipo/admin build:cf`는 **존재하지 않는 패키지** | 6단계에서 `@aipo/web`·`@aipo/admin` 필터 step 제거 · api-nest 필터 유지 | `failIfNoMatch` 기본 false라 CI가 조용히 통과할 수 있으나 후속 `test -f apps/web/.open-next/worker.js`가 실패 → 현재 release-build.yml은 실행 불가 상태 | `pnpm --filter @aipo/web --fail-if-no-match ls` → 비제로 종료 확인 |
| `--frozen-lockfile` | lockfile 갱신 필요 시 설치 실패 · CI 기본 | 모든 workflow `pnpm install --frozen-lockfile` | 유지 · 8단계 devDependency 제거(`axe-core`·`jsdom`·`@axe-core/playwright`·`@playwright/test`) 후 lockfile 재생성 커밋 필수 | - | 로컬 `pnpm install --frozen-lockfile` PASS 후 CI |
| `workspace:*` 의존 | 로컬 패키지 강제 | `services/api-nest/package.json` 7개 `workspace:*` · `packages/sdk`는 어느 package.json에서도 의존되지 않음 (그래프 `pkg-dep` edge 0) | sdk MOVE 시 workspace 영향 0 | - | `quality/backend-dependency-graph.json`에서 `to: packages/sdk/package.json` & kind `pkg-dep` = 0 |
| Node/pnpm 호환 | pnpm 10.x는 Node 22 지원 | `packageManager pnpm@10.14.0` · engines node `>=22.14 <23` | 유지 | pnpm 11/12 업그레이드는 스택 잠금(ADR) 변경 → 범위 밖 | `pnpm -v` 10.14.0 · `node -v` v22.14.0 |

## 5. NestJS monorepo/workspace 빌드

공식: https://docs.nestjs.com/cli/monorepo (원문 = `nestjs/docs.nestjs.com` `content/cli/workspaces.md` · standard mode vs monorepo mode · `nest-cli.json` `projects` · `tsConfigPath`) — SPA 렌더 페이지라 GitHub 공식 저장소의 동일 문서를 읽어 확인. NestJS 릴리스: https://github.com/nestjs/nest/releases (v11.2.x 유지보수 · v12.0.0 2026-08-27 · Node 20.19+/22.12+)

| 항목 | 공식 문서 내용 (확인) | 현재 레포 상태 | 적용한 결정 | 적용하지 않은 이유 | 검증 방법 |
|---|---|---|---|---|---|
| standard vs monorepo mode | `nest-cli.json`이 있어야 Nest CLI 모드 · 없으면 일반 `tsc` 프로젝트 | `services/api-nest`는 `nest-cli.json` 없음 · `build: tsc -p tsconfig.json` · `tsconfig include src/**` exclude `*.runtime.test.ts` | Nest CLI monorepo 모드 도입하지 않음 (pnpm workspace + tsc가 이미 빌드 SSOT) | Nest 문서의 monorepo 모드는 Nest CLI 전용 · 이 레포는 pnpm workspace가 상위 | `pnpm --filter @aipo/api-nest build` → `dist/main.js` |
| Nest 버전 | 11.2.x 현재 라인 · 12.0.0(ESM · Node 22.12+) 출시 | `@nestjs/*` `^11.1.5` | 유지 (Nest 12 마이그레이션은 별도 ADR) | 백엔드 전용 전환과 무관한 메이저 업그레이드 | `pnpm ls @nestjs/core` |
| 빌드 산출물 provenance | - | `tooling/release/api-artifact-provenance.cjs` · `nest-production-provenance.cjs` | 유지 (KEEP) | - | `pnpm verify:api-artifact-provenance` |

## 6. Cloudflare Workers Builds · Wrangler 설정

공식: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ (Build command · Deploy command 기본 `npx wrangler deploy` · Root directory · 비프로덕션 브랜치 `wrangler versions upload`) · https://developers.cloudflare.com/workers/wrangler/configuration/ (`name`·`main`·`compatibility_date` 필수 · `routes[].custom_domain` · Environments 상속 · `assets`는 non-inheritable) · https://developers.cloudflare.com/workers/wrangler/ · https://developers.cloudflare.com/workers/wrangler/deprecations/ (Wrangler v4 · `wrangler pages publish` 제거)

| 항목 | 공식 문서 내용 (확인) | 현재 레포 상태 | 적용한 결정 | 적용하지 않은 이유 | 검증 방법 |
|---|---|---|---|---|---|
| Workers Builds root/build/deploy | Git 연결 시 Root directory로 모노레포 하위 프로젝트 격리 · 빌드 명령 선택 · 배포 기본 `npx wrangler deploy` | 레포는 Workers Builds(Git 연결)를 쓰지 않고 GitHub Actions `deploy-cloudflare.yml` → `tooling/deploy/cf-workers.cjs`(wrangler CLI)로 배포 · `provision-ebay-adapter-secrets.yml` | Workers Builds 도입하지 않음 (현재 배포 경로 유지) · 9단계에서 web/ops surface만 제거 | 배포 경로 변경은 ADR 필요 | `deploy-cloudflare.yml` `surface` 입력에 `web|ops` 0 확인 (6단계 후) |
| `main` · `assets.directory` | `main` = 엔트리 · `assets`는 env별 재선언 | `infra/web/wrangler.toml` main `../../apps/web/.open-next/worker.js` · `infra/ops/wrangler.toml` main `../../apps/admin/.open-next/worker.js` → **소스가 삭제되어 `deleted:` 노드** (그래프 `wrangler-main` edge) | 두 파일 DELETE (9단계) · 백엔드 worker 13개(`workers/*/wrangler.toml`)는 main이 `src/index.ts`로 존재 | - | 그래프에서 `deleted:apps/...` 노드 0 (9단계 후) |
| `routes[].custom_domain` | 커스텀 도메인 라우트 | `workers/web-proxy` (`app.hiptk.app`·`hiptk.app`·`go.hiptk.app`) · `workers/ops-proxy` (`ops.hiptk.app`) · `workers/api-stub` (`api.hiptk.app`) | api-stub KEEP · web-proxy MOVE(putduk-web가 app/apex/go 라우팅 소유) · ops-proxy DELETE · **원격 Worker 삭제/라우트 해제는 9단계 원격 작업**(이 단계는 코드 판정만) | 원격 Cloudflare 조회는 후속 단계 | `wrangler deployments list --name hiptk-web-proxy` 등 (9단계) |
| Environments 상속 | 최상위 키 상속 · `vars`/bindings 비상속 | `[env.production]`/`[env.preview]` 사용 · `infra/domain.manifest.json` `openNext.staging.wranglerEnv=preview` | domain.manifest는 SPLIT: `openNext`·`pages`·`bridgeWorkers.web-proxy/ops-proxy` 키 제거 · `env.API_HOST`·`bridgeWorkers.api-stub`·`cloudflare` 유지 | - | `verify:cf-infra`·`domain-bootstrap` 개정 후 PASS |
| Wrangler 버전 | v4 라인 · `pages publish` 등 v3 명령 제거 | 루트 devDependency `wrangler ^4.120.0` · `@cloudflare/workers-types ^5.20260809.1` | 유지 | - | `pnpm exec wrangler --version` |

## 7. Supabase migration workflow

공식: https://supabase.com/docs/guides/deployment/database-migrations (migration new/up · `supabase db push` · 원격 직접 수정 금지 · `supabase_migrations.schema_migrations` 추적 · `migration repair`) · https://supabase.com/docs/reference/cli/supabase-db-push (`--dry-run` · `--include-all` · `--linked`/`--db-url` · 첫 실행 시 history 테이블 생성)

| 항목 | 공식 문서 내용 (확인) | 현재 레포 상태 | 적용한 결정 | 적용하지 않은 이유 | 검증 방법 |
|---|---|---|---|---|---|
| migration 파일 = SSOT | 원격 스키마 변경은 migration 파일로만 · `db push`가 미적용분만 순서 적용 | `supabase/migrations/*.sql` 54개 · `supabase/config.toml` project_id `mgsytcetsiecllmhcyox` · `supabase/staging/*.sql` 5개(하드닝 리허설) | 전부 KEEP (BACKEND_INFRA) · 이 단계에서 apply 0 | 운영 DB 불변 원칙 | `pnpm verify:migrations-applied-parity` (fixture `tooling/verify/fixtures/migrations-applied.v1.json`) |
| `db push --dry-run` | 적용 전 변경 목록 확인 | `MIGRATION_READINESS.md` · `rel-504-migration-readiness.cjs`가 readiness 판정 | 후속 마이그레이션 적용은 `--dry-run` → 검토 → `db push` 순서로 runbook에 고정 (`tooling/migrations/` 신설 예정) | 이 단계 범위 밖 | runbook 문서 존재 확인 |
| history 불일치 복구 | `supabase migration list` → `migration repair --status applied|reverted` | `governance/db-recon/**` · `live-schema-forensic.cjs` | KEEP | - | `pnpm verify:db-recon-inventory` |

## 8. 런타임·툴체인 지원 정책

공식: https://nodejs.org/en/about/previous-releases + https://raw.githubusercontent.com/nodejs/Release/main/README.md (Node 22 Jod = Maintenance LTS · EOL 2027-04-30 · Node 24 Active LTS) · https://github.com/nestjs/nest/releases (v11.2.3 2026-08-25 · v12.0.0 2026-08-27) · https://pnpm.io/installation (pnpm 10 ↔ Node 22 지원표 · pnpm 12 = latest) · https://developers.cloudflare.com/workers/wrangler/ (Wrangler v4)

| 도구 | 레포 핀 | 공식 지원 상태 (확인) | 적용한 결정 | 적용하지 않은 이유 | 검증 방법 |
|---|---|---|---|---|---|
| Node.js | `>=22.14.0 <23` (`.node-version` · `.nvmrc` · workflows `node-version: 22`) | 22.x Maintenance LTS (2025-10-21~2027-04-30) · 24.x Active LTS | 유지 · Node 24 이행은 스택 잠금 ADR 이후 | 백엔드 전용 전환 범위 밖 | `node -v` |
| NestJS | `@nestjs/* ^11.1.5` | 11.2.x 유지보수 릴리스 진행 중 · 12는 ESM 기본 | 유지 | 메이저 마이그레이션 별도 | `pnpm ls @nestjs/core` |
| pnpm | `pnpm@10.14.0` | pnpm 10 = Node 22 지원 · 12가 latest | 유지 | 스택 잠금 | `pnpm -v` |
| Wrangler | `^4.120.0` | v4 현행 · v3 deprecated 명령 제거됨 | 유지 | - | `pnpm exec wrangler --version` |
| Rust | `rust-toolchain.toml` (gate.yml toolchain 1.85.0) | - | 유지 (engine-rust) | - | `cargo check --locked` (CI) |

## 9. 후속 단계가 그대로 따르는 절차 (요약)

### 9.1 required check `verify-gate` → `backend-required` 전환 (6단계)

1. `.github/workflows/gate.yml`의 job id는 `verify-gate`이고 룰셋 context도 `verify-gate`다. 새 백엔드 workflow(또는 gate.yml 개정)에서 job id를 `backend-required`로 만든다. 룰셋 context는 커밋에 보고되는 check 이름과 문자열이 같아야 한다(available-rules 문서). 현재 실측: job id `verify-gate`(name 미지정) → context `verify-gate`. 같은 방식이 유지되도록 새 job에도 `name:`을 붙이지 않고 job id를 그대로 쓴다.
2. 새 job이 `main` 대상 PR에서 최소 1회 성공을 보고할 때까지 옛 job을 삭제하지 않는다 (strict policy 때문에 컨텍스트가 하나도 보고되지 않으면 merge 불가).
3. `tooling/github/main-gate.ruleset.json`을 라이브 룰셋(`gh api repos/phonarawd/AI-Profit-OS/rulesets/20576556`) 기준으로 재작성한다 — `rules` 배열은 부분 갱신이 없으므로 `deletion` · `non_fast_forward` · `required_status_checks` · `pull_request` 4개를 전부 담는다. context만 `backend-required`로 바꾼다.
4. `gh api -X PUT repos/phonarawd/AI-Profit-OS/rulesets/20576556 -H "Accept: application/vnd.github+json" --input tooling/github/main-gate.ruleset.json` 실행 후 응답의 `.rules[] | select(.type=="required_status_checks")`로 context를 확인한다. `release-train-rel502-gate-required`(id 21919415)도 같은 body(conditions만 다름)로 갱신한다.
5. 옛 `verify-gate` job 삭제 → PR CI green → merge.

### 9.2 UI 이름 workflow 삭제 (6단계)

`consumer-spark-worldclass.yml` · `critical-axe.yml` · `critical-cross-browser.yml` · `spark-global-ui-qa.yml` · `lighthouse.yml` · `deploy-staging.yml`은 required context가 아니다(§2.1). 파일 삭제만으로 끝나며, `release-integration-contract.yml`의 `strict-webkit` job과 `gate.yml`의 `OpenNext build:cf` echo step은 같은 커밋에서 제거한다. `domain-by-path.cjs`의 workflow 경로 규칙(`critical-cross-browser.yml`·`critical-axe.yml`·`lighthouse.yml`)도 함께 지운다.

### 9.3 패키지 정리 (8단계)

`pnpm remove -w axe-core jsdom @axe-core/playwright` → 하네스 스펙 3개(`auth-rate-limit`·`ledger-user-query`·`money-red-team`)를 `node:test`로 옮긴 뒤 `pnpm remove -w @playwright/test` → `pnpm install` (lockfile 재생성) → `pnpm install --frozen-lockfile` 재확인 → 커밋. `pnpm.overrides`의 `sharp`/`multer`는 REL-402 감사 경로이므로 이 단계에서 건드리지 않는다.

### 9.4 Cloudflare 잔재 (9단계)

코드 판정: `infra/web` · `infra/ops` · `workers/ops-proxy` DELETE · `workers/web-proxy` + `workers/_shared/opennext-origin.ts` MOVE(putduk-web 인계 기록) · `infra/domain.manifest.json`·`hosts.manifest.json` SPLIT. 원격(Worker 삭제·custom_domain 해제·Pages 프로젝트 정리)은 코드 삭제 뒤 별도 승인으로 진행하고, 이 문서에서는 원격을 조회하지 않았다.

## 10. 이 조사에서 확인하지 않은 것 (명시)

- Cloudflare 계정의 실제 Worker/route 배포 상태 (9단계 원격 조회 대상).
- Supabase 원격 `schema_migrations` 실제 적용 목록 (운영 DB 불변 · `migrations-applied.v1.json` 픽스처만 신뢰).
- putduk-web 레포가 SDK·Canon·브랜드 자산을 이미 보유하는지 (MOVE 항목의 인계 확인은 후속 단계).
