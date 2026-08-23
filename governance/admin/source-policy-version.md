# Source / Parser Health + Policy Versioning (REL-224)

STATUS: LOCKED
LOCKED_LABELS = 3
INVENTED_LABELS = 0
SERVER_ENFORCE = 1
OVERWRITE = 0
SIDEBAR_13 = 0
FOUNDER_ROLE = super
FOUNDER_SEVERITY = HIGH
PRODUCTION_DB_APPLY = 0
HOME_GEOMETRY_DIFF = 0

Health 공식은 기존 `ProviderHealthService` 재사용. 없는 소스를 `HEALTHY` 로 채우지 않는다.
상태 enum = `HEALTHY` · `DEGRADED` · `STALE` · `BLOCKED`.

| policyKey | 용도 |
|---|---|
| `source_parser` | 소스/파서 운영 메모 버전 |
| `founder_override` | Founder(super) HIGH override |

Labels: `V1` → `V2` → `V3`. 이미 있는 label 에 payload 를 덮으면 FAIL.
Rollback 은 `admin_policy_heads` 포인터만 움직인다. 버전 행은 그대로.

## EXIT_GATE

- 이력 없는 덮어쓰기 = FAIL
- Founder override 가 super/HIGH/audit 아니면 FAIL
- 건강 상태 창작 = FAIL
- 사이드바 13번째 = FAIL
- capability 창작 0. `read("all")` / `write("all")` only
