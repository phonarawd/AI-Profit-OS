# 운영 제어 계약 (백엔드 writer)

라이브 버전: `2026-09-14.b3.display-v19`
B3 원본 보존: `quality/contracts/operator-control/preserved-b3/`
표시 Journey ≠ 실행 정책 DAY1. 5→7 매핑·14→70 스케일 없음.
Journey 화면 consumer는 이 레포에 없음(putduk-web). 문서/격리만으로 시간 설정 완료가 아님.

제품 표시 기본값: product, compare, cargo, flight, buyer, settle, complete
atSec 0,8,18,28,48,58,66 · totalDurationSec 70 · 필드 atSec

실행 정책(별도): GET/PUT /api/v1/admin/execution-policy
DAY1 5단계 product_check… · durationSecMin 8 / Max 15. Soft60/Hard90 과 다름.

상품 Admin HTTP(2026-09-15.mall-admin-v5): `product-admin-http.v5.json`. 이전 해석 파일 `product-visibility-concurrent-participate.v1.json` 은 v4 스냅샷. 실PG는 GHA 일회용 PG만. 정식 QA0–QA9·운영 적용·출시 아님.
금액 권위: expectedProfitUsdt / configuredPayoutUsdt / ledgerPaidUsdt. persist 실태: persist-status.v1.json. persist 코드+draft+가짜 persist 격리. Nest Admin 상품은 격리 QA resolver. 이 턴 URL unset → STORE_UNREADY. 실 Postgres persist 아님. 기본은 쇼핑몰형 전체 공개. 선택 회원 공개는 권한이지 독점 예약이 아님. 구현 필드와 제안(라이브 스키마) 필드를 구분한다.

사용자 API: GET /api/v1/me/membership
Admin 표시 연출: GET/PUT /api/v1/admin/membership/presentation-profile
스키마 미적용 write: 503 STORE_UNREADY
