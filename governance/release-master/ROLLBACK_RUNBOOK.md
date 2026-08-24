# PUTDUK ROLLBACK RUNBOOK (REL-408 baseline)

```text
STATUS = PRACTICE_COMPLETE_REL_602
PRODUCTION_EXECUTE = 0
THIS_REL_PRACTICE = 1
KNOWN_GOOD_OWNER = REL-403
PRACTICE_OWNER = REL-602
```

이 문서는 초안이다. staging에서 실제로 되감는 증거는 REL-602가 남긴다.

## 1. 무엇을 되돌리는가

| 대상 | known-good | 금지 |
|---|---|---|
| 앱/워커 | 직전 production annotated tag `v{semver}` 또는 그 태그의 `PUTDUK_RELEASE_ID` | 태그 없이 「이전 거」 |
| DB | REL-701-DB 이전 스냅샷 / 마지막 성공 apply 직전 | 이 문서에서 production apply |
| 원장 | 되돌리지 않음 · 역분개만 Money owner | `ledger_*` UPDATE |

릴리스 id 확인:

```text
pnpm release:id
```

형식 = `{semver}+{gitSha7}` · SSOT = `governance/release-master/VERSIONING.md`.

## 2. 순서 (연습은 staging)

1. 현재 release id 기록: `pnpm release:id`
2. Cloudflare active version id 기록: `pnpm cf:versions:staging`
3. known-good 확인:
   - staging = REL-600 deploy 의 CF version UUID (`wrangler versions list`)
   - production = annotated tag `v{semver}` 또는 그 태그의 release id
   - 없으면 STOP
4. staging rollback 실행 (production = 0):
   - HUMAN workflow: `.github/workflows/staging-rollback-practice.yml`
   - 또는 CLI: `tooling/deploy/cf-worker-rollback.cjs` / `pnpm cf:rollback:staging -- web <version-uuid>`
   - version 조회: `tooling/deploy/cf-worker-versions.cjs` / `pnpm cf:versions:staging`
5. rollback 직후 active version id == known-good UUID 인지 확인. 다르면 롤백 미완.
6. smoke: `cf-origin-smoke` · health · 기회 목록 · 지갑 읽기. money mutation 0.
7. forward deploy: `deploy-staging.yml` 또는 practice workflow `forward_after=true`
8. 증거: `governance/release-master/REL-602-STAGING-ROLLBACK.md`
9. DB 롤백이 필요하면 Founder 승인 후만. 이 초안은 명령을 실행하지 않는다.

## 3. 다시 앞으로

새 commit의 release id로 forward deploy. 같은 semver를 두 번 태그하지 않는다.

## 4. 금지

- Agent production tag / deploy token
- 원장 직접 UPDATE로 「롤백」
- 이 REL에서 `apply_migration`
- Home geometry 변경을 롤백 수단으로 사용
