# REL-402 DEPENDENCY AUDIT EVIDENCE

```text
REL = REL-402
TITLE = 의존성 취약점 스캔을 CI에 편입
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
LOCAL_FULL_SCAN = 0
PRODUCTION_DEPLOY = 0
HOME_VISUAL_REOPEN = 0
```

## IMPLEMENTATION

- 스펙: `governance/security/dependency-audit.v1.json` — `pnpm audit` · `auditLevel=high`
- 예외 원장: `governance/security/AUDIT_EXCEPTIONS.md` — `EXCEPTIONS: 0` · 숨김 ignore 0
- 러너: `tooling/security/dependency-audit.cjs` — 예외는 로그 후 `--ignore GHSA-*`
- 검증: `tooling/verify/rel-402-dependency-audit.cjs` — 로컬은 배선만. `AIPO_AUDIT=1` 이면 실스캔
- CI: `.github/workflows/gate.yml` 이 `AIPO_AUDIT=1` 로 같은 verify를 실행

로컬 8GB에서 풀 스캔을 강행하지 않는다. 2026-08-23 실측: high/critical 0.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/rel-402-dependency-audit.cjs` | PASS (wiring) |
| `AIPO_AUDIT=1 node tooling/verify/rel-402-dependency-audit.cjs` | PASS (scan · no known vulns) |

## ACCEPTANCE

취약점 스캔이 게이트에 있다. 예외는 파일에만 있고 숨기지 않는다.
