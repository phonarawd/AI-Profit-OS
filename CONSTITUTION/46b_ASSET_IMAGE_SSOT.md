# §46b — Asset Image SSOT

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** Engine §0.0.6

## Owns

| 주제 | 잠금 |
|------|------|
| 필드 | Opportunity `assetImageUrl` · Asset Master `imageUrl` |
| 공개 가드 | `status=available` 자동공개 = `compareReady` **AND** `assetImageUrl` non-empty |
| SKU 1:1 | `assetId` ↔ `assetImageUrl` 불변 · 타 레퍼런스/타 카테고리 사진 **금지** |
| 카테고리 | `watch` · `trading_card` · **`luxury_bag`** |
| 허용 이미지 경로 | Brand Kit assets · runtime R2/adapter URL only · 사진 목업 경로 **0** |

## Pointer

| 교차 | SSOT |
|------|------|
| Engine §0.0.6 | Engine `ai_profit_os_02_engine_b2c3d4e5.plan.md` §0.0.6 |
| 진행 UI 썸네일 | UI §48.3a · Canon `execution-running`/`success` `productThumb` |
| 스텝 active 카피 | `시세 불러오는 중...` |
| Admin 업로드 | `/admin/opportunities` · `/admin/assets` |
| schemas | `asset-master.v1` · `opportunity-card.v1` |
| Mockup governance | ADR-013 · → `28` / Brand Kit |
| CI | `verify:asset-image-surface` · `verify:execution-surfaces` |

## Forbidden

- `docs/mockups/**` · `assets/ai-profit-os-*.png` · `*mockup*.png` 재추가·참조
- available 기회에 빈 `assetImageUrl`
- 구현 hydrate 코드를 본 파일에 복제
