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
REL-500이 matrix를 확장한다.
