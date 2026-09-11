# 미래 어드민 핸드오프 (화면 재구현 금지)

이 폴더는 **레거시 `apps/admin` SparkDash / Toss Premium / Lux 화면을 이식하지 말라는** 요약이다.
새 어드민은 별도 레포. 이 레포가 제공하는 것은 Nest Admin HTTP와 JSON 스키마뿐이다.

권위: `origin/main` `c4ebcd87` · 상세 경로 = `quality/backend-api-contract-map.md` §2.

## 쓰지 말 것

- `apps/admin/**` 페이지·CSS(`spark-admin.css`)
- `packages/ui` Lux/Canon/카피
- 고객 웹 디자인 시스템

## 쓰면 되는 것

- `https://api.hiptk.app` (prefix `/api/v1`)
- Admin JWT: `POST /api/v1/admin-auth/login` `mfa` `refresh` `step-up` `logout-all`
- Admin session: `/api/v1/admin-session`
- 아래 모듈은 **API 능력**이지 사이드바 강제 IA가 아니다. 새 정보구조는 미래 레포가 정한다.

| 레거시 화면 href (폐기) | 유지할 서버 능력 |
|---|---|
| `/admin` | 대시보드 전용 API 없음. health + 각 모듈 GET |
| `/admin/users` `/admin/users/:id` `/admin/users/:id/finance` | `GET /api/v1/admin/users` `GET .../users/:id` `POST .../pii-reveal` · buckets/adjust는 ledger admin |
| `/admin/opportunities` | `OPPORTUNITY_ADMIN_ROUTES` (assets/list/pricing/seed) |
| `/admin/execution-policy` | `GET/PUT /api/v1/admin` + `EXECUTION_POLICY_ADMIN_ROUTES` |
| `/admin/adapters` | `ADAPTER_ADMIN_ROUTES` |
| `/admin/wallet` | `WALLET_ADMIN_ROUTES` (deposit-config, KRW, disputes, withdraw review) |
| `/admin/ledger` | `LEDGER_ADMIN_ROUTES` |
| `/admin/risk` | `RISK_ADMIN_ROUTES` |
| `/admin/compliance` | KYC queue/approve/reject/doc-url |
| `/admin/system-control` | kill-switch · push kill · admin-ops 3-mode · platform reserve |
| `/admin/ai-logs` | `AI_LOGS_ADMIN_ROUTES` · pick · shadow-replay |
| `/admin/growth` | referral admin · simulation · growth enable |
| `/admin/audit` | `AUDIT_ADMIN_ROUTES` |
| `/admin/support` | ops-inbox `users/:id/ops-messages` |
| `/admin/reports/financial` | `GET /api/v1/admin/reports/financial` |

스키마: `schemas/admin-*.v1.json` 및 영역별 `schemas/*.v1.json`.

레거시 `apps/admin/routes.ts`의 12모듈·child tab 목록은 화면 IA 기록일 뿐이며 새 UI에 복사하지 않는다.

## ops-proxy (4단계 커밋 4)

원격 `hiptk-ops-proxy` · `ai-profit-ops` · `ai-profit-ops-preview` · `ai-profit-ops-dedicated` 는 삭제하지 않았다.

로컬에서 제거한 것:

- `workers/ops-proxy`
- `infra/ops/wrangler.toml`
- `infra/ops/access-policy.json` (CF Access 템플릿)
- `tooling/deploy/cf-pages-ops.cjs`

복구:

```
git checkout 97b07908 -- workers/ops-proxy infra/ops tooling/deploy/cf-pages-ops.cjs
```

미래 어드민 레포가 ops 호스트(`ops.hiptk.app`) 라우팅을 인수하기 전까지 원격 프록시는 유지한다. 이 레포의 `bridgeWorkers` 는 `api-stub` 만 남긴다.
