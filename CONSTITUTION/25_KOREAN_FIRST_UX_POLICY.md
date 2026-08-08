# §25 — Korean-First UX Policy

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2

## Owns

| 주제 | 잠금 |
|------|------|
| 화면 문자열 SSOT | `packages/ui/copy/ko/*` only · JSX 하드코딩 **금지** |
| 유저·어드민 화면 언어 | **쉬운 한국어만** · 테스트/개발/IT/문서 용어 **노출 0** |
| 금지어 | retired 브랜드(`오늘수익`·`바로번다`) · 유저 trader jargon · API/DLQ/NATS 등 |
| 성별 UI | **분기 금지** · 중성 존댓말 |
| toast | 한글 + 이모지 규칙 (상세 → §50 pointer) |
| CI | `verify:no-it-jargon` · `verify:korean-ui` · `verify:brand-consumer` · `verify:legal-plain-ko` |

## Pointer

| 교차 | SSOT |
|------|------|
| Korean-First 본문 · glossary | UI `ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` §27 |
| 5탭·레이아웃·버튼 | → `22` (문자열은 여기로) |
| toneBand / fontScale / spot-check | UI §38.9 · §50.1 |
| Trust / 면책 카피 | → `38` |
| 설정·약관·DET·토스트이모지 | → `50_SETTINGS_LEGAL_AND_PLAIN_KOREAN.md` |
| SEO/JSON-LD 브랜드명 | → `27` · Consumer=**퍼뜩** |
| schema | `ui-copy-glossary.v1` (schemas todo) |

## Forbidden

- 영문 유저 토스트 · IT 용어 화면 노출
- 성별 맞춤 멘트 · 투자 원금 보장 허위 문구
- copy SSOT 외 이중 카탈로그
