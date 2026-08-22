# REL-500 — QA-LAB-EXPANSION

STATUS: PASS
DATE: 2026-08-22
PROTECTED_SCOPE_MUTATION: false
RUNTIME_QA: PARTIAL (committed spec + isolation self-test PASS · browser full matrix CI-delegated / local NOT_RUN)

## Intent

Bootstrap을 전체 위험 기반 매트릭스로 확장한다. 나이브 카르테시안 풀폭주 금지.

## Verify

- `pnpm verify:qa-lab-expansion`
- `pnpm verify:qa-env-isolation-guard`
- `pnpm test:e2e:qa-lab-expansion` (브라우저 셀은 `QA_LAB_EXPANSION_BROWSER=1` · CI)

## Policy

- `naiveCartesian = false`
- `localFullMatrix = FORBIDDEN`
- `ciDelegation = true`
- `mcpOnlyDone = false`
- `QA_ENV_ISOLATION_GUARD = REQUIRED`
- Home 시각 재설계 0
- 연령대별 UI 0
- production DB write 0

## Evidence

- `tooling/e2e/matrix/qa-lab-expansion.v1.json`
- `tooling/e2e/lib/qa-lab-expansion.cjs`
- `tooling/e2e/specs/qa-lab-expansion.spec.cjs`
- `tooling/e2e/persona/qa-lab-seed.v1.md`
- `.github/workflows/qa-lab-expansion.yml`

## Notes

브라우저 고위험 셀의 실런타임 실행은 CI 위임이다. 이 문서의 PASS는 Expansion Lab 사용 가능(committed spec + 가드 유지)이다. MCP-only 클릭 증적은 DONE이 아니다.
