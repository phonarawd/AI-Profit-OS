# putduk-web 이관 무결성 갥 (6단계 · 읽기 전용 gh)

로컬 PUTDUK_WEB 경로는 쓰지 않았다. 누락 파일은 이 백엔드 레포에 복구하지 않는다. Spark/Lux 는 이관 대상이 아니다.

## 원격

| 항목 | 값 |
|---|---|
| repo | https://github.com/phonarawd/putduk-web |
| default_branch | main |
| HEAD | `bb58d0a41c3c95abed0669e007194acc06dcb1d0` |
| HEAD date | 2026-09-11T08:42:40Z |
| tree blobs | 254 (truncated=false) |
| pushed_at | 2026-09-11T08:43:20Z |

## 고객 route

src/app/**/page.tsx **33** 존재. quality/route-inventory.json 존재.

`src/app/ai/page.tsx` · `src/app/auth/complete-profile/page.tsx` · `src/app/auth/find-id/page.tsx` · `src/app/auth/oauth/google/callback/page.tsx` · `src/app/auth/reset-password/page.tsx` · `src/app/auth/verify-email/page.tsx` · `src/app/invite/page.tsx` · `src/app/legal/license/page.tsx` · `src/app/legal/oss/page.tsx` · `src/app/legal/page.tsx` · `src/app/legal/privacy/page.tsx` · `src/app/legal/recognition/page.tsx` · `src/app/legal/terms/page.tsx` · `src/app/login/page.tsx` · `src/app/me/benefits/page.tsx` · `src/app/me/events/page.tsx` · `src/app/me/inbox/page.tsx` · `src/app/me/kyc/page.tsx` · `src/app/me/membership/page.tsx` · `src/app/me/notices/page.tsx` · `src/app/me/page.tsx` · `src/app/me/peotteok/page.tsx` · `src/app/me/records/page.tsx` · `src/app/me/settings/page.tsx` · `src/app/me/support/page.tsx` · `src/app/offline/page.tsx` · `src/app/page.tsx` · `src/app/signup/page.tsx` · `src/app/wallet/deposit/page.tsx` · `src/app/wallet/history/page.tsx` · `src/app/wallet/usdt-guide/page.tsx` · `src/app/wallet/withdraw/page.tsx` · `src/app/work/page.tsx`

## 브랜드 자산

백엔드 삭제 커밋: `b725a0bcccd09821d4e6439f765d90274fc12b85`

삭제 직전 부모: `d31cf8c0adfaf2d170e63336b5d559fb4d725f8c`

백엔드 자산 파일: **33**

putduk-web 동일 경로 또는 basename: **0**

putduk-web 근접 자산 (다른 파일 · SHA 일치 아님): public/icons/icon-192.png · public/icons/icon-512.png · public/putduk-mark.svg · ambassadors · authority-marks

### 샘플 SHA-256 (백엔드 부모 vs putduk-web)

| 백엔드 경로 | git blob | SHA-256 | putduk-web basename | blobMatch |
|---|---|---|---|---|
| `packages/ui/brand/assets/icons/app-icon-1024.png` | `e4ae47899983e98718cc383a4576b4563ab8d1d9` | `cf6b41cfd3a4dd19237ab6f3460e3d233650c6c70f516e4eaedbbf59fda420bb` | 0 | no |
| `packages/ui/brand/assets/icons/maskable-source-1024.png` | `e4ae47899983e98718cc383a4576b4563ab8d1d9` | `cf6b41cfd3a4dd19237ab6f3460e3d233650c6c70f516e4eaedbbf59fda420bb` | 0 | no |
| `packages/ui/brand/assets/wordmark/wordmark-dark.png` | `c4b0cde03a414477573b7232fa4f334c3e02df48` | `da2e2f50218b158bcfae117a13b9947d26448817cc13ab8519ef152ff32f4891` | 0 | no |
| `packages/ui/brand/assets/og/og-default.png` | `88d017c81d6f2ba307d3eb65b38382a1c5ed3a81` | `cb1a67aebf0186395b8aa0fab2faad00bd2664c71e09f378fe807ff2dcd562ef` | 0 | no |
| `packages/ui/brand/assets/ai/avatar-512.png` | `52fad620c4e1459336a857ec893a3a3149094943` | `510e756b06b5b87c6ad367d1ce4ab753581e22896d5d096f959faea757c9288f` | 0 | no |
| `packages/ui/brand/assets/membership/core.svg` | `fe5ed2db16f83c1033f3d90dfea64a1e943b0a67` | `894b59f8cf768f5c1b88f88c3529d4d6726a31cbea06e9e9a34b5a644488aa39` | 0 | no |
| `packages/ui/brand/assets/markets/amazon.svg` | `b623e5d51e77a62a48ac5275a1d52e96331b4746` | `e4362f0bc905406bb36646e26b1b3233d4edf179bdfed3b7f2280ae7d7c472bf` | 0 | no |

### 전체 누락 목록 (blob @ parent)

| 경로 | blob | putduk-web |
|---|---|---|
| `packages/ui/brand/assets/ai/avatar-512.png` | `52fad620c4e1459336a857ec893a3a3149094943` | MISSING |
| `packages/ui/brand/assets/ai/hero-illustration-desktop.avif` | `95a7a1ae2f8c06b7e5ddd28f0fab1df4cc371bb8` | MISSING |
| `packages/ui/brand/assets/ai/hero-illustration-desktop.webp` | `3551beac7e61e9a022006f4b683b524e1e5c4052` | MISSING |
| `packages/ui/brand/assets/ai/hero-illustration-mobile.avif` | `e5f1111918e71417e233040b06d8494828b9d6a2` | MISSING |
| `packages/ui/brand/assets/ai/hero-illustration-mobile.webp` | `ca72b81b455e54c9981514268a275a4572f5dfc4` | MISSING |
| `packages/ui/brand/assets/ai/home-v2/manifest.json` | `423944763beb9d9160c5ac02f736dffaa845a6a0` | MISSING |
| `packages/ui/brand/assets/ai/home-v2/peotteok-ai-robot-home-cta-v1.png` | `6d33061d045e6bb4641c2014c3d4e39dd6bce000` | MISSING |
| `packages/ui/brand/assets/ai/home-v2/peotteok-ai-robot-home-summary-v1-desktop.png` | `57cd285bcd1365907fef462025b4c1ae124c9388` | MISSING |
| `packages/ui/brand/assets/ai/home-v2/peotteok-ai-robot-home-summary-v1-mobile.png` | `b352cee6dcbd5f1a02c8e7ad56ea94013861f659` | MISSING |
| `packages/ui/brand/assets/ai/home-v2/peotteok-home-ai-summary-icon-chart-v1.svg` | `5c6d49ebac54e1e43ba173663ea636f2e6093cf5` | MISSING |
| `packages/ui/brand/assets/ai/home-v2/peotteok-home-ai-summary-icon-clock-v1.svg` | `8ec3b5373029407895c1e271a1b890c139bc943e` | MISSING |
| `packages/ui/brand/assets/ai/home-v2/peotteok-home-ai-summary-icon-search-v1.svg` | `9a7f51ac98a7eecaf0bf3389ba8ee33f19de82a5` | MISSING |
| `packages/ui/brand/assets/ai/home-v2/peotteok-home-hero-support-graphic-v1.png` | `b3b65b1ea4a4d1c45425dc1849db4526d6a8c6b6` | MISSING |
| `packages/ui/brand/assets/icons/app-icon-1024.png` | `e4ae47899983e98718cc383a4576b4563ab8d1d9` | MISSING |
| `packages/ui/brand/assets/icons/maskable-source-1024.png` | `e4ae47899983e98718cc383a4576b4563ab8d1d9` | MISSING |
| `packages/ui/brand/assets/markets/README.md` | `bba6a9166113f603ec59f2a27ae9280d60d698a5` | MISSING |
| `packages/ui/brand/assets/markets/amazon.svg` | `b623e5d51e77a62a48ac5275a1d52e96331b4746` | MISSING |
| `packages/ui/brand/assets/markets/coingecko.svg` | `a0356ecd3745e278edffa08bf07ee09980ab49e8` | MISSING |
| `packages/ui/brand/assets/markets/ebay.svg` | `cd57595c7dd46e45b693e573c823abdb40e21adf` | MISSING |
| `packages/ui/brand/assets/markets/frankfurter.svg` | `c9932b1da51b686d8d14d8e6a2f9c42038101eaf` | MISSING |
| `packages/ui/brand/assets/markets/manifest.json` | `df8c1f4934405bff46d9503b8f8aac3032a28ec3` | MISSING |
| `packages/ui/brand/assets/markets/pokemontcg.svg` | `512e381f4fff4d4f650e05eec06783bfcd67f452` | MISSING |
| `packages/ui/brand/assets/markets/yahoo-jp.svg` | `5ba0ddd7827791b73c6241adf68cc0b50ef24d63` | MISSING |
| `packages/ui/brand/assets/markets/ygoprodeck.svg` | `082215ce13a0cf7ac77d90616cfa77a1236360d2` | MISSING |
| `packages/ui/brand/assets/membership/README.md` | `f3fc3719a2b573dd1fe4de704c933641ed1a7b3f` | MISSING |
| `packages/ui/brand/assets/membership/core.svg` | `fe5ed2db16f83c1033f3d90dfea64a1e943b0a67` | MISSING |
| `packages/ui/brand/assets/membership/entry.svg` | `75735e1a26022543f0bccbdfd7c5887400a33575` | MISSING |
| `packages/ui/brand/assets/membership/high.svg` | `f6e6ebba6b433f41af58645a79cc43b8fe2428a0` | MISSING |
| `packages/ui/brand/assets/membership/manifest.json` | `eaeab02de3d6d815b03d459b4a00234c248197b7` | MISSING |
| `packages/ui/brand/assets/membership/sprout.svg` | `c159d884df237d8cf285d1e2ac16aabad196b0ab` | MISSING |
| `packages/ui/brand/assets/membership/vip.svg` | `99591ef59623bed6c67c910702c5334272b1cc08` | MISSING |
| `packages/ui/brand/assets/og/og-default.png` | `88d017c81d6f2ba307d3eb65b38382a1c5ed3a81` | MISSING |
| `packages/ui/brand/assets/wordmark/wordmark-dark.png` | `c4b0cde03a414477573b7232fa4f334c3e02df48` | MISSING |

백엔드에 복구하지 않는다.

## API 호출 계약

putduk-web 존재: quality/api-contract.lock.json · src/lib/api.ts · src/lib/contract-readers.ts

putduk-web 의 packages/sdk · @aipo/sdk 경로 **0**

## SDK SHA 대조

복구 SHA 97b07908 · 백엔드 packages/sdk **57** · putduk-web 동일 경로/blob **0**

| path | restore | blob | putduk-web | match |
|---|---|---|---|---|
| `packages/sdk/package.json` | `97b07908` | `1831aa0b3354b69a2e205d23a5efd03485e42942` | MISSING | 0 |
| `packages/sdk/src/auth/index.ts` | `97b07908` | `0750e11e0cf4cccc23bc2b32e5045b10f4b4cb19` | MISSING | 0 |
| `packages/sdk/src/index.ts` | `97b07908` | `42b332d1152615cb682c3704248486089b0aa3da` | MISSING | 0 |
| `packages/sdk/src/wallet/index.ts` | `97b07908` | `db62aef9d6107e540b2e005e21894cfa22562614` | MISSING | 0 |

상세: quality/putduk-web-sdk-handoff.md 6단계 절.

## PWA / Playwright / axe / Lighthouse / 고객 UI CI

| 검사 | putduk-web 경로 | 백엔드 |
|---|---|---|
| PWA | public/manifest.webmanifest · public/sw.js · e2e/tests/pwa.spec.ts · src/components/gpt/PwaRegister.tsx | 고객 PWA 없음. 백엔드는 push-dispatcher + governance/pwa JSON |
| Playwright | playwright.config.ts · e2e/tests/*.spec.ts (8) | 고객 E2E 없음 |
| axe | e2e/tests/a11y.spec.ts (파일명 axe 0) | absent |
| Lighthouse | lighthouserc.cjs · e2e/lhci-prep.cjs | absent |
| customer UI CI | .github/workflows/pr-quality.yml · nightly.yml | backend-ci 만 |

## 판정

고객 route · 계약 lock · PWA/E2E/LH/CI 는 putduk-web 에 있다.

packages/ui/brand/assets 33개 · @aipo/sdk 57개는 putduk-web HEAD 에 없다 (불일치가 아니라 부재).

백엔드 복구 0. 후속은 putduk-web 레포 작업.
