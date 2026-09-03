# REL-102 LOGIN + KAKAO EVIDENCE

```text
REL = REL-102
TITLE = Login (/auth/login) 클로저 + Kakao 잔여 판정
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
LIVE_KAKAO_HUMAN_E2E = NOT_RUN
CODE_EQUALS_PROVIDER_SUBJECT = FORBIDDEN
```

## CURRENT_SCOPE

`/auth/login` 일반 로그인 클로저. Kakao backend start 경로 재확인. Founder Kakao 계정 E2E 없음 → NOT_RUN. REL-701-PRE 재평가.

## IMPLEMENTATION

- `LoginRuntime`이 기존 Nest 세션을 이어 받고, 이메일 링크는 `POST /api/v1/auth/magic-link/request`를 호출한다.
- 비밀번호 로그인은 서버 계약에 없다. 위조하지 않음.
- Kakao 시작은 `POST /api/v1/auth/oauth/kakao/start` + `/auth/oauth/kakao`.
- 브라우저 callback은 `apps/web/app/auth/oauth/[provider]/callback`에서 `code+state`를 읽고, SDK `finishOauth`가 `POST /api/v1/auth/oauth/:provider/callback`으로 서버 검증을 완료한다. 별도 Nest GET callback은 사용하지 않는다.
- 신규 가입의 약관/개인정보/마케팅/추천코드는 provider 이동 전에 `sessionStorage["aipo.oauth.terms"]`에 저장되고 callback에서 회수된다.
- staging web build와 immutable release build는 `NEXT_PUBLIC_OAUTH_KAKAO_ENABLED=1`을 명시한다. 이 값은 public boolean이며 provider client secret은 artifact에 포함하지 않는다.
- LIVE_KAKAO_HUMAN_E2E = NOT_RUN. production 완료로 쓰지 않음.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/login-kakao-closure.cjs` | PASS · callback route + terms handoff + Nest POST finish 포함 |
| committed spec `login-bootstrap.spec.cjs` | 파일+axe in-process |
| Founder Kakao human E2E | NOT_RUN |

## ACCEPTANCE

일반 로그인 클로저. Kakao live는 잔여로 정직 표기.

## EXIT_GATE

Kakao NOT_RUN을 production 완료로 쓰지 않음.

## CI FIX

`isKakaoOAuthReady`가 `process.env`를 좁은 `KakaoReadyEnv`에 직접 넣지 않는다.
`NEXT_PUBLIC_OAUTH_KAKAO_ENABLED`만 읽고, CLIENT_ID 단독 활성은 계속 금지한다.
`LIVE_KAKAO_HUMAN_E2E = NOT_RUN` 유지.
