# REL-408 SECURITY BASELINE

```text
REL = REL-408
TITLE = Security/secrets/RLS-role 실증 + backup/rollback runbook baseline
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
PRODUCTION_DB_APPLY = 0
APPLY_MIGRATION = 0
HOME_GEOMETRY_DIFF = 0
MEASURED_AT = 2026-08-23
HISTORICAL_SNAPSHOT_ONLY = 1
CURRENT_RELEASE_AUTHORITY = governance/recovery/founder-action-packet.current.v2.json
CURRENT_REUSE_AS_PRODUCTION_SECURITY_PROOF = FORBIDDEN
PROJECT_REF = mgsytcetsiecllmhcyox
```

읽기 실측만. 이 REL에서 `apply_migration` / production DDL = 0.

> 이 표의 80/80 값은 **2026-08-23 역사적 측정치**다. 현재 Production table/RLS truth로 재사용하지 않는다.
실제 apply = REL-701-DB. 롤백 연습 = REL-602.

## 1. RLS / role (원격 읽기)

| 항목 | 실측 |
|---|---|
| public 테이블 | 80 |
| RLS ON | 80 |
| RLS OFF | 0 |
| `anon` / `authenticated` / `PUBLIC` table GRANT | 0 |
| `anon` login | 0 |
| `authenticated` login | 0 |
| `anon` / `authenticated` bypassrls | 0 |
| `service_role` bypassrls | 1 (Nest SoT · 클라 금지) |
| `service_role` login | 0 |
| deny-all policy (`USING false`) | `user_membership_audit` · `user_match_policy_override_audit` |

파일만 있고 원격 미적용인 migration(`admin_audit_events`, `admin_kill_switches`, `opportunity_price_overrides` 등)은 REL-701-DB 입력이다. 이 슬라이스에서 올리지 않는다.

## 2. Secrets

`pnpm verify:secrets` PASS (2026-08-23 재실행).
`.env` / pem / service_role / JWT secret 커밋 0.

## 3. Backup / rollback

런북 초안 = `governance/release-master/ROLLBACK_RUNBOOK.md`.
known-good id = REL-403 `VERSIONING.md`. 연습 실행 = REL-602.

## EXIT_GATE

이 REL에서 apply_migration 하면 FAIL.
