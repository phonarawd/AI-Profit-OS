# Day-1 PWA Certification

```text
REL = REL-023
TITLE = PWA certification (E-PWA-007)
STATUS = ISSUED
PLAN_LOCKED = TRUE
store-bridge = 0
POST-017 = 0
HOME_RETROACTIVE_VISUAL_REDESIGN = NO
PRODUCTION_DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
```

## Dependency gate

| REL | evidence | status |
|---|---|---|
| REL-014 | governance/release-master/REL-014-PWA-NATIVE-SHELL.md | COMPLETED |
| REL-020 | governance/release-master/REL-020-PUSH-BADGE.md | COMPLETED |
| REL-021 | governance/release-master/REL-021-PUSH-CHANNEL-FILTER.md | COMPLETED |
| REL-022 | governance/release-master/REL-022-WEBAUTHN-UX.md | COMPLETED |

014/020/021/022 미완료면 이 인증서는 발급되지 않는다.

## Checklist

| item | result |
|---|---|
| manifest = PASS | 퍼뜩 · standalone · 192/512/maskable |
| install = PASS | PwaRuntime + InstallPrompt + SW register |
| offline = PASS | shell cache + 한국어 오프라인 문구 · /api 캐시 0 |
| push_dedup = PASS | sourceEventId toast + SW notification tag |
| webauthn = PASS | CF RP + login fallback |
| reduced_motion = PASS | haptic skip on prefers-reduced-motion |
| badge = PASS | setAppBadge |
| kill = PASS | dispatcher sendAttempted false |

known defect = 0

## Lighthouse PWA

로컬 저사양 실측 0. `tooling/pwa/lighthouse-pwa.ci.cjs` 가 installability 전제를 검사하고, 전체 Lighthouse PWA 카테고리는 CI에 위임한다.

## Out of scope

store-bridge = 0  
POST-017 = 0  
TWA / assetlinks / Capacitor / Uptodown = 0
