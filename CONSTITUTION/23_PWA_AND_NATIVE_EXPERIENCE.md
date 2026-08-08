# §23 — PWA And Native Experience

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| Manifest / App Shell | name/short_name=**퍼뜩** · `display: standalone` · Serwist · next@16 |
| Theme colors | Lux only · `background=#090A10` · `theme=#7AA2FF` · `#1A56FF` **금지** |
| Install · Offline · SW update UX | Day-1 게이트 · Canon install/offline wires |
| Web Push + Badge | VAPID · Phase0 bus=**in-process** · iOS installed-only |
| §23.5a 자동 Push | notice/campaign/opportunity(+ops inbox) · prefs 채널 필터 |
| WebAuthn **UX/RP** | 브라우저·RP 등록 UX only |
| Brand icons | `packages/ui/brand` → `public/icons/*` |

## Pointer

| 교차 | SSOT |
|------|------|
| 본문 전수 | PWA `ai_profit_os_05_pwa_f6a7b8c9.plan.md` §23 |
| WebAuthn **정책·OTP/PIN/fallback** | Money §43.6 · → `43` |
| Push kill / circuit | Admin `/admin/system-control` `pushEnabled` |
| Install/Push 한글 카피 | UI §27.8 · toast §8.2/§8.3 · → `25` |
| Store Bridge / TWA | → `24` (Day-1 게이트 제외) |
| Hosting | Infra · Cloudflare only |
| CI | `verify:pwa-*` · `push-dedup` · `pwa-phase0-bus` · `webauthn-fallback-pointer` · `push-channel-prefs` |

## Forbidden

- FCM / APNs / Background Sync 필수화 (Day-1)
- 오프라인 participate/withdraw 큐
- Vercel 호스팅
- 구현 manifest JSON·워커 코드를 본 파일에 복제
