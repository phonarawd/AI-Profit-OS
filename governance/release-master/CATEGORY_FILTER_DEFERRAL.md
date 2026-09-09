# Category Filter (CategoryFilterChips) — DEFERRED_BY_OWNER

```text
STATUS = DEFERRED_BY_OWNER
RELEASE_BLOCKER = NO
LIVE_UI_SURFACE = ZERO
PRIOR_ASSESSMENT = _audit-d0-20260904/18-blockers-and-remediation-slices.md REM-007
```

## 확인된 사실 (live 코드 재검증, 2026-09-05)

- `packages/ui/components/opportunity/CategoryFilterChips.tsx` /
  `BalanceAwareHome.tsx` 둘 다 삭제됨(dead code). `apps/web` 전체에
  카테고리 필터(가방/luxury_bag) UI를 임포트하는 live 경로 0건.
- `governance/release-master/REL-106-PROFITS.md`(`/profits` 목록 REL 문서)
  자체가 이미 명시: "search/filter are wired; sort label is the single
  real recommended order", "official filter chip in Figma is not shown:
  no owner for official-only filtering" — 즉 `/profits`에서 검색 이외의
  필터(카테고리 포함)는 원래부터 wired 대상이 아니었음.
- `packages/ui/canon/contracts/peotteok-home-product-contract.v1.md` 6장은
  이 개념이 Home(13장 visual-only 영역, Desktop 3-카테고리 동시 표시) 쪽
  항목이었다고 기록 — Home은 `home-presentation-freeze.mdc`로 FOUNDER
  APPROVED/LOCKED이며, Popular/카테고리 배치는 Founder가 Home을 다시
  열기 전까지 수정 대상이 아니다.
- `tooling/verify/asset-image-surface.cjs`의 WARN
  ("no live category-filter UI (가방/luxury_bag) - tracked gap")은
  silenced 상태가 아니라 소스 코드 주석과 함께 의도적으로 계속 출력되는
  tracked WARN이었음(2026-09-04 세션에서 추가).

## 판정

- 현재 어떤 live consumer route도 사용자에게 카테고리 필터를 작동하는
  기능으로 노출하지 않는다 — 약속하고 못 지키는 UI 0건.
- 재도입은 Home(Popular 섹션) 또는 `/profits`(신규 필터 UI) 중 하나를
  Founder가 다시 열어야 하는 범위가 큰 제품 결정이며, 최소 변경 원칙과
  Home freeze 규칙 양쪽과 충돌한다.
- REM-007의 두 선택지(재도입 vs DEFERRED_BY_OWNER 명시) 중 재도입은
  이번 세션 범위를 벗어나므로, 본 문서로 DEFERRED_BY_OWNER를 공식
  기록한다.

## 결론

```text
CATEGORY_FILTER_RELEASE_BLOCKING = NO
CATEGORY_FILTER_LIVE_BROKEN_PROMISE = NO (dead code, 0 live surface)
NEXT_ACTION = POST_LAUNCH backlog - Founder가 Home 재오픈 시 재검토
VERIFIER_WARN = KEEP AS-IS (tracked gap, not silenced, not upgraded to FAIL)
```

이 WARN은 `verify:asset-image-surface`에서 계속 출력된다 — 이는 결함
은폐가 아니라 정확한 현재 상태 표시이며, 임의로 FAIL로 격상하거나
제거하지 않는다.
