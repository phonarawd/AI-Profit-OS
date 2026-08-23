# QA Lab Bootstrap (REL-006)

Committed Playwright spec + `QA_ENV_ISOLATION_GUARD`.

## DONE 판정

- 레포에 이 디렉터리의 가드·스펙·persona 문서가 있어야 한다.
- **Playwright MCP 브라우저 클릭만으로는 DONE이 아니다.** MCP-only evidence = 0.

## Guard

`lib/qa-env-isolation-guard.cjs`

- production project_ref `mgsytcetsiecllmhcyox` / `*.supabase.co` 쓰기 금지.
- money mutation은 allowlist host(`127.0.0.1` / `localhost` / `::1`)가 아니면 fail-closed.
- 시크릿 값 로그 0.

금융 테스트는 `lib/money-mutation-gate.cjs`의 `runMoneyMutationTest`만 통과한 뒤에 동작한다.

## 실행

```text
node tooling/verify/qa-env-isolation-guard.cjs
```

브라우저 스펙은 로컬 저사양에서 필수가 아니다. 파일 존재 + 가드 자기검증이 Bootstrap 증거다.

## QA Lab Expansion (REL-500)

위험 기반 매트릭스. 나이브 카르테시안은 진단 크기일 뿐 required DONE 집합이 아니다.

- SSOT: `expansion/qa-lab-expansion.v1.json` · 선택기 `lib/qa-lab-expansion.cjs`
- 필수: money paths × auth × chromium × online · Home 390/1440 × chromium × a11y · admin-entry isolation
- 샘플: firefox/webkit Home · tablet 768 · offline Home
- 로컬 풀매트릭스 금지 (`QA_LAB_FULL=1` / CI만)
- Playwright MCP 브라우저 클릭만으로는 DONE이 아니다

```text
node tooling/verify/rel-500-qa-lab-expansion.cjs
```

## Home 클로저 (REL-105)

`specs/home-closure.spec.cjs` 는 `PLAYWRIGHT_BASE_URL` 부재를 skip 이유로 쓰지 않는다.
`lib/local-web-runtime.cjs` 가 loopback Next를 기동한다. production/Workers URL fallback 금지.

```text
node tooling/verify/home-closure.cjs
```

## axe-core (REL-012)

`specs/axe-a11y.spec.cjs` + `lib/axe-scan.cjs`.

- 대상: Home 390×693, Home 1440×1080, `/auth/login`
- in-process: 의도적 라벨 누락 HTML이 critical/serious를 만든다
- 브라우저 실스캔: `AXE_BROWSER=1` (로컬 풀매트릭스 금지)
- Home geometry 패치 0. REL-105 a11y 클로저를 이 REL로 주장하지 않는다
- MCP 클릭만으로는 DONE이 아니다

```text
node tooling/verify/axe-harness.cjs
```

## 유저 원장 조회 (REL-015)

`specs/ledger-user-query.spec.cjs` + `lib/ledger-user-query-harness.cjs`.

- 권한: 본인만 200 · 타인 403 · 세션 없음 401
- 빈목록 / 정상목록 decimal string
- 프로덕션 DB mutation 0. GET only.

```text
node tooling/verify/user-ledger-query.cjs
```

## 금융/red-team (REL-501)

가드 안에서만 실패 모드를 친다. 실원장 mutation 0. production DB write 0.

- 모드: idempotency · double_submit · insufficient · stale · expired · blocked · replay
- 진입: `lib/money-red-team.cjs` → `runMoneyMutationTest` 필수
- Playwright MCP 클릭만으로는 DONE이 아니다

```text
node tooling/verify/rel-501-money-red-team.cjs
```

## Staging Surface Matrix regression (REL-601)

Reuses the REL-500 risk-based matrix and `PUTDUK_UI_VISUAL_MATRIX` against live preview workers.

- Live target = `ai-profit-web-preview` / `ai-profit-ops-preview` only
- Local full matrix / full Lighthouse / Playwright vs live staging = NOT_RUN
- Home visual redesign 0. Large-screen contract reused from REL-019/105
- Playwright MCP click is not DONE

```text
node tooling/verify/rel-601-staging-regression.cjs
```

## Production loop (REL-507)

`specs/production-loop.spec.cjs` + `lib/production-loop.cjs`.

- One line: login -> participate -> settlement -> wallet
- Isolation guard required. production host 0. invented success amount 0
- LIVE_KAKAO_HUMAN_E2E stays NOT_RUN
- Playwright MCP click is not DONE

```text
node tooling/verify/rel-507-production-e2e.cjs
```
