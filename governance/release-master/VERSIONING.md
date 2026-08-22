# Release identification

STATUS: ACTIVE
DATE: 2026-08-22
REL: REL-403

배포된 바이너리/워커가 어떤 커밋인지 알아야 롤백이 된다.

## Rule

- Release id = git commit SHA (40 hex) 또는 그 short SHA (7+).
- 사람이 읽는 라벨은 `YYYY.MM.DD+<shortsha>` (calver + git).
- Semver 제품 버전을 강제하지 않는다. 태그 규칙이 더 필요하면 이 파일만 고친다.
- production 자동 태그 강제는 HUMAN deploy와 충돌한다. 태그는 사람이 붙인다.

## Manual tag

```text
git tag -a rel-YYYY.MM.DD+<shortsha> <fullsha>
```

`workflow_dispatch` production deploy 전에 태그가 있으면 그 SHA를 배포한다.
없으면 배포 commit SHA 자체가 id다.

## Where the id is exposed (not secret)

| Surface | Source |
|---|---|
| `apps/web` · `apps/admin` | `readReleaseId()` ← `NEXT_PUBLIC_RELEASE_ID` / `CF_PAGES_COMMIT_SHA` / `GITHUB_SHA` |
| Cloudflare Worker | 동일 env. 없으면 unavailable |
| REL-602 rollback | 이 id로 known-good을 지정한다 |

없는 id를 `latest` / `0.0.0` / `healthy`로 위조하지 않는다.

## REL-602 pointer

롤백 연습(REL-602)은 이 파일의 release id를 사용한다.
두 번째 버전 체계를 만들지 않는다.
