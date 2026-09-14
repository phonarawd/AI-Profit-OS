# 운영자 횟수·등급 B1 (2026-09-14)

SSOT: `PUTDUK_BACKEND_CURSOR_FINAL_PROMPT_QUOTA_GRADE_20260914.md` §16 B0→B1.
조사: `PUTDUK_GLOBAL_OPERATOR_CONTROL_RESEARCH_20260914.md`.
HEAD 당시: `27b5b9f71f4350ca69f3e657be9b26957e91d8d1`. 커밋/푸시/운영 DB 없음.

## 구현됨 (B1)

- 0은 명시 차단. `Number(x)||default` 제거.
- 회원별 cap: override → membership row → ladder → policy.
- used는 userId의 KST accepted `participate_requests` (기존).
- cap-only write: `PUT /api/v1/admin/users/:id/membership/daily-match-cap`
  및 기존 match-policy PUT에 `capOnly` / 횟수만 보낸 경우.
- 품질(minProfit/stale/strictness) 불변.
- effective-preview / GET membership / GET /me/membership 에 quota
  (cap, used, remaining≥0, blocked, source).
- `gradeControl`: 기존 `admin_force` 별칭 MANUAL_PIN | AUTO. 자동 하향 없음.

## 계약 초안 (활성화 없음)

- 신규 기본 5: 구조만. sprout ladder는 8 유지.
- 기간/차감/반환/자동하향: 미승인. 숫자 하드코딩 금지.
- 연출 초 profile/version: 기존 durationSecMin/Max·steps 재사용 제안.
- 회원360·일괄·상담 원문: API 계약만.

## BLOCKED

- ~~처음 5회가 일일/누적/체험인지.~~ **대체됨 (B2)**: 신규는 매일 5회. 누적/체험 아님.
- 예약 vs accepted vs 완료 차감. 취소/실패/requeue 반환. (유지)
- 자동 하향 지표·유예·평가 주기. (구조만 B2, 실조건 유지)
- 실 DB 마지막 1회 동시성. 운영 JWT revoke 즉시 차단. (유지)
- catalog S2. 운영 API/DB/R2. commit/push. (유지)

## 미검증

- 실 Postgres FOR UPDATE / 다중 instance.
- Nest AdminGuard + 이 경로의 통합 HTTP (이번은 격리 HTTP).
- putduk-ops / putduk-web 화면.
- `index.d.ts` 타입 추가는 훅 거절로 못 함. runtime export는 membership.cjs.
