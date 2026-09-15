# 운영자 횟수·등급 B2 (2026-09-14)

SSOT: `PUTDUK_BACKEND_CURSOR_FINAL_PROMPT_QUOTA_GRADE_20260914.md` §16 B2a–B6.
선행 B1: `quality/operator-quota-grade-b1-20260914.md` (기간 미확정 항목은 이 보고로 대체).
HEAD: `27b5b9f71f4350ca69f3e657be9b26957e91d8d1`. commit/push/운영 DB 0.

## 대체된 B1 BLOCKED

- “처음 5회가 일일/누적/체험인지” → **매일 5회 확정**. 누적/체험 5 아님.
- sprout ladder 숫자를 5로 바꾸지 말라는 B1 주석은 신규 기본 경로에 한해 해제.
  관측 `MEMBERSHIP_LADDER.sprout=8` 은 기존 표로 유지. 신규/ensure default=5.

## 구현

- 신규 기본 5, KST 하루, 기존 행 cap 8 보존.
- 등급별 하루 정책 편집(다른 등급 불변, revision, backfill 0). 영속은 memory draft.
- 회원 추가 지급/회수/멱등. 기본 소진 후 추가 참여. 0 차단·정지는 지급으로 해제 안 함.
- force/reapply가 개별 cap override를 덮지 않음.
- 자동 하향 구조, `enabled=false`.
- 연출 v19 검증. F09/F10 dry-run. 허위 성공 제외.

## 검증

격리/HTTP mock. AdminGuard 통합 HTTP·실 Postgres 아님.

## 운영 완료 아님

S1 실 DB BLOCKED 유지. S2 착수 없음. 전체 운영 연결 없음.
