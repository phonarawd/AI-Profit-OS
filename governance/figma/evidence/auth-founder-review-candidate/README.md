# Auth Figma Founder Review Candidate V2 — screenshots

```text
CLASSIFICATION = FOUNDER_REVIEW_CANDIDATE
REVISION = V2
FOUNDER_APPROVED = NO
LOCKED = NO
VISUAL_REVIEW = PENDING_FOUNDER_REVIEW
PRODUCTION_AUTH_APPLY = 0
REL_207_STARTED = NO
PR_30_MERGE = HOLD
DESIGN_FIXTURE_ONLY
```

Recaptured from fileKey `w7Yg8j2x9evuheOSSLqFw5` on 2026-08-22 after Spark Dash visual refinement. Previous V1 screenshots were replaced; node IDs were kept in place.

| file | node |
|---|---|
| login-desktop.png | 198:591 |
| login-mobile.png | 199:523 |
| signup-desktop.png | 200:527 |
| signup-mobile.png | 201:539 |
| complete-profile-desktop.png | 201:571 |
| complete-profile-mobile.png | 201:604 |
| onboarding-desktop.png | 201:635 |
| onboarding-mobile.png | 201:672 |
| auth-flow.png | 201:696 |

## Candidate visual copy (production copy unchanged)

`packages/ui/copy/ko/auth.ts` / `onboarding.ts` still contain OS emoji headlines. This candidate does **not** edit production copy.

| surface | production SSOT | candidate visual headline |
|---|---|---|
| Login | `👋 다시 오신 걸 환영해요` | 다시 오신 걸 환영해요 |
| Signup | `✨ 퍼뜩 시작하기` | 퍼뜩 시작하기 |
| Complete Profile | `📝 기본 정보만 남겨 주세요` | 기본 정보만 남겨 주세요 |
| Onboarding identity | `✨ 글로벌 시세·가격을 비교해 보여 드려요` | 글로벌 시세·가격을 비교해 보여 드려요 |

Emphasis uses 퍼뜩 Spark glyph `↯`, not OS emoji.

## Founder visual decisions locked for V2

- Desktop = left Spark Dash brand pane / right Auth task pane
- Kakao disabled = muted neutral gray
- Email = tertiary text inside a 48px hit target
- Mobile Signup invite code = optional disclosure (`초대 코드가 있나요?`) + optional field
- Focus = `color/border/focus` → pink/500 + 2px weight
