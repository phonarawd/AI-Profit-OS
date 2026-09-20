# MINE-001 광산 계약 잠금

- 날짜: 2026-09-20
- 상태: PASS
- 계약 버전: `2026-09-20.mine-v1`
- 휴대 계약 파일: `contracts/mining/mining-contract.v1.json`
- 동일 Git blob SHA: `e7e180e1968194c12f2d720476165889877ca8dd`
- 대상: Backend / Admin-Ops / User-Web
- DB 변경: 없음
- Supabase migration: 없음

## 1. 단일 용어

서버·DB·프론트 코드의 wire 값은 아래 영문 enum만 사용하고, 사용자/운영자 화면은 한국어 라벨만 표시한다.

### MineStatus

- `READY` = 준비
- `ACTIVE` = 가동
- `NEW_POSITIONS_PAUSED` = 신규운용중지
- `PAUSED` = 일시정지
- `ENDED` = 종료

### PositionStatus

- `START_PENDING` = 시작대기
- `ACTIVE` = 운용중
- `DECREASE_PENDING` = 감액처리중
- `END_PENDING` = 종료처리중
- `ENDED` = 종료

### SettlementStatus

- `CALC_PENDING` = 계산대기
- `CALCULATED` = 계산완료
- `LEDGER_POSTED` = 원장반영완료
- `FAILED` = 실패
- `REVIEW_REQUIRED` = 검토필요

### RateVersionStatus

- `DRAFT` = 초안
- `APPROVAL_PENDING` = 승인대기
- `SCHEDULED` = 예약
- `ACTIVE` = 적용중
- `ENDED` = 종료

### TrialStatus

- `NOT_STARTED` = 미시작
- `ACTIVE` = 진행중
- `COMPLETED` = 완료
- `EXPIRED` = 만료

### HighValueReviewStatus

- `PENDING` = 검토대기
- `APPROVED` = 승인
- `REJECTED` = 거절
- `CANCELLED` = 취소

## 2. 상태 전이

### 광산

- `READY -> ACTIVE | ENDED`
- `ACTIVE -> NEW_POSITIONS_PAUSED | PAUSED | ENDED`
- `NEW_POSITIONS_PAUSED -> ACTIVE | PAUSED | ENDED`
- `PAUSED -> ACTIVE | NEW_POSITIONS_PAUSED | ENDED`
- `ENDED`는 terminal

`NEW_POSITIONS_PAUSED`는 신규 시작/증액만 차단하고 기존 운용의 발생수익·정산을 중단시키지 않는다.

`PAUSED`의 정확한 발생수익 처리 규칙은 PHASE 03 계산엔진 계약에서 결정하지만, PHASE 01 기준으로 신규 시작/증액은 허용하지 않는다.

### 운용

- `START_PENDING -> ACTIVE | ENDED`
- `ACTIVE -> DECREASE_PENDING | END_PENDING`
- `DECREASE_PENDING -> ACTIVE | END_PENDING | ENDED`
- `END_PENDING -> ENDED`
- `ENDED`는 terminal

금융 write가 끝나기 전에 클라이언트가 `ACTIVE` 또는 `ENDED`로 선반영하면 안 된다.

### 정산

- `CALC_PENDING -> CALCULATED | FAILED | REVIEW_REQUIRED`
- `CALCULATED -> LEDGER_POSTED | FAILED | REVIEW_REQUIRED`
- `FAILED -> CALC_PENDING | REVIEW_REQUIRED`
- `REVIEW_REQUIRED -> CALC_PENDING | FAILED`
- `LEDGER_POSTED`는 동일 settlement에 대해 terminal

같은 `settlementId`가 `LEDGER_POSTED` 이후 재실행되어도 추가 원장반영은 금지한다.

### 수익률 버전

- `DRAFT -> APPROVAL_PENDING`
- `APPROVAL_PENDING -> DRAFT | SCHEDULED`
- `SCHEDULED -> DRAFT | ACTIVE | ENDED`
- `ACTIVE -> ENDED`
- `ENDED`는 terminal

승인 시 승인 요청에 포함된 `effectiveAt`을 확정하여 `SCHEDULED`로 이동한다. `scheduleRateVersion`은 이미 승인되어 `SCHEDULED`인 버전의 적용시각을 실제 적용 전에 조정하는 용도로만 사용한다. 따라서 별도 `APPROVED` 상태를 만들지 않는다.

### 체험

- `NOT_STARTED -> ACTIVE`
- `ACTIVE -> COMPLETED | EXPIRED`
- `COMPLETED`, `EXPIRED`는 terminal

## 3. 숫자·시간 계약

- 금액은 JSON number가 아니라 **10진 문자열**로 전달한다.
- 지수표현(`1e8`) 금지.
- 수익률 `dailyRate`도 **일 단위 비율의 10진 문자열**이다. 예: 하루 0.05%는 `0.0005`.
- 시간은 UTC ISO-8601 문자열로 전달하고 DB는 `timestamptz`를 사용한다.
- 화면 환산/반올림은 원장 금액을 변경하지 않는다.
- 프론트 실시간 보간은 표시 전용이며 `accruedProfitAmount` 확정 권위는 서버에 있다.

## 4. 공통 필드명

다른 별칭을 만들지 않는다.

- `mineId`
- `positionId`
- `rateVersionId`
- `settlementId`
- `trialSessionId`
- `highValueReviewId`
- `principalAmount`
- `assetCode`
- `dailyRate`
- `effectiveAt`
- `accruedProfitAmount`
- `nextSettlementAt`

예를 들어 `capital`, `depositAmount`, `investAmount`, `yield`, `roi`, `earning`, `opportunityId`, `tradeId`를 신규 광산 계약의 동의어로 사용하지 않는다.

## 5. 사용자 API 계약

- `GET /api/v1/mines`
- `GET /api/v1/mines/:mineId`
- `GET /api/v1/mining/me/summary`
- `GET /api/v1/mining/me/positions`
- `GET /api/v1/mining/me/positions/:positionId`
- `POST /api/v1/mining/positions/start`
- `POST /api/v1/mining/positions/:positionId/increase`
- `POST /api/v1/mining/positions/:positionId/decrease`
- `POST /api/v1/mining/positions/:positionId/end`
- `GET /api/v1/mining/me/settlements`
- `GET /api/v1/mining/trial`
- `POST /api/v1/mining/trial/start`

### 핵심 mutation body

`startPosition`

```json
{
  "mineId": "uuid",
  "principalAmount": "1000000",
  "assetCode": "KRW"
}
```

`increasePosition`

```json
{
  "principalAmount": "500000",
  "assetCode": "KRW"
}
```

`decreasePosition`

```json
{
  "principalAmount": "300000",
  "assetCode": "KRW"
}
```

`endPosition`는 금액을 받지 않는다. 전액 종료 의미다.

모든 mutation은 `Idempotency-Key` 헤더를 필수로 사용한다.

## 6. 읽기 응답 최소 계약

광산 목록/상세 최소 공통 필드:

```json
{
  "mineId": "uuid",
  "status": "ACTIVE",
  "displayName": "금 광산",
  "assetCode": "KRW",
  "minPrincipalAmount": "10000",
  "maxPrincipalAmount": "100000000",
  "currentDailyRate": "0.0005"
}
```

운용 최소 공통 필드:

```json
{
  "positionId": "uuid",
  "mineId": "uuid",
  "status": "ACTIVE",
  "principalAmount": "1000000",
  "assetCode": "KRW",
  "currentDailyRate": "0.0005",
  "accruedProfitAmount": "123.4567",
  "baselineAt": "2026-09-20T12:00:00Z",
  "nextSettlementAt": "2026-09-21T00:00:00Z"
}
```

정산 최소 공통 필드:

```json
{
  "settlementId": "uuid",
  "positionId": "uuid",
  "status": "LEDGER_POSTED",
  "periodStartAt": "2026-09-20T00:00:00Z",
  "periodEndAt": "2026-09-21T00:00:00Z",
  "profitAmount": "500.0000",
  "assetCode": "KRW",
  "ledgerJournalId": "uuid"
}
```

`ledgerJournalId`는 `LEDGER_POSTED` 전에는 null일 수 있다.

## 7. 관리자 API 계약

### 광산

- `GET /api/v1/admin/mines`
- `POST /api/v1/admin/mines`
- `GET /api/v1/admin/mines/:mineId`
- `PATCH /api/v1/admin/mines/:mineId`
- `POST /api/v1/admin/mines/:mineId/publish`
- `POST /api/v1/admin/mines/:mineId/pause-new-positions`
- `POST /api/v1/admin/mines/:mineId/pause`
- `POST /api/v1/admin/mines/:mineId/resume`
- `POST /api/v1/admin/mines/:mineId/end`

### 수익률

- `GET /api/v1/admin/mines/:mineId/rates`
- `POST /api/v1/admin/mines/:mineId/rates`
- `PATCH /api/v1/admin/mines/:mineId/rates/:rateVersionId`
- `POST /api/v1/admin/mines/:mineId/rates/:rateVersionId/request-approval`
- `POST /api/v1/admin/mines/:mineId/rates/:rateVersionId/approve`
- `POST /api/v1/admin/mines/:mineId/rates/:rateVersionId/schedule`

### 운용/정산

- `GET /api/v1/admin/mining/positions`
- `GET /api/v1/admin/mining/positions/:positionId`
- `GET /api/v1/admin/mining/settlements`
- `GET /api/v1/admin/mining/settlements/:settlementId`
- `POST /api/v1/admin/mining/settlements/:settlementId/retry`

### 체험/고액검토

- `GET /api/v1/admin/mining/trial-config`
- `PATCH /api/v1/admin/mining/trial-config`
- `GET /api/v1/admin/mining/high-value-reviews`
- `GET /api/v1/admin/mining/high-value-reviews/:reviewId`
- `POST /api/v1/admin/mining/high-value-reviews/:reviewId/approve`
- `POST /api/v1/admin/mining/high-value-reviews/:reviewId/reject`

모든 관리자 mutation도 `Idempotency-Key`가 필수다.

## 8. 오류 계약

API는 내부적으로 안정된 오류코드를 가질 수 있으나 사용자 UI에 원시 코드를 직접 표시하지 않는다.

최소 오류 envelope:

```json
{
  "code": "MINING_CONFLICT",
  "message": "safe server message",
  "retryable": false,
  "requestId": "trace-id"
}
```

User Web은 `code`를 사용자 문구로 매핑하고 원시 `code` 또는 영문 서버 메시지를 그대로 렌더링하지 않는다.

## 9. Supabase 계약

PHASE 01에서는 테이블/enum/type/migration을 생성하지 않는다.

PHASE 02부터 DB 객체는 이 계약과 동일한 개념명을 사용한다. DB snake_case 예시는 `mine_id`, `position_id`, `rate_version_id`, `settlement_id`이며 API 경계에서 camelCase로 변환한다.

새 독립 잔액 컬럼/테이블을 광산 도메인에 만들지 않는다. 금융 원본은 기존 ledger/wallet 체계를 재사용한다.

## 10. Drift gate

세 저장소의 아래 파일은 내용이 완전히 동일해야 한다.

`contracts/mining/mining-contract.v1.json`

검증 결과:

- Backend blob SHA = `e7e180e1968194c12f2d720476165889877ca8dd`
- Admin/Ops blob SHA = `e7e180e1968194c12f2d720476165889877ca8dd`
- User Web blob SHA = `e7e180e1968194c12f2d720476165889877ca8dd`

동일 개념의 다른 이름 = 0.

## 11. Verdict

`MINE-001 = PASS`

다음 단계는 오직 `PHASE 02 — 데이터베이스·금융 기반`이다. 관리자 명시 지시 전 착수 금지.
