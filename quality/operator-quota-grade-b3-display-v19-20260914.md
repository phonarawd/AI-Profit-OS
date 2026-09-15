# 표시 Journey vs 실행 정책 분리 (2026-09-14.b3.display-v19)

이 파일은 B3 체크포인트(`quality/operator-quota-grade-b3-20260914.md`)를 덮어쓰지 않는다.
문서/격리만으로 “시간 설정 완료”가 아니다. Journey 화면 consumer는 이 레포에 없다.

## 계약

- 라이브 버전: `2026-09-14.b3.display-v19`
- 사용자 묶음: `C:\Users\PC\Desktop\AI_PROFIT_OS\quality\contracts\operator-control\user-quota-grade-profile.v1.json`
  fingerprint `16c9b46268c0a89af2f02e0fd11e55fdefe3edb3740e152499daa76f683f7b52`
- 호환 규격: `C:\Users\PC\Desktop\AI_PROFIT_OS\quality\contracts\operator-control\display-vs-execution.v1.json`
  fingerprint `9bfa6f968fe03059dc05b1d733eaee74baf85b7199a1fd74c649c8c009e054a8`
- B3 원본 보존: `C:\Users\PC\Desktop\AI_PROFIT_OS\quality\contracts\operator-control\preserved-b3\user-quota-grade-profile.v1.json`
  sha256 `1691f25517dc1a8cc1ca2f9481eb581ea9d1dfdfc670423648db49e3c1f851de`
- b2 원본: 이 레포에 없음. 정확한 b2 차이 검증을 주장하지 않음.

## 제품 표시 기본값 (웹 보고 v19, 승인 없이 교체하지 않음)

- phase: product, compare, cargo, flight, buyer, settle, complete
- atSec: 0, 8, 18, 28, 48, 58, 66
- totalDurationSec: 70
- 필드: atSec (`at` 거절)

## 5단계 8–15초 = 실행 정책 (표시 Journey 아님)

출처: `services/market-intelligence/src/match-strictness.cjs` `DAY1_PRESENTATION`
스키마: `schemas/execution-policy.v1.json` `presentation`
Admin: `GET/PUT /api/v1/admin/execution-policy`
단계: product_check, price_compare, matching, settle_prep, credit
durationSecMin 8 / durationSecMax 15
Soft60/Hard90과 다름. engine deadline과 섞지 않음.

B3 5단계 14초 초안은 보존만. 제품 기본값으로 연결하지 않음.
5→7 매핑·14→70 스케일 코드 없음 (`assertNoDisplayExecutionBridge`).

## 연결 경로

구현: Admin PUT presentation-profile → validate → persist(스키마 ready일 때만) → 사용자 GET presentationProfile
미연결: putduk-web JourneyStage 실제 소비. `journeyWired: false`
스키마 미적용 write: 503 STORE_UNREADY. 메모리 설정 ≠ 영속.

schemaApplied / storeReady = preflight 실측만. 이 워크스테이션 저장소는 unready.

## 이번 턴 검증 실측

- `operator-quota-grade` PASS (isolation + Admin HTTP 18)
- matching-membership 11/11 PASS (`backend/run-all --domain matching-membership` exit 0)
- Nest `tsc --noEmit` exit 2: `opportunities.admin.service.ts:839` TS2347
- `admin-boundary` exit 1: 동일 tsc로 selftest 미실행
- `verify:gate:fast` exit 1: `ebay-resilience.cjs` — 동일 tsc
- 해당 파일 타입 수정은 훅 `malformed hook input`으로 차단. 우회하지 않음.

## 보존

- b3.handoff reader 변경 profile 수용: compare atSec 6 persist → 사용자 DTO
- 신규 하루5 · 기존 명시8 · override0 · 사용 이력 · runtime/test 분리
- 커밋·푸시·운영 DB 적용 0
