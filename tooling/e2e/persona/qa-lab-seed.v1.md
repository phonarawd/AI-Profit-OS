# QA Lab persona / seed (REL-006 최소셋 + REL-500 확장)

프로덕션 계정·프로덕션 지갑을 쓰지 않는다.
missing money → `0` 위조 금지 (`UNAVAILABLE`).
연령대별 UI 모드(seniorMode / age20Mode / age70Mode)를 만들지 않는다.

## Persona

| id | 역할 | 금액 / 권한 |
|---|---|---|
| `qa-lab-persona-001` | Bootstrap 결정론적 QA 사용자 | 시드 잔액 없음. 가짜 수익/FX/기간 금지 |
| `qa-lab-persona-guest` | 비로그인 소비자 | 세션 없음. 금액 진실 표시 0 |
| `qa-lab-persona-member` | 로그인 회원 | 시드 잔액 없음. 가짜 수익 금지 |
| `qa-lab-persona-insufficient` | 잔액 부족 회원 | 참여 실패 모드 소유. 잔액 위조 0 |
| `qa-lab-persona-blocked` | 차단/제재 회원 | 차단 실패 모드 소유. 우회 성공 위조 0 |
| `qa-lab-persona-admin` | 관리 화면 QA | Admin 표면 전용. 유저 JWT로 admin 200 금지 |

## Seed

- 대상 DB = allowlist host만 (`127.0.0.1` / `localhost` / `::1`).
- production ref `mgsytcetsiecllmhcyox` 쓰기 0.
- 시드 금액·참여·정산을 이 문서가 생성하지 않는다. 금융 mutation은 REL-501 가드 안에서만.

## 실행 규칙

1. `assertQaIsolation` PASS 전 money mutation 0.
2. Playwright MCP 클릭만으로는 DONE이 아니다.
3. REL-500 매트릭스는 고위험 셀만 필수, 저위험은 샘플. 로컬 풀매트릭스 금지.
