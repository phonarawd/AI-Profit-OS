# PUTDUK MINE OS · Release Baseline · 2026-09-25

## Release intent

이번 릴리스는 PUTDUK을 운영자 통제형 Mine OS로 정렬한다.

- Production Supabase SSOT는 `mgsytcetsiecllmhcyox`로 유지한다.
- Mining foundation은 기존 Production migration을 그대로 사용한다.
- 이번 릴리스에서는 Production Supabase migration을 추가/수정하지 않는다.
- 고객 Web은 광산 / 내 운용 / 지갑 / 퍼뜩AI / 내 정보 중심으로 정렬한다.
- Ops는 퍼뜩 채굴 운영센터를 중심으로 광산 / 수익률 / 운용 / 정산 / 위험·제어를 우선 노출한다.
- 금융 권위는 Nest + Ledger에 있고, Web/Ops는 DB에 직접 접근하지 않는다.

## Release branch

`release/mine-os-control-center-20260925`

이 브랜치는 로컬 Mine 개발 기준선에서 시작하며 Production DB의 연결 정보나 스키마를 제거하지 않는다.

## Current Production mining foundation

Production Supabase에는 다음 Mining 영역이 이미 적용되어 있다.

- `mines`
- `mine_rate_versions`
- `mine_positions`
- `mine_position_events`
- `mine_accruals`
- `mine_settlements`
- `mine_settlement_accruals`
- `mine_trial_sessions`
- `mine_high_value_reviews`
- `mine_position_commands`

현재 운영 데이터 기준으로 테스트 Mine은 종료 상태이며, 실제 회원 Position / Accrual / Settlement / Command 데이터는 비어 있다.

## Safety boundary

- AI가 금액을 직접 변경하지 않는다.
- Frontend가 잔액·수익·정산을 금융 권위값으로 계산하지 않는다.
- 운영자는 Ledger balance를 직접 수정하지 않는다.
- 신규 운용 중지와 정산 보류는 Backend Kill Switch가 최종 강제한다.
- Production Supabase는 이 릴리스의 UI/UX 작업에서 변경하지 않는다.

## Merge gate

1. 세 저장소 release branch의 변경 범위를 `main`과 비교한다.
2. Web: lint / typecheck / build 및 핵심 Mining route smoke를 통과시킨다.
3. Ops: lint / typecheck / build 및 Mining screen smoke를 통과시킨다.
4. Backend: fast gate / backend gate / boundary gate를 통과시킨다.
5. 각 PR은 `main`으로 merge commit 방식으로 병합한다.
6. 병합 후 `main` HEAD SHA와 PR merge SHA를 재확인한다.
7. Production Supabase migration은 이 릴리스에서 실행하지 않는다.

## Ownership graph sync

- Backend ownership graph was regenerated on 2026-09-25 after Mine OS files were added.
- Final graph has `UNKNOWN=0`; the temporary sync workflow removed itself after committing the generated artifacts.
