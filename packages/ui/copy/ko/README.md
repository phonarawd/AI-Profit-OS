# `packages/ui/copy/ko` — 유저·어드민 화면 카피 SSOT

- **권위:** UI 플랜 §8.2 · §27 · **§27.10** · §38.9 · §48 · §50 · Canon `copyKey`
- **브랜드:** Consumer/AI = **퍼뜩** (`packages/ui/brand`)
- **금지:** IT 용어 화면 노출 · 성별 분기 · 실체결 암시 · retired 브랜드 · 면책/약관 본문 이모지
- **연령:** `T.*.{young|mid|senior}` 또는 shared+senior override (§38.9) · 남/여 키 금지
- **글자:** settings `fontScale` md/lg/xl 라벨만 (§50.1) · Light/시스템 테마 토글 **0**
- **이모지:** `emoji.ts` 팔레트·캡 · toast 1~2 · empty 1 필수

## Locked (Index §20.2 · 이 폴더 Owns)

| 키 | 값 |
|----|-----|
| `T.execution.ctaEarn` / sticky | `수익 벌기` |
| `T.execution.ctaDetail` | `이 기회로 수익 벌기` |
| `T.execution.disclaimerResult` | 면책 1줄 |
| `T.execution.badgeNoBuy` / `badgeNoSell` | 직접 사지·팔지 않아요 |
| Soft/Hard 3줄 | `slaSoftHint` · `requeueHint` · `matchTimeout` |
| `T.peotteok.voice.*` | §27.10.5 greeting·pace·refuseS |
| `T.toast.*` | §8.2 mirror |

## Domains (PART1b skeleton)

`auth` · `onboarding` · `landing` · `guide` · `user`(empty/hint) · `toast` · `settings` · `legal` · `admin`(plain) · `trust` · `peotteok` · `emoji`

Wiring todos: `ai-coach-ui` · `plain-korean-surfaces` · `toast-notification` · `auth-login-signup-ui` · `onboarding-experiential` · `landing-3s-ui`
