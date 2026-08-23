# REL-101 SIGNUP EVIDENCE

```text
REL = REL-101
TITLE = Signup (/auth/signup) 클로저
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
AUTH_RULE_REDEFINITION = FORBIDDEN
SUPABASE_AUTH = FORBIDDEN
LIVE_KAKAO_HUMAN_E2E = NOT_RUN
```

## CURRENT_SCOPE

`/auth/signup` 재확인. 전면 재구현 아님. Canon `AuthSignup` 유지.

## IMPLEMENTATION

- `SignupRuntime`이 Nest `POST /api/v1/auth/signup` (`signupStageA`)를 호출한다.
- 약관 필수. 성별/주민번호 0.
- 가입 성공 세션은 `continuePathAfterAuth`로 이어진다.
- 검증 실패는 서버 오류로 보여 주고 가짜 세션을 만들지 않는다.
- Kakao live E2E는 NOT_RUN.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/acquisition-release.cjs` | PASS |
| `node tooling/verify/auth-surfaces.cjs` | PASS |
| `packages/sdk/src/auth/auth-release.test.ts` | PASS 12/12 |
| committed spec `signup-bootstrap.spec.cjs` | 파일+axe in-process |
| `tooling/e2e/specs/auth-spark-dash.spec.cjs` | 12/12 PASS · preview runtime · screenshots `rel-101-signup/` |

## SPARK_DASH_AUTH (2026-08-24)

- Figma nodes `199:523` / `200:527` · `AuthShell` split layout desktop+mobile
- `packages/ui/copy/ko/auth-shell.ts` brand notes · emoji-free shell headlines
- Evidence: `governance/release-master/rel-101-signup/runtime-desktop-1440.png` · `runtime-mobile-390.png`

## ACCEPTANCE

가입 성공/중복/검증실패가 서버 진실. 재구현 없음.

## EXIT_GATE

미배선을 REAL로 선언하지 않음. 가짜 숫자 0.
