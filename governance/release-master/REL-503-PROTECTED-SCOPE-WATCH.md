# REL-503 — protected-scope STALE 감시

STATUS: IMPLEMENTED_WATCH / ACCEPTANCE_BLOCKED_ON_REL-502
DATE: 2026-08-22

## Watch

- 규칙: `governance/engine-acceptance/protected-scope.v1.json`
- 마지막 인증 스냅샷: `governance/engine-acceptance/baseline.v1.json`
- 비교: live aggregate vs baseline aggregate
- 의도적 1파일 해시 변경 → aggregate 변경 → STALE
- CI: `.github/workflows/protected-scope-stale.yml`

## Current reading

SNAPSHOT_EQUALS_LIVE after `ENGINE_ACCEPTANCE_REBASE_EVAL_REVIEW_V1`
current epoch `ea-baseline-00bc4bd82aaf-6baee484bb30`.
This equals the new legal freeze, not FINAL_ACCEPTANCE.
STALE이면 REL-502 재실행. 은폐 금지.
REL-502 QA0–QA9 current-epoch certification is still required.

## Recert procedure

1. REL-502 rebase new epoch
2. QA0-QA9 rerun
3. Update baseline snapshot only through the existing rebase tooling
4. Issue FINAL_ACCEPTANCE.md
5. Watch compares against the new snapshot
