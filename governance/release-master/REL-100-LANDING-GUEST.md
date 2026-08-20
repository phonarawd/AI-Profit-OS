# REL-100 LANDING GUEST EVIDENCE

```text
REL = REL-100
TITLE = Landing (/ guest) 클로저
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
HOME_VISUAL_REOPEN = 0
HOME_RETROACTIVE_VISUAL_REDESIGN = NO
NEW_MARKETING_LANDING = 0
FAKE_MONEY = 0
FAKE_FOMO = 0
```

## CURRENT_SCOPE

게스트 `/` 입구. FIG=NOT_FOUND → 최소 진실 입구 + 가입/로그인. Home geometry 수정 0.

## IMPLEMENTATION

- `/`는 `HomeDesktopClient` 유지. 새 마케팅 랜딩 발명 0.
- unauthorized/guest는 `GuestFirstVisit`만 렌더. HomeDesktop/HomeMobile/CSS 미변경.
- emptyRuntimeModel money/hero = null. missing ≠ 0.
- 가입 `/auth/signup`, 로그인 `/auth/login` 링크.
- 카피 = 기존 `T.landing` utility. 수익/보장/차익 0.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/landing-guest-closure.cjs` | PASS |
| `node tooling/verify/no-it-jargon.cjs` | PASS |
| committed spec `tooling/e2e/specs/landing-guest.spec.cjs` | 파일+axe in-process |
| runtime `PLAYWRIGHT_BASE_URL` | NOT_RUN (로컬 웹 기동 강제 0) |

## ACCEPTANCE

게스트가 가입/로그인으로 갈 수 있고 가짜 숫자가 없음.

## EXIT_GATE

가짜 수익 카피 잔존 0.
