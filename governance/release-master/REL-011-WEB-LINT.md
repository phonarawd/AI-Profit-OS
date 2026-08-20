# REL-011 WEB LINT EVIDENCE

```text
REL = REL-011
TITLE = apps/web 실제 lint 구현 (no-op 교체)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
HOME_VISUAL_REOPEN = 0
FAKE_MONEY = 0
```

## Changed paths

- `apps/web/package.json` — `lint` no-op echo 제거, `eslint .` + eslint/typescript-eslint devDependencies
- `apps/web/eslint.config.mjs` — ESLint 9 flat config. 최소 차단(파서 구문 오류 + no-debugger). plans/docs 비대상
- `tooling/verify/web-lint.cjs` — no-op 잔존 금지 · 의도적 구문 오류 FAIL · T0 연결 확인
- `tooling/verify/domain-by-path.cjs` — `apps/web/**` → web-lint
- `tooling/verify/CATALOG.md`
- `package.json` — `verify:web-lint`
- `pnpm-lock.yaml`

Intentionally untouched: Home geometry, Money/Engine, vscode `eslint.enable` (false 유지 — config 없이 enable 금지), plans/docs 스타일.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/web-lint.cjs` | PASS (eslint inspects apps/web · syntax error FAIL · no-op 0) |
| `CI=true pnpm verify:gate:fast` | PASS (8 steps, includes web-lint) |

## ACCEPTANCE

lint가 실제 파일을 검사한다. no-op exit 0 제거.

## EXIT_GATE

no-op 잔존 시 FAIL — 잔존 0.
