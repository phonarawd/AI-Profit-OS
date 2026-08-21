---
name: Opportunity Reprice Freshness
overview: Listing persist 이후 기존 Opportunity를 canonical compute로 재계산하고, opportunity.stale_at writer를 전부 AS-OF로 통일한다. listing 300s cache hint는 유지. 새 formula·parser·UI·commit/push는 하지 않는다.
todos:
  - id: reprice-lifecycle
    content: "[grok-4.5|256K] listing update → Opportunity reprice/freshness lifecycle 완성 (AS-OF writer 통일 포함 seed 신규 row bugfix + canonical reprice owner + persist hook)"
    status: completed
isProject: false
---
<!-- REL-017-AUTHORITY-STAMP -->
```text
EXECUTION_AUTHORITY = NO
CONTENT_AUTHORITY = NO
HISTORICAL_REFERENCE_ONLY = YES
DO_NOT_EXECUTE = YES
SUPERSEDED_BY = PUTDUK_RELEASE_MASTER.plan.md
```
<!-- /REL-017-AUTHORITY-STAMP -->


```text
CURRENT_ACTIVE_PLAN = NO
COMPLETED = YES
PLAN_DIRECTION = PASS
IMPLEMENTATION_READY = YES
COMMIT_PUSH = FORBIDDEN
```

# PUTDUK Opportunity Reprice / Freshness Lifecycle

Founder 판정 흡수본. 구현 SSOT = 이 파일. 레거시 `00`~`06` 자동실행 0.

## 범위

- listing persist 성공 → 기존 Opportunity canonical reprice
- opportunity.stale_at writer 전부 AS-OF (`=== priced_at`)
- listing.stale_at = EXPIRY/CACHE_HINT 300s **유지**
- seed **신규** INSERT semantic bugfix (`staleAt = pricedAt`)
- 새 INSERT/promotion/formula/UI/commit/push **없음**

## 하지 않는 것

- 새 profit/FX/Money/Ledger formula
- listing-leg 확장 · Yahoo/parser
- seed를 freshness worker로 변경 · 기존 row overwrite · skip 제거
- `DEFAULT_PRICE_STALE_MAX_SEC` 변경
- Home / `/profits` visual
- 원격 DB write proof · Next+Nest 동시 기동

## Canonical owner

`OpportunityRepriceService` (Admin HTTP가 아닌 orchestration).

```
current listings resolve
→ computeOpportunityPricing
→ existing FX/pricing persist rules
→ priced_at = stale_at = as-of
```

Trigger: `persistIngestListings` 배치 완료 후 unique assetIds → `repriceFromCurrentListings`.

- 기존 opp 없음 → no-op
- `useAdminOverride === true` → skip
- market당 listing 0건 또는 2건+ → fail-closed, stale 유지
- reprice 실패 → listing은 유지, fake success 0
