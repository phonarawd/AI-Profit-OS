# REL-018 ASSET PRODUCTION PIPELINE EVIDENCE

```text
REL = REL-018
TITLE = ASSET_PRODUCTION_PIPELINE 인프라화
STATUS = VERIFY_PASS
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
HOME_ASSET_REWRITE = 0
PARTNER_LOGO_AI_PATH = 0
EMOJI_AS_ICON = 0
```

## IMPLEMENTATION

- 표준 엔트리: `apps/web/scripts/asset-pipeline/run.mjs`
- 단계: source → optimize → hash → public/ → review checklist
- 애드혹 3스크립트 I/O/실패모드: `inventory.v1.json` (main에 복사하지 않음)
- 파트너 로고: official-only. AI kind/URL/generator = 하드페일
- Home 잠금: `home-lock.v1.json` 47 files SHA-256. dest가 spark-dash면 거부
- 이모지 아이콘 대체 경로 0

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/asset-production-pipeline.cjs` | PASS |
| `CI=true node tooling/verify/gate-fast.cjs` | PASS (domain + T0 always; staged 후 asset-production-pipeline 포함) |

## ACCEPTANCE

후속 화면 REL이 `--request` JSON으로 에셋을 넣을 수 있다. Home committed 에셋 교체 0.
