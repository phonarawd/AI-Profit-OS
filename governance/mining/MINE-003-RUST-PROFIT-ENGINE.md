# MINE-003 Rust 수익계산 엔진

- 작업일: 2026-09-20
- 상태: PASS
- 대상 Backend branch: `phase/mine-profit-engine-20260920`
- 기반 branch: `phase/mine-db-foundation-20260920`
- 기반 SHA: `74b80fd3963047c2e97fb9ed3004dbff664743b6`
- 계산기 버전: `mine-profit-v1`
- DB 정밀도 기준: `numeric(36,18)`
- 최종 Rust 검증 코드 SHA: `2f394a9c6a3fbf3757c18485ca3930deb316278a`

## 1. 범위

PHASE 03 범위만 수행했다.

추가 구현:

- `services/engine-rust/src/mining_profit.rs`
- `services/engine-rust/src/lib.rs` mining calculator export

기존 `settlement_rule.rs` 거래 정산 규칙은 변경하지 않았다.

DB migration, API controller/service, Admin/Ops, User Web은 PHASE 03에서 변경하지 않았다.

## 2. 계산 계약

입력:

- principal: decimal string
- daily_rate: decimal string
- period_start_unix_micros: UTC epoch microseconds
- period_end_unix_micros: UTC epoch microseconds
- output_scale: 0..18
- rounding_mode: `Truncate | HalfUp | HalfEven`

출력:

- accrued_profit: decimal string
- elapsed_micros
- output_scale
- rounding_mode
- calc_version = `mine-profit-v1`

기본 산식:

`principal * daily_rate * elapsed_micros / 86_400_000_000`

## 3. 금융 정밀도 원칙

- `f32`/`f64` 금융계산 사용 금지
- 난수 사용 금지
- 지수표기 입력 금지
- principal/daily_rate는 `numeric(36,18)` 범위를 초과하면 오류
- 음수 principal/rate 금지
- principal = 0 금지
- period_end <= period_start 금지
- 결과 integer capacity가 `numeric(36,18)`을 넘으면 오류
- 출력 scale과 반올림 규칙을 호출자가 명시

표준 라이브러리만 사용하며 새로운 외부 Rust decimal dependency를 추가하지 않았다.

18자리 고정소수 입력을 내부 base-1e9 unsigned limb 정수로 변환한 뒤 곱셈/나눗셈을 수행한다.

분모를 두 단계로 나누되 두 단계 remainder를 보존해 최종 half 비교를 한 번만 수행하므로 중간 반올림을 만들지 않는다.

## 4. 구현된 테스트 벡터

Rust module 내부 unit test에 다음 경계를 포함했다.

- 1초
- 1분
- 1시간
- 23:59:59
- 정확히 하루
- 정확한 UTC 자정
- 월말
- 연말
- 윤년 2월 29일 경계
- 수익률 변경 직전 1 microsecond
- 수익률 변경 순간
- 수익률 변경 직후 1 microsecond
- 증액 경계
- 감액 경계
- 종료 경계
- 여러 accrual segment 합계
- 최소 단위 수준의 매우 작은 principal/rate
- `numeric(36,18)` 최대 정수부 수준의 큰 principal
- Truncate / HalfUp / HalfEven
- 잘못된 decimal 입력
- 동일 입력 100회 결정성

대표 벡터 (`principal=1000000`, `daily_rate=0.01`, HalfEven, 18dp):

- 1초 = `0.115740740740740741`
- 1분 = `6.944444444444444444`
- 1시간 = `416.666666666666666667`
- 23:59:59 = `9999.884259259259259259`
- 1일 = `10000.000000000000000000`

## 5. 독립 산술 교차검증

Rust 구현과 독립적인 Python 정수/유리수 oracle로 다음을 검증했다.

- staged division + remainder rounding vs direct exact rational rounding
- 무작위 `numeric(36,18)` 범위 입력 60,000건
- output scale 0..18
- Truncate / HalfUp / HalfEven
- 결과 mismatch = 0
- 필수 duration/calendar/rate boundary vector 전부 expected와 일치
- 동일 입력 100회 결과 일치
- 금융 code path `f32`/`f64` 사용 0
- RNG 사용 0

100회 결정성 검증 입력의 oracle 결과:

`152478.466660020301802287`

## 6. 실제 Rust 컴파일·테스트 검증

1차 검증은 공식 Rust Playground stable에서 브랜치의 정확한 `mining_profit.rs`, 기존 `settlement_rule.rs`, `lib.rs`를 하나의 crate로 구성해 수행했다.

1차 검증 결과:

- 전체 crate compile: PASS
- 전체 unit tests: **19 passed, 0 failed**
- mining profit tests: **9 passed, 0 failed**
- 기존 settlement regression tests 포함: PASS
- Clippy: **경고 0, 오류 0**
- 결정성 100회 테스트: PASS

이후 Render `My Workspace`의 PHASE 03 전용 검증 서비스에서 저장소 브랜치를 직접 체크아웃해 Rust toolchain `1.85.0`(`rust-toolchain.toml`)으로 최종 검증했다.

최종 검증 코드 SHA:

`2f394a9c6a3fbf3757c18485ca3930deb316278a`

최종 연속 게이트:

- `cargo fmt --check`: **PASS**
- `cargo test`: **PASS — 19 passed, 0 failed**
- `cargo check`: **PASS**
- mining profit 경계/결정성 tests: PASS
- 기존 settlement regression tests: PASS

초기 Render 검증에서 `mining_profit.rs`의 rustfmt 차이를 발견했으며, 계산 로직 변경 없이 rustfmt 결과만 반영했다. 포맷 커밋은 파일 1개만 변경했고, Render 작업트리에서 `27 insertions / 28 deletions`의 formatting-only diff로 확인했다.

GitHub Actions는 사용량 소진 정책에 따라 실행하지 않았다. 상태는 `NOT RUN / quota exhausted`로 기록한다.

## 7. 변경 영향

- DB / Supabase 변경 없음
- API 변경 없음
- 새 외부 Rust dependency 없음
- 기존 settlement 계산 규칙 변경 없음
- Production 배포 없음
- Vercel 사용 없음

## 8. PHASE 판정

필수 금융 경계, 결정성, 실제 Rust compile/unit test, 기존 회귀 테스트, Clippy, `cargo fmt --check`, `cargo check` 검증을 모두 통과했다.

`PHASE 03 = PASS`

마스터플랜의 `completed_through`는 `PHASE_03`, `next_phase`는 `PHASE_04`다. PHASE 04는 관리자 명시 지시 전까지 시작하지 않는다.
