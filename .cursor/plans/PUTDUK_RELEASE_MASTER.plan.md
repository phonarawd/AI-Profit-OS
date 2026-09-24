---
name: PUTDUK Mining Release Master
overview: 퍼뜩 광산 전환의 단일 실행 권위. 2026-09-20부터 PHASE 00~26만 현재 실행 큐로 사용한다. 기존 REL 계획은 PUTDUK_RELEASE_MASTER.legacy-rel.plan.md에 역사 보존하며 현재 자동 실행 권위는 없다.
plan_locked: true
current_phase: PHASE_05
completed_through: PHASE_05
next_phase: PHASE_06
next_phase_requires_admin_command: true
---

# PUTDUK 광산 전환 최종 실행 마스터

## 0. 권위와 범위

현재 실행 권위는 이 파일 하나다.

대상 저장소:
- Backend/API: `phonarawd/AI-Profit-OS`
- Admin/Ops: `phonarawd/putduk-ops`
- User Web: `phonarawd/putduk-web`

운영 데이터베이스:
- Supabase project ref: `mgsytcetsiecllmhcyox`
- URL: `https://mgsytcetsiecllmhcyox.supabase.co`

배포 경계:
- User Web: Cloudflare only
- Admin/Ops: Cloudflare only
- Backend API: Render — 신규 PUTDUK 광산 전용 서비스만 사용
- 기존 리셀/eBay Render 서비스: 동결. 광산 백엔드로 재사용·설정변경 금지, 이후 명시적 정리 PHASE 전까지 보존
- Public API: Cloudflare가 관리하는 도메인/DNS/proxy를 통해 광산 전용 Render backend로 연결
- Supabase: DB / ledger / mining data authority
- Vercel: 다른 프로젝트. 조회·연동·설정 변경·배포에 사용 금지.

기존 REL 계획은 `.cursor/plans/PUTDUK_RELEASE_MASTER.legacy-rel.plan.md`에 바이트 그대로 보존한다. 과거 완료 증거는 재사용할 수 있으나, 현재 광산 전환 단계의 완료를 대신하지 않는다.

## 1. 실행 절대 규칙

1. 한 번에 한 PHASE만 작업한다.
2. 각 PHASE 완료 후 반드시 멈춘다.
3. 관리자가 `진행하라`라고 명시해야 다음 PHASE로 이동한다.
4. 단계 내부 기본 순서: schema → service → controller → tests → validation → commit.
5. 기본 저장소 순서: `AI-Profit-OS` → `putduk-ops` → `putduk-web`.
6. 실패한 테스트, 타입검사, 금융대사, 보안검사, 실제 연결 검사가 있으면 완료 선언 금지.
7. mock/placeholder/격리시험 성공은 실제 운영 PASS로 인정하지 않는다.
8. 금융 정확성 → 재시도 안전 → API 계약 → 기능 → UI/UX → 애니메이션 순으로 우선한다.
9. 기존 금융원장과 지갑 버킷을 재사용한다. 별도 balance 시스템 생성 금지.
10. 사용자 화면에서 내부 enum, 테스트용어, 개발용어, 원시 오류코드, 전문용어, 불필요한 영어 상태값을 직접 노출하지 않는다.
11. 사용자 화면의 기존 리셀/기회/상품/참여/매칭/거래 세계관은 광산 세계관으로 완전히 교체한다.
12. 잔재 삭제는 의존성 확인 후 안전하게 수행하며 금융·인증 기반까지 함께 삭제하지 않는다.
13. 모바일 가로모드는 별도 출시 게이트다.
14. GitHub Actions 사용량이 소진된 동안 새 실행을 남발하지 않는다. 로컬/실서비스 검증 결과와 Actions 미실행 상태를 구분 기록한다.
15. 프로덕션 DB 파괴적 변경은 해당 PHASE의 명시적 계획과 검증 없이 수행하지 않는다.

## 2. 사용자 UI/UX 권위

디자인 컨셉: `PUTDUK MINE OS — Mineral Luxury`

Light:
- Mineral White
- Champagne Gold
- Graphite

Dark:
- Deep Graphite
- Titanium
- Warm Gold

경험 원칙:
- 프리미엄 디지털 광산 운영 OS
- 금융 앱의 신뢰감 + 광산 관제실의 몰입감
- 코인 카지노/네온/리셀 쇼핑몰 느낌 금지
- 홈의 우선순위: 오늘 채굴 → 운용 중 → 출금 가능 → 내 광산 → 최근 정산
- 확정수익과 발생 중 수익을 시각적으로 구분
- 프론트는 실시간 숫자를 보간할 수 있으나 금융 원본 계산 권위는 서버에 둔다.
- 서버 성공 전 운용 성공 UI를 만들지 않는다.

모바일 가로 기본 구조:
- 왼쪽: 메뉴
- 중앙: 채굴기/광산 시각화
- 오른쪽: 금액·수익·행동 버튼

## 3. PHASE 00 — 전체 실물 동결

목표: 추측 없이 현재 3개 저장소, Supabase, 배포 경계를 동결한다.

필수 확인:

Backend:
- main SHA
- migrations/tables
- ledger/wallet buckets
- deposits/withdrawals
- KYC
- admin API
- Rust engine
- CI/workflow 상태

User Web:
- main SHA
- 전체 route
- 홈/기회/입출금/로그인/가입/가로모드/퍼뜩AI
- 전체 API 호출
- 리셀 잔재
- 사용자에게 노출될 수 있는 내부 오류코드/시험문구

Admin/Ops:
- main SHA
- 로그인/회원/입금/출금/상품/콘텐츠/KYC
- live API와 isolated/mock 분리
- 아직 연결되지 않은 화면
- 사용자/운영자에게 노출되는 시험·개발 용어

Supabase:
- public tables
- migrations
- RLS
- policies
- functions
- triggers
- 광산 테이블 존재 여부
- 리셀 계열 잔재

산출물:
- `governance/mining/MINE-000-CURRENT-BASELINE.md`
- 3개 저장소 SHA 기록

통과조건:
- 현재 상태를 모르는 핵심 파일/라우트/API/DB 계층 = 0
- 배포 경계 혼선 = 0
- 다음 단계에서 보존/대체/제거/보안점검할 항목 분류 완료

## 4. PHASE 01 — 광산 계약 잠금

기능 구현 전에 3개 저장소의 용어와 API 계약을 통일한다.

상태 계약:
- 광산: 준비 / 가동 / 신규운용중지 / 일시정지 / 종료
- 운용: 시작대기 / 운용중 / 감액처리중 / 종료처리중 / 종료
- 정산: 계산대기 / 계산완료 / 원장반영완료 / 실패 / 검토필요
- 수익률: 초안 / 승인대기 / 예약 / 적용중 / 종료
- 체험: 미시작 / 진행중 / 완료 / 만료

사용자 계약:
- 광산 목록/상세
- 내 채굴 요약/운용목록
- 운용 시작/증액/감액/종료
- 정산내역
- 체험 상태/시작

관리자 계약:
- 광산/수익률 관리
- 운용/정산 조회
- 체험 설정
- 고액운용 검토

통과조건: 같은 개념을 서로 다른 이름으로 부르는 계약 = 0.

## 5. PHASE 02 — 데이터베이스·금융 기반

Backend/Supabase 중심.

신규 후보 테이블:
- `mines`
- `mine_rate_versions`
- `mine_positions`
- `mine_accruals`
- `mine_settlements`
- `mine_trial_sessions`
- `mine_high_value_reviews` 필요 시

절대조건:
- 기존 double-entry ledger와 principal/profit/locked/trial 버킷 재사용
- 독립 balance 시스템 금지
- 원금 + 잠금 + 수익 + 체험 = 사용자 책임금액
- 원장대사 오차 0원

## 6. PHASE 03 — Rust 수익계산 엔진

입력: 원금, 적용 수익률, 시작/종료 시각, 정밀도 규칙.
출력: 발생수익.

검증: 1초/1분/1시간/23:59:59/자정/윤년/월말/수익률 경계/증액·감액 경계.
동일 입력 100회 동일 결과, 난수 0, 부동소수점 금융오차 0.

## 7. PHASE 04 — 운용·자동정산 API

읽기 먼저, 쓰기 다음.
- 목록/상세/내 운용/내 정산
- 시작/증액/감액/종료
- 발생수익/일일정산/profit 원장반영/실패복구

절대조건: 같은 정산 재실행으로 중복 지급 불가.

## 8. PHASE 05 — 관리자 API

- 광산 생성/수정/공개/신규운용중지/종료
- 수익률 초안/승인요청/승인/예약/이력
- 운용 조회
- 정산 조회/재실행
- 광산 긴급중지/전체 신규운용중지/정산보류

## 9. PHASE 06 — putduk-ops 광산 운영콘솔

실제 Nest API만 완료 증거로 인정.

메뉴:
- 오늘 할 일: 입금/출금/KYC/고액운용/정산오류/수익률승인
- 광산 관리
- 수익률 관리
- 운용 현황
- 정산 관리

완료 E2E: 광산 생성 → 수익률 작성 → 승인 → 공개.

기존 상품/기회/등급 중심 운영 UI는 광산 도메인으로 대체하고 불필요 잔재를 제거한다.

## 10. PHASE 07 — putduk-web 상태구조 리베이스

- MiningContext: mines/positions/live profit/settlements
- WalletContext: balance/deposit/withdrawable/withdrawal
- GptContext: 로그인 세션/퍼뜩AI/공통 UI로 축소

## 11. PHASE 08 — 사용자 채굴 홈

리셀 중심 홈 제거.
상단: 오늘 채굴 / 운용 중 / 출금 가능.
아래: 내 채굴장 / 최근 정산.
하단 `기회`를 `광산`으로 교체. `/work`는 전환 기간에만 내부 호환 가능하며 사용자 표시명은 광산.

## 12. PHASE 09 — 광산 목록·상세·운용

광산 선택 → 상세 → 금액 → 조건확인 → 서버 운용 시작 → 성공 후 활성화.
증액/감액/종료 모두 실제 API.

## 13. PHASE 10 — 실시간 채굴 숫자

서버 기준값: baseline accrued profit, baseline time, current rate, principal, next settlement.
클라이언트는 표시 보간만 수행.
재동기화: 진입/복귀/재연결/광산변경/증액/감액/수익률변경/정산완료.

## 14. PHASE 11 — 체험 채굴

가입 → 관심광산 → 체험원금 → 추천배치 → 체험채굴 → 다음날 복귀 → 완료.
동일 계산엔진 사용, 실제 금융원장과 체험 버킷은 분리.

## 15. PHASE 12 — 첫 실제보상·소액출금

체험완료 → 운영자 프로모션 → 실제 profit → 출금신청 → 운영자승인 → 실제 출금 E2E.

## 16. PHASE 13 — 실제 입금·실제 운용

KRW: 신청 → 송금 → 운영자 확인 → 지갑 → 광산 → 운용.
USDT: 기존 주소 → 입금확인 → 원장 → 광산운용.

## 17. PHASE 14 — 광산 애니메이션

금 → SK하이닉스 → 비트코인 → 은 → 삼성전자 → 시장묶음 순으로 하나씩 구현·성능검증.
금융 기능 완료 전 애니메이션 우선 구현 금지.

## 18. PHASE 15 — 모바일·태블릿·가로모드

모바일 세로/가로, 태블릿 세로/가로, 데스크톱 모두 독립 PASS.
로그인/가입 가로모드 스크롤, 키보드, 제출버튼 접근, safe-area 검증.
높은 모달은 내부 스크롤.

## 19. PHASE 16 — 퍼뜩AI·알림

AI는 내 운용/광산/배분안/정산을 설명하되 자동 자금이동 금지.
알림: 입금확인/채굴시작/수익확정/수익률변경예정/출금완료/체험종료/광산중지.

## 20. PHASE 17 — 고액운용

관리자 설정 임계값 이상: 입금 → 운용신청 → 고액검토 → 승인 → 시작.
임계값 하드코딩 금지.

## 21. PHASE 18 — 금융 전수검증

1원, 10만원, 100만원, 1000만원, 1억원.
일/월/수익률변경/증액/감액/부분종료/전체종료/정산실패 재시도/출금실패/중복요청.

## 22. PHASE 19 — 장애·복구 검증

Redis 중단, DB timeout, API 재시작, 운용 시작 중 브라우저 종료, 정산 중 서버 재시작, 중복요청, 네트워크 지연, 오래된 화면, 수익률 변경 장애.
중복 지급·유실 0.

## 23. PHASE 20 — 보안·권한

타인 운용 조회 차단, 일반운영자 승인 차단, 승인권한 분리, 읽기전용 금융변경 차단, 직접 API 우회 차단.

## 24. PHASE 21 — 성능

Frontend: 첫 화면/채굴숫자/애니메이션/회전/장시간/메모리누수.
Backend: 1만 사용자/10만 운용위치/동시조회/자정정산/재시도 부하.

## 25. PHASE 22 — 3레포 전체 E2E

A 가입 → 체험 → 첫보상 → 출금.
B 100만원 입금 → 승인 → 금 → 하루정산 → 수익출금.
C 1000만원 → 하이닉스 500 + 금 500 → 증액 → 부분감액 → 정산.
D 1억원 → 고액검토 → 승인 → 운용 → 수익출금 → 일부 원금 종료.

## 26. PHASE 23 — 제한 운영

내부 → 지정시험 → 제한사용자 순으로 실제 입금/운용/정산/출금 검증.

## 27. PHASE 24 — 출시 전 원장대사

1원 차이도 금지.
- 총 principal ledger = 사용자 principal buckets
- 활성 principal = 활성 mine_positions 합
- 확정 profit = profit ledger
- pending withdraw = locked withdrawal
- settlement total = settlement ledger

## 28. PHASE 25 — 프로덕션 출시

1. Backend 배포, 광산 feature flag OFF
2. Ops 배포 및 운영자 확인
3. User Web Cloudflare 배포 및 내부 확인
4. 광산 feature flag ON

Vercel 사용 금지.

## 29. PHASE 26 — 기존 리셀 잔여 정리

광산 안정화 후 최종 청소.
- 사용자 노출 리셀 코드/문구/라우트 완전 제거
- 미사용 컴포넌트/API 격리 후 제거
- 리셀 테이블 read-only/보관 정책 적용 후 단계적 폐기
- 인증/원장/입출금 등 재사용 기반은 삭제 금지

## 30. 각 PHASE 완료보고 형식

1. 완료한 작업
2. 변경한 파일
3. DB / Supabase 변경사항
4. API 변경사항
5. 테스트 / 검증 결과
6. 남은 문제
7. 다음 단계 딱 하나

남은 문제 또는 실패 게이트가 있으면 `완료`라고 쓰지 않는다.