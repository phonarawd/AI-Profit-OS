# QA Lab persona / seed (REL-006 · 최소 1세트)

`REL-500`이 이 문서를 확장한다. 지금은 Bootstrap 최소셋만.

## Persona

| id | 역할 | 금액 |
|---|---|---|
| `qa-lab-persona-001` | 결정론적 QA 사용자 | 시드 잔액 없음. 가짜 수익/FX/기간 금지 |

- 프로덕션 계정·프로덕션 지갑을 쓰지 않는다.
- missing money → `0` 위조 금지 (`UNAVAILABLE`).

## Seed

- 대상 DB = allowlist host만 (`127.0.0.1` / `localhost` / `::1`).
- production ref `mgsytcetsiecllmhcyox` 쓰기 0.
- 시드 금액·참여·정산을 이 단계에서 생성하지 않는다.

## 실행 규칙

1. `assertQaIsolation` PASS 전 money mutation 0.
2. Playwright MCP 클릭만으로는 DONE이 아니다.
