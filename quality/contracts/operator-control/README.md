# 운영 제어 계약 (백엔드 writer)

라이브 버전: `2026-09-14.b3.display-v19`
B3 원본 보존: `quality/contracts/operator-control/preserved-b3/`
표시 Journey ≠ 실행 정책 DAY1. 5→7 매핑·14→70 스케일 없음.
Journey 화면 consumer는 이 레포에 없음(putduk-web). 문서/격리만으로 시간 설정 완료가 아님.

제품 표시 기본값: product, compare, cargo, flight, buyer, settle, complete
atSec 0,8,18,28,48,58,66 · totalDurationSec 70 · 필드 atSec

실행 정책(별도): GET/PUT /api/v1/admin/execution-policy
DAY1 5단계 product_check… · durationSecMin 8 / Max 15. Soft60/Hard90 과 다름.

상품 공개·동시 참여(2026-09-15.mall-local-v2): `product-visibility-concurrent-participate.v1.json`
로컬 메모리 코어+Admin HTTP STORE_UNREADY. 실 Postgres persist 아님. 기본은 쇼핑몰형 전체 공개. 선택 회원 공개는 권한이지 독점 예약이 아님. 구현 필드와 제안(라이브 스키마) 필드를 구분한다.

사용자 API: GET /api/v1/me/membership
Admin 표시 연출: GET/PUT /api/v1/admin/membership/presentation-profile
스키마 미적용 write: 503 STORE_UNREADY
