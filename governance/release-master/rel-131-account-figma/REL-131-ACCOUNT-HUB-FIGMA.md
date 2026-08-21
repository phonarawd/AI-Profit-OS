# REL-131 Account Hub Figma Human Gate

```text
REL = REL-131
TITLE = Account Hub Figma Desktop + Mobile frames
STATUS = WAITING_FOUNDER_REVIEW
HUMAN_GATE = YES
FOUNDER_APPROVED = NO
LOCKED = NO
REL_132_STARTED = NO
```

## Frames (real node-ids, not invented)

| Surface | Frame name | frameKey | size |
|---|---|---|---|
| Desktop | Account Hub / Desktop / Spark Dash / Founder Review Candidate | `169:78` | 1440×1080 |
| Mobile | Account Hub / Mobile / Spark Dash / Founder Review Candidate | `169:288` | 390×693 |
| Desktop annotation | REL-131 / Annotation / Desktop | `176:78` | note only |
| Mobile annotation | REL-131 / Annotation / Mobile | `176:80` | note only |

fileKey = `w7Yg8j2x9evuheOSSLqFw5`  
page = `00_Readme` (`0:1`)  
classification = `FOUNDER_REVIEW_CANDIDATE`  
`APPROVED` = 0 · `LOCKED` = 0

Shell source (safe duplicate, not Backup Home):

- Desktop chrome = Opportunity Room Desktop `96:2`
- Mobile chrome = Opportunity Room Mobile `104:43`
- Backup Home `46:2` = not cloned

## Evidence files

| File | Source |
|---|---|
| `CURRENT_RUNTIME_DESKTOP.png` | REL-123 `/me` ready 1440 capture on main `1fd9c690` (`rel-123-profile/runtime-ready-1440.png`) |
| `CURRENT_RUNTIME_MOBILE.png` | REL-123 `/me` ready 390 capture on main `1fd9c690` (`rel-123-profile/runtime-ready-390.png`) |
| `FIGMA_CANDIDATE_DESKTOP.png` | Figma MCP `get_screenshot` of `169:78` |
| `FIGMA_CANDIDATE_MOBILE.png` | Figma MCP `get_screenshot` of `169:288` |
| `COMPARE_DESKTOP.png` | side-by-side runtime \| candidate |
| `COMPARE_MOBILE.png` | side-by-side runtime \| candidate |

Runtime SHA256:

- desktop `67567AAAC2E46257816D6D946C6A6E519C1A4A146AA581A0D257E175B3EE82AD`
- mobile `9A0E122B6862ED63F3CF692E87D54A9FC551604BC0CA3F9E0BF22F227703521B`

Worktree has no local `node_modules`. Fresh Next boot was skipped to keep Phase0 RAM. Runtime truth is the committed REL-123 ready capture on the same main SHA.

## Desktop visual summary

Spark Dash navy sidebar (8 items, none active) + Account Hub content:

1. Identity: 회원님 · 로그인되어 있어요 · 프로필이 준비되어 있어요 · 로그아웃
2. Scope tiles: 본인 확인 · 친구 초대
3. Account management grid: 쪽지함 · 설정 · 지갑(shortcut, no number) · 퍼뜩 · 고객센터 · 이용 안내 · 약관과 정보
4. Compat 기타: 혜택 · 멤버십 · 이벤트 · 내 전략

Sidebar wallet amounts sanitized to `—`. Header user = `회원님` / `—`. Room FOMO ticker hidden. AI sidebar copy is account-safe, not opportunity FOMO.

## Mobile visual summary

Same product meaning, not a shrunk desktop:

- Header: 퍼뜩 left · bell right · no unread badge
- First viewport: identity + 본인 확인 + 친구 초대
- Remaining destinations + 기타 scroll below
- Bottom nav 5 preserved · 더보기 only active · `ACTIVE_NAV_COUNT = 1`
- Room participate CTA removed

## Truth checks

| Check | Result |
|---|---|
| fake account name / tier / Lv | 0 (`회원님` / `—`) |
| fake verified / KYC approved | 0 (`프로필이 준비되어 있어요`) |
| fake money / balance | 0 (wallet = shortcut copy only · sidebar `—`) |
| fake unread / message counts | 0 |
| fake live support | 0 |
| PII leak | 0 |
| legacy 3-tab / 5-tab shell | 0 |
| Backup Home clone | 0 |
| production UI / API / engine / DB mutation | 0 |
| production deploy | 0 |
| REL-132 started | NO |

## Founder review

Cursor does not approve.

1. Desktop Account Hub 방향 승인?
2. Mobile Account Hub 방향 승인?
3. 수정이 필요한 핵심 영역이 있는가?

## STOP

```text
FIGMA_STATUS = FOUNDER_REVIEW_CANDIDATE
FOUNDER_REVIEW_READY = YES
STOP_REASON = REL-131 Founder Review Human Gate
```
