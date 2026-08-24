# PUTDUK Admin World-Class Control Plane

Status: IMPLEMENTATION_IN_PROGRESS

## Scope

This branch improves the PUTDUK admin operating center without changing consumer Home, Identity evaluation, Engine money semantics, ledger posting rules, or database schema.

### Implemented
- Spark Dash navy/pink admin visual system with responsive operator tables.
- Real user directory backed by existing `public.users` and related read models.
- Live admin audit event UI using the existing immutable audit API.
- Read-only withdrawal operations visibility using existing `withdraw_intents` state.
- Action-first dashboard counts for risk, KYC, withdrawals, deposit disputes and users.
- Actionable adapter health instead of raw `unknown` labels.
- Presentation-only decimal/status/date formatting; source decimal strings and ledger precision stay unchanged.
- Server-verified admin connection probe before the UI claims an administrator is connected.

## Safety boundaries

- Supabase migration changes: 0
- Production DB mutation: 0
- Ledger balance UPDATE logic changes: 0
- New withdrawal approval/state mutation: 0
- Home implementation changes: 0
- Consumer app implementation changes: 0
- Identity V1 evaluation changes: 0
- Existing AdminGuard deny-by-default behavior: preserved
- Existing server-side RBAC authority: preserved

The withdrawal review endpoint is intentionally read-only. No admin transition was invented for `withdraw_intents` because no existing Money-owned approval contract was found.

## Verification requirement

This implementation is not release-certified until repository CI/gates and browser QA pass on the branch/PR. No claim of zero defects is made before those checks complete.
