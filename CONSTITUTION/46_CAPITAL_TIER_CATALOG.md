# §46 — Capital Tier Catalog

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** Engine §0.0.5 (+ §0.0.5.1 balance-aware feed pointer)

## Owns

| 주제 | 잠금 |
|------|------|
| `capitalBand` enum | `micro` · `small` · `mid` · `high` · `whale` |
| 시드·필터·카탈로그 비율 | 소액~웨일 공존 · whale≥100k 경로 |
| 유저 필터 | 자본대 칩 + `전체|시계|카드|가방` |
| 잔액 인식 피드 계약 | affordable / nearMiss / suggestDeposit (Engine §0.0.5.1) |

## Pointer

| 교차 | SSOT |
|------|------|
| Engine §0.0.5 · §0.0.5.1 | Engine `ai_profit_os_02_engine_b2c3d4e5.plan.md` |
| 홈 섹션·카피 | UI §5.3a · `T.feed.*` |
| principal · 입금 딥링크 | Money §49.2a · → `49_PRINCIPAL_RETENTION_AND_PROFIT_WITHDRAW.md` |
| 유저별 override | Admin §9.8.9 |
| Membership×band overlay | Engine §0.0.7 |
| CI | `verify:balance-aware-feed` |

## Forbidden

- capitalBand를 새 탐색 IA/탭으로 승격
- 저액 강제 캡으로 whale 경로 삭제
- 구현 시드 JSON을 본 파일에 복제
