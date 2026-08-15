# Peotteok Home — Asset Production Part B V2

| | |
|---|---|
| Status | **ASSET PART B V2 COMPLETE** (H7 runtime **0**) |
| Date | 2026-08-16 |
| Todo | `redesign-r1-home-visual-asset-production` — `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| Authority class | **Asset Production** — V2 Visual Master 슬롯에 필요한 자산만 제작·등록. Functional/API/DB/Money/Engine 불변 |
| Inputs | `peotteok-home-v2-delta-sync.v1.md` §20 · intake v2 · Visual/Implementation/Contract-sync v2 · ADR-018 · Brand Kit + `brand-asset-provenance.cjs` |
| Runtime code changed by this document | **0** |

---

## 0. 이 문서가 하는 일 / 하지 않는 일

```text
한다:   §20 V2 Asset Matrix 8행을 NEW_ASSET_PRODUCED / APPROVED_EXISTING_ASSET_REUSED /
        NO_ASSET_REQUIRED / FOUNDER_REVIEW_REQUIRED 중 하나로 종결한다.
        필요한 실파일·manifest·provenance·public mirror를 등록한다.
        Desktop/Mobile authority를 분리해 배치 의도와 사용 금지를 명시한다.

하지 않는다: H7 React/CSS · API/SDK/DB/Money/Engine/Auth · Parser/JPY·KRW FX ·
            carousel · Actual Profit binding · Average Return 서버 집계 ·
            RightRail Zone B 데이터 발명 · 가짜 schedule/live-health ·
            새 mutation/scheduler · Yahoo Japan adapter · Visual Master 원본 3장 레포 저장
```

---

## 1. Image Authority (고정 · 원본 미저장)

| 역할 | 등급 | SHA-256 |
|---|---|---|
| DESKTOP_HOME_VISUAL_MASTER_V2 | PRIMARY | `a5c0f19114003b7856cc2ecbc1f730d2cc962a807561ddc12ef391dce32c7cab` |
| DESKTOP_OPPORTUNITY_REFERENCE | SECONDARY REFERENCE ONLY | `5689ccec5ae40b6cce2ed70cd47c90827c9d4968782dbd095ab16256e8acd88e` |
| MOBILE_HOME_VISUAL_MASTER_V2 | PRIMARY MOBILE | `f8b1568e5c512bfb013ef2488c10dcf5485fb51e14d300e18f1c96ce98c6e07f` |

Secondary의 전체 레이아웃·Hero geometry·RightRail·총자산 합산·글로벌 시장 통계·환율 리터럴·구버전 `내거래` IA는 authority가 아니다.

---

## 2. Brand Kit 전수 조사 (재사용 먼저)

조사 범위: `packages/ui/brand/assets/**` 전 파일(마크/워드마크/아바타/Hero/OG/markets 7·membership 5).

| 후보 | 결과 |
|---|---|
| `avatar-512.png` | 다크 추상 스파클 마크. Home V2 로봇 슬롯 재사용 불가. **LEGACY · 미승격 · 미삭제** |
| `hero-illustration-*` | robot+globe 풀 컴포지션. 캐릭터 DNA 참고만. 파일 자체는 **LEGACY · 미승격 · 미삭제** |
| markets / membership SVG | 파트너 로고·등급 배지. 검색/그래프/시계/globe/flag와 의미 불일치 |
| app-icon / wordmark / OG | 플래시 마크·워드마크. Home 슬롯 불일치 |
| 단독 globe 벡터 | **0건** |
| 국가 flag 자산 | **0건** (`MarketPartnerLeg`는 파트너 로고만) |
| 검색·그래프·시계 아이콘 | **0건** |

Lucide 등 임의 아이콘 라이브러리 도입 = 0.

---

## 3. V2 Matrix 8행 최종 판정

| # | Asset | 요구 | 판정 | 근거 |
|---|---|---|---|---|
| 1 | `peotteok-ai-robot-home-summary-v1` | MODIFY | **NEW_ASSET_PRODUCED** | Desktop 팔 벌림 + Mobile 로봇+돋보기. identity(귀·바이저·눈·안테나·번개) 유지 |
| 2 | `peotteok-ai-robot-home-cta-v1` | MODIFY | **NEW_ASSET_PRODUCED** | Discovery CTA 초대 포즈 |
| 3 | `peotteok-home-hero-support-graphic-v1` | MODIFY | **NEW_ASSET_PRODUCED** | Desktop line-chart + donut. 숫자/%/화폐 0. Mobile 불필요 |
| 4 | Featured opportunity 상품 이미지 | KEEP | **APPROVED_EXISTING_ASSET_REUSED** | 기존 `ProductImage` / `assetImageUrl` |
| 5 | Trust 보조 일러스트 | KEEP | **NO_ASSET_REQUIRED** | 텍스트만으로 성립(H5/H6) |
| 6 | 퍼뜩 인사이트 globe | KEEP | **NO_ASSET_REQUIRED** | 재사용 가능 벡터 0 · H6 "아이콘 없이 H7 완결 가능" |
| 7 | 국가 flag/route 아이콘 | NEW/INVESTIGATE | **NO_ASSET_REQUIRED** | 기본값=미제작 · 텍스트 corridor 유지 · flag emoji 금지 |
| 8 | AI summary 아이콘 3종 | NEW/INVESTIGATE | **NEW_ASSET_PRODUCED** | Brand Kit 적합 자산 0 → 원본 SVG 3종 |

```text
FOUNDER_REVIEW_REQUIRED = 0
TBD / placeholder / 임시 재사용 = 0
```

---

## 4. 생성 파일 원장

경로 기준 = `packages/ui/brand/assets/ai/home-v2/` · public 미러 = `apps/web/public/brand/assets/ai/home-v2/` (byte-identical).

| file | SHA-256 | dims | encoding | authority | slot |
|---|---|---|---|---|---|
| `peotteok-ai-robot-home-summary-v1-desktop.png` | `43cb002c0107489dae44ccd2ec4af89b3860445c84000b399ed845a3c13d142c` | 1024×1024 | PNG-RGBA | Desktop Primary | AI summary Desktop |
| `peotteok-ai-robot-home-summary-v1-mobile.png` | `f083ef64be22ae71f2f6680c513f5999451905f4a5b7d83f048ce2ad52c572a9` | 1024×1024 | PNG-RGBA | Mobile Primary | AI summary Mobile |
| `peotteok-ai-robot-home-cta-v1.png` | `90d0ec5a1c7b095d32d6c028b0c9ec77ab611870de99783a06051a2e24c56c09` | 1024×1024 | PNG-RGBA | Desktop Primary | Discovery CTA |
| `peotteok-home-hero-support-graphic-v1.png` | `63fca164ebb80daeedf83c8a9f08d48c71453b42c146b5dc7a1c02937cd14207` | 1536×1024 | PNG-RGBA | Desktop Primary | AI summary 보조 그래픽 |
| `peotteok-home-ai-summary-icon-search-v1.svg` | `5fd37239e50b434359287e9b18e349ed4fefc979de82894b695243c72a6ce67d` | 64×64 | SVG | Desktop Primary | 3-stat 검색 |
| `peotteok-home-ai-summary-icon-chart-v1.svg` | `c3f5f8560012eb4ae66b1162ec139f3a7644eddbf91ca327595d725badc0c965` | 64×64 | SVG | Desktop Primary | 3-stat 그래프 |
| `peotteok-home-ai-summary-icon-clock-v1.svg` | `2ad859cea368ca11a966c9137026bc866260129b9fd35bb4151eb68739a64380` | 64×64 | SVG | Desktop Primary | 3-stat 시간 |

래스터 공통: 투명 배경(코너 alpha=0) · 비트맵 텍스트/가격/수익률/건수/환율 0 · chroma-key 잔여 마젠타 가시 픽셀 0.

`source`: 캐릭터 DNA = 기존 퍼뜩 로봇 identity(레거시 Hero를 **참고만**, 파일 승격 0) → GenerateImage 포즈 생성 → ffmpeg colorkey → PNG-RGBA 정리. 아이콘 = Brand Kit 조사 후 원본 SVG.

---

## 5. Desktop / Mobile 배치 의도와 사용 금지

| 자산 | Desktop | Mobile | 금지 |
|---|---|---|---|
| summary-desktop | AI summary 3-stat 옆 팔 벌림 | 사용 금지 | Mobile 돋보기 슬롯에 넣지 않음 |
| summary-mobile | 사용 금지 | AI summary itemCount 옆 로봇+돋보기 | Desktop geometry로 추론·합성 금지 |
| cta | Discovery 티저 | Mobile에 동일 티저가 없으면 비워 둠 | 상품 썸네일/헤더 아바타 대체 금지 |
| support graphic | AI summary 차트+도넛 | **불필요**(V2 Mobile에 차트/도넛 없음) | 숫자 바인딩·거래소 스킨 금지 |
| 아이콘 3종 | Desktop 3-stat row | Mobile은 itemCount만 — 3종 강제 0 | Lucide/emoji 대체 금지 |
| 상품 이미지 | 기존 adapter | 기존 adapter | Visual Master 상품 픽셀 하드코딩 금지 |
| Trust / globe / flag | 텍스트 | 텍스트 | 신규 일러스트·flag emoji 0 |

Desktop과 Mobile authority를 서로 합성하지 않는다.

---

## 6. Legacy 승격/삭제 0 증거

실측 SHA-256(작업 전후 동일 · 파일 미수정):

| path | sha256 |
|---|---|
| `assets/ai/avatar-512.png` | `510e756b06b5b87c6ad367d1ce4ab753581e22896d5d096f959faea757c9288f` |
| `assets/ai/hero-illustration-desktop.webp` | `c1ec723c280de29956b1b968c04edbde48215befd03f1faf0a969f42dc806d41` |
| `assets/ai/hero-illustration-desktop.avif` | `7ec9ad77f88f793116a982740f722d3e71b1d51393e02774ba82ea47abbae9ea` |
| `assets/ai/hero-illustration-mobile.webp` | `222edb046ae8e468a76fa2931673297a98c5a149ca9573a3a88158b1d40ebb69` |
| `assets/ai/hero-illustration-mobile.avif` | `cc05cbb5cda80843728edc81c79d676d50ef41dacd6799096a99122ceece7035` |

`brand.manifest.json`의 `aiAvatar` / `heroIllustration` status는 `ready` 유지(현 runtime 미러). Home V2 권위로 승격하지 않았다. 신규 파일은 `assets/ai/home-v2/`에만 추가.

---

## 7. Placeholder 0

- emoji robot / cheap SVG mascot / CSS mascot / clipart / stock 대체 = 0
- `MISSING_VISUAL_ASSET` 임시 채움 = 0
- Visual Master 원본 3장 레포 저장 = 0
- `docs/mockups/**` / `*mockup*.png` = 0

---

## 8. 게이트

```text
ASSET_PART_B_V2_COMPLETE = YES
H7_RUNTIME_START_ALLOWED = YES
H7_STARTED_BY_THIS_DOCUMENT = NO
FOUNDER_REVIEW_REQUIRED = NO
```

다음 File-Serial pending = `redesign-r1-home-implementation` (H7). 본 문서는 H7을 착수하지 않는다.

---

## Document Control

| | |
|---|---|
| New raster assets | 4 |
| New SVG assets | 3 |
| Reused product-image pipeline | 1 (기존) |
| Assets intentionally not produced | 3 (Trust / globe / flag) |
| Legacy files deleted or overwritten | 0 |
| React / CSS / API / DB / Money / FX / Parser / H7 | 0 |
| Fake money or percent burned into bitmaps | 0 |
