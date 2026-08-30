# Spark+Toss Foundation (UI-1)

Status: `IMPLEMENTED` · Visual authority: `PENDING_FOUNDER_AUTHORITY` · Visual pass: `NO`

이 파일은 신규 디자인 시스템 기반 문서다. 화면 구현 완료가 아니다.

## Direction

- Spark Dash: 에너지, 진행감, 살아 있는 데이터 리듬, 절제된 accent
- Toss Premium: 넓은 여백, 쉬운 한국어, 한 화면 한 판단, 과장 없는 신뢰

## Code source

- `packages/ui/tokens/spark-toss-tokens.ts`
- `packages/ui/tokens/spark-toss-theme.css`
- `packages/ui/tokens/spark-toss-states.ts`

앱 `globals.css`에 아직 연결하지 않는다. 기존 화면 재디자인 금지.

## Separation

- 레거시 디자인 런타임(`lux-fintech.ts`, `lux-theme.css`, `components/lux`)은 다음 migration 승인에서 제거한다.
- `luxury_bag`은 상품·엔진 도메인이며 이 금지와 무관하다.
- 목표 문자열은 `LUX` 0개가 아니라 `LEGACY_LUX_DESIGN_RUNTIME_PATHS = 0`이다.

## Forbidden reuse

- 레거시 색·gradient·shadow 값 복사
- 레거시 CSS 변수 alias
- 레거시 컴포넌트 wrapper
- 승인되지 않은 Figma frame을 authority로 승격
- Home / Account Hub 무단 변경
