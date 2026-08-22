# REL-403 — version / release tagging

STATUS: PASS
DATE: 2026-08-22
OWNER: `governance/release-master/VERSIONING.md`
RUNTIME_QA: NOT_RUN

## Implemented

- calver + git SHA rule
- `readReleaseId()` on web/admin
- `data-release-id` on both layouts
- REL-602 rollback pointer

## Verify

- `pnpm verify:rel-403-versioning`
