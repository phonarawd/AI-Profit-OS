# PUTDUK MINE 통합 로컬 개발 기준선 — 2026-09-25

## 목적

세 저장소가 같은 Mine OS 리빌드 방향에서 작업하도록 현재 기준 커밋을 고정한다.

| 영역 | 저장소 | 기준 브랜치 | 기준 커밋 |
|---|---|---|---|
| Backend / API / Engine | `phonarawd/AI-Profit-OS` | `integration/mine-os-local-baseline-20260925` | `944fa2b9158ee2840d578f263a9c28d68cf7ee93` |
| 회원 Web | `phonarawd/putduk-web` | `integration/mine-os-local-baseline-20260925` | `171fe1ff6a052a4587c2beaf36751196ab9da83d` |
| 운영자 Ops | `phonarawd/putduk-ops` | `integration/mine-os-local-baseline-20260925` | `660e951e1a43acce284dea6b23d61316a36fa063` |

## 개발 기준

- Mine OS가 현재 제품 기준이다.
- Supabase Cloud는 이 단계에서 사용하지 않는다.
- Backend는 기존 로컬 PostgreSQL/Redis 개발 스택을 사용한다.
- Web/Ops는 로컬 API `http://127.0.0.1:4000`을 기본 개발 원점으로 삼을 수 있어야 한다.
- Production DB와 Production 배포는 이 기준선 작업의 범위가 아니다.

## 다음 1순위 구현

1. 기존 전체 migration을 로컬 PostgreSQL에서 안전하게 재현하는 migration runner.
2. 로컬 API 인증/관리자 로그인 경로.
3. Web/Ops의 로컬 API 연결.
4. 그 위에서 Mine 운영자 Control Center와 회원 Mine UI/UX 전면 리빌드.
