# Admin Control Plane Superset

STATUS: SPEC_ONLY
DATE: 2026-08-22
REL: REL-400
IMPLEMENTATION_IN_THIS_REL: 0

이 문서는 kill-switch UI / audit UI / RBAC 관리 UI의 계약이다.
화면·서버 구현은 후속 REL이 이 계약을 소비한다. 이 REL에 구현 PR을 섞지 않는다.

## Locked terminology — 3-mode

| Mode | 뜻 | 권위 |
|---|---|---|
| `LIVE` | 실제 운영 상태를 읽거나 실제 운영 상태를 바꾼다 | 서버 authoritative owner |
| `DRY_RUN` | 실제 상태를 바꾸지 않는다. 적용 결과 미리보기만 | 서버 preview. 클라이언트 추측 0 |
| `SIMULATION` | 시뮬 엔진 입력/리포트. 운영 LIVE 상태가 아니다 | 기존 simulation owner (`/admin/growth?tab=simulation`) |

REL-222가 3-mode Admin Ops를 구현한다. 본 스펙은 용어만 고정한다.
UI 토글이 `LIVE`로 보이면 서버 LIVE여야 한다. 로컬 state로 LIVE를 위조하지 않는다.

## Surfaces

| Surface | REL | Owner app | 구현 시점 |
|---|---|---|---|
| `/admin/system-control` | REL-213 | `apps/admin` | REL-400 이후 |
| `/admin/audit` | REL-214 | `apps/admin` | REL-400 이후 |
| RBAC + mandatory audit schema | REL-405 | `schemas/admin-rbac.v1.json` + api-nest + supabase | REL-400 이후 |
| Kill Switch 9종 서버 enforce | REL-406 | money_circuit 선례 재사용 | REL-405 이후. UI는 REL-213 |

유저앱(`apps/web`)에 Admin IA를 이식하지 않는다.

## Existing authoritative owners (reuse)

새 Admin 프레임워크 / 새 RBAC / 새 audit 엔진 / 새 money owner를 만들지 않는다.

| 대상 | 현재 owner | 비고 |
|---|---|---|
| Admin app | `apps/admin` | 12모듈 IA lock |
| Admin auth | `AdminGuard` + `admin-token.ts` | user JWT 200 금지 |
| RBAC matrix | `schemas/admin-rbac.v1.json` · `admin-rbac.policy.ts` | 토큰 capability 배열은 권위 0 |
| Route capability | `admin-capabilities.ts` | 미분류 핸들러 deny |
| Money circuit | `MoneyCircuitService` · `GET/POST /api/v1/admin/risk/circuit*` | UI 편집 owner = `/admin/risk`. system-control은 읽기만 |
| Push kill | `PushKillService` · `GET/PUT /api/v1/admin/system-control/push` | UI owner = REL-213 |
| Platform reserve | `PlatformReserveAdminService` · `GET/PUT /api/v1/admin/system-control/reserve*` | tab=reserve. ledger UPDATE 아님 |
| Domain audit (reserve) | `GET /api/v1/admin/system-control/reserve/audit` | reserve owner |
| Domain audit (execution-policy) | `GET /api/v1/admin/execution-policy/audit` | execution-policy owner |
| Domain audit (deposit-config) | `GET /api/v1/admin/wallet/deposit-config/audit` | wallet owner |
| Domain audit (referral) | `GET /api/v1/admin/growth/referral/program/audit` | growth owner |
| AI observation | `public.ai_logs` · `/admin/ai-logs` | audit가 아님 |
| Control-plane audit schema | REL-405 | 본 REL에서 테이블/쓰기 미들웨어 신설 0 |

## /admin/system-control — REL-213 contract

INTENT: 운영자가 치명 스위치를 사람 확인 후 켤 수 있어야 한다.

CURRENT_SCOPE:

- 경로: `/admin/system-control`
- 탭: `circuit`(기본) · `reserve`
- REL-406 9종 스위치의 UI. 서버 카탈로그가 없으면 **unavailable**. ID를 화면이 창작하지 않는다.
- 예비 이름 하나(상수 확정은 REL-406): `GLOBAL_OPPORTUNITY_PAUSE`
- `preview → confirm` 없이 치명 스위치를 적용하지 않는다.
- 유저 money 회로를 이 화면에서 직접 닫거나 열지 않는다. 회로 상태는 읽고 `/admin/risk`로 보낸다.
- 유저 잔액·원장 편집 0
- secret/토큰 화면 노출 0

REAL owners this page may call:

1. `GET/PUT /api/v1/admin/system-control/push` — 알림 긴급 정지
2. `GET /api/v1/admin/risk/circuit` — 돈 회로 **읽기**
3. `GET/PUT /api/v1/admin/system-control/reserve` · `GET .../reserve/audit` — 운영 준비금 목표
4. REL-406 카탈로그가 생기면 그 GET만. 없으면 위조 enabled/disabled 0

Control action:

```text
UI preview → confirm → Admin JWT API → existing owner → server validation → state mutation → truthful response
```

클라이언트 토글 → 로컬 success 금지.
서버 액션이 없으면 unavailable. 가짜 적용 0.

Truthful UX: loading / empty / unavailable / error / 실상태.
없는 데이터를 0·healthy·active·enabled로 만들지 않는다.
reserve `isSet=false`이면 목표를 0으로 표시하지 않는다.

EXIT_GATE: 유저 JWT로 Admin API 200이면 FAIL.

## /admin/audit — REL-214 contract

INTENT: 누가 무엇을 바꿨는지 감사 로그가 남아야 한다.

CURRENT_SCOPE:

- 경로: `/admin/audit`
- REL-405 audit schema를 소비한다. 스키마가 없으면 해당 패널은 unavailable.
- 기존 도메인 audit GET은 **각자 패널**로 읽는다. 한 테이블로 섞지 않는다.
- 로그 삭제 UI 0
- 가짜 audit row 0
- AI observation ≠ domain audit ≠ ledger ≠ settlement

Allowed reads (existing):

- REL-405 control-plane audit — 미구현이면 unavailable
- reserve audit
- execution-policy audit
- deposit-config audit
- referral program audit

Forbidden:

- `/admin/ai-logs` 행을 audit row로 재라벨
- application log / console log를 audit로 위조
- 클라이언트에서 audit row 생성
- secret / Authorization / cookie / token 원문 표시

Sensitive values: 기존 redaction을 재사용. 두 번째 마스킹 아키텍처 신설 0.

EXIT_GATE: 유저 JWT로 Admin API 200이면 FAIL.

## RBAC management — REL-405 contract (server)

INTENT: Admin 역할과 감사 스키마가 서버에 있어야 UI가 의미가 있다.

CURRENT matrix owner = `schemas/admin-rbac.v1.json`.

오늘 코드화된 역할 5:

- `super` · `finance` · `cs` · `risk` · `marketing`

REL-405 CURRENT_SCOPE = 8 role capability mapping + mandatory audit schema.
추가 역할 이름은 REL-405가 매트릭스 owner를 **확장**할 때 고정한다.
본 스펙은 역할 ID를 창작하지 않는다. 두 번째 RBAC 파일을 만들지 않는다.

규칙:

- capability는 서버 매트릭스만. 토큰에 심은 permission 배열은 권위 0
- 미분류 admin handler = deny (`ADMIN_CAPABILITY_UNCLASSIFIED`)
- 권한 없는 조치 = 403 + (REL-405 이후) audit write
- UI만 있고 서버 가드 없으면 FAIL

RBAC **관리 화면**은 매트릭스 편집 UI를 본 배치에서 신설하지 않는다.
권위는 서버 파일이다.

## Kill Switch 9종 — REL-406 contract (server)

INTENT: 치명 상황에서 기회/매칭/출금 등을 서버가 멈출 수 있어야 한다.

- 9종 목록은 REL-406이 코드 상수로 고정한다
- 서버 enforce. UI 우회 불가
- money_circuit 선례 재사용. 두 번째 circuit owner 신설 0
- audit 필수 (REL-405 schema)
- UI는 REL-213. 토글만 있고 서버가 무시하면 FAIL

REL-213은 REL-406 상수를 창작하지 않는다.

## Control action rule (all hardening Admin)

```text
UI
→ authenticated Admin API
→ authoritative service/owner
→ server-side validation
→ authoritative state mutation
→ audit/event where required
→ truthful response
```

NOT: UI toggle → local state → "success"

## Auth / security

- Admin remains `apps/admin`
- `USER_JWT_ADMIN_200 = 0`
- AdminGuard / RBAC / audit를 약화하지 않는다
- 브라우저/클라이언트 state는 control-plane 권위가 아니다

## Money / Identity / AI Coach

- 두 번째 money / ledger / FX / settlement owner 0
- balance column UPDATE를 SoT로 쓰지 않는다
- Identity V1 fail-closed를 재설계하지 않는다
- REL-300~305 / REL-215 재오픈 0. Coach 아키텍처 변경 0

## Consumer protection

Home / Auth / Wallet / Account Hub / 퍼뜩 AI Consumer / Opportunity / Participation
시각 재설계 0.

## Follow-on mapping

| REL | 이 스펙을 어떻게 소비하는가 |
|---|---|
| REL-213 | system-control UI. 실데이터 또는 정직한 empty/unavailable |
| REL-214 | audit UI. 스키마/도메인 audit 실읽기. 삭제 0 |
| REL-405 | 8 role mapping + mandatory audit schema 서버 |
| REL-406 | 9종 스위치 상수 + 서버 enforce. UI는 213 |
| REL-222 | 3-mode LIVE/DRY_RUN/SIMULATION 런타임 |
