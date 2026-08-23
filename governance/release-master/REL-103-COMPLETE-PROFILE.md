# REL-103 COMPLETE PROFILE EVIDENCE

```text
REL = REL-103
TITLE = CompleteProfile (/auth/complete-profile) 클로저
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
GENDER_FIELD = FORBIDDEN
```

## CURRENT_SCOPE

`/auth/complete-profile` Track C 재확인. 성별 분기 0. 서버 저장 필수.

## IMPLEMENTATION

- `CompleteProfileRuntime`이 Nest `PATCH /api/v1/auth/profile`을 기다린 뒤에만 `/onboarding`으로 간다.
- 세션 없으면 로그인으로 보낸다.
- 표시 이름·전화·생년월일만. 성별/주민번호 0.
- 만 19세/전화 형식 오류는 서버 메시지를 한국어로 보여 준다.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/complete-profile-closure.cjs` | PASS |
| committed spec `complete-profile-bootstrap.spec.cjs` | 파일+axe in-process |
| `tooling/e2e/specs/auth-spark-dash.spec.cjs` | 12/12 PASS · session stub · screenshots `rel-103-complete-profile/` |

## SPARK_DASH_AUTH (2026-08-24)

- Figma nodes `201:539` / `201:571` / `201:604` · Stage B embedded form
- Evidence: `governance/release-master/rel-103-complete-profile/runtime-desktop-1440.png` · `runtime-mobile-390.png`

## ACCEPTANCE

전면 재구현 없이 잔여 게이트만 닫힘. 로컬 저장만으로 완료 선언 0.

## EXIT_GATE

미배선을 REAL로 선언하지 않음.
