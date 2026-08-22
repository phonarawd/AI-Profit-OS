# REL-221 — /admin/growth/content

STATUS: PASS
DATE: 2026-08-22
OWNER: existing tax-disclaimer lock · no content-performance owner

## Implemented

- legacy route redirects to `/admin/growth?tab=content`
- tax disclaimer remains locked (`admin-override=false`)
- impressions/engagement/conversions = truthful unavailable
- POST advertising / CAPI / orchestrator not activated

## Verify

- `pnpm verify:rel-221-admin-growth-content`
- EXIT_GATE: user JWT 200 = 0

## Negative

- FAKE_CONTENT_TRUTH = 0
- POST_REQUIREMENT_PULLED_FORWARD = 0
- USER_JWT_ADMIN_200 = 0
- RUNTIME_QA = NOT_RUN
