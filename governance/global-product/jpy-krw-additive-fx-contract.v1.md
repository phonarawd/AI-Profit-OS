# JPY / KRW Additive FX Contract v1

| | |
|---|---|
| schema | `governance.global-product.jpy-krw-additive-fx-contract.v1` |
| version | `1.0.0` |
| measuredAt | `2026-08-16` |
| owner | Engine §0.0.2d · formula SSOT = Engine §0.0.4.2 |
| matrices | `governance/global-product/jpy-krw-additive-fx-matrices.v1.json` |
| parser SSOT | `governance/global-product/parser-implementation-contract.v1.md` (extraction 불변) |
| runtime | **0** |
| listing-leg authorization | **NO** |
| Home / 03 / 04 / Money ledger | **DO NOT MODIFY** |

> **Verdict:** `JPY_KRW_ADDITIVE_FX_CONTRACT = PASS`  
> **Principle:** `SOURCE_OBSERVATION != LISTING_LEG`  
> **FX principle:** 새 parallel FX truth **0** · parser 자체 환율 **0** · client guessed FX **0**  
> Yahoo Japan = `PERMANENTLY_FORBIDDEN` (본 계약 재조사 0).

---

## 0. Founder currency principle (Consumer)

```text
KRW = PRIMARY
USDT = SECONDARY
SOURCE NATIVE CURRENCY = PRESERVED
```

USDT-only 금지. 원본 가격 덮어쓰기 금지.

의미 분리 (숫자는 example only · runtime hardcode 금지):

```text
Mercari source truth     ¥29,280 JPY
        ↓
same authoritative fxSnapshotId
        ↓
Consumer
  ₩약 xxx,xxx          ← normalized KRW (approx)
  현지 가격 ¥29,280    ← native preserved
  약 xx.xx USDT        ← optional secondary
```

---

## 1. Actual FX architecture found (repo, 추측 0)

### 1.1 Single snapshot, two jobs

| Job | Function | Snapshot fields | Status |
|---|---|---|---|
| Native → USDT | `normalizeNativeToUsdt` | `usdtPerUsd` + `gbpUsd`/`eurUsd`/`audUsd` | READY for USD/GBP/EUR/AUD/USDT |
| USDT → KRW display | `approxKrwFromSnapshot` | `usdtKrw` (legacy column `fx_snapshots.usd_krw`) | READY |
| Snapshot compose | `composeFxSnapshot` | primary `cg_usdt_krw` · fallback `cg_usdt_usd__frank_usd_krw` | READY |
| Ingest | `FxSnapshotService.recordFxIngest` | immutable INSERT · never UPDATE rates | READY |
| Providers | CoinGecko + Frankfurter | worker raw-relay only · Nest inverts | READY · JPY symbol **unwired** |

SSOT: `services/market-intelligence/src/fx-snapshot-formula.cjs`  
Nest bridge: `services/api-nest/src/opportunities/opportunities.mi.ts`  
Persist: `services/api-nest/src/opportunities/fx-snapshot.service.ts`  
Schema: `schemas/fx-snapshot.v1.json`  
Verify: `pnpm verify:fx-snapshot-formula` · `pnpm verify:price-denomination-contract`

### 1.2 Existing normalize chain (do not replace)

```text
USDT native → identity
USD native  → nativeAmount × usdtPerUsd
GBP/EUR/AUD → nativeAmount × {gbp|eur|aud}Usd × usdtPerUsd
other       → throw FX_UNSUPPORTED_CURRENCY
```

`1 USD == 1 USDT` 가정 금지. `usdtPerUsd` 없으면 fail-closed.

KRW display:

```text
approxKrw = mulAmount(normalizedUsdt, usdtKrw)
```

`usdtKrw` = CoinGecko tether→KRW = **KRW per 1 USDT**.  
`money.cjs` SCALE=18 · round-half-up · IEEE float 금지.

### 1.3 Current supported native enum (runtime)

`SUPPORTED_NATIVE_CURRENCIES` = `USD | GBP | EUR | AUD | USDT`  
`listing.v1` / `price-observation.v1` / `listings_native_currency_chk` / `price_observations_native_currency_chk` 동일.

JPY는 `verify:fx-snapshot-formula`가 **throw 필수**로 잠가 둠.  
KRW는 enum 밖 → 동일하게 `FX_UNSUPPORTED_CURRENCY`.

Frankfurter worker symbols **지금** = `KRW,GBP,EUR,AUD` (`workers/frankfurter-adapter/src/client.ts`).  
JPY는 provider가 공개함 (`frankfurter.dev` USD/JPY) — **레포 배선만 없음**.

### 1.4 Money KRW deposit ≠ listing FX

`KrwDepositService.krwToUsdt` = ledger credit (`payableKrw / fx_snapshots.usd_krw`, integer KRW, truncating bigint).  
**재사용 대상 = snapshot 필드 `usdtKrw`/`usd_krw`뿐.**  
Money 함수·정산식·원장 경로를 listing normalizer가 호출하거나 교체하면 안 된다.

---

## 2. Truth flow (불변)

```text
SOURCE NATIVE PRICE
        ↓
nativeAmount + nativeCurrency          ← Parser only
        ↓
AUTHORITATIVE FX SNAPSHOT (fxSnapshotId)
        ↓
NORMALIZED USDT                        ← Normalizer
        ↓
NORMALIZED KRW VALUE                   ← approxKrwFromSnapshot
   or KRW identity when native=KRW
        ↓
OPTIONAL USDT SECONDARY
        ↓
CONSUMER PRESENTATION                  ← 03 later · this session 0
```

금지:

```text
parser → 자체 환율
client Math.round(price * guessedRate)
Google / daily constant / stale-as-fresh FX
second FX service
KRW → USD → KRW 로 primary 재작성
unsupported locale → 억지 USD
```

---

## 3. JPY final contract

### 3.1 Native preservation

```text
Mercari example: nativeAmount=29280 · nativeCurrency=JPY
```

관측 원본은 정규화 후에도 남는다. Consumer 원화가 native를 덮어쓰지 않는다.

### 3.2 Authoritative path (existing architecture에 가산)

JPY는 GBP/EUR/AUD와 **같은 가족**:

```text
Frankfurter base=USD rates.JPY     = usdJpy  (JPY per 1 USD)  ← raw relay
deriveMarketplaceLegs              → jpyUsd = divAmount("1", usdJpy)
normalizeNativeToUsdt              → JPY × jpyUsd × usdtPerUsd
approxKrwFromSnapshot              → USDT × usdtKrw
```

같은 `fxSnapshotId`. 새 formulaId 금지. 새 FX provider 금지.

### 3.3 Future additive runtime (이번 세션 0)

| Change | Why | Owner |
|---|---|---|
| Frankfurter `symbols` += `JPY` · payload `usdJpy` | raw provider quote | frankfurter-adapter |
| `deriveMarketplaceLegs` += invert `usdJpy` → `jpyUsd` | 기존 GBP/EUR/AUD와 동일 inversion | `fx-snapshot-formula.cjs` |
| `FIAT_USD_RATE_FIELD.JPY = "jpyUsd"` | normalize 분기 재사용 | 동일 |
| `SUPPORTED_NATIVE_CURRENCIES` += `JPY` | fail-closed 해제 | 동일 |
| `fx_snapshots.jpy_usd numeric(18,8)` | `gbp_usd`와 동일 정밀도 | additive migration |
| `fx-snapshot.v1` + `FxSnapshotService` carry `jpyUsd` | 같은 immutable snapshot | Nest FX service |
| `listing.v1` / `price-observation.v1` enum += `JPY` | persist 허용 (leg 승격 아님) | schema |
| CHECK `listings` / `price_observations` += `JPY` | DB 정합 | additive migration |
| SDK/`market-intelligence-ptf-00c.d.ts` | 타입 가산 | Engine |
| `verify:fx-snapshot-formula` JPY case | 기존 verifier **확장** (신설 금지) | tooling |

`jpyUsd` missing → 기존 `FX_MISSING: snapshot.jpyUsd`와 동일 fail-closed.

---

## 4. KRW native final contract

KREAM / Bunjang: `nativeCurrency = KRW`.

```text
nativeCurrency = KRW
→ nativeAmount 자체가 Consumer KRW primary
→ 재환산 금지
```

예: `₩325,000` → primary 그대로 `₩325,000`.

KRW를 `FIAT_USD_RATE_FIELD`에 넣지 않는다.  
KRW를 `usd_usdt` / `fiat_usd_usdt` 체인에 태워 primary를 다시 쓰지 않는다.

---

## 5. KRW → USDT secondary decision

**결정:** 기존 snapshot `usdtKrw`의 **역산**. 새 환율식 발명 0.

```text
secondaryUsdt = divAmount(nativeAmount, usdtKrw)
```

근거: `approxKrwFromSnapshot(usdt, { usdtKrw }) = mulAmount(usdt, usdtKrw)`.  
역함수는 `divAmount` (`money.cjs`, 동일 SCALE=18 · round-half-up).

`usdtKrw` null/≤0 → `FX_MISSING` / `FX_INVALID` fail-closed.

### 5.1 Round-trip 금지 (primary)

절대 금지:

```text
primaryKrw = approxKrwFromSnapshot(divAmount(nativeKrw, usdtKrw), { usdtKrw })
```

rounding drift로 primary가 `₩325,000`에서 벗어날 수 있다.  
primary는 **항상** `nativeAmount` identity.

### 5.2 Money deposit 함수 비재사용

`KrwDepositService.krwToUsdt`는 integer KRW + truncating division + ledger credit.  
listing/observation secondary는 `divAmount`만. Money 런타임 변경 0.

### 5.3 Future additive runtime (이번 세션 0)

| Change | Why |
|---|---|
| `normalizeNativeToUsdt` KRW branch `chain: "krw_usdt"` | secondary USDT only |
| Consumer/projection primary bypass | KRW identity · `approxKrwFromSnapshot` 호출 0 |
| enum/CHECK += `KRW` | persist 허용 (listing-leg 승격 아님) |
| `SUPPORTED_NATIVE_CURRENCIES` += `KRW` | ingest skip 해제 |
| KRW를 `SUPPORTED_MARKETPLACE_FIAT_CURRENCIES`에 넣지 말 것 | USD 경유 금지 |

---

## 6. USD / EUR / GBP / AUD preservation

| Currency | Native persist | →USDT | →KRW | Additive this contract |
|---|---|---|---|---|
| USD | YES | `usd_usdt` | READY | **없음** |
| EUR | YES | `fiat_usd_usdt` (`eurUsd`) | READY | **없음** |
| GBP | YES | `fiat_usd_usdt` (`gbpUsd`) | READY | **없음** |
| AUD | YES | `fiat_usd_usdt` (`audUsd`) | READY | **없음** |
| USDT | YES | `identity` | READY | **없음** |

기존 PTF-00C 경로·formulaId·verifier assertion을 약화·교체 금지.

---

## 7. Unsupported locale currency

예: GOAT page = SGD, snapshot에 SGD leg 없음.

```text
SOURCE OBSERVATION = VALID
NORMALIZATION     = BLOCKED_UNSUPPORTED_CURRENCY
```

레포 현재 매핑:

| Layer | Behavior now |
|---|---|
| `normalizeNativeToUsdt` | `throw FX_UNSUPPORTED_CURRENCY: SGD` |
| `normalizeIngestListingsForPersist` | `skipped.reason=unsupported_native_currency` |
| catalog seed | per-row `fxNormalizationFailed` skip |

금지: SGD→USD 가정 · 필드명만 보고 USDT 취급 · 클라이언트 추정.

본 계약은 SGD/기타 locale enum을 **추가하지 않는다** (추측 금지).  
관측은 as-observed. 정규화/listing persist는 fail-closed.

---

## 8. Parser responsibility (불변)

Parser owns:

```text
source · externalItemId · url · imageUrl
nativeAmount · nativeCurrency · meta.priceKind
observedAt · staleAt
```

Parser must not: JPY→KRW · JPY→USDT · KRW→USDT · 수익 · Admin 가격 · Opportunity publish.

FX 때문에 parser schema 확대 금지.  
FASHIONPHILE / Chrono24 / TCGplayer / Mercari / KREAM / StockX / GOAT / Bunjang extraction 계약 **재작성 0**.  
Vestiaire image gate **이번 세션 0**.

---

## 9. Consumer presentation handoff (03 수정 0)

REPORT ONLY. 숫자는 example.

### KRW native (KREAM / Bunjang)

```text
₩325,000
약 xxx.xx USDT
```

`약 ₩` 재환산 금지. native가 이미 KRW.

### JPY source (Mercari JP)

```text
약 ₩xxx,xxx
현지 가격 ¥29,280
약 xx.xx USDT
```

### USD source (eBay / FASHIONPHILE / TCGplayer typical)

```text
약 ₩xxx,xxx
현지 가격 $295
약 xxx.xx USDT
```

`packages/ui/lib/format-money.ts` = 표시 기초 · **FX 발명 금지**.  
서버가 이미 정규화한 decimal string만 받는다.  
`expectedProfitKrwApprox` = 예상 수익 · source 시세 아님.  
Home `principalKrwApprox` 배선 gap은 **지갑 잔액 표시** — 본 listing FX 계약과 분리. Home/H6.5/H7 **변경 0**.

---

## 10. Admin truth separation

```text
source native price
≠ normalized KRW
≠ operator effective price
≠ expected profit
≠ ledger settlement
```

`opportunity-pricing.v1` / override / Rule R1~R10 불변.

---

## 11. Snapshot truth (재사용)

| Topic | Repo fact |
|---|---|
| timestamp | `capturedAt` · per-leg `rate_provenance.{source,capturedAt}` |
| providers | `coingecko` · `frankfurter` only (`yahoo_jp` schema enum 금지) |
| immutability | INSERT only · `ON CONFLICT DO NOTHING` · rate UPDATE 0 |
| carry-forward | CoinGecko 15m · Frankfurter/marketplace 6h · 초과 시 leg=null |
| fail-closed | missing/invalid/unsupported → throw/skip · fabricate 0 |
| precision | decimal string · SCALE 18 · snapshot fiat legs `numeric(18,8)` |
| Day-1 listing legs | `ebay \| admin` 불변 |

---

## 12. Required future additive runtime (최소 · 이미 있는 것 제외)

이미 READY (todo 중복 금지): USD/EUR/GBP/AUD/USDT normalize · `approxKrwFromSnapshot` · CoinGecko usdtKrw/usdtUsd · Frankfurter usdKrw/usdGbp/usdEur/usdAud · immutable snapshot · fail-closed JPY test · Money deposit KRW→USDT ledger.

나중에만:

1. JPY enum + CHECK + `jpy_usd` column + Frankfurter `usdJpy` + `deriveMarketplaceLegs`/`normalizeNativeToUsdt` JPY  
2. KRW enum + CHECK + `normalizeNativeToUsdt` `krw_usdt` + primary identity rule  
3. schema/SDK/verify:fx-snapshot-formula **확장** (JPY identity + KRW identity + KRW secondary + round-trip 금지 fixture)  
4. Founder 별도 인가 전 observation persist / parser runtime / listing-leg 승격 **0**

---

## 13. Duplicate-work audit

| Existing | Relation |
|---|---|
| `market-intel-engine` completed | FX compose + KRW display · JPY/KRW native **범위 밖** |
| PTF-00C P0-A/B | USD/GBP/EUR/AUD marketplace legs · **유지** |
| Money `krw-deposit` | ledger only · 본 계약이 호출/교체 금지 |
| §0.0.2c parser contract | gap 식별 · 본 문서가 FX 계약 닫음 · extraction 재작성 0 |
| Home `principalKrwApprox` | wallet display wiring · **별도** · 03 미수정 |
| 01 Money todos | 전부 completed · 신규 Money todo **0** |

---

## 14. STOP

PASS여도 시작 금지: JPY FX runtime · Vestiaire runtime · parser runtime · Home/03 · Money ledger · listing-leg 확대.

**다음 Global Data 단계:** Vestiaire 1st-party image URL lock (`§0.0.2c` 선행 (2)).  
**File-Serial 03 (다른 세션):** `redesign-r1-home-visual-asset-production` — 본 계약이 순서에 영향 0.
