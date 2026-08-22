# REL-408 — Security/secrets/RLS-role + rollback baseline

STATUS: PASS
DATE: 2026-08-22
PRODUCTION_DB_WRITE = 0
MIGRATION_APPLIED = 0

## Implemented

- RLS/role 읽기 실측
- secrets scan 재실행 대상 고정
- rollback runbook 초안
- control-plane migration 파일만 생성

## Verify

- `pnpm verify:rel-408-security-baseline`

## Negative

- apply_migration = 0
- PRODUCTION_DB_WRITE = 0
- fixture committedUnapplied includes 20260822140000
