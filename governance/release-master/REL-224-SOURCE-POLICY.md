# REL-224 SOURCE POLICY EVIDENCE

```text
REL = REL-224
TITLE = Source/Parser Health + Founder Override + Policy Versioning
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
LOCKED_LABELS = 3
OVERWRITE = 0
SERVER_ENFORCE = 1
SIDEBAR_13 = 0
FOUNDER_ROLE = super
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0
```

## IMPLEMENTATION

- 상수: `schemas/admin-policy-version.v1.json` + `admin-policy-version.core.cjs`
- Nest: `GET/POST /api/v1/admin/source-policy/*` · capability `all` 재사용
- Health = `provider_runtime_health` + 기존 derive. missing → HEALTHY 금지
- 버전 행 INSERT only. UPDATE/DELETE trigger FAIL
- Founder override = role `super` + severity HIGH + audit
- migration file-only: `20260823210000_admin_policy_versions.sql` (REL-701-DB apply)

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/rel-224-source-policy.cjs` | PASS (V1-V3 · overwrite 0 · founder HIGH) |

## ACCEPTANCE

소스 건강/정책 버전 운영 가능.

## EXIT_GATE

이력 없는 덮어쓰기면 FAIL.
