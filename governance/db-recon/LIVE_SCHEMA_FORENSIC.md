# Live Schema Forensic

- project_ref: `mgsytcetsiecllmhcyox`
- query_mode: SELECT / catalog only
- production_mutation: 0
- history_repair_approved: false
- PITR: `BLOCKED_EXTERNAL_EVIDENCE`
- production_release: `NO_GO_BACKUP_UNVERIFIED`

## Migration reconciliation

| set | count |
|---|---:|
| Git migration SQL | 51 |
| Live history rows | 42 |
| Exact version match | 37 |
| Same name / different version (PTF) | 4 |
| Git only (APPLY_THIS_SLICE=NO) | 10 |
| History version only | 5 |
| Zero-statement history markers | 2 |

PTF 4개는 재실행 금지. `20260810212231` idempotency row는 Git 파일 version과 다르다. `20260811062000` / `20260811062100` history statements=0.

## 13 live objects

| table | verdict | history | RLS live | grants |
|---|---|---|---|---|
| `source_observations` | `EXACT_EQUIVALENT` | absent | ON | `EXACT_EQUIVALENT` |
| `canonical_products` | `EXACT_EQUIVALENT` | absent | ON | `EXACT_EQUIVALENT` |
| `canonical_product_source_links` | `EXACT_EQUIVALENT` | absent | ON | `EXACT_EQUIVALENT` |
| `match_results` | `UNVERIFIED` | absent | ON | `EXACT_EQUIVALENT` |
| `push_control` | `EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE` | absent | OFF | `EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE` |
| `push_subscriptions` | `EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE` | absent | OFF | `EQUIVALENT_WITH_NON_SEMANTIC_DIFFERENCE` |
| `admin_audit_events` | `STRUCTURAL_DRIFT` | absent | ON | `STRUCTURAL_DRIFT` |
| `admin_kill_switches` | `STRUCTURAL_DRIFT` | absent | ON | `STRUCTURAL_DRIFT` |
| `opportunity_price_overrides` | `STRUCTURAL_DRIFT` | absent | ON | `STRUCTURAL_DRIFT` |
| `admin_ops_intents` | `STRUCTURAL_DRIFT` | absent | ON | `STRUCTURAL_DRIFT` |
| `admin_match_controls` | `STRUCTURAL_DRIFT` | absent | ON | `STRUCTURAL_DRIFT` |
| `admin_policy_versions` | `STRUCTURAL_DRIFT` | absent | ON | `STRUCTURAL_DRIFT` |
| `admin_policy_heads` | `STRUCTURAL_DRIFT` | absent | ON | `STRUCTURAL_DRIFT` |

## Findings

1. 10개 no-apply SQL이 정의하는 13개 테이블이 live에 존재하고 history version은 없다.
2. 컬럼 이름/순서와 명명된 인덱스는 Git CREATE와 일치한다.
3. push_* Git SQL은 RLS/GRANT를 선언하지 않는다. live RLS OFF, anon/authenticated GRANT 없음, service_role ALL. 즉시 public exposure로 보지 않는다.
4. admin_* / opportunity_price_overrides 는 Git이 service_role에 좁은 GRANT를 주는데 live는 ALL이다. `STRUCTURAL_DRIFT`.
5. admin_policy_heads seed row는 Git INSERT가 없고 live도 0행. DATA_DRIFT 아님.
6. deposit_config live row count = 0 (13객체 밖, money path 후속 슬라이스).
7. history repair / 10 SQL 재실행 / Production apply 는 승인하지 않는다.
8. 자식 fingerprint가 UNVERIFIED이면 객체 verdict는 EXACT_EQUIVALENT가 될 수 없다 (worst-child).

## Repair (문서만 · 실행 금지)

- 대상: 없음. `history_repair.approved = false`.
- 방향(미래): SQL 재실행이 아니라 history marker insert만 검토 가능.
- 전제: 13객체 EXACT_EQUIVALENT + PITR 증명 + Founder 승인 + isolated rehearsal.
- 현재 전제 미충족.

