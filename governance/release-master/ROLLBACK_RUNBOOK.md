# PUTDUK ROLLBACK RUNBOOK (REL-408 baseline)

```text
STATUS = DRAFT_FOR_REL_602
PRODUCTION_EXECUTE = 0
THIS_REL_PRACTICE = 0
KNOWN_GOOD_OWNER = REL-403
PRACTICE_OWNER = REL-602
REL-602_EVIDENCE = governance/release-master/REL-602-STAGING-ROLLBACK.md
```

이 문서는 초안이다. staging에서 실제로 되감는 증거는 REL-602가 남긴다.
연습 기록 = `governance/release-master/REL-602-STAGING-ROLLBACK.md` (PENDING이면 미실행).
미리보기 전용 명령 = `pnpm cf:rollback:staging` (production target 거부 · 토큰 없으면 exit 2).

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

1. 현재 release id 기록.
2. known-good tag / release id 확인. 없으면 STOP.
3. Cloudflare Worker 를 known-good 커밋으로 workflow_dispatch HUMAN (production은 REL-701).
4. 새 배포 release id == known-good 인지 확인. 다르면 롤백 미완.
5. DB 롤백이 필요하면 Founder 승인 후만. 이 초안은 명령을 실행하지 않는다.
6. smoke: health · login · 기회 목록 · 지갑 읽기. money mutation 0.

## 3. 다시 앞으로

새 commit의 release id로 forward deploy. 같은 semver를 두 번 태그하지 않는다.

## 4. 금지

- Agent production tag / deploy token
- 원장 직접 UPDATE로 「롤백」
- 이 REL에서 `apply_migration`
- Home geometry 변경을 롤백 수단으로 사용
