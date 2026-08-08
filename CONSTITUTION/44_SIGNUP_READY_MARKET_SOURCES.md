# §44 — Signup-Ready Market Sources

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| Day-1 adapters | `ebay`(멀티 marketplaceId) · `pokemontcg` · `ygoprodeck` · `coingecko` · `frankfurter` |
| Listing legs | 자동=`ebay` US×GB(또는 DE/AU) · 반자동=`ebay`×`admin` |
| `yahoo_jp` | **영구 FORBIDDEN** · Phase1+ 철회 · AppID·워커·stub·카피 **0** |
| 금지 소스 | KR 중고앱 · Chrono24 · 스크래핑 · yahoo 재도입 제안 |
| Active 기준 | 공식/문서화 HTTP API 또는 공개 bulk JSON (Engine §0.0) |

## Pointer

| 교차 | SSOT |
|------|------|
| Engine §0.0~§0.0.3 | Engine `ai_profit_os_02_engine_b2c3d4e5.plan.md` §0.0 |
| 마진/자본대/이미지 | → `45` · `46` · `46b` |
| Admin adapters KPI | Admin `/admin/adapters` |
| ADR-003 Workers 명칭 | Index ADR-003 |
| CI | `verify:listing-legs-day1` |

## Forbidden

- `rolex-adapter` / `yahoo-jp-adapter` 등 명칭 drift
- 유저 카피에 「야후」·Yahoo 문자열
- 구현 adapter 코드를 본 파일에 복제
