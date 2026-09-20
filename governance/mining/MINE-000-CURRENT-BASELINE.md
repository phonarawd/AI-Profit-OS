# MINE-000 현재 기준 동결

- 관측일: 2026-09-20
- 상태: ACTIVE / PHASE 00 NOT YET PASSED
- 목적: 광산 전환 전 3개 저장소·운영 DB·배포 경계를 현재 실물 기준으로 고정한다.
- 원칙: 이 문서는 추측이 아니라 현재 main/운영 리소스 실측만 기록한다.

## 1. Canonical repositories

| 역할 | 저장소 | 기준 branch | 기준 SHA |
|---|---|---|---|
| Backend / API | `phonarawd/AI-Profit-OS` | `main` | `ad395b4fa9f5d82c4dd2ac64d5eafa5c7ee4e8fd` |
| User Web | `phonarawd/putduk-web` | `main` | `49fbb36d9dca527212daf49bf82765e04deaa3e6` |
| Admin / Ops | `phonarawd/putduk-ops` | `main` | `070c98e7b28a37c0a615baac18ebd9631ceab2ce` |

Audit branch:

`audit/mine-baseline-20260316`

이 브랜치는 관측 시점 Backend `main` SHA와 동일한 기준점에서 시작한다.

## 2. Deployment boundary — HARD LOCK

### Production deployment policy

- User Web: **Cloudflare only**
- Admin / Ops: **Cloudflare only**
- Backend API: 현재 Render 계층 유지
- Vercel: **별도 프로젝트. 본 프로젝트와 무관. 조회·설정 변경·연동·배포 금지**

Vercel 프로젝트를 이 프로젝트의 배포 증거, 환경설정, 도메인, CI/CD 또는 fallback으로 사용하지 않는다.

### Current Cloudflare-ready code evidence

`putduk-web/package.json`에는 `@opennextjs/cloudflare`, `wrangler`, `opennextjs-cloudflare build/preview/deploy` 스크립트가 존재한다.

`putduk-ops/package.json`에는 Cloudflare Workers/Vite 계열 의존성, `wrangler`, `deploy:ops` Cloudflare 배포 스크립트가 존재한다.

따라서 이후 USER/OPS 배포 설계·검증은 Cloudflare 경로만 대상으로 한다.

## 3. Backend / production database baseline

관측된 현재 상태:

- 운영 public 테이블: 120
- 광산 전용 테이블: 0
- 현재 이름 기준 리셀/기회/상품/참여/매칭/거래/추천/등급/체험 직접 관련 잔재: 최소 35
- 적용 migration: 73
- 최신 적용 migration version: `20260916142723`
- `trade_execution_confirmations`는 RLS 비활성 상태가 확인되어 보안 검토 대상으로 유지

판정:

- 광산 데이터 모델은 아직 운영 DB에 적용되지 않았다.
- 기존 금융원장·지갑·입금·출금·인증 기반은 보존 후보이다.
- 기존 Opportunity/Participation/Matching/Trade 중심 모델을 광산 모델과 동일한 것으로 간주하지 않는다.
- 운영 DB write/migration은 PHASE 00에서 수행하지 않는다.

## 4. User Web baseline

현재 `main`에는 광산 전환 후 제거/대체 대상인 리셀/기회 중심 사용자 흐름이 존재한다.

확인된 예:

- 홈의 리셀 업무/리셀러 데스크/기회/시세 매칭 계열 표현
- 기존 기회/업무 흐름
- `/invite`, `/work` 등 기존 IA

보존 후보:

- 인증/로그인/회원가입
- `/wallet`
- `/me`
- `/ai`
- 공통 API client와 refresh 흐름
- 금융 관련 실서버 연결부

Cloudflare 배포 구성은 이미 코드베이스에 존재하므로, Vercel 전환/연동 작업은 만들지 않는다.

## 5. Admin / Ops baseline

현재 `putduk-ops`는 별도 관리자 저장소이며 Cloudflare 배포 스크립트를 보유한다.

광산 전환 시 기존 상품/기회/콘텐츠/회원/입출금/본인확인 기능을 각각 다음으로 분류해야 한다.

- 그대로 보존
- 광산 용어/도메인으로 대체
- 삭제
- API 실연결 필요
- mock/placeholder 제거 필요

PHASE 00에서는 기능 변경보다 실제 연결 여부와 현재 상태를 확정한다.

## 6. MINE-000 pass gate

다음이 0이 되기 전 PHASE 01로 넘어가지 않는다.

- 상태를 모르는 backend controller/API
- 상태를 모르는 DB table/migration
- 상태를 모르는 user route/button/API call
- 상태를 모르는 admin route/action/API call
- 출처 불명 mock/fake finance mutation
- 배포 경계 혼선

특히 배포 경계는 다음으로 고정한다.

`USER/OPS = Cloudflare`

`API = Render (current baseline)`

`Vercel = OUT OF SCOPE / DO NOT TOUCH`

## 7. Current verdict

`MINE-000 = IN_PROGRESS`

이 문서는 기준점을 동결했지만, 전체 route/controller/button/API exhaustive inventory가 아직 완료되지 않았으므로 PASS를 선언하지 않는다.
