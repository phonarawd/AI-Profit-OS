# §36 — Admin Price And Profit Sync

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| Admin 가격 SSOT | opportunity pricing · `pricingVersion` |
| 유저 실시간 반영 | 홈/수익/상세 **≤500ms** (SSE/patch) |
| CountUp 트리거 | `pricingVersion` 변경 시 ProfitAmount |
| Stale guard | participate에 `pricingVersion` + `minProfitUsdt` 필수 |

## Pointer

| 교차 | SSOT |
|------|------|
| Admin §36 본문 | Admin `ai_profit_os_04_admin_e5f6a7b8.plan.md` §36 · §4.3 · §9.6 |
| Engine 마진 공식 | Engine §0.0.4 · → `45` |
| schemas | `opportunity-pricing.v1` · `opportunity-card.v1` |
| sdk/ui | `packages/sdk/opportunity-stream/` · `ProfitAmount` |
| Events | → `14` (`opportunity.price.updated`) |
| Abuse A4/A11/A12 | → `20` |

## Forbidden

- Admin 가격 변경 후 유저 UI 수동 새로고침 의존을 Day-1 정상으로 취급
- 난수 성공률 필드로 가격/마진 대체
- 구현 코드를 본 파일에 복제
