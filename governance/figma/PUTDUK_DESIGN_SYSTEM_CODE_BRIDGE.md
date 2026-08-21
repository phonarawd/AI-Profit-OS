# PUTDUK Design System ↔ Code Bridge

Lightweight mapping. Not presentation authority. Not REL-207.

```text
FILE = w7Yg8j2x9evuheOSSLqFw5
CLASSIFICATION = FOUNDER_REVIEW_CANDIDATE for Auth frames
REVISION = V3_POLISH
VISUAL_REVIEW = PENDING_FOUNDER_REVIEW
CODE_CONNECT = CANDIDATE_ONLY
APPLIED = 0
PRODUCTION_AUTH_VISUAL_APPLY = 0
PRODUCTION_ONBOARDING_APPLY = 1
HOME_MUTATION = 0
ACCOUNT_HUB_MUTATION = 0
REL_207_STARTED = NO
```

Machine table: `PUTDUK_DESIGN_SYSTEM_CODE_BRIDGE.json`

## Token audit

| Token | Class | Path / collection | Action |
|---|---|---|---|
| Figma `color/bg/*` `color/text/*` `color/action/*` `color/status/*` `spacing/*` `radius/*` | ACTIVE_SEMANTIC_TOKEN | PUTDUK / Semantic · Dimensions | Auth Figma binds these |
| Figma primitives `ink/*` `paper/*` `pink/500` | ACTIVE_SEMANTIC_TOKEN | PUTDUK / Primitives | Alias source only |
| `color/border/focus` `color/border/error` `color/action/disabled` `color/status/error` | ACTIVE_SEMANTIC_TOKEN | Semantic aliases added 2026-08-22 | V2: focus alias → pink/500 + 2px weight. error/disabled unchanged |
| `luxFintech.color.*` | RUNTIME_COMPAT_TOKEN | `packages/ui/tokens/lux-fintech.ts` | Production Auth still uses lux-* classes. Not deleted |
| `luxFintech.layout.sidebar/hero*` | HISTORICAL_VISUAL_GEOMETRY | same file | ADR-017 geometry. Not used as Auth visual authority |
| Home `--sd-*` / `--sdm-*` | LOCKED Home local | spark-dash-home CSS | Do not import into Auth |

`TOKEN_MUTATION` this slice = 4 Figma semantic aliases only. Repo token rename/delete = 0.

## Component bridge

STATUS: CONNECTED · PARTIAL · FIGMA_ONLY · CODE_ONLY · SUPERSEDED · NOT_APPLICABLE · CONFLICT

| FIGMA_COMPONENT | FIGMA_NODE_ID | FIGMA_VARIANTS | PRODUCTION_COMPONENT | PRODUCTION_PATH | PRODUCTION_PROPS | TOKEN_OWNER | STATUS | ACTION |
|---|---|---|---|---|---|---|---|---|
| PrimaryButton | 2:172 | Default, Disabled | TouchButton | packages/ui/components/lux/TouchButton.tsx | variant=primary\|secondary\|ghost, disabled, busy via parent | Figma action/primary · runtime lux-accent | PARTIAL | Code Connect candidate. Loading is parent `busy` copy, not a Button variant |
| AuthOAuthButton | 198:568 | Kakao Default/Disabled/Loading · Google Disabled · Passkey Default/Disabled/Loading | TouchButton + AuthLogin/AuthSignup | packages/ui/components/auth/AuthLogin.tsx · AuthSignup.tsx | onKakao, busy, isKakaoOAuthReady | Kakao #FEE500 partner · not PUTDUK action | PARTIAL | Google has Disabled only. Signup Passkey is always disabled in code |
| AuthTextField | 198:553 | Default, Focus, Error, Disabled | native input in Auth* | AuthLogin / AuthSignup / AuthCompleteProfile | email, displayName, phone, birthDate, referralCode | color/border/* aliases | PARTIAL | No shared AuthField component yet. Do not invent PasswordField |
| AuthAlert | 198:575 | Error, Note | `<p role=alert>` / `role=status` | AuthLogin / AuthSignup / AuthCompleteProfile | error, note | status/error · text/secondary | PARTIAL | Maps to props, not a shared Alert component |
| AuthCheckbox | 198:586 | Unchecked, Checked, Error | native checkbox | AuthSignup.tsx | terms, marketing | action/primary | PARTIAL | Error = AGREEMENT_REQUIRED / TERMS_REQUIRED |
| AuthLink | 198:587 | — | `<a href>` | AuthLogin / AuthSignup | /auth/signup · /auth/login | action/primary | CONNECTED | |
| OpportunityCard | 7:73 | Desktop, Mobile | OpportunityCard | packages/ui/components/opportunity/OpportunityCard.tsx | — | — | CONNECTED | Auth must not copy |
| WalletSummary | 4:65 | Light, Dark | wallet components | packages/ui/components/wallet/** | — | — | NOT_APPLICABLE | Auth reference only. Do not copy |
| NavItem | 4:14 | Default, Active | shell nav | packages/ui/components/shell/** | — | — | NOT_APPLICABLE | GuestChrome has no logged-in nav |
| StatusBadge | 3:10 | Available/Matching/Pending/Unavailable | opportunity badges | packages/ui/components/opportunity/** | — | — | NOT_APPLICABLE | |
| PasswordField | — | — | — | — | — | — | NOT_APPLICABLE | Production has no password login |
| AuthLogin screen | 198:591 / 199:523 | Desktop 1440 · Mobile 390 | AuthLogin + LoginRuntime | packages/ui/components/auth/AuthLogin.tsx · apps/web/app/auth/login/** | busy, error, note, onKakao, onMagic | Spark Dash semantic | FIGMA_ONLY visual | Production visual apply = 0 |
| AuthSignup screen | 200:527 / 201:539 | Desktop · Mobile | AuthSignup + SignupRuntime | packages/ui/components/auth/AuthSignup.tsx · apps/web/app/auth/signup/** | terms, marketing, referral, onKakao, onMagic | Spark Dash semantic | FIGMA_ONLY visual | |
| AuthCompleteProfile screen | 201:571 / 201:604 | Desktop · Mobile | AuthCompleteProfile + CompleteProfileRuntime | packages/ui/components/auth/AuthCompleteProfile.tsx · apps/web/app/auth/complete-profile/** | displayName, phone, birthDate, email?, onSave | Spark Dash semantic | FIGMA_ONLY visual | B_complete ≠ verified |
| Onboarding screen | 237:1813 / 237:2155 | Automation Story 7단 Desktop/Mobile | OnboardingFlow | packages/ui/components/onboarding/OnboardingFlow.tsx · apps/web/app/onboarding/page.tsx | skip=usdt only | Spark ink/paper/fuchsia local | PARTIAL | productionOnboardingApply=1 · Auth login/signup apply 0 |
| AuthInviteDisclosure | 237:610 | Collapsed, Expanded | AuthSignup referral | packages/ui/components/auth/AuthSignup.tsx | optional referralCode | color/text/* | PARTIAL | Default Expanded matches always-visible optional field |
| OnboardingStoryVisual | 237:1135 | 7 steps × Desktop/Mobile/768 | OnboardingStoryVisual | packages/ui/components/onboarding/OnboardingStoryVisual.tsx | step | Spark primitives | PARTIAL | WEBGL/CANVAS/GSAP 0 · Home CSS 0 |

## Auth UX state matrix

Invented backend states = 0. Password / EMAIL_CONFLICT / fake success = not in contract.

### /auth/login — AuthLogin + LoginRuntime

| STATE | TRIGGER | USER_VISIBLE_RESULT | AVAILABLE_ACTIONS | NEXT_STATE | DATA_OWNER |
|---|---|---|---|---|---|
| DEFAULT | Guest, Kakao env ready | Kakao primary, Passkey if WebAuthn, Google disabled, email collapsed | Kakao, Passkey, email toggle, signup link | SUBMITTING / EMAIL_EXPANDED / OAUTH_REDIRECTING | isKakaoOAuthReady · isWebAuthnSupported |
| KAKAO_UNAVAILABLE | NEXT_PUBLIC_OAUTH_KAKAO_ENABLED ≠ 1 | Kakao disabled + kakaoUnavailable | Passkey/email/signup | DEFAULT | Infra OAuth flag |
| EMAIL_EXPANDED | email toggle | email field + submit | send magic / collapse | SUBMITTING / MAGIC_SENT / SERVER_ERROR | onMagic |
| SUBMITTING | Kakao or magic in flight | busy copy, controls disabled | none | OAUTH_REDIRECTING / MAGIC_SENT / SERVER_ERROR | LoginRuntime.busy |
| MAGIC_SENT | requestMagicLink OK | note 메일함을 확인해 주세요 | stay / retry | DEFAULT | requestMagicLink |
| SERVER_ERROR | AuthError / network | genericError or mapped code | retry | DEFAULT | authUserMessage |
| TOO_MANY_REQUESTS | 429 | 요청이 많아요… | wait / retry | DEFAULT | Nest rate limit |
| PASSKEY_UNSUPPORTED | !WebAuthn | passkey disabled + fallback copy | other methods | DEFAULT | webauthn-ready |
| OAUTH_REDIRECTING | startKakaoOAuth ready | browser leaves to authorizeUrl | none | session on return | startKakaoOAuth |
| ALREADY_AUTHENTICATED | fetchAuthSession hit | no login chrome; replace | none | / or /auth/complete-profile | continuePathAfterAuth |

No INVALID_CREDENTIALS — there is no password grant.

### /auth/signup — AuthSignup + SignupRuntime

| STATE | TRIGGER | USER_VISIBLE_RESULT | AVAILABLE_ACTIONS | NEXT_STATE | DATA_OWNER |
|---|---|---|---|---|---|
| DEFAULT | Guest, terms unchecked | Kakao/Google/Passkey disabled · termsNeeded | check terms, email toggle, login link | TERMS_ACCEPTED / EMAIL_EXPANDED | local terms |
| TERMS_ACCEPTED | terms checked + Kakao ready | Kakao enabled | Kakao, email, marketing, referral | SUBMITTING / OAUTH_REDIRECTING | termsAcceptedAt |
| AGREEMENT_REQUIRED | Kakao/email while !terms | termsNeeded / TERMS_REQUIRED | check terms | TERMS_ACCEPTED | AuthError TERMS_REQUIRED |
| EMAIL_EXPANDED | email toggle | email field | submit if terms | SUBMITTING | signupStageA email_magic |
| SUBMITTING | in flight | busy | none | REDIRECTING / SERVER_ERROR | SignupRuntime.busy |
| SERVER_ERROR | AuthError | mapped copy | retry | DEFAULT | authUserMessage |
| ALREADY_AUTHENTICATED | session exists | replace | none | continuePathAfterAuth | fetchAuthSession |

Signup Passkey is disabled in production (not a login-capable control).

### /auth/complete-profile — Stage B

| STATE | TRIGGER | USER_VISIBLE_RESULT | AVAILABLE_ACTIONS | NEXT_STATE | DATA_OWNER |
|---|---|---|---|---|---|
| DEFAULT | session + not B_complete · emailMissing | name/phone/email/birth | edit, save | SUBMITTING | AuthCompleteProfile |
| EMAIL_HIDDEN | emailAlreadyKnown | email field hidden | save | SUBMITTING | emailMissing=false |
| VALIDATION_ERROR | NAME_INVALID / PHONE_INVALID / AGE_REQUIRED / VALIDATION_ERROR | field + alert | fix, save | DEFAULT | patchAuthProfile |
| SUBMITTING | save | saveBusy | none | REDIRECT / SERVER_ERROR | CompleteProfileRuntime |
| REDIRECT_ONBOARDING | patch OK | replace /onboarding | none | /onboarding | onboardingStage B_complete |
| ALREADY_B_COMPLETE | session.onboardingStage=B_complete | replace /onboarding | none | /onboarding | session. Not verified/KYC |
| UNAUTHENTICATED | no session | replace /auth/login | none | /auth/login | fetchAuthSession |

`B_complete` means Stage B profile saved. It is not KYC and not “verified”.

### /onboarding — OnboardingFlow

| STATE | TRIGGER | USER_VISIBLE_RESULT | AVAILABLE_ACTIONS | NEXT_STATE | DATA_OWNER |
|---|---|---|---|---|---|
| TONE | first visit / saved | 짧게/비교/한 줄씩 | pick tone | IDENTITY | localStorage peotteok_tone_band |
| IDENTITY | after tone | compare mini + next/back | next, back | PARTNER | localStorage peotteok_onboarding_step |
| PARTNER | next | partner strip | next, back | DEMO | same |
| DEMO | next | demo card; next disabled until open | open demo, next, back | USDT | demoOpen local |
| USDT | next | why-charge copy | next, skip, back | ACTION | skip allowed only here |
| ACTION | next | utility CTA | next, back | PAYOUT | — |
| PAYOUT | next | startApp + continueReal | start → / | / | STORAGE_KEY=done |

Session relationship: onboarding is experiential. Login of B_complete user goes to `/` via `continuePathAfterAuth`, not forced through /onboarding.

## Conflicts

No `VISUAL_FUNCTIONAL_CONTRACT_CONFLICT`.

A11y in Figma candidate (design stage, not axe PASS):

- AuthOAuthButton / PrimaryButton / AuthTextField input = 52 / 52 / 48
- AuthCheckbox / AuthLink hit area = 48 after polish
- Focus variant uses `color/border/focus` (not color-only error)
- Error uses `color/border/error` + helper text (not color alone)
- 768 / 1024 = same route/state, true viewport stacked frames (237:2266 / 237:2337). Not 390-in-768. Not a cropped 1440.

Unresolved Founder decisions (do not auto-lock):

1. Desktop Auth split (brand panel + card) vs current GuestChrome `max-w-lg` stack
2. Keep copy SSOT emoji headlines or drop in visual apply
3. Kakao Disabled = muted gray (current candidate) vs faded yellow
4. Email control as 48px ghost button vs text link

## Evidence

`governance/figma/evidence/auth-founder-review-candidate/`
`governance/figma/evidence/auth-onboarding-v3/`

Performance (design contract, not production apply): WEBGL=0 CANVAS=0 PARTICLE=0 JS_ANIMATION_LOOP=0 ANIMATED_BLUR=0. Motion optional, transform/opacity only, reduced-motion static. Fixture notes live in 07_Dev-Handoff only.
