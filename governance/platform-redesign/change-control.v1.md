# Platform Redesign — Architecture Change Control v1

| | |
|---|---|
| schema | `governance.platform-redesign.change-control.v1` |
| version | `1.1.0` |
| redesignStage | `R0` (원본) · post-r0 promotion 기록 포함 |
| todoId | `platform-redesign-r0-change-control` |
| measuredAt | `2026-08-11` |
| basedOn | `baseline.v1.json` · `route-contract-matrix.v1.json` · `fact-state-registry.v1.json` · `governance-observations.v1.json` |
| implementationCode | **0** at R0-3 · post-r0 Money remediation 구현은 별도 Money todo Owns |

> **Change Control ≠ immutability.** 변경은 허용된다. 등급(L1/L2/L3)에 따라 검증·승인·rollback·증거만 증가한다.  
> 구칭 “Architecture Freeze”는 **폐기**다. 애매하면 **상위 등급**으로 분류한다.  
> 승인자가 없으면 **blocked**이며 우회 금지.

---

## 1. 목적 · 비목적

### 목적

1. v7.23 승인 supersession(ADR-017 Light+Purple · IA 새 라벨 · OpenNext Workers only)의 **before/after · 영향 · rollback · 승인 증거**를 고정한다.
2. R0 이후 모든 재설계 변경에 **L1/L2/L3 절차**와 **version bump 규칙**을 적용한다.
3. 외부 `%USERPROFILE%\.cursor\plans\플랫폼_전체_재설계_로드맵_d903eef7.plan.md`는 **REFERENCE ONLY**이며, 유효 요구의 **흡수 crosswalk**만 본 문서·ACTIVE 해시 플랜에 둔다.

### 비목적 (구현코드0)

- `apps/**` · `services/**` · `packages/**` 제품 코드 변경
- Brand asset 재생성 · Home Truth 코드 수정 · migration 적용
- 외부 d903eef7 frontmatter todo 재오픈·실행

발견만 하고 고치지 않는다. 분류는 `defect` / `intentional` / `deferred` / `missing_fact`만 사용한다 (R0-1/R0-2와 동일).

---

## 2. 외부 d903eef7 — 실행금지 · 흡수 crosswalk

### 2.1 권위 판정

| 항목 | 판정 |
|---|---|
| 경로 | `%USERPROFILE%\.cursor\plans\플랫폼_전체_재설계_로드맵_d903eef7.plan.md` |
| 역할 | **REFERENCE ONLY** |
| 금지 | 직접 편집 · todo 실행 · `status` 변경 · 상대 링크/수치 스냅샷을 실행 증거로 사용 |
| 실행 SSOT | 워크스페이스 `.cursor/plans/ai_profit_os_00~06_*.plan.md` frontmatter `todos` only |
| 수치 증거 | R0 `baseline.v1.json` (`commitSha` · dirtyPaths · canonical `/`)만 |

### 2.2 흡수 crosswalk (external id → ACTIVE owner)

| external (d903eef7) | status | ACTIVE 흡수 |
|---|---|---|
| `phase0-forensic-inventory` | cancelled · 실행금지 | `00` `platform-redesign-r0-inventory` |
| `phase0-fact-state-discovery` | cancelled · 실행금지 | `00` `platform-redesign-r0-fact-state` |
| `phase0-change-control` | cancelled · 실행금지 | `00` `platform-redesign-r0-change-control` (본 문서) |
| `phase0-observation-registry` | cancelled · 실행금지 | `00` `platform-redesign-r0-observation-registry` |
| `phase1-preflight-home-truth` | cancelled · 실행금지 | `03` Home Truth / redesign Home 계열 |
| `phase1-preflight-brand-assets` | cancelled · 실행금지 | `03` Brand Pipeline 계열 |
| `phase1-preflight-money-read` | cancelled · 실행금지 | `01` `redesign-r1-money-read-contract` |
| `phase1-home-contract` | cancelled · 실행금지 | `03` Home Contract 계열 |
| `phase1-home-implementation` | cancelled · 실행금지 | `03` Home Implement 계열 |
| `phase1-home-certification` | cancelled · 실행금지 | `03` Home certification 계열 |
| `phase2-acquisition` | cancelled · 실행금지 | `03`/`06` Acquisition·Auth 계열 |
| `phase3-wallet` | cancelled · 실행금지 | `01` Wallet 계열 |
| `phase4-core-loop` | cancelled · 실행금지 | `02`/`03` Core loop 계열 |
| `phase5-account-hub` | cancelled · 실행금지 | `03` Account hub 계열 |
| `phase6-admin-ops` | cancelled · 실행금지 | `04` `redesign-r6*` 계열 |
| `phase7-backend-data-engine` | cancelled · 실행금지 | `01`/`02` Backend·Engine 계열 |
| `phase8-infra-observability` | cancelled · 실행금지 | `06` R7/R8 Infra 계열 |
| `release-certification` | cancelled · 실행금지 | `06` release certification 계열 |

**Namespace:** 외부 “Phase 0/1…” 표현은 실행 문서에서 쓰지 않는다. Redesign=`R0~R8` · Runtime=`P0~P3`만 허용한다.

---

## 3. Change Control 대상 (R0 freeze 목록)

R0 종료 시 아래 10항목은 **변경 시 최소 L2** (해당 시 L3) 절차를 적용한다. immutability가 아니다.

| # | surface | 최소 등급 | owner 예 |
|---|---|---|---|
| 1 | route inventory | L2 | `00` · `baseline` / `route-contract-matrix` |
| 2 | Fact inventory | L2 | `00` · `fact-state-registry` |
| 3 | API boundary | L2→L3(money/auth) | `01`/`02`/`06` |
| 4 | state model (view ⊥ domain FSM) | L2 | `00` + domain |
| 5 | token hierarchy | L2 | `03` · Lux / `peotteok-light` |
| 6 | asset pipeline | L2 | `03` · Brand Kit |
| 7 | auth boundary | L3 | `06` · Nest JWT |
| 8 | money invariant | L3 | `01` · ledger / buckets |
| 9 | event schema | L2→L3(settlement) | `02`/`06` |
| 10 | naming convention | L2 | Index § grammar |

---

## 4. L1 / L2 / L3 절차

```text
Architecture Change Control
│
├─ L1 Local — component 내부, CSS, copy, local hook, implementation detail
│    └─ domain review
│
├─ L2 Contract+ — Contract, Wire, Token, API boundary, State model, shared component
│    └─ owner 승인 + 관련 gate
│
└─ L3 Critical — money, security, auth, SoT, DB schema,
     engine settlement/state transition, protected boundary
     └─ founder + 독립 reviewer 승인 + evidence + regression + rollback plan
```

### 4.1 L1 — Local

| | |
|---|---|
| 범위 | 단일 surface 내부 CSS/copy/local hook · shared Contract/Wire/API 미변경 |
| 절차 | (1) change reason 1줄 (2) domain self-review (3) 해당 path-trigger `verify:*` PASS |
| 승인 | domain reviewer (에이전트 단독 OK · owner 서명 불요) |
| version bump | patch (`x.y.Z`) — 해당 wire/copy 로컬 버전만 |
| rollback | `git revert` 단일 커밋으로 충분 |
| 차단 | Contract/IA/token/API/Fact meaning 변경이 보이면 **즉시 L2 승격** |

### 4.2 L2 — Contract+

| | |
|---|---|
| 범위 | Product/Visual/Implementation Contract · Canon wire · Token · API DTO boundary · common view state · shared component API |
| 절차 | (1) change reason (2) affected assumptions (3) before/after diff (4) version bump (5) affected wire/gate 재검증 (6) owner 승인 |
| 승인 | **owner 1명** (플랜 Owns) + 관련 `verify:*` · T0 `verify:gate:fast` |
| version bump | minor (`x.Y.0`) — Contract/wire schema 호환 확장 · breaking이면 major + L3 검토 |
| rollback | previous Contract/wire 버전 복원 경로 + known-good commit SHA 기록 |
| 차단 | 승인 공란 · gate FAIL · before/after 누락 → **blocked** |

### 4.3 L3 — Critical

| | |
|---|---|
| 범위 | money ledger/invariant · auth/session · DB schema/SoT · engine settlement/FSM · security · OpenNext origin/runtime · ADR supersession |
| 절차 | L2 전부 + (7) evidence pack (8) regression 목록 (9) rollback runbook (10) founder ACK + **독립 reviewer** ACK |
| 승인 | **founder + 독립 reviewer** (동일인 이중서명 금지) |
| version bump | major (`X.0.0`) 또는 ADR/`governance/*.vN` 신규 버전 파일 |
| rollback | previous known-good artifact · DB는 expand→backfill→switch→contract의 역순 문서 · feature flag는 server enforcement와 함께 |
| 차단 | 승인자 부재 · evidence/rollback 공란 · T1/T2 필수 gate 미통과 → **blocked · 우회 금지** |

### 4.4 공통 필수 순서 (조용한 수정 금지)

```text
change reason
  → affected assumptions
  → before/after diff
  → version bump
  → affected wire/gate 재검증
  → (L2+) owner 승인
  → (L3) founder + 독립 reviewer + evidence + rollback
```

역방향 결함은 본 Change Control에 등록한 뒤 **해당 owner 파일의 가산 todo**로만 처리한다 (File-Serial 이탈 금지).

---

## 5. Version bump 규칙

| 등급 | bump | 대상 예 | 금지 |
|---|---|---|---|
| L1 | **patch** `z+1` | copy 문구 · CSS detail · local hook | Contract `version` 조용히 올리기 |
| L2 | **minor** `y+1` (호환) / **major** `x+1` (breaking) | `*.wire.json` · Visual/Impl Contract · token SPEC · API DTO | 의미 변경인데 patch만 |
| L3 | **major** 또는 **새 파일** `*.vN` | ADR · `governance/platform-redesign/*` · migration · manifest `openNext` | in-place 덮어쓰기 without ACK |

추가 규칙:

1. Contract/wire/governance 파일은 헤더 `version` 필드를 bump와 동기화한다.
2. breaking 변경은 구 버전을 `_archive` 또는 `deprecated`로 남기고 **새 버전 파일**을 선호한다.
3. Index overview / CONSTITUTION “현재” 문구는 실행 증거가 아니다. bump 증거 = 파일 `version` + commit SHA.
4. `event name` grammar = `domain[.subdomain].entity.action.vN` — payload 스키마 변경 시 `vN` 증가.
5. migration = timestamp + one intent + forward/rollback note (L3).

---

## 6. 승인된 supersession 기록 (before / after / 영향 / rollback / 승인 증거)

아래 3축은 Index v7.23.0 §2에서 승인된 supersession이다. 본 절이 Change Control 증거 SSOT다.

### 6.1 ADR-017 — Consumer theme Light+Purple

| 필드 | 내용 |
|---|---|
| changeId | `cc.adr017.peotteok-light` |
| level | **L3** |
| before | Lux Dark(`lux-dark`) 중심 개발자/트레이딩 톤 · dual theme/toggle 잔존 가능 가정 |
| after | 출시 SSOT = **`peotteok-light` Light+Purple 단일 테마** · Lux Dark = archive/legacy · dual toggle **0** |
| 영향 | tokens/`peotteok-light` · PWA theme · `verify:dark-leak-guard` · `verify:lux-theme-sync` · Home Visual/Impl Contract · prefers-color-scheme 강제 0 |
| rollback | archive `lux-dark` 참조 재활성 **금지 기본** · 필요 시 L3 재승인 후에만 · known-good = ADR-017 Accepted + Contract STEP3 LOCK |
| 승인 증거 | `packages/ui/canon/contracts/ADR-017-peotteok-home-light-theme.md` Status=Accepted · Founder 3 LOCKS (A/B/C) · Conflict Resolution Founder ACK · Implementation Contract STEP3 APPROVED/LOCKED · Index v7.23 §2 표 |
| relatedVerify | `dark-leak-guard` · `lux-theme-sync` · `canon-surfaces` · `mockup-governance` |

### 6.2 IA — 5탭 새 라벨

| 필드 | 내용 |
|---|---|
| changeId | `cc.ia.nav-labels-v723` |
| level | **L2** (IA/Contract) · 탭 href 변경 시 **L3** |
| before | 라벨 혼선 가능: Reference/`내거래` · 구 IA 표기 |
| after | 라벨 = **`홈 · 기회 · 수익 · 지갑 · 내정보`** · **`내거래` 폐기** · href 보존: `/` · `/profits` · `/trades` · `/wallet` · `/me` |
| 영향 | `apps/web/routes.ts` `USER_TABS` · `BottomNav5` · copy `packages/ui/copy/ko/user.ts` · Canon `navLabels` · `verify:ia-tabs` |
| rollback | 라벨만 이전 문자열로 revert (href 불변 유지) · `내거래` 복원 **금지** (Capital Participant 정의 충돌) · L2 owner 재승인 필요 |
| 승인 증거 | ADR-017 Decision §6 · Visual Contract §2.2 · `home-visual-v2.wire.json` `navLabels`/`deprecatedNavLabels` · Index v7.23 §2 · `verify:ia-tabs` live |
| relatedVerify | `ia-tabs` · `part5-shell-toast` · `canon-surfaces` |

### 6.3 OpenNext — Cloudflare Workers only

| 필드 | 내용 |
|---|---|
| changeId | `cc.infra.opennext-workers-only` |
| level | **L3** |
| before | Pages/`wrangler pages deploy` · `.open-next/cloudflare` 업로드 · `*.pages.dev` origin 혼용 가능(404 재발 원인) |
| after | **OpenNext Workers only** · origin SSOT = `infra/domain.manifest.json` → `openNext.*.workersDev` · deploy = `opennextjs-cloudflare deploy` · `pages deploy` / pages.dev origin **금지** |
| 영향 | `infra/web|ops/wrangler.toml` · bridge proxy TARGET · `verify:opennext-workers-origin` · T2 `opennext-build` · Cloudflare Workers Builds |
| rollback | previous known-good Worker 버전으로 Cloudflare rollback · proxy TARGET을 이전 `workersDev`로 복원 · **Pages origin으로의 롤백은 L3 재승인 없이 금지** (404 회귀) |
| 승인 증거 | `infra/domain.manifest.json` `openNext.runtime=workers` · `.cursor/rules/opennext-workers-origin.mdc` · `stack-lock.mdc` Host=Cloudflare only · Index v7.23 §2 · `verify:opennext-workers-origin` live |
| relatedVerify | `opennext-workers-origin` · `cf-deploy-packages` · `domain-bootstrap` · `opennext-build` |

### 6.4 Money R0 observation promote wave1 (post-r0)

| 필드 | 내용 |
|---|---|
| changeId | `cc.money.r0-obs-promote-wave1` |
| level | **L2** (API boundary / write-path integrity / auth trust-boundary · money 경로) |
| before | 6 observation 전부 `status=observed` · `materializedTodos=0` · Money 플랜 remediation todo 0 · `redesign-r1-money-read-contract` completed 후 reviewTrigger 도달 |
| after | Money-owned 4 observation → `promoted` · Engine 2건은 `observed` 유지(reviewTrigger 미도달) · 01 Money frontmatter에 remediation todo **3** materialize(A+B=1 todo·2 clause) · `nextExecutable=idempotency-conflict-detection-invariant-gap` |
| 영향 | `governance-observations.v1.json` v1.1.0 · `schemas/governance-observation.v1.json` optional `materializedTodoId`/`changeControlId` · `verify:governance-observation-registry` post-r0 모드 · Money 플랜 가산 todo 3 · BOOTSTRAP 다음 포인터 |
| rollback | observation status를 `observed`로 되돌리고 Money frontmatter 가산 todo 3개 제거 · registry `lifecyclePhase`/`postR0Promotion` 제거 · verify를 R0 register-only로 복원 · **제품 코드 롤백은 각 remediation todo의 자체 rollback** |
| 승인 증거 | reviewTrigger 도달 실측(01 Money pending=0 · `redesign-r1-money-read-contract` completed) · absorption map `r0_흡수_반영_플랜_eaebafd6` · Change Control §4.2 L2 순서 · owner=01 Money · R0 locks(`promotionAtR0`/`materializeAtR0`)=0 이력 불변 |
| relatedVerify | `governance-observation-registry` · (실행 시) `idempotency-conflict-detection` · `committed-event-publication-durability` · `money-wallet-auth-remediation` · `bucket-invariant` · `pg-module-scan` |

**Materialize map (중복0 · finding identity 보존):**

| observation id | materialized todo id |
|---|---|
| `idempotency-conflict-detection-invariant-gap` | `idempotency-conflict-detection-invariant-gap` |
| `committed-event-publication-durability-gap` | `committed-event-publication-durability-gap` |
| `user-mutation-subject-binding-violation` + `internal-trigger-machine-auth-gap` | `money-wallet-auth-remediation` (1 todo · 2 clause) |

**금지:** Engine observation을 Money 창구에서 promote · read-contract todo에 remediation 흡수 · R0 locks를 사후 1로 위조 · Adapters fail-open 패턴 복제.

---

## 7. 승인 증거 최소 세트

| 등급 | 필수 증거 |
|---|---|
| L1 | change reason · domain review 메모 · path-trigger verify PASS · commit SHA |
| L2 | L1 + before/after · affected assumptions · version bump · owner 승인 기록 · 관련 Contract/wire 경로 |
| L3 | L2 + founder ACK · 독립 reviewer ACK · evidence pack · regression 목록 · rollback runbook · (해당 시) ADR/governance 버전 |

**blocked 조건 (우회 금지):**

- 필요 승인자 공란 또는 동일인 이중서명(L3)
- before/after · rollback · version bump 누락
- 관련 gate FAIL 상태에서 merge/push
- 외부 d903eef7 todo를 실행 큐로 사용

---

## 8. Gate · tier 매핑

| Change level | 최소 gate |
|---|---|
| L1 | path-trigger domain `verify:*` (T0 일부) |
| L2 | T0 `verify:gate:fast` + 관련 domain verify |
| L3 | T0 + T1 `verify:gate:push` · release/인증 시 T2 `verify:gate` · money면 `bucket-invariant`/`pg-module-scan` |

본 문서 자체는 `verify:platform-change-control`로 무결성을 검사한다 (ghost verify 금지 · `package.json` + `CATALOG.md` 동시 등록).

---

## 9. R0 산출물 위치

| 산출물 | 경로 |
|---|---|
| baseline | `governance/platform-redesign/baseline.v1.json` |
| route matrix | `governance/platform-redesign/route-contract-matrix.v1.json` |
| Fact↔State | `governance/platform-redesign/fact-state-registry.v1.json` |
| Change Control (본 문서) | `governance/platform-redesign/change-control.v1.md` |
| Observation (R0-4) | `governance/platform-redesign/governance-observations.v1.json` · schema=`schemas/governance-observation.v1.json` · verify=`governance-observation-registry` |

---

## 10. 잠금 요약

1. Change Control 이후에도 변경 가능 — 등급별 절차만 강화.
2. ADR-017 / IA 라벨 / OpenNext Workers supersession은 L2/L3 기록 없이 되돌리지 않는다.
3. 외부 d903eef7 = REFERENCE ONLY · 흡수 crosswalk만 실행 근거.
4. 본 R0-3 슬라이스 **구현코드0**.
5. 승인자 없으면 **blocked**.
