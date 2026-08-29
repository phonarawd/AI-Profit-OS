# Brand Kit SSOT (ADR-002 · ADR-011 · ADR-013)

> PHASE 0 VISUAL RESET (2026-08-15 draft → formalized as ADR-018 on 2026-08-16): ready assets stay for runtime/PWA.
> They are not the new Visual Master. Consumer name Peotteok stays.
> Do not delete while referenced. Audit: packages/ui/tokens/VISUAL_RESET_REPORT.md
> Formal authority: `packages/ui/canon/contracts/ADR-018-peotteok-visual-master-reset.md`

| 층 | 이름 | 노출 |
|----|------|------|
| Platform | AI Profit OS | 코드·레포·내부 |
| Consumer | **퍼뜩** | 유저 PWA·SEO·스토어 |
| AI | **퍼뜩** | 채팅·코치 surface (§47.12) — 앱명과 동일 |
| Legal | §50.9 | 약관·푸터 |

구 consumer `오늘수익` · `바로번다` **폐기**.  
타프로젝트 코치 브랜드·**성별 UI/에셋 분기** **금지**.  
연령 표현 = 앱 `toneBand` only — Brand Kit에 성별 에셋 없음.

## Visual Kit v1 (방향 잠금) — ⚠️ DEPRECATED / HISTORICAL (dark direction)

> 아래 배경/강조 색은 **ADR-017 이전(pre-Light+Purple) dark 방향**이며, 현재 shipping 테마
> (`peotteok-light` · bg `#F6F4FC` · accent `#6B3CFF` · ADR-017)와 충돌한다. ADR-017이 PUTDUK Dark를
> archive/legacy로 이미 지정했고, 이제 [`ADR-018-peotteok-visual-master-reset.md`](../canon/contracts/ADR-018-peotteok-visual-master-reset.md)가
> 시각 권위 전체를 승계했으므로 본 절의 색 지정은 **historical legacy direction**으로만 읽는다 — ACTIVE LOCK
> 아님. 새 brand token 값은 아직 확정되지 않았으므로 여기서 새 HEX를 임의로 만들지 않는다. 마크/워드마크/AI
> 아바타의 **금지 목록**(사람 얼굴·성별 캐릭터·인간형/애니메 금지)은 시각 스타일이 아니라 제품 윤리 하드 금지이므로
> 계속 유효하다(ADR-018 §14).

- ~~**배경:** PUTDUK Deep Obsidian `#090A10`~~ (deprecated · dark 방향 이력)
- ~~**강조:** mint `#3DDC97` · principal blue `#7AA2FF`~~ (deprecated · dark 방향 이력)
- **마크:** 순간 통찰(퍼뜩) **플래시 지오메트리** — 코인/메달리온·사람 얼굴·성별 캐릭터 금지 (금지 목록은 계속 유효)
- **워드마크:** 한글 **퍼뜩** only (영문 서브 비필수) (계속 유효)
- **AI 아바타:** 추상 마크 (인간형/애니메 금지) (계속 유효)
- **현재 shipping 방향:** Light + Purple (`peotteok-light` · ADR-017 테마 모드) — 정확한 새 시각 authority는 ADR-018 §9 Visual Master intake 이후 확정

## 에셋 경로

| 역할 | 파일 |
|------|------|
| App mark | `assets/icons/app-icon-1024.png` |
| Maskable source | `assets/icons/maskable-source-1024.png` |
| Wordmark (dark) | `assets/wordmark/wordmark-dark.png` |
| AI avatar | `assets/ai/avatar-512.png` |
| Home V2 surface assets | `assets/ai/home-v2/*` + `assets/ai/home-v2/manifest.json` (Part B · 레거시 avatar/hero 대체 아님) |
| OG | `assets/og/og-default.png` |
| Market partners (§38.10) | `assets/markets/*.svg` + `assets/markets/manifest.json` |

등록 SSOT = `brand.manifest.json` · CI = `pnpm verify:brand-assets` · `verify:brand-consumer` · `verify:market-partner-trust`  
**Market logos:** 7 SVGs tracked as blocking sub-deliverable until `status=ready` (see `assets/markets/README.md`).  
**금지:** 사진 목업 PNG · metal-hex/대체 마크 · `docs/mockups` 재추가 (ADR-013) · 미등록 몰 로고 · 퍼뜩 슬롯에 타사 마크

## 파이프라인

1. 시안 확정 → `packages/ui/brand/assets/**`  
2. manifest `assets.*.status=ready`  
3. `apps/web` 생성 시 `public/icons/*` · apple-touch · favicon **리사이즈 export** (동일 마크 해시 계열)  
4. 화면마다 다른 로고 **금지** (`verify:brand-logo-single`)
