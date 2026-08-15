# Global Parser Implementation Contract v1

| | |
|---|---|
| schema | `governance.global-product.parser-implementation-contract.v1` |
| version | `1.0.0` |
| measuredAt | `2026-08-16` |
| owner | Engine §0.0.2c |
| matrices | `governance/global-product/parser-contract-matrices.v1.json` |
| runtime | **0** |
| listing-leg authorization | **NO** |
| Home / 03 / 04 | **DO NOT MODIFY** |

> **Verdict:** `GLOBAL_PARSER_IMPLEMENTATION_CONTRACT = PASS`  
> **Principle:** `SOURCE_OBSERVATION != LISTING_LEG`  
> Vestiaire image gate = **BLOCKED** (resolved, not fake-PASS). Bunjang representative image = **LOCKED**.  
> Yahoo Japan = `PERMANENTLY_FORBIDDEN`. DROP / REFERENCE_ONLY = parser current-price 대상 0.

---

## 0. Product principle

퍼뜩은 해외/국내 사진·가격을 긁어모으는 서비스가 아니다.

```text
여러 시장 상품 데이터
  → 상품 정규화
  → 동일 상품 매칭
  → 시장별 가격 비교
  → 환율 / 비용 / 정책
  → 예상 순차익
  → 한국 사용자 Opportunity
```

Parser 성공 ≠ Consumer 노출. raw observation을 그대로 기회 카드에 올리지 않는다.

---

## 1. Truth layers (덮어쓰기 금지)

| Layer | Existing SSOT | Parser may write? |
|---|---|---|
| SOURCE NATIVE TRUTH | `listing.v1` / `price-observation.v1` `nativeAmount` `nativeCurrency` `observedAt` `externalItemId` `url` `imageUrl` | observation only · in-place overwrite 금지 |
| PEOTTEOK NORMALIZED | `normalizeNativeToUsdt` · `fxSnapshotId` · `approxKrwFromSnapshot` | **NO** |
| OPERATOR COMMERCIAL | `opportunity-pricing.v1` `adminBuyUsdt`/`adminSellUsdt`/`adminMarginPct`/`useAdminOverride`/`pricingSource` | **NO** |
| EFFECTIVE CONSUMER | §0.0.5.1 override merge · `user-opportunity-override.v1` | **NO** |
| EXPECTED ECONOMICS | `expectedProfitUsdt` · `expectedProfitKrwApprox` | **NO** |
| LEDGER / SETTLEMENT | Money §49 · Rule R1~R10 | **NO** |

```text
SOURCE PRICE
≠ NORMALIZED KRW VALUE
≠ ADMIN EFFECTIVE PRICE
≠ EXPECTED PROFIT
≠ SETTLEMENT / LEDGER TRUTH
```

`PUBLISH_GUARDS.listingLegsOnly=["ebay","admin"]` · `yahooJpForbidden=true` — 본 계약이 supersede하지 않는다.

---

## 2. Field reuse (새 giant schema 0)

새 universal 필드를 만들지 않는다. 관측 출력은 기존 이름을 재사용한다.

| Contract name | Existing field | Notes |
|---|---|---|
| source | `price-observation.v1` `source` | 신규 source id는 **계약 레지스트리만**. listing/observation enum 확장 = 후속 additive · 이번 세션 0 |
| externalItemId | `listing.v1` `externalItemId` | |
| productUrl | `listing.v1` `url` | `productUrl` 신설 금지 |
| imageUrl | `listing.v1` `imageUrl` | |
| nativeAmount | `listing.v1` `nativeAmount` | decimal string · as-observed |
| nativeCurrency | `listing.v1` `nativeCurrency` | as-observed · 억지 USD 금지 |
| observedAt | `listing.v1` `observedAt` | |
| staleAt | `listing.v1` `staleAt` | |
| title | `listing.v1` `title` | matching hint |
| priceKind | `price-observation.v1` `meta.priceKind` | 스키마 필드 EXTEND_LATER |
| brand / model / reference / category | Asset Master `meta` + observation `meta` | matching hint only |
| marketplace / country | 기존 `marketplaceId` / `marketId` | 신규 marketId enum 이번 세션 0 |

eBay persist 실물 (`workers/ebay-adapter`): `externalItemId`←Browse `itemId` · `imageUrl`←`image.imageUrl` · `nativeAmount`←`price.value` · `nativeCurrency`←`price.currency` · `url`←`itemWebUrl` · `staleAt`←`observedAt + CACHE_HINT_SEC(300)`. 웹 파서가 이 300s를 복사하지 않는다.

---

## 3. Parser vs Normalizer

### Parser owns

이 source 페이지에 **지금 무엇이 보이는가.**

- source · externalItemId · url · imageUrl
- nativeAmount · nativeCurrency · priceKind(meta)
- observedAt · (staleAt 존재 시 관측 시각만)
- title + matching hints
- sold/deleted/품절 → fresh current price로 사용 금지

### Parser must not

- KRW 계산 · 클라이언트/하드코드 환율
- 수익 · Admin margin · Opportunity publish
- 동일상품 최종 판정
- settlement / ledger
- eBay Browse를 웹 파서로 재수집

### Normalizer / FX owns

`services/market-intelligence/src/fx-snapshot-formula.cjs`

- `normalizeNativeToUsdt` — native → USDT
- `approxKrwFromSnapshot` — USDT → KRW **display**
- `FxSnapshotService` — immutable `fx_snapshots` · fail-closed
- Frankfurter: USD→KRW/GBP/EUR/AUD only (`workers/frankfurter-adapter`)
- CoinGecko: USDT/KRW · USDT/USD

### Matching owns (parser 이후)

`watch-match.cjs` · `bag-match.cjs` · `card-match.cjs`  
이미지 유사도 단독 matching 금지.

---

## 4. KRW / FX ownership (이번 세션 runtime 0)

### 4.1 판정

| Q | Answer |
|---|---|
| A. Parser는 nativeAmount/nativeCurrency만? | **YES** |
| B. Normalization이 KRW를 따로 만드는가? | **YES** — `approxKrwFromSnapshot(normalizedUsdt, { usdtKrw })` · 같은 `fxSnapshotId`만 |
| C. JPY→KRW owner? | **NONE READY** · `FX_UNSUPPORTED_CURRENCY: JPY` (`verify:fx-snapshot-formula` · `verify:price-denomination-contract`) |
| D. USD→KRW owner? | **READY** · USD→USDT(`usdtPerUsd`)→KRW(`usdtKrw`) |
| E. EUR→KRW owner? | **READY** · `eurUsd` + `usdtPerUsd` → USDT → KRW |
| F. 기타 locale? | snapshot leg 없으면 **fail-closed** · 억지 USD 금지 |

`listing.v1` `nativeCurrency` enum = `USD|GBP|EUR|AUD|USDT`  
JPY/KRW persist = `BUT_NORMALIZATION_BLOCKED_BY_CURRENCY_CONTRACT`  
Frankfurter JPY leg = **미배선**. KRW native→USDT = **미구현**.  
KRW-native(KREAM/Bunjang) 표시 항등식도 listing persist 전 **별도 additive 계약**이 필요하다.

### 4.2 Consumer currency (03 구현 0 · handoff)

```text
KRW = PRIMARY
USDT = SECONDARY
SOURCE NATIVE = TRACE / CONTEXT
```

- 일본: `₩약 {krw}` + `현지 가격 ¥{native}` — ¥만 크게 = 금지
- 미국: `₩약 {krw}` + `현지 가격 ${native}`
- 한국 원본 KRW: `₩{native}` — 중복 환산 표시 강제 금지
- USDT-only 금지
- source USDT ≠ wallet / principal / settlement USDT
- `packages/ui/lib/format-money.ts` = KRW-first 표시 기초 · **FX 발명 금지**
- `opportunity-card.v1` `expectedProfitKrwApprox` = **예상 수익** · source 시세가 아님
- 프론트 `Math.round(price * guessedRate)` / Google 환율 / daily constant / stale-as-fresh = 금지

### 4.3 Native preserve

원화 표시가 native를 덮어쓰지 않는다. 로케일 혼재 source(StockX/GOAT/Vestiaire/Chrono24)는 **페이지에 적힌 currency**를 관측한다.

---

## 5. Common observation interface

```text
source
externalItemId
url                 # listing.v1.url
imageUrl
nativeAmount        # > 0 decimal string
nativeCurrency      # known ISO · as-observed
meta.priceKind      # listing_sale | buy_now | lowest_ask
observedAt
staleAt
title
meta.brand
meta.model
meta.reference
meta.categoryHint   # watch | trading_card | luxury_bag | unsupported
```

`priceKind` 허용만 current-price pipeline. 금지 kind → REJECT/QUARANTINE:

`last_sale` · `market_price` · `retail` · `bid` · `sold_at` · `model_average` · `installment` · `shipping` · `discount` · `coupon`

가격 이상치: `0` · negative · 할부금 · 배송비 · 할인액 · 쿠폰액 · 비교 발매가.

---

## 6. Product fit gate

퍼뜩 category = `watch` | `trading_card` | `luxury_bag` (`asset-master.v1`).

수집 후 다음을 **전부** 통과해야 matching handoff:

```text
SUPPORTED_CATEGORY?
STABLE_PRODUCT_ID?
VALID_IMAGE?
VALID_CURRENT_PRICE?
VALID_CURRENCY?
PRICE_KIND_ALLOWED?
```

실패 = `REJECT` / `QUARANTINE`. 수집 가능 ≠ Opportunity 후보.

혼합 마켓(KREAM/Bunjang/Mercari/StockX/GOAT) = `SUPPORTED_CATEGORY_FILTER` 필수. 필터 전 publish 금지.

---

## 7. Matching handoff

```text
Parser → Normalization → Same-product Matching
```

Parser가 동일 상품을 최종 판정하지 않는다. 기존 matcher **REUSE**.

| Category | Exact keys (existing) | Optional later (거대 스키마 0) |
|---|---|---|
| watch | `brand` + `reference` (+ `model` when asset declares) | year · dial · bracelet · condition · box/papers |
| luxury_bag | `brand` + `model` (+ `size`/`color` when asset declares) | material · year/version · condition |
| trading_card | `set` + `number` + `lang` + `finish` (+ `gradeDeclared`) | grading company · edition |

Fuzzy-alone auto-publish = FORBIDDEN (기존 가드).

---

## 8. Image policy

Consumer 이미지는 **실제 상품 사진**만.

금지: logo · banner · category artwork · seller avatar · placeholder · promotion · tracking pixel.

대표 이미지 = 갤러리 **#1** (source 계약의 1st product photo). 매핑 실패 = `VALID_IMAGE?` FAIL.

Day-1 UI allowlist (`image-hosts.ts`)는 ebay/pokemontcg/ygoprodeck/R2만. 웹 파서 호스트 추가는 **후속 UI** · 이번 세션 0.

---

## 9. Source implementation matrix

대상 10 + 제외. 상세 JSON = matrices 파일.

| Source | Mode | Category Fit | List Path | ID Path | Image Path | Price Path | Native | PriceKind | KRW owner | Browser? | Contract Ready? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| eBay | `EXISTING_API` | watch / trading_card / luxury_bag | Browse search | `itemId` | `image.imageUrl` | `price.value` | as-observed | listing_sale | existing FX | NO | YES — keep |
| FASHIONPHILE | `PUBLIC_WEB_STRUCTURED_DATA` | luxury_bag + relevant luxury | `/products.json` | Shopify id + handle + SKU | primary product image | `variants[].price` | page/store actual | listing_sale | Normalizer (USD ready) | NO | YES |
| KREAM | `PUBLIC_BROWSER_RENDERED_WEB` | filter required | `/brands/{Brand}` + 상세 추천 | `/products/{n}` | `kream-phinf.pstatic.net` 대표#1 | DOM `즉시구매가` | KRW | buy_now / lowest_ask | **BLOCKED** enum/FX | YES | YES extract / NO persist |
| Bunjang | `PUBLIC_BROWSER_RENDERED_WEB` | filter required | `/search/products?q=` | `/products/{pid}` | §11 Bunjang rule | DOM `{n}원` | KRW | listing_sale | **BLOCKED** enum/FX | YES | YES extract / NO persist |
| Mercari JP | `PUBLIC_WEB_META` | filter required | `/search?keyword=` 판매중 | `/item/m{id}` | `og:image` `static.mercdn.net/.../m{id}_1.jpg` | `product:price:amount` | JPY | listing_sale | **BLOCKED** JPY | NO (detail meta) | YES extract / NO persist |
| StockX | `PUBLIC_BROWSER_RENDERED_WEB` | filter required | 검색 · 관련상품 | `url_key` + style code | `images.stockx.com` (placeholder 제외) | Lowest Ask / Buy Now | page actual | lowest_ask | Normalizer if USD/GBP/EUR/AUD | YES | YES |
| GOAT | `PUBLIC_BROWSER_RENDERED_WEB` | filter required | `/sneakers/brand/{brand}` + 상세 | slug + SKU | `image.goat.com` product_template | `Buy New` only | page actual | buy_now | Normalizer if supported | YES | YES |
| Vestiaire | `PUBLIC_BROWSER_RENDERED_WEB` | luxury_bag + relevant luxury | `/women-bags/handbags/{designer}/` | numeric `Reference` + `.shtml` | **GATE BLOCKED** | listing `$` · `Sold at` 금지 | page actual | listing_sale | Normalizer if supported | YES | **BLOCKED** |
| Chrono24 | `PUBLIC_BROWSER_RENDERED_WEB` | watch | `/brand/ref-{ref}.htm` | `--id{n}.htm` + Listing code | `img.chrono24.com/images/uhren/` | individual listing Price | page actual | listing_sale | Normalizer if supported | YES | YES |
| TCGplayer | `PUBLIC_BROWSER_RENDERED_WEB` | trading_card | 검색 grid · 10/25/50 | `/product/{id}` | 히어로 · `product-images.tcgplayer.com` / `tcgplayer-cdn.tcgplayer.com` | `As low as` / offer row | USD | listing_sale | Normalizer (USD ready) | YES | YES |

제외:

| Source | Status | Parser current-price |
|---|---|---|
| Yahoo Japan | `PERMANENTLY_FORBIDDEN` | 구현 0 · 재조사 0 |
| SNKRDUNK · The RealReal · Cardmarket · POKARD | `DROP` | 구현 0 |
| 카드픽 · 포카허브 | `REFERENCE_ONLY` | current-price pipeline 0 · catalog reference ≠ Opportunity 현재가 |

---

## 10. Source-specific extraction

### 10.1 eBay — `KEEP_EXISTING_API`

재작성 금지. `workers/ebay-adapter` Browse only.  
웹 파서 큐에 ebay.com을 넣지 않는다. 중복 observation 키 = `source=ebay` + `marketplaceId` + `externalItemId`.

### 10.2 FASHIONPHILE — `PUBLIC_WEB_STRUCTURED_DATA`

- `products.json` → `id` · `handle` · SKU · `images` · `variants[].price`
- `priceKind=listing_sale` · Est. Retail ≠ 판매가 · shipping 별도
- representative = primary / featured product image
- currency = store/page actual (실측 USD)

### 10.3 KREAM — `BROWSER_RENDER_REQUIRED`

- ID: `/products/{n}`
- List: `/brands/{Brand}` + 상세「이 브랜드의 다른 상품」
- Image: `kream-phinf.pstatic.net` 대표이미지#1 · 로고/배너 제외
- Price: DOM `즉시구매가` = buy_now / lowest_ask
- 금지: 최근거래가 · 발매가 · 배송비
- Native: KRW → persist/normalize **BLOCKED** until additive FX/enum

### 10.4 Bunjang — representative image LOCKED

사용자 초안 `/product/{pid}`는 **오경로**. 실측 공개 경로:

```text
https://m.bunjang.co.kr/products/{pid}
https://bunjang.co.kr/products/{pid}
```

본 세션 실측: `m.bunjang.co.kr/products/418735658` → `510,000원` · `배송비`/`무료배송` 별도.

**대표 이미지 규칙 (pid 1:1 · CDN 존재만으로 PASS 금지):**

1. 상세 `/products/{pid}`를 브라우저 렌더한다. raw `#root` 셸만이면 이미지 0.
2. `img[src]` 중 host = `media.bunjang.co.kr` 만 후보.
3. pathname이 `/product/{pid}_` 로 시작해야 한다. pid 불일치 URL 폐기.
4. 대표 = sequence slot **`_1_`** (`/product/{pid}_1_{ts}_w{width}.jpg` 형태).
5. `{ts}`·width는 **관측값**이다. pid만으로 URL을 조립하지 않는다.
6. 제외: `static.bunjang.co.kr` · `og-image.webp` · seller/profile · AD「이 상품을 추천해요」.
7. slot `_1_` 0건 = `VALID_IMAGE?` FAIL → REJECT.
8. 파트너/Open API `imageUrlTemplate` 사용 금지 (본 계약 = public web).

Price: DOM `{n}원` = `listing_sale` · KRW. `shippingFee` ≠ price.

### 10.5 Mercari Japan — public meta

- `/item/m{id}` · `product:price:amount` + `product:price:currency=JPY`
- `og:image` = `static.mercdn.net/item/detail/orig/photos/m{id}_1.jpg`
- `priceKind=listing_sale` · 税込 · `送料込み` 라벨 ≠ 상품가
- 품절/삭제/가격미설정 = fresh current 금지
- JPY normalize **BLOCKED**

### 10.6 StockX — `BROWSER_RENDER_REQUIRED`

- Price: Lowest Ask / Buy Now only
- 금지: Last Sale · Retail · Bid
- Image: `images.stockx.com` · `Product-Placeholder` 제외
- ID: `url_key` + style code
- currency = 페이지 표기

### 10.7 GOAT — `BROWSER_RENDER_REQUIRED`

- Price: `Buy New` only. 없으면 `NO_CURRENT_PRICE` → skip/quarantine
- 금지: Make Offer · historical · Buy Used를 현재가로 승격
- Image: `image.goat.com` `product_template_pictures`
- currency = 페이지 표기 (S$ 등 혼재 실측)

### 10.8 Vestiaire — `VESTIAIRE_PARSER_CONTRACT = BLOCKED`

본 세션 실측 `Reference 62875551`:

- buyer-facing 상세 · `Photo 1 … 8 product photos` **확인**
- `Seller profile picture`는 상품 사진과 **분리 표기**
- listing `$` · `Sold at` ≠ 현재가
- **이미지 src / CDN URL = 1st-party 미캡처** (markdown 변환에 URL 없음 · 이전 세션 HTTP 403과 동일 공백)
- robots.txt에 `/img/produit/` 언급은 있으나 **안정 URL 패턴으로 잠그지 않음**
- 제3자 scraper 템플릿(`images.vestiairecollective.com/produit/{id}-1_2.jpg`) = **PASS 근거 아님**

가격만으로 억지 PASS 금지. 구현 큐 진입 금지. 재개 조건 = 우회 없이 Photo 1의 1st-party/approved host+path를 관측 잠금.

### 10.9 Chrono24 — `BROWSER_RENDER_REQUIRED`

- 공개 buyer listing only
- Price = **individual listing** · Basic Info `Price`
- 금지: model average · historical market value · ref 페이지 평균
- ID: `--id{n}.htm` + `Listing code`
- Image: `img.chrono24.com/images/uhren/` · `static.chrono24.com` 로고 제외
- shipping ≠ listing price · negotiable은 kind 혼동 시 quarantine

### 10.10 TCGplayer — `BROWSER_RENDER_REQUIRED`

- Price: `As low as` 또는 실제 purchase offer row
- 금지: Market Price · Most Recent Sale · historical
- Image: 렌더 히어로 · host `product-images.tcgplayer.com` 또는 `tcgplayer-cdn.tcgplayer.com` · raw 셸 URL 없음
- shipping 별도 · USD

---

## 11. Failure isolation / health / drift / freshness

### Isolation

소스 독립. KREAM DEGRADED ≠ Mercari/eBay/Chrono24 정지.  
기존 `provider-health.cjs`: persist `HEALTHY|DEGRADED|STALE|BLOCKED` · display `unknown`.  
한 parser 실패로 Global Data pipeline 전체 stop 금지.

### Health metrics (가산 계약 · 신 verifier 0)

discovered items · valid image% · valid price% · valid currency% · stable ID% · parser failure% · last successful observation · staleness · zero-result anomaly

### Drift

어제 N건 → 오늘 0 · image 98%→3% · price selector 100%→0 · currency/ID missing 급증 = silent success 금지 → 해당 source `DEGRADED`/`BLOCKED`.

### Freshness

`observedAt` + `staleAt` 재사용.  
eBay `CACHE_HINT_SEC=300`을 웹 소스 TTL로 **발명 복사 금지**.  
근거 없는 신규 TTL 금지.  
`now > staleAt` 또는 sold/품절/삭제 신호 → Consumer에 현재가처럼 표시 금지.  
TTL 미확정 동안 staleAt 없는 관측 = current 표시 금지.

---

## 12. Browser / security

우선: plain HTTP · structured data · meta · embedded JSON.  
브라우저 = `BROWSER_RENDER_REQUIRED` source만.

절대 금지: CAPTCHA / Cloudflare / DataDome / fingerprint bypass · proxy rotation to evade · private auth reuse.  
정상 공개 접근이 깨지면 해당 source `BLOCKED`.

---

## 13. eBay 중복 금지

```text
eBay existing ingestion ──┐
                          ▼
Public Web Parsers ──► Common Observation Boundary ──► Normalization
```

- ebay.com 웹 파서 0
- 동일 `source+externalItemId(+marketplaceId)` 이중 poll 0
- 공통 normalizer가 있어도 eBay ingest는 adapter 1경로만

---

## 14. Implementation order (repo audit · Founder 순서 가정 0)

기준: 추출 안정 + 퍼뜩 category + 현재가 의미 + 유지보수 + **기존 FX로 normalize 가능 여부**.

| # | Source | Why this slot |
|---|---|---|
| 0 | eBay | 신규 파서 아님 · 기존 유지 |
| 1 | FASHIONPHILE | JSON · USD ready · luxury_bag · browser 0 |
| 2 | Chrono24 | watch 핵심 · listing price · 이미지 잠김 · USD/EUR/GBP면 FX ready |
| 3 | TCGplayer | trading_card · As low as · USD ready |
| 4 | Mercari JP | meta 최단순 · JPY라 observation-only |
| 5 | KREAM | 즉시구매가 명확 · KRW persist blocked · filter 필요 |
| 6 | StockX | Lowest Ask 명확 · 카테고리 혼재 · browser |
| 7 | GOAT | Buy New 없으면 skip · locale |
| 8 | Bunjang | C2C 노이즈 · 이미지 규칙은 LOCKED · KRW blocked |
| 9 | Vestiaire | **image gate BLOCKED** · 재개 전 구현 0 |

한 번에 9개 구현 금지. runtime 착수는 별도 Founder 인가 + File-Serial todo.

---

## 15. Runtime prerequisites (구현 시작 전)

1. 본 계약 유지 · listing-leg 인가 **별도 L3** (이번 PASS ≠ publish 권한)
2. 신규 source persist enum additive (`price-observation.source` 등) — 이번 0
3. JPY/KRW `nativeCurrency` + Frankfurter JPY leg + KRW→USDT — Money/FX 후속 · 이번 0
4. Vestiaire 1st-party image URL lock 전에는 Vestiaire runtime 0
5. `SUPPORTED_CATEGORY_FILTER` 설계 구현
6. BROWSER_RENDER_REQUIRED 최소 경로 (Playwright를 계약이 강제하지 않음)
7. provider-health source id 가산
8. Consumer/Admin 표시 레이어 분리 (03/04 후속)
9. eBay 단일 ingest 경로 보존

---

## 16. Consumer UI handoff (03 수정 0)

| Requirement | Rule |
|---|---|
| KRW PRIMARY | 한국 Consumer 기본 이해 통화 |
| native contextual | 원본 시장가 유지 · native-only hero 금지 |
| USDT SECONDARY | 상품 계약이 요구할 때만 · USDT-only 금지 |
| stale ≠ current | `staleAt` 경과 · sold/품절 미표시 |
| Admin effective ≠ source raw | 「eBay 현재가」로 override를 거짓 표기 금지 |
| expected ≠ source | `expectedProfitKrwApprox`를 시세로 쓰지 않음 |

카피 예 (숫자 = example only · runtime hardcode 금지):

- KREAM: `국내 시세` `₩325,000`
- Mercari: `일본 시세` `₩약 274,000` + `현지 가격 ¥29,280`
- StockX: `미국/글로벌 시세` `₩약 410,000` + `현지 가격 $295`
- Chrono24: `해외 시계 시세` `₩약 48,500,000` + `현지 가격 $34,900`

---

## 17. Admin handoff (04 runtime 0)

운영 화면은 아래를 **한 필드에 합치지 않는다.**

```text
raw source price
normalized KRW
effective operator price
matching / reference price
expected profit
expected return
source health
product visibility
```

Parser는 SOURCE_TRUTH만 넘긴다. Admin policy는 후단.

---

## 18. Repo reuse

| Existing | Reuse |
|---|---|
| `workers/ebay-adapter` | KEEP |
| `listing.v1` / `price-observation.v1` fields | observation shape |
| `fx-snapshot.service.ts` / `fx-snapshot-formula.cjs` | KRW/USDT owner |
| `provider-health.cjs` | isolation |
| `watch-match` / `bag-match` / `card-match` | matching |
| `asset-master.v1` category + meta keys | fit + hints |
| `opportunity-pricing.v1` | Admin commercial (parser 금지) |
| `market-partner.registry.json` | 웹 파서를 officialPartner로 추가 금지 |
| `workers/yahoo-jp-adapter` leftover | HISTORICAL · 삭제/재구현 이번 0 |
| 새 parser framework | **NOT_NEEDED** |
| 새 listing-leg | **NOT_NEEDED** |
