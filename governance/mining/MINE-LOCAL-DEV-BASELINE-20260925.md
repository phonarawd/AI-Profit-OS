# PUTDUK MINE 로컬 개발 기준선

## 목적

2026-09-25 현재 Mine 리빌드 작업은 Supabase 운영 프로젝트에 의존하지 않고 시작한다.

이 기준선은 다음 흐름을 먼저 로컬에서 고정하기 위한 것이다.

```
운영자 제어
→ Mine 상태
→ 회원 화면 반영
→ 수익 계산
→ 정산
```

## 로컬 인프라

- PostgreSQL 17: `127.0.0.1:5432`
- Redis 7: `127.0.0.1:6379`
- Docker compose: `docker-compose.dev.yml`
- Supabase Cloud: 기존 Production SSOT로 유지하되 이 작업 단계에서는 변경하지 않음

기존 백엔드는 이미 PostgreSQL `DATABASE_URL`을 직접 사용하는 구조이며, Supabase Auth를 사용하지 않는다.

## 현재 단계의 원칙

1. Production Supabase는 SSOT로 보존하며, 현재 단계에서는 변경 금지.
2. 로컬 개발은 `DATABASE_URL`을 로컬 PostgreSQL로 지정할 수 있으며, 기존 `SUPABASE_URL`, `SUPABASE_PROJECT_REF` 연결 정보는 삭제하지 않는다.
3. 새로운 Supabase 직접 호출 코드를 추가하지 않는다.
4. Mine UI/UX와 운영자 Control 흐름은 로컬 환경에서 먼저 완성한다.
5. 실제 Ledger/Wallet 영속성 검증은 별도의 격리 DB 단계에서 진행한다.
6. 이 단계에서 "로컬 DB가 Production과 동일하게 마이그레이션되었다"고 주장하지 않는다.

## 명령

```
pnpm mine:local:preflight
pnpm mine:local:up
pnpm mine:local:status
pnpm dev:api
```

## 다음 단계

이 기준선 다음 작업은 **기존 Mine migration 전체를 로컬 PostgreSQL에서 재현할 수 있는 안전한 migration runner**를 만드는 것이다.

그 이후에 Web/Ops를 로컬 API에 연결하고 Mine UI/UX 전면 리빌드를 진행한다.
