# §27 — Marketing And SEO Engine

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| Ad Funnel · UTM · consent | attribution cookie · consent 전 CAPI **금지** |
| CAPI dispatcher | Meta/TikTok/Google server events · Worker path |
| SEO / JSON-LD | Consumer brand=**퍼뜩** · fake aggregateRating **금지** · FinancialProduct 허위 스키마 **금지** |
| Landing | `/l/*` canonical · `/ads` alias · 3초 예산 · bait-and-switch **금지** |
| IndexNow | 크롤 알림 only · 상위노출 보장 주장 **금지** |

## Pointer

| 교차 | SSOT |
|------|------|
| Marketing/SEO 본문 | Infra `ai_profit_os_06_infra_a7b8c9d0.plan.md` (CAPI·landing §31) · Index marketing rows |
| packages/workers | `packages/sdk/marketing/` · `workers/marketing-capi-dispatcher/` · `schemas/user-attribution.v1` |
| Growth G1~G4 presentation | → `35` (Admin switches) |
| 한글·컴플라이언스 카피 | → `25` |
| Brand | ADR-002 · `packages/ui/brand` |
| CI | `verify:seo-schema` · landing/CAPI gates (catalog) |

## Forbidden

- Consent-less CAPI
- 매체 심사 회피·미끼 랜딩
- 구현 워커/SDK 코드를 본 파일에 복제
