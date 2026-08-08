# §51.5 — Referral · Viral Ladder (51r)

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** Money §51.5 (+ §51.5b Notice≠Campaign pointer)  
> **파일명:** `51_REFERRAL_VIRAL_LADDER.md` (= Index `51r`)

## Owns

| 주제 | 잠금 |
|------|------|
| 초대 횟수 | **∞** — 유저당 인원/월간 초대 캡 **코드경로 0** · `capPerReferrerMonth` **FORBIDDEN** |
| 실보상 | **L2/L3만** · L1 초대자 현금/practice **0** · 다단계(손자 %) **0** |
| L1 | 가입+code 바인딩 · 피초대 welcome **practice** (§51.7) · 티어 가산 **❌** |
| L2 | 피초대 **첫 적격 입금** → Promo→초대자 **profit** (hold→release\|clawback\|queued_pool) |
| L3 | 피초대 첫 **MATCH_SUCCESS** → 추가 Promo→profit (소액) + 티어 |
| 적격 입금 | USDT 19conf **또는** KRW Admin 승인 · ≥ `minRefereeDepositUsdt` · 최초 1회 |
| Pool | Promo Pool ≠ principal · **확정 플랫폼 마진으로만** top-up · FIFO · 부족=`queued_pool` |
| 0원 런칭 | `rewardsEnabled=false`여도 초대·바인딩·설명 UI **ON** |
| 공유 한도 | `sharePerUserPerDay` = **스팸 API만** (유효초대 캡 ≠) |
| Ledger | L2/L3 = Debit Promo / Credit User **profit** · practice→profit · principal 적립 **0** |
| Notice≠Campaign | notice 보상문구 **0** · campaign=예산 프로모 · ADR-012 |
| 어뷰징 | R1~R14 · RE1~RE7 (Money §51.5.2) |
| IA | `/me/invite` · `/r/{code}` · Admin `growth?tab=referral` (sidebar 12 유지) |

### Day-1 파라미터 (요약 · Admin 편집)

| 파라미터 | Day-1 |
|----------|-------|
| `rewardsEnabled` | **false** |
| `minRefereeDepositUsdt` | **20** |
| `l2ReferrerPct` | **0.05** |
| `l2ReferrerHardCapUsdt` | **3** |
| `l3ReferrerHardCapUsdt` | **1** |
| `clawbackHoursL2` | **72** |
| `sharePerUserPerDay` | **30** |

## Pointer

| 교차 | SSOT |
|------|------|
| Money §51.5 본문 · schema · R/RE 표 | Money `ai_profit_os_01_money_c3d4e5f6.plan.md` §51.5 |
| 유저 설명·toneBand 카피 | UI §5.9.1a · Canon `invite-home` |
| Notice/Campaign | Money §51.5b · UI `/me/events` · Admin notices/campaigns |
| Practice | → `51` §51.7 · → `49` |
| MATCH_SUCCESS 트리거 | → `48` · Engine §48.13 |
| 완성도 교차 | → `51` |
| schemas (todo) | `referral-program.v1` · `referral-edge.v1` · `referral-season.v1` · `notice.v1` · `campaign.v1` |
| CI | `verify:referral-ledger` · `verify:referral-ladder` · `verify:referral-idempotency` · `verify:referral-unlimited-invites` · `verify:referral-pool-fifo` · `verify:share-copy` · `verify:notice-no-reward-copy` · `verify:campaign-claim-idempotent` · `verify:notice-campaign-split` · `verify:invite-explain-surfaces` |

## Forbidden

- 초대 횟수/월간 인원 캡으로 분개 스킵
- L1 초대자 현금 · practice→profit · Promo→principal
- notice에 reward · Pool을 principal/practice와 혼용
- Pool=0을 “초대 실패”로 표시 (카피=`보너스 준비 중` · edge 유지)
- 구현 SQL/스키마 JSON을 본 파일에 복제
