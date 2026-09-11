# 백엔드 전용 CI — `backend-ci.yml` (3단계 · CI 완전 교체)

- 브랜치 `chore/backend-only-repository` (PR #223) · 기준 커밋 A `e0ff73e1` (repository-boundary 검사) → 커밋 B (이 문서와 함께)
- 공식 문서 근거 = `quality/backend-only-official-basis.md` (§1 workflow syntax · §2 rulesets · §3 secure use · §4 pnpm · §6 Wrangler · §9.1 전환 절차)
- job ↔ 검증기 매핑 SSOT = `tooling/verify/gate-tiers.cjs` `CI_JOBS` · YAML 과의 동일 집합 검사 = `pnpm verify:backend-ci-tiers-sync`
- 판정: **`BACKEND_ONLY_CLEANUP_IN_PROGRESS`** — `repository-boundary` 등 정리 전 예상 red 가 남아 있다 (§6)

## 1. 워크플로 인벤토리 (이 단계 후)

| 파일 | 처리 | 근거 |
|---|---|---|
| `backend-ci.yml` | **신설** | UI 이름 job 0 · echo/no-op step 0 · 모든 step 이 실제 검증기 · 집계 job `backend-required` |
| `.github/actions/backend-setup/action.yml` | 신설 | pnpm 10.14.0 · node 22 · `cache: pnpm` · `pnpm install --frozen-lockfile` 공통 setup (SHA pin · `verify:workflow-action-pin` 이 `.github/actions/**` 도 검사) |
| `gate.yml` | **삭제** | 내용을 backend-ci 로 이관. required context `verify-gate` 는 룰셋 전환 전까지 PR 에 `Expected` 로 남는 것이 정상 (§7) |
| `consumer-spark-worldclass.yml` `critical-axe.yml` `critical-cross-browser.yml` `spark-global-ui-qa.yml` | 삭제 | echo no-op UI 이름 job 만 (소유권 OBSOLETE/DELETE · required context 아님) |
| `lighthouse.yml` | 삭제 | UI Lighthouse 예산 (OBSOLETE) |
| `deploy-staging.yml` | 삭제 | 내용 확인 결과 OpenNext web/ops staging 배포만 (surface=web/ops · `cf-pages-web/ops.cjs`) → putduk-web 소유 |
| `release-build.yml` | SPLIT | `@aipo/web` `@aipo/admin build:cf` + `apps/*/.open-next` 검사 제거 · api-nest artifact + workers prebuild + release-bundle 유지 (`api-artifact-provenance` `release-acceptance` 검증기 어서션 유지) |
| `release-integration-contract.yml` | SPLIT | `strict-webkit` echo job 삭제 · 삭제된 `critical-cross-browser` paths 제거 · `timeout-minutes` 추가 · `release-contract-static` 백엔드 계약 7 step 유지 |
| `deploy-cloudflare.yml` | SPLIT | `surface` 입력 = `workers` 만 · `Origin lock(OpenNext)` `Deploy web` `Deploy ops` `Origin smoke` step 제거 · Production branch authority · accepted-artifact · `--check-surface` · worker deploy 유지 · **원격 배포 실행 0** (workflow_dispatch HUMAN 그대로) |
| `engine-evidence-refresh-check.yml` | KEEP (+timeout) | 백엔드 evidence · `timeout-minutes: 15` 추가 (official-basis §1) |
| `codeql.yml` | KEEP | `codeql-config.yml` 의 `**/.open-next/**` paths-ignore 를 `**/dist-ci/**` 로 교체 (SPLIT 완료) |
| `engine-acceptance.yml` | KEEP · **수정 0** | `acceptance_workflow_hash` 동결 (L7 controlled amendment 없이 수정 금지 · 태그 pin 32건은 HOLD) |
| `engine-acceptance-heavy.yml` `engine-current-epoch-finalize-once.yml` | KEEP | 백엔드 Engine 수락 (UI 참조 0) |
| `ebay-fault-injection.yml` | KEEP | 실 Postgres 서비스 + Nest 부팅 fault-injection (주석에 gate.yml 언급만 있어 수정 0 — T0 ebay 그룹이 SPLIT 검증기 ebay-identity-ingest 를 트리거하므로 손대지 않음) |
| `provision-ebay-adapter-secrets.yml` | KEEP | production ebay-adapter 시크릿 (dry-run 기본 · UI 0) |
| `release-acceptance.yml` | KEEP | engine-acceptance workflow_run 판정 · release-bundle 바인딩 (UI 참조 0) |

함께 삭제한 검증기 (소유권 JSON DELETE/OBSOLETE · gate.yml 에서만 실행되던 UI 전용): `tooling/verify/rel-404-lighthouse-budget.cjs` `rel-500-qa-lab-expansion.cjs` `rel-507-production-e2e.cjs` `rel-603-age-usability-spotcheck.cjs` + 픽스처 `fixtures/rel-500|507|603*.v1.json` + `package.json` script 4개 + `domain-by-path.cjs` 규칙 4개 + `CATALOG.md` 행.
`tooling/verify/pwa-push-badge.cjs` (SPLIT) 는 UI 어서션(sdk push client · PushOptIn · sw.js · pwa copy)만 제거해 in-place 분리했고 (`quality/putduk-web-ui-assertions-handoff.md` §1c) `notification` job 에 배선했다 — `workers/push-dispatcher/**` 변경이 T0 domain-by-path 에서 이 검증기를 트리거하므로 깨진 상태로 둠 수 없었다.
`tooling/verify/opennext-workers-origin.cjs` 는 OBSOLETE 이지만 `rel-506-r8-infra-core` · `rel-600-staging` 픽스처의 `extraVerifies` 가 재실행하므로 파일은 남기고 T1/CI 목록에서만 제외했다 (9단계 Cloudflare 잔재에서 두 검증기 분리와 함께 삭제).

## 2. job 과 정확한 명령

| job | timeout | steps (exact commands) |
|---|---:|---|
| `gate-fast` | 15 | `pnpm verify:gate:fast (AIPO_PR_BASE_SHA/AIPO_PUSH_BEFORE_SHA · dispatch = merge-base origin/main)` |
| `repository-boundary` | 15 | `pnpm verify:backend-boundary` · `pnpm verify:backend-ownership-drift` · `pnpm verify:backend-ci-tiers-sync` · `pnpm verify:domain-by-path-ci` · `pnpm verify:project-boundary` · `pnpm verify:night-guard` |
| `dependency-integrity` | 15 | `pnpm verify:dependency-integrity` · `pnpm verify:workers-types` |
| `api-contract` | 15 | `pnpm verify:schemas-contract` · `pnpm verify:price-denomination-contract` · `pnpm verify:home-money-read-contract` · `pnpm verify:no-fake-zero-status` · `pnpm verify:llm-adapter-contract` · `pnpm verify:coach-sse-error-canonical` · `pnpm verify:api-runtime-qa-canonical` · `pnpm verify:settlement-rule-parity` · `pnpm verify:user-opportunity-feed` · `pnpm verify:catalog-runtime-seed` · `pnpm verify:listing-legs-day1` · `pnpm verify:signup-ready-adapters` · `pnpm verify:market-partner-adapters` · `pnpm verify:market-partner-trust` · `pnpm verify:pricing-formula` · `pnpm verify:fx-snapshot-formula` · `pnpm verify:operator-footer` |
| `typecheck` | 15 | `pnpm verify:api-nest-build` · `pnpm verify:workers-typecheck` |
| `unit` | 15 | `pnpm verify:unit-tests` · `pnpm verify:nest-production-provenance` |
| `integration` | 20 | `pnpm verify:auth-rate-limit` · `pnpm verify:user-ledger-query` · `pnpm verify:rel-501-money-red-team` · `pnpm verify:qa-env-isolation-guard` · `pnpm verify:participate-http` · `pnpm verify:execute-rule-loop` · `pnpm verify:auth-jwt-runtime` |
| `auth` | 15 | `node tooling/verify/backend/run-all.cjs --domain auth` · `pnpm verify:auth-session-cookie` · `pnpm verify:wallet-kyc-session-auth` · `pnpm verify:auth-identity-proof` · `pnpm verify:passkey-registration-hijack` · `pnpm verify:webauthn-user-presence` · `pnpm verify:webauthn-fallback-pointer` · `pnpm verify:privacy-purge` · `pnpm verify:admin-csrf-double-submit` · `pnpm verify:money-wallet-auth-remediation` |
| `ledger-wallet` | 15 | `node tooling/verify/backend/run-all.cjs --domain ledger-wallet` · `node tooling/verify/backend/run-all.cjs --domain deposit-withdraw` · `pnpm verify:bucket-invariant` · `pnpm verify:pg-module-scan` · `pnpm verify:min-holding-scope` · `pnpm verify:deposit-confirm-stages` · `pnpm verify:no-per-address-poll` · `pnpm verify:idempotency-conflict-detection` · `pnpm verify:committed-event-publication-durability` · `pnpm verify:tron-hd-derivation-fail-closed` · `pnpm verify:withdraw-stepup-security` · `pnpm verify:withdraw-stepup-security-runtime` · `pnpm verify:usdt-ingest-machine-auth` · `pnpm verify:adapter-ingest-fail-closed` · `pnpm verify:adapter-ingest-fail-closed-runtime` |
| `kyc` | 10 | `node tooling/verify/backend/run-all.cjs --domain kyc` · `pnpm verify:kyc-r2-only` |
| `matching-membership` | 20 | `node tooling/verify/backend/run-all.cjs --domain matching-membership` · `node tooling/verify/backend/run-all.cjs --domain opportunity-engine` · `node tooling/verify/backend/run-all.cjs --domain benefit-referral` · `pnpm verify:match-success-rule` · `pnpm verify:no-success-rate-as-rule` · `pnpm verify:domain-clock` · `pnpm verify:referral-ledger` · `pnpm verify:referral-ladder` · `pnpm verify:referral-idempotency` · `pnpm verify:mission-auto-payout` · `pnpm verify:mission-idempotency` · `pnpm verify:mission-no-manual-grant` · `pnpm verify:benefit-g4-ledger-separation` · `pnpm verify:ebay-resilience` · `pnpm verify:growth-public-surface` |
| `notification` | 10 | `node tooling/verify/backend/run-all.cjs --domain notification` · `pnpm verify:notification-prefs-default-on` · `pnpm verify:push-channel-prefs` · `pnpm verify:email-provider-resend` · `pnpm verify:pwa-push-badge` |
| `ai-policy` | 15 | `node tooling/verify/backend/run-all.cjs --domain ai-policy` · `pnpm verify:llm-quota-degrade` · `pnpm verify:ai-coach-no-autonomy` · `pnpm verify:ai-general-no-money-tools` · `pnpm verify:ai-lane-router` · `pnpm verify:routing-coverage` · `pnpm verify:ai-scope-guard` · `pnpm verify:ai-guard-authority` · `pnpm verify:numeric-grounding` · `pnpm verify:fact-freshness` · `pnpm verify:answer-trace` · `pnpm verify:conversation-state-bounded` · `pnpm verify:reference-resolution` · `pnpm verify:no-ai-data-in-git` · `pnpm verify:twin-fact-separation` · `pnpm verify:age-tone-surfaces` |
| `admin-rbac` | 15 | `node tooling/verify/backend/run-all.cjs --domain admin-rbac` · `pnpm verify:rel-400-admin-control-plane` · `pnpm verify:rel-405-rbac-audit` · `pnpm verify:rel-406-kill-switch` · `pnpm verify:rel-407-price-override` · `pnpm verify:rel-222-admin-ops` · `pnpm verify:rel-223-match-control` · `pnpm verify:rel-224-source-policy` · `pnpm verify:rel-409-r6-cert` |
| `migration` | 15 | `pnpm verify:migrations-static` · `pnpm verify:migrations-applied-parity` · `pnpm verify:rel-504-migration-readiness` · `pnpm verify:staging-db-hardening` · `pnpm verify:db-hardening-readiness` · `pnpm verify:db-recovery` · `pnpm verify:db-recon-inventory` · `pnpm verify:live-schema-forensic` · `pnpm verify:b3-promotion` · `pnpm verify:staging-topology-readiness` · `pnpm verify:production-schema-parity` · `pnpm verify:staging-db-hardening-rehearsal` · `pnpm verify:qa-env-isolation-staging` |
| `rust-engine` | 30 | `pnpm verify:rust-engine` |
| `worker-build` | 25 | `pnpm verify:worker-build` · `pnpm verify:cf-infra` · `pnpm verify:ebay-worker-deploy-path` · `pnpm verify:p0-ebay-secret-provisioning` · `pnpm verify:phase0-bootstrap` · `pnpm verify:root-domain-env` · `pnpm verify:domain-bootstrap` |
| `security` | 20 | `pnpm verify:secrets` · `pnpm verify:rel-402-dependency-audit` · `pnpm verify:pnpm-audit` · `pnpm verify:rel-408-security-baseline` · `pnpm verify:rel-403-versioning` · `pnpm verify:workflow-action-pin` |
| `release-evidence` | 30 | `pnpm verify:rel-502-final-engine-acceptance` · `pnpm verify:rel-503-protected-scope-watch` · `pnpm verify:rel-505-r7-backend-alignment` · `pnpm verify:rel-508-current-fx-approx` · `pnpm verify:rel-506-r8-infra-core` · `pnpm verify:rel-600-staging` · `pnpm verify:rel-601-staging-regression` · `pnpm verify:rel-602-staging-rollback` · `pnpm verify:release-engine-truth-consistency` · `pnpm verify:engine-acceptance` · `pnpm verify:engine-drift-inventory` · `pnpm verify:release-acceptance` · `pnpm verify:release-manifest-identity-lock` · `pnpm verify:production-deploy-path-lock` · `pnpm verify:api-artifact-provenance` · `pnpm verify:api-artifact-runtime-qa` · `pnpm verify:fetch-acceptance-artifact` · `pnpm verify:require-accepted-sha` · `pnpm verify:release-fetch-deploy-hardening` · `pnpm verify:render-rollback-provenance` · `pnpm verify:render-api-promotion-readiness` · `pnpm verify:production-release-decision` · `pnpm verify:governance-observation-registry` · `pnpm verify:observability` |
| `backend-required` | 10 | `node tooling/backend/ci-aggregate.cjs` (needs = 19 jobs · if: always() · NEEDS_JSON = toJSON(needs)) |

공통: 모든 job `timeout-minutes` 명시 · `permissions: contents: read` (집계 job 만 `actions: read` 추가) · `concurrency: backend-ci-${{ github.ref }}` `cancel-in-progress: true` · 액션 전부 40자 SHA pin (`actions/cache@55cc8345… # v6.1.0` 신규 · `governance/security/workflow-action-pins.v1.json` 등재). 검증 step 은 `if: ${{ !cancelled() && steps.setup.outcome == 'success' }}` 로 첫 실패 뒤에도 전부 실행되어 red 원인이 job 안에서 모두 보인다. `gate-fast` 는 `workflow_dispatch` 에서 `origin/main` merge-base 를 PR base 로 써서 domain-by-path 가 fail-closed 되지 않게 한다.

## 3. NOT_RUN 정책

- 원격 DB/시크릿이 필요한 검증기는 KEEP 집합에 **0개** 다 (`tooling/verify|release|recovery|deploy` 의 `process.env` 스캔: `CLOUDFLARE_*` 만 배포 스크립트에 존재). 그래서 `integration-remote` job 은 만들지 않았다 — 검사 없이 NOT_RUN 만 출력하는 job 은 no-op 이다. 원격 자원이 필요한 무거운 수락은 별도 워크플로(`engine-acceptance*.yml` · `ebay-fault-injection.yml` · CI Postgres 서비스)가 맡는다.
- 집계: `needs.<job>.result` 가 `skipped`/`cancelled` 면 NOT_RUN 으로 표기하고 FAIL 로 계산한다. 핵심 도메인(`auth` `ledger-wallet` `kyc` `matching-membership` `notification` `migration`)의 NOT_RUN 은 그 자체가 실패 사유다.
- CI 에 배선하지 않은(NOT_RUN) 검증기 — 삭제된 UI 트리를 요구해 현재 FAIL 하는 mixed 검증기. 5단계 mixed 분리 대상이며 ownership rule 이 baseline 에 이미 기록한다:

| 검증기 | 판정 | 로컬 FAIL 원문 (첫 줄) | 해소 단계 |
|---|---|---|---|
| `rel-401-security-headers.cjs` | SPLIT | `lux-theme Pretendard host must stay listed in CSP via spec` | 5단계 (UI CSP 어서션 제거) |
| `ebay-identity-ingest.cjs` | SPLIT | `missing: packages/ui/canon/surfaces/admin-adapters.wire.json` | 5단계 |
| `ai-feature-platform.cjs` | SPLIT | `missing: apps/admin/app/admin/ai-logs/page.tsx` | 5단계 |
| `shadow-replay-drift.cjs` | SPLIT | `missing: apps/admin/app/admin/ledger/page.tsx` | 5단계 |
| `participate-web-wire.cjs` | SPLIT | `web participate wiring missing under profits/[id]` | 5단계 |
| `execute-web-wire.cjs` | SPLIT | `Settled must require success status` (apps/web 어서션) | 5단계 |
| `invite-closure.cjs` `settings-closure.cjs` | SPLIT | `local-web-runtime: next binary missing in apps/web` | 5단계 |
| `rc-formal.cjs` | SPLIT | `HEAD diverges from RC binding outside governance/evidence: TOOLCHAIN.md,apps/admin/...` (해시 범위에 삭제된 UI 트리) | 5단계 (범위 재정의) |
| `account-compat-closure.cjs` `account-journey.cjs` | KEEP (소유권 오판) | `ads/l must keep intended landing owner` (apps/web 랜딩 어서션) | 5단계 — 소유권 그래프에 SPLIT 재판정 필요 |
| `backend-data-alignment.cjs` | SPLIT | `rel-505` 가 내부 재실행 (단독 배선 없음) | - |
| `hook-stability.cjs` (`scripts/hook-stability-stress.mjs`) | KEEP | Cursor 훅 스트레스 (로컬 개발 도구 · CI 대상 아님) | - |

## 4. 집계 규칙 (`backend-required`)

- `needs: [19개 job 전부]` · `if: ${{ always() }}` · `node tooling/backend/ci-aggregate.cjs` 가 `${{ toJSON(needs) }}` 를 읽어 하나라도 `success` 가 아니면 `exit 1`.
- `$GITHUB_STEP_SUMMARY` 에 job 별 result · 소요 시간(`actions/runs/{id}/jobs` API · `actions: read`) · NOT_RUN 목록 · red 목록 표를 쓴다.
- job id 는 `backend-required` 하나만 존재한다 (`Select-String -Path .github/workflows -Pattern 'backend-required'` → backend-ci.yml 만). `name:` 을 붙이지 않아 status context = job id (official-basis §9.1 1항).

## 5. 로컬 T2 = CI 합집합

`tooling/verify/gate-tiers.cjs`: `T2_CI` = `CI_JOBS` 합집합 − T0 − T1(전개) (85개). `pnpm verify:gate` (T2) = T0 + 변경 경로 도메인 + T1 + T2_CI. `verify:backend-ci-tiers-sync` 가 (1) YAML job ↔ CI_JOBS 양방향 동일 (2) `backend/run-all.cjs --domain` 합집합 = 10 도메인 (3) 집계 job needs = 전 job (4) 로컬 T2 집합 == CI 합집합을 검사한다 (T0 path 트리거: `backend-ci.yml` · `.github/actions/**` · `gate-tiers.cjs` · `stubs/run-all.cjs` · `backend/run-all.cjs` 변경 시). T1 에서 `opennext-workers-origin.cjs` (OBSOLETE) 를 제외했고 `stubs/run-all.cjs` 는 `live` 목록을 export 한다.

## 6. 정리 전 예상 red (수정하지 않고 후속 단계로 넘김)

| job | 예상 결과 | 원인 | 분류 | 해소 단계 |
|---|---|---|---|---|
| `repository-boundary` | red | `verify:backend-boundary` 865건 (§8) — 트리에 DELETE/MOVE/SPLIT 판정 파일이 남아 있음 | (b) | 4·5·7·8·9·10단계 |
| `dependency-integrity` | red | `pnpm dedupe --check`: workers 의 `@cloudflare/workers-types 5.20260808.1` 이 루트 `5.20260809.1` 과 중복 해석 (lockfile 재생성 필요) | (b) | 8단계 (lockfile 재생성 시 `pnpm dedupe`) |
| `rust-engine` | red (step `fmt` 만) | `cargo fmt --check` 가 `services/engine-rust/src/settlement_rule.rs` 테스트 블록 포맷 diff 보고 · clippy `-D warnings` · check · test 는 PASS | (c) 수정 보류 — 파일이 engine-acceptance 보호 범위(protected_scope_manifest 491 entries)라 L7 controlled amendment 없이 수정 금지 | 2.5단계 Engine Acceptance amendment 와 함께 |
| `release-evidence` | red (step `verify:engine-acceptance` 만) | `baseline.lockfile_hash drift` — UI 의존성 제거로 pnpm-lock.yaml 이 바뀌어 동결 baseline 과 불일치 | (b)/(c) 혼합 · 수정 금지 | engine-acceptance baseline rebase (controlled amendment) |
| `security` | red 가능 (step `verify:pnpm-audit`) | `pnpm audit --prod --audit-level=moderate` 원시 결과 · 임계값 하향 0 | (b) | 9단계 보안 치유 |
| `worker-build` | 확인 필요 | `web-proxy` `ops-proxy` 도 번들 대상 (9단계 삭제 예정) — 실패해도 수정하지 않음 | (b) | 9단계 |

그 외 job(`gate-fast` `api-contract` `typecheck` `unit` `integration` `auth` `ledger-wallet` `kyc` `matching-membership` `notification` `ai-policy` `admin-rbac` `migration`)은 로컬 실행에서 전부 PASS 했다 (`push-dispatcher` TS7016 은 `src/lib/dispatch.d.cts` 선언 추가로 해소 — 설정 문제 · 런타임 변경 0). run 1 에서 드러난 CI 구성 결함 2건(gate-fast 의 PR 모드 UI 경로 규칙 · ledger-wallet 의 Nest dist 미빌드)은 §9.1 대로 수정했다.

`gate-fast` 의 T0 규칙 필터: PR 모드에서 diff 는 `main…HEAD` 전체(이 PR 은 852 파일)라 삭제된 UI 트리 경로가 UI/SPLIT 검증기 61개를 추가로 선택했다. `domain-by-path.cjs` 에 `isUiTreePath` (`apps/web/` `apps/admin/` `packages/ui/`) 필터를 두어 이 레포에 존재하지 않는 트리의 경로는 규칙을 선택하지 않게 했다 — 백엔드 파일은 삭제를 포함해 그대로 자기 규칙을 탄다(마이그레이션 삭제 → migrations 검증기 실행 유지). 그 경로만 검사하던 규칙 test 는 4단계 UI 검증기 제거 때 함께 지운다.

CI 실행 결과(run URL · job 별 conclusion · 소요 시간)는 §9 에 기록한다.

## 7. required check 전환 계획 (룰셋은 이 단계에서 수정하지 않음)

1. 새 context 이름 = **`backend-required`** (job id · `name:` 없음).
2. 라이브 룰셋: `main-gate-required` id **20576556** (`refs/heads/main` · contexts `[verify-gate]` · strict) · `release-train-rel502-gate-required` id **21919415** (`release/*` 2 브랜치 · 같은 context).
3. 전환 순서 (official-basis §9.1): (1) `backend-required` 가 main 대상 PR 에서 성공 보고 → (2) `tooling/github/main-gate.ruleset.json` 을 라이브 JSON(`gh api repos/phonarawd/AI-Profit-OS/rulesets/20576556`) 기준으로 재작성하고 context 만 `backend-required` 로 → (3) 두 룰셋 `PUT` → (4) 응답 `.rules[] | select(.type=="required_status_checks")` 확인.
4. 드리프트: 레포 `tooling/github/main-gate.ruleset.json` 은 context `gate / verify-gate` (라이브는 `verify-gate`). `apply-main-gate.ps1` 재실행 전 반드시 (3) 으로 갱신 — 그대로 실행하면 만족 불가한 context 가 걸린다.
5. 전환 전까지 PR #223 의 `verify-gate` 는 `Expected` 상태로 남는다 (gate.yml 삭제 · 정상). merge 는 룰셋 전환 후.

## 8. repository-boundary baseline 요약 (`quality/backend-boundary-violations-baseline.json`)

- 규칙 7개 (`tooling/backend/repository-boundary.cjs`): `ownership` · `ui-path` · `package` · `import` · `workflow` · `wrangler` · `skip-list` · `markdown` (doc-ownership 미생성 → 소유권 판정 대체 + 경고).
- 총 **865** 건 · 전수 6~9초 · `--staged`/`--paths` 1초 (커밋된 소유권 JSON 사용).

| 규칙 | 건수 | 내용 |
|---|---:|---|
| ownership | 474 | decision != KEEP 파일 잔존 (4단계 136 · 5단계 59 · 7단계 238 · 8단계 71 · 9단계 23 · 10단계 44 · 6단계 2 = `tooling/github/main-gate.ruleset.json` (§7 전환 시) · `tooling/release/artifact-provenance.cjs` (§10)) |
| ui-path | 222 | governance 화면 PNG 157 · 금지 이름 마커(`Lux` `spark-dash` 등) 64 (CONSTITUTION · .cursor/rules · plans · governance JSON) · UI 설정 파일 3 (`tooling/e2e/playwright*.config.cjs` · `tooling/verify/responsive/playwright.config.cjs`) |
| markdown | 99 | 소유권 판정 DELETE/MOVE/SPLIT 인 .md (10단계 doc-ownership 생성 전 대체 판정) |
| import | 51 | 백엔드 코드가 `apps/web` `apps/admin` `packages/ui` 경로를 직접 읽음 (tooling/verify 38 · deploy 4 · e2e 3 · release 2 · pwa 1 · schemas 1 · scaffold/perf 2) |
| package | 15 | 루트 `@axe-core/playwright` `@playwright/test` `axe-core` `jsdom`(import 증거 0) · `pnpm.overrides.sharp`(import 증거 0 · REL-402 감사 경로 — 8단계 판단) · `packages/sdk` react · lockfile importer 6 · `pnpm-workspace.yaml` 죽은 글롭 `tooling/*` |
| wrangler | 4 | `infra/web` `infra/ops` wrangler main → 삭제된 `apps/*/.open-next` · assets 정적 배포 |
| workflow | 0 | 이 단계에서 해소 (삭제 40건 → 0) |
| skip-list | 0 | retired stub 목록/무조건 PASS 검증기 0 |

상위 그룹: `governance/release-master` 276 · `tooling/verify` 171 · `governance/visual-reconciliation` 84 · `tooling/e2e` 78 · `packages/sdk` 60 · `governance/consumer-home-approval` 30 · 루트 23 · `CONSTITUTION` 21 · `.cursor/rules` 20 · `.cursor/plans` 15.

## 9. CI 실행 기록

### 9.1 run 1 — `720e7d54` (커밋 B 직후 · https://github.com/phonarawd/AI-Profit-OS/actions/runs/34562423984)

| job | conclusion | 소요 | red 원인 | 분류 |
|---|---|---:|---|---|
| gate-fast | failure | 38s | PR 모드 domain-by-path 가 base(main)…HEAD 852 파일을 보며 삭제된 `apps/web/**` `apps/admin/**` `packages/ui/**` 경로 규칙으로 UI/SPLIT 검증기 113개를 선택 → `rel-401-security-headers` 에서 중단 | (a) CI 구성 결함 → run 2 에서 수정: `domain-by-path.cjs` 가 UI 트리 경로를 규칙 매칭에서 제외 (`isUiTreePath`) · 선택 검증기 113 → 52 |
| ledger-wallet | failure | 27s | `withdraw-stepup-security.runtime` `adapter-ingest-fail-closed.runtime` 이 `services/api-nest/dist/**` 를 require — job 에 Nest 빌드 없음 | (a) → run 2: job 첫 step 에 `verify:api-nest-build` (tsc emit) 추가 |
| dependency-integrity | failure | 25s | `pnpm dedupe --check`: `@cloudflare/workers-types 5.20260808.1 → 5.20260809.1` (workers 13개) | (b) 8단계 lockfile 재생성 |
| security | failure | 20s | `verify:pnpm-audit`: moderate 2건 `qs` (GHSA-x5fp-wj9c-mxmx · GHSA-4mjr-xmp4-gh2g · 경로 `services__api-nest>@nestjs/platform-express>express>qs` · patched >=6.16.0) · 나머지 step(secrets · rel-402 AIPO_AUDIT=1 · rel-408 · rel-403 · workflow-action-pin) PASS | (b) 9단계 보안 치유 (qs override 또는 express 상향 · 임계값 하향 0) |
| repository-boundary | failure | 21s | `verify:backend-boundary` 865건 (§8) · drift/tiers-sync/domain-by-path-ci/project-boundary/night-guard PASS | (b) 4·5·7·8·9·10단계 |
| rust-engine | failure | 18s | `cargo fmt -- --check` diff (settlement_rule.rs 테스트 블록) · clippy/check/test PASS (9 tests) | (c) 보호 범위 → controlled amendment |
| release-evidence | failure | 68s | `verify:engine-acceptance` `baseline.lockfile_hash drift` · 그 외 23 step PASS | (b)/(c) engine-acceptance baseline rebase |
| backend-required | failure | 10s | 위 7 job 집계 (NOT_RUN 0 · core NOT_RUN 0) | 집계 정상 동작 |
| auth · unit · notification · kyc · matching-membership · integration · ai-policy · typecheck · migration · admin-rbac · api-contract · worker-build | success | 15~45s | — (worker-build: `workers/*/wrangler.toml` 15개 전부 번들 성공 · web-proxy/ops-proxy 포함) | — |

다른 워크플로 (같은 SHA): `codeql` success · `release-integration-contract` success · `engine-evidence-refresh-check` **failure** — `Verify RC_FORMAL lock` (`rc-formal.cjs`: `HEAD diverges from RC binding outside governance/evidence: .github/actions/backend-setup/action.yml, .github/codeql/codeql-config.yml, AGENTS.md, TOOLCHAIN.md, apps/admin/...`) → RC_FORMAL 해시 범위가 삭제된 UI 트리와 루트 문서를 포함하는 SPLIT 검증기(§3 NOT_RUN 표) · 5단계 범위 재정의. 이 워크플로는 `rel-502/503` 검증기 경로 변경(gate.yml→backend-ci.yml 문자열)으로 트리거됐다.

### 9.2 run 2 — `e8d0c371` (구성 결함 수정 후 · https://github.com/phonarawd/AI-Profit-OS/actions/runs/34563489024 · attempt 2 = 실패 job 재실행)

| job | conclusion | 소요 | 비고 |
|---|---|---:|---|
| gate-fast | **success** | 65s | (a) 해소 — PR 모드 선택 검증기 52개 전부 PASS |
| ledger-wallet | **success** | 28s | (a) 해소 — api-nest-build 뒤 runtime 검증기 PASS |
| auth | success | 67s | |
| unit | success | 36s | 10 test files · node:test |
| integration | success | 29s | |
| kyc | success | 17s | |
| matching-membership | success | 31s | |
| notification | success | 22s | pwa-push-badge 포함 |
| ai-policy | success | 23s | |
| admin-rbac | success | 18s | |
| migration | success | 35s | |
| api-contract | success | 33s | |
| typecheck | success | 26s | api-nest tsc + KEEP workers 13개 tsc |
| worker-build | success | 39s | wrangler --dry-run 15 workers (web-proxy · ops-proxy 포함 · 업로드 0) |
| repository-boundary | failure | 29s | (b) `verify:backend-boundary` 865건 · 나머지 5 step PASS |
| dependency-integrity | failure | 25s | (b) `pnpm dedupe --check` workers-types 중복 해석 |
| security | failure | 21s | (b) `verify:pnpm-audit` qs moderate 2건 · 나머지 5 step PASS |
| rust-engine | failure | 19s | (c·보호 범위) `cargo fmt --check` 만 · clippy/check/test PASS |
| release-evidence | failure | 61s | (b/c) `verify:engine-acceptance` lockfile_hash drift 만 · attempt 1 에서 `rel-602-staging-rollback` 이 내부 재실행 `rel-601` 의 live staging 프로브로 1회 실패 → attempt 2 PASS (flaky 외부 프로브 · 코드 변경 0) |
| backend-required | failure | 6s | 집계 = 위 5 red · NOT_RUN 0 · core NOT_RUN 0 |

다른 워크플로: `codeql` success · `release-integration-contract` success · `engine-evidence-refresh-check` failure (rc-formal · 9.1 과 동일).

**red 원인 = (b)/(c) 만.** (a) CI 구성 결함은 0. `backend-required` 는 §6 의 정리 전 항목이 해소될 때까지 red 이며, 룰셋 전환(§7)은 그 뒤에 진행한다.

## 10. 후속 단계 표기 (이 단계에서 하지 않은 것)

- 미사용/순환 의존 검사 도구 없음 (knip/madge/depcheck 미설치) → 8단계 패키지 정리에서 도구 도입 여부 결정. `dependency-integrity` 는 lockfile 단일성 · workspace 참조 무결성 · `pnpm dedupe --check` 만.
- SQL 파서 없음 → `migrations-static` 은 파일명 규약 · 순번 · BOM · 문 수 · 금지 문만. JSON Schema 검증 라이브러리(ajv) 없음 → `schemas-contract` 는 구조 규칙(draft 2020-12 · `$id` 유일 · required ⊂ properties · `$ref` 해석)만.
- `tooling/release/artifact-provenance.cjs` `artifact-runtime-qa.cjs` `deploy-from-artifact.cjs` 의 web/admin 목록은 제거하지 않았다: `release-acceptance.cjs` `release-manifest-identity-lock.cjs` `production-deploy-path-lock.cjs` (KEEP 검증기)가 `apps/web/.open-next` payload 픽스처로 수백 어서션을 걸고 있어 목록 제거 = 검증기 재픽스처링(5·9단계). `release-build.yml` 은 workflow_dispatch 전용이며 지금도 실행 불가 상태(이전: `@aipo/web` 필터 실패 → 현재: web artifact 요구 단계에서 실패)라 CI green 과 무관하다.
- `pnpm-workspace.yaml` 의 `tooling/*` 죽은 글롭 · `pnpm.overrides.sharp` · devDependency 4개 = 8단계.
- `engine-acceptance.yml` 태그 pin · `cargo fmt` diff · `lockfile_hash` = Engine Acceptance controlled amendment (2.5단계 소유).
