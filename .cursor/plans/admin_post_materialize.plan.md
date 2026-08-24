---
name: Admin POST Materialize + Visual (Revised)
overview: "04 residual 8 + Visual 2 + 기존 Admin POST 5. 카운터 147/29. 포인터 REL-602. §6.1 서브트랙. verifier 4-way. gap-only. POST re-cert 필수."
todos:
  - id: pre-materialize-validator
    content: "verify:release-master-materialization.cjs 신설"
    status: pending
  - id: materialize-putduk-yaml
    content: "PUTDUK 147/29, REL-602, §6.1 append"
    status: pending
  - id: verify-four-way
    content: "admin-* verifier 4-way 배선"
    status: pending
  - id: post-028-029-visual
    content: "post-028/029 Visual discovery+Contract"
    status: pending
  - id: post-020-027-admin
    content: "post-020~027 gap-only + POST re-cert"
    status: pending
isProject: false
---

# Admin POST Materialize + Visual — Revised

> 판정: 방향 승인 · **정정본 준수 전 PUTDUK materialize 금지**

## 1. main 현재 상태

| 항목 | 값 |
|------|-----|
| FIRST_EXECUTION_TODO | **REL-602** |
| LAST_COMPLETED_TODO | **REL-601** |
| HARD_STOP_AFTER | **REL-601** |
| 전체 todo | 137 (109 / 28) |
| POST | 19 |

materialize 시 정정: overview `REL 116` → **REL 117** · 「136개」→ **137개**

**금지:** `FIRST_EXECUTION_TODO=REL-601` 되돌리기 (완료 todo 재실행)

## 2. Materialize 후 카운터

| 신규 ID | 개수 |
|---------|------|
| post-028, post-029 | 2 (Visual) |
| post-020 ~ post-027 | **8** (04 residual) |
| 합계 신규 | **10** |

```text
POST_COUNT = 29
MASTER_TODO_COUNT = 147
1 + 117 + 29 = 147
완료/미완료 = 109 / 38
```

04 Admin 18 todo: completed 1 · REL매핑 5 · 기존 POST 4 (013~016) · 신규 8 (020~027) · Visual 2 (028~029)

`post-006` = 06 Infra 출처. Admin 서브트랙 기존 5 = **006, 013, 014, 015, 016**

## 3. 포인터 (materialize 시)

```text
FIRST_EXECUTION_TODO = REL-602
LAST_COMPLETED_TODO  = REL-601
HARD_STOP_AFTER      = REL-601
ADMIN_POST_TRACK_FIRST = post-028   # 마커 only · REL-704 이후 진입
```

Admin 구현 시작: **REL-704 COMPLETED** 후 · §6.1 서브트랙이 실행 SSOT

## 4. §6 충돌 해소 — §6.1 ADMIN_POST_SUBTRACK

REL-704 이후 immutable 순서 (138~157):

1. POST-028 · POST-029
2. POST-020
3. POST-022 · POST-027
4. POST-001~005 (미완료 시) → POST-006
5. POST-021 → POST-023 · POST-024
6. POST-013 → POST-014 · POST-025
7. POST-015
8. POST-026
9. POST-016 (HUMAN workflow_dispatch)

POST-017~019: §6 기존 위치 유지 · Admin 트랙과 병렬 가능

## 5. POST-026 DEPENDENCIES (cycle 제거)

```yaml
DEPENDENCIES:
  - POST-006
  - POST-013
  - POST-014
  - POST-015
  - POST-020
  - POST-021
  - POST-022
  - POST-023
  - POST-024
  - POST-025
  - POST-027
```

POST-016 deps: POST-026 (전이적). **POST-026 자기 참조 금지**

## 6. SOURCE_TODO_IDS

- post-020: **`admin-ops` only** · 3-mode = REL-222 재사용 · `redesign-r6-admin-three-mode-ops` source **금지**
- post-021~027: 04 todo id만 · `d-admin-*` wildcard **금지**

## 7. Verifier 4-way (파일 · package.json · CATALOG · domain-by-path)

| POST | verifier (신설 unless noted) |
|------|------------------------------|
| 028 | admin-visual-discovery |
| 029 | admin-visual-contract |
| 020 | admin-plain-language + rel-201 확장 |
| 021 | admin-user-360 |
| 022 | admin-price-sync-gap |
| 023 | admin-user-credentials |
| 024 | admin-user-capability-block |
| 025 | ticker-organic-hybrid |
| 026 | admin-abuse-error-matrix |
| 027 | admin-support-surfaces |
| 006 | admin-growth-tabs |
| 015 | admin-product-analytics |
| 016 | ops-robots-noindex |

**materialize done:** `verify:release-master-materialization` **신설 필수** (plans-ssot만으로 불충분)

검증: todo 수 · 15필드 · duplicate · cycle · 포인터 · §6 정합 · §7 phantom `_validate_release_master.mjs` 제거

## 8. Gap-only scope

- **POST-022:** `opportunity.price.updated`·EFFECTIVE read **이미 존재** → refresh/E2E·누락 구독만
- **POST-023/024:** API 일부 존재 → **UI·전용 route gap**만
- **POST-020 TOP1:** review list API 없음 → UNAVAILABLE honest · API는 PROTECTED 서브슬라이스

## 9. POST protected re-cert (필수)

`PROTECTED_SCOPE_MUTATION=true` POST (020 API갭, 023, 024, 025 등) 완료 후 · POST-016 deploy 전 · REL-502급 재인증 규칙 **문서화 필수** (POST-502 또는 REL-502 확장)

POST-016 production deploy = HUMAN workflow_dispatch 유지

## 10. Materialize 순서

1. `verify:release-master-materialization.cjs` + CATALOG
2. PUTDUK 편집 (frontmatter 10 · §5 YAML 10 · §6.1 · 카운터 · 포인터)
3. validate + plans-ssot PASS → **문서 materialize done**
4. REL-704 후 post-028부터 **구현**

## 11. SSOT 반영 판정

| | |
|--|--|
| 보류 | 정정본 미반영 |
| materialize 승인 | validate-release-master-materialization committed + PUTDUK 편집 |
| 구현 승인 | REL-704 + post-028 시작 |
