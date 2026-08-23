# PUTDUK VERSIONING (REL-403)

```text
REL = REL-403
STATUS = COMPLETED
SCHEME: semver
RELEASE_ID_FORMAT = {semver}+{gitSha7|local}
AUTO_TAG_ON_PUSH: 0
AUTO_TAG_ON_MAIN: 0
PRODUCTION_TAG: MANUAL_AFTER_HUMAN_DEPLOY
PRODUCTION_DEPLOY = workflow_dispatch HUMAN
SECRET: 0
RUNTIME_INJECTION_THIS_REL: 0
ROLLBACK_CONSUMER = REL-602
KNOWN_GOOD = last production annotated tag or PUTDUK_RELEASE_ID
```

배포된 워커/바이너리가 어떤 커밋인지 알아야 REL-602 롤백이 된다.
이 REL은 **게이트/문서 + id 빌더**만 잠근다. 앱/워커 런타임 헤더 삽입은 하지 않는다
(Home freeze · HUMAN deploy와 충돌하는 자동 태그 0).

## 식별자

| 이름 | 형식 | 소유 |
|------|------|------|
| semver | `package.json` `version` (`0.y.z` until 1.0) | 루트 패키지 |
| git tag | `v{semver}` annotated | HUMAN이 production `workflow_dispatch` **성공 후** 수동 |
| release id | `{semver}+{gitSha7}` 예: `0.0.0+786c628` | `tooling/release/version-id.cjs` |
| 로컬 | `{semver}+local` | git sha를 못 읽을 때 |
| override | `PUTDUK_RELEASE_ID` | HUMAN deploy 환경. 비밀 아님 |

calver를 태그 이름으로 쓰지 않는다. 날짜는 annotated tag 메시지에만 적어도 된다.

## 태그 규칙

1. `main` push / PR / `gate.yml` 이 `git tag` 하지 않는다.
2. production 배포는 `.github/workflows/deploy-cloudflare.yml` `workflow_dispatch` HUMAN만.
3. HUMAN deploy가 **성공한 뒤에만** `git tag -a v{semver}` 후 `git push origin v{semver}`.
4. 같은 semver를 두 번 태그하지 않는다. 핫픽스는 semver patch를 올린 뒤 다시 배포·태그.
5. 자동 태그 봇·Agent production tag 토큰 = 0 (REL-005).

## REL-602 연결

REL-602 staging rollback 연습과 이후 production rollback은 이 체계의 **known-good**을 쓴다.

| 단계 | 쓰는 값 |
|------|---------|
| 무엇으로 되돌리는가 | 직전 production annotated tag `v{semver}` 또는 그 태그의 release id |
| 되돌린 뒤 확인 | 새 배포의 release id ≠ known-good 이면 FAIL, 같으면 아직 롤백 안 됨 |
| 다시 앞으로 | 새 commit의 release id로 forward deploy |
| REL-408 | runbook 초안이 이 id/tag를 가리키게 한다. 본 REL은 런북 본문을 쓰지 않음 |

## 빌드 id

```text
pnpm release:id
```

`version-id.cjs` 가 현재 checkout의 release id를 stdout에 낸다.
런타임 노출(헤더/`/.well-known`)은 이후 배포 슬라이스. 계약 키는 `PUTDUK_RELEASE_ID`.

## 금지

- push/main 자동 태그
- 태그를 비밀처럼 취급
- release id를 머니/원장 값으로 사용
- 태그 없이 「known-good」 주장 (REL-602 증거 부족)
