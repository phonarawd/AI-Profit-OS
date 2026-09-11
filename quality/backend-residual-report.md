# Backend-only repo residual report

- Head SHA: `cc50e4cf971f2ba1510de9d57ffd30fad30fa6b1` · verdict **BACKEND_ONLY_CLEANUP_IN_PROGRESS**
- UNKNOWN **0** · REVIEW_REQUIRED **0**
- Docs keep: 129 (`quality/backend-doc-ownership.json`). markdown/ui-path boundary = 0.
- Remaining boundary: 26 (ownership SPLIT 24 + package sharp 1 + import _write-trade-license-html 1). Later stages / Founder.
- Next: 6th stage CI/ruleset + putduk-web SHA. Do not declare READY.

---
# Backend-only repo residual report

- Head SHA: `5baa473503933ab9985a73fe265e068ebb7f6b94` · verdict **BACKEND_ONLY_CLEANUP_IN_PROGRESS**
- UNKNOWN **0** · REVIEW_REQUIRED **0**
- 5th stage: markdown/governance screen evidence removed. Remaining docs listed in `quality/backend-doc-ownership.json` (128).
- Next: 6th stage CI/ruleset + putduk-web SHA. Do not declare READY.

---
# 백엔드 전용 레포 — 잔여 보고서 (1단계)

- 기준 SHA: `86f159648578be7031f58393f3f011c8c249433f` · 생성 `2026-09-10T21:08:39.880Z` · 판정 **`BACKEND_ONLY_CLEANUP_IN_PROGRESS`**
- UNKNOWN **0** · REVIEW_REQUIRED **0** (모든 파일에 class·decision·근거가 있다. 판정 불가 항목은 수동 판정 테이블 `tooling/backend/ownership-overrides.json` 97건으로 닫았다)
- 재생성: `node tooling/backend/ownership-graph.cjs` · 드리프트 검사: `node tooling/backend/ownership-graph.cjs --check`

## 1. 최종 허용 경계(allowlist) 초안

아래 경계는 **실제 존재 경로**로 구체화했다. 경계 안에서도 DELETE/MOVE로 판정된 파일(예: `tooling/verify`의 UI 검증기, `workers/web-proxy`)은 잔여이며 후속 단계에서 제거된다. 경계 밖 파일은 §2에 전부 열거한다.

| allowlist 경계 (초안) | 현재 파일 | KEEP | SPLIT | DELETE/MOVE (경계 안에서 제거될 잔여) |
|---|---:|---:|---:|---:|
| `services/api-nest/**` | 336 | 336 | 0 | 0 |
| `services/engine-rust/**` | 13 | 13 | 0 | 0 |
| `services/{ai-platform,feature-platform,market-intelligence,memory-service,shadow-replay-engine,simulation-engine,user-twin-service,marketing-attribution}/**` | 88 | 88 | 0 | 0 |
| `packages/observability/**` | 1 | 1 | 0 | 0 |
| `schemas/*.json` | 82 | 82 | 0 | 0 |
| `supabase/** (config.toml · migrations · staging)` | 61 | 61 | 0 | 0 |
| `workers/** (web-proxy · ops-proxy · _shared/opennext-origin.ts 제외)` | 84 | 84 | 0 | 0 |
| `infra/api/** · infra/r2/** · infra/workers.manifest.json · infra/phase0-migration-playbook.md · infra/domain.manifest.json · infra/hosts.manifest.json (SPLIT 후)` | 8 | 6 | 2 | 0 |
| `tooling/backend/**` | 2 | 2 | 0 | 0 |
| `tooling/security/**` | 2 | 2 | 0 | 0 |
| `tooling/migrations/** (현재 없음 · 생성 예정 표기)` | 0 | 0 | 0 | 0 |
| `tooling/verify/** (KEEP·SPLIT 판정분만)` | 381 | 134 | 112 | 135 |
| `tooling/{engine-acceptance,ebay-resilience,release,recovery,deploy,seed,schemas,github,cleanup,lowspec,dev,cursor}/**` | 141 | 127 | 10 | 4 |
| `tooling/e2e/** (HTTP·in-process 하네스만)` | 80 | 11 | 1 | 68 |
| `tooling/pwa/** (push-dispatcher 하네스 · VAPID)` | 11 | 5 | 3 | 3 |
| `eval/*.jsonl` | 6 | 6 | 0 | 0 |
| `scripts/*.mjs` | 4 | 4 | 0 | 0 |
| `.github/** (백엔드 CI)` | 20 | 9 | 5 | 6 |
| `.husky · .vscode · .cursor/{hooks,rules,plans}` | 52 | 27 | 14 | 11 |
| `governance/** (백엔드 release evidence만)` | 399 | 159 | 0 | 240 |
| `docs/** · quality/** · CONSTITUTION/** · 루트 MD` | 49 | 32 | 8 | 9 |
| `루트 설정 (package.json · pnpm-workspace.yaml · pnpm-lock.yaml · .npmrc · .nvmrc · .node-version · rust-toolchain.toml · docker-compose.dev.yml · .env.example · .gitignore · .cursorignore · .markdownlint*)` | 14 | 10 | 4 | 0 |

경계 보충:

- `services/**` 10개 중 런타임 = `api-nest`(Nest · tsconfig include `src/**`) · `engine-rust`(Cargo crate) · api-nest `workspace:*` 의존 7개(`ai-platform` `feature-platform` `market-intelligence` `memory-service` `shadow-replay-engine` `simulation-engine` `user-twin-service`) · `marketing-attribution`(스켈레톤 · 8단계 재확인).
- 서버 계약 = `schemas/*.json` 82개 전부(BACKEND_CONTRACT · 78개는 런타임/KEEP 검증기 소비, 4개는 소비자 0 초안으로 8단계 재확인) + `packages/observability`(api-nest 런타임 require). `packages/sdk`는 서버 계약이 아니라 React 클라이언트(services/workers import 0)이므로 경계 밖(MOVE). `packages/schemas`는 소비자 0(stack-lock mustExist만)이라 경계 밖(DELETE).
- 백엔드 `workers/**` = 어댑터 7 · chain-watchers · chain-sweeper · push-dispatcher · marketing-capi-dispatcher · api-stub · `_shared/api-origin.ts` · `tsconfig.base.json` · `README.md`.
- 백엔드 `infra/**` = `api/*` · `r2/*` · `workers.manifest.json` · `phase0-migration-playbook.md` · (SPLIT 후) `domain.manifest.json` · `hosts.manifest.json`.
- 백엔드 테스트 = `services/**/*.runtime.test.ts` · `tooling/verify/*.cjs`(KEEP 판정) · `tooling/engine-acceptance/**` · `tooling/ebay-resilience/**` · `tooling/e2e/lib/{auth-rate-limit-harness,ledger-user-query-harness,money-mutation-gate,money-red-team,qa-env-isolation-guard}.cjs` + 스펙 3개 + `fixtures/qa-allowlist.v1.json` + `money/*` · `tooling/pwa/{pwa-push-badge,pwa-push-channel-filter}*` · `eval/*.jsonl` · `scripts/*.mjs`.
- 백엔드 CI = `gate.yml`(SPLIT) · `codeql.yml` · `engine-acceptance*.yml` · `engine-current-epoch-finalize-once.yml` · `engine-evidence-refresh-check.yml` · `ebay-fault-injection.yml` · `provision-ebay-adapter-secrets.yml` · `release-acceptance.yml` · `release-build.yml`(SPLIT) · `release-integration-contract.yml`(SPLIT) · `deploy-cloudflare.yml`(SPLIT).
- 최소 루트 설정 = `package.json`(SPLIT) · `pnpm-workspace.yaml` · `pnpm-lock.yaml`(재생성) · `.npmrc` · `.nvmrc` · `.node-version` · `rust-toolchain.toml` · `docker-compose.dev.yml` · `.env.example`(SPLIT) · `.gitignore`(SPLIT) · `.cursorignore`(SPLIT) · `.markdownlint*` · `.husky/*` · `.vscode/*`(SPLIT).
- 문서 = README(없음 · 생성 예정) · ARCHITECTURE(없음 · 생성 예정) · API 계약(`quality/backend-api-contract-map.md` · `schemas/*`) · SECURITY(`governance/security/*` · `SECURITY_BASELINE.md`) · MIGRATIONS(`MIGRATION_READINESS.md` · `infra/phase0-migration-playbook.md` · `tooling/migrations/` 생성 예정) · RUNBOOK(`ROLLBACK_RUNBOOK.md` · `governance/recovery/*`) · ADR(`docs/ADR-016-AGENT-AUTOMATION.md` · `docs/CONSTITUTION_BOOTSTRAP.md`) · 현재 백엔드 release evidence(`governance/release-master` KEEP 44/206 · `engine-acceptance` 37 · `recovery` 42 · `db-recon` 9 · `security` 4 · `release-inventory` 3 · `admin` 8 · `observability` 3 · `global-product` 4 · `pwa` 4/6 · `brand` 1).

## 2. allowlist 밖 잔여(residual) — 77 파일

| allowlist 밖 경로 | 파일 수 | 결정 분포 |
|---|---:|---|
| `packages/sdk` | 57 | MOVE 57 |
| `packages/schemas` | 4 | DELETE 4 |
| `workers/ops-proxy` | 4 | DELETE 4 |
| `workers/web-proxy` | 4 | MOVE 4 |
| `infra/ops` | 2 | MOVE 1 · DELETE 1 |
| `assets` | 1 | DELETE 1 |
| `infra/web` | 1 | DELETE 1 |
| `tooling` | 1 | DELETE 1 |
| `tooling/perf` | 1 | DELETE 1 |
| `tooling/scaffold` | 1 | DELETE 1 |
| `workers/_shared` | 1 | MOVE 1 |

경계 안 잔여(DELETE/MOVE 판정)는 §1 표의 마지막 열이 파일 수다. 전체 DELETE 476 · MOVE 77 · SPLIT 159의 경로별 목록은 `quality/backend-deletion-ledger.md`.

## 3. 현재 CI 실태

### 3.1 echo만 하는 no-op workflow/job/step (실제 파일 파싱 결과)

| workflow | job | steps | echo-only job | echo step 이름 | 결정 |
|---|---|---:|---|---|---|
| `consumer-spark-worldclass.yml` | `worldclass-ui` | 1 | YES | Backend-only skip | DELETE |
| `critical-axe.yml` | `live-axe` | 1 | YES | Backend-only skip | DELETE |
| `critical-axe.yml` | `full-product-web` | 1 | YES | Backend-only skip | DELETE |
| `critical-axe.yml` | `full-product-admin` | 1 | YES | Backend-only skip | DELETE |
| `critical-cross-browser.yml` | `consumer-engines` | 1 | YES | Backend-only skip | DELETE |
| `critical-cross-browser.yml` | `admin-chromium` | 1 | YES | Backend-only skip | DELETE |
| `critical-cross-browser.yml` | `webkit-home-session` | 1 | YES | Backend-only skip | DELETE |
| `critical-cross-browser.yml` | `leftover-race` | 1 | YES | Backend-only skip | DELETE |
| `gate.yml` | `verify-gate` | 32 | no | OpenNext build:cf (Linux — Workers deploy output SSOT) | SPLIT |
| `release-integration-contract.yml` | `strict-webkit` | 1 | YES | Backend-only skip | SPLIT |
| `spark-global-ui-qa.yml` | `admin-spark-qa` | 1 | YES | Backend-only skip | DELETE |

- `gate.yml`의 `verify-gate` job은 32 step 중 1 step(`OpenNext build:cf (Linux — Workers deploy output SSOT)`)만 echo이며, 그 외에도 UI 검증기를 실행하는 step이 남아 있다: `REL-404 lighthouse budget`(`rel-404-lighthouse-budget.cjs` OBSOLETE) · `REL-500 QA lab expansion`(OBSOLETE) · `REL-507 production E2E`(OBSOLETE) · `REL-603 automated age usability cohort`(`pnpm exec playwright install --with-deps chromium` + OBSOLETE 검증기) → step 제거 · `REL-601 staging regression`·`REL-602 staging rollback`·`REL-409 admin R6 cert`·`REL-408 security baseline`·`REL-405~407`·`REL-222~224`(MIXED/SPLIT · governance 백엔드 증거 + 삭제된 UI 경로 어서션) → 5단계 분리 후 step 유지. 6단계에서 위 step 목록을 반영한다.
- `release-integration-contract.yml`의 `release-contract-static` job은 실제 백엔드 계약 검증(7 step)이므로 유지하고 `strict-webkit` job만 제거한다.
- `release-build.yml` `build-once` job은 존재하지 않는 `@aipo/web`·`@aipo/admin`을 필터하고 `apps/web/.open-next/worker.js`를 `test -f` 하므로 **현재 실행 시 실패**한다(no-op은 아니지만 깨진 상태).

### 3.2 workflow 구조 요약

| workflow | jobs | needs | if | strategy | timeout-minutes | paths 필터 | 미고정 uses | 결정 |
|---|---|---|---|---|---|---:|---:|---|
| `codeql.yml` | `analyze` | 0 | 0 | 0 | 30 | 0 | 0 | BACKEND_INFRA/KEEP |
| `consumer-spark-worldclass.yml` | `worldclass-ui` | 0 | 0 | 0 | 5 | 0 | 0 | OBSOLETE/DELETE |
| `critical-axe.yml` | `live-axe` `full-product-web` `full-product-admin` | 0 | 0 | 0 | 5/5/5 | 0 | 0 | OBSOLETE/DELETE |
| `critical-cross-browser.yml` | `consumer-engines` `admin-chromium` `webkit-home-session` `leftover-race` | 0 | 0 | 0 | 5/5/5/5 | 0 | 0 | OBSOLETE/DELETE |
| `deploy-cloudflare.yml` | `deploy` | 0 | 0 | 0 | 30 | 0 | 0 | MIXED/SPLIT |
| `deploy-staging.yml` | `deploy-staging` | 0 | 0 | 0 | 30 | 0 | 0 | OBSOLETE/DELETE |
| `ebay-fault-injection.yml` | `ebay-fault-injection` | 0 | 0 | 0 | 25 | 14 | 0 | BACKEND_INFRA/KEEP |
| `engine-acceptance-heavy.yml` | `qa4-heavy` `qa5-heavy` `qa6-heavy` `qa7-heavy` `qa8-heavy` | 4 | 2 | 0 | 30/30/30/30/30 | 0 | 0 | BACKEND_INFRA/KEEP |
| `engine-acceptance.yml` | `qa0-baseline` `qa1-deterministic` `qa2-synthetic-personas` `qa-matrix` `qa7-ai-eval` `qa5-fault` `qa6-measure` `qa8-adversarial` `aggregator` | 3 | 8 | 1 | 15/20/25/30/30/40/40/40/10 | 8 | 33 | BACKEND_INFRA/KEEP |
| `engine-current-epoch-finalize-once.yml` | `finalize-current-epoch` | 0 | 0 | 0 | 30 | 1 | 0 | BACKEND_INFRA/KEEP |
| `engine-evidence-refresh-check.yml` | `evidence-only` | 0 | 0 | 0 | - | 25 | 0 | BACKEND_INFRA/KEEP |
| `gate.yml` | `verify-gate` | 0 | 0 | 0 | 25 | 0 | 0 | MIXED/SPLIT |
| `lighthouse.yml` | `budget` | 0 | 0 | 0 | 10 | 0 | 0 | OBSOLETE/DELETE |
| `provision-ebay-adapter-secrets.yml` | `provision` | 0 | 0 | 0 | 15 | 0 | 0 | BACKEND_INFRA/KEEP |
| `release-acceptance.yml` | `release-acceptance` | 0 | 1 | 0 | 25 | 0 | 0 | BACKEND_INFRA/KEEP |
| `release-build.yml` | `build-once` | 0 | 0 | 0 | 45 | 0 | 0 | MIXED/SPLIT |
| `release-integration-contract.yml` | `release-contract-static` `strict-webkit` | 0 | 0 | 0 | -/5 | 19 | 0 | MIXED/SPLIT |
| `spark-global-ui-qa.yml` | `admin-spark-qa` | 0 | 0 | 0 | 5 | 0 | 0 | OBSOLETE/DELETE |

### 3.3 gate 티어 실태 (`tooling/verify/gate-tiers.cjs`)

- T0 `stack-lock`·`secrets`·`plans-ssot`·`brand-consumer` + 변경 경로 도메인 검증기(`domain-by-path.cjs` · apps/web·admin·packages/ui 규칙 다수 잔존 → SPLIT).
- T1 백엔드 extras 15개 중 UI 잔재: `opennext-workers-origin.cjs`(OBSOLETE) · `cf-infra.cjs`·`phase0-bootstrap.cjs`·`root-domain-env.cjs`·`domain-bootstrap.cjs`(MIXED SPLIT) · `stubs/run-all.cjs`(SPLIT).
- T2 `api-nest-build.cjs`만 (KEEP).

## 4. 판정 근거 방식 (재현)

1. `git ls-files` 1,904개 → 각 파일에서 import/require/dynamic import · 경로 리터럴 · `process.env` · workflow `run`/`paths`/`uses` · wrangler `main`/`routes` · package.json scripts/deps 추출 → 그래프 3,724 노드 / 16,586 edge.
2. 경로 시드 규칙(데이터) → tooling 검증기는 참조 대상의 class로 재판정(삭제된 UI 경로/UI class만 참조 = OBSOLETE · 백엔드 class 참조 동반 = MIXED · 백엔드만 = KEEP · `packages/sdk`만 = MOVE · 참조 0이면서 UI 스택 마커 포함 = OBSOLETE).
3. governance는 KEEP/SPLIT **코드** 참조자가 있으면 KEEP, 없으면 디렉터리/제목/키워드 비율로 판정. schemas는 런타임·KEEP 검증기·UI 소비자를 구분.
4. 규칙으로 못 정한 97건은 overrides에 근거와 함께 기록 → UNKNOWN 0.
5. 최근 변경일은 `git log --format=%x01%H %cI --name-only` 1회 순회로 채움(파일별 `lastCommit`).

## 5. 이 단계에서 발견한 환경 이슈 (BLOCKED_LOCAL_ENVIRONMENT · 보고만)

- 여유 RAM 300MB 내외의 이 PC에서 Cursor 파일 도구의 `project-boundary` 훅(`.cursor/hooks/lib/hook-io.cjs` · STDIN 5초 예산)이 **일부 한글 글자(예: 스·소·습·슈) 바로 뒤에 큰따옴표가 오는 페이로드**를 `HOOK_MALFORMED_INPUT`(사용자 메시지 `Blocked: malformed hook input.`)으로 거절했다. 같은 글자 뒤에 공백이나 다른 문자가 오면 통과했고, 파일 크기와는 무관했다. 이 단계 산출물은 한글 뒤에 큰따옴표를 두지 않는 규칙으로 작성했고, 큰 파일은 조각으로 써서 셸에서 결합했다. 훅 코드는 수정하지 않았다.
- 같은 이유로 생성기 소스와 overrides JSON은 한글 문자열을 작은따옴표 또는 ASCII 문자로 끝나게 썼다.
