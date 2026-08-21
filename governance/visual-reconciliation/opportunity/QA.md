# Opportunity family — candidate QA

```text
FOUNDER_APPROVED = NO
LOCKED = NO
```

| Surface | Figma | Runtime | Verdict |
|---|---|---|---|
| `/profits` | 76:2 / 116:28 | `list-RUNTIME_*` | Chrome matches REL-106 candidate (sidebar, search, chips). List body was feed error, not a new product decision. `CANDIDATE_RUNTIME_MATCH` for chrome. |
| `/profits/[id]` | 96:2 / 104:43 | `room-RUNTIME_MISSING_*` (no live id) | `BLOCKED` / live-id unverified. Missing-id route captured. Not a product mismatch. |
| Participate 103:315 | reference saved | modal not opened | `BLOCKED` / live room required |
| Execute 155:222 / 140:34 | reference saved | `execute-RUNTIME_MISSING_DESKTOP.png` | `BLOCKED` / live-id unverified |

Auto-repair was not applied. Candidate remains candidate.
