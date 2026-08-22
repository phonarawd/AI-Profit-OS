# REL-401 — security headers

STATUS: PASS
DATE: 2026-08-22
OWNER: `tooling/security/security-headers.cjs`
PROTECTED_SCOPE_MUTATION: true
RUNTIME_QA: NOT_RUN

## Implemented

- Nest `main.ts` applies shared middleware
- admin `next.config.ts` `headers()`
- consumer `apps/web/next.config.ts` left untouched (Home freeze)
- CSP uses real hosts only. wildcard/scheme-source 0

## Verify

- `pnpm verify:rel-401-security-headers`

## PSM

- `services/api-nest/src/main.ts`
- `services/api-nest/src/common/security-headers.ts`
- reason: REL-401 CURRENT_SCOPE requires api-nest header apply
