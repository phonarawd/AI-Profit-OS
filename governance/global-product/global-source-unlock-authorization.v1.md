# Global Source Unlock Authorization v1

| | |
|---|---|
| schema | `governance.global-product.global-source-unlock-authorization.v1` |
| version | `1.0.0` |
| measuredAt | `2026-09-08` |
| owner | Founder execution delegation · Engine §0.0.2 |
| supersedes | §0.0.2 FORBIDDEN table · Parser/JPY-KRW `runtime 0` · KR resale 영구 제외 · Vestiaire BLOCKED · DROP/REFERENCE_ONLY parser bans |

> **Verdict:** `GLOBAL_SOURCE_UNLOCK = AUTHORIZED`  
> **Principle:** `SOURCE_OBSERVATION != LISTING_LEG` 유지 · Money ledger / settlement 불변.

---

## 1. Unlock scope (2026-09-08)

다음 **정책·문서·코드 잠금**을 본 문서가 **supersede**한다.

| 이전 잠금 | 새 상태 |
|---|---|
| KR C2C (번개·중고나라·당근·**크림·필웨이**) 정책 제외 | **OBSERVATION + compare AUTHORIZED** |
| `forbidden.cjs` web-parser adapter/market bans | **cleared** (anti-bot 우회 금지는 유지) |
| Parser `runtime 0` | **`runtime AUTHORIZED`** (File-Serial 구현 todo) |
| JPY/KRW FX `runtime 0` | **`runtime AUTHORIZED`** |
| Vestiaire image gate BLOCKED | **AUTHORIZED** (1st-party URL 관측 규칙 적용) |
| DROP (SNKRDUNK·The RealReal·Cardmarket·POKARD) | **OBSERVATION CONDITIONAL** (product fit gate 통과 시) |
| REFERENCE_ONLY (카드픽·포카허브) | **REFERENCE + optional observation** |
| Yahoo Japan PERMANENTLY_FORBIDDEN | **SUPERSEDED** · official `yahoo_jp` adapter 경로 유지 |
| Founder L3 “listing adapter 금지” | **OBSERVATION ingest AUTHORIZED** · settlement listing = ebay\|admin\|partner 유지 |
| 쿠팡 | **신규 OBSERVATION 후보** · 계약 매트릭스 additive |

**유지 (본 unlock이 supersede하지 않음):**

- CAPTCHA / Cloudflare / DataDome / fingerprint **우회 금지**
- Money ledger · settlement · Admin commercial override semantics
- Fuzzy-alone auto-publish 금지 · image-similarity 단독 매칭 금지
- Home presentation freeze

---

## 2. Authorized observation sources

`source_observations.source` + Parser Worker registry:

```text
ebay (API only — no web re-crawl)
fashionphile, chrono24, tcgplayer, mercari_jp
kream, bunjang, stockx, goat, vestiaire
feelway, coupang
cardpick, pokahub (reference)
snkrdunk, the_realreal, cardmarket, pokard (conditional)
yahoo_jp (official adapter · scrape alias forbidden)
```

---

## 3. Implementation authority

| Layer | Authority |
|---|---|
| Observation persist | **AUTHORIZED** |
| Canonical product + match_results | **AUTHORIZED** |
| Consumer compare + assetImageUrl hydrate | **AUTHORIZED** |
| Day-1 money settlement listing leg | ebay \| admin \| Phase1+ partner (amazon, yahoo_jp) |
| Parser HTML/browser extract | **AUTHORIZED** per `parser-implementation-contract.v1.md` |

---

## 4. Document pointers

- Parser extraction SSOT: `governance/global-product/parser-implementation-contract.v1.md`
- Matrices: `governance/global-product/parser-contract-matrices.v1.json`
- FX: `governance/global-product/jpy-krw-additive-fx-contract.v1.md`
- Code: `services/market-intelligence/src/forbidden.cjs` (cleared)
- Pipeline: `services/market-intelligence/src/pipeline.cjs` `OBSERVATION_SOURCES_ALLOWED`
