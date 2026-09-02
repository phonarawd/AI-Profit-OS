# REL-016 OBSERVABILITY EVIDENCE

```text
REL = REL-016
TITLE = observability 도입 (error tracking, 구조화 로그, alerting)
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = TRUE
PRODUCTION_TOKEN_HELD = 0
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
VERCEL = 0
STAGING_SAMPLE = REL-600
HOME_VISUAL_REOPEN = 0
PII_RAW = 0
```

## IMPLEMENTATION

합의 로그 포맷: `ts`, `level`, `event`, `service`, `method`, `path`, `status`, `requestId`, `message`, `fields`.

- sink: `governance/observability/error-sink.v1.json` — `cloudflare-workers-console`. `vercel=0`. 프로덕션 토큰 레포 0.
- mask: `governance/observability/mask-keys.v1.json` — amount/balance/KYC/password/email → `[REDACTED]`.
- alerts: `http_5xx`, `ledger_write_fail`(POST /ledger 5xx), `auth_spike`(401 × 20 / 60s).
- api-nest: 전역 `ObsExceptionFilter` → `emitObs` JSON stdout. 요청 바디/머니 필드 미포함.
- apps/web: `ObsRuntime` window error / unhandledrejection → `console.error(JSON)`. `return null`. Home geometry 0.
- staging 1건 가시성 = REL-600 재확인. 이번 REL에서 staging 이벤트 증명 0.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/observability.cjs` | PASS |
| `CI=true node tooling/verify/gate-fast.cjs` | PASS (11 steps: T0 always + no-it-jargon · mockup-governance · canon-surfaces · web-lint · pwa-native-shell · observability · admin-boundary) |

## ACCEPTANCE

관측 경로가 코드에 존재. REL-703이 CF console sink + mask + alert 규칙을 재사용.

## EXIT_GATE

관측 없이 REL-700 준비 완료 주장 금지. 본 REL은 경로만 연다.
