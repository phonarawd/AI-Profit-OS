# REL-008 SETTLEMENT RULE GOLDEN PARITY EVIDENCE

```text
REL = REL-008
TITLE = settlement_rule.rs/.cjs golden vector parity를 T0/T1에 편입
STATUS = COMPLETED
PLAN_LOCKED = TRUE
MASTER_STATUS_UPDATED = TRUE
LAST_COMPLETED_TODO = REL-008
FIRST_EXECUTION_TODO = REL-009
PROTECTED_SCOPE_MUTATION = TRUE
REL_502_SUBSTITUTE = 0
```

## Changed paths

- `services/engine-rust/src/settlement_rule.rs` — `golden_vector_parity` test only (formula 0)
- `tooling/verify/settlement-rule-parity.cjs` — rust==cjs compare
- `tooling/verify/gate-tiers.cjs` — T1 always
- `tooling/verify/domain-by-path.cjs` — T0 path-trigger
- `tooling/verify/CATALOG.md`
- `package.json` (`verify:settlement-rule-parity`)

Intentionally untouched: settlement formulas, Home, Money/FX owners, production DB, engine-acceptance baselines.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/settlement-rule-parity.cjs` | PASS (9 vectors · rust==cjs) |
| `CI=true pnpm verify:gate:fast` | PASS (8 steps) |
| Local `pnpm verify:gate:push` | sweeper-trx-guard FAIL on Windows CRLF 800-char window (`BLOCKED_LOCAL_*`). Same sources PASS after LF-only local rewrite (not committed). Ubuntu CI PASS. |
| GitHub `gate.yml` / `verify:gate` + cargo test + OpenNext | SUCCESS `32393666967` |

## ACCEPTANCE

동일 golden vector에서 rust/js 결과 일치. REL-502 대체 주장 0.

## Git

```text
REMOTE_MAIN_BEFORE = a1e327d7412ef6e30fa811e549796da69e8b3ff4
BRANCH = rel/REL-008-settlement-rule-parity
HEAD_SHA = 72a414cfafd03e64e02d71cc59f02a805b94e16e
PR = https://github.com/phonarawd/AI-Profit-OS/pull/7
CI_RUN = https://github.com/phonarawd/AI-Profit-OS/actions/runs/32393666967
MERGE_METHOD = merge
MERGE_COMMIT = 32b5cfb320efac794f0a4f8126f40ed820be39b3
REMOTE_MAIN_AFTER = 32b5cfb320efac794f0a4f8126f40ed820be39b3
ADMIN_BYPASS_USED = 0
FORCE_PUSH_USAGE = 0
GIT_ADD_A_USAGE = 0
SECRET_CONTENT_READ_COUNT = 0
SECRET_RISK_STAGED = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
CARGO_BUILD_RELEASE = 0
```

## EXIT_GATE

Parity FAIL를 문서만으로 통과시키지 않음. REL-008 PASS — REL-009 착수 가능.
