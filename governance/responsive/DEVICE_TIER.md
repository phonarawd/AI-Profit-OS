# Device tier + 대형화면 안전 (REL-019)

후속 화면은 이 계약을 공유한다. Home 시각을 이 REL에서 다시 그리지 않는다.

## 판정 함수 (재사용)

- Owner: `packages/sdk/src/device-tier.ts` `detectDeviceTier`
- Export: `@aipo/sdk`
- 토큰 미러: `packages/ui/tokens/device-tier-contract.ts`
- 기존 verify: `verify:ux-design-system`

티어를 새로 발명하지 않는다.

## S / A / B 계약

| 티어 | 의미 | 판정 |
|---|---|---|
| B | 절약 경로 | `prefers-reduced-motion` 또는 `saveData` 또는 memory≤2 또는 cores≤4. navigator 없으면 B |
| S | 여유 경로 | memory≥8 그리고 cores≥8 (강제 B 신호가 없을 때) |
| A | 기본 | 그 외 |

신호: `hardwareConcurrency` · `deviceMemory` · `prefers-reduced-motion` · `saveData`.

티어는 렌더 경로만 바꾼다. 기능 세트는 동일해야 한다 (PPE).

스트림 간격은 `tierBatchMs` (S 500/1000 · A 1000/3000 · B 3000/5000).

## 대형화면 안전 (문서만 · 실행은 REL-105/601)

대상 viewport: **2560 / 3440 / 3840**.

| 검사 | 실패 예 |
|---|---|
| overflow | 가로 스크롤, 레일 밖으로 돈/카드 탈출 |
| clip | CTA·머니·미디어가 잘림 |
| absurd-stretch | 카드/히어로가 비정상적으로 늘어남 |
| interaction-break | 터치/클릭 타깃이 닿지 않거나 겹침 |
| performance | 대형 화면에서 스크롤/페인트가 눈에 띄게 붕괴 |

```text
HOME_RETROACTIVE_VISUAL_REDESIGN = NO
HOME_LARGE_SCREEN_SAFETY_QA = YES  → REL-105, REL-601
```

Home CSS/geometry는 이 파일과 verify 잠금으로만 보호한다. 여기서 재작성하지 않는다.
