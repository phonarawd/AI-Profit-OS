# QA Lab Expansion (REL-500)

Bootstrap을 지우지 않는다. 이 파일이 위험 기반 확장 SSOT 설명이다.

기계 SSOT = `qa-lab-expansion.v1.json` · 선택기 = `tooling/e2e/lib/qa-lab-expansion.cjs`.

## DONE / NOT DONE

- DONE = committed spec + isolation guard + 위험 셀 바인딩 + 카르테시안≠required.
- Playwright MCP 클릭만으로는 DONE이 아니다.
- 로컬에서 풀매트릭스 브라우저를 돌린다고 DONE이 되지 않는다.

## 위험 기반 (나이브 카르테시안 금지)

axes 곱은 **진단 크기**다. required 집합으로 전개하지 않는다.

| class | 셀 | 로컬 | CI / `QA_LAB_FULL=1` |
|---|---|---|---|
| required | Home 390/1440 × chromium × a11y · auth · wallet/profits/participate/settlement · admin-entry | in-process 계약 | 동일 + 바인딩된 closure spec |
| sample | firefox/webkit Home · tablet 768 · offline Home | 기본 skip | `QA_LAB_SAMPLE=1` 또는 CI |
| cartesian dump | axes 전개 전체 | 금지 | 금지. 진단 숫자만 |

## 잠금

- `QA_ENV_ISOLATION_GUARD` 없는 셀 = FAIL
- Home geometry patch = 0
- 가짜 FOMO / 가짜 금액 / 가짜 기간 = 0
- missing money → 0 위조 = 0
- production DB write = 0
