# REL-404 Lighthouse + performance budgets

```text
REL = REL-404
STATUS = COMPLETED
LOCAL_FULL_LIGHTHOUSE: 0
NUMERIC_SLO_INVENTED: 0
HOME_VISUAL_DOWNGRADE: 0
HOME_GEOMETRY_REWRITE: FORBIDDEN
CI_EQUIVALENT = static budget gate
FULL_LH = workflow_dispatch HUMAN + URL (later)
```

번들/이미지/lazy 예산을 후순위로 미루지 않는다.
이 REL은 **예산 파일 + 게이트 경로**를 연다. 수치 Core Web Vitals SLO는 창작하지 않는다
(`peotteok-performance-target.mdc` §6 · `UNSPECIFIED_PERF_BUDGET`).

## 예산 (3종)

| id | 종류 | 내용 |
|----|------|------|
| bundle | policy | Home geometry/CSS를 점수 때문에 깎지 않음. split/static 선호. 충돌은 PO |
| image | policy | ProductImage `sizes` + 포맷 계약. Hero = AVIF/WebP. 새 optimizer 0 |
| lazy | policy | 기본 lazy. priority는 above-fold/Hero/첫 카드만 |

SSOT: `governance/performance/budgets.v1.json`

## CI

| 경로 | 하는 일 |
|------|---------|
| `gate.yml` `REL-404 lighthouse budget` | 정적 예산 게이트. 매 PR |
| `.github/workflows/lighthouse.yml` | `workflow_dispatch` only. 풀 LH 바이너리/점수 강제 0 |
| 로컬 8GB | 풀 Lighthouse 금지. `BLOCKED_LOCAL_*` ≠ 제품 결함 |

`AIPO_LIGHTHOUSE=1` 은 예약 키. 이 REL은 바이너리를 설치하지 않는다.

## EXIT_GATE

Home 시각 후퇴 PR 거부.

- `home-approval-freeze.v1.json` `homePresentationBaseline=LOCKED`
- `home-geometry-lock.v1.json` `rewrite=FORBIDDEN`
- pixel-diff 단독 실패 아님
- 성능 이유로 Approved Visual Master / Home freeze 다운그레이드 금지
