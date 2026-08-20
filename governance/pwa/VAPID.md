# VAPID 키 경로 (REL-020)

```text
OWNER = tooling/pwa/generate-vapid.mjs
STORE = .env.local (gitignored) · Cloudflare Workers Secrets
GITHUB = 0
.env COMMIT = 0
PRODUCTION_DEPLOY = 0
```

## 생성

```text
node tooling/pwa/generate-vapid.mjs --selftest
node tooling/pwa/generate-vapid.mjs --write-local
```

`--write-local` 만 `.env.local`에 쓴다. 레포 템플릿에는 placeholder만 둔다.

## 이름

| 이름 | 공개 | 위치 |
|---|---|---|
| `VAPID_PUBLIC_KEY` | 예 | Nest / Worker / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` |
| `VAPID_PRIVATE_KEY` | 아니오 | Worker secret · 로컬 `.env.local` |
| `VAPID_SUBJECT` | 연락처 | `mailto:` 또는 `https://` APP_HOST |
| `PUSH_DISPATCH_TOKEN` | 아니오 | Nest → Worker Bearer |
| `PUSH_DISPATCHER_URL` | URL | Nest HTTP 실연결. 비면 in-process 동일 코어 |
| `PUSH_ENABLED` | 플래그 | `"false"`면 전역 kill |

## Admin kill

서버 계약: `GET/PUT /api/v1/admin/system-control/push`.  
UI는 REL-213. 이 파일이 UI를 만들지 않는다.

필터 순서: `pushEnabled(kill) → (REL-021 prefs) → subscription → dispatcher`.
