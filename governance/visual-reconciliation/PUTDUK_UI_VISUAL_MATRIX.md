# PUTDUK UI Visual Matrix

```text
AUDIT = PUTDUK FIGMA ↔ REPO ↔ RUNTIME
BASE_MAIN = 03b2b9076c116950a402070ce646e280e3234086
BRANCH = audit/figma-repo-runtime-reconciliation
REL-207 = NOT STARTED
```

Authority source: `governance/figma/PUTDUK_FIGMA_PROJECT_REGISTRY.json`
Home freeze: `governance/consumer-home-approval/home-approval-freeze.v1.json`
Route authority = actual `apps/web/app/**` and `apps/admin/app/**` page tree.

| SURFACE | ROUTE | REL | PRODUCTION_COMPONENT | DATA_OWNER | VISUAL_AUTHORITY_TYPE | FIGMA_NODE_DESKTOP | FIGMA_NODE_MOBILE | SCREENSHOT_BASELINE | FOUNDER_APPROVED | LOCKED | REGISTRY_APPLY | RUNTIME_ROUTE_EXISTS | STATUS | ACTION |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home | `/` | REL-105 | `HomePageClient` / `HomeDesktopClient` | home-read + wallet + fx + feed | SCREENSHOT_FREEZE_LOCKED | 46:2 BACKUP | 72:762 BACKUP | `baselines/approved-home-*.png` | YES (freeze) | YES | false | YES | LOCKED_PARITY_PASS | freeze vs stub member chrome. Raw `/` without API = unavailable. Home code 0 |
| Opportunity list | `/profits` | REL-106 | `ProfitsDesktopClient` + profits mobile | `GET /api/v1/opportunities` | FOUNDER_REVIEW_CANDIDATE | 76:2 | 116:28 / 122:34 | REL-106 evidence | NO | NO | false | YES | CANDIDATE_RUNTIME_MATCH | chrome match. Not promoted |
| Opportunity room | `/profits/[id]` | REL-107 | `OpportunityDetailClient` | preflight + participate | FOUNDER_REVIEW_CANDIDATE | 96:2 | 104:43 / 109:28 | REL-107 evidence | NO | NO | false | YES | BLOCKED | live-id unverified. Missing-id route captured. Not promoted |
| Participate | modal on room | REL-108 | ParticipateConfirmSheet | participate state machine | FOUNDER_REVIEW_CANDIDATE | 103:315 | 103:314 extra | REL-108 evidence | NO | NO | false | YES | BLOCKED | modal not opened without live room |
| Execution | `/trades/[id]/execute` | REL-109 | `TradeExecuteClient` | trade execution tick | FOUNDER_REVIEW_CANDIDATE | 155:222 | 140:34/142/250/358 | REL-109 evidence | NO | NO | false | YES | BLOCKED | live-id unverified. Missing-id route captured |
| Trades list | `/trades` | REL-110 | `TradesClient` | trade list + wallet buckets | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_PASS | Spark Dash QA. Truth-safe empty |
| Settlement | `/trades/[id]/settlement` | REL-112 | settlement client | REL-015 journal | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | no invented node |
| Wallet hub | `/wallet` | REL-113 | `WalletClient` | wallet buckets | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_PASS | captured. Unavailable balance kept |
| Wallet deposit | `/wallet/deposit` | REL-114/115 | deposit clients | wallet deposit | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Wallet withdraw USDT | `/wallet/withdraw/usdt` | REL-116 | withdraw client | wallet withdraw | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Wallet withdraw KRW | `/wallet/withdraw/krw` | REL-117 | withdraw client | wallet withdraw | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Wallet history | `/wallet/history` | REL-118 | history client | ledger query | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Wallet history detail | `/wallet/history/[journalId]` | REL-119 | history detail | REL-015 | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Account Hub | `/me` | REL-131 / REL-123 | `AccountHub` + `ProfileClient` | `GET /api/v1/auth/session` | FOUNDER_APPROVED_LOCKED | 192:194 | 192:434 | Figma render | YES | YES | false (binding flag) | YES | LOCKED_PARITY_PASS | applied 192:194 / 192:434. apply flag stays false (REL-131 Code Connect) |
| Invite | `/me/invite` | REL-120 | `InviteClient` | referral/me | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Inbox | `/me/inbox` | REL-121 | `InboxClient` | inbox | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Peotteok | `/me/peotteok` | REL-122 | peotteok page | fact-only | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| KYC | `/me/kyc` | REL-124 | `KycClient` | compliance kyc | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | REL-207 not started |
| Settings | `/me/settings` | REL-125 | `SettingsClient` | notification prefs | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Support | `/me/support` | REL-126 | support page | support | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Guides | `/me/guide/**` | REL-127 | guide pages | copy | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | 7 routes |
| Legal | `/me/legal/**` | REL-128 | legal pages | copy | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Compat | `/me/benefits` `/me/membership` `/me/events` `/me/strategies` `/ads` `/l/[variant]` | REL-130 | pages | copy/guards | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Auth login | `/auth/login` | REL-102 | auth | Nest JWT | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Signup | `/auth/signup` | REL-101 | auth | Nest JWT | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Complete profile | `/auth/complete-profile` | REL-103 | auth | session | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Onboarding | `/onboarding` | REL-104 | onboarding | session | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | |
| Admin root | `/admin` | REL-200/201 | admin app | admin JWT | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_PASS | FIGMA_STATUS=NOT_FOUND. 1440 captured |
| Admin users | `/admin/users` | REL-202 | admin users | admin users | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_PASS | 1440 captured |
| Admin user detail | `/admin/users/[id]` | REL-203 | admin user | admin users | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | live id not opened |
| Admin user finance | `/admin/users/[id]/finance` | REL-204 | admin finance | ledger | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | live id not opened |
| Admin ledger | `/admin/ledger` | REL-205 | admin ledger | ledger | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_PASS | 1440 captured |
| Admin wallet | `/admin/wallet` | REL-206 | admin wallet | wallet | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_PASS | 1440 captured |
| Admin other | `/admin/adapters` `ai-logs` `audit` `compliance` `execution-policy` `growth/**` `opportunities` `reports/financial` `risk` `support` `system-control` | REL-200+ | admin pages | admin | NO_FIGMA | — | — | — | NO | NO | false | YES | NO_FIGMA_RUNTIME_UNVERIFIED | extra tree |

## Extra consumer routes discovered

`/ads/[variant]`, `/auth/oauth/kakao`, `/dev/spark-dash-*` (fixture only, not production authority).

## Superseded / backup Figma (not production)

| key | node | class |
|---|---|---|
| home_desktop_backup | 46:2 | BACKUP |
| home_mobile_review | 72:762 | BACKUP |
| account V1 | 169:78 / 169:288 | SUPERSEDED |
| account V2 | 180:102 / 180:430 | SUPERSEDED |
