# PUTDUK 백엔드 전용 — 삭제/분리 계획 (Stage 2–4 준비)

- **전제:** `quality/backend-only-inventory.md`와 동일 베이스 (`origin/main` `c4ebcd87`)
- **원칙:** 참조가 남아 있으면 삭제하지 않는다. 참조 절단은 **별도 커밋**. 한 커밋 = 한 의도.
- **금지:** PR #222 파일 수정 · prod DB apply · 배포 · main 커밋 · force push · `packages/sdk` 이동/삭제

## 0. 반드시 유지 (삭제 계획에서 제외)

| path | 이유 |
|---|---|
| `services/api-nest/**` | 컨트롤러/서비스/DTO/가드/테스트 |
| `services/engine-rust/**` 및 JS 엔진 서비스 | 매칭/정산 |
| `services/api-nest/src/auth/**` | JWT · `aipo_session` · OAuth · Turnstile 서버 검증 |
| `src/ledger/**` `src/wallet/**` | 원장/잔액/입출금/step-up/idempotency |
| `src/compliance/**` | KYC |
| `src/membership/**` `src/missions/**` | 멤버십/혜택 정책 |
| `src/inbox/**` `src/push/**` | 알림 서버 |
| `src/audit/**` `src/common/**` `src/admin-ops/**` | 감사·권한·레이트 리밋·운영 정책 API |
| `supabase/migrations/**` (main에 있는 것) | 초안+이력. apply 안 함 |
| 백엔드 unit/integration/runtime 테스트 | KEEP |
| `schemas/**` | 고객웹·미래 어드민 계약 |
| `infra/api/**` `tooling/deploy` 중 API/워커 | 백엔드 배포 |
| `.github/workflows/gate.yml` 잡 이름 | 임의 rename 금지 |
| `governance/security/**` `governance/recovery/**` `docs/ops/**` | 운영/보안/복구 |
| `packages/sdk/**` | **BLOCKED** PR #222 |
| `tooling/verify/fixtures/migrations-applied.v1.json` | **BLOCKED** PR #222 |
| 법률 문서 · 공식 CI 뱃지 · 정부 마크 · 브랜드 원본 | 편집/삭제 금지 |
| `governance/release-master/**` | 현재 릴리스 증거 |

## 1. 삭제 후보와 현재 참조 (삭제 전 재실행 필수)

명령 템플릿 (PowerShell):

```powershell
rg -n "apps/web|@aipo/web" --glob "!quality/**"
rg -n "apps/admin|@aipo/admin" --glob "!quality/**"
rg -n "packages/ui|@aipo/ui" --glob "!quality/**"
rg -n "next-build|opennext-build|verify:web-lint|packages-ui-typecheck" package.json tooling .github
rg -n "storybook|spark-dash|spark-admin|Toss Premium|lux-fintech" --glob "!quality/**"
```

### 1.1 고객 화면 `apps/web/**`

| 필드 | 내용 |
|---|---|
| path | `apps/web/**` (270 files) |
| 현재 역할 | 퍼뜩 Next PWA |
| referencing code | `pnpm-workspace.yaml` `apps/*` · `package.json` `dev:web` `cf:deploy:web*` `verify:web-lint` `verify:next-build` `verify:opennext-build` · `tooling/verify/stack-lock.cjs` L34–35 · `domain-by-path.cjs` `apps/web/` → `web-lint.cjs` · 다수 `tooling/verify/*-closure.cjs` `home-*.cjs` `kyc-surfaces.cjs` … · `infra/domain.manifest.json` `openNext.web` · `infra/web/wrangler.toml` · `.github/workflows/{consumer-spark-worldclass,critical-axe,critical-cross-browser,lighthouse,spark-global-ui-qa,deploy-cloudflare,deploy-staging,release-build}.yml` · Playwright specs |
| 제거 시 영향 | T0 FAIL · UI CI FAIL · 이 레포 웹 배포 스크립트 깨짐 |
| move target | `phonarawd/putduk-web` (이미 분리). 이 레포에 복사 커밋하지 않음 |
| deletable | **아니오 (지금)** → 참조 절단 후 **예** |
| 확인 명령 | `git ls-tree -r origin/main apps/web/` · `rg apps/web tooling/verify/stack-lock.cjs` |
| 근거 | 고객 화면은 백엔드 레포에 남기지 않음. stack-lock이 존재를 강제하므로 1단계로 검사 제거 |

### 1.2 레거시 어드민 화면 `apps/admin/**`

| 필드 | 내용 |
|---|---|
| path | `apps/admin/**` (47 files) |
| 현재 역할 | Spark/Lux 기반 Ops Next 화면 |
| referencing code | stack-lock L36–37 · `dev:admin` `cf:deploy:ops*` · `verify:admin-routes` `rel-201`–`rel-221` 페이지 리더 · `infra/ops/wrangler.toml` · Playwright admin specs |
| 제거 시 영향 | T0 FAIL. **Admin HTTP API는 유지** |
| move target | `quality/admin-handoff/`에 IA/모듈 요약만. 화면 코드는 재사용 금지 → 삭제 |
| deletable | 참조 절단 후 예 |
| 확인 명령 | `git ls-tree -r origin/main apps/admin/` · `rg apps/admin tooling/verify` |
| 근거 | 미래 어드민은 별도 레포. SparkDash/Toss/Lux 재사용 금지 |

### 1.3 `packages/ui/**`

| 필드 | 내용 |
|---|---|
| path | `packages/ui/**` (286 files) |
| 현재 역할 | Canon/Lux/카피/브랜드 |
| referencing code | stack-lock L29–31 · `apps/web` `apps/admin` package.json · `verify:packages-ui-typecheck` `brand-assets` `canon-surfaces` `no-it-jargon` · `apps/admin/routes.ts` `@aipo/ui/copy/ko` |
| 제거 시 영향 | 화면 빌드 불가. api-nest 런타임 영향 0 |
| move target | 고객 카피/Canon → putduk-web. 어드민 라벨 → handoff 표. **brand assets = REVIEW_REQUIRED** |
| deletable | 브랜드 원본 제외하고 참조 절단 후. 브랜드는 확인 전 유지 또는 handoff 복사만 |
| 확인 명령 | `rg "@aipo/ui" services` → import 0 |
| 근거 | 백엔드가 UI 패키지를 쓰지 않음 |

### 1.4 UI 전용 verify / Playwright / CI

| path | 분류 | 선행 조건 |
|---|---|---|
| `tooling/verify/web-lint.cjs` `packages-ui-typecheck.cjs` `next-build.cjs` `opennext-build.cjs` `next-major-pin.cjs` `tailwind-v4.cjs` `lux-theme-sync.cjs` `dark-leak-guard.cjs` `ia-tabs.cjs` `admin-routes.cjs` `admin-novice-ui.cjs` `rel-201`–`rel-221-admin-*.cjs` (페이지 파일 리더) `*-closure.cjs` (웹 라우트) `home-live-wire.cjs` `responsive/**` `canon-surfaces.cjs` `brand-assets.cjs` … | DELETE_AFTER_REFERENCE_CHECK | `domain-by-path.cjs`·`package.json` 스크립트에서 제거한 뒤 |
| `tooling/e2e/specs/*closure*` `admin-*` `spark-*` `axe-*` `critical-*` | DELETE_AFTER_REFERENCE_CHECK | Playwright 워크플로 절단 후 |
| `.github/workflows/lighthouse.yml` `spark-global-ui-qa.yml` `consumer-spark-worldclass.yml` `critical-axe.yml` `critical-cross-browser.yml` | DELETE_AFTER_REFERENCE_CHECK | required check 여부 미확인 → **워크플로 파일 삭제는 REVIEW_REQUIRED**. 잡 이름 변경 금지. 화면 없으면 실패하므로 조기 스킵 또는 운영자 확인 후 삭제 |
| `origin/main` `T1_PUSH`의 `ia-tabs` `admin-routes` `next-major-pin` `tailwind-v4` `lux-theme-sync` `opennext-workers-origin` `brand-assets` `no-admin-in-web` | 화면 트리 삭제 전 **T1에서 제거**해야 함 | `#221`의 t1-by-path 제외 로직을 복사하지 말고, 이 브랜치에서 main 파일을 직접 백엔드 전용으로 개정 |

**백엔드 verify는 유지:** `stack-lock`(백엔드 경로로 개정) `secrets` `plans-ssot` `pg-module-scan` `api-nest-build` `bucket-invariant` `auth-*` `kyc-*`(서버) `withdraw-*` `membership-*`(정책 로직, 페이지 read 제거 후) `rel-222-admin-ops` `rel-223-match-control` `rel-402`–`408` `rel-501`–`508` `a3` `a4` 등.

주의: `membership-daily-cap.cjs`가 `apps/admin/app/admin/users/[id]/page.tsx`를 읽음. **페이지 의존 부분만 제거**하고 정책 단언은 유지. 역할 불명이면 REVIEW_REQUIRED.

### 1.5 삭제하면 안 되는 배포/프록시

| path | 상태 |
|---|---|
| `infra/web/wrangler.toml` `infra/ops/wrangler.toml` | REVIEW_REQUIRED — 프로덕션 오리진일 수 있음 |
| `infra/domain.manifest.json` | KEEP. web/ops 키는 확인 전 유지 |
| `workers/web-proxy` `workers/ops-proxy` | REVIEW_REQUIRED |
| `deploy-cloudflare.yml` | KEEP 파일. web/ops input 제거는 운영 확인 후 |

### 1.6 문서

| 종류 | 조치 |
|---|---|
| Ops/security/recovery | KEEP |
| API 계약 (`schemas`, routes.ts, 이 `quality/*`) | KEEP. 필요 시 `quality/backend/`로만 추가 |
| 고객웹 전용 Canon/시각 문서 | putduk-web 보유 확인 후 이 레포에서 삭제 |
| 미래 어드민 | `quality/admin-handoff/` 요약만 |
| 중복/폐기 화면 문서 | 후보 기록 후 삭제 |
| `governance/release-master` | 삭제 금지 |

## 2. 커밋 순서 (Stage 4+)

브랜치: `chore/backend-only-repository` (이미 `c4ebcd87`에서 생성).

| # | 의도 | 허용 변경 | 금지 |
|---|---|---|---|
| 1 | docs: backend-only inventory | `quality/backend-only-inventory.md` `quality/backend-only-deletion-plan.md` `quality/backend-api-contract-map.md` | 코드 |
| 2 | docs: API 계약 고정 + 어드민 핸드오프 요약 | `quality/admin-handoff/*` (IA 표만). 계약 맵은 이미 1에 포함 | Nest/#222 파일 |
| 3 | chore: sever UI references | `stack-lock.cjs` 웹 mustExist 제거 · **`gate-tiers.cjs` T0에서 brand-consumer의 UI 파일 의존 제거(또는 스캔 경로를 백엔드로)** · T1에서 `ia-tabs`/`next-build`류 제거 · T2를 `api-nest-build`로 · `domain-by-path.cjs` 웹/어드민/ui 매핑 스킵 · `gate-local-speed.cjs`를 main 실측과 맞게 개정 · 루트 `package.json` UI 스크립트는 다음 커밋 | 대량 삭제, lockfile, #222 파일 |
| 4 | chore: remove obsolete customer web | `apps/web/**` 삭제 | sdk, nest, migrations |
| 5 | chore: remove obsolete admin UI | `apps/admin/**` 삭제 | admin API |
| 6 | chore: remove unused UI package + lockfile | `packages/ui` (브랜드 REVIEW 제외분) · `pnpm-workspace.yaml`에서 `apps/*` 제거 · `pnpm install`로 lock 재생성 | sharp/js-yaml/multer 숨김 삭제 |
| 7 | ci: backend-only workspace/scripts leftover | 남은 `dev:web` 등 · verify CATALOG 각주 | gate.yml 잡 rename |
| 8 | ci: backend CI separation | UI 워크플로 처리(스킵 또는 운영 확인 후 삭제). gate.yml 유지 | required check 이름 변경 |
| 9 | security: sharp/js-yaml/multer | 직접 의존 확인 후 업그레이드 **가능하고 회귀 없을 때만** | 게이트 약화, ignoreCVE 추가 |
| 10 | docs: verification evidence | `quality/backend-only-verification.md` | FAIL를 PASS로 세탁 |

삭제 커밋 본문에 삭제 목록 + `rg` 결과(잔여 참조 0)를 넣는다.

## 3. 참조 절단 체크리스트 (Stage 3)

삭제 직전 모두 재실행. 하나라도 히트면 그 항목 삭제 중단.

- [ ] `rg` import/문자 경로 (`apps/web`, `@aipo/web`, `apps/admin`, `@aipo/admin`, `packages/ui`, `@aipo/ui`)
- [ ] `package.json` scripts
- [ ] `pnpm-workspace.yaml`
- [ ] `.github/workflows/*`
- [ ] `infra/domain.manifest.json` `infra/web` `infra/ops` `workers/web-proxy` `workers/ops-proxy` (히트 = 삭제하지 말고 REVIEW)
- [ ] 테스트 픽스처 경로
- [ ] 마이그레이션/릴리스 문서가 화면 경로를 **권위로** 쓰는지 (증거 PNG는 유지)
- [ ] 동적 문자열 (`@aipo/web`, filter names)
- [ ] 생성물 (`.next`는 커밋 대상 아님)

## 4. 안전 분리 기준 (Stage 2)

제거는 아래가 **모두** 참일 때만:

1. 고객 레거시 UI / 레거시 어드민 UI / 화면 전용 Next·CSS·이미지·폰트·Storybook(없음)·UI 테스트·스냅샷·`packages/ui`·화면 전용 빌드·Spark/Lux 잔재 / 중복 화면 문서
2. 백엔드 컨트롤러·계약·마이그레이션·보안 게이트를 약화하지 않음
3. PR #222 파일과 diff 겹침 0
4. `rg` 잔여 참조 0 (또는 해당 참조를 이전 커밋에서 제거함)

## 5. STOP / BLOCKED 항목 (이 항목만 건너뜀)

| 항목 | 이유 | 운영자에게 물을 질문 |
|---|---|---|
| `packages/sdk` 이동/삭제 | PR #222 충돌 | #222 머지 후 SDK를 putduk-web으로 옮길지 |
| Nest auth/KYC/ledger/health 수정 | PR #222 | 없음 — 이 작업에서 만지지 않음 |
| `infra/web` `infra/ops` `workers/*-proxy` 삭제 | 프로덕션 오리진 여부 미확인 | 고객 웹/ops 배포가 완전히 putduk-web인가? |
| UI GitHub required checks 삭제 | 브랜치 보호 미확인 | lighthouse/spark/axe가 required인가? |
| `packages/ui/brand/assets` 삭제 | 브랜드 자산 하드룰 | putduk-web이 동일 자산을 이미 가지는가? |
| `apps/web/public/kyb` | 법률/정부 마크 가능 | `docs/kyb`만 SSOT인가? |
| sharp/js-yaml/multer 업그레이드 | 회귀 가능 | 별도 보안 커밋에서만. 실패 시 BLOCKED |
| 마이그레이션 apply | 운영 DB 변경 금지 | 없음 |
| PR #221 트리에서 작업 | 잘못된 베이스 | 없음 — worktree 사용 |

## 6. 권장 최종 레이아웃 (대규모 이동 없음)

현재 구조가 이미 백엔드 중심으로 맞다. **폴더 대이동 하지 않음.**

유지:

```text
services/api-nest
services/engine-rust
services/{ai,feature,market,memory,shadow,simulation,user-twin,marketing-attribution}
packages/schemas
packages/observability
packages/sdk          # BLOCKED 유지
schemas/
supabase/migrations
tooling/
quality/backend-only-*.md
quality/admin-handoff/
.github/workflows/gate.yml 등 백엔드 워크플로
```

제거 목표(참조 절단 후):

```text
apps/web
apps/admin
packages/ui          # brand REVIEW 제외분
```

`services/api` 같은 새 경로로 옮기지 않는다.

## 7. 커밋 메시지 예 (PowerShell)

```powershell
git commit -m "docs: backend-only inventory for PUTDUK repo split"
```

`git config` 변경 금지. `--no-verify` 금지. 시크릿 커밋 금지.
