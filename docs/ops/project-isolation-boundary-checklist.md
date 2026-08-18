# Project Isolation Boundary — Ops Checklist

Wave: PROJECT_ISOLATION_MIRROR

## Status

| Item | Expect |
|------|--------|
| Policy | .cursor/hooks/lib/project-boundary-policy.mjs |
| Hook | .cursor/hooks/project-boundary.mjs (empty/non-JSON allow, exit 0) |
| hooks.json | preToolUse / beforeShell / beforeMCP / beforeRead / beforeTabRead + failClosed |
| Rule | .cursor/rules/project-isolation-boundary.mdc |
| Verify | pnpm verify:project-boundary (fixture only) |

## SAFE vs PARTIAL

- SAFE: verify ALL PASS + global plans DENY + foreign FS/GitHub/Supabase DENY + hooks wiring
- PARTIAL: any FAIL or residual WARN unmitigated

## Residual WARNs

1. Account-wide PAT / gh auth may still reach foreign repos outside this agent.
2. Account-wide Supabase CLI login remains; account-wide list and foreign project-ref are DENY.
3. Desktop multi-root adding a foreign folder is an IDE residual risk.
4. Global Cursor plans mirror: Plan SSOT is repo .cursor/plans only.

## Verify

    pnpm verify:project-boundary

## Lock recovery

1. Backup hooks.json then temporarily clear hooks
2. Fix policy/hook
3. Restore hooks.json with failClosed true
4. Re-run verify:project-boundary

## UI

NO UI/product work in this wave.
