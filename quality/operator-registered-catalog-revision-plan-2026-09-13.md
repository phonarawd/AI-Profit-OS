# 운영자 등록 상품 전용 전환 — 수정 계획

- **단계:** 조사·계획만. 코드 수정 · 새 브랜치 · 병합 · 커밋 · 푸시 · 운영 DB 적용 · 배포 **0**
- **작성:** 2026-09-13 21:00–21:25 KST
- **보완:** 2026-09-13 21:51–22:20 KST — `PUTDUK_LEGACY_ADMIN_REMAINS_AUDIT_20260913.md` 반영
- **작업본:** 로컬 `main` `27b5b9f71f4350ca69f3e657be9b26957e91d8d1` = `origin/main`
- **대조 입력:** 병렬 교차검증 · 기존 조사 MD · 레거시 어드민 흔적 감사 · Nest/MI/정산 규칙 소스 · 후보 브랜치 `git show` (체크아웃·머지 없음)
- **어드민 원본:** `phonarawd/putduk-ops` (`main` `7b78beb93033da8b6c312f437762fd6b440e6ecf`) = GPT와 만든 **새 어드민 화면 원본**. 퍼뜩 플랫폼 맞춤 이식·관리 API 연결은 **미완료**. 이 레포는 그 화면을 복제하지 않고 **백엔드 계약만** 정의한다.
- **폐기 대상:** 백엔드 옛 `apps/admin`(및 `packages/ui` 운영 화면 · `infra/ops` · `workers/ops-proxy`). main에는 이미 없음. **재도입 금지.**

이 문서는 이전 조사 파일을 대체하지 않는다. 병렬 보고서 정정 · 어드민 흔적 감사 · 현재 dirty worktree를 반영한 **패치 계획**이다.

**금지 (전 슬라이스 공통)**

- 후보 브랜치 **전체 병합** · 전체 트리 복사 · 옛 `infra/ops` / `ops-proxy` 복원
- 옛 `apps/admin` · `spark-admin.css` · `AdminShell` · `packages/ui` 재도입
- 인계 문서 API를 구현된 것으로 가정
- 원격 옛 Worker 무단 삭제 · Git history 삭제
- 이번 턴의 코드/브랜치/커밋/푸시/운영 DDL·DML/배포

---

## 0. 이번 턴에서 한 일 / 하지 않은 일

한 일: 레거시 어드민 감사 보고서를 이 계획에 반영. `fx_snapshots.id`가 **text**임을 마이그레이션 원문으로 재확인. `settlement_rule.cjs` R1–R10 · Hard90 · `executeTick`의 live opportunity 재조회를 재확인. ingest 이미지 provenance가 override와 무관함을 재확인. 슬라이스 1 변경 범위·검증 기준을 확정.

하지 않은 일: 애플리케이션 코드 편집, 새 브랜치, 후보 머지, 커밋/푸시, 운영 SQL, cron 정지, putduk-ops 수정, 옛 어드민 복원.

---

## S1. 첫 구현 단계 — 변경 범위와 검증 기준

승인 후 **가장 먼저** 하는 슬라이스. 이름: 외부 쓰기 게이트 · 운영자 행 보호 · 격리 테스트.

이 슬라이스에서 **하지 않는 것:** 견적/비용/수량 테이블, 새 Admin 등록 API, 피드 필터, 참여·정산 TX 결합, `postJournalInTransaction` 이식, ebay cron 정지, putduk-ops 연결, 후보 머지, 옛 어드민 파일, 운영 DB 적용.

### S1.1 목적

게이트 기본값은 **OFF**(기존 ebay ingest·시드·재가격은 legacy 행에 대해 유지).  
게이트가 OFF여도 **`supply_source='operator'` 행의 가격·이미지·버전은 외부 writer가 바꾸지 못한다.**  
`useAdminOverride`만 보고 skip하는 현행 재가격은 보호로 인정하지 않는다.

### S1.2 식별 컬럼만 (최소 스키마)

운영자 행을 가드가 읽으려면 컬럼이 필요하다. 슬라이스 1은 **식별만** 추가한다.

| 대상 | 내용 | 하지 않음 |
|---|---|---|
| 신규 마이그레이션 1개 (로컬 파일만, 운영 미적용) | `opportunities.supply_source text NOT NULL DEFAULT 'legacy_external'` + CHECK (`operator` \| `legacy_external`). 기존 행은 DEFAULT로 legacy | 견적 테이블, 비용 줄, 수량, catalog_state, 표시 채널, `trade_executions.quote_*` |
| 기존 115행 | 일괄 `operator` 승격 **0**. DELETE **0** | — |

`information_schema`로 동명 컬럼이 이미 있으면 ADD를 빼고 주석만 남긴다. 원격 68 이력 replay/repair 금지.

### S1.3 코드 변경 범위

| 파일 | 변경 | 건드리지 않음 |
|---|---|---|
| `services/api-nest/src/adapters/adapters.admin.service.ts` | listing persist · `applyEbayImageProvenance` 앞에 **동일 가드**. `supply_source='operator'`이면 persist/이미지 0. 게이트 ON이면 ebay\|admin **상품** persist/이미지 0 | FX ingest (`coingecko`/`frankfurter`) · ebay heartbeat · tick ledger · health |
| `services/api-nest/src/opportunities/catalog-runtime-seed.service.ts` | `persistIngestListings`: operator `asset_id` skip. `applyEbayImageProvenance`: 해당 `asset_id`의 operator 기회가 있으면 assets/opportunities 이미지 UPDATE 0. `onModuleInit` seed는 게이트 ON이면 no-op | Day-1 amazon/yahoo INSERT 금지 유지 |
| `services/api-nest/src/opportunities/opportunity-reprice.service.ts` | `repriceOneAsset`: `supply_source='operator'`이면 **게이트와 무관**하게 return skip. `useAdminOverride`만 믿기 금지 | FX 조회 경로 자체는 유지 |
| `services/api-nest/src/source-policy/source-policy.service.ts` 또는 전용 카탈로그 게이트 모듈 | writer가 **실제로 읽는** ON/OFF. 기본 OFF. 버전 CRUD만 두고 강제하지 않는 현행은 불충분 | 정책 본문 임의 변경 금지 |
| 신규 격리 테스트 (verify 또는 Nest 단위) | 아래 S1.5 | 운영 API 참여/정산 호출 0 |
| `tooling/verify/adapter-ingest-fail-closed.cjs` 및 기존 ingest/seed verify | 게이트 OFF 회귀가 깨지지 않게. 게이트 약화 금지 | 토큰 fail-closed 조건 완화 금지 |

**이 슬라이스에서 금지하는 경로**

- `apps/admin/**` · `packages/ui/**` · `infra/ops/**` · `workers/ops-proxy/**` · `tooling/deploy/cf-pages-ops.cjs` 추가
- `workers/ebay-adapter` cron 삭제/비활성 (게이트 ON + 늦은 틱 소진 **이후** 별 승인)
- `workers/coingecko-adapter` · `frankfurter-adapter` · chain-sweeper · push-dispatcher
- 후보 브랜치 checkout/merge
- dirty `.vscode/settings.json` · CRLF-only `M` · untracked 프롬프트 커밋

### S1.4 가드 계약 (게이트 × 행)

| 게이트 | 행 | listing persist | ebay 이미지 provenance | 재가격 | tick ledger / heartbeat / FX |
|---|---|---|---|---|---|
| OFF (기본) | `legacy_external` 또는 컬럼 없음(DEFAULT) | 현행 유지 | 현행 유지 | 현행 유지 (`useAdminOverride` skip은 그대로) | 유지 |
| OFF | `operator` | **차단** | **차단** | **차단** | 유지 |
| ON | 모든 상품 행 | **차단** | **차단** | **차단** | 유지 |
| ON | operator | **차단** | **차단** | **차단** | 유지 |

게이트를 다시 OFF로 되돌려도 operator 행 보호는 **꺼지지 않는다.**  
게이트는 “외부 카탈로그 쓰기 전체”이고, operator 보호는 “행 단위 fail-closed”이다. 둘을 한 플래그로 합치지 않는다.

같은 `asset_id`에 operator 기회와 ebay listing이 같이 있으면: persist/이미지/재가격은 **그 asset 전체를 skip**. listing만 갱신하고 기회만 남기는 반쪽 쓰기는 금지(이미지가 assets를 덮기 때문).

### S1.5 격리 검증 기준 (합격/불합격)

운영 참여·정산·운영 DB DML 금지. fixture/트랜잭션 롤백 또는 테스트 DB만.

| ID | 시나리오 | 합격 | 불합격 |
|---|---|---|---|
| S1-A | 게이트 OFF · operator 행 없음 | 기존 `adapter-ingest-fail-closed` · `catalog-runtime-seed` · `ebay-identity-ingest` PASS | 기존 ebay persist/시드가 깨짐 |
| S1-B | 게이트 OFF · fixture `supply_source='operator'` | 동일 `asset_id`로 ingest 재전송 후 기회 가격·`pricing_version`·`asset_image_*`·`image_source` 불변. tick ledger는 갱신 가능 | 가격/이미지/버전 변경. `useAdminOverride=false`인데도 재가격됨 |
| S1-C | 게이트 OFF · operator와 다른 asset의 legacy | legacy만 갱신. operator 행 불변 | 교차 덮어쓰기 |
| S1-D | 게이트 ON · 늦은 ebay 틱 | listings upsert 0 · provenance 0 · reprice 0 · seed no-op. heartbeat/FX ingest는 동작 | 게이트 ON인데 상품 행이 갱신됨. FX/heartbeat까지 죽음 |
| S1-E | 게이트 ON → 다시 OFF | legacy는 다시 persist 가능. **operator는 계속 불변** | OFF로 되돌리면 operator가 다시 덮임 |
| S1-F | 토큰 fail-closed | unset=503 · 잘못된 토큰=401 유지 | 게이트 추가로 토큰 검사를 우회 |
| S1-G | 경계 | diff에 `apps/admin` · `packages/ui` · `infra/ops` · `ops-proxy` **0**. 후보 merge commit **0** | 옛 화면/배포 경로 재등장 |
| S1-H | 도메인 verify | 변경 경로: `adapter-ingest-fail-closed` · `catalog-runtime-seed` · `ebay-identity-ingest` · (신규) operator-row-protect. `pnpm verify:gate:fast` | 게이트를 끄거나 기대를 약화해 통과 |

보호 QA(QA1–QA9) STALE. 이 테스트를 인수 인증으로 쓰지 않는다.

슬라이스 1 done(승인·구현 후): 위 PASS + T0 커밋. **push는 세션 stop/명시만.** 이번 턴에는 커밋하지 않는다.

### S1.6 구현 착수 직전 재확인 (코드 전에)

1. `HEAD`가 여전히 `27b5b9f7`인지. 아니면 새 SHA를 기준으로 이 절을 다시 읽는다.
2. dirty/untracked를 구현 브랜치에 넣지 않는다.
3. 라이브 `trade_executions`의 비종료(`running`/`requeue`) 건수를 **읽기 전용**으로 재조회한다. 슬라이스 1은 그 행을 개조하지 않는다(§6).

---

## 1. 보고서 ↔ 현재 작업본 대조

| 주장 (병렬 보고서) | 이 워크트리에서 확인 | 판정 |
|---|---|---|
| GitHub main SHA `27b5b9f7` | `HEAD` = `origin/main` = 동일 SHA | 일치. 그 사이 main 이동 없음 |
| 사용자 PC dirty는 독립 확인 불가 | `git diff --numstat`는 `.vscode/settings.json` +6/−2만 실질 변경. 나머지 `M`는 CRLF. untracked는 조사 MD·프롬프트 + 본 계획 | **dirty는 보존.** 구현 브랜치는 이 파일들을 건드리지 않음 |
| 후보 `4c6f22f` · 9/9 · main보다 최신 기반 아님 | 로컬 `chore/d1-zero-known-defect-20260904` 동일 SHA. merge-base `c4ebcd87` (2026-09-04) | 일치. **통째 머지 금지** — main의 클래식 가입·QA rebase를 덮음 |
| main 참여 = postJournal 후 별도 TX | `participate.service.ts` 716 원장 → 738 `withTransaction` 거래/요청 | 소스 일치 |
| main 정산 = 원장 후 상태 UPDATE 분리 · live opportunity 재조회 | `trades.execution.service.ts` 186–196 live opp, 308 `postJournal`, 328 별도 UPDATE | 소스 일치 |
| `withTransaction`은 plain BEGIN | `postgres.ts` 131 `BEGIN` | 주석 “Serializable”은 구현과 불일치. SERIALIZABLE로 단정 금지 |
| main 버킷 타입 4개 | `ledger.types.ts` `principal\|profit\|locked\|practice` | 일치. 후보만 6버킷+`trial_grant` |
| 체험/B7/confirmation은 프로젝트 전체 부재가 아님 | main Nest에 `trial-grant`/`matching-policy`/`postJournalInTransaction` **0**. 후보는 존재. DB 이력에 해당 마이그레이션 이름 존재 | 병렬 보고서 정정 채택 |
| SourcePolicy는 writer에 미강제 | `source-policy.service.ts`는 버전/헤드 CRUD. ingest/reprice가 호출하지 않음 | 일치 |
| admin 라벨 ≠ 운영자 견적 | `patchPricing`이 `computeOpportunityPricing`을 호출 | 일치 |
| 새 마이그레이션 1개로 해결 불가 | DB 68 · Git 55. 후보에 빈 statements 10개 원본 파일 존재 | 채택. **이력 replay/repair 금지** |
| 어드민은 프로토타입 | 이 레포 Admin API는 list/get/patchPricing/upsertAsset/seed/image만. create/publish/pause **없음** | 백엔드 공백 확인. **옛 화면 와이어를 구현하지 않음** |

이번 세션에서 라이브 카탈로그 행수는 재집계하지 못했다. 행수·틱 시각은 기존 조사(20:22–20:50 KST)와 병렬 보고서(20:38–20:51)를 인용한다. 구현 착수 전 격리 재조회가 필요하다.

---

## 1.5 레거시 어드민 감사 반영

기준: `PUTDUK_LEGACY_ADMIN_REMAINS_AUDIT_20260913.md`. 조사일 2026-09-13. main `27b5b9f7`. putduk-ops 조회 `7b78beb`.

| 사실 | 이 계획에의 함의 |
|---|---|
| main에 `apps/admin` · `packages/ui` · `infra/ops` · `ops-proxy` · `cf-pages-ops.cjs` **없음**. 삭제 커밋 `d31cf8c0` (2026-09-10) | **화면 삭제 작업을 다시 하지 않음** |
| 다른 9개 브랜치에 옛 화면 47 또는 58파일 잔존. 후보 `4c6f22f`에도 58개 | 후보에서 **서버·타입·스키마·테스트만** 선별. 브랜치 전체 merge/복사 시 재도입 방지 검사와 충돌하고 옛 UI가 돌아올 수 있음 |
| main의 `*.admin.controller.ts` 26 · admin-session · guard · audit · kill-switch · ledger/wallet admin | **유지.** 새 putduk-ops가 쓸 서버 기능. 화면 폐기와 무관 |
| 인계 문서의 `admin-auth/login`·MFA·UsersAdminModule은 **현재 main 소스/AppModule에 없음**. 있는 것은 Admin 토큰 → HttpOnly 세션 교환 | 문서 경로를 “이미 구현됨”으로 가정 금지. **현재 main / 별도 브랜치 후보 / 미구현**을 분리한 뒤 putduk-ops 로그인 연결 |
| `ops.hiptk.app` 호스트 이름·재도입 방지 verify는 유지 | 호스트 ≠ 옛 화면. 경계 검사(`repository-boundary` · `cf-infra` · `domain-bootstrap` · `release-acceptance`)를 약화하지 않음 |
| 원격 `ai-profit-ops*` · `hiptk-ops-proxy`는 삭제하지 않았다는 **기록**만 있음. 오늘 실측 아님 | 도메인 전환은 읽기 전용 Cloudflare 확인 → 별도 승인. 이번 전환에서 원격 객체 변경 0 |
| governance/인계 MD에 삭제된 `routes.ts`를 SSOT로 부르는 문장 잔존 | 새 UI에 자동 복사 금지. 문서 정합성은 별 후보 |

**putduk-ops 위치**

- 화면·IA·디자인의 권위 원본은 putduk-ops.
- 퍼뜩 백엔드(JWT 세션, 원장, 운영자 상품 API, 피드 계약)에 맞춘 이식과 실 API 연결은 **아직 없다**고 본다.
- 이 레포는 `schemas/operator-product.v1.json` · `operator-quote.v1.json`과 Admin HTTP를 만든 뒤 인계한다.
- putduk-ops를 이 레포에 복사하거나, 옛 `apps/admin`을 putduk-ops 대신 되살리지 않는다.

---

## 2. 현재 main이 실제로 하는 일 (전환 대상)

사용자 노출·매칭의 공급원은 **eBay 리스팅 + 시드 + 자동 재가격**이다.

```
ebay-adapter cron → POST /internal/adapters/ingest
  → persistIngestListings (ebay|admin만)
  → applyEbayImageProvenance (override/공급원 검사 없음 · assets+opportunities 이미지 UPDATE)
  → repriceFromCurrentListings (useAdminOverride===true만 skip)
사용자 피드: status=available ∧ orchestrate ∧ compareReady ∧ 이미지 ∧ arbitrageTypeKo
참여: 3초 stale_at 가드 → principal 잠금(자체 TX) → trade INSERT(다른 TX)
정산: live opportunity 손익/버전/stale을 다시 읽고 Rule 평가 → 원장 TX → 상태 TX
```

운영자가 등록한 사진·가격·비용·수량만 보여 주려면 위 파이프라인의 **쓰기·피드·참여·정산**을 바꿔야 한다. 기존 `patchPricing`에 라벨만 씌우는 방식으로는 부족하다.

---

## 3. 목표 계약 (putduk-ops가 나중에 붙을 서버 · 화면 독립)

putduk-ops가 이식 완료 후 호출할 서버 계약. 기존 `/admin/opportunities` 시드·ebay 가격 패치·grade evaluate를 **운영 경로로 쓰지 않는다.** 옛 `apps/admin` 라우트/CSS를 계약의 골격으로 쓰지 않는다.

### 3.1 운영자가 등록하는 것

| 항목 | 의미 | 금지 |
|---|---|---|
| 상품 | 이름·분류·설명. `assets`+`opportunities` 확장 | 시드 카드/가방/시계 자동 생성으로 대체 |
| 사진 | 운영자 업로드 → R2 `admin_r2`. 피드 `assetImageUrl` | eBay/PokemonTCG URL 자동 덮어쓰기 |
| 표시 채널 | 구매처/판매처 **표시 문자열** (KREAM, eBay 등) | `buyMarketId=ebay_*`를 수집 adapter와 동일시 |
| 가격 버전 | 구매가·판매가·필요자금·예상잔여. `effective_at`/`expires_at`/`paused` | `stale_at`을 미래로 넣어 3초 가드 우회 |
| 비용 줄 | 항목별 금액·통화·부담 주체·현금흐름 시점·명시 0원 | ebay 13.5% 자동 합산 |
| 수량 | `total` / `reserved` / `consumed`. 등록 1회 · 다수 참여 | 동시 슬롯 12를 재고로 오인 |

### 3.2 유저에게 보이는 것

피드·상세·preflight·참여는 `supply_source = 'operator'` 이고 발행 상태이며 노출 창 안이고 사진·필수 비용·잔여 수량이 있는 행만. `legacy_external`은 자동 승격·재노출 금지(별도 승인 전).

### 3.3 매칭 · 실제 성공 정산 조건

참여 트랜잭션에서 **불변 quote**를 trade에 고정한다. 이후 운영자 가격 변경·재가격·외부 틱이 이 금액을 바꾸지 않는다.

#### 현재 main의 MATCH_SUCCESS (사실)

`settlement_rule.cjs` `evaluateExecution` + `trades.execution.service.ts` `executeTick`. 연출 타이머·난수 성공률은 입력이 아니다.

Hard90(`acceptedAt+90s`)이 먼저다. 넘으면 `MATCH_TIMEOUT` → safe-stop(원금 1회, 수익 0). Soft60은 진행 표시이지 성공 조건이 아니다.

Rule이 **전부 통과해야** `MATCH_SUCCESS`다. 하나라도 실패하면 `PRICE_MOVED` / `BELOW_MIN_PROFIT` / `CIRCUIT_OPEN` / `SYSTEM_FAILED`이고, `PRICE_MOVED`이면서 rematch 여유·Hard90 전이면 `REQUEUE`.

| 규칙 | 현재 입력 | 운영자 상품에 그대로 쓰면 |
|---|---|---|
| R1 | `circuitStatus === "closed"` | 유지 |
| R2 | user가 `frozen`/`banned` 아님 | 유지 |
| R3 | **live** `opportunity.status === "available"` | 참여 후 운영자가 pause하면 기존 거래가 `PRICE_MOVED`로 죽음. 운영자 거래는 **스냅샷 당시 발행**만 본다 |
| R4 | live `pricing.compareReady === true` | ebay 공식 필드. 운영자 견적에는 없음 → 항상 실패하거나 허위 true |
| R5 | live `stale_at` 경과 ≤ `staleAllowanceSec`(기본 **3**) | 운영자 창과 무관한 3초 시세. 적용 금지 |
| R6 | `expectedProfitUsdt >= minProfitUsdt` | 금액은 **quote 스냅샷**. live opp 재조회 금지 |
| R7 | `trade.pricing_version === opp.pricing_version` 또는 이익이 min 이상 softAccept | 운영자는 `quote_version` 고정. live 버전 bump로 실패시키지 않음 |
| R8 | `simulationPayoutFeasible === true` | live `compareReady`/시뮬레이션 리포트. 운영자 경로의 성공 조건으로 **쓰지 않음** (가상 payout ≠ 실판매 입금) |
| R9 | `listingLegsFresh === true` (없으면 buy/sell 레그 + compareReady + gradeMismatch 아님) | ebay listing 레그. 운영자는 listing 쌍이 없음 → 항상 `PRICE_MOVED` |
| R10 | `rematchCount <= maxRematchCount` | 유지 가능. 운영자 기본은 rematch 0 권장(운영자 결정) |

`finalizeMatchSuccess`는 위가 통과한 뒤 `SYS:OPPORTUNITY_POOL` → user `profit`으로 **expectedProfit을 그대로** 전기하고, live `opp.fx_snapshot_id`를 저널에 넣는다. 원장 후 상태 UPDATE는 **다른 TX**다.

#### 운영자 거래의 성공 조건 (목표 · 슬라이스 5에서 구현)

아래를 **모두** 만족할 때만 `MATCH_SUCCESS` + 정산 전표. 숫자를 여기서 확정하지 않는다.

1. Hard90 미만 (서버 시계). 체험 70초 연출 종료 ≠ 성공.
2. 회로 닫힘 · 사용자 frozen/banned 아님.
3. trade가 이미 종료(`success`/`safe_stop`/`cancelled`/`failed`)가 아님. `ledger_journal_id` 있으면 재전기 0.
4. 참여 때 저장한 `quote_id`가 존재하고, 그 행이 **불변**이며 trade의 `quote_version`과 일치.
5. 스냅샷의 선납 합 = `need_amount_krw` / `need_amount_usdt`. 필수 비용 kind가 모두 값 또는 `explicit_zero`.
6. 스냅샷 `fx_snapshot_id`(text)가 `fx_snapshots.id`에 존재. 참여 시점에 없거나 만료였으면 애초에 참여 거절. 정산 때 **새 환율로 재환산 금지**.
7. 예약 수량이 이 trade에 묶여 있음. 성공 시 `reserved → consumed`. safe-stop 시 reserved 반환.
8. 정산 금액 = 스냅샷 `expected_remain_usdt`(및 합의된 원장 라인). live `opportunities.expected_profit_usdt`로 교체 금지.
9. R4/R5/R8/R9의 live ebay/시뮬레이션 입력을 **넣지 않음**. Rule 함수를 호출한다면 운영자 전용 ctx를 따로 만든다. `successRatePercent`·연출로 잔액 분기 금지.

수익 원장 계정은 이번 전환에서 `SYS:OPPORTUNITY_POOL` 유지(권장). 후보 `SYS:MATCH_PROFIT_EXPENSE` / `isInAppPayoutFeasible===true`는 채택하지 않음.

필요 자금은 구매가+모든 비용 일괄이 아니다. **선납(`prepaid`)만** 합산. `deduct_on_sale`을 선납에 넣으면 이중 청구.

### 3.4 이번 전환과 분리하는 것

| 항목 | 이유 |
|---|---|
| 후보 6버킷·`trial_grant` 전면 채택 | `money-ledger.mdc`는 4버킷. main `TrialStateService`는 `practice_grants`. 이중 지급 위험 |
| `SYS:MATCH_PROFIT_EXPENSE` / `isInAppPayoutFeasible===true` | 가상 expense ≠ 실판매 입금 |
| B7 matching_policy를 “운영자 상품”으로 사용 | 배정 정책이지 공급원 가드가 아님 |
| 실행 confirmation 필수화 | DB 객체는 있음. 선행 조건 아님 |
| 옛 `apps/admin` 복제 · 후보에서 화면 가져오기 | 폐기 대상. main에서 이미 삭제됨 |
| putduk-ops 화면 구현/배포 | 원본은 그 레포. 맞춤 이식은 미완료. 이 레포 범위 밖 |
| putduk-web / 체험 70초 모션 | 서버 필드 계약만 인계 |

---

## 4. 재사용할 구현 (후보 전체 머지가 아님)

기준: `4c6f22f`에서 **파일 단위로 읽고**, main `27b5b9f7` 위에 **최소 diff**로 이식. 후보 트리 3,183 항목을 가져오지 않는다. 후보의 `apps/admin`(58) · `packages/ui` · `infra/ops` · `workers/ops-proxy`는 **열람해 복사하지 않음.**

다른 잔여 브랜치(`feat/global-source-unlock-fashionphile` 등)도 동일. **한 브랜치라도 전체 merge 금지.**

### 4.1 이식 후보 (의존성과 함께)

| 후보 | 가져올 것 | 가져오지 말 것 | 의존성 |
|---|---|---|---|
| `ledger.posting.service.ts` | `postJournalInTransaction(client, …)` + commit 후 drain 분리 | 외부 소비 ACK 모델 변경, 계정 잠금 순서 임의 변경 | main `LedgerOutboxService` 유지 |
| `participate.service.ts`의 TX 경계만 | 같은 client에서 원장 lock + trade + request + (선택) 재고 | 후보의 trial 분기·B7 필수화·KRW 표시 전면 | 위 posting API. main 클래식 가입/preflight/멤버십 가드 **유지** |
| `trades.execution.service.ts`의 TX 경계만 | 행 `FOR UPDATE` + 원장 + status를 한 TX | confirmation 대기 필수, live opp로 금액 재계산, virtual payout | posting API. 금액은 **참여 스냅샷** |
| `asset-image-r2.service.ts` (main) | R2 등록 | ebay provenance | 신규 상품 API가 호출 |
| 참여 idempotency + fingerprint (main) | 그대로 | 가드 순서를 가격보다 뒤로 두는 후보 버그 재도입 여부 재검토 | — |
| 멤버십 일일 캡 (main) | 재고와 **별개**로 유지 | 슬롯=재고 | — |
| `user_opportunity_overrides` (main) | 숨김/핀 | 공급원 대체 | — |

서버 파일에 UI import가 있으면 그 파일은 이식하지 않거나 import를 제거한 채 가져온다.

### 4.2 보류 (운영자 상품 슬라이스에 넣지 않음)

- `trial-grant.service.ts` / `trial-funding.service.ts` / 6버킷 타입
- `matching-policy.*` — 배정 UI/API가 putduk-ops에 생긴 뒤
- `payout-reservation.service.ts`
- `fashionphile-observation-pull.service.ts` · `product-onboarding.*` · 후보 KRW money-display 전면
- 후보 `classic-signup.*` — main이 더 최신. **덮어쓰기 금지**
- 후보/타 브랜치의 `apps/admin` 전체

### 4.3 마이그레이션 파일

후보에 있는 10개 DB-only SQL은 **재실행하지 않는다.** 구현 브랜치에서 `git show 4c6f22f:supabase/migrations/<file>`로 원문을 읽고, 살아 있는 컬럼/제약과 맞춰 **없는 컬럼만** 새 타임스탬프 파일에 추가한다. `migration repair`로 숫자만 맞추지 않는다.

`s3_33_product_pipeline`은 DB에 `20260908052954`로 이미 있다. 운영자 수량/비용 컬럼이 그 파이프라인에 있는지는 **착수 시 information_schema로 확인**한다. 있다고 가정하고 중복 ADD하지 않는다.

---

## 5. 수정 대상 파일 (승인 후 · 새 브랜치)

브랜치: `27b5b9f7`에서 `feat/operator-registered-catalog` (가칭). dirty `.vscode/settings.json` 및 untracked 프롬프트는 **추가하지 않음.** 후보를 base로 쓰지 않음.

### 5.1 1순위 — §S1

§S1이 곧 1순위다. 게이트 OFF여도 operator 행 보호가 **선행**이다. cron 삭제보다 먼저.

### 5.2 2순위 — 견적 스키마 · 권한 · 불변성 (운영 미적용 초안)

슬라이스 1 식별 컬럼 위에 견적/비용/수량/창을 올린다. 상세는 §7.

### 5.3 3순위 — 운영자 상품 Admin API (새 화면용 · putduk-ops 연결은 후속)

기존 `OpportunitiesAdminController`의 seed/runtime-seed/patchPricing을 putduk-ops의 주 경로로 쓰지 않는다. 새 컨트롤러를 추가한다. putduk-ops 레포 수정은 이 슬라이스에 넣지 않는다.

| 파일 | 변경 |
|---|---|
| **신규** `services/api-nest/src/opportunities/operator-catalog.admin.controller.ts` | draft 생성 · 사진 등록 · 비용/수량/표시채널 · preview · publish · pause · 배정(후속) |
| **신규** `services/api-nest/src/opportunities/operator-catalog.admin.service.ts` | 검증: 사진 필수, 비용 누락 vs 0, 수량>0, 창, 권한 |
| `opportunities.routes.ts` | 새 경로만 추가. 구 seed 경로는 게이트 ON 후 410/403 |
| `opportunities.module.ts` | DI |
| `common/admin-capabilities.ts` | 새 핸들러 capability. 구 seed write는 게이트 ON 후 deny |
| `opportunities.admin.service.ts` | `upsertAsset`/`registerAssetImage`는 내부 재사용 가능. `patchPricing`은 운영자 견적 경로가 아님을 명시 |
| `asset-image-r2.service.ts` | `imageSource=admin_r2` 유지. 운영자 상품만 갱신 |
| `schemas/operator-product.v1.json` **신규** | putduk-ops·웹 인계 계약 |
| `schemas/operator-quote.v1.json` **신규** | 가격 버전·비용 줄·수량·창 |

기존 `patchPricing` 바디(`adminBuyUsdt`, `useAdminOverride`, ebay `MarketId`)를 putduk-ops가 그대로 쓰게 만들지 않는다.

로그인: main에 `admin-auth/login`·MFA가 **없다**. 토큰 교환(`admin-session`)과 비밀번호 로그인을 동일시하지 않는다. putduk-ops 연결 계획은 **현재 main 구현 / 후보 심볼 / 미구현**을 표로 나눈 뒤에만 시작한다.

### 5.4 4순위 — 가격·피드·참여·정산

| 파일 | 변경 |
|---|---|
| **신규** `services/market-intelligence/src/operator-pricing.cjs` | 항목별 원화. `computeOpportunityPricing` **호출 0** |
| `services/market-intelligence/src/pricing-formula.cjs` | 기존 ebay 공식은 legacy_external 전용으로 남기거나, 운영자 경로가 호출하지 않게 분리 |
| `pipeline.cjs` / `markets.cjs` | 표시 채널은 marketId enum에 넣지 않음. adapter Day-1 잠금 유지 |
| `opportunities.user.service.ts` | 피드 WHERE에 `supply_source='operator'` + 발행 창 + 잔여 수량. 3초 freshness를 운영자 행에 적용하지 않음 |
| `opportunities.types.ts` · `schemas/opportunity-card.v1.json` | 표시 채널, KRW 항목, 잔여 수량, `reasonKo`, `quoteVersion`, `ledgerPosted` |
| `participate.service.ts` | 운영자 가드(창·수량 FOR UPDATE·필수 비용). 스냅샷+`quote_id` 저장. posting을 같은 TX로 |
| `trades.execution.service.ts` | 정산 금액 = quote 스냅샷. live opp로 expectedProfit 교체 금지. 운영자 ctx는 R4/R5/R8/R9 live 입력 0 |
| `loop/preflight.service.ts` | 운영자 창/수량/비용. 3초 stale를 운영자에 재사용 금지 |

### 5.5 사용자 웹 · putduk-ops (이 레포 밖)

이 레포는 계약 스키마와 핸드오프만. `phonarawd/putduk-web` 파서는 웹 레포 작업. PR #222와 같은 파일이면 충돌 검토만 하고 여기서 병합하지 않음.

putduk-ops: 플랫폼 맞춤 이식·API 연결은 **미완료**. 백엔드 계약이 안정된 뒤 그 레포에서 붙인다. 옛 `apps/admin`을 대신 붙이지 않는다.

---

## 6. 기존 진행 거래 처리

조사 시점(2026-09-13 20:22–20:50 KST) 라이브: `trade_executions` **safe_stop 1** · `participate_requests` 1. 그때는 비종료 행이 없었다. **전환 직전에 다시 센다.**

DB 상태 집합: `running` · `requeue` · `success` · `safe_stop` · `cancelled` · `failed`.  
Nest 참여 응답의 `"accepted"`는 request 상태이며, 실행 행 기본은 `running`이다. 둘을 섞어 세지 않는다.

| 상태 | 전환 중 조치 | 금지 |
|---|---|---|
| `success` / `safe_stop` / `cancelled` / `failed` | 읽기 전용 보존. 금액·원장·기회 FK 개조 0 | DELETE, `supply_source` 일괄 승격으로 이력 재해석 |
| `running` / `requeue` (전환 시점에 있으면) | **기존 계약으로 끝까지.** live opp Rule 경로 유지하거나, 운영자 승인된 safe-stop(원금 전액 1회 · 수익 0 · reserved 반환). 해당 `opportunity_id`는 피드에서 숨겨도 **정산 writer는 행을 삭제·operator 견적으로 바꿔 끼우지 않음** | 진행 중 거래에 새 `quote_id` 소급 부착. 참여 시점과 다른 금액으로 재전기 |
| 이후 신규 참여 | 피드가 operator만 열리기 **전**에는 legacy 참여를 kill-switch로 막을 수 있음(별 승인). 열린 뒤에는 operator 가드+스냅샷만 | 레거시 기회에 새 참여를 자동 허용한 채 피드만 숨김(유령 참여) |

슬라이스 1(게이트·행 보호)은 진행 거래를 **변경하지 않는다.** 재가격이 operator가 아닌 legacy `running` 기회의 가격을 바꾸면 기존 Rule(R5/R7)이 그대로 적용된다. 그것이 현재 계약이다. 피드 컷오버(슬라이스 6) 전에 비종료 건수가 0이 아닌 경우: 컷오버를 미루거나, 그 id만 정산 끝날 때까지 live 경로를 남긴다.

롤백: 신규 참여는 kill-switch(`opportunity`). 이미 전기된 전표는 되돌리지 않는다. 외부 cron **자동 재활성 금지.**

---

## 7. 마이그레이션 초안 (적용하지 않음) — 환율 text · FK · 불변 · 비용 · RLS

전제: 원격 68 이력을 재실행·repair하지 않는다. 슬라이스 1은 `supply_source`만. 아래는 **슬라이스 2+** 초안이다. `product_pipeline` 등 기존 객체가 같은 컬럼을 이미 가지고 있으면 ADD를 빼고 주석으로 대응을 남긴다.

가칭: `supabase/migrations/20260914090000_operator_registered_catalog.sql`  
(슬라이스 1 식별 컬럼은 더 이른 타임스탬프의 별 파일로 쪼개도 된다.)

### 7.1 타입 잠금 — 환율 ID는 text

`public.fx_snapshots.id`는 `text PRIMARY KEY`이다 (`20260808205850_opportunities_pricing.sql`).  
`opportunities.fx_snapshot_id` · `listings.fx_snapshot_id` · 입금 FX 컬럼도 **text REFERENCES fx_snapshots(id)**.

초안에서 `fx_snapshot_id uuid`로 두면 **FK 생성 실패**한다. 견적·저널·trade 포인터 모두 `text`다. UUID로 캐스팅하거나 새 uuid PK를 fx에 만들지 않는다.

### 7.2 초안 SQL

```sql
-- DRAFT ONLY — 운영 DB에 실행하지 말 것.
-- 기존 115개 opportunity / 643 listing 을 DELETE하거나 supply_source='operator'로
-- 일괄 UPDATE하지 말 것.

BEGIN;

-- 슬라이스 1에서 이미 있으면 이 블록은 생략
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS supply_source text NOT NULL DEFAULT 'legacy_external';

ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_supply_source_check;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_supply_source_check
  CHECK (supply_source IN ('operator', 'legacy_external'));

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS display_buy_channel text,
  ADD COLUMN IF NOT EXISTS display_sell_channel text,
  ADD COLUMN IF NOT EXISTS visibility_mode text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS visible_from timestamptz,
  ADD COLUMN IF NOT EXISTS visible_until timestamptz,
  ADD COLUMN IF NOT EXISTS catalog_state text NOT NULL DEFAULT 'draft';

ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_catalog_state_check;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_catalog_state_check
  CHECK (catalog_state IN ('draft', 'published', 'paused'));

ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_visibility_mode_check;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_visibility_mode_check
  CHECK (visibility_mode IN ('public', 'assigned'));

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS total_units integer,
  ADD COLUMN IF NOT EXISTS reserved_units integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consumed_units integer NOT NULL DEFAULT 0;

ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opportunities_units_nonneg;
ALTER TABLE public.opportunities
  ADD CONSTRAINT opportunities_units_nonneg
  CHECK (
    reserved_units >= 0
    AND consumed_units >= 0
    AND (total_units IS NULL OR total_units >= 0)
    AND (total_units IS NULL OR reserved_units + consumed_units <= total_units)
  );

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS quote_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quote_effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS quote_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS public.opportunity_quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id),
  quote_version integer NOT NULL,
  buy_amount_krw numeric(18,0) NOT NULL,
  sell_amount_krw numeric(18,0) NOT NULL,
  need_amount_krw numeric(18,0) NOT NULL,
  expected_remain_krw numeric(18,0) NOT NULL,
  need_amount_usdt numeric(36,18) NOT NULL,
  expected_remain_usdt numeric(36,18) NOT NULL,
  -- text. uuid 아님. 발행 견적은 NOT NULL (참여 시 FX 없으면 거절)
  fx_snapshot_id text NOT NULL REFERENCES public.fx_snapshots(id),
  cost_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_buy_channel text NOT NULL,
  display_sell_channel text NOT NULL,
  asset_image_url text NOT NULL,
  effective_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, quote_version),
  CHECK (expires_at > effective_at),
  CHECK (need_amount_krw >= 0 AND sell_amount_krw >= 0),
  CHECK (need_amount_usdt >= 0)
);

CREATE TABLE IF NOT EXISTS public.opportunity_cost_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id),
  quote_version integer NOT NULL,
  kind text NOT NULL,
  amount_krw numeric(18,0),
  explicit_zero boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'KRW',
  cashflow text NOT NULL,
  borne_by text NOT NULL,
  CHECK (cashflow IN ('prepaid', 'deduct_on_sale', 'info_only')),
  CHECK (borne_by IN ('user', 'platform', 'counterparty')),
  CHECK (
    (amount_krw IS NULL AND explicit_zero = false)
    OR (amount_krw IS NOT NULL AND amount_krw >= 0)
  ),
  CHECK (NOT (explicit_zero = true AND amount_krw IS DISTINCT FROM 0)),
  FOREIGN KEY (opportunity_id, quote_version)
    REFERENCES public.opportunity_quote_versions (opportunity_id, quote_version)
);

-- 견적당 kind 1줄 (필수 목록은 앱에서 강제, DB는 중복만 차단)
CREATE UNIQUE INDEX IF NOT EXISTS opportunity_cost_lines_kind_uq
  ON public.opportunity_cost_lines (opportunity_id, quote_version, kind);

ALTER TABLE public.trade_executions
  ADD COLUMN IF NOT EXISTS quote_version integer,
  ADD COLUMN IF NOT EXISTS quote_id uuid;

-- 부분 FK: 운영자 거래만 견적을 가리킴. 기존 1건(safe_stop)은 NULL 유지
ALTER TABLE public.trade_executions
  DROP CONSTRAINT IF EXISTS trade_executions_quote_id_fkey;
ALTER TABLE public.trade_executions
  ADD CONSTRAINT trade_executions_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES public.opportunity_quote_versions(id);

ALTER TABLE public.trade_executions
  DROP CONSTRAINT IF EXISTS trade_executions_quote_pair_fkey;
ALTER TABLE public.trade_executions
  ADD CONSTRAINT trade_executions_quote_pair_fkey
  FOREIGN KEY (opportunity_id, quote_version)
    REFERENCES public.opportunity_quote_versions (opportunity_id, quote_version);

-- quote_id와 quote_version은 둘 다 NULL이거나 둘 다 NOT NULL
ALTER TABLE public.trade_executions
  DROP CONSTRAINT IF EXISTS trade_executions_quote_ptr_chk;
ALTER TABLE public.trade_executions
  ADD CONSTRAINT trade_executions_quote_ptr_chk
  CHECK (
    (quote_id IS NULL AND quote_version IS NULL)
    OR (quote_id IS NOT NULL AND quote_version IS NOT NULL)
  );

-- 불변: 견적·비용 줄은 INSERT only (원장 journals/entries와 동일 패턴)
CREATE OR REPLACE FUNCTION public.operator_quote_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION '% is immutable · INSERT only', TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS opportunity_quote_versions_immutable ON public.opportunity_quote_versions;
CREATE TRIGGER opportunity_quote_versions_immutable
  BEFORE UPDATE OR DELETE ON public.opportunity_quote_versions
  FOR EACH ROW EXECUTE FUNCTION public.operator_quote_forbid_mutation();

DROP TRIGGER IF EXISTS opportunity_cost_lines_immutable ON public.opportunity_cost_lines;
CREATE TRIGGER opportunity_cost_lines_immutable
  BEFORE UPDATE OR DELETE ON public.opportunity_cost_lines
  FOR EACH ROW EXECUTE FUNCTION public.operator_quote_forbid_mutation();

-- 권한 · RLS (기존 app 테이블과 동일: Data API deny-by-default · Nest service_role)
ALTER TABLE public.opportunity_quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_cost_lines ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.opportunity_quote_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.opportunity_cost_lines FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.opportunity_quote_versions TO postgres, service_role;
GRANT ALL ON TABLE public.opportunity_cost_lines TO postgres, service_role;

COMMIT;
```

### 7.3 견적 불변 · 비용 검증 (앱 + DB)

DB CHECK만으로 부족하다. 발행·참여 서비스가 같은 규칙을 강제한다.

| 규칙 | 내용 |
|---|---|
| 새 가격 = 새 버전 INSERT | 기존 `opportunity_quote_versions` 행 UPDATE 0. 트리거가 막음 |
| 헤드 | `opportunities.quote_version`은 최신 **발행** 버전만. 참여는 그 순간의 헤드를 trade에 복사 |
| 필수 kind | 운영자가 확정한 목록(슬라이스 전 결정). 빠지면 publish/participate 거절. null = 누락, `explicit_zero`+0 = 명시 0원 |
| 선납 합 | `SUM(amount_krw) FILTER (cashflow='prepaid' AND borne_by='user')` = `need_amount_krw` − 구매가(구매가가 별 컬럼인 경우). 불일치면 거절 |
| 판매차감 | `deduct_on_sale`은 필요자금에 넣지 않음 |
| `info_only` | 합산 0 |
| JSON `cost_lines` | 테이블과 동일 내용의 스냅샷. 둘 중 하나만 믿지 않음. 참여 때는 테이블+버전을 읽어 JSON을 trade에 고정 |
| 발행 | `catalog_state=published`이면 사진 URL, 필수 kind, `total_units>=1`, 견적 행 존재, `fx_snapshot_id` 존재, 창 유효 |

### 7.4 신규 테이블 권한 · RLS

이전 초안은 “RLS는 별 결정”으로 비워 두었다. **비우지 않는다.**

기존 패턴(`20260808205901_rls_ledger_guards.sql` · `20260902032000_production_schema_parity.sql`):

- `ENABLE ROW LEVEL SECURITY`
- `REVOKE ALL` from `PUBLIC` / `anon` / `authenticated`
- `GRANT ALL` to `postgres`, `service_role`
- 사용자 JWT로 PostgREST 직접 읽기/쓰기 **0**. SoT는 Nest
- Supabase Auth 정책으로 상품을 열지 않음

`ALTER DEFAULT PRIVILEGES`가 이미 anon/authenticated를 회수하는지는 적용 직전 확인한다. 새 테이블이 default로 authenticated SELECT를 받으면 명시 REVOKE가 필요하다.

FORCE RLS는 기존 opportunities에 없으므로 이번 슬라이스에서 신규 테이블에만 갑자기 FORCE하지 않는다. 기존 어드바이저 경고(`trade_execution_confirmations` RLS OFF)는 **이번 전환과 분리**.

### 7.5 의도적으로 빼 둔 것

- 기존 115행을 published operator로 바꾸는 UPDATE
- trial 6버킷 / B7 / confirmation / payout reservation replay
- `stale_at`을 1년 뒤로 미는 패치
- `fx_snapshots.id`를 uuid로 바꾸는 DDL

---

## 8. 검증 순서 (격리 · 운영 참여 실행 금지)

구현 착수 전이 아니라 **승인 후 슬라이스 순서**다.

1. `27b5b9f7`에서 새 브랜치. dirty/untracked 미포함. 후보 미머지.
2. **§S1** 게이트 + operator 행 보호 + 격리 테스트.
3. 후보 `postJournalInTransaction`만 이식하는 단위 테스트 (원장 잠금 순서 ASC 유지). 슬라이스 1과 묶지 않아도 됨.
4. 마이그레이션 나머지(견적·FK·RLS)를 `information_schema`와 대조 후 로컬/격리에만.
5. 운영자 draft→사진/비용/수량 누락 publish 거절. 완비 후 publish. pause 후 피드 0.
6. 피드: operator만. legacy_external 115는 숨김. **그 직전** 비종료 trade 재조회(§6).
7. 참여: 동일 idempotency 2회 → trade 1 · 전표 1 · `quote_id` 1. 잔여 1에 병렬 2 → 1 성공.
8. 참여 후 운영자가 새 견적 INSERT → execute-tick 정산액 = 옛 스냅샷. live opp 변경 무시.
9. Hard90/safe_stop → 원금 1회 반환 · reserved 반환. 수익 0.
10. FX 없음/만료 → 참여 거절. 임의 환율 0. `fx_snapshot_id` text FK 위반 INSERT 실패.
11. 도메인 verify: `pricing-formula` · `catalog-runtime-seed` · `user-opportunity-feed`(또는 후속명) · `participate-http` · `participate-proof` · `adapter-ingest-fail-closed` · `match-success-rule` · `brand-consumer` · `bucket-invariant`(원장 TX를 건드렸을 때).
12. `pnpm verify:gate:fast` 후 T0 커밋. push는 세션 stop/명시만.

---

## 9. 기존 작업과의 충돌

| 기존 작업 | 충돌 | 조치 |
|---|---|---|
| dirty `.vscode/settings.json` (+6/−2) | 없음. 카탈로그와 무관 | 구현 브랜치에 넣지 않음 |
| CRLF로 dirty인 rules/verify/workers | 내용 변경 아님 | 스테이징하지 않음 |
| untracked 조사/프롬프트/본 계획 MD | 없음 | 구현 커밋에 섞지 않음(계획 파일은 별 커밋이 필요하면 명시 후) |
| main 클래식 가입 `eb7ca64a` 이후 · PR #222 | 후보 통째 머지 시 auth/웹 계약 덮임 | 후보 미머지 |
| `money-ledger.mdc` 4버킷 | 후보 6버킷 | 운영자 슬라이스에서 타입 확장 금지 |
| `product-drift-lock` listing legs = ebay\|admin | 표시 채널을 marketId에 넣으면 잠금 위반 | 표시는 별 컬럼 |
| `verify:catalog-runtime-seed` / market-intel-engine | seed·ebay pair 전제 | 게이트 OFF 회귀 유지. 게이트 ON 테스트는 별 케이스. 게이트 약화 금지 |
| 재도입 방지 verify | `apps/admin`이 다시 생기면 FAIL | **유지.** 검사를 느슨하게 하지 않음 |
| Index/Release `rel-701` 배포 대기 | 카탈로그 전환은 배포 티켓이 아님 | 승인 전 프로덕션 배포에 섞지 않음 |
| FINAL_ACCEPTANCE NOT_ISSUED · QA STALE | 이 조사를 인수로 해석 금지 | 기존 보호 절차 유지 |
| 후보 fashionphile / global-source-unlock | 운영자 전용과 반대 | 가져오지 않음 |
| 라이브 ebay 틱 | 게이트 전에 cron을 지우면 늦은 쓰기가 override 없는 행을 덮음 | **행 보호 → 게이트 ON → 잔여 틱 → cron** |
| 인계 문서 admin-auth | main에 모듈 없음 | putduk-ops 로그인 전에 구현/미구현 표 |
| 9개 브랜치의 옛 어드민 | 실물 잔존 | 병합·체크아웃으로 가져오지 않음 |

---

## 10. 권장 실행 슬라이스 (아직 실행하지 않음)

1. **§S1** 새 브랜치 + `supply_source` + 게이트(기본 OFF) + **게이트 OFF에서도** operator 행 보호 + 격리 테스트.
2. 견적/비용/수량/창 + `fx_snapshot_id text` FK + 불변 트리거 + RLS/GRANT. `information_schema` 대조.
3. 새 Admin API (draft/publish/pause/사진/비용/수량). 구 seed/patchPricing을 주 경로로 쓰지 않음. putduk-ops 코드 변경 0.
4. `operator-pricing.cjs` + 피드 필터 + 참여 스냅샷 + 재고 FOR UPDATE.
5. `postJournalInTransaction` 최소 이식. 참여·정산 한 TX. 운영자 MATCH_SUCCESS ctx (§3.3).
6. 게이트 ON. ebay persist/image/reprice 차단. 늦은 틱 확인. **비종료 trade 0 확인 후** 피드 컷오버. cron 정지는 별 승인.
7. putduk-web 인계(필드). putduk-ops는 이 API만 사용하도록 **그 레포에서** 이식(미완료 작업의 시작점).

슬라이스 1개 = 도메인 verify + T0 커밋. 후보 브랜치 merge commit 없음. 옛 어드민 파일 0.

---

## 11. 구현 전에 운영자가 고를 것

1. 기존 115 외부 기회: 숨김 유지(권장) vs 수동 재등록만.
2. 체험 자금: 현행 `practice` 유지 vs DB `trial_*` 배선. 둘 다 쓰면 이중 지급.
3. 수익 원장: 현행 `SYS:OPPORTUNITY_POOL` 유지(권장, 이번 슬라이스) vs 후보 virtual expense.
4. 원화↔USDT 공식과 FX 최대 나이. 현재 primary는 `usd_krw`를 USDT/KRW로 쓰는 legacy. `fx_snapshots.id`는 text.
5. 필수 비용 kind 목록과 선납/판매차감 구분.
6. 수량 0 이후: pause vs 품절 노출.
7. 표시 채널 목록·상표 표기.
8. `trade_execution_confirmations`를 이번 전환에 넣을지 (기본: 넣지 않음).
9. 전환 시점에 `running`/`requeue`가 있으면: 기존 경로로 끝날 때까지 컷오버 대기 vs 승인된 safe-stop.
10. putduk-ops 로그인: 현행 Admin 토큰 교환만 쓸지, `admin-auth`를 이 레포에 새로 둘지 (문서에 있다고 가정 금지).

---

## 12. 한 줄 결론

현재 main은 외부 eBay 입력으로 유저 카탈로그를 채운다. 후보 브랜치에는 원자적 원장 API와 체험/B7·**옛 어드민 화면**이 있으나 운영자 상품 전용 구현은 없고, 전체 머지는 인증 계약과 재도입 방지 검사를 깨뜨린다. putduk-ops는 새 화면 원본이나 퍼뜩 API 연결은 미완료다. 효율적인 수정은 **게이트 OFF에서도 통하는 행 보호 → 견적(text FX FK·불변·RLS) → Admin API → 스냅샷 정산(실제 MATCH_SUCCESS에서 ebay 레그/3초/시뮬레이션 제거) → 진행 거래 소진 후 피드 컷오버 → cron 정지**다. 옛 `apps/admin`은 기준도 복원 대상도 아니다.
