# putduk-web Cloudflare 인계 (4단계 커밋 4)

원격 Worker는 삭제하지 않았다. 이 레포에서 로컬 소스·배포 스크립트만 제거했다.

## 소유

| 원격 name | 로컬 복구 경로 | 역할 |
|---|---|---|
| putduk-web / putduk-web-preview | putduk-web 레포 | 고객 웹 현재 origin |
| ai-profit-web / ai-profit-web-preview / ai-profit-web-dedicated | `infra/web/wrangler.toml` | OpenNext 레거시 web |
| hiptk-web-proxy | `workers/web-proxy` | app.hiptk.app · hiptk.app · go.hiptk.app → web origin |

## 복구

```
git checkout 97b07908 -- infra/web workers/web-proxy workers/_shared/opennext-origin.ts tooling/deploy/cf-pages-web.cjs tooling/deploy/cf-pages-ops.cjs
```

SHA 대조(putduk-web 트리 vs `97b07908`)는 6단계.

## 같이 가져갈 것

- OpenNext Workers-only 규칙 (pages deploy 금지)
- `cf:deploy:staging` / `cf:rollback:staging` / `cf-deploy-all`
- preview = wrangler `[env.preview]`
- production host 금지 목록은 백엔드 `infra/domain.manifest.json` `productionHosts` 에 남김
- `tooling/deploy/cf-origin-smoke.cjs` 는 이 레포에 원격 생존 확인용으로만 남김. 배포 권한은 putduk-web

## 이 레포가 유지하는 DNS 사실

`infra/domain.manifest.json` `env`:

- `APP_HOST=app.hiptk.app`
- `OPS_HOST=ops.hiptk.app`
- `API_HOST=api.hiptk.app`
- `ROOT_DOMAIN=hiptk.app`
- `GO_HOST=go.hiptk.app`

`bridgeWorkers` 는 `api-stub` 만.
