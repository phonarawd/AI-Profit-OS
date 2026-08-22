# REL-402 — pnpm audit in CI

STATUS: PASS
DATE: 2026-08-22
OWNER: `.github/workflows/gate.yml` + `governance/security/pnpm-audit-exceptions.json`
RUNTIME_QA: N/A

## Implemented

- gate.yml runs `pnpm verify:rel-402-pnpm-audit --full`
- local T0 checks wiring only
- exceptions file exists and does not hide undocumented advisories

## Verify

- `pnpm verify:rel-402-pnpm-audit`
