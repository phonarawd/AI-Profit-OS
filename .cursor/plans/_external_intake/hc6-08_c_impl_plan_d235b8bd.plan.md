---
name: HC6-08 C Impl Plan
overview: Founder가 승인한 Architecture C를 기존 Nest/SDK/HomeClean 관례에 맞춰 구현하기 위한 정확한 파일·계약·apply host·실패/테스트 계획이다. 지금은 계획만 확정하고 소스 구현은 하지 않는다.
todos:
  - id: write-c-plan-md
    content: 승인 후 HC6_08_CURRENT_FX_ARCHITECTURE_C_IMPLEMENTATION_PLAN.md 기록
    status: completed
  - id: write-c-plan-json
    content: 승인 후 HC6_08_CURRENT_FX_ARCHITECTURE_C_IMPLEMENTATION_PLAN.json 기록
    status: completed
isProject: false
---

# HC6-08 Architecture C Implementation Plan

```text
FOUNDER_ARCHITECTURE_DECISION=APPROVED_C
IMPLEMENTATION_EXECUTED=NO
KRW_APPROX_BINDING_RESULT=BLOCKED
ARCHITECTURE_C_IMPLEMENTATION_READY=YES
HC6_08_COMPLETE=NO
```

A/B/D 재비교 없음. D는 FX owner가 아니다. D의 server-side approx **출력 모양**만 C downstream apply가 쓴다.

이 계획 승인 후 유일한 write는 evidence 2개다. 소스 구현은 별도 실행 지시 전 금지.

---

## Locked decisions

```text
EXACT_SERVER_PRODUCER=FxSnapshotService.getLatestCurrentFxSnapshot (NEW read)
EXACT_C_ROUTE=GET /api/v1/me/current-fx
EXACT_APPLY_ROUTE=GET /api/v1/me/current-fx/home-approx
EXACT_C_DTO=schemas/fx-snapshot.v1.json REUSE
EXACT_APPLY_DTO=schemas/current-fx-home-approx.v1.json NEW
EXACT_SDK=packages/sdk/src/current-fx
EXACT_APPLY_HOST=C1 Nest CurrentFxHomeApproxService
EXACT_HOMECLEAN_CONSUMER=fetchHomeCurrentFxApprox supplementary allSettled
AUTH=AUTH_REQUIRED
SAME_SNAPSHOT_IMPLEMENTATION_STRATEGY=SINGLE_APPLY_READ
```

---

## 1. Schema: REUSE vs new

**C snapshot GET = REUSE** [`schemas/fx-snapshot.v1.json`](schemas/fx-snapshot.v1.json)

- required가 이미 `fxSnapshotId`, `formulaId`, `sources`, `usdtKrw`, `capturedAt`
- `loadLatest()`가 이 다섯을 이미 읽는다 (`id`, `formula_id`, `sources`, `usd_krw`, `captured_at`)
- optional marketplace legs(`gbpUsd` 등)는 **생략**. `additionalProperties: false`는 extra 금지이지 optional 생략은 허용
- 같은 의미의 이름만 바꾼 새 snapshot DTO 금지

no-snapshot은 required를 만족하는 빈 객체를 만들 수 없다. Growth처럼 가짜 기본 rate를 넣지 않는다.

```text
200 + FxSnapshotV1 = success
404 = no usable current snapshot
```

SDK는 404를 throw/null로 맵. HomeClean은 raw C를 호출하지 않는다.

**Apply GET = NEW schema** `schemas/current-fx-home-approx.v1.json`

이유: 이건 snapshot이 아니라 **서버가 한 snapshot으로 적용한 Home presentation 결과**. FxSnapshotV1을 이름만 바꿔 재사용하면 의미가 섞인다.

필드 (레거시 `*KrwApprox` 관례: `HomePrincipalRail.principalKrwApprox`):

- `fxSnapshotId` string|null
- `capturedAt` string|null
- `principalKrwApprox` string|null
- `withdrawableProfitKrwApprox` string|null
- `expectedProfitKrwApprox` string|null

넣지 않음: `usdtKrw` (UI 곱셈 발판 제거), `formulaId`, `sources`.

`schemas/manifest.day1.json`에 새 파일명만 추가. `fx-snapshot.v1.json` 수정 0.

---

## 2. Server read method

`getLatestUsableSnapshot()`는 marketplace 정규화 전용. Consumer FX로 재해석 금지.

```text
기존 method reuse = NO (반환 타입이 usdtKrw 없음)
새 read method 최소 추가 = YES
```

[`fx-snapshot.service.ts`](services/api-nest/src/opportunities/fx-snapshot.service.ts)에 **additive**만:

```text
getLatestCurrentFxSnapshot(): Promise<CurrentFxSnapshot | null>
```

- 내부는 기존 private `loadLatest()` 재사용
- 맵: `id→fxSnapshotId`, `usd_krw→usdtKrw`, `formula_id→formulaId`, `sources→sources`, `captured_at→capturedAt`
- `usd_krw`가 없거나 `isPositiveAmount` 실패면 null
- 변경 금지: `recordFxIngest`, `loadLatest` SQL, `getLatestUsableSnapshot` 시그니처/반환, formula, provider, DB

---

## 3. Auth

```text
AUTH=AUTH_REQUIRED
AUTH_DECISION=DECIDED
IMPLEMENTATION_BLOCKER=NO
```

근거:

- Growth `GET /growth/public-surface`만 guard 없는 공개 read. ticker/social proof. rate API가 아님
- Home/Wallet/HomeMoney/opportunity user/day-pulse는 전부 `JwtAuthGuard`
- C rate는 유저 돈은 아니지만 Home 머니 표시에만 쓰인다. 공개 `usdtKrw`는 `fx_recalc_in_ui` 발판
- Guest HomeClean은 USDT 슬롯이 없어 apply 호출 자체가 없다

두 엔드포인트 모두 `@UseGuards(JwtAuthGuard)`. `me/` prefix. session userId 불필요(C는 user money가 아님)하지만 컨벤션상 `me/` + JWT.

---

## 4. Apply host = C1

```text
APPLY_SHAPE=C1
C2=REJECTED
C3=NOT_FOUND
```

**C2 탈락:** [`apps/web`](apps/web)에 `app/api` 0. `@aipo/web`은 `@aipo/market-intelligence` 의존 0. Next가 formula를 import하면 패키지 경계 파괴.

**C3 탈락:** current USDT × current snapshot → display string을 하는 기존 Consumer projection 없음. opportunity `expectedProfitKrwApprox`는 pricing-time. Growth `amountKrwText`는 `"—"`.

**C1:** Nest apply service가 서버에서 금액 owner + **FX 1회**를 조합하고 `approxKrwFromSnapshot`을 호출.

계산 owner 경로 (이미 Nest에 존재):

[`services/api-nest/src/opportunities/opportunities.mi.ts`](services/api-nest/src/opportunities/opportunities.mi.ts) → `approxKrwFromSnapshot`

`apps/web` import 0. 순환 금지: `CurrentFxModule` → `HomeReadModule` + `WalletModule` + `OpportunitiesModule` + `LedgerModule`. `HomeReadModule`은 CurrentFx를 import하지 않음.

---

## 5. Apply algorithm (profitUsdt 합성 0)

`CurrentFxHomeApproxService.getForUser(userId)`:

1. `snapshot = getLatestCurrentFxSnapshot()` **1회**
2. `home = HomeReadService.getForUser` try/catch (soft)
3. `buckets = LedgerBucketsService.getUserBuckets` try/catch (soft)
4. snapshot null → 200 + 모든 approx/provenance null. throw 금지
5. 같은 `snapshot.usdtKrw`로 최대 3번 `approxKrwFromSnapshot`
   - principal ← `home.money.principalUsdt` (money state가 값 허용일 때만)
   - expected ← `home.todayPossibleProfitUsdt` (없으면 `home.opportunity.todayPossibleProfitUsdt`)
   - withdrawable ← `buckets.profitUsdt`
6. 유효 금액 = 숫자 문자열, **`"0"` 포함**. null/invalid = 그 슬롯 calc 0, 필드 null
7. HomeReadModel / WalletBuckets **응답 스키마에 필드 추가 0**

HomeClean은 raw `GET /me/current-fx`를 호출하지 않는다. apply만 supplementary fetch.

내부 재조회(HomeRead+Wallet을 클라이언트가 이미 친 뒤 서버가 다시 침)는 소유권 분리 비용으로 수용. 그 이유로 HomeRead/Wallet DTO에 KRW를 심지 않음.

---

## 6. Same snapshot

```text
SAME_SNAPSHOT_IMPLEMENTATION_STRATEGY=SINGLE_APPLY_READ
SAME_SNAPSHOT_GUARANTEE=PARTIAL
```

- 한 apply 응답의 세 KRW = 같은 `fxSnapshotId` / `capturedAt` / `usdtKrw` → 이 범위는 PROVEN
- 슬롯별 FX GET 금지
- HomeRead HTTP와 Wallet HTTP의 USDT 시계는 기존과 같이 atomic이 아님. KRW만 더 강한 분산 트랜잭션을 주장하지 않음

---

## 7. HomeClean consumer / ViewModel / display

LiveAdapter (authenticated만):

```text
Promise.allSettled([fetchHomeCurrentFxApprox])
실패 → 모든 KRW secondary unavailable
viewState 승격 금지
```

Guest/fixture: apply fetch 0. 가짜 FX 0.

ViewModel 확정 이름 (`*KrwApprox`):

- `asset.principal` / `asset.principalKrwApprox`
- `asset.withdrawableProfit` / `asset.withdrawableProfitKrwApprox`
- `asset.expectedProfit` / `asset.expectedProfitKrwApprox`
- `fxApproxProvenance: { fxSnapshotId, capturedAt } | null` — 화면 비노출, 추적만

각 `*KrwApprox`는 기존 `HomeCleanDisplayText`. 의미: server-precomputed current FX reference. KRW wallet balance 아님.

Copy ([`home-clean-copy.ts`](packages/ui/components/home-clean-v1/home-clean-copy.ts)만, `T.home` overwrite 0):

- 허용: `약 ₩…`
- 금지: `원화 잔액` / `KRW 잔액` / `보유 원화`

표시: USDT primary + secondary typography로 `약 ` + 기존 [`formatKrwSigned`](packages/ui/lib/format-money.ts) 합성. `formatKrwSigned`는 이미 서버 문자열을 표시용으로만 묶는다. FX 곱셈 아님.

Zero/null:

- `"0"` USDT + valid FX → `0.00 USDT` + `약 ₩0`
- null/invalid USDT → 정보 없음, KRW calc 0
- valid USDT + FX/apply fail → USDT 유지, KRW hidden
- loading → 확인 중
- `null → 0` 금지

Fixture ready: KRW = 정보 없음/hidden. 시각 fidelity용 가짜 환율 금지.

---

## 8. Failure matrix

- Home+Wallet+FX/apply 성공 → 세 USDT + 세 KRW
- Home 성공 / Wallet 실패 / FX 성공 → 원금·예상 USDT+KRW, 출금 가능 = 정보 없음 (KRW도 없음)
- Home+Wallet 성공 / FX 또는 apply 실패 → 세 USDT, 모든 KRW unavailable, viewState 유지
- Home 실패 → 기존 Home 실패. apply가 Home을 추가로 실패시키지 않음
- Guest → apply 미호출, KRW hidden

---

## 9. Exact files

### API/Nest

- [`services/api-nest/src/opportunities/fx-snapshot.service.ts`](services/api-nest/src/opportunities/fx-snapshot.service.ts) — WHY: current snapshot producer. CHANGE: `getLatestCurrentFxSnapshot`만 추가. PROTECTED: ingest/immutability/`getLatestUsableSnapshot`
- `services/api-nest/src/current-fx/current-fx.routes.ts` — WHY: Growth/Home과 같은 routes 상수. CHANGE: `me/current-fx`, `me/current-fx/home-approx`
- `services/api-nest/src/current-fx/current-fx.user.controller.ts` — WHY: Jwt 사용자 GET. CHANGE: 두 GET. PROTECTED: HomeRead/Wallet controller 0
- `services/api-nest/src/current-fx/current-fx-home-approx.service.ts` — WHY: C1 apply host. CHANGE: 1 snapshot + 3 formula. PROTECTED: profit을 HomeRead에 쓰지 않음
- `services/api-nest/src/current-fx/current-fx.module.ts` — WHY: 독립 모듈. CHANGE: imports HomeRead+Wallet+Opportunities+Ledger
- [`services/api-nest/src/app.module.ts`](services/api-nest/src/app.module.ts) — WHY: 모듈 등록. CHANGE: `CurrentFxModule` import만

`current-fx/` 폴더를 쓰는 이유: `opportunities/`에 넣으면 `domain-by-path`의 engine match verify가 불필요하게 켜진다.

### Schema

- [`schemas/fx-snapshot.v1.json`](schemas/fx-snapshot.v1.json) — REUSE, 수정 0
- `schemas/current-fx-home-approx.v1.json` — NEW apply DTO
- [`schemas/manifest.day1.json`](schemas/manifest.day1.json) — 파일명 1줄 추가

### SDK

- `packages/sdk/src/current-fx/types.ts`
- `packages/sdk/src/current-fx/fetch.ts` — `fetchCurrentFx`, `fetchHomeCurrentFxApprox`
- `packages/sdk/src/current-fx/index.ts`
- [`packages/sdk/package.json`](packages/sdk/package.json) — `"./current-fx"` export
- [`packages/sdk/src/index.ts`](packages/sdk/src/index.ts) — 선택 re-export

### apps/web server boundary

- Next API route 0
- `@aipo/market-intelligence` 의존 0

### HomeClean

- [`HomeCleanDataAdapter.tsx`](apps/web/app/home-clean/HomeCleanDataAdapter.tsx) — apply만 allSettled. raw current-fx 호출 0
- [`mapHomeReadModelToCleanViewModel.ts`](apps/web/app/home-clean/mapHomeReadModelToCleanViewModel.ts) — identity map + KRW display kind
- [`home-clean.types.ts`](packages/ui/components/home-clean-v1/home-clean.types.ts) — `*KrwApprox` + provenance
- [`home-clean-money.ts`](packages/ui/components/home-clean-v1/home-clean-money.ts) — approx display helper. mul 0
- [`home-clean-copy.ts`](packages/ui/components/home-clean-v1/home-clean-copy.ts) — `약 ₩` 카피
- [`HomeCleanAsset.tsx`](packages/ui/components/home-clean-v1/HomeCleanAsset.tsx) + `HomeCleanView.tsx` — secondary 약 ₩
- [`HomeCleanFixture.ts`](packages/ui/components/home-clean-v1/HomeCleanFixture.ts) — KRW unavailable
- `HomeCleanCards.module.css` — secondary typography만 필요 시
- [`format-money.ts`](packages/ui/lib/format-money.ts) — 재사용, FX 로직 추가 0
- [`binding-pass1-grep.mjs`](apps/web/app/home-clean/binding-pass1-grep.mjs) — 약 ₩ secondary 허용. 원화 잔액/KRW primary/fake FX 계속 금지

### Tests / verify

- `packages/ui/components/home-clean-v1/home-clean-krw-approx.test.ts` — NEW
- [`home-clean-binding-pass1.test.ts`](packages/ui/components/home-clean-v1/home-clean-binding-pass1.test.ts) — 14 tests 유지. fixture KRW unavailable assert만 슬롯 추가 시 보강
- `tooling/verify/current-fx-consumer.cjs` — NEW: raw C를 HomeClean이 안 부르는지, mulAmount 0, HomeRead/Wallet DTO FX 필드 0, apply host가 `approxKrwFromSnapshot`을 쓰는지
- [`tooling/verify/CATALOG.md`](tooling/verify/CATALOG.md) + [`domain-by-path.cjs`](tooling/verify/domain-by-path.cjs) + root `package.json` — verify 배선

### Evidence (구현 실행 시, 이번 planning write 아님)

- 구현 후 `_tmp_home_clean/v1/phase6/` 결과 기록은 다음 실행 pass

---

## 10. Blast radius

```text
ENGINE=NO_CHANGE
MONEY=NO_CHANGE
LEDGER=NO_CHANGE
FX_FORMULA=NO_CHANGE
FX_PROVIDER=NO_CHANGE
FX_SNAPSHOT_READ_METHOD=CHANGE
DB=NO_CHANGE
AUTH=NO_CHANGE
DEPOSIT=NO_CHANGE
HOMEREAD=NO_CHANGE
WALLET_DTO=NO_CHANGE
PRODUCTION_SLASH=NO_CHANGE
LEGACY_HOME=NO_CHANGE
```

`FX_SNAPSHOT_READ_METHOD=CHANGE` = `getLatestCurrentFxSnapshot` additive만. ingest/formula/provider 0.

---

## 11. Test plan

Consumer FX surface

- latest success → required 5 fields, marketplace legs 생략
- no snapshot → 404
- invalid/non-positive `usd_krw` → null/404
- `formulaId`/`sources`는 C GET에만. apply/ViewModel/화면 0

Server approximation

- valid amount → formula 결과
- `"0"` → 약 ₩0
- null/invalid → 그 슬롯 null, 다른 슬롯 유지
- 세 값 동일 `fxSnapshotId`
- precision = 기존 `mulAmount` (scale 18). UI `formatKrwSigned`는 표시 반올림만

Home soft failure

- apply/FX fail → USDT 유지, KRW hidden, viewState 유지
- Wallet fail → withdrawable 정보 없음, 원금/예상 KRW 가능
- Home fail → 기존 Home 실패
- fixture/guest → FX fetch 0, KRW hidden

Binding Pass 1 regression

- 14 unit tests 유지
- category/filter/badge 유지
- family 0
- fake Stepper 0
- grep: KRW primary 칩/원화 잔액 금지, 약 ₩ secondary는 서버 필드에만 허용

Runtime (가능 시, 로컬 Next 없으면 `BLOCKED_LOCAL_ENVIRONMENT`)

- `/dev/home-clean-v1?mode=live` 1440×1080 / 390×693
- fixture에 가짜 FX 넣지 않음

---

## 12. Deposit separation

```text
KRW_DEPOSIT_FX_PRODUCT_REQUIREMENT=RECORDED
FUTURE_DEPOSIT_FX_RISK=RECORDED
```

`krw-deposit.service.ts` / `krwToUsdt` / historical snapshot apply는 이번 구현 범위 밖. C를 Deposit owner로 재사용하지 않음.

---

## 13. GO / safety / stop

```text
ARCHITECTURE_C_IMPLEMENTATION_READY=YES
FOUNDER_ARCHITECTURE_DECISION=APPROVED_C
IMPLEMENTATION_EXECUTED=NO
KRW_APPROX_BINDING_RESULT=BLOCKED
HC6_08_COMPLETE=NO
HC6_09_NOT_STARTED
PHASE_7_NOT_STARTED
```

YES 이유: 파일, C/apply 계약, apply host, auth, failure, same-snapshot, tests가 닫힘.

이번 planning pass 허용 write (승인 후):

- `_tmp_home_clean/v1/phase6/HC6_08_CURRENT_FX_ARCHITECTURE_C_IMPLEMENTATION_PLAN.md`
- `_tmp_home_clean/v1/phase6/HC6_08_CURRENT_FX_ARCHITECTURE_C_IMPLEMENTATION_PLAN.json`

소스/스키마/SDK/HomeClean 수정 0. commit/push/stash 0.

marker: `HOME_CLEAN_HC6_08_CURRENT_FX_ARCHITECTURE_C_IMPLEMENTATION_PLAN_COMPLETE`

자동 구현 진입 금지.
