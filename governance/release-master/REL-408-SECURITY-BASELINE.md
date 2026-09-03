# REL-408 SECURITY BASELINE EVIDENCE

```text
REL = REL-408
TITLE = Security/secrets/RLS-role 실증 + backup/rollback runbook baseline
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
PRODUCTION_DB_APPLY = 0
APPLY_MIGRATION = 0
HOME_GEOMETRY_DIFF = 0
EVIDENCE_EPOCH = 2026-08-23
HISTORICAL_SNAPSHOT_ONLY = 1
CURRENT_RELEASE_AUTHORITY = governance/recovery/founder-action-packet.current.v2.json
CURRENT_REUSE_AS_PRODUCTION_SECURITY_PROOF = FORBIDDEN
```

## IMPLEMENTATION

- 읽기 실측만. `apply_migration` / production DDL 0
- RLS: public 80 / ON 80 / OFF 0 · anon·authenticated GRANT 0
- secrets: `pnpm verify:secrets` PASS
- runbook 초안: `ROLLBACK_RUNBOOK.md` (연습 = REL-602)
- known-good owner = REL-403 `VERSIONING.md`

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/rel-408-security-baseline.cjs` | PASS (RLS 80/80 · secrets · runbook · apply 0) |

## ACCEPTANCE

보안 baseline 문서화. prod apply 0.

이 문서는 2026-08-23 측정 epoch의 역사적 완료 기록이다. 현재 Production 보안 상태를 증명하지 않으며, 현재 release 판정은 `governance/recovery/founder-action-packet.current.v2.json` 및 최신 provider read-only evidence를 사용한다.

## EXIT_GATE

이 REL에서 apply_migration 하면 FAIL.
