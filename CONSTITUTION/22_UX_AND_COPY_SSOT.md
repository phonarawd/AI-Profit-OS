# §22 — UX And Copy SSOT

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Index:** `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md` §22 (교차표 진입점)

## Owns

| 주제 | 잠금 |
|------|------|
| 5탭 IA | **홈 · 수익 · 내거래 · 지갑 · 내정보** · mobile=PC 동일 · 6번째 탭 **금지** |
| 레이아웃·버튼 inventory | sticky CTA · 카드 위계 · Primary/Secondary 역할 |
| 색·표면 역할 | PUTDUK palette **역할** 배정 (토큰 값 → `28`) |
| Copy 교차 규칙 | **문자열 본문 owns = `25`** · 본 파일은 IA/레이아웃/버튼만 |
| 유저 역할 UX | capital provider · Primary CTA=`수익 벌기` · 구매/판매 CTA **0** |

## Pointer

| 교차 | SSOT |
|------|------|
| 5탭·홈·카드·Canon | UI `ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` §5~§8 · `packages/ui/canon` |
| 한글 문자열·금지어·CI | → `25_KOREAN_FIRST_UX_POLICY.md` · `packages/ui/copy/ko/*` |
| PUTDUK·motion·G4 비주얼 | → `governance/ui/PUTDUK_UI_AUTHORITY_V1.md` |
| CTA·자본참여자 모델 | Index §20.2 · UI §5.3b·§48 |
| PWA shell | → `23` |
| Trust/면책 카피 | → `38` · `50`(이후 todo) |
| Brand Kit | `packages/ui/brand` · ADR-002/011 |

## Forbidden

- 본 파일에 ko 문장 카탈로그 복제 (→ `25`)
- 사진 PNG 목업을 픽셀 SSOT로 사용 (ADR-013)
- 탭 라벨 drift · IT 용어 화면 노출
