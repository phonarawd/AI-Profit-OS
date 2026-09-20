# MINE-003 Rust 수익계산 엔진

- 작업일: 2026-09-20
- 상태: IMPLEMENTED / RUST COMPILE VALIDATION PENDING
- 대상 Backend branch: `phase/mine-profit-engine-20260920`
- 기반 branch: `phase/mine-db-foundation-20260920`
- 기반 SHA: `74b80fd3963047c2e97fb9ed3004dbff664743b6`
- 계산기 버전: `mine-profit-v1`
- DB 정밀도 기준: `numeric(36,18)`

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

현재 ChatGPT 실행환경에는 Rust toolchain이 없어서 `cargo test`를 실행할 수 없었다.

대신 동일 산식을 Rust 구현과 독립적인 Python 정수/유리수 oracle로 재구성해 다음을 검증했다.

- staged division + remainder rounding vs direct exact rational rounding
- 무작위 `numeric(36,18)` 범위 입력 60,000건
- output scale 0..18
- Truncate / HalfUp / HalfEven
- 결과 mismatch = 0
- 필수 duration vector 전부 expected와 일치
- calendar boundary 산술 일치
- rate boundary 산술 일치
- 동일 입력 100회 결과 일치
- 정적 scan에서 금융 code path `f32`/`f64` 사용 0
- RNG 사용 0

100회 결정성 검증 입력의 oracle 결과:

`152478.466660020301802287`

## 6. 실행환경 / CI 상태

현재 작업 런타임:

- `rustc`: NOT AVAILABLE
- `cargo`: NOT AVAILABLE
- github.com direct DNS: blocked

따라서 로컬 `cargo test`, `cargo check`, `cargo fmt --check`는 실행하지 못했다.

GitHub commit status 확인 결과 현재 branch HEAD에 status check가 없었다.

GitHub workflow run 조회 결과 현재 branch HEAD에 실행된 workflow가 없었다.

프로젝트 인계문에 기록된 GitHub Actions quota exhausted 상태를 존중해 새 workflow 실행을 강제로 만들지 않았다.

따라서 **Rust 컴파일/유닛테스트 PASS라고 기록하지 않는다.**

## 7. PHASE 판정

구현 자체와 독립 금융산술 검증은 완료했다.

그러나 프로젝트 절대 품질 규칙상 실제 Rust compile/unit test가 실행되지 않은 상태를 PASS로 승격하지 않는다.

현재 판정:

`PHASE 03 = IMPLEMENTED / VALIDATION PENDING`

다음 PHASE 04로 이동하지 않는다.

Rust toolchain이 사용 가능한 실행환경에서 최소 다음을 실행해 모두 성공한 뒤에만 PHASE 03을 PASS로 변경한다.

```bash
cd services/engine-rust
cargo fmt --check
cargo test
cargo check
```

그 후 마스터플랜의 `completed_through`를 PHASE_03으로 갱신하고 `next_phase`를 PHASE_04로 변경한다.
