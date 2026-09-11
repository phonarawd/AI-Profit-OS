# 백엔드 전용 레포 — 삭제 원장 (1단계)

- 기준 SHA: `86f159648578be7031f58393f3f011c8c249433f` (복구 명령은 모두 `git checkout 86f15964 -- <path>` 형식)
- 생성: `2026-09-10T21:08:39.880Z` · 생성기 `node tooling/backend/ownership-graph.cjs` · 수동 판정 `tooling/backend/ownership-overrides.json` (97건)
- 전체 1911 파일 = KEEP 1199 · DELETE 476 · MOVE 77 · SPLIT 159 · UNKNOWN 0
- 이 문서는 실행하지 않는다. 실제 삭제는 각 행의 후속 단계에서 `blockers`(KEEP 참조자)를 먼저 편집한 뒤 수행한다.

## 0. 분류 통계

| class | 파일 수 |
|---|---:|
| OBSOLETE | 469 |
| BACKEND_RUNTIME | 465 |
| BACKEND_TEST | 236 |
| BACKEND_INFRA | 208 |
| BACKEND_DOC | 203 |
| MIXED | 159 |
| BACKEND_CONTRACT | 83 |
| CUSTOMER_WEB | 77 |
| LEGACY_ADMIN_UI | 5 |
| FUTURE_ADMIN_REQUIREMENT | 3 |
| GENERATED | 3 |

| decision | 파일 수 |
|---|---:|
| KEEP | 1199 |
| DELETE | 476 |
| SPLIT | 159 |
| MOVE | 77 |

## 1. 후속 단계 라벨

| 라벨 | 의미 |
|---|---|
| 4단계 UI 검증기·E2E 제거 | UI 전용 `tooling/verify/*.cjs` · Playwright 스펙 · 브라우저 하네스 삭제 (제안 라벨) |
| 5단계 mixed 분리 | MIXED 검증기의 백엔드 어서션을 백엔드 테스트로 옮기고 UI 어서션 제거 · `stack-lock.cjs`·`domain-by-path.cjs`·`stubs/run-all.cjs`·`retired-ui-stubs.cjs` 개정 |
| 6단계 CI 교체 | workflow 삭제/분리 · required check `backend-required` 전환 · 룰셋 JSON 갱신 |
| 7단계 governance 증거 정리 | 화면 스크린샷·시각 reconciliation·홈 승인·figma·platform-redesign 증거 삭제 (제안 라벨) |
| 8단계 패키지 정리 | `packages/sdk` MOVE · `packages/schemas` DELETE · devDependency·scripts 정리 · lockfile 재생성 |
| 9단계 Cloudflare 잔재 | `infra/web`·`infra/ops`·proxy worker·manifest SPLIT · 원격 정리는 별도 승인 |
| 10단계 Markdown 정리 | 규칙·플랜·헌법·루트 MD·CATALOG 분리/삭제 |

## 2. DELETE 대상 (476건 · 디렉터리 그룹)

근거 요약은 그룹 내 최빈 근거 2개다. 파일별 근거·evidence·blockers는 `quality/backend-file-ownership.json` `files[]`에 있다.

| 경로 (glob) | 파일 수 | 분류 | 근거 요약 | 복구 방법 | 후속 단계 |
|---|---:|---|---|---|---|
| `tooling/verify/**` (118/342 · 나머지는 다른 결정) | 118 | OBSOLETE | 참조 대상이 전부 삭제된/UI 경로 (57) / RETIRED_MIXED_UI_STUBS 등재이나 백엔드 경로 참조 0 (31) | `git checkout 86f15964 -- tooling/verify` 후 KEEP 파일 재삭제. | 4단계 UI 검증기·E2E 제거 · 10단계 Markdown 정리 |
| `governance/release-master/**` (52/86 · 나머지는 다른 결정) | 52 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (51) / REL-017 레거시 플랜 스탬프 증거 | `git checkout 86f15964 -- governance/release-master` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 · 10단계 Markdown 정리 |
| `tooling/e2e/specs/**` (50/54 · 나머지는 다른 결정) | 50 | OBSOLETE | Playwright page.* 브라우저 E2E (48) / REL-500 QA Lab 매트릭스: 셀이 브라우저 closure spec 파일에 바인딩 (2) | `git checkout 86f15964 -- tooling/e2e/specs` 후 KEEP 파일 재삭제. | 4단계 UI 검증기·E2E 제거 |
| `governance/consumer-home-approval/**` | 15 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (15) | `git checkout 86f15964 -- governance/consumer-home-approval` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/release-master/rel-109-execute/**` | 13 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (13) | `git checkout 86f15964 -- governance/release-master/rel-109-execute` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/visual-reconciliation/account/**` | 13 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (13) | `git checkout 86f15964 -- governance/visual-reconciliation/account` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/release-master/rel-131-account-figma-final/**` | 12 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (12) | `git checkout 86f15964 -- governance/release-master/rel-131-account-figma-final` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/visual-reconciliation/opportunity/**` | 12 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (12) | `git checkout 86f15964 -- governance/visual-reconciliation/opportunity` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/release-master/rel-131-account-figma-v2/**` | 9 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (9) | `git checkout 86f15964 -- governance/release-master/rel-131-account-figma-v2` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/release-master/rel-131-account-figma/**` | 7 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (7) | `git checkout 86f15964 -- governance/release-master/rel-131-account-figma` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/visual-reconciliation/home/**` | 7 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (7) | `git checkout 86f15964 -- governance/visual-reconciliation/home` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `tooling/e2e/lib/**` (7/13 · 나머지는 다른 결정) | 7 | OBSOLETE | 레포 경로 참조 0 (3) / 참조 대상이 전부 삭제된/UI 경로 (3) | `git checkout 86f15964 -- tooling/e2e/lib` 후 KEEP 파일 재삭제. | 4단계 UI 검증기·E2E 제거 |
| `.github/workflows/**` (6/18 · 나머지는 다른 결정) | 6 | OBSOLETE | UI 이름만 남은 workflow (5) / OpenNext web/ops staging preview 배포 전용 | `git checkout 86f15964 -- .github/workflows` 후 KEEP 파일 재삭제. | 6단계 CI 교체 |
| `governance/release-master/rel-105-guest-visual/**` | 6 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (6) | `git checkout 86f15964 -- governance/release-master/rel-105-guest-visual` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/release-master/rel-106-profits/**` | 6 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (6) | `git checkout 86f15964 -- governance/release-master/rel-106-profits` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `.cursor/rules/**` (5/29 · 나머지는 다른 결정) | 5 | OBSOLETE | ADR-013 Canon wire·Lux·Brand 화면 규칙 / Home Desktop/Mobile geometry Founder freeze | `git checkout 86f15964 -- .cursor/rules` 후 KEEP 파일 재삭제. | 10단계 Markdown 정리 · 9단계 Cloudflare 잔재 |
| `governance/platform-redesign/**` | 5 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (5) | `git checkout 86f15964 -- governance/platform-redesign` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/release-master/rel-107-room/**` | 5 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (5) | `git checkout 86f15964 -- governance/release-master/rel-107-room` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `governance/visual-reconciliation/admin/**` | 5 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (5) | `git checkout 86f15964 -- governance/visual-reconciliation/admin` 후 KEEP 파일 재삭제. | 7단계 governance 증거 정리 |
| `tooling/verify/lib/**` (5/7 · 나머지는 다른 결정) | 5 | OBSOLETE · BACKEND_INFRA | UI 경로 참조 1: apps/admin / UI 경로 참조 5: ../../e2e/lib/local-web-runtime.cjs, ../../e2e/lib/account | `git checkout 86f15964 -- tooling/verify/lib` 후 KEEP 파일 재삭제. | 4단계 UI 검증기·E2E 제거 · 5단계 mixed 분리 |
| `governance/release-master/rel-108-sheet/figma-103-314-11-state.png`<br>`governance/release-master/rel-108-sheet/figma-103-315-desktop.png`<br>`governance/release-master/rel-108-sheet/runtime-insufficient-1440.png`<br>`governance/release-master/rel-108-sheet/runtime-ready-1440.png` | 4 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (4) | `git checkout 86f15964 -- governance/release-master/rel-108-sheet/figma-103-314-11-state.png`<br>`git checkout 86f15964 -- governance/release-master/rel-108-sheet/figma-103-315-desktop.png`<br>`git checkout 86f15964 -- governance/release-master/rel-108-sheet/runtime-insufficient-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-108-sheet/runtime-ready-1440.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-111-119-journey/desktop-history-detail.png`<br>`governance/release-master/rel-111-119-journey/desktop-wallet.png`<br>`governance/release-master/rel-111-119-journey/mobile-history-detail.png`<br>`governance/release-master/rel-111-119-journey/mobile-wallet.png` | 4 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (4) | `git checkout 86f15964 -- governance/release-master/rel-111-119-journey/desktop-history-detail.png`<br>`git checkout 86f15964 -- governance/release-master/rel-111-119-journey/desktop-wallet.png`<br>`git checkout 86f15964 -- governance/release-master/rel-111-119-journey/mobile-history-detail.png`<br>`git checkout 86f15964 -- governance/release-master/rel-111-119-journey/mobile-wallet.png` | 7단계 governance 증거 정리 |
| `packages/schemas/README.md`<br>`packages/schemas/package.json`<br>`packages/schemas/src/index.ts`<br>`packages/schemas/src/root.ts` | 4 | OBSOLETE | repo-root /schemas 경로 헬퍼 패키지 (4) | `git checkout 86f15964 -- packages/schemas/README.md`<br>`git checkout 86f15964 -- packages/schemas/package.json`<br>`git checkout 86f15964 -- packages/schemas/src/index.ts`<br>`git checkout 86f15964 -- packages/schemas/src/root.ts` | 8단계 패키지 정리 |
| `tooling/deploy/cf-deploy-staging.cjs`<br>`tooling/deploy/cf-pages-ops.cjs`<br>`tooling/deploy/cf-pages-web.cjs`<br>`tooling/deploy/cf-rollback-staging.cjs` | 4 | OBSOLETE | OpenNext web/ops Workers 배포·롤백 / UI 경로 참조 5: apps/admin/package.json, apps/admin, apps/admin/.open-next | `git checkout 86f15964 -- tooling/deploy/cf-deploy-staging.cjs`<br>`git checkout 86f15964 -- tooling/deploy/cf-pages-ops.cjs`<br>`git checkout 86f15964 -- tooling/deploy/cf-pages-web.cjs`<br>`git checkout 86f15964 -- tooling/deploy/cf-rollback-staging.cjs` | 9단계 Cloudflare 잔재 |
| `tooling/verify/responsive/.gitignore`<br>`tooling/verify/responsive/playwright.config.cjs`<br>`tooling/verify/responsive/run-playwright.cjs`<br>`tooling/verify/responsive/tests/canon-structure.spec.cjs` | 4 | OBSOLETE | Canon 뷰포트 Playwright 시각 회귀 하네스 (4) | `git checkout 86f15964 -- tooling/verify/responsive/.gitignore`<br>`git checkout 86f15964 -- tooling/verify/responsive/playwright.config.cjs`<br>`git checkout 86f15964 -- tooling/verify/responsive/run-playwright.cjs`<br>`git checkout 86f15964 -- tooling/verify/responsive/tests/canon-structure.spec.cjs` | 4단계 UI 검증기·E2E 제거 |
| `tooling/verify/stubs/cta-earn-profit.cjs`<br>`tooling/verify/stubs/match-tension-surface.cjs`<br>`tooling/verify/stubs/soft-hard-requeue-sla.cjs`<br>`tooling/verify/stubs/user-trader-jargon-0.cjs` | 4 | OBSOLETE | RETIRED_UI_ONLY_STUBS 등재 (2) / RETIRED_MIXED_UI_STUBS 등재이나 백엔드 경로 참조 0 (2) | `git checkout 86f15964 -- tooling/verify/stubs/cta-earn-profit.cjs`<br>`git checkout 86f15964 -- tooling/verify/stubs/match-tension-surface.cjs`<br>`git checkout 86f15964 -- tooling/verify/stubs/soft-hard-requeue-sla.cjs`<br>`git checkout 86f15964 -- tooling/verify/stubs/user-trader-jargon-0.cjs` | 4단계 UI 검증기·E2E 제거 |
| `workers/ops-proxy/package.json`<br>`workers/ops-proxy/src/index.ts`<br>`workers/ops-proxy/tsconfig.json`<br>`workers/ops-proxy/wrangler.toml` | 4 | LEGACY_ADMIN_UI | ops.hiptk.app → 레거시 어드민 OpenNext origin 프록시 (4) | `git checkout 86f15964 -- workers/ops-proxy/package.json`<br>`git checkout 86f15964 -- workers/ops-proxy/src/index.ts`<br>`git checkout 86f15964 -- workers/ops-proxy/tsconfig.json`<br>`git checkout 86f15964 -- workers/ops-proxy/wrangler.toml` | 9단계 Cloudflare 잔재 |
| `governance/figma/PUTDUK_FIGMA_PROJECT_REGISTRY.json`<br>`governance/figma/TOKEN_SPARKDASH_COLLISION_PLAN.md`<br>`governance/figma/putduk-figma-registry.cjs` | 3 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (3) | `git checkout 86f15964 -- governance/figma/PUTDUK_FIGMA_PROJECT_REGISTRY.json`<br>`git checkout 86f15964 -- governance/figma/TOKEN_SPARKDASH_COLLISION_PLAN.md`<br>`git checkout 86f15964 -- governance/figma/putduk-figma-registry.cjs` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-110-trades/runtime-empty-390.png`<br>`governance/release-master/rel-110-trades/runtime-ready-1440.png`<br>`governance/release-master/rel-110-trades/runtime-ready-390.png` | 3 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (3) | `git checkout 86f15964 -- governance/release-master/rel-110-trades/runtime-empty-390.png`<br>`git checkout 86f15964 -- governance/release-master/rel-110-trades/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-110-trades/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/responsive/DEVICE_TIER.md`<br>`governance/responsive/home-geometry-lock.v1.json`<br>`governance/responsive/large-screen-safety.v1.json` | 3 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (3) | `git checkout 86f15964 -- governance/responsive/DEVICE_TIER.md`<br>`git checkout 86f15964 -- governance/responsive/home-geometry-lock.v1.json`<br>`git checkout 86f15964 -- governance/responsive/large-screen-safety.v1.json` | 7단계 governance 증거 정리 |
| `governance/visual-reconciliation/AUDIT_REPORT.md`<br>`governance/visual-reconciliation/PUTDUK_UI_VISUAL_MATRIX.json`<br>`governance/visual-reconciliation/PUTDUK_UI_VISUAL_MATRIX.md` | 3 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (3) | `git checkout 86f15964 -- governance/visual-reconciliation/AUDIT_REPORT.md`<br>`git checkout 86f15964 -- governance/visual-reconciliation/PUTDUK_UI_VISUAL_MATRIX.json`<br>`git checkout 86f15964 -- governance/visual-reconciliation/PUTDUK_UI_VISUAL_MATRIX.md` | 7단계 governance 증거 정리 |
| `governance/visual-reconciliation/trades/QA.md`<br>`governance/visual-reconciliation/trades/RUNTIME_DESKTOP.png`<br>`governance/visual-reconciliation/trades/RUNTIME_MOBILE.png` | 3 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (3) | `git checkout 86f15964 -- governance/visual-reconciliation/trades/QA.md`<br>`git checkout 86f15964 -- governance/visual-reconciliation/trades/RUNTIME_DESKTOP.png`<br>`git checkout 86f15964 -- governance/visual-reconciliation/trades/RUNTIME_MOBILE.png` | 7단계 governance 증거 정리 |
| `governance/visual-reconciliation/wallet/QA.md`<br>`governance/visual-reconciliation/wallet/RUNTIME_DESKTOP.png`<br>`governance/visual-reconciliation/wallet/RUNTIME_MOBILE.png` | 3 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (3) | `git checkout 86f15964 -- governance/visual-reconciliation/wallet/QA.md`<br>`git checkout 86f15964 -- governance/visual-reconciliation/wallet/RUNTIME_DESKTOP.png`<br>`git checkout 86f15964 -- governance/visual-reconciliation/wallet/RUNTIME_MOBILE.png` | 7단계 governance 증거 정리 |
| `tooling/e2e/expansion/qa-lab-expansion.v1.json`<br>`tooling/e2e/expansion/qa-lab-expansion.v1.md`<br>`tooling/e2e/expansion/qa-lab-personas.v1.md` | 3 | OBSOLETE | REL-500 QA Lab 매트릭스: 셀이 브라우저 closure spec 파일에 바인딩 (3) | `git checkout 86f15964 -- tooling/e2e/expansion/qa-lab-expansion.v1.json`<br>`git checkout 86f15964 -- tooling/e2e/expansion/qa-lab-expansion.v1.md`<br>`git checkout 86f15964 -- tooling/e2e/expansion/qa-lab-personas.v1.md` | 4단계 UI 검증기·E2E 제거 |
| `tooling/pwa/lighthouse-pwa.ci.cjs`<br>`tooling/pwa/webauthn-ux-harness.cjs`<br>`tooling/pwa/webauthn-ux.spec.cjs` | 3 | OBSOLETE | UI 경로 참조 4: apps/web/public/manifest.webmanifest, apps/web/public/sw.j / WebAuthn 브라우저 지원 감지·햅틱 UX 케이스 | `git checkout 86f15964 -- tooling/pwa/lighthouse-pwa.ci.cjs`<br>`git checkout 86f15964 -- tooling/pwa/webauthn-ux-harness.cjs`<br>`git checkout 86f15964 -- tooling/pwa/webauthn-ux.spec.cjs` | 4단계 UI 검증기·E2E 제거 |
| `tooling/verify/fixtures/rel-500-qa-lab-expansion.v1.json`<br>`tooling/verify/fixtures/rel-507-production-e2e.v1.json`<br>`tooling/verify/fixtures/rel-603-age-usability-spotcheck.v1.json` | 3 | OBSOLETE | 소비 검증기가 전부 OBSOLETE: tooling/verify/rel-500-qa-lab-expansion.cjs / 소비 검증기가 전부 OBSOLETE: tooling/verify/rel-507-production-e2e.cjs | `git checkout 86f15964 -- tooling/verify/fixtures/rel-500-qa-lab-expansion.v1.json`<br>`git checkout 86f15964 -- tooling/verify/fixtures/rel-507-production-e2e.v1.json`<br>`git checkout 86f15964 -- tooling/verify/fixtures/rel-603-age-usability-spotcheck.v1.json` | 4단계 UI 검증기·E2E 제거 |
| `FOOTER_LICENSE_COPY.md`<br>`PRE_IMPLEMENTATION_MASTER_AUDIT.md` | 2 | OBSOLETE | preownedwatches.ae WordPress 푸터용 영문 복붙 문구 / 2026-08-09 구현 전 감사 | `git checkout 86f15964 -- FOOTER_LICENSE_COPY.md`<br>`git checkout 86f15964 -- PRE_IMPLEMENTATION_MASTER_AUDIT.md` | 10단계 Markdown 정리 |
| `governance/performance/LIGHTHOUSE.md`<br>`governance/performance/budgets.v1.json` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/performance/LIGHTHOUSE.md`<br>`git checkout 86f15964 -- governance/performance/budgets.v1.json` | 7단계 governance 증거 정리 |
| `governance/pwa/DAY1_CERTIFICATION.md`<br>`governance/pwa/day1-checklist.v1.json` | 2 | OBSOLETE | REL-023 Day-1 PWA 인증 문서 / REL-023 PWA 체크리스트 | `git checkout 86f15964 -- governance/pwa/DAY1_CERTIFICATION.md`<br>`git checkout 86f15964 -- governance/pwa/day1-checklist.v1.json` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-106-110-journey/desktop-1440.png`<br>`governance/release-master/rel-106-110-journey/mobile-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-106-110-journey/desktop-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-106-110-journey/mobile-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-112-settlement/runtime-ready-1440.png`<br>`governance/release-master/rel-112-settlement/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-112-settlement/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-112-settlement/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-113-wallet/runtime-ready-1440.png`<br>`governance/release-master/rel-113-wallet/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-113-wallet/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-113-wallet/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-114-usdt-deposit/runtime-ready-1440.png`<br>`governance/release-master/rel-114-usdt-deposit/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-114-usdt-deposit/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-114-usdt-deposit/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-115-krw-deposit/runtime-pending-1440.png`<br>`governance/release-master/rel-115-krw-deposit/runtime-pending-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-115-krw-deposit/runtime-pending-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-115-krw-deposit/runtime-pending-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-116-usdt-withdraw/runtime-accepted-1440.png`<br>`governance/release-master/rel-116-usdt-withdraw/runtime-accepted-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-116-usdt-withdraw/runtime-accepted-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-116-usdt-withdraw/runtime-accepted-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-117-krw-withdraw/runtime-accepted-1440.png`<br>`governance/release-master/rel-117-krw-withdraw/runtime-accepted-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-117-krw-withdraw/runtime-accepted-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-117-krw-withdraw/runtime-accepted-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-118-history/runtime-ready-1440.png`<br>`governance/release-master/rel-118-history/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-118-history/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-118-history/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-119-history-detail/runtime-ready-1440.png`<br>`governance/release-master/rel-119-history-detail/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-119-history-detail/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-119-history-detail/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-120-invite/runtime-ready-1440.png`<br>`governance/release-master/rel-120-invite/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-120-invite/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-120-invite/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-121-inbox/runtime-ready-1440.png`<br>`governance/release-master/rel-121-inbox/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-121-inbox/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-121-inbox/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-122-peotteok/runtime-ready-1440.png`<br>`governance/release-master/rel-122-peotteok/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-122-peotteok/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-122-peotteok/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-123-profile/runtime-ready-1440.png`<br>`governance/release-master/rel-123-profile/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-123-profile/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-123-profile/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-124-kyc/runtime-ready-1440.png`<br>`governance/release-master/rel-124-kyc/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-124-kyc/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-124-kyc/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-125-settings/runtime-ready-1440.png`<br>`governance/release-master/rel-125-settings/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-125-settings/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-125-settings/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-126-support/runtime-ready-1440.png`<br>`governance/release-master/rel-126-support/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-126-support/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-126-support/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-127-guides/runtime-ready-1440.png`<br>`governance/release-master/rel-127-guides/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-127-guides/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-127-guides/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-128-legal/runtime-ready-1440.png`<br>`governance/release-master/rel-128-legal/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-128-legal/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-128-legal/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-129-partner-trust/runtime-ready-1440.png`<br>`governance/release-master/rel-129-partner-trust/runtime-ready-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-129-partner-trust/runtime-ready-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-129-partner-trust/runtime-ready-390.png` | 7단계 governance 증거 정리 |
| `governance/release-master/rel-130-compat/journey-1440.png`<br>`governance/release-master/rel-130-compat/journey-390.png` | 2 | OBSOLETE | KEEP 검증기/워크플로 참조 0 (2) | `git checkout 86f15964 -- governance/release-master/rel-130-compat/journey-1440.png`<br>`git checkout 86f15964 -- governance/release-master/rel-130-compat/journey-390.png` | 7단계 governance 증거 정리 |
| `tooling/e2e/playwright.config.cjs`<br>`tooling/e2e/playwright.cross-browser.config.cjs` | 2 | OBSOLETE | 브라우저 E2E 잔재 (2) | `git checkout 86f15964 -- tooling/e2e/playwright.config.cjs`<br>`git checkout 86f15964 -- tooling/e2e/playwright.cross-browser.config.cjs` | 4단계 UI 검증기·E2E 제거 |
| `tooling/e2e/fixtures/axe-known-issues.v1.json`<br>`tooling/e2e/fixtures/full-product-axe-inventory.v1.json` | 2 | OBSOLETE | 브라우저 E2E 잔재 (2) | `git checkout 86f15964 -- tooling/e2e/fixtures/axe-known-issues.v1.json`<br>`git checkout 86f15964 -- tooling/e2e/fixtures/full-product-axe-inventory.v1.json` | 4단계 UI 검증기·E2E 제거 |
| `.cursor/plans/ai_profit_os_launch_54c1261e.plan.md` | 1 | OBSOLETE | ARCHIVE 포인터 | `git checkout 86f15964 -- .cursor/plans/ai_profit_os_launch_54c1261e.plan.md` | 10단계 Markdown 정리 |
| `assets/.gitkeep` | 1 | OBSOLETE | 빈 디렉터리 placeholder | `git checkout 86f15964 -- assets/.gitkeep` | 10단계 Markdown 정리 |
| `CONSTITUTION/28_LUX_FINTECH_DESIGN_AND_MOTION.md` | 1 | OBSOLETE | Lux 디자인 시스템·모션 헌법 | `git checkout 86f15964 -- CONSTITUTION/28_LUX_FINTECH_DESIGN_AND_MOTION.md` | 10단계 Markdown 정리 |
| `governance/consumer-acquisition/acquisition-release.v1.json` | 1 | OBSOLETE | KEEP 검증기/워크플로 참조 0 | `git checkout 86f15964 -- governance/consumer-acquisition/acquisition-release.v1.json` | 7단계 governance 증거 정리 |
| `governance/legacy-plan-migration/registry.v1.json` | 1 | OBSOLETE | KEEP 검증기/워크플로 참조 0 | `git checkout 86f15964 -- governance/legacy-plan-migration/registry.v1.json` | 10단계 Markdown 정리 |
| `governance/release-master/rel-111-earnings/runtime-mismatch-1440.png` | 1 | OBSOLETE | KEEP 검증기/워크플로 참조 0 | `git checkout 86f15964 -- governance/release-master/rel-111-earnings/runtime-mismatch-1440.png` | 7단계 governance 증거 정리 |
| `infra/ops/wrangler.toml` | 1 | LEGACY_ADMIN_UI | 레거시 어드민 OpenNext wrangler | `git checkout 86f15964 -- infra/ops/wrangler.toml` | 9단계 Cloudflare 잔재 |
| `infra/web/wrangler.toml` | 1 | CUSTOMER_WEB | OpenNext 고객 웹 wrangler | `git checkout 86f15964 -- infra/web/wrangler.toml` | 9단계 Cloudflare 잔재 |
| `tooling/legacy-plan-stamp.cjs` | 1 | OBSOLETE | REL-017 레거시 플랜 권위 스탬프 — 플랜 정리와 함께 제거 | `git checkout 86f15964 -- tooling/legacy-plan-stamp.cjs` | 10단계 Markdown 정리 |
| `tooling/e2e/helpers/auth-session.cjs` | 1 | OBSOLETE | REL-500 QA Lab 매트릭스: 셀이 브라우저 closure spec 파일에 바인딩 | `git checkout 86f15964 -- tooling/e2e/helpers/auth-session.cjs` | 4단계 UI 검증기·E2E 제거 |
| `tooling/e2e/persona/qa-lab-seed.v1.md` | 1 | OBSOLETE | REL-500 QA Lab 매트릭스: 셀이 브라우저 closure spec 파일에 바인딩 | `git checkout 86f15964 -- tooling/e2e/persona/qa-lab-seed.v1.md` | 4단계 UI 검증기·E2E 제거 |
| `tooling/perf/lighthouse.ci.cjs` | 1 | OBSOLETE | Lighthouse 정적 예산 | `git checkout 86f15964 -- tooling/perf/lighthouse.ci.cjs` | 4단계 UI 검증기·E2E 제거 |
| `tooling/scaffold/monorepo-skeleton.cjs` | 1 | OBSOLETE | apps/web·packages/ui 등 모노레포 스켈레톤 생성기 | `git checkout 86f15964 -- tooling/scaffold/monorepo-skeleton.cjs` | 8단계 패키지 정리 |

## 3. MOVE 대상 (77건 · putduk-web 인계 기록)

MOVE는 이 레포에서 제거하되 **인계 문서에 경로·역할을 기록**한다는 뜻이다. 실제 복사 커밋은 putduk-web 쪽 작업이며 이 레포에서는 하지 않는다.

| 경로 (glob) | 파일 수 | 분류 | 근거 요약 | 복구 방법 | 후속 단계 |
|---|---:|---|---|---|---|
| `packages/sdk/**` | 57 | CUSTOMER_WEB | React 고객 웹 HTTP 클라이언트 (57) | `git checkout 86f15964 -- packages/sdk` 후 KEEP 파일 재삭제. | 8단계 패키지 정리 |
| `CONSTITUTION/**` (6/29 · 나머지는 다른 결정) | 6 | CUSTOMER_WEB | UX·카피 SSOT / PWA·네이티브 경험 헌법 | `git checkout 86f15964 -- CONSTITUTION` 후 KEEP 파일 재삭제. | 10단계 Markdown 정리 |
| `workers/web-proxy/package.json`<br>`workers/web-proxy/src/index.ts`<br>`workers/web-proxy/tsconfig.json`<br>`workers/web-proxy/wrangler.toml` | 4 | CUSTOMER_WEB | app/apex/go → OpenNext 고객 웹 origin 프록시 (4) | `git checkout 86f15964 -- workers/web-proxy/package.json`<br>`git checkout 86f15964 -- workers/web-proxy/src/index.ts`<br>`git checkout 86f15964 -- workers/web-proxy/tsconfig.json`<br>`git checkout 86f15964 -- workers/web-proxy/wrangler.toml` | 9단계 Cloudflare 잔재 |
| `.cursor/rules/korean-ui.mdc`<br>`.cursor/rules/peotteok-performance-target.mdc`<br>`.cursor/rules/visual-master-intake.mdc` | 3 | CUSTOMER_WEB | 쉬운한글·IT0·toneBand 화면 카피 규칙 / PO LOCK 제품 시각 품질·성능 타깃 | `git checkout 86f15964 -- .cursor/rules/korean-ui.mdc`<br>`git checkout 86f15964 -- .cursor/rules/peotteok-performance-target.mdc`<br>`git checkout 86f15964 -- .cursor/rules/visual-master-intake.mdc` | 10단계 Markdown 정리 |
| `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md`<br>`.cursor/plans/ai_profit_os_05_pwa_f6a7b8c9.plan.md` | 2 | CUSTOMER_WEB | UI & UX 플랜 / PWA & Native 플랜 | `git checkout 86f15964 -- .cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md`<br>`git checkout 86f15964 -- .cursor/plans/ai_profit_os_05_pwa_f6a7b8c9.plan.md` | 10단계 Markdown 정리 |
| `infra/ops/access-policy.json` | 1 | FUTURE_ADMIN_REQUIREMENT | ops host CF Access 정책 템플릿 → quality/admin-handoff에 요약 후 제거 | `git checkout 86f15964 -- infra/ops/access-policy.json` | 9단계 Cloudflare 잔재 |
| `tooling/e2e/lib/money-unavailable.cjs` | 1 | CUSTOMER_WEB | moneyDisplayState = 화면 표시 상태 규칙 | `git checkout 86f15964 -- tooling/e2e/lib/money-unavailable.cjs` | 4단계 UI 검증기·E2E 제거 |
| `tooling/e2e/specs/money-unavailable.spec.cjs` | 1 | CUSTOMER_WEB | moneyDisplayState = 화면 표시 상태 규칙 | `git checkout 86f15964 -- tooling/e2e/specs/money-unavailable.spec.cjs` | 4단계 UI 검증기·E2E 제거 |
| `tooling/verify/ledger-journal-reader.runtime.cjs` | 1 | CUSTOMER_WEB | packages/sdk만 검사 | `git checkout 86f15964 -- tooling/verify/ledger-journal-reader.runtime.cjs` | 8단계 패키지 정리 |
| `workers/_shared/opennext-origin.ts` | 1 | CUSTOMER_WEB | OpenNext web/ops origin SSOT 미러 | `git checkout 86f15964 -- workers/_shared/opennext-origin.ts` | 9단계 Cloudflare 잔재 |

## 4. SPLIT 대상 (159건 · MIXED 분리)

| 경로 (glob) | 파일 수 | 분류 | 근거 요약 | 복구 방법 | 후속 단계 |
|---|---:|---|---|---|---|
| `tooling/verify/**` (111/342 · 나머지는 다른 결정) | 111 | MIXED | RETIRED_MIXED_UI_STUBS 등재 (56) / UI 참조 1 + 백엔드 참조 10 (3) | `git checkout 86f15964 -- tooling/verify` 후 KEEP 파일 재삭제. | 10단계 Markdown 정리 · 5단계 mixed 분리 |
| `.cursor/rules/**` (7/29 · 나머지는 다른 결정) | 7 | MIXED | ADR-006 Nest JWT only 규칙은 백엔드 운영 규칙 / §47 Personal AI Fact-only·money mutate 0 정책은 백엔드 | `git checkout 86f15964 -- .cursor/rules` 후 KEEP 파일 재삭제. | 10단계 Markdown 정리 · 5단계 mixed 분리 |
| `(root)/**` (6/19 · 나머지는 다른 결정) | 6 | MIXED | .next/·.open-next/·playwright-report/ 무시 규칙만 제거. / NEXT_PUBLIC_* | `git checkout 86f15964 -- (root)` 후 KEEP 파일 재삭제. | 8단계 패키지 정리 · 10단계 Markdown 정리 |
| `CONSTITUTION/**` (6/29 · 나머지는 다른 결정) | 6 | MIXED | 마케팅 어트리뷰션·CAPI / 성장·전환 프레젠테이션 | `git checkout 86f15964 -- CONSTITUTION` 후 KEEP 파일 재삭제. | 10단계 Markdown 정리 |
| `.cursor/plans/PUTDUK_RELEASE_MASTER.plan.md`<br>`.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md`<br>`.cursor/plans/ai_profit_os_04_admin_e5f6a7b8.plan.md`<br>`.cursor/plans/ai_profit_os_06_infra_a7b8c9d0.plan.md` | 4 | MIXED | REL 136 task 단일 SSOT / ACTIVE Index | `git checkout 86f15964 -- .cursor/plans/PUTDUK_RELEASE_MASTER.plan.md`<br>`git checkout 86f15964 -- .cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md`<br>`git checkout 86f15964 -- .cursor/plans/ai_profit_os_04_admin_e5f6a7b8.plan.md`<br>`git checkout 86f15964 -- .cursor/plans/ai_profit_os_06_infra_a7b8c9d0.plan.md` | 10단계 Markdown 정리 |
| `.github/workflows/deploy-cloudflare.yml`<br>`.github/workflows/gate.yml`<br>`.github/workflows/release-build.yml`<br>`.github/workflows/release-integration-contract.yml` | 4 | MIXED | workers 배포 유지 / verify-gate job | `git checkout 86f15964 -- .github/workflows/deploy-cloudflare.yml`<br>`git checkout 86f15964 -- .github/workflows/gate.yml`<br>`git checkout 86f15964 -- .github/workflows/release-build.yml`<br>`git checkout 86f15964 -- .github/workflows/release-integration-contract.yml` | 6단계 CI 교체 |
| `tooling/deploy/cf-deploy-all.cjs`<br>`tooling/deploy/cf-domain-bridge.cjs`<br>`tooling/deploy/cf-origin-smoke.cjs`<br>`tooling/deploy/cf-preflight.cjs` | 4 | MIXED | workers/api + web/ops surface가 한 스크립트에 공존 (2) / UI 경로 참조 2: apps/web/package.json, apps/admin/package.json | `git checkout 86f15964 -- tooling/deploy/cf-deploy-all.cjs`<br>`git checkout 86f15964 -- tooling/deploy/cf-domain-bridge.cjs`<br>`git checkout 86f15964 -- tooling/deploy/cf-origin-smoke.cjs`<br>`git checkout 86f15964 -- tooling/deploy/cf-preflight.cjs` | 9단계 Cloudflare 잔재 |
| `tooling/pwa/pwa-day1-certification-harness.cjs`<br>`tooling/pwa/pwa-day1-certification.spec.cjs`<br>`tooling/pwa/webauthn-rp.cjs` | 3 | MIXED | UI 경로 참조 10: apps/web/public/manifest.webmanifest, apps/web/public/sw. / apps/web manifest.webmanifest·sw.js·PwaRuntime | `git checkout 86f15964 -- tooling/pwa/pwa-day1-certification-harness.cjs`<br>`git checkout 86f15964 -- tooling/pwa/pwa-day1-certification.spec.cjs`<br>`git checkout 86f15964 -- tooling/pwa/webauthn-rp.cjs` | 5단계 mixed 분리 |
| `tooling/release/artifact-provenance.cjs`<br>`tooling/release/artifact-runtime-qa.cjs`<br>`tooling/release/deploy-from-artifact.cjs` | 3 | MIXED | sha256·copyTree·manifest 헬퍼를 release 스크립트 8개 / UI 참조 4 + 백엔드 참조 1 | `git checkout 86f15964 -- tooling/release/artifact-provenance.cjs`<br>`git checkout 86f15964 -- tooling/release/artifact-runtime-qa.cjs`<br>`git checkout 86f15964 -- tooling/release/deploy-from-artifact.cjs` | 6단계 CI 교체 · 5단계 mixed 분리 |
| `.vscode/extensions.json`<br>`.vscode/settings.json` | 2 | MIXED | bradlc.vscode-tailwindcss 추천 제거. / tailwindCSS.files.exclude·.next/.open-next/playwright-report exclude 항 | `git checkout 86f15964 -- .vscode/extensions.json`<br>`git checkout 86f15964 -- .vscode/settings.json` | 8단계 패키지 정리 |
| `infra/domain.manifest.json`<br>`infra/hosts.manifest.json` | 2 | MIXED | API host (2) | `git checkout 86f15964 -- infra/domain.manifest.json`<br>`git checkout 86f15964 -- infra/hosts.manifest.json` | 9단계 Cloudflare 잔재 |
| `.github/codeql/codeql-config.yml` | 1 | MIXED | paths-ignore의 **/.open-next/** 항목 제거 | `git checkout 86f15964 -- .github/codeql/codeql-config.yml` | 6단계 CI 교체 |
| `.husky/pre-push` | 1 | MIXED | NEXT_DEV_WEBPACK=1 export | `git checkout 86f15964 -- .husky/pre-push` | 8단계 패키지 정리 |
| `tooling/e2e/README.md` | 1 | MIXED | E2E 안내 문서 | `git checkout 86f15964 -- tooling/e2e/README.md` | 10단계 Markdown 정리 |
| `tooling/github/main-gate.ruleset.json` | 1 | MIXED | 레포 JSON의 required context는 gate / verify-gate 인데 라이브 룰셋 20576556 | `git checkout 86f15964 -- tooling/github/main-gate.ruleset.json` | 6단계 CI 교체 |
| `tooling/recovery/classify-local-state.cjs` | 1 | MIXED | UI 참조 8 + 백엔드 참조 2 | `git checkout 86f15964 -- tooling/recovery/classify-local-state.cjs` | 5단계 mixed 분리 |
| `tooling/schemas/_write-trade-license-html.cjs` | 1 | MIXED | docs/kyb/trade-license HTML 생성 | `git checkout 86f15964 -- tooling/schemas/_write-trade-license-html.cjs` | 8단계 패키지 정리 |
| `tooling/verify/stubs/run-all.cjs` | 1 | MIXED | T1 도메인 스텁 러너 | `git checkout 86f15964 -- tooling/verify/stubs/run-all.cjs` | 5단계 mixed 분리 |

## 5. RETIRED_MIXED_UI_STUBS 해체 지도 (87개 · 5단계 입력)

> **실행 완료 (2026-09-11 · 2단계):** 아래 87개 + UI-only 28개(실측 · 문서상 30) 전부 처리. 백엔드 어서션은 `tooling/verify/backend/<domain>/` 45개 파일로 이동(`pnpm verify:backend` · T1), UI 어서션은 `quality/putduk-web-ui-assertions-handoff.md` 에 기록 후 원본·`stubs/` 위임 4개·`lib/retired-ui-stubs.cjs` 삭제(총 120). 판정 차이: `rel-214-admin-audit` DELETE→SPLIT 승격(Nest 소스 트리 검사 보유) · `membership-surfaces`·`market-briefing-no-investment-advice` 는 백엔드 어서션이 다른 포트와 중복이라 포트 없이 삭제. 아래 표는 1단계 입력 원본 그대로 보존.

`tooling/verify/lib/retired-ui-stubs.cjs`의 `RETIRED_MIXED_UI_STUBS` 각 파일을 실제로 읽어 어서션을 분류했다. **SPLIT 56개**는 백엔드 경로(services·schemas·supabase·workers)를 실제로 읽고 백엔드 어서션을 가지므로 백엔드 테스트로 이식한 뒤 삭제한다. **DELETE 31개**는 백엔드 경로 참조가 0이어서 그대로 삭제 가능하다(문구 기반으로 잡힌 백엔드 어서션은 JSON `mixedBreakdown.backendAssertions`에서 재확인). 어서션 원문·소스 경로·줄 번호는 JSON `files[].mixedBreakdown`에 있다.

| 파일 | 결정 | 백엔드 어서션 | UI 어서션 | 백엔드 도메인 | 백엔드 경로(대표) |
|---|---|---:|---:|---|---|
| `adapter-matching-kpi.cjs` | SPLIT | 37 | 7 | 알림·푸시·인박스, 매칭 정책, 자본 구간 | `schemas/adapter-matching-kpi.v1.json`<br>`services/api-nest/src/adapters/adapters.admin.controller.ts` |
| `admin-entry-e2e.cjs` | DELETE | 1 | 2 | 알림·푸시·인박스 | - |
| `admin-novice-ui.cjs` | DELETE | 0 | 0 | - | - |
| `admin-routes.cjs` | DELETE | 0 | 3 | - | - |
| `admin-user-opportunity-override.cjs` | SPLIT | 27 | 7 | 알림·푸시·인박스, 매칭 정책, 입출금·수수료, 원장 | `schemas/admin-rbac.v1.json`<br>`schemas/manifest.day1.json` |
| `ai-coach-fact-only.cjs` | SPLIT | 12 | 0 | 알림·푸시·인박스, 입출금·수수료, 원장 | `eval/p_fact.jsonl`<br>`services/ai-platform/src/coach-prompt.cjs` |
| `ai-coach-runtime.cjs` | SPLIT | 22 | 12 | 알림·푸시·인박스, AI 서버 호출 정책, 입출금·수수료, 매칭 정책 | `eval/coach_redteam.jsonl`<br>`eval/s_safe_refuse.jsonl` |
| `ai-coach-ui.cjs` | DELETE | 1 | 16 | 알림·푸시·인박스 | - |
| `arbitrage-type-label.cjs` | SPLIT | 32 | 5 | 알림·푸시·인박스, 혜택·미션, 입출금·수수료, 매칭 정책 | `schemas/opportunity-card.v1.json`<br>`services/api-nest/src/opportunities/opportunities.mi.ts` |
| `asset-image-surface.cjs` | SPLIT | 35 | 16 | 알림·푸시·인박스, 자본 구간, 매칭 정책, 원장 | `infra/r2/asset-images.toml`<br>`schemas/asset-master.v1.json` |
| `auth-flows.cjs` | SPLIT | 32 | 5 | 알림·푸시·인박스, 인증·세션·쿠키, 혜택·미션, KYC 정책, 입출금·수수료 | `schemas/auth-session.v1.json`<br>`schemas/user-profile.v1.json` |
| `axe-harness.cjs` | DELETE | 2 | 20 | 알림·푸시·인박스, 인증·세션·쿠키 | - |
| `balance-aware-feed.cjs` | SPLIT | 55 | 23 | 알림·푸시·인박스, 입출금·수수료, 원장, 매칭 정책 | `schemas/balance-aware-fact.v1.json`<br>`schemas/deposit-suggest-query.v1.json` |
| `benefit-hub-surfaces.cjs` | SPLIT | 19 | 17 | 알림·푸시·인박스, 원장, 혜택·미션, 인증·세션·쿠키 | `services/api-nest/src/missions/benefits.user.controller.ts`<br>`services/api-nest/src/missions/benefits.user.routes.ts` |
| `capital-tier-catalog.cjs` | SPLIT | 25 | 1 | 알림·푸시·인박스, 자본 구간, 입출금·수수료, 매칭 정책 | `services/api-nest/src/opportunities/opportunities.admin.controller.ts`<br>`services/api-nest/src/opportunities/opportunities.admin.service.ts` |
| `critical-cross-browser.cjs` | DELETE | 5 | 5 | 알림·푸시·인박스, 인증·세션·쿠키 | - |
| `day-pulse-live-only.cjs` | SPLIT | 7 | 9 | 알림·푸시·인박스, 매칭 정책, 원장 | `schemas/day-opportunity-pulse.v1.json`<br>`services/api-nest/src/loop/day-pulse.service.ts` |
| `deposit-config-fail-closed.cjs` | SPLIT | 36 | 0 | 알림·푸시·인박스, 입출금·수수료, 매칭 정책, 인증·세션·쿠키 | `schemas/deposit-config.v1.json`<br>`schemas/toast-codes.v1.json` |
| `deposit-network-plain-ko.cjs` | SPLIT | 16 | 28 | 알림·푸시·인박스, 입출금·수수료, 원장 | `schemas/deposit-dispute.v1.json`<br>`schemas/toast-codes.v1.json` |
| `full-product-axe-inventory.cjs` | DELETE | 2 | 4 | 알림·푸시·인박스 | - |
| `home-closure.cjs` | DELETE | 2 | 31 | 알림·푸시·인박스 | - |
| `home-live-wire.cjs` | DELETE | 1 | 13 | 알림·푸시·인박스 | - |
| `home-state-truth.cjs` | SPLIT | 26 | 6 | 알림·푸시·인박스, 인증·세션·쿠키, 입출금·수수료, 매칭 정책, 자본 구간 | `schemas/home-read-model.v1.json`<br>`schemas/manifest.day1.json` |
| `krw-admin-decide.cjs` | SPLIT | 43 | 1 | 알림·푸시·인박스, 입출금·수수료, 원장, KYC 정책 | `schemas/krw-deposit-request.v1.json`<br>`schemas/toast-codes.v1.json` |
| `kyc-withdraw-only.cjs` | SPLIT | 27 | 5 | 알림·푸시·인박스, KYC 정책, 인증·세션·쿠키 | `schemas/kyc-status.v1.json`<br>`schemas/kyc-submission.v1.json` |
| `leftover-browser-harness.cjs` | DELETE | 19 | 0 | 알림·푸시·인박스, 자본 구간, KYC 정책, 입출금·수수료 | `governance/recovery/leftover-browser-evidence.v1.json` |
| `loop-psychology.cjs` | SPLIT | 2 | 22 | 알림·푸시·인박스 | `services/api-nest/src/loop/day-pulse.service.ts` |
| `luxury-bag-vertical.cjs` | SPLIT | 23 | 2 | 알림·푸시·인박스, KYC 정책, 매칭 정책 | `schemas/asset-master.v1.json`<br>`services/api-nest/src/opportunities/opportunities.admin.controller.ts` |
| `margin-compare-surface.cjs` | SPLIT | 3 | 12 | 알림·푸시·인박스, 입출금·수수료 | `schemas/opportunity-pricing.v1.json`<br>`services/market-intelligence/src/pricing-formula.cjs` |
| `market-briefing-no-investment-advice.cjs` | SPLIT | 1 | 10 | 알림·푸시·인박스 | `schemas/simulation-report.v1.json` |
| `market-intel-engine.cjs` | SPLIT | 14 | 3 | 알림·푸시·인박스, 매칭 정책 | `schemas/asset-master.v1.json`<br>`schemas/fx-snapshot.v1.json` |
| `match-strictness.cjs` | SPLIT | 57 | 6 | 알림·푸시·인박스, 원장, 멤버십, 매칭 정책, 입출금·수수료, idempotency | `schemas/execution-policy.v1.json`<br>`services/api-nest/src/app.module.ts` |
| `membership-daily-cap.cjs` | SPLIT | 19 | 1 | 매칭 정책, 입출금·수수료 | `schemas/user-match-policy-override.v1.json`<br>`services/api-nest/src/membership/membership.routes.ts` |
| `membership-ladder.cjs` | SPLIT | 45 | 2 | 알림·푸시·인박스, 멤버십, 매칭 정책, 입출금·수수료, 인증·세션·쿠키, 원장 | `schemas/user-membership.v1.json`<br>`services/api-nest/src/app.module.ts` |
| `membership-surfaces.cjs` | SPLIT | 1 | 17 | 알림·푸시·인박스 | `services/api-nest/src/membership/membership.user.controller.ts` |
| `money-unavailable.cjs` | DELETE | 6 | 6 | 알림·푸시·인박스, 자본 구간 | - |
| `no-fulfill-rate-as-rule.cjs` | SPLIT | 13 | 2 | 매칭 정책, 알림·푸시·인박스, 원장, 멤버십, KYC 정책 | `schemas/user-membership.v1.json`<br>`services/api-nest/src/membership/membership.admin.controller.ts` |
| `no-success-rate-percent.cjs` | SPLIT | 7 | 4 | 매칭 정책 | `schemas/execution-policy.v1.json`<br>`schemas/user-match-policy-override.v1.json` |
| `ops-inbox.cjs` | SPLIT | 8 | 16 | 알림·푸시·인박스, KYC 정책 | `schemas/ops-inbox-message.v1.json`<br>`services/api-nest/src/inbox/inbox.user.controller.ts` |
| `participate-proof.cjs` | SPLIT | 3 | 9 | 알림·푸시·인박스, KYC 정책 | `schemas/participate-proof.v1.json`<br>`services/api-nest/src/opportunities/participate.service.ts` |
| `practice-non-withdrawable.cjs` | SPLIT | 16 | 8 | 알림·푸시·인박스, 입출금·수수료, 연습 자금, 인증·세션·쿠키, 원장 | `schemas/practice-grant.v1.json`<br>`schemas/toast-codes.v1.json` |
| `preflight-may-stop.cjs` | SPLIT | 9 | 11 | 알림·푸시·인박스, 매칭 정책 | `schemas/participate-request.v1.json`<br>`schemas/toast-codes.v1.json` |
| `principal-profit-abuse.cjs` | SPLIT | 22 | 3 | 알림·푸시·인박스, 자본 구간, 입출금·수수료, 인증·세션·쿠키, 원장 | `schemas/risk-queue.v1.json`<br>`schemas/risk-signal.v1.json` |
| `principal-withdraw-reachable.cjs` | SPLIT | 8 | 17 | 알림·푸시·인박스, 원장 | `services/api-nest/src/ledger/ledger.admin.controller.ts`<br>`services/api-nest/src/ledger/ledger.routes.ts` |
| `profits-live-wire.cjs` | DELETE | 18 | 6 | 알림·푸시·인박스, 입출금·수수료, 인증·세션·쿠키, 자본 구간, 매칭 정책 | - |
| `pwa-day1-certification.cjs` | DELETE | 8 | 6 | 알림·푸시·인박스, 인증·세션·쿠키 | - |
| `referral-pool-fifo.cjs` | SPLIT | 8 | 1 | 알림·푸시·인박스, 원장, 입출금·수수료, 혜택·미션 | `schemas/referral-edge.v1.json`<br>`schemas/toast-codes.v1.json` |
| `referral-unlimited-invites.cjs` | SPLIT | 11 | 5 | 알림·푸시·인박스, 혜택·미션, KYC 정책 | `schemas/referral-edge.v1.json`<br>`schemas/referral-program.v1.json` |
| `rel-201-admin-dashboard.cjs` | DELETE | 1 | 7 | 알림·푸시·인박스 | - |
| `rel-202-admin-users.cjs` | DELETE | 0 | 3 | - | - |
| `rel-203-admin-user-detail.cjs` | DELETE | 0 | 1 | - | - |
| `rel-204-admin-user-finance.cjs` | DELETE | 0 | 4 | - | - |
| `rel-205-admin-ledger.cjs` | DELETE | 0 | 2 | - | - |
| `rel-206-admin-wallet.cjs` | DELETE | 0 | 2 | - | - |
| `rel-207-admin-compliance.cjs` | SPLIT | 13 | 0 | 알림·푸시·인박스, 인증·세션·쿠키, KYC 정책, 입출금·수수료 | `services/api-nest/src/compliance/kyc.admin.controller.ts` |
| `rel-208-admin-risk.cjs` | SPLIT | 10 | 0 | 알림·푸시·인박스, 인증·세션·쿠키, 입출금·수수료 | `services/api-nest/src/risk/risk.admin.controller.ts` |
| `rel-209-admin-execution-policy.cjs` | SPLIT | 14 | 0 | 알림·푸시·인박스, 매칭 정책, 인증·세션·쿠키 | `services/api-nest/src/execution-policy/execution-policy.admin.controller.ts` |
| `rel-210-admin-opportunities.cjs` | SPLIT | 4 | 0 | 알림·푸시·인박스, 매칭 정책, 입출금·수수료 | `services/api-nest/src/opportunities/opportunities.admin.controller.ts` |
| `rel-211-admin-adapters.cjs` | SPLIT | 4 | 0 | 알림·푸시·인박스, 매칭 정책 | `services/api-nest/src/adapters/adapters.admin.controller.ts` |
| `rel-212-admin-support.cjs` | SPLIT | 5 | 0 | 알림·푸시·인박스, 입출금·수수료, 원장 | `services/api-nest/src/wallet/deposit-dispute.admin.controller.ts` |
| `rel-213-admin-system-control.cjs` | SPLIT | 24 | 0 | 알림·푸시·인박스, 입출금·수수료, 혜택·미션 | `services/api-nest/src/push/push-kill.admin.controller.ts`<br>`services/api-nest/src/risk/risk.admin.controller.ts` |
| `rel-214-admin-audit.cjs` | DELETE | 12 | 0 | 알림·푸시·인박스 | `governance/admin/control-plane-superset.md` |
| `rel-215-admin-ai-logs.cjs` | SPLIT | 15 | 2 | 알림·푸시·인박스 | `services/api-nest/src/ai/ai-logs.admin.controller.ts`<br>`services/api-nest/src/ai/ai-logs.admin.service.ts` |
| `rel-216-admin-financial.cjs` | SPLIT | 6 | 0 | 알림·푸시·인박스, 원장, 입출금·수수료 | `services/api-nest/src/ledger/ledger.admin.controller.ts` |
| `rel-217-admin-growth.cjs` | DELETE | 1 | 2 | 알림·푸시·인박스 | - |
| `rel-218-admin-growth-deposit.cjs` | DELETE | 1 | 6 | 알림·푸시·인박스 | - |
| `rel-219-admin-growth-ticker.cjs` | DELETE | 1 | 6 | 알림·푸시·인박스 | - |
| `rel-220-admin-growth-whale.cjs` | DELETE | 1 | 6 | 알림·푸시·인박스 | - |
| `rel-221-admin-growth-content.cjs` | DELETE | 1 | 6 | 알림·푸시·인박스 | - |
| `responsive.cjs` | DELETE | 5 | 40 | 알림·푸시·인박스 | - |
| `sdk-user-feed.cjs` | DELETE | 1 | 15 | 알림·푸시·인박스 | - |
| `share-copy.cjs` | SPLIT | 4 | 9 | 알림·푸시·인박스, 혜택·미션 | `services/api-nest/src/referral/referral.controller.ts`<br>`services/api-nest/src/referral/referral.share.service.ts` |
| `simulation-gate.cjs` | SPLIT | 39 | 9 | 알림·푸시·인박스, 입출금·수수료, 혜택·미션, 매칭 정책 | `schemas/simulation-gate.v1.json`<br>`schemas/simulation-report.v1.json` |
| `soft-hard-requeue-sla.cjs` | SPLIT | 5 | 10 | 매칭 정책 | `schemas/trade-execution-state.v1.json`<br>`supabase/migrations/20260808205850_opportunities_pricing.sql` |
| `sweeper-trx-guard.cjs` | SPLIT | 39 | 1 | 알림·푸시·인박스, 입출금·수수료, KYC 정책, 원장, 매칭 정책, AI 서버 호출 정책 | `infra/workers.manifest.json`<br>`schemas/deposit-config.v1.json` |
| `ticker-pii-0.cjs` | SPLIT | 4 | 12 | 알림·푸시·인박스, 입출금·수수료 | `schemas/public-ticker-event.v1.json` |
| `trade-execution-hook.cjs` | DELETE | 1 | 28 | 알림·푸시·인박스 | - |
| `trades-web-wire.cjs` | SPLIT | 43 | 0 | 알림·푸시·인박스, 매칭 정책, 입출금·수수료, 인증·세션·쿠키, 원장, KYC 정책 | `services/api-nest/src/trades/trades.execution.service.ts`<br>`services/api-nest/src/trades/trades.user.controller.ts` |
| `trading-card-vertical.cjs` | SPLIT | 27 | 1 | 알림·푸시·인박스, 멤버십, 매칭 정책, 입출금·수수료, KYC 정책, 자본 구간 | `schemas/asset-master.v1.json`<br>`services/api-nest/src/opportunities/opportunities.admin.controller.ts` |
| `ultra-watch-whale.cjs` | SPLIT | 36 | 2 | 알림·푸시·인박스, 자본 구간, 입출금·수수료, KYC 정책, 매칭 정책 | `schemas/asset-master.v1.json`<br>`services/api-nest/src/opportunities/opportunities.admin.controller.ts` |
| `user-trader-jargon-0.cjs` | SPLIT | 16 | 16 | 알림·푸시·인박스, 자본 구간, 매칭 정책 | `schemas/opportunity-card.v1.json`<br>`services/api-nest/src/opportunities/opportunities.mi.ts` |
| `ux-design-system.cjs` | DELETE | 1 | 16 | 알림·푸시·인박스 | - |
| `wallet-live-wire.cjs` | DELETE | 1 | 6 | 알림·푸시·인박스 | - |
| `webauthn-ux-rp.cjs` | SPLIT | 17 | 14 | 알림·푸시·인박스, 인증·세션·쿠키, 입출금·수수료 | `services/api-nest/src/auth/auth.service.ts`<br>`services/api-nest/src/auth/webauthn-assert.service.ts` |
| `withdraw-fee-ledger.cjs` | SPLIT | 25 | 1 | 알림·푸시·인박스, 입출금·수수료 | `schemas/deposit-config.v1.json`<br>`schemas/toast-codes.v1.json` |
| `withdraw-flow-wire.cjs` | DELETE | 1 | 12 | 알림·푸시·인박스 | - |
| `withdraw-mode-default.cjs` | SPLIT | 5 | 10 | 알림·푸시·인박스, 입출금·수수료 | `schemas/withdraw-intent.v1.json`<br>`services/api-nest/src/wallet/wallet.controller.ts` |

## 6. 선행 편집이 필요한 KEEP 참조자 (blockers)

삭제/분리 대상을 **KEEP 코드가 직접 참조**하는 경우다. 이 참조자를 먼저 고치지 않으면 T0/T1이 깨진다. (문서 링크·디렉터리 glob 참조는 제외)

| 삭제/분리 대상 | 결정 | 선행 편집이 필요한 KEEP 참조자 (kind) |
|---|---|---|
| `package.json` | SPLIT | scripts/hook-internal-failure-security.mjs(verifier-reads)<br>scripts/hook-stability-stress.mjs(verifier-reads)<br>scripts/verify-night-guard.mjs(verifier-reads)<br>scripts/verify-project-boundary.mjs(verifier-reads)<br>tooling/dev/ensure-node.cjs(deploy-cmd)<br>... +91 |
| `tooling/verify/CATALOG.md` | SPLIT | scripts/verify-night-guard.mjs(verifier-reads)<br>tooling/verify/ai-coach-runtime.cjs(verifier-reads)[SPLIT]<br>tooling/verify/ai-feature-platform.cjs(verifier-reads)[SPLIT]<br>tooling/verify/ai-guard-authority.cjs(verifier-reads)<br>tooling/verify/ai-scope-guard.cjs(verifier-reads)<br>... +60 |
| `tooling/verify/domain-by-path.cjs` | SPLIT | tooling/verify/auth-rate-limit.cjs(verifier-reads)<br>tooling/verify/b3-promotion.cjs(verifier-reads)<br>tooling/verify/domain-by-path.selftest.cjs(require)<br>tooling/verify/domain-by-path.selftest.cjs(verifier-reads)<br>tooling/verify/gate-tiers.cjs(require)<br>... +22 |
| `.github/workflows/gate.yml` | SPLIT | tooling/verify/rel-222-admin-ops.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-223-match-control.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-224-source-policy.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-402-dependency-audit.cjs(verifier-reads)<br>tooling/verify/rel-403-versioning.cjs(verifier-reads)<br>... +16 |
| `.cursor/plans/PUTDUK_RELEASE_MASTER.plan.md` | SPLIT | tooling/verify/backend-data-alignment.cjs(verifier-reads)[SPLIT]<br>tooling/verify/lib/rel-502-psm.cjs(verifier-reads)<br>tooling/verify/rel-408-security-baseline.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-409-r6-cert.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-501-money-red-team.cjs(verifier-reads)<br>... +8 |
| `.env.example` | SPLIT | tooling/recovery/classify-local-state.cjs(deploy-cmd)[SPLIT]<br>tooling/recovery/scan-secret-risk.cjs(deploy-cmd)<br>tooling/verify/asset-image-surface.cjs(verifier-reads)[SPLIT]<br>tooling/verify/conversation-state-bounded.cjs(verifier-reads)[SPLIT]<br>tooling/verify/domain-bootstrap.cjs(verifier-reads)[SPLIT]<br>... +8 |
| `tooling/release/artifact-provenance.cjs` | SPLIT | tooling/deploy/cf-workers.cjs(require)<br>tooling/release/api-artifact-runtime-qa.cjs(require)<br>tooling/release/artifact-runtime-qa.cjs(require)[SPLIT]<br>tooling/release/bind-qa-artifact.cjs(require)<br>tooling/release/build-once-artifact.cjs(require)<br>... +8 |
| `.github/workflows/deploy-cloudflare.yml` | SPLIT | tooling/verify/cf-infra.cjs(verifier-reads)[SPLIT]<br>tooling/verify/ebay-worker-deploy-path.cjs(verifier-reads)<br>tooling/verify/p0-ebay-secret-provisioning.cjs(verifier-reads)<br>tooling/verify/phase0-bootstrap.cjs(verifier-reads)[SPLIT]<br>tooling/verify/production-deploy-path-lock.cjs(verifier-reads)[SPLIT]<br>... +7 |
| `infra/domain.manifest.json` | SPLIT | tooling/deploy/cf-domain-bootstrap.cjs(deploy-cmd)<br>tooling/deploy/cf-origin-smoke.cjs(deploy-cmd)[SPLIT]<br>tooling/deploy/cf-preflight.cjs(deploy-cmd)[SPLIT]<br>tooling/deploy/lib/non-prod-api-host.cjs(deploy-cmd)<br>tooling/pwa/webauthn-rp.cjs(test-ref)[SPLIT]<br>... +7 |
| `infra/ops/wrangler.toml` | DELETE | tooling/deploy/cf-preflight.cjs(deploy-cmd)[SPLIT]<br>tooling/release/artifact-runtime-qa.cjs(deploy-cmd)[SPLIT]<br>tooling/verify/cf-infra.cjs(verifier-reads)[SPLIT]<br>tooling/verify/domain-bootstrap.cjs(verifier-reads)[SPLIT]<br>tooling/verify/phase0-bootstrap.cjs(verifier-reads)[SPLIT]<br>... +3 |
| `infra/web/wrangler.toml` | DELETE | tooling/deploy/cf-preflight.cjs(deploy-cmd)[SPLIT]<br>tooling/release/artifact-runtime-qa.cjs(deploy-cmd)[SPLIT]<br>tooling/verify/cf-infra.cjs(verifier-reads)[SPLIT]<br>tooling/verify/domain-bootstrap.cjs(verifier-reads)[SPLIT]<br>tooling/verify/phase0-bootstrap.cjs(verifier-reads)[SPLIT]<br>... +3 |
| `packages/sdk/package.json` | MOVE | tooling/verify/home-money-read-contract.cjs(verifier-reads)[SPLIT]<br>tooling/verify/home-state-truth.cjs(verifier-reads)[SPLIT]<br>tooling/verify/participate-web-wire.cjs(verifier-reads)[SPLIT]<br>tooling/verify/pwa-push-badge.cjs(verifier-reads)[SPLIT]<br>tooling/verify/stack-lock.cjs(verifier-reads)[SPLIT]<br>... +2 |
| `tooling/deploy/cf-pages-ops.cjs` | DELETE | .github/workflows/deploy-cloudflare.yml(workflow-run)[SPLIT]<br>tooling/release/deploy-from-artifact.cjs(deploy-cmd)[SPLIT]<br>tooling/verify/production-deploy-path-lock.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-506-r8-infra-core.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-600-staging.cjs(verifier-reads)[SPLIT]<br>... +1 |
| `tooling/deploy/cf-pages-web.cjs` | DELETE | .github/workflows/deploy-cloudflare.yml(workflow-run)[SPLIT]<br>tooling/release/deploy-from-artifact.cjs(deploy-cmd)[SPLIT]<br>tooling/verify/production-deploy-path-lock.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-506-r8-infra-core.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-600-staging.cjs(verifier-reads)[SPLIT]<br>... +1 |
| `tooling/verify/lib/retired-ui-stubs.cjs` | DELETE | tooling/verify/domain-by-path.cjs(require)[SPLIT]<br>tooling/verify/rel-501-money-red-team.cjs(require)<br>tooling/verify/rel-506-r8-infra-core.cjs(require)[SPLIT]<br>tooling/verify/rel-601-staging-regression.cjs(require)[SPLIT]<br>tooling/verify/rel-602-staging-rollback.cjs(require)[SPLIT]<br>... +1 |
| `tooling/deploy/cf-deploy-all.cjs` | SPLIT | package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:cf:deploy:all)[SPLIT]<br>package.json(pkg-script:cf:deploy:all:prod)[SPLIT]<br>tooling/verify/cf-infra.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-506-r8-infra-core.cjs(verifier-reads)[SPLIT] |
| `tooling/deploy/cf-preflight.cjs` | SPLIT | .github/workflows/deploy-cloudflare.yml(workflow-run)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:cf:preflight)[SPLIT]<br>tooling/release/deploy-from-artifact.cjs(deploy-cmd)[SPLIT]<br>tooling/verify/rel-600-staging.cjs(verifier-reads)[SPLIT] |
| `tooling/release/deploy-from-artifact.cjs` | SPLIT | .github/workflows/deploy-cloudflare.yml(workflow-run)[SPLIT]<br>tooling/verify/production-deploy-path-lock.cjs(require)[SPLIT]<br>tooling/verify/production-deploy-path-lock.cjs(verifier-reads)[SPLIT]<br>tooling/verify/release-acceptance.cjs(verifier-reads)[SPLIT]<br>tooling/verify/release-fetch-deploy-hardening.cjs(require) |
| `infra/ops/access-policy.json` | MOVE | tooling/deploy/cf-preflight.cjs(deploy-cmd)[SPLIT]<br>tooling/verify/cf-infra.cjs(verifier-reads)[SPLIT]<br>tooling/verify/phase0-bootstrap.cjs(verifier-reads)[SPLIT]<br>tooling/verify/root-domain-env.cjs(verifier-reads)[SPLIT] |
| `packages/sdk/src/index.ts` | MOVE | tooling/verify/execute-web-wire.cjs(verifier-reads)[SPLIT]<br>tooling/verify/participate-web-wire.cjs(verifier-reads)[SPLIT]<br>tooling/verify/trades-web-wire.cjs(verifier-reads)[SPLIT]<br>tooling/verify/webauthn-fallback-pointer.cjs(verifier-reads:packages/sdk)[SPLIT] |
| `tooling/deploy/cf-origin-smoke.cjs` | SPLIT | .github/workflows/deploy-cloudflare.yml(workflow-run)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:cf:origin-smoke)[SPLIT]<br>package.json(pkg-script:cf:origin-smoke:staging)[SPLIT] |
| `tooling/verify/account-hub-batch.cjs` | DELETE | package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:account-hub-batch)[SPLIT]<br>tooling/verify/account-compat-closure.cjs(require)<br>tooling/verify/account-journey.cjs(require) |
| `tooling/verify/rc-formal.cjs` | SPLIT | .github/workflows/engine-evidence-refresh-check.yml(workflow-run)<br>.github/workflows/engine-evidence-refresh-check.yml(workflow-run:paths)<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rc-formal)[SPLIT] |
| `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` | MOVE | tooling/verify/benefit-hub-surfaces.cjs(verifier-reads)[SPLIT]<br>tooling/verify/brand-asset-provenance.cjs(verifier-reads)[SPLIT]<br>tooling/verify/mission-auto-payout.cjs(verifier-reads) |
| `.gitignore` | SPLIT | scripts/verify-night-guard.mjs(verifier-reads)<br>tooling/recovery/scan-secret-risk.cjs(deploy-cmd)<br>tooling/verify/rc-formal.cjs(verifier-reads)[SPLIT] |
| `packages/sdk/src/home-read-model/fetch.ts` | MOVE | tooling/verify/home-state-truth.cjs(verifier-reads)[SPLIT]<br>tooling/verify/no-fake-zero-status.cjs(verifier-reads)[SPLIT]<br>tooling/verify/webauthn-fallback-pointer.cjs(verifier-reads:packages/sdk)[SPLIT] |
| `packages/sdk/src/participate/fetch.ts` | MOVE | tooling/verify/backend-data-alignment.cjs(verifier-reads)[SPLIT]<br>tooling/verify/participate-web-wire.cjs(verifier-reads)[SPLIT]<br>tooling/verify/webauthn-fallback-pointer.cjs(verifier-reads:packages/sdk)[SPLIT] |
| `packages/sdk/src/wallet/fetch.ts` | MOVE | tooling/verify/backend-data-alignment.cjs(verifier-reads)[SPLIT]<br>tooling/verify/domain-by-path.selftest.cjs(verifier-reads)<br>tooling/verify/webauthn-fallback-pointer.cjs(verifier-reads:packages/sdk)[SPLIT] |
| `tooling/deploy/cf-deploy-staging.cjs` | DELETE | package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:cf:deploy:staging)[SPLIT]<br>tooling/verify/rel-600-staging.cjs(verifier-reads)[SPLIT] |
| `tooling/deploy/cf-domain-bridge.cjs` | SPLIT | package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:cf:domain:bridge)[SPLIT]<br>tooling/verify/domain-bootstrap.cjs(verifier-reads)[SPLIT] |
| `tooling/deploy/cf-rollback-staging.cjs` | DELETE | package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:cf:rollback:staging)[SPLIT]<br>tooling/verify/rel-602-staging-rollback.cjs(verifier-reads)[SPLIT] |
| `tooling/e2e/README.md` | SPLIT | tooling/verify/qa-env-isolation-guard.cjs(verifier-reads)[SPLIT]<br>tooling/verify/rel-501-money-red-team.cjs(verifier-reads)<br>tooling/verify/rel-601-staging-regression.cjs(verifier-reads)[SPLIT] |
| `tooling/e2e/playwright.config.cjs` | DELETE | tooling/verify/invite-closure.cjs(verifier-reads)[SPLIT]<br>tooling/verify/qa-env-isolation-guard.cjs(verifier-reads)[SPLIT]<br>tooling/verify/settings-closure.cjs(verifier-reads)[SPLIT] |
| `tooling/release/artifact-runtime-qa.cjs` | SPLIT | .github/workflows/release-acceptance.yml(workflow-run)<br>tooling/verify/release-acceptance.cjs(require)[SPLIT]<br>tooling/verify/release-acceptance.cjs(verifier-reads)[SPLIT] |
| `tooling/verify/backend-data-alignment.cjs` | SPLIT | package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:backend-data-alignment)[SPLIT]<br>tooling/verify/rel-505-r7-backend-alignment.cjs(verifier-reads) |
| `tooling/verify/cta-earn-profit.cjs` | DELETE | package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:cta-earn-profit)[SPLIT]<br>package.json(pkg-script:verify:cta-match-participate)[SPLIT] |
| `tooling/verify/home-money-read-contract.cjs` | SPLIT | package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:home-money-read-contract)[SPLIT]<br>tooling/engine-acceptance/checks/user-isolation-surfaces.cjs(test-ref) |
| `tooling/verify/rel-222-admin-ops.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-222-admin-ops)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-222-admin-ops)[SPLIT] |
| `tooling/verify/rel-223-match-control.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-223-match-control)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-223-match-control)[SPLIT] |
| `tooling/verify/rel-224-source-policy.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-224-source-policy)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-224-source-policy)[SPLIT] |
| `tooling/verify/rel-401-security-headers.cjs` | SPLIT | package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-401-security-headers)[SPLIT]<br>tooling/recovery/classify-local-state.cjs(deploy-cmd)[SPLIT] |
| `tooling/verify/rel-404-lighthouse-budget.cjs` | DELETE | .github/workflows/gate.yml(workflow-run:verify:rel-404-lighthouse-budget)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-404-lighthouse-budget)[SPLIT] |
| `tooling/verify/rel-405-rbac-audit.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-405-rbac-audit)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-405-rbac-audit)[SPLIT] |
| `tooling/verify/rel-406-kill-switch.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-406-kill-switch)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-406-kill-switch)[SPLIT] |
| `tooling/verify/rel-407-price-override.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-407-price-override)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-407-price-override)[SPLIT] |
| `tooling/verify/rel-408-security-baseline.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-408-security-baseline)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-408-security-baseline)[SPLIT] |
| `tooling/verify/rel-409-r6-cert.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-409-r6-cert)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-409-r6-cert)[SPLIT] |
| `tooling/verify/rel-500-qa-lab-expansion.cjs` | DELETE | .github/workflows/gate.yml(workflow-run:verify:rel-500-qa-lab-expansion)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-500-qa-lab-expansion)[SPLIT] |
| `tooling/verify/rel-506-r8-infra-core.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-506-r8-infra-core)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-506-r8-infra-core)[SPLIT] |
| `tooling/verify/rel-507-production-e2e.cjs` | DELETE | .github/workflows/gate.yml(workflow-run:verify:rel-507-production-e2e)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-507-production-e2e)[SPLIT] |
| `tooling/verify/rel-508-current-fx-approx.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-508-current-fx-approx)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-508-current-fx-approx)[SPLIT] |
| `tooling/verify/rel-600-staging.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-600-staging)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-600-staging)[SPLIT] |
| `tooling/verify/rel-601-staging-regression.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-601-staging-regression)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-601-staging-regression)[SPLIT] |
| `tooling/verify/rel-602-staging-rollback.cjs` | SPLIT | .github/workflows/gate.yml(workflow-run:verify:rel-602-staging-rollback)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-602-staging-rollback)[SPLIT] |
| `tooling/verify/rel-603-age-usability-spotcheck.cjs` | DELETE | .github/workflows/gate.yml(workflow-run:verify:rel-603-age-usability-spotcheck)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:rel-603-age-usability-spotcheck)[SPLIT] |
| `tooling/verify/root-domain-env.cjs` | SPLIT | .github/workflows/deploy-cloudflare.yml(workflow-run:verify:root-domain-env)[SPLIT]<br>package.json(pkg-script)[SPLIT]<br>package.json(pkg-script:verify:root-domain-env)[SPLIT] |
| `tooling/verify/stubs/run-all.cjs` | SPLIT | tooling/verify/home-money-read-contract.cjs(verifier-reads)[SPLIT]<br>tooling/verify/home-state-truth.cjs(verifier-reads)[SPLIT]<br>tooling/verify/no-fake-zero-status.cjs(verifier-reads)[SPLIT] |
| `workers/ops-proxy/wrangler.toml` | DELETE | tooling/deploy/cf-domain-bridge.cjs(deploy-cmd:workers/ops-proxy)[SPLIT]<br>tooling/verify/cf-infra.cjs(verifier-reads)[SPLIT]<br>tooling/verify/domain-bootstrap.cjs(verifier-reads)[SPLIT] |
| `workers/web-proxy/wrangler.toml` | MOVE | tooling/deploy/cf-domain-bridge.cjs(deploy-cmd:workers/web-proxy)[SPLIT]<br>tooling/verify/cf-infra.cjs(verifier-reads)[SPLIT]<br>tooling/verify/domain-bootstrap.cjs(verifier-reads)[SPLIT] |
| `.cursor/plans/ai_profit_os_04_admin_e5f6a7b8.plan.md` | SPLIT | tooling/verify/growth-public-surface.cjs(verifier-reads)[SPLIT]<br>tooling/verify/mission-no-manual-grant.cjs(verifier-reads) |

(blockers: 314 files, top 60 shown; full list = JSON `files[].blockers`)

## 7. 루트 `package.json` scripts · devDependencies

- scripts 146 KEEP · 77 DELETE · 104 SPLIT (대상 파일의 결정을 상속)
- DELETE 예정 scripts: `verify:rel-404-lighthouse-budget` · `verify:rel-500-qa-lab-expansion` · `verify:rel-507-production-e2e` · `verify:rel-603-age-usability-spotcheck` · `verify:admin-entry-e2e` · `verify:cta-earn-profit` · `verify:cta-match-participate` · `verify:opportunity-scan-surface` · `verify:membership-badge-assets` · `verify:ai-coach-ui` · `verify:match-tension-surface` · `verify:execution-surfaces` · `verify:kyc-redirect` · `verify:sdk-user-feed` · `verify:home-principal-slots` · `verify:withdraw-flow-wire` · `verify:usdt-withdraw-closure` · `verify:krw-withdraw-closure` · `verify:transaction-history-closure` · `verify:transaction-detail-closure` · `verify:stub-page-actions` · `verify:profits-live-wire` · `verify:opportunity-detail-live-wire` · `verify:participate-sheet-live-wire` · `verify:execute-live-wire` · `verify:trades-live-wire` · `verify:earnings-embed` · `verify:settlement-detail` · `verify:core-opportunity-journey` · `verify:wallet-live-wire` · `verify:wallet-closure` · `verify:inbox-closure` · `verify:peotteok-closure` · `verify:profile-closure` · `verify:kyc-closure` · `verify:support-closure` · `verify:guides-closure` · `verify:legal-closure` · `verify:partner-trust-closure` · `verify:account-hub-batch` · `verify:usdt-deposit-closure` · `verify:krw-deposit-closure` · `verify:kyc-surfaces` · `verify:trust-copy` · `verify:tax-disclaimer` · `verify:objection4` · `verify:deposit-ai-template-path` · `verify:invite-explain-surfaces` · `verify:benefit-no-credits-currency` · `verify:toast-emoji` · `verify:cute-emoji-palette` · `verify:legal-plain-ko` · `verify:part5-shell-toast` · `verify:platform-redesign-inventory` · `verify:platform-fact-state-registry` · `verify:platform-change-control` · `verify:money-unavailable` · `verify:axe-harness` · `verify:critical-cross-browser` · `verify:leftover-browser-harness` · `verify:full-product-axe-inventory` · `verify:pwa-native-shell` · `verify:pwa-day1-certification` · `verify:legacy-plan-migration` · `verify:asset-production-pipeline` · `verify:device-tier-system` · `verify:onboarding-experiential` · `verify:auth-surfaces` · `verify:acquisition-release` · `verify:login-kakao-closure` · `verify:complete-profile-closure` · `verify:onboarding-journey-closure` · `verify:marketing-compliance` · `verify:product-image` · `verify:trade-execution-hook` · `cf:deploy:staging` · `cf:rollback:staging`
- SPLIT 예정 scripts(대상 검증기 분리 후 이름 유지 또는 제거): `verify:stack-lock` · `verify:root-domain-env` · `verify:cf-infra` · `verify:phase0-bootstrap` · `cf:origin-smoke` · `verify:rel-400-admin-control-plane` · `verify:rel-401-security-headers` · `verify:rel-405-rbac-audit` · `verify:rel-406-kill-switch` · `verify:rel-407-price-override` · `verify:rel-408-security-baseline` · `verify:rel-222-admin-ops` · `verify:rel-223-match-control` · `verify:rel-224-source-policy` · `verify:rel-409-r6-cert` · `verify:backend-data-alignment` · `verify:rel-508-current-fx-approx` · `verify:rel-506-r8-infra-core` · `verify:rel-600-staging` · `verify:rel-601-staging-regression` · `verify:rel-602-staging-rollback` · `verify:user-trader-jargon-0` · `verify:margin-compare-surface` · `verify:soft-hard-requeue-sla` · `verify:match-strictness` · `verify:no-success-rate-percent` · `verify:membership-ladder` · `verify:membership-daily-cap` · `verify:no-fulfill-rate-as-rule` · `verify:membership-surfaces` · `verify:ops-inbox` · `verify:notification-prefs-default-on` · `verify:signup-ready-adapters` · `verify:market-partner-adapters` · `verify:market-partner-trust` · `verify:adapter-matching-kpi` · `verify:ebay-identity-ingest` · `verify:simulation-gate` · `verify:ai-feature-platform` · `verify:shadow-replay-drift` · `verify:ai-coach-fact-only` · `verify:ai-coach-runtime` · `verify:conversation-state-bounded` · `verify:market-intel-engine` · `verify:arbitrage-type-label` · `verify:capital-tier-catalog` · `verify:asset-image-surface` · `verify:trading-card-vertical` · `verify:luxury-bag-vertical` · `verify:ultra-watch-whale` · `verify:auth-flows` · `verify:auth-session-cookie` · `verify:home-money-read-contract` · `verify:home-state-truth` · `verify:no-fake-zero-status` · `verify:withdraw-mode-default` · `verify:principal-withdraw-reachable` · `verify:withdraw-fee-ledger` · `verify:deposit-config-fail-closed` · `verify:krw-admin-decide` · `verify:kyc-withdraw-only` · `verify:kyc-r2-only` · `verify:webauthn-fallback-pointer` · `verify:sweeper-trx-guard` · `verify:principal-profit-abuse` · `verify:balance-aware-feed` · `verify:growth-public-surface` · `verify:participate-web-wire` · `verify:execute-web-wire` · `verify:trades-web-wire` · `verify:invite-closure` · `verify:settings-closure` · `verify:admin-user-opportunity-override` · `verify:deposit-network-plain-ko` · `verify:market-briefing-no-investment-advice` · `verify:participate-proof` · `verify:referral-unlimited-invites` · `verify:referral-pool-fifo` · `verify:share-copy` · `verify:practice-non-withdrawable` · `verify:benefit-hub-surfaces` · `verify:age-tone-surfaces` · `verify:ticker-pii-0` · `verify:day-pulse-live-only` · `verify:preflight-may-stop` · `verify:loop-psychology` · `verify:governance-observation-registry` · `verify:rc-formal` · `verify:release-acceptance` · `verify:qa-env-isolation-guard` · `verify:release-manifest-identity-lock` · `verify:production-deploy-path-lock` · `verify:pwa-push-badge` · `verify:push-channel-prefs` · `verify:webauthn-ux-rp` · `verify:user-ledger-query` · `verify:observability` · `verify:operator-footer` · `cf:preflight` · `cf:deploy:all` · `cf:deploy:all:prod` · `cf:origin-smoke:staging` · `cf:domain:bridge` · `verify:domain-bootstrap`

| devDependency | 버전 | 결정 | 실제 사용처 (KEEP/SPLIT) |
|---|---|---|---|
| `@axe-core/playwright` | 4.13.0 | DELETE | (없음) |
| `@cloudflare/workers-types` | ^5.20260809.1 | KEEP | `.npmrc`<br>`tooling/backend/ownership-graph.cjs`<br>`tooling/verify/workers-types.cjs`<br>`workers/amazon-adapter/package.json`<br>... +12 |
| `@playwright/test` | 1.62.1 | KEEP | `.github/workflows/gate.yml`<br>`tooling/e2e/specs/auth-rate-limit.spec.cjs`<br>`tooling/e2e/specs/ledger-user-query.spec.cjs`<br>`tooling/e2e/specs/money-red-team.spec.cjs` |
| `fast-check` | ^4.9.0 | KEEP | `tooling/engine-acceptance/checks/fast-check-properties.cjs`<br>`tooling/verify/engine-acceptance.cjs` |
| `axe-core` | ^4.10.3 | DELETE | (없음) |
| `husky` | ^9.1.7 | KEEP | `.cursor/hooks/pre0-git-gate-smoke.cjs`<br>`scripts/verify-project-boundary.mjs`<br>`tooling/backend/ownership-graph.cjs`<br>`tooling/backend/ownership-overrides.json` |
| `jsdom` | ^26.1.0 | DELETE | (없음) |
| `typescript` | ^5.9.2 | KEEP | `services/api-nest/package.json`<br>`tooling/backend/ownership-graph.cjs`<br>`tooling/verify/admin-boundary.cjs`<br>`tooling/verify/api-nest-build.cjs`<br>... +6 |
| `wrangler` | ^4.120.0 | KEEP | `.github/workflows/provision-ebay-adapter-secrets.yml`<br>`infra/domain.manifest.json`<br>`infra/hosts.manifest.json`<br>`scripts/verify-night-guard.mjs`<br>... +40 |

## 8. KEEP 요약 (1199건)

| 경로 | KEEP 파일 수 | 분류 | 대표 근거 |
|---|---:|---|---|
| `.cursor` | 3 | BACKEND_INFRA | 에이전트 경계 훅/MCP (stack-lock mustExist) |
| `.cursor/hooks` | 6 | BACKEND_INFRA | 에이전트 경계 훅/MCP (stack-lock mustExist) |
| `.cursor/plans` | 3 | BACKEND_DOC | 내용 기준 overrides (sync-plans-ssot 제약 포함) |
| `.cursor/rules` | 14 | BACKEND_DOC | 내용 기준 overrides |
| `.github` | 1 | BACKEND_INFRA | GitHub 설정 |
| `.github/workflows` | 8 | BACKEND_INFRA | 백엔드 CI/배포 workflow |
| `.husky` | 1 | BACKEND_INFRA | git hooks (T0/T1) |
| `(root)` | 11 | BACKEND_INFRA · BACKEND_DOC · GENERATED | 툴체인/무시 설정 |
| `CONSTITUTION` | 16 | BACKEND_DOC · FUTURE_ADMIN_REQUIREMENT | 내용 기준 overrides |
| `docs` | 2 | BACKEND_DOC | 운영/부트스트랩 문서 |
| `docs/kyb` | 2 | BACKEND_DOC | 법인/사업자 증빙 (법률 문서 · 편집 금지) |
| `docs/ops` | 1 | BACKEND_DOC | 운영/부트스트랩 문서 |
| `eval` | 6 | BACKEND_TEST | AI 가드 eval 데이터셋 (verify:ai-*) |
| `governance/admin` | 8 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `governance/brand` | 1 | BACKEND_CONTRACT | T0 brand-consumer.cjs가 읽는 브랜드 이름 SSOT |
| `governance/db-recon` | 9 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `governance/engine-acceptance` | 37 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `governance/global-product` | 4 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `governance/observability` | 3 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `governance/pwa` | 4 | BACKEND_DOC | 시드 없음 → evidence/overrides |
| `governance/recovery` | 42 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `governance/release-inventory` | 3 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `governance/release-master` | 34 | BACKEND_DOC | 백엔드 release evidence (원장·보안·RBAC·kill-switch·마이그레이션·staging·rollback) |
| `governance/release-master/evidence` | 9 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `governance/release-master/rel-b3-promotion` | 1 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `governance/security` | 4 | BACKEND_DOC | 백엔드 release evidence 디렉터리 |
| `infra` | 2 | BACKEND_INFRA | API/R2/workers 인프라 매니페스트 |
| `infra/api` | 2 | BACKEND_INFRA | API/R2/workers 인프라 매니페스트 |
| `infra/r2` | 2 | BACKEND_INFRA | API/R2/workers 인프라 매니페스트 |
| `packages/observability` | 1 | BACKEND_RUNTIME | api-nest obs.exception-filter.ts가 런타임 require |
| `quality` | 9 | BACKEND_DOC · GENERATED | 백엔드 전용 전환 문서 |
| `quality/admin-handoff` | 1 | FUTURE_ADMIN_REQUIREMENT | 미래 어드민 인계 요약 |
| `schemas` | 82 | BACKEND_CONTRACT | JSON 계약 SSOT (소비자 그래프로 재판정) |
| `scripts` | 4 | BACKEND_TEST | 훅 경계/안정성 검증 스크립트 |
| `services/ai-platform` | 25 | BACKEND_RUNTIME | api-nest package.json workspace 의존 (@aipo/*) |
| `services/api-nest` | 336 | BACKEND_RUNTIME · BACKEND_TEST | Nest API 런타임 (tsconfig include src/**) |
| `services/engine-rust` | 13 | BACKEND_RUNTIME · BACKEND_TEST | Rust Rule Engine crate (gate.yml cargo check/test · settlement_rule.cjs 미러) |
| `services/feature-platform` | 5 | BACKEND_RUNTIME | api-nest package.json workspace 의존 (@aipo/*) |
| `services/market-intelligence` | 31 | BACKEND_RUNTIME | api-nest package.json workspace 의존 (@aipo/*) |
| `services/marketing-attribution` | 2 | BACKEND_RUNTIME | 백엔드 스켈레톤(UTM/ROAS/CAPI) · workers/marketing-capi-dispatcher가 M1+ 연동 대상으로 명시 · UI |
| `services/memory-service` | 6 | BACKEND_RUNTIME | api-nest package.json workspace 의존 (@aipo/*) |
| `services/shadow-replay-engine` | 8 | BACKEND_RUNTIME | api-nest package.json workspace 의존 (@aipo/*) |
| `services/simulation-engine` | 7 | BACKEND_RUNTIME | api-nest package.json workspace 의존 (@aipo/*) |
| `services/user-twin-service` | 4 | BACKEND_RUNTIME | api-nest package.json workspace 의존 (@aipo/*) |
| `supabase` | 2 | BACKEND_INFRA | Supabase migration/config (ADR-001 · apply는 별도 절차) |
| `supabase/migrations` | 54 | BACKEND_INFRA | Supabase migration/config (ADR-001 · apply는 별도 절차) |
| `supabase/staging` | 5 | BACKEND_INFRA | Supabase migration/config (ADR-001 · apply는 별도 절차) |
| `tooling/backend` | 2 | BACKEND_INFRA | 백엔드 전용 경계 도구 (이 생성기) |
| `tooling/cleanup` | 4 | BACKEND_INFRA | 로컬 개발/저사양 운영 도구 |
| `tooling/cursor` | 2 | BACKEND_INFRA | 로컬 개발/저사양 운영 도구 |
| `tooling/deploy` | 10 | BACKEND_INFRA | Workers/API 배포 도구 |
| `tooling/dev` | 3 | BACKEND_INFRA | 로컬 개발/저사양 운영 도구 |
| `tooling/e2e/fixtures` | 1 | BACKEND_TEST | QA 격리 allowlist (qa-env-isolation-guard · release-integration-contract paths) |
| `tooling/e2e/lib` | 5 | BACKEND_TEST | HTTP/in-process 하네스 (브라우저 0) |
| `tooling/e2e/money` | 2 | BACKEND_TEST | REL-501 money red-team 매트릭스/보고 (in-process · 소비자 그래프로 재판정) |
| `tooling/e2e/specs` | 3 | BACKEND_TEST | 브라우저 0 · HTTP/in-process 하네스 · @playwright/test는 러너로만 사용 → 8단계에서 node:test 러너로 교 |
| `tooling/ebay-resilience` | 1 | BACKEND_TEST | eBay fault-injection (ebay-fault-injection.yml) |
| `tooling/engine-acceptance` | 75 | BACKEND_TEST | Engine Acceptance QA 하네스 (engine-acceptance*.yml) |
| `tooling/github` | 1 | BACKEND_INFRA | main 룰셋 JSON + 적용 스크립트 (required context 이름 변경 시 함께 갱신) |
| `tooling/lowspec` | 4 | BACKEND_INFRA | 로컬 개발/저사양 운영 도구 |
| `tooling/pwa` | 5 | BACKEND_INFRA · BACKEND_TEST | Web Push VAPID 키 생성 (서버 발송 측) |
| `tooling/recovery` | 9 | BACKEND_INFRA | 복구/증거 재구축 도구 |
| `tooling/release` | 16 | BACKEND_INFRA | 릴리스 아티팩트/수락 도구 (evidence 재판정) |
| `tooling/schemas` | 1 | BACKEND_INFRA | 스키마/법무 문서 생성기 (evidence 재판정) |
| `tooling/security` | 2 | BACKEND_INFRA | 의존성 감사 · 보안 헤더 |
| `tooling/seed` | 1 | BACKEND_INFRA | 카탈로그 런타임 시드 |
| `tooling/verify` | 112 | BACKEND_TEST · BACKEND_INFRA | 검증기 (evidence 재판정) |
| `tooling/verify/fixtures` | 20 | BACKEND_TEST | 검증기 픽스처 (소비 검증기 class 상속) |
| `tooling/verify/lib` | 2 | BACKEND_TEST | 검증기 (evidence 재판정) |
| `workers` | 2 | BACKEND_INFRA | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/_shared` | 1 | BACKEND_INFRA | Nest API origin SSOT (api-stub) |
| `workers/amazon-adapter` | 6 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/api-stub` | 4 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/chain-sweeper` | 9 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/chain-watchers` | 10 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/coingecko-adapter` | 6 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/ebay-adapter` | 10 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/frankfurter-adapter` | 6 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/marketing-capi-dispatcher` | 4 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/pokemontcg-adapter` | 6 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/push-dispatcher` | 8 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/yahoo-jp-adapter` | 6 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
| `workers/ygoprodeck-adapter` | 6 | BACKEND_INFRA · BACKEND_RUNTIME | Worker 설정/패키지 (wrangler.toml · package.json · tsconfig) |
