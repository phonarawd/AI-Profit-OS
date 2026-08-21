# REL-131 Account Hub Figma V2.1 — Final Polish Visual QA

> Founder approved these exact V2.1 frames on 2026-08-22. Lock record = `FOUNDER_APPROVAL.md`. This file stays the review package.

```text
REL = REL-131
REVISION = V2 FINAL POLISH
STATUS = FOUNDER_APPROVED_LOCKED
FIGMA_STATUS = FOUNDER_APPROVED_LOCKED
FOUNDER_APPROVED = YES
LOCKED = YES
```

fileKey = `w7Yg8j2x9evuheOSSLqFw5`  
page = `00_Readme` (`0:1`)

V2 was **not overwritten**. V2.1 is a duplicate + polish.

## Frames (real node-ids)

| Surface | Name | frameKey | size |
|---|---|---|---|
| V1 Desktop (preserved) | Account Hub / Desktop / Spark Dash / Founder Review Candidate | `169:78` | 1440×1080 |
| V1 Mobile (preserved) | Account Hub / Mobile / Spark Dash / Founder Review Candidate | `169:288` | 390×693 |
| V2 Desktop (preserved) | Account Hub / Desktop / Spark Dash / Founder Review Candidate V2 | `180:102` | 1440×1080 |
| V2 Mobile (preserved) | Account Hub / Mobile / Spark Dash / Founder Review Candidate V2 | `180:430` | 390×693 |
| **V2.1 Desktop (current candidate)** | Account Hub / Desktop / Spark Dash / Founder Review Candidate V2.1 | `192:194` | 1440×1080 |
| **V2.1 Mobile (current candidate)** | Account Hub / Mobile / Spark Dash / Founder Review Candidate V2.1 | `192:434` | 390×693 |
| V2.1 Desktop annotation | REL-131 / Annotation / Desktop V2.1 | `195:630` | note only |
| V2.1 Mobile annotation | REL-131 / Annotation / Mobile V2.1 | `195:632` | note only |
| Mobile scroll proof (evidence) | REL-131 / Mobile V2.1 / Scroll Content Proof | `195:328` | 390×1119 |

## Founder review URLs

- Desktop V2.1: https://www.figma.com/design/w7Yg8j2x9evuheOSSLqFw5?node-id=192-194
- Mobile V2.1: https://www.figma.com/design/w7Yg8j2x9evuheOSSLqFw5?node-id=192-434

## Evidence

| File | Source |
|---|---|
| `V2_DESKTOP.png` | Figma `180:102` |
| `FINAL_DESKTOP.png` | Figma `192:194` |
| `COMPARE_V2_FINAL_DESKTOP.png` | side-by-side V2 \| V2.1 |
| `V2_MOBILE.png` | Figma `180:430` |
| `FINAL_MOBILE.png` | Figma `192:434` |
| `COMPARE_V2_FINAL_MOBILE.png` | side-by-side V2 \| V2.1 |
| `OPPORTUNITY_DESKTOP_REFERENCE.png` | Opportunity Desktop `76:2` |
| `OPPORTUNITY_MOBILE_REFERENCE.png` | Opportunity Mobile `116:28` |
| `MOBILE_NAV_CROP.png` | V2.1 first-viewport bottom nav crop |
| `MOBILE_SCROLL_PROOF.png` | unclipped scroll `195:328` |

V2 evidence folder `rel-131-account-figma-v2/` is unchanged.

## Screenshot authority

Report values below were written **after** inspecting the rendered PNGs.

Mobile nav was **not** trusted from the node tree alone. First-viewport PNG pixels were sampled:

| Tab | Icon fg | Pink pixels | Gray pixels |
|---|---|---|---|
| 홈 | #94a0b2 family | 0 | >0 |
| 기회 탐색 | #94a0b2 family | 0 | >0 |
| 내 자산 | #94a0b2 family | 0 | >0 |
| 알림 | #94a0b2 family | 0 | >0 |
| 더보기 | #ff2e63 family | >0 | residual only |

Desktop sidebar pink-pixel scan in the 8-item stack: **0**.

## Design passes

| Pass | What changed |
|---|---|
| PASS_1 | Duplicate V2 → V2.1. Mobile: inactive nav icons/labels forced `#94a0b2`. 더보기 stays pink + mark. Scroll `overflow=VERTICAL`, section gap 22, pad-bottom 40. Desktop: title+profile top band, drop 바로 확인 outer stroke/accent, unify priority card height 76, legal width 742, one chevron component, hide leftover PRIMARY, delete hidden fake 2,450 USDT / Lv.3 nodes. |
| PASS_2 | Desktop: remove top-band white fill (it created a white hole), hairline rule, remove leftover pink marker on 본인 확인. Mobile: pad-bottom 48 + end spacer. Nav crop + pixel audit. |
| PASS_3 | Opportunity compare. Scroll proof `195:328` confirms 도움 / 기타 서비스 fully present. Sidebar crop ACTIVE=NONE. Final renders = PASS_2 candidates (no further candidate mutation). |

## Desktop gate (FINAL_DESKTOP.png)

```text
BROKEN_WHITE_BLOCKS = 0
LOW_CONTRAST = 0
TOP_EMPTY_SPACE = BALANCED
PRIORITY_SECTION = CLEAN
PRIORITY_OUTER_BOX = CLEAN / NON-REDUNDANT
GRID_ALIGNMENT = PASS
CARD_HEIGHTS = CONSISTENT
ICON_FAMILY = CONSISTENT
CHEVRON_FAMILY = CONSISTENT
CUSTOMER_SUPPORT_CHEVRON = NORMALIZED
SIDEBAR_ACTIVE_COUNT = 0
SIDEBAR_ACTIVE_ITEMS = 0
FAKE_VALUE = 0
SPARK_DASH_CONSISTENCY = PASS
```

Desktop polish kept V2 direction: dark Spark Dash sidebar + warm-white canvas + compact profile + light destination cards. Profile sits on the right of the page title so weight is not stacked only on the top-left. 바로 확인 is section title + two priority cards (no outer rectangle, no decorative pink marker). 약관과 정보 is 742 wide, not a stretched empty full-bleed.

## Mobile gate (FINAL_MOBILE.png + NAV crop + scroll proof)

```text
PAGE_TITLE = 계정
ACTIVE_NAV_COUNT = 1
ACTIVE_NAV_ITEM = 더보기
HOME_NAV = NEUTRAL
OPPORTUNITY_NAV = NEUTRAL
WALLET_NAV = NEUTRAL
NOTIFICATION_NAV = NEUTRAL
MORE_NAV = ACTIVE
HOME_PINK = NO
OPPORTUNITY_PINK = NO
WALLET_PINK = NO
NOTIFICATION_PINK = NO
MORE_PINK = YES
BOTTOM_NAV_OVERLAP = 0
SAFE_AREA = PASS
LAST_CONTENT_REACHABLE = YES
LAST_ITEM_REACHABLE = YES
FIRST_VIEWPORT = PASS
GIANT_REPETITIVE_CARDS = 0
GROUPING = PASS
FAKE_VALUE = 0
SPARK_DASH_CONSISTENCY = PASS
```

First 390×693 viewport: brand, 계정 title, compact profile, 바로 확인, 계정 관리 grouped rows, bottom nav. `도움` starts at y=573 inside a 569 viewport — it does **not** peek under the nav. Full 도움 / 서비스 정보 / 기타 서비스 exist on the vertical scroll (`195:328`).

## Truth

```text
FAKE_ACCOUNT_STATE = 0
FAKE_VERIFIED_STATE = 0
FAKE_KYC = 0
FAKE_NOTIFICATION_COUNT = 0
FAKE_MONEY = 0
PII_LEAK = 0
```

Sidebar amount owner is still `잔액을 확인할 수 없음`. Hidden V2 leftover `2,450.00` / `USDT` / `≈ ₩3,332,000` / `Lv.3` nodes were removed on V2.1 only.

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
FOUNDER_APPROVED = YES
LOCKED = YES
REL_132_STARTED = NO
STOP_REASON = Human Gate closed. See FOUNDER_APPROVAL.md
```
