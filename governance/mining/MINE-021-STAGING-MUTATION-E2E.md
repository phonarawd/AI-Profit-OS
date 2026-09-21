# MINE-021 — ISOLATED STAGING MUTATION E2E REBUILD

Status: **READY IN CODE + CANONICAL BUILD VERIFIED / EXECUTION BLOCKED BY ISOLATED STAGING**  
Base product SHA: `72bb62e59f9d472229a7160f8ac5565175d939da`  
Canonical verified PHASE21 implementation SHA: `b25572f9c7259993263292265776e999911cf915`  
Branch: `phase/mine-staging-e2e-rebuild-20260922`  
Safety: **Production untouched. No Production mutation is permitted by this runner.**

## 1. Why PHASE21 exists

The historical branch `phase/phase06-e2e-runner-20260921` at `3b17a54c56d67f35047db37a0624b171eb485d39` is not a usable current mutation E2E authority. Its `quality/mining/phase06_staging_e2e.mjs` is a later verifier stub that only serves `PHASE07_GATE_VERIFIER`.

Git history recovered the earlier real mutation runner at commit `9a81ce120d2a3a571012ae0af6c8895f79396352`. That runner proved the intended maker/checker admin lifecycle, but it predates the current integrated mining/high-value/trial backend.

PHASE21 therefore rebuilds E2E from the canonically verified backend product line instead of merging the historical residue branch.

## 2. Recovered historical coverage

The original PHASE06 mutation runner established these useful invariants:

- real `JWT_ADMIN_SECRET` signed admin tokens
- distinct maker/checker admin IDs
- mine create
- rate draft
- approval request
- maker self-approval rejected
- checker approval
- immediate rate schedule/activation
- mine publish
- readback
- mine end cleanup

PHASE21 preserves those checks and extends them to current release scope.

## 3. PHASE21 coverage

`quality/mining/phase21_staging_e2e.mjs` supports two modes.

### Preflight mode — default

Preflight is read-only. It:

- rejects the Production API host
- rejects Production Supabase ref `gaugwamwceqdnqdqrxqg` if observed locally
- probes `GET /api/v1/mines`
- reports only environment-variable presence, never secret values
- prints `mutationExecuted: false`

### Mutation mode — explicit only

Mutation mode cannot use the default API URL. Before any mutation it requires all of the following:

- `PHASE21_E2E_MODE=mutation`
- `PHASE21_ALLOW_MUTATION_E2E=YES`
- `PHASE21_ALLOW_TRIAL_RESIDUE=YES`
- explicit `PHASE21_API_BASE_URL`
- exact `PHASE21_EXPECTED_API_HOST`
- exact 40-character `PHASE21_EXPECTED_BACKEND_SHA`
- exact non-Production `PHASE21_EXPECTED_STAGING_SUPABASE_REF`
- internal mining token
- real admin JWT secret
- distinct maker/checker admin UUIDs
- real user JWT secret
- dedicated staging user UUID

The runner then calls authenticated `GET /api/v1/internal/mining/staging-identity`. Mutation is refused unless the remote API itself attests both:

1. its configured `SUPABASE_PROJECT_REF` equals the expected staging ref and is not Production; and
2. its deployed Render/git commit equals the exact expected backend SHA.

This closes the safety hole where a URL named “staging” could accidentally point at Production data or an old backend build.

## 4. Mutation scenarios

After all safety gates pass, the runner exercises:

1. admin principal test funding via double-entry `balance-adjust`
2. maker/checker mine and rate lifecycle
3. ordinary user start + idempotent replay
4. increase + replay
5. decrease + replay
6. end + replay
7. high-value start remains `START_PENDING`
8. high-value approval + replay activates the position
9. approved high-value position can be ended
10. second high-value request is rejected + replay
11. rejection is checked to move neither principal nor locked balance
12. trial-config GET/PATCH + replay with no semantic config change
13. fresh trial status
14. trial start + replay
15. exact 24-hour trial window assertion
16. mine cleanup
17. admin-funded principal cleanup and return to pre-run baseline

A trial session cannot be force-ended by the release API. Therefore mutation execution additionally requires `PHASE21_ALLOW_TRIAL_RESIDUE=YES`; the dedicated staging user's trial session is intentionally allowed to expire naturally after 24 hours. This residue is acceptable only on isolated non-Production staging.

## 5. Preflight evidence — 2026-09-22

Historical Render E2E service:

- service: `putduk-phase06-e2e-runner`
- service id: `srv-dao2phg473hc73b7les0`
- preflight deploy: `dep-daolmio473hc73ct49p0`

The historical branch was temporarily pointed at preflight commit `0edd260416c5c16007de877ecde8bd9c9ceea977` solely for a read-only probe.

Observed:

- API default target: `https://putduk-mine-api-staging.onrender.com`
- `JWT_ADMIN_SECRET`: absent
- maker admin fixture: absent
- checker admin fixture: absent
- `JWT_USER_SECRET`: absent
- user fixture: absent
- expected staging Supabase ref: absent
- local Supabase/database identity variables: absent
- `GET /api/v1/mines`: HTTP `502`
- no mutation executed

The historical branch was immediately restored to exact SHA:

`3b17a54c56d67f35047db37a0624b171eb485d39`

Recovery deploy:

`dep-daolmu00cd8s73e996jg`

Recovery status: **live**.

## 6. Supabase inventory evidence

Current connected Supabase inventory still contains only:

- project: `PUTDUK-DATA-PRODUCTION`
- ref: `gaugwamwceqdnqdqrxqg`
- region: `ap-northeast-2`
- status: `ACTIVE_HEALTHY`

No isolated non-Production project or development branch is currently visible. Historical staging ref `mgsytcetsiecllmhcyox` is not available in the current inventory.

### BLOCKER-STAGING-DB-01 — OPEN

A real mutation run is forbidden until a separate non-Production Supabase target exists and its exact ref can be pinned into both the staging API and PHASE21 runner.

Provisioning a Supabase branch/project may incur cost and remains explicit-approval gated.

### BLOCKER-STAGING-E2E-01 — READY IN CODE / EXECUTION BLOCKED

The current mutation runner and safety contract are implemented and canonically build-verified, but execution remains blocked because:

- the historical staging API currently returns 502;
- the historical E2E service has no required JWT/fixture secrets; and
- there is no isolated Supabase target to attest.

## 7. Canonical verification evidence

Canonical PHASE21 implementation SHA:

`b25572f9c7259993263292265776e999911cf915`

Static/syntax verification used Render service `putduk-mine-phase04-contract-verify` and deploy `dep-daolqup42hec738pmcag`.

Observed before the wrapper environment moved onto an incompatible Node runtime for dependency install:

- `PHASE21_VERIFY_HEAD=b25572f9c7259993263292265776e999911cf915`
- `PHASE21_RUNNER_SYNTAX_PASS`
- `PHASE21_STAGING_E2E_ASSERTIONS_PASS`
- `PHASE21_ASSERTIONS_PASS`

The wrapper-only install step then saw Node `24.21.0`, while the repository requires Node `>=22.14.0 <23`. This was a verifier-wrapper environment issue, not a target source failure.

A second direct canonical build was therefore run on Render service `putduk-mine-phase04-integrated-verify` using deploy `dep-daolrt142hec738pps4g`. That service checked out the exact target SHA directly under Node `22.14.0`.

Observed PASS evidence:

- `VERIFY_HEAD=b25572f9c7259993263292265776e999911cf915`
- Rust tests: `19 passed; 0 failed`
- `cargo check` PASS
- release `mining_profit_cli` build PASS
- `[verify:api-nest-build] PASS (services/api-nest tsc build clean)`
- `PHASE04_VERIFY_OK`
- Render deploy status: `live`

The historical verifier branch was restored immediately to:

`a79826aaeb7f97b70fae881f1d423ce0f70a49fe`

The contract verifier recovery build also passed from that historical SHA. The integrated verifier recovery deploy is `dep-daols96ol0ds7381fr70`.

No mutation runner was executed during canonical verification.

## 8. Static gate

Run:

```bash
node quality/mining/phase21_staging_e2e_assertions.mjs
```

The gate requires:

- default preflight/no-mutation behavior
- Production API and Supabase denylist
- explicit mutation/trial-residue YES gates
- explicit API host, backend SHA, and Supabase ref pins
- authenticated remote commit + database identity attestation
- real admin/user JWT issuer/audience vocabulary
- maker/checker separation
- principal funding setup + cleanup
- ordinary start/increase/decrease/end idempotency
- high-value approve/reject behavior
- no-money-movement rejection assertion
- trial config/start/replay/24-hour window
- cleanup fail-closed markers

## 9. Next safe order

1. Keep the runner in preflight mode until isolated staging exists.
2. With explicit cost approval, provision or recover an isolated Supabase target.
3. Apply/rehearse the historical ledger + mining migration chain only on that isolated target.
4. Deploy the exact PHASE21 E2E branch to the staging API with `SUPABASE_PROJECT_REF` and `INTERNAL_MINING_TICK_TOKEN` configured.
5. Configure a dedicated staging user and maker/checker fixtures.
6. Run mutation mode once against the exact attested backend SHA/ref.
7. Use the resulting mutation evidence to close staging E2E and then address the Production baseline compatibility bridge.
8. Production migration/deployment remains separately approval-gated.

**Production untouched.**
