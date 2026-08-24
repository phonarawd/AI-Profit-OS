# PUTDUK ROLLBACK RUNBOOK (REL-408 baseline)

```text
STATUS = STAGING_PRACTICED
PRODUCTION_EXECUTE = 0
THIS_REL_PRACTICE = 1
KNOWN_GOOD_OWNER = REL-403
PRACTICE_OWNER = REL-602
REL-602_EVIDENCE = governance/release-master/REL-602-STAGING-ROLLBACK.md
```

REL-602의 preview Workers staging rollback 연습은 실제 실행+검증 완료했다. Production rollback 실행 권한이나 production known-good tag 요건을 완화하지 않는다.

연습 기록 = `governance/release-master/REL-602-STAGING-ROLLBACK.md`.
미리보기 전용 명령 = `pnpm cf:rollback:staging` (production target 거부 · 토큰 없으면 exit 2 · web/ops target 동시 존재 선검증 후 mutation).

## 1. 무엇을 되돌리는가

| 대상 | known-good | 금지 |
|---|---|---|
| 앱/워커 (production) | 직전 production annotated tag `v{semver}` 또는 그 태그의 `PUTDUK_RELEASE_ID` | 태그 없이 「이전 거」 |
| 앱/워커 (staging practice) | 직전 실제 active preview deployment pair를 Cloudflare read-only inventory로 증명한 version IDs | 존재하지 않는 historical version 추측 |
| DB | REL-701-DB 이전 스냅샷 / 마지막 성공 apply 직전 | 이 문서에서 production apply |
| 원장 | 되돌리지 않음 · 역분개만 Money owner | `ledger_*` UPDATE |

릴리스 id 확인:

```text
pnpm release:id
```

형식 = `{semver}+{gitSha7}` · SSOT = `governance/release-master/VERSIONING.md`.

## 2. 순서

### Production

1. 현재 release id 기록.
2. known-good production tag / release id 확인. 없으면 STOP.
3. Cloudflare Worker 를 known-good 커밋으로 workflow_dispatch HUMAN (production은 REL-701).
4. 새 배포 release id == known-good 인지 확인. 다르면 롤백 미완.
5. DB 롤백이 필요하면 Founder 승인 후만. 이 runbook 자체는 migration을 실행하지 않는다.
6. smoke: health · login · 기회 목록 · 지갑 읽기. money mutation 0.

### Staging practice — REL-602 completed

1. preview web/ops의 현재 active version을 기록.
2. rollback target은 read-only `versions list` / `deployments list`로 직전 active staging pair임을 증명.
3. **두 target이 모두 deployable set에 존재하는지 먼저 검증. 하나라도 없으면 mutation 0으로 STOP.**
4. preview web/ops를 target version으로 rollback.
5. deployment status에서 두 target이 각각 100% active인지 확인.
6. `cf-origin-smoke` + REL-601 Surface Matrix read-only regression 실행. money mutation 0.
7. 현재 head를 forward deploy.
8. forward IDs가 rollback IDs와 달라졌는지 확인하고 같은 read-only regression 재실행.

REL-602 실제 기록과 exact version IDs는 evidence 파일을 따른다.

## 3. 다시 앞으로

새 commit의 release id로 forward deploy. 같은 semver를 두 번 태그하지 않는다.

## 4. 금지

- Agent production tag / production deploy token 사용
- 원장 직접 UPDATE로 「롤백」
- REL-602에서 `apply_migration`
- Home geometry 변경을 롤백 수단으로 사용
- staging 연습 성공을 production deploy/rollback 승인으로 간주
