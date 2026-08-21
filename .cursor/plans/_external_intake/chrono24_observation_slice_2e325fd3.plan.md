---
name: Chrono24 Observation Slice
overview: Founder가 확인한 Chrono24 Product 문서로 Confirmation parser를 구현하고, acquisition과 parser를 분리한다. 자동 HTTP/Playwright 획득은 BLOCKED_CURRENT_ENV로 유지한다. 수동 복붙을 제품 구조로 만들지 않는다.
todos:
  - id: chrono24-vertical-slice
    content: Chrono24 real Confirmation parser + acquisition/parser split (auto-acquire still BLOCKED_CURRENT_ENV)
    status: completed
isProject: false
---

# Chrono24 Real Parser + Automated Observation Direction

이전 ACCESS_BLOCKED-only 플랜은 **폐기**한다. 이번 슬라이스는 parser를 구현하되, 자동 acquisition limitation은 별도 상태로 유지한다.

```text
CURRENT_ACTIVE_PLAN = YES
구현 SSOT = .cursor/plans/ai_profit_os_global_observation_chrono24.plan.md (구현 시 신설)
COMMIT_PUSH = FORBIDDEN
```

## 0. Git Safety

- Branch: `main` · HEAD: `0345206ad2e7238658454db5d072c8fbf93dbb37`
- Dirty tree 보존. Chrono24 observation 관련 파일만 수정
- commit / push / stash / reset / restore **금지**

## 1. 최종 제품 방향 (이번 슬라이스에서 구현하지 않음 · 구조만 맞춤)

```text
자동 Source 탐색 → 자동 Confirmation fetch → 자동 parser
→ SourceObservation → Identity Matching → Opportunity → /profits
```

Founder DevTools / HTML 복붙 / 가격 수동 입력은 **parser bootstrap 한 번**일 뿐이다. production dependency가 아니다.

```text
MANUAL_FOUNDER_COPY_PASTE_REQUIRED_IN_PRODUCTION = NO
```

이번 슬라이스에서 Identity Matching · Opportunity INSERT · `/profits`는 구현하지 않는다.

## 2. Parser vs Acquisition (분리)

```text
acquireDocument(source, url)  → SourceDocument | ACCESS_BLOCKED
parseDocument(SourceDocument) → SourceObservation | fail-closed
observeProduct({ source, url, purpose }) = acquire + parse
```

- Parser는 HTML이 들어오면 deterministic
- Acquisition owner가 나중에 생겨도 parser를 다시 쓰지 않음
- 존재하지 않는 acquisition 방법(공식 API, 숨은 endpoint, cookie reuse)을 추측 구현하지 않음
- CLI/API에 "Founder HTML paste → observation"을 제품 경로로 만들지 않음. `parseChrono24ProductDocument`는 fixture/verify + 향후 acquire 연결용 pure function

현재 실측:

```text
FOUNDER_NORMAL_BROWSER_DOCUMENT = PASS
CURSOR_HTTP_ACQUISITION = BLOCKED
FRESH_PLAYWRIGHT_ACQUISITION = BLOCKED
CHRONO24_DOCUMENT_STRUCTURE_PROVEN = YES
CHRONO24_PRODUCT_PARSER_FEASIBLE = YES
CHRONO24_DISCOVERY_RUNTIME = NOT_VERIFIED
```

우회 금지: stealth · Turnstile solver · proxy · fingerprint spoof · cookie/session copy.

## 3. Verified Confirmation document (Founder 일반 브라우저)

한 상품(`externalItemId = 46423475`)에서 확인된 owner:

| Field | Owner | Evidence |
|---|---|---|
| externalItemId | JSON-LD `Product.productID` | `46423475` · URL `--id{n}` · DOM listingId와 일치 시 강화 |
| title | JSON-LD `Product.name` | Rolex Submariner Date … |
| brand | JSON-LD `Product.brand.name` | Rolex |
| reference | JSON-LD `Product.sku` = `1680` | **sku로 저장하지 않음** → `meta.modelNumber` (watch reference) |
| year | JSON-LD `Product.productionDate` | `1978` → `meta.identityHints.year` (schema에 year 없음) |
| image | JSON-LD `Product.image[0].contentUrl` | Photo 1 · DOM gallery와 가능하면 동일성 검사 |
| localized offer | JSON-LD `offers.price` + `priceCurrency` | `13750` + `SGD` |
| availability | JSON-LD `offers.availability` | InStock → `available` |
| condition | JSON-LD `offers.itemCondition` | UsedCondition → `meta.condition` |
| canonicalUrl | JSON-LD `offers.url` | listing URL |
| DOM enrichment | Basic Info | Model, Reference, Listing code, Year, Condition, Case diameter, Dial, Scope of delivery, Price, Availability |

Acquisition forensic (이전 세션, 유지):

- robots.txt 200 · listing HTTP/Playwright = Cloudflare Turnstile 403
- challenge-only HTML = JSON-LD 0 → `ACCESS_BLOCKED`

## 4. Price invariant (CRITICAL)

```text
SOURCE_NATIVE_LISTING_PRICE != LOCALIZED_VIEWER_DISPLAY_PRICE
```

같은 문서에 동시 존재:

- JSON-LD: `13750` `SGD` = **localized display offer**
- DOM: `$10,499 (= S$13,750) [Negotiable]` = native candidate 가능 (`$10499`) + localized 확인 (`S$13750`)
- `window.metaData.pageData.watchPrice = 9070` = analytics · **현재가 금지**

금지:

- JSON-LD SGD를 무조건 `nativeAmount`로 저장
- 이 한 문서의 `$10499`를 모든 Chrono24 canonical native로 일반화
- `$`만 보고 USD 확정 (ISO evidence 없으면 currency AMBIGUOUS)
- first-number / analytics `watchPrice`

이 fixture의 Confirmation `sourceStatus = SUCCESS`는 **native owner가 반복 증명되기 전 금지**. parser는 두 candidate를 구분해서 기록하고 `AMBIGUOUS` (또는 native 미해결)로 fail-closed.

기존 generic 필드 재사용 + 최소 additive (FASHIONPHILE 무시 · `additionalProperties: false` 때문에 필요):

- `meta.localizedAmount` / `meta.localizedCurrency` — source-neutral viewer offer
- `meta.priceSemantics` — `native_unresolved` | `native_proven` | `localized_only`
- `meta.identityHints` — `{ year, listingCode, dial, scopeOfDelivery, movement, caseMaterial }` 문자열만

`nativeAmount`/`nativeCurrency`는 native evidence가 있을 때만. CONFIRMATION SUCCESS 규칙은 기존 유지.

`priceKind`는 native가 확정될 때만 `listing_sale`. 이 fixture에서는 넣지 않거나 SUCCESS가 아니므로 요구되지 않음.

## 5. Confirmation parser

[`services/market-intelligence/src/source-observation/adapters/chrono24.cjs`](services/market-intelligence/src/source-observation/adapters/chrono24.cjs)

```text
1. STRUCTURED_DATA / JSON-LD Product
2. DOM corroboration / enrichment
3. FAIL CLOSED
```

필수:

- `classifyChrono24Url`
- `detectChrono24AccessBlock`
- `acquireChrono24Document({ url, fetchImpl })` — HTTP only this slice. 403/challenge → `ACCESS_BLOCKED`. Playwright는 HTTP 200+비challenge JS shell일 때만(저사양 1개). Turnstile 보이면 즉시 BLOCKED
- `parseChrono24ProductDocument({ html, url, purpose, observedAt, fetchedAt })` — HTML → observation/fail. **purpose=DISCOVERY면 Confirmation 문서를 Discovery truth로 승격하지 않음** (동일 HTML을 DISCOVERY로 파싱하는 건 ID/image candidate만, price는 confirmed market truth 아님)

FAIL CLOSED (SUCCESS 금지):

- Product JSON-LD 없음 / 복수 충돌 Product
- productID 없음
- URL `--id{n}` ≠ productID
- image 없음 / logo·static.chrono24.com만
- native vs localized 미해결
- currency 불명확
- challenge / Turnstile-only HTML
- analytics watchPrice를 price owner로 쓴 경우
- title로 ID 생성

이미지: `Product.image[0].contentUrl` 1차. `displayAuthorized = false`. `/profits` 권한 0.

Identity: `meta.brand` / `meta.model` (DOM Model/Collection) / `meta.modelNumber` (reference 1680, JSON-LD sku에서 오더라도 sku 필드에 넣지 않음) / `meta.condition` / `meta.size` (case diameter). 나머지 identityHints.

`parserVersion = chrono24.structured-data.1`

Discovery search/list parser는 **evidence 없음 → 구현 0**. URL classify만. `CHRONO24_DISCOVERY_RUNTIME = NOT_VERIFIED`.

## 6. observeProduct wiring

[`observe.cjs`](services/market-intelligence/src/source-observation/observe.cjs) source dispatch:

- `fashionphile` → 기존 PUBLIC_JSON **무변경**
- `chrono24` → acquire + parse
- 그 외 → NOT_IMPLEMENTED

`IMPLEMENTED_PARSERS`에 `chrono24` 추가. listing-leg/`forbidden.cjs`의 Chrono24 FORBIDDEN **유지**. `workers/chrono24-adapter` 0. `assertNotForbidden`을 observation path에 연결하지 않음.

memory repository: fixture에서 나온 observation(AMBIGUOUS 포함) append/read-back 가능. assetId 0. DB/migration 0.

## 7. Sanitized fixtures

전체 Founder HTML repo 저장 금지. csrf/session/request/user/tracking/cookie/auth/analytics payload 제거.

`services/market-intelligence/src/source-observation/fixtures/chrono24/`

구현 시작 시: 워크스페이스에 Founder HTML이 있으면 거기서 subset 추출. 없으면 이 프롬프트의 proven JSON-LD/DOM owners로 **최소 sanitized subset**을 구성. `image[0].contentUrl`은 capture의 실제 `img.chrono24.com/images/uhren/` URL만. 없으면 SUCCESS/image fixture를 닫지 않고 URL을 문서에서만 채움(발명 0).

최소 케이스:

1. `confirmation-product.sanitized.json` — JSON-LD Product + Price DOM + Basic Info + primary image. parse → ID `46423475` · image owner JSON-LD · localized 13750 SGD · native unresolved · analytics 미사용 · status SUCCESS 아님
2. `missing-image` → FAIL
3. `missing-product-id` → FAIL
4. `malformed-jsonld` → FAIL
5. `conflicting-id` (URL id ≠ productID) → FAIL
6. `challenge-only` → `ACCESS_BLOCKED`
7. `analytics-watchprice-only` → 현재가 사용 금지 / SUCCESS 아님

FASHIONPHILE fixtures 그대로 regression.

## 8. Source matrix (Chrono24만 · 단일 ACCESS_BLOCKED 금지)

[`governance/global-product/source-observation-runtime.v1.json`](governance/global-product/source-observation-runtime.v1.json)

```text
DOCUMENT_STRUCTURE_STATUS = PROVEN
PRODUCT_PARSER_STATUS = IMPLEMENTED   (구현 후)
CONFIRMATION_PARSER = PASS            (구현·fixture 후)
DISCOVERY_RUNTIME = NOT_VERIFIED
NORMAL_BROWSER_DOCUMENT_ACCESS = PASS
AUTOMATED_HTTP_ACQUISITION = BLOCKED_CURRENT_ENV
AUTOMATED_PLAYWRIGHT_ACQUISITION = BLOCKED_CURRENT_ENV
LIVE_RUNTIME_STATUS = PARSER_READY_ACQUISITION_BLOCKED
NEXT_ACTION = LEGITIMATE_ACQUISITION_OWNER
persistToListingLeg = false
```

다른 source / Vestiaire / Yahoo **변경 0**. `LIVE_PROVEN` 위조 금지.

## 9. Verifier

[`tooling/verify/source-observation-runtime.cjs`](tooling/verify/source-observation-runtime.cjs) 확장. 새 verifier 0.

- chrono24 adapter 존재 · `gateObserveSource("chrono24").ok`
- unverified 목록에서 chrono24만 제거
- matrix 분리 상태 검사 (HTTP/Playwright BLOCKED_CURRENT_ENV · parser IMPLEMENTED · discovery NOT_VERIFIED)
- 위 fixture 11항
- FASHIONPHILE regression · listing-leg ebay|admin · Yahoo 0 · stale=3 · workers/chrono24-adapter FORBIDDEN
- `live-chrono24.cjs`: 자동 acquire는 exit 2(`BLOCKED_CURRENT_ENV`) 허용. fixture PASS를 live PASS로 인쇄 금지

## 10. CURRENT ACTIVE plan 파일

구현 시 [`.cursor/plans/ai_profit_os_global_observation_chrono24.plan.md`](.cursor/plans/ai_profit_os_global_observation_chrono24.plan.md) 신설. todo 1개. 기존 foundation plan은 `CURRENT_ACTIVE_PLAN = NO`.

## 11. 하지 않는 것

우회/쿠키복제 · Discovery 추정 parser · Source #3 · Identity Matching · Opportunity · FX/Money/Reprice · image display auth · `/profits` UI · 수동 입력 제품 경로 · commit/push

## 12. Verify · 보고

```text
pnpm verify:source-observation-runtime
pnpm verify:listing-legs-day1
```

보고 포맷: `PUTDUK_CHRONO24_REAL_PARSER_IMPLEMENTATION` (사용자 §16). 예상:

```text
CHRONO24_DOCUMENT_STRUCTURE = PASS
CHRONO24_EXTERNAL_ITEM_ID = PASS
CHRONO24_IMAGE_PARSER = PASS
CHRONO24_IDENTITY_HINTS = PASS / PARTIAL
CHRONO24_PRICE_PARSER = PARTIAL
CHRONO24_NATIVE_VS_LOCALIZED_PRICE = PASS   (구분) / native resolve = BLOCKED
CHRONO24_CONFIRMATION_PARSER = PASS         (fail-closed + extract)
CHRONO24_DISCOVERY_RUNTIME = NOT_VERIFIED
CHRONO24_AUTOMATED_*_ACQUISITION = BLOCKED_CURRENT_ENV
CHRONO24_PRODUCTION_AUTOMATION = NOT_COMPLETE
MANUAL_FOUNDER_COPY_PASTE_REQUIRED_IN_PRODUCTION = NO
FASHIONPHILE_REGRESSION = PASS
```
