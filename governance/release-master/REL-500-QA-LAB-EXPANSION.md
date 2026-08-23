# REL-500 QA Lab Expansion

```text
REL = REL-500
TITLE = QA-LAB-EXPANSION
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
MCP_ONLY_DONE = 0
LOCAL_FULL_MATRIX = 0
HOME_GEOMETRY_PATCH = 0
CARTESIAN_REQUIRED = 0
ISOLATION_GUARD = 1
FAKE_FOMO = 0
FAKE_MONEY = 0
FAKE_DURATION = 0
MISSING_MONEY_AS_ZERO = 0
PRODUCTION_DB_WRITE = 0
```

Bootstrap(`tooling/e2e` REL-006)을 유지한 채 위험 기반 매트릭스로 확장한다.

- 필수: Home 390/1440 × chromium × a11y · auth · wallet/profits/participate/settlement · admin-entry isolation
- 샘플: firefox/webkit Home · tablet 768 · offline Home
- axes 곱은 진단 크기. required 집합으로 전개하지 않는다.
- 로컬 풀매트릭스 금지. `QA_LAB_FULL=1` / CI만 샘플·풀 게이트를 연다.
- 브라우저 실행은 바인딩된 기존 closure spec. 이 REL이 Home geometry를 바꾸지 않는다.
- Playwright MCP 클릭만으로는 DONE이 아니다.

의존 재실행: `qa-env-isolation-guard` · `axe-harness` · `money-unavailable`.
REL-019는 플랜 COMPLETED + `home-geometry-lock.rewrite=FORBIDDEN` 으로 잠근다. Home 해시 재기록 0.
