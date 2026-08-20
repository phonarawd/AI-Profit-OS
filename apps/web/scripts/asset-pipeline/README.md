# 에셋 생산 파이프라인 (REL-018)

후속 화면 REL은 이 엔트리만 사용한다. Home 승인 에셋은 재생성하지 않는다.

## 표준 단계

`source → optimize → hash → public/ → review checklist`

1. **source** — `official` / `figma_export` / `local_file` / `capture` 만. 이모지 아이콘 금지.
2. **optimize** — 포맷 유지. SVG는 주석 제거. 신규 이미지 코덱 의존 없음.
3. **hash** — SHA-256을 기록한다.
4. **public/** — `--apply` 일 때만 `destRel`에 쓴다. 기본은 dry-run.
5. **review checklist** — `review-checklist.v1.json` 항목을 결과 JSON에 붙인다.

## 엔트리

```text
node apps/web/scripts/asset-pipeline/run.mjs --request <request.json>
node apps/web/scripts/asset-pipeline/run.mjs --request <request.json> --apply
node apps/web/scripts/asset-pipeline/run.mjs --inventory
```

## 파트너 로고

- 분기 = **official-only**
- AI 생성(DALL·E / Midjourney / Flux / 유사 경로) = **하드페일**
- 기존 SSOT = `packages/ui/brand/assets/markets/` — 이 파이프라인이 7개 로고를 다시 만들지 않는다.

## Home 잠금

`home-lock.v1.json` 이 `apps/web/public/spark-dash/**` 해시를 고정한다.
잠금 경로로 dest를 주면 파이프라인과 verify가 FAIL 한다.

## 애드혹 스크립트

`download-spark-dash-assets.mjs`, `download-spark-dash-mobile-assets.mjs`, `process-product-sneaker.mjs` 패턴은 `inventory.v1.json` 에 목록화했다.
canonical main에는 없으며, Home를 덮을 수 있어 후속 REL에서 재실행하지 않는다.
