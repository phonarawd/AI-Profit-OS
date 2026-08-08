# §42 — KYC Withdraw One-Time Gate

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| KYC 목적 | **출금 1회 게이트** only · 가입 필수 KYC 아님 |
| Surfaces | `/me/kyc` · Canon `kyc-*` · Lux 3면 |
| Toast / redirect | 미완료 출금 시 KYC로 자동 이동 |
| 서류 | R2 only · RRN 타이핑 **금지** · 성별 필드 **금지** |
| Admin | `/admin/compliance` KYC 큐 |

## Pointer

| 교차 | SSOT |
|------|------|
| Money §42 본문 | Money `ai_profit_os_01_money_c3d4e5f6.plan.md` §42 |
| Canon wires | UI · `packages/ui/canon` `kyc-*` |
| Copy | `packages/ui/copy/ko/kyc.ts` · → `25` |
| schema | `kyc-status.v1` |
| Abuse A1 | → `20` |
| CI | `verify:kyc-withdraw-only` · `verify:kyc-redirect` · `verify:kyc-r2-only` · `verify:kyc-surfaces` |

## Forbidden

- 주민등록번호 타이핑 수집
- 성별 UI 분기
- 구현 업로드 코드를 본 파일에 복제
