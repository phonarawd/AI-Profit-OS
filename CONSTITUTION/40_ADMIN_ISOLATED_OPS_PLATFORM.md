# §40 — Admin Isolated Ops Platform

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| Ops 분리 배포 | `ops.{ROOT_DOMAIN}` only · betting-grade isolation |
| User app 격리 | `apps/web` admin route **0** · 유저앱에 ops URL 노출 **0** |
| Auth 경계 | Admin JWT ≠ User JWT · MFA · IP allowlist · RBAC matrix |
| SEO | ops robots/noindex |
| IA | Admin 톱레벨 **12** (+2b execution-policy) · sidebar 13번째 **금지** |

## Pointer

| 교차 | SSOT |
|------|------|
| Admin §40 본문 | Admin `ai_profit_os_04_admin_e5f6a7b8.plan.md` §40 · §9.9~9.10 |
| Route IA 전수 | Admin §9.1.1 · BOOTSTRAP §6 |
| Infra hosts / CF Pages ops | Infra §15 · `infra/ops/` |
| schema | `admin-rbac.v1` |
| CI | `verify:no-admin-in-web` |
| Auth SoT | Nest JWT only · Supabase Auth **금지** (ADR-006) |

## Forbidden

- 유저앱·어드민 단일 번들 혼용
- 화면 IT 용어 (NATS/DLQ/Temporal…)
- 구현 인프라 코드를 본 파일에 복제
