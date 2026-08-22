# REL-217 — /admin/growth

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `SimulationAdminController` + `ReferralAdminController`

## Implemented

- hub fetches latest simulation, growth-gate, growth.enabled
- referral tab fetches program/pool/hold-queue; halt/top-up reuse existing money owners
- campaigns/ROAS = truthful unavailable (`POST-006` not pulled forward)
- notices/missions/share/partners = truthful unavailable when no list owner

## Verify

- `pnpm verify:rel-217-admin-growth`
- EXIT_GATE: user JWT 200 = 0

## Negative

- FAKE_GROWTH_TRUTH = 0
- FAKE_ROAS = 0
- POST_REQUIREMENT_PULLED_FORWARD = 0
- USER_JWT_ADMIN_200 = 0
- RUNTIME_QA = NOT_RUN
