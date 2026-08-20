# REL-017 LEGACY PLAN MIGRATION REGISTRY EVIDENCE

```text
REL = REL-017
TITLE = LEGACY_PLAN_MIGRATION_REGISTRY workspace stamp
STATUS = IN_PROGRESS
PLAN_LOCKED = TRUE
CURSOR_SYNC_PLANS = NOT_RUN
HOME_MIRROR_WRITE = 0
ISOLATION_RULE_MUTATION = 0
FILE_DELETE = 0
UNMAPPED_VALID_OLD_TODO = 0
```

## IMPLEMENTATION

- 21파일 레지스트리: `governance/legacy-plan-migration/registry.v1.json`
- workspace `.cursor/plans` 만 스탬프. 파일 삭제 0.
- Track A-G + Current Master: `EXECUTION_AUTHORITY=NO` · `CONTENT_AUTHORITY=YES` · `SUPERSEDED_FOR_EXECUTION_BY=PUTDUK_RELEASE_MASTER.plan.md`
- 레거시 9 + 슬라이스 4: `CONTENT_AUTHORITY=NO` · `DO_NOT_EXECUTE=YES` · `HISTORICAL_REFERENCE_ONLY=YES`
- `pnpm cursor:sync-plans` 실행하지 않음.
- `project-isolation*.mdc` 미수정.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/legacy-plan-migration.cjs` | PASS (21 registry · tracked 9 stamped · workspace-only 12 may be absent on main) |
| `CI=true node tooling/verify/gate-fast.cjs` | PASS (5 steps: T0 always + legacy-plan-migration) |
