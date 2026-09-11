# 루트 pnpm override 근거 (4단계 커밋 3)

| 패키지 | pin | 근거 |
|---|---|---|
| `qs` | `6.16.0` | `pnpm view qs version` = 6.16.0 (patched >=6.16.0). lockfile에 6.15.x 잔여가 있으면 moderate advisory 2건. |
| `multer` | `2.3.0` | KYC `FileFieldsInterceptor` (`services/api-nest/src/compliance/kyc.controller.ts`) → `@nestjs/platform-express` 전이 의존. 직접 require 0. |
| `sharp` | `0.35.4` | `pnpm why sharp` = `wrangler` → `miniflare`. 루트 직접 의존 0. |

제거한 루트 devDependency (`pnpm why` 소비자 0, 브라우저 E2E 삭제 후): `@playwright/test` · `@axe-core/playwright` · `axe-core` · `jsdom`. KEEP HTTP spec 3개는 `node:test` 러너.

Restore note: lockfile regenerate after this pin. SHA contrast is stage 6.
