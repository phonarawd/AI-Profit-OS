# Brand Kit SSOT (ADR-002 · ADR-011 · ADR-013)

| 층 | 이름 | 노출 |
|----|------|------|
| Platform | AI Profit OS | 코드·레포·내부 |
| Consumer | **퍼뜩** | 유저 PWA·SEO·스토어 |
| AI | **퍼뜩** | 채팅·코치 surface (§47.12) — 앱명과 동일 |
| Legal | §50.9 | 약관·푸터 |

구 consumer `오늘수익` · `바로번다` **폐기**.  
타프로젝트 코치 브랜드·**성별 UI/에셋 분기** **금지**.  
연령 표현 = 앱 `toneBand` only — Brand Kit에 성별 에셋 없음.

## Visual Kit v1 (방향 잠금)

- **배경:** Lux Deep Obsidian `#090A10`
- **강조:** mint `#3DDC97` · principal blue `#7AA2FF`
- **마크:** 순간 통찰(퍼뜩) **플래시 지오메트리** — 코인/메달리온·사람 얼굴·성별 캐릭터 금지
- **워드마크:** 한글 **퍼뜩** only (영문 서브 비필수)
- **AI 아바타:** 추상 마크 (인간형/애니메 금지)

## 에셋 경로

| 역할 | 파일 |
|------|------|
| App mark | `assets/icons/app-icon-1024.png` |
| Maskable source | `assets/icons/maskable-source-1024.png` |
| Wordmark (dark) | `assets/wordmark/wordmark-dark.png` |
| AI avatar | `assets/ai/avatar-512.png` |
| OG | `assets/og/og-default.png` |

등록 SSOT = `brand.manifest.json` · CI = `pnpm verify:brand-assets` · `verify:brand-consumer`  
**금지:** 사진 목업 PNG · metal-hex/대체 마크 · `docs/mockups` 재추가 (ADR-013)

## 파이프라인

1. 시안 확정 → `packages/ui/brand/assets/**`  
2. manifest `assets.*.status=ready`  
3. `apps/web` 생성 시 `public/icons/*` · apple-touch · favicon **리사이즈 export** (동일 마크 해시 계열)  
4. 화면마다 다른 로고 **금지** (`verify:brand-logo-single`)
