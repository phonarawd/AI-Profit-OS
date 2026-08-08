# §39 — User Financial Ledger

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| 유저별 금융 전수 | 총입금 · 총출금 · **순유입** · 시세차익 순수익 · 마진 · 버킷 |
| Admin surfaces | `/admin/users/:id/finance` · `/admin/reports/financial` |
| Export | CSV row count = DB · audit `admin.user.finance.exported` |
| Jump | tx_hash / user_id 검색 → finance 화면 |

## Pointer

| 교차 | SSOT |
|------|------|
| Admin §39 본문 · KPI 공식 | Admin `ai_profit_os_04_admin_e5f6a7b8.plan.md` §39 · §9.8.7 |
| Ledger truth / 분개 | → `17` · Money §11 |
| Buckets | Money §49 · → `49_PRINCIPAL_RETENTION_AND_PROFIT_WITHDRAW.md` |
| schema | `user-financial-summary.v1` (`netInflowUsdt`) |
| 추천·유입·CS 표시 | Money §51.5 · Infra §31 · §51.6 (pointer) |
| CI | `verify:admin-user-360` |

## Forbidden

- KPI를 UI 추정값으로 대체 (ledger 집계만)
- 구현 SQL/컴포넌트를 본 파일에 복제
