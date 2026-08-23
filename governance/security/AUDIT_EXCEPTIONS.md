# REL-402 dependency audit exceptions

```text
REL = REL-402
EXCEPTIONS: 0
HIDDEN_IGNORE: 0
AUDIT_LEVEL = high
LOCAL_FULL_SCAN = 0
```

예외는 숨기지 않는다. CI가 `--ignore` 하는 항목은
`governance/security/dependency-audit.v1.json` `exceptions[]`와 이 표에 **동시에** 적는다.
`package.json` `pnpm.auditConfig.ignoreCves` / `ignoreGhsas` 단독 무시 금지.

info / low / moderate 는 예외가 아니다. 게이트 실패 임계는 `auditLevel=high`.

| id | severity | package | reason | added |
|----|----------|---------|--------|-------|
| — | — | — | 현재 high/critical 예외 0 | 2026-08-23 |
