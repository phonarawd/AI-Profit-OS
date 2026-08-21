---
name: "PUTDUK Current Master — Track D: Admin Control Plane"
overview: "governance/admin/admin-control-plane.v1.json(FOUNDER_REQUIREMENTS_LOCK)의 17개 requiredCapabilities SUPERSET을 구현. 04 legacy 17 pending 전부 이 SUPERSET 안에 흡수(삭제 없음). apps/admin에 이미 20개 route가 존재하며 일부 backend(execution-policy·user-opportunity-override)는 이미 live — stale status만 마감. RBAC/Audit/Kill-Switch는 product 취향이 아니라 실거래 launch의 기술/보안 baseline(OWASP ASVS L2/L3 + 기존 money_circuit 선례)."
todos:
  - id: d-admin-001
    content: "[D-ADMIN-001] RBAC + Audit Foundation · SOURCE=admin-control-plane.v1.json SLICE_1(신규, 04 legacy에 직접 대응 todo 없음) · PRIORITY=TECHNICAL_LAUNCH_REQUIREMENT · AUTHORITY=EXTERNAL_SECURITY_STANDARD(OWASP ASVS v5.0.0 V8/V16)+INTERNAL_REQUIREMENT · RISK=HIGH"
    status: pending
  - id: d-admin-002
    content: "[D-ADMIN-002] Kill Switch(9종: GLOBAL_OPPORTUNITY_PAUSE 등) · SOURCE=admin-control-plane.v1.json(신규) · PRIORITY=TECHNICAL_LAUNCH_REQUIREMENT · AUTHORITY=INTERNAL_HIGH_RISK_OPERATIONAL_REQUIREMENT(OWASP가 9종을 직접 요구하지 않음 — PUTDUK money/ops fail-safe+Founder Admin lock에서 도출) · RISK=HIGH"
    status: pending
  - id: d-admin-003
    content: "[D-ADMIN-003] admin-ops 대시보드(TOP5·Founder 4질문) 마감 · legacy=04 admin-ops(pending) · apps/admin/app/admin/page.tsx 부분 존재(재확인) · PRIORITY=LAUNCH_REQUIRED · RISK=MEDIUM"
    status: pending
  - id: d-admin-004
    content: "[D-ADMIN-004] admin-user-ops(유저360+finance KPI) 마감 · legacy=04 admin-user-ops(pending) · apps/admin/app/admin/users/** 부분 존재 · PRIORITY=LAUNCH_REQUIRED · RISK=MEDIUM"
    status: pending
  - id: d-admin-005
    content: "[D-ADMIN-005] Price Override Engine(4레이어·7모드·10 scope) · legacy=04 admin-price-sync(pending)+lock price(신규 SUPERSET) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
  - id: d-admin-006
    content: "[D-ADMIN-006] Execution Policy UI 마감 확인(backend 이미 live: GET/PUT /api/v1/admin/execution-policy) · legacy=04 admin-execution-policy(pending, STALE_STATUS) + 03 admin-match-strictness-ui(completed, ABSORBED→Admin) · STATUS=PARTIAL(backend live)/CLOSE_VERIFICATION_ONLY · PRIORITY=LAUNCH_REQUIRED(마감만) · RISK=MEDIUM"
    status: pending
  - id: d-admin-007
    content: "[D-ADMIN-007] User Opportunity Override 마감 확인(backend 이미 live: DDL+Nest CRUD+RBAC) · legacy=04 admin-user-opportunity-override(pending, STALE_STATUS) · STATUS=PARTIAL(backend live)/CLOSE_VERIFICATION_ONLY · PRIORITY=LAUNCH_REQUIRED(마감만) · RISK=MEDIUM"
    status: pending
  - id: d-admin-008
    content: "[D-ADMIN-008] User/Segment Policy(등급표시·강제·성향메모·밴·로그인비번·출금PIN·매칭/출금 개별차단·1인쪽지) · legacy=04 admin-user-membership-credentials(pending)+admin-user-block-notify(pending) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
  - id: d-admin-009
    content: "[D-ADMIN-009] Growth Missions Admin · legacy=04 admin-growth-missions(pending) · Supabase mission_definitions(2 rows) 데이터모델 live, UI탭 깊이 REQUIRES_RUNTIME_AUDIT · PRIORITY=IMPORTANT_POST_CORE · RISK=MEDIUM"
    status: pending
  - id: d-admin-010
    content: "[D-ADMIN-010] Growth Partners Admin(순서·ON/OFF) · legacy=04 admin-growth-partners(pending) · 유저표기(03 market-partner-trust-surfaces, completed)와 이미 분리됨(중복 아님) · PRIORITY=IMPORTANT_POST_CORE · RISK=LOW"
    status: pending
  - id: d-admin-011
    content: "[D-ADMIN-011] Growth Ticker Admin(실활동 버전만) · legacy=04 admin-growth-ticker-organic(pending) · Organic Hybrid 합성 메커니즘=SUPERSEDED_DO_NOT_EXECUTE(Constitution §35 RETIRED_PRODUCTION_SYNTHETIC, 기능 자체는 보존) · PRIORITY=IMPORTANT_POST_CORE · RISK=MEDIUM"
    status: pending
  - id: d-admin-012
    content: "[D-ADMIN-012] AI/Peotteok Ops(coach|eval|pick|spotcheck) 마감 · legacy=04 admin-ai-peotteok-ops(pending) · apps/admin/app/admin/ai-logs/page.tsx 존재+Supabase ai_logs(305 rows) · PRIORITY=LAUNCH_REQUIRED · RISK=MEDIUM"
    status: pending
  - id: d-admin-013
    content: "[D-ADMIN-013] Abuse/Error Matrix(A1~·P1~P24·E1~E12·rate limit·circuit) · legacy=04 abuse-error-matrix(pending) · apps/admin/app/admin/risk/page.tsx+compliance/page.tsx 부분 존재 · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
  - id: d-admin-014
    content: "[D-ADMIN-014] Customer Support Ops(큐·SLA·dispute) 마감 · legacy=04 customer-support-ops(pending) · apps/admin/app/admin/support/page.tsx 존재 · PRIORITY=LAUNCH_REQUIRED · RISK=MEDIUM"
    status: pending
  - id: d-admin-015
    content: "[D-ADMIN-015] Product Analytics(D1/D7·퍼널 OTel) · legacy=04 product-analytics(pending) · PRIORITY=IMPORTANT_POST_CORE · RISK=LOW"
    status: pending
  - id: d-admin-016
    content: "[D-ADMIN-016] 3-mode(LIVE/DRY_RUN/SIMULATION)+Preview-As-User+Impact Simulation · legacy=04 redesign-r6-admin-three-mode-ops(pending)+lock simulation/previewAsUser(SUPERSET) · apps/admin/app/admin/system-control/page.tsx+Supabase simulation_runs 부분 존재 · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
  - id: d-admin-017
    content: "[D-ADMIN-017] Admin Isolated Deploy(별도 Ops Worker·IP allowlist) · legacy=04 admin-isolated-deploy(pending) · workers/ops-proxy 존재+apps/admin 이미 별도 앱 · PRIORITY=IMPORTANT_POST_CORE · RISK=MEDIUM"
    status: pending
  - id: d-admin-018
    content: "[D-ADMIN-018] Allocation/Manual Match control + Bulk/Schedule/Campaign · SOURCE=lock matchAllocation/manualOverride/scheduledOperations/bulk(SUPERSET, 04 legacy에 직접 대응 todo 없음) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
  - id: d-admin-019
    content: "[D-ADMIN-019] Source/Parser Health + Founder Override + Policy Versioning · SOURCE=lock sourceListing/founderOverride/policyVersioning(SUPERSET, 신규) · PRIORITY=LAUNCH_REQUIRED · RISK=MEDIUM"
    status: pending
  - id: d-admin-020
    content: "[D-ADMIN-020] Admin R6 certification(12모듈+2b 전수·3-mode·RBAC/MFA/IP/audit/rollback) · legacy=04 redesign-r6-admin-certification(pending) · PASS != 「퍼뜩 자동운영 출시 준비 완료」(별개, Track G) · PRIORITY=LAUNCH_REQUIRED · RISK=HIGH"
    status: pending
isProject: false
---
<!-- REL-017-AUTHORITY-STAMP -->
```text
EXECUTION_AUTHORITY = NO
CONTENT_AUTHORITY = YES
SUPERSEDED_FOR_EXECUTION_BY = PUTDUK_RELEASE_MASTER.plan.md
```
<!-- /REL-017-AUTHORITY-STAMP -->


> ```text
> classification = CURRENT_ACTIVE_TRACK
> CURRENT_ACTIVE_PLAN = YES
> TRACK = D (ADMIN CONTROL PLANE)
> ```
>
> `governance/admin/admin-control-plane.v1.json`은 `classification: FOUNDER_REQUIREMENTS_LOCK`이며
> `runtime: NOT_IMPLEMENTED`를 스스로 명시한다. 이 파일이 04 legacy 17개 pending의 **SUPERSET**이라는
> 것은 그 governance json 자신의 `coverageVs04Plan` 필드가 이미 선언해 두었다 — 이번 Track D는
> 그 SUPERSET을 실행 task로 전개한 것이며, 04 requirement를 하나도 삭제하지 않는다.

# Track D — Admin Control Plane

## Goal

```text
AUTOMATION + FOUNDER CONTROL + ADMIN OPERATIONS + POLICY ENGINE + AUDITABILITY
= PUTDUK ADMIN CONTROL PLANE
```

유저 UI 복잡도 = MINIMAL. Admin/backend 복잡도 = HIGH(원칙 유지).

## Current truth (evidence-based)

| 항목 | 상태 | Evidence |
|---|---|---|
| `apps/admin` 실제 route | 20개 존재 | page.tsx / users / opportunities / execution-policy / wallet / risk / compliance / ledger / system-control / support / ai-logs / adapters / audit / reports/financial / growth/{page,deposit,ticker,whale,content} |
| Admin Control Plane governance lock | `runtime: NOT_IMPLEMENTED` | `governance/admin/admin-control-plane.v1.json` |
| execution-policy backend | **live** | CATALOG.md `match-strictness`: Admin GET/PUT `/api/v1/admin/execution-policy` |
| user-opportunity-override backend | **live** | CATALOG.md: DDL+Nest CRUD+merge+RBAC |
| `admin_rbac` 테이블 | 존재(0 rows) | Supabase 실측 — 스키마는 있으나 실제 role 데이터 없음 |
| `money_circuit`(kill-switch 선례) | 존재(1 row, 실사용 중) | Supabase 실측 — BUCKET_INVARIANT_FAIL 자동 open |
| `simulation_runs`·`mission_definitions`(2 rows) | 존재 | Supabase 실측 |

## RBAC / Audit / Kill Switch — authority 근거 분리 (product 취향 아님)

```text
RBAC
  AUTHORITY = EXTERNAL_SECURITY_STANDARD(OWASP ASVS v5.0.0 V8 Authorization — L2/L3 금융앱 baseline,
              function/field-level access control 문서화·시행 요구) + INTERNAL_REQUIREMENT(admin-control-plane.v1.json)

AUDIT
  AUTHORITY = EXTERNAL_SECURITY_STANDARD(OWASP ASVS v5.0.0 V16 Security Logging — 인증/인가 결정 로깅,
              보안통제 우회시도 로깅, 로그 위변조 방지 요구) + INTERNAL_REQUIREMENT

KILL_SWITCH
  AUTHORITY = INTERNAL_HIGH_RISK_OPERATIONAL_REQUIREMENT
  (OWASP가 9종 kill switch를 직접 명시하지 않음 — 이것은 PUTDUK money/ops fail-safe 선례(money_circuit)
   + Founder Admin Control Plane lock에서 나오는 운영 요구사항이다. Role 이름·초기 ON/OFF 값은
   Founder가 언제든 변경 가능.)
```

## Tasks

| TASK_ID | TITLE | REQUIREMENT | SOURCE_TRACEABILITY | PRIORITY | PRIORITY_AUTHORITY | DEPENDS_ON(STRENGTH) | RISK |
|---|---|---|---|---|---|---|---|
| D-ADMIN-001 | RBAC+Audit Foundation | 8 role capability mapping+mandatory audit schema | lock SLICE_1(신규) | TECHNICAL_LAUNCH_REQUIREMENT | TECHNICAL_SAFETY_REQUIREMENT | 없음(선행 기초) | HIGH |
| D-ADMIN-002 | Kill Switch 9종 | named switch+FOUNDER_OR_HIGHEST_ROLE rbac | lock(신규) | TECHNICAL_LAUNCH_REQUIREMENT | TECHNICAL_SAFETY_REQUIREMENT | D-ADMIN-001(HARD) | HIGH |
| D-ADMIN-003 | admin-ops 대시보드 마감 | TOP5+Founder 4질문+human-readable audit feed | 04 `admin-ops`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | D-ADMIN-001(SOFT) | MEDIUM |
| D-ADMIN-004 | admin-user-ops 마감 | 유저360+finance KPI+OAuth표시+RBAC | 04 `admin-user-ops`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | D-ADMIN-001(SOFT) | MEDIUM |
| D-ADMIN-005 | Price Override Engine | 4레이어(SOURCE_OBSERVED→OVERRIDE→EFFECTIVE→USER_VISIBLE) | 04 `admin-price-sync`(pending)+lock price | LAUNCH_REQUIRED | PLAN_EXPLICIT+FOUNDER_EXPLICIT(SUPERSET) | 없음 | HIGH |
| D-ADMIN-006 | Execution Policy UI 마감 | UI만(backend live 확인됨) | 04 `admin-execution-policy`(pending)+03 `admin-match-strictness-ui`(completed) | LAUNCH_REQUIRED(마감) | PLAN_EXPLICIT | 없음 | MEDIUM |
| D-ADMIN-007 | User Opp Override 마감 | UI만(backend live 확인됨) | 04 `admin-user-opportunity-override`(pending) | LAUNCH_REQUIRED(마감) | PLAN_EXPLICIT | 없음 | MEDIUM |
| D-ADMIN-008 | User/Segment Policy | 멤버십강제/성향메모/밴/PIN/개별차단/1인쪽지 | 04 `admin-user-membership-credentials`+`admin-user-block-notify`(둘다 pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | D-ADMIN-001(SOFT) | HIGH |
| D-ADMIN-009 | Growth Missions | D/M/W/S catalog+budget | 04 `admin-growth-missions`(pending) | IMPORTANT_POST_CORE | PLAN_EXPLICIT | 없음 | MEDIUM |
| D-ADMIN-010 | Growth Partners | Tier-A 순서+ON/OFF+audit | 04 `admin-growth-partners`(pending) | IMPORTANT_POST_CORE | PLAN_EXPLICIT | 없음 | LOW |
| D-ADMIN-011 | Growth Ticker(실활동) | Organic Hybrid 금지, 실데이터만 | 04 `admin-growth-ticker-organic`(pending, 메커니즘만 SUPERSEDED) | IMPORTANT_POST_CORE | PLAN_EXPLICIT(기능)/HARD_TECHNICAL_INVARIANT(메커니즘 금지) | 없음 | MEDIUM |
| D-ADMIN-012 | AI/Peotteok Ops 마감 | coach/eval/pick/spotcheck 탭 | 04 `admin-ai-peotteok-ops`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | 없음 | MEDIUM |
| D-ADMIN-013 | Abuse/Error Matrix | risk queue+circuit+toast 100% | 04 `abuse-error-matrix`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT+TECHNICAL_SAFETY_REQUIREMENT | D-ADMIN-002(SOFT) | HIGH |
| D-ADMIN-014 | Customer Support Ops | 큐+SLA+dispute | 04 `customer-support-ops`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | 없음 | MEDIUM |
| D-ADMIN-015 | Product Analytics | D1/D7+퍼널 OTel | 04 `product-analytics`(pending) | IMPORTANT_POST_CORE | PLAN_EXPLICIT | 없음 | LOW |
| D-ADMIN-016 | 3-mode+Simulation+Preview-As-User | preview→confirm→apply→rollback | 04 `redesign-r6-admin-three-mode-ops`(pending)+lock(SUPERSET) | LAUNCH_REQUIRED | PLAN_EXPLICIT+FOUNDER_EXPLICIT | D-ADMIN-001(HARD) | HIGH |
| D-ADMIN-017 | Admin Isolated Deploy | 별도 Ops Worker+IP allowlist | 04 `admin-isolated-deploy`(pending) | IMPORTANT_POST_CORE | PLAN_EXPLICIT | 없음(PARALLEL_SAFE) | MEDIUM |
| D-ADMIN-018 | Allocation/Manual Match+Bulk/Schedule | 우선순위/가중치+예방/취소/재배정+대량작업 | lock matchAllocation/bulk(신규) | LAUNCH_REQUIRED | FOUNDER_EXPLICIT(SUPERSET) | D-ADMIN-005(SOFT) | HIGH |
| D-ADMIN-019 | Source Health+Founder Override+Policy Versioning | 소스상태+최상위override+정책이력/rollback | lock(신규) | LAUNCH_REQUIRED | FOUNDER_EXPLICIT(SUPERSET) | D-ADMIN-001(SOFT) | MEDIUM |
| D-ADMIN-020 | Admin R6 certification | 12모듈+2b 전수, known defect 0 | 04 `redesign-r6-admin-certification`(pending) | LAUNCH_REQUIRED | PLAN_EXPLICIT | 위 전항목(HARD) | HIGH |

## Owner / Evidence / Founder approval / Production impact

| TASK_ID | OWNER | EVIDENCE | FOUNDER_APPROVAL_REQUIRED | PRODUCTION_IMPACT |
|---|---|---|---|---|
| D-ADMIN-001 | apps/admin + api-nest | admin_rbac 테이블(스키마 존재) | NO(구현)/YES(role 목록 최종확정 시 참고 통지) | 있음(권한 체계) |
| D-ADMIN-002 | apps/admin + api-nest | money_circuit 선례 | NO(구조)/초기 ON-OFF값은 Founder 재량 | 있음(운영 정지 능력) |
| D-ADMIN-003~004 | apps/admin/app/admin/{page,users} | 기존 route | NO | 없음 |
| D-ADMIN-005 | apps/admin + api-nest opportunities | admin-control-plane.v1.json price | NO(fee model은 NOT_FROZEN — 값은 Founder) | 있음(가격 표시) |
| D-ADMIN-006~007 | apps/admin | CATALOG.md live 태그 | NO | 없음(이미 live) |
| D-ADMIN-008 | apps/admin/app/admin/users/[id] | 기존 §9.8.10 | NO | 있음(계정 보안) |
| D-ADMIN-009~011 | apps/admin/app/admin/growth/** | Supabase growth 테이블 | NO | 없음(대부분 표시) |
| D-ADMIN-012 | apps/admin/app/admin/ai-logs | ai_logs(305 rows) | NO | 없음(읽기) |
| D-ADMIN-013 | apps/admin/app/admin/risk | risk_signals 등 테이블 | NO | 있음(리스크 대응) |
| D-ADMIN-014 | apps/admin/app/admin/support | support_tickets | NO | 없음 |
| D-ADMIN-015 | apps/admin/app/admin/reports | — | NO | 없음 |
| D-ADMIN-016 | apps/admin/app/admin/system-control | simulation_runs | NO | 있음(정책 적용) |
| D-ADMIN-017 | workers/ops-proxy | 기존 scaffold | NO | 있음(네트워크 경계) |
| D-ADMIN-018~019 | apps/admin + api-nest | lock 신규 필드 | NO | 있음(매칭/소스 통제) |
| D-ADMIN-020 | 전체 | 신규 verify:admin-operation-modes 등 | NO | 없음(QA 게이트) |

## Parallel safety

```text
Track D(apps/admin) ↔ Track A/B/C/E/F/G(apps/web·services) = PARALLEL_SAFE (ui-admin-boundary.mdc 그대로 승계)
Track D 내부 = 위 표 DEPENDS_ON 그대로. D-ADMIN-001/002가 다수 항목의 SOFT 선행 — 먼저 착수 권장(강제 아님)
```

## Risk-based verification

```text
HIGH(001,002,005,008,013,016,018,020) → strong verifier+negative test(권한 우회 시도, kill switch 오작동,
  가격 override 충돌 등)
MEDIUM(003,004,006,007,009,011,012,014,017,019) → bounded integration verifier
LOW(010,015) → lightweight QA
```
