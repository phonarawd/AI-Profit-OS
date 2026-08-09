# §46 — Capital Tier Catalog

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** Engine §0.0.5 (+ §0.0.5.1 balance-aware feed pointer)

## Owns

| 주제 | 잠금 |
|------|------|
| `capitalBand` enum | `micro` · `small` · `mid` · `high` · `whale` |
| 필요 자본(USDT) | micro **10~99** · small **100~999** · mid **1,000~9,999** · high **10,000~99,999** · whale **≥100,000** |
| 카탈로그 시드 비율 | micro+small **≥40%** · mid **≥25%** · high+whale **≤35%** |
| 유저 필터 칩(ko) | `전체` `시계` `카드` `가방` · `소액(10~)` `입문(100~)` `중급(1천~)` `고액(1만~)` `웨일(10만~)` · `초고가` |
| `초고가` | capitalBand ∈ {`high`,`whale`} (6번째 enum 아님) |
| 입금 퀵버튼 | 소액 `10` `50` `100` `500` · 웨일 `1만` `5만` `10만` `25만` `50만` · **두 그룹 모두 노출** |
| 온보딩 한 줄 | `시세가 다른 두 시장의 차이만큼 수익이 나요. 소액부터 시작할 수 있어요.` |
| 잔액 인식 피드 계약 | affordable / nearMiss / suggestDeposit (Engine §0.0.5.1) |
| 코드 SSOT | `@aipo/market-intelligence` `capital-band.cjs` |

## Pointer

| 교차 | SSOT |
|------|------|
| Engine §0.0.5 · §0.0.5.1 | Engine `ai_profit_os_02_engine_b2c3d4e5.plan.md` |
| 홈 섹션·카피·칩 레이아웃 | UI §5.3a · §5.3b · `T.feed.*` |
| principal · 입금 딥링크 | Money §49.2a · → `49_PRINCIPAL_RETENTION_AND_PROFIT_WITHDRAW.md` |
| Admin 밴드필터 | `/admin/opportunities?capitalBand=` |
| 유저별 override | Admin §9.8.9 |
| Membership×band overlay | Engine §0.0.7 |
| CI | `verify:capital-tier-catalog` · `verify:balance-aware-feed` |

## Forbidden

- capitalBand를 새 탐색 IA/탭으로 승격
- 저액 강제 캡으로 whale 경로 삭제
- 초고가 시계만 시드 (소액 물량 0 → 제품 결함)
- 구현 시드 JSON을 본 파일에 복제
