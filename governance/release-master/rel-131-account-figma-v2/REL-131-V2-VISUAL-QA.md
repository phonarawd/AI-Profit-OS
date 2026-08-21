# REL-131 Account Hub Figma V2 — Visual QA

```text
REL = REL-131
REVISION = V2
STATUS = WAITING_FOUNDER_REVIEW
FIGMA_STATUS = FOUNDER_REVIEW_CANDIDATE
FOUNDER_APPROVED = NO
LOCKED = NO
```

fileKey = `w7Yg8j2x9evuheOSSLqFw5`  
page = `00_Readme` (`0:1`)

## Frames

| Surface | Name | frameKey | size |
|---|---|---|---|
| V1 Desktop (preserved) | Account Hub / Desktop / Spark Dash / Founder Review Candidate | `169:78` | 1440×1080 |
| V1 Mobile (preserved) | Account Hub / Mobile / Spark Dash / Founder Review Candidate | `169:288` | 390×693 |
| V2 Desktop (current candidate) | Account Hub / Desktop / Spark Dash / Founder Review Candidate V2 | `180:102` | 1440×1080 |
| V2 Mobile (current candidate) | Account Hub / Mobile / Spark Dash / Founder Review Candidate V2 | `180:430` | 390×693 |
| V2 Desktop annotation | REL-131 / Annotation / Desktop V2 | `187:198` | note only |
| V2 Mobile annotation | REL-131 / Annotation / Mobile V2 | `187:200` | note only |

V1 was **not overwritten**. Comparison evidence only.

## Founder review URLs

- Desktop V2: https://www.figma.com/design/w7Yg8j2x9evuheOSSLqFw5?node-id=180-102
- Mobile V2: https://www.figma.com/design/w7Yg8j2x9evuheOSSLqFw5?node-id=180-430

## Evidence

| File | Source |
|---|---|
| `V1_DESKTOP.png` | Figma `169:78` |
| `V2_DESKTOP.png` | Figma `180:102` |
| `COMPARE_DESKTOP_V1_V2.png` | side-by-side |
| `V1_MOBILE.png` | Figma `169:288` |
| `V2_MOBILE.png` | Figma `180:430` |
| `COMPARE_MOBILE_V1_V2.png` | side-by-side |
| `SPARK_DASH_DESKTOP_REFERENCE.png` | Opportunity Desktop `76:2` |
| `SPARK_DASH_MOBILE_REFERENCE.png` | Opportunity Mobile `116:28` |

## Design passes

| Pass | What changed |
|---|---|
| PASS_1 | Opportunity Desktop/Mobile shell clone. Light canvas + dark mobile. New IA composition. Fake money hidden. |
| PASS_2 | Compact profile. Priority left accent. Legal quieter. Wallet empty-amount hole removed. Mobile grouped rows + 더보기 active. Brand title 계정. |
| FINAL_POLISH | Nav icons all neutral (알림 pink leftover muted). Priority accent bar instead of broken stroke. V2 annotations. |

## Visual QA scorecard

| Item | Desktop | Mobile |
|---|---|---|
| Brand consistency | PASS | PASS |
| Information hierarchy | PASS | PASS |
| Spacing | PASS | PASS |
| Typography | PASS | PASS |
| Contrast | PASS | PASS |
| Navigation | PASS | PASS |
| Scannability | PASS | PASS |
| Mobile usability | — | PASS |
| Premium feeling | PASS | PASS |
| Truth safety | PASS | PASS |

REVISE = 0 after FINAL_POLISH. Cursor does **not** approve.

## Desktop gate

```text
BROKEN_WHITE_BLOCKS = 0
TEXT_CONTRAST = PASS
INFORMATION_HIERARCHY = PASS
GRID = PASS (priority 2 · management 2x3 · legal lower · compat 4)
SIDEBAR_ACTIVE_ITEM = NONE
SPARK_DASH_CONSISTENCY = PASS (dark shell + warm-white canvas, Pretendard, PUTDUK tokens)
```

## Mobile gate

```text
PAGE_TITLE = 계정
FIRST_VIEWPORT = brand + title + profile + priority + account rows + bottom nav
CARD_REPETITION = 0 (grouped rows, not endless identical cards)
GROUPING = PASS
BOTTOM_NAV_ACTIVE = 더보기 only
SPARK_DASH_CONSISTENCY = PASS
```

## Truth

```text
FAKE_ACCOUNT_STATE = 0   (회원님)
FAKE_VERIFIED_STATE = 0  (프로필이 준비되어 있어요)
FAKE_KYC = 0
FAKE_NOTIFICATION_COUNT = 0
FAKE_MONEY = 0           (sidebar = 잔액을 확인할 수 없음 · no USDT number)
PII_LEAK = 0
```

## V1 → V2 delta

| Problem | V1 | V2 |
|---|---|---|
| Broken white blocks / white-on-white | yes | removed · light canvas + dark text |
| Settings-page look | identical dark cards | Spark Dash shell + card rhythm |
| Same-weight cards | yes | Priority / Management / Legal / Compat |
| Empty hero | large white identity | compact profile |
| Random grid | 2 → 3 → orphan → 4 pills | intentional sections |
| Desktop active nav | 기회 탐색 leftover | NONE |
| Mobile identity | no page title | 계정 |
| Mobile endless cards | yes | grouped rows |
| Missing money as `— USDT` | looks broken | 잔액을 확인할 수 없음 |

## Production

```text
PRODUCTION_UI_CODE_MUTATION = 0
API_MUTATION = 0
SDK_MUTATION = 0
ENGINE_MUTATION = 0
DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
```

## STOP

```text
FOUNDER_REVIEW_READY = YES
REL_132_STARTED = NO
MERGE = NO
STOP_REASON = REL-131 V2 Founder Review Human Gate
```
