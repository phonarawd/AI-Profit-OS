# §45 — Price Compare Margin UX

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** Engine §0.0.4

## Owns

| 주제 | 잠금 |
|------|------|
| 마진 공식·필드 | buy/sell · fees · buffers · FX · `platform_reserve` · `compareReady` 가드 |
| 인지 모델 | PriceCompare = **기회 근거** · 유저 직접거래 암시 **0** |
| FX | 동일 OpportunityCard + PriceCompareMargin · FX 전용 이질 스키마 **금지** |
| ADR-008 | 하드코딩 수수료 · snapshot 없는 ≈원화 **금지** |

## Pointer

| 교차 | SSOT |
|------|------|
| Engine §0.0.4 공식 Owns | Engine `ai_profit_os_02_engine_b2c3d4e5.plan.md` §0.0.4 |
| 화면/카피/Canon | UI `PriceCompareMargin` · `packages/ui/copy/ko/margin-compare.ts` |
| Admin 가격 sync | → `36` |
| Listing sources | → `44` |
| Capital / image | → `46` · `46b` |
| CI | `verify:pricing-formula` · `verify:fx-snapshot-formula` · `verify:margin-compare-surface` |

## Forbidden

- 유저 라벨 “매입가/판매가·사세요/파세요”로 거래 유도
- 공식 이중 정의 (UI에 공식 복제)
- 구현 코드를 본 파일에 복제
