# REL-131 Account Hub — Founder Approval Lock

```text
REL = REL-131
TITLE = Account Hub Figma Desktop + Mobile frames
STATUS = FOUNDER_APPROVED_LOCKED
FOUNDER_APPROVED = YES
LOCKED = YES
VISUAL_REVISION_REQUIRED = NO
REVIEW_DATE = 2026-08-22
SESSION = REL-131 FOUNDER APPROVAL → CLOSE
```

fileKey = `w7Yg8j2x9evuheOSSLqFw5`  
page = `00_Readme` (`0:1`)

## Approved visual authority (exact frames only)

| Surface | frameKey | Name | size |
|---|---|---|---|
| Desktop | `192:194` | Account Hub / Desktop / Spark Dash / Founder Review Candidate V2.1 | 1440×1080 |
| Mobile | `192:434` | Account Hub / Mobile / Spark Dash / Founder Review Candidate V2.1 | 390×693 |

```text
DESKTOP = APPROVED
MOBILE = APPROVED
FOUNDER_APPROVED = YES
LOCK_STATUS = LOCKED
```

Founder reviewed the REL-131 Final Polish candidates and approved **exactly** these two frames.

Later `/me` presentation reconciliation must use these node-ids as visual authority. Founder reopen is required before any retroactive redesign.

Production apply is **not** part of this close. `screenBindings.REL-131.apply = false`.

## History preserved (not deleted, not authority)

| Revision | Desktop | Mobile | classification |
|---|---|---|---|
| V1 | `169:78` | `169:288` | SUPERSEDED |
| V2 | `180:102` | `180:430` | SUPERSEDED |
| V2.1 | `192:194` | `192:434` | FOUNDER_APPROVED_LOCKED |

Evidence folders kept:

- `governance/release-master/rel-131-account-figma/` (V1)
- `governance/release-master/rel-131-account-figma-v2/` (V2)
- `governance/release-master/rel-131-account-figma-final/` (V2.1 + this lock)

## 2026-08-22 existence check (Figma MCP `get_metadata`)

```text
Desktop 192:194 exists = YES
Mobile 192:434 exists = YES
V1 Desktop 169:78 preserved = YES
V1 Mobile 169:288 preserved = YES
V2 Desktop 180:102 preserved = YES
V2 Mobile 180:430 preserved = YES
real node IDs = YES
invented node IDs = NO
```

## Production / next REL

```text
PRODUCTION_UI_CODE_MUTATION = 0
API_MUTATION = 0
SDK_MUTATION = 0
ENGINE_MUTATION = 0
DB_MUTATION = 0
PRODUCTION_DEPLOY = 0
REL_132_STARTED = NO
```

## Registry

`governance/figma/PUTDUK_FIGMA_PROJECT_REGISTRY.json`

```text
account_hub_desktop 192:194 = FOUNDER_APPROVED_LOCKED
account_hub_mobile 192:434 = FOUNDER_APPROVED_LOCKED
approvedAuthority = 2
other candidate frames remain FOUNDER_REVIEW_CANDIDATE
Home 46:2 remains BACKUP
```
