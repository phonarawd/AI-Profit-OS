# QA Lab personas (REL-500 expansion)

Bootstrap `persona/qa-lab-seed.v1.md` 는 유지한다. 여기가 확장 집합이다.

| id | 역할 | 금액 |
|---|---|---|
| `qa-lab-persona-001` | Bootstrap 결정론적 QA 사용자 | 시드 잔액 없음 |
| `guest` | 비로그인 소비자 | 금액 없음. empty money truth |
| `auth-consumer` | 로그인 소비자 (머니 경로) | 시드 잔액 없음. 가짜 수익/FX/기간 금지 |

- 프로덕션 계정·프로덕션 지갑을 쓰지 않는다.
- missing money → `0` 위조 금지 (`UNAVAILABLE`).
- 카르테시안용 페르소나를 대량 창작하지 않는다. 위험 셀에 필요한 3개만.
