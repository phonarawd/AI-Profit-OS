# REL-405 — RBAC + Audit Foundation

STATUS: PASS
DATE: 2026-08-22

## Implemented

- 8 roles: super / finance / cs / risk / marketing / ops / compliance / founder
- 기존 5역할 capability 약화 0
- `schemas/admin-audit.v1.json` + `AdminAuditService`
- 권한 없는 조치 403 + deny audit
- `/api/v1/admin/audit` 실배선

## Verify

- `pnpm verify:rel-405-rbac-audit`

## Negative

- SECOND_RBAC_OWNER_CREATED = 0
- SECOND_AUDIT_OWNER_CREATED = 0
- USER_JWT_ADMIN_200 = 0
- FAKE_AUDIT_ROW = 0
