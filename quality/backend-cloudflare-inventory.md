# 백엔드 Cloudflare 인벤토리 (4단계 커밋 4)

원격 변경 0. MCP는 읽기 전용. 복구 SHA: `97b07908`.

## MCP 읽기

| 호출 | 결과 |
|---|---|
| `GetDynamicTools` `project-0-AI_PROFIT_OS-cloudflare-bindings` / `cloudflare-builds` | 스키마 확인 후 읽기 전용 호출 |
| `workers_list` (bindings + builds 동일) | count=19 |
| `r2_buckets_list` | 거부. 원문 아래 BLOCKED_PERMISSION |

### BLOCKED_PERMISSION (R2)

```
Error listing R2 buckets: 403 {"success":false,"errors":[{"code":10042,"message":"Please enable R2 through the Cloudflare Dashboard."}],"messages":[],"result":null}
```

## 원격 Worker (삭제 금지)

### 고객 웹 / 어드민 / 레거시 (putduk-web · 미래 어드민 소유)

| name | 비고 |
|---|---|
| putduk-web | 고객 웹 production |
| putduk-web-preview | 고객 웹 preview |
| ai-profit-web | OpenNext 레거시 production |
| ai-profit-web-preview | OpenNext 레거시 preview |
| ai-profit-web-dedicated | dedicated staging |
| ai-profit-ops | 레거시 어드민 production |
| ai-profit-ops-preview | 레거시 어드민 preview |
| ai-profit-ops-dedicated | dedicated ops |
| hiptk-web-proxy | app/apex/go 프록시 |
| hiptk-ops-proxy | ops.hiptk.app 프록시 |
| fashionphile-parser-preview | 이 레포 밖 |

### 백엔드 surface (이 레포 KEEP)

| name | 비고 |
|---|---|
| push-dispatcher | Phase0 |
| push-dispatcher-preview | preview |
| ebay-adapter | P0 ebay |
| ebay-adapter-preview | preview |
| ebay-adapter-production | production 이름 |
| hiptk-api-stub | api.hiptk.app → Nest |
| frankfurter-adapter-preview | FX |
| coingecko-adapter-preview | FX |

## 로컬 삭제 (이번 커밋)

| 경로 | 이유 |
|---|---|
| `infra/web/` | OpenNext 고객 웹 wrangler |
| `infra/ops/` | 레거시 어드민 wrangler + Access 템플릿 |
| `workers/web-proxy/` | hiptk-web-proxy 소스 |
| `workers/ops-proxy/` | hiptk-ops-proxy 소스 |
| `workers/_shared/opennext-origin.ts` | web/ops origin 미러 |
| `tooling/deploy/cf-pages-web.cjs` | web Workers 배포 |
| `tooling/deploy/cf-pages-ops.cjs` | ops Workers 배포 |
| `tooling/deploy/cf-deploy-all.cjs` | web+ops+workers 오케스트레이션 |
| `tooling/deploy/cf-deploy-staging.cjs` | staging 오케스트레이션 |
| `tooling/deploy/cf-rollback-staging.cjs` | staging 롤백 |

이미 없던 항목(커밋 1 또는 이전): `cf-deploy-dedicated.cjs` · `deploy-web-proxy.cjs` · `s5-dedicated-staging.cjs` · `opennext-workers-origin.cjs` · `cf-deploy-packages.cjs` · `deploy-staging.yml` · `deploy-dedicated.yml` · `cf-images-binding-preflight.cjs`.

## 로컬 유지

| 경로 | 이유 |
|---|---|
| `workers/api-stub` | api.hiptk.app 브리지 |
| `workers/push-dispatcher` 및 market adapters | 백엔드 workers |
| `workers/_shared/api-origin.ts` · `adapter-machine-auth.ts` | API origin / 어댑터 인증 |
| `tooling/deploy/cf-workers.cjs` | 백엔드 worker 배포 |
| `tooling/deploy/cf-preflight.cjs` | 백엔드 preflight |
| `tooling/deploy/cf-domain-bridge.cjs` | api-stub only |
| `tooling/deploy/cf-domain-bootstrap.cjs` | DNS/계정 부트스트랩 |
| `tooling/deploy/cf-ebay-secrets.cjs` | ebay 시크릿 |
| `tooling/deploy/cf-origin-smoke.cjs` | 원격 origin 생존 확인(뮤테이션 0) |
| `infra/r2/*.toml` | KYC / asset-images 로컬 계약 |
| `infra/domain.manifest.json` | hiptk.app + api-stub + forbiddenDeploy + productionHosts |
| `infra/hosts.manifest.json` | Phase0 bus/DB/R2/API |
| `infra/workers.manifest.json` | phase0 push-dispatcher |
| `.github/workflows/deploy-cloudflare.yml` | 백엔드 workers 배포 |

## 복구

`git checkout 97b07908 -- infra/web infra/ops workers/web-proxy workers/ops-proxy workers/_shared/opennext-origin.ts tooling/deploy/cf-pages-web.cjs tooling/deploy/cf-pages-ops.cjs`
