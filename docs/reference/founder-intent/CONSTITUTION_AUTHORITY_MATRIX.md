# Constitution Authority Matrix

> 29/29 파일. 파일 전체를 한 줄 무효로 만들지 않는다.  
> `Status: ACTIVE` = Business / Engine / Money / Security / Ops **의도 보존**이지, Consumer Visual 실행 권한이 아니다.  
> 본문 rewrite 없음. 분류는 파일 + 중요 절.

```text
LEGACY_CONSTITUTION_COUNT = 29
LEGACY_CONSTITUTION_CONSUMER_PRESENTATION_AUTHORITY = 0
```

분류 키:

```text
PRESERVE_CURRENT_INTENT
PRESERVE_RUNTIME_REVALIDATE
SUPERSEDED_CONSUMER_PRESENTATION
RETIRED_PRODUCTION_SYNTHETIC
HISTORICAL_REFERENCE
```

현재 권위 소유자(공통):

- Presentation → NEW APPROVED FIGMA ONLY (없음 = placeholder만)
- Business/Money/Engine → current runtime + verify
- Process → `docs/product/PUTDUK_PRODUCT_DESIGN_ENGINEERING_OPERATING_SYSTEM.md`

---

## 14_EVENT_CONTRACTS.md

| 항목 | 분류 |
|------|------|
| preserved intent | Phase0 in-process · Phase1 NATS 이름 계약 · 화면 IT 버스명 0 |
| runtime-revalidate | 실제 토픽 목록 · Phase 활성화 시점 |
| superseded presentation | 없음 (버스 기술명 화면 0은 유지) |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | runtime event emit + §14 의도 |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE`

---

## 17_FINANCIAL_LEDGER_STANDARD.md

| 항목 | 분류 |
|------|------|
| preserved intent | USDT ledger · double-entry · idempotency · KRW=FX snapshot · 잔액 UPDATE 0 · api-nest only · PG사 0 |
| runtime-revalidate | 모듈 경로 세부는 runtime |
| superseded presentation | 없음 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | `services/api-nest` ledger + `verify:bucket-invariant` |

`PRESERVE_CURRENT_INTENT`

---

## 20_SECURITY_THREAT_MODEL.md

| 항목 | 분류 |
|------|------|
| preserved intent | A1~ abuse catalog · KYC/minHolding/rate-limit · freeze path |
| runtime-revalidate | 정확한 상태 머신 전이·임계값 |
| superseded presentation | 없음 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | runtime guards + Admin risk |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE`

---

## 22_UX_AND_COPY_SSOT.md

| 항목 | 분류 |
|------|------|
| preserved intent | 문자열 owns=`25` · 성별 분기 0 · capital-provider CTA 개념(카피 확정은 미래 UX) |
| runtime-revalidate | Primary CTA 문구는 미래 UX Architecture |
| superseded presentation | **고정 5탭 IA** · Lux 색 역할 · Canon/카드 위계 · ADR-013 목업 전면 금지의 “새 디자인 mockup 금지” 절 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | `25` (언어) · Figma (IA/레이아웃) |

혼합: `SUPERSEDED_CONSUMER_PRESENTATION` (5탭/Lux/Canon) · `PRESERVE_CURRENT_INTENT` (copy owns / 성별 0)

---

## 23_PWA_AND_NATIVE_EXPERIENCE.md

| 항목 | 분류 |
|------|------|
| preserved intent | 퍼뜩 manifest · standalone · Serwist · install/update · Push/Badge · WebAuthn UX · Phase0 in-process |
| runtime-revalidate | VAPID/iOS 제약 · host 바인딩 |
| superseded presentation | Lux theme hex · Brand icons 경로를 현재 시각 권위로 취급 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | PWA capability = 의도 · 아이콘/테마 = 승인 Figma |

`PRESERVE_CURRENT_INTENT` + `SUPERSEDED_CONSUMER_PRESENTATION`

---

## 24_FREE_TIER_AND_STORE_BRIDGE.md

| 항목 | 분류 |
|------|------|
| preserved intent | $0 우선 · TWA/Capacitor/Store scaffold · Day-1 출시 게이트 제외 |
| runtime-revalidate | 스토어 패키지/서명 선택 |
| superseded presentation | 없음 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | 미래 PWA CURRENT ACTIVE |

`PRESERVE_CURRENT_INTENT`

---

## 25_KOREAN_FIRST_UX_POLICY.md

| 항목 | 분류 |
|------|------|
| preserved intent | 쉬운 한국어 · IT 용어 화면 0 · retired 브랜드 0 · 성별 UI 0 · copy/ko SSOT |
| runtime-revalidate | glossary 키 집합 |
| superseded presentation | 5탭 pointer (`22`) |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | `packages/ui/copy` + `verify:no-it-jargon` / `korean-ui` |

`PRESERVE_CURRENT_INTENT`

---

## 26_PERFORMANCE_AND_RESPONSIVE_UX.md

| 항목 | 분류 |
|------|------|
| preserved intent | fluid · 320 touch · reduced-motion · device-tier · CWV 목표 |
| runtime-revalidate | 정확한 Lighthouse 수치 게이트 |
| superseded presentation | 5탭 클립 규칙 · Lux motion pointer를 시각 SSOT로 읽기 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | Operating System 성능/반응형 절 + 승인 Figma Auto Layout |

`PRESERVE_CURRENT_INTENT` + `SUPERSEDED_CONSUMER_PRESENTATION`

---

## 27_MARKETING_AND_SEO_ENGINE.md

| 항목 | 분류 |
|------|------|
| preserved intent | UTM/consent · CAPI · fake aggregateRating 0 · bait-and-switch 0 · 퍼뜩 SEO |
| runtime-revalidate | Meta/TikTok/Google adapter·필드 |
| superseded presentation | Brand Kit 경로를 현재 비주얼 권위로 읽기 |
| synthetic/fake risk | fake rating/스키마 = FORBIDDEN (유지) |
| partner impact | 없음 |
| current authority owner | Infra runtime + marketing verify |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE`

---

## 28_LUX_FINTECH_DESIGN_AND_MOTION.md

| 항목 | 분류 |
|------|------|
| preserved intent | reduced-motion 존중 · **제품 이미지로 사진 목업 사용 금지** (런타임 자산) |
| runtime-revalidate | 없음 (시각 값은 미래 Brand) |
| superseded presentation | Lux Dark palette · white bg 금지 · G4 비주얼 primitive · ADR-013 Canon/Lux/Brand > mockup |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | NEW APPROVED FIGMA |

거의 전부 `SUPERSEDED_CONSUMER_PRESENTATION`. mockup-as-product-imagery 금지만 `PRESERVE_CURRENT_INTENT`.

---

## 35_GROWTH_CONVERSION_PRESENTATION.md

| 항목 | 분류 |
|------|------|
| preserved intent | Growth 스위치 기본 OFF · ticker PII 0 · notice≠campaign · DayPulse에 demo merge 금지 |
| runtime-revalidate | Admin growth 탭 IA |
| superseded presentation | G4 컴포넌트 외형 |
| synthetic/fake risk | **Organic Hybrid · 침묵메움 · 24h곡선 · jitter · corpus · demo/hybrid/blended** = `RETIRED_PRODUCTION_SYNTHETIC` |
| partner impact | 없음 |
| current authority owner | 실활동만 (Engine/Opportunity/Matching/Settlement/aggregate) |

`RETIRED_PRODUCTION_SYNTHETIC` + 일부 `PRESERVE_CURRENT_INTENT` (PII/OFF default/ledger merge 금지)

---

## 36_ADMIN_PRICE_AND_PROFIT_SYNC.md

| 항목 | 분류 |
|------|------|
| preserved intent | Admin pricingVersion · stale participate 가드 · 유저 추정 가격 금지 |
| runtime-revalidate | ≤500ms SSE 수치 |
| superseded presentation | Home/수익 표면 배치 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | Admin + Engine pricing runtime |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE`  
additive future lock (2026-08-19): `governance/admin/admin-control-plane.v1.json` = SUPERSET. 본 절 intent 삭제 0.

---

## 37_WALLET_AND_USER_ADMIN_OPS.md

| 항목 | 분류 |
|------|------|
| preserved intent | deposit-config · KRW/USDT 운영 · 잔액 컬럼 UPDATE 0 |
| runtime-revalidate | SSE ≤300ms |
| superseded presentation | 유저 원화 탭 레이아웃 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | Admin wallet runtime |

`PRESERVE_CURRENT_INTENT`

---

## 38_TRUST_EDUCATION_AND_REVENUE_TRANSPARENCY.md

| 항목 | 분류 |
|------|------|
| preserved intent | 면책 · **공식 협력사 eBay · Amazon · Yahoo! JAPAN Auction** · 협력≠대리 구매 |
| runtime-revalidate | 로고 자산 경로는 승인 Figma/Brand 후 |
| superseded presentation | 구 UI §38 레이아웃 |
| synthetic/fake risk | 없음 |
| partner impact | **PARTNERSHIP KEEP** — Yahoo 표기 유지. API 금지는 §44 |
| current authority owner | Founder partner lock + 미래 Consumer partner 표기 |

`PRESERVE_CURRENT_INTENT`

---

## 39_USER_FINANCIAL_LEDGER.md

| 항목 | 분류 |
|------|------|
| preserved intent | 유저별 입출금/순유입 KPI = ledger 집계만 |
| runtime-revalidate | KPI 공식 필드명 |
| superseded presentation | Admin 화면 기하 |
| synthetic/fake risk | UI 추정 KPI 금지 (유지) |
| partner impact | 없음 |
| current authority owner | Admin finance runtime |

`PRESERVE_CURRENT_INTENT`

---

## 40_ADMIN_ISOLATED_OPS_PLATFORM.md

| 항목 | 분류 |
|------|------|
| preserved intent | ops 도메인 분리 · Admin JWT ≠ User · sidebar 13 금지 · Supabase Auth 0 |
| runtime-revalidate | host/MFA/IP 실값 |
| superseded presentation | 없음 (Admin 재설계 아님) |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | `apps/admin` + `infra/ops` |

`PRESERVE_CURRENT_INTENT`

---

## 41_ONCHAIN_USDT_AND_KRW_DEPOSIT.md

| 항목 | 분류 |
|------|------|
| preserved intent | USDT TRC20 · KRW Admin 승인/거절 · PG사 0 · 유저 TRC20 문자열 0 |
| runtime-revalidate | confirm 수 · 대행 계좌 |
| superseded presentation | 입금 화면 기하 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | Money wallet runtime |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE`

---

## 42_KYC_WITHDRAW_ONE_TIME_GATE.md

| 항목 | 분류 |
|------|------|
| preserved intent | 출금 1회 게이트 · R2 · RRN/성별 필드 0 · Admin 큐 |
| runtime-revalidate | 서류 종류 |
| superseded presentation | Canon/Lux KYC 3면 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | Money KYC runtime · 시각 = 승인 Figma |

`PRESERVE_CURRENT_INTENT` + `SUPERSEDED_CONSUMER_PRESENTATION`

---

## 43_CHAIN_SETTLEMENT_HARDENING.md

| 항목 | 분류 |
|------|------|
| preserved intent | 1conf UI-only / 19conf ledger · per-address poll 금지 · sweeper 가드 · idempotency+ordered locks · step-up fallback |
| runtime-revalidate | confirm 수 · Auth provider 조합 |
| superseded presentation | 1conf UI 연출 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | chain watchers + ledger |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE`

---

## 44_SIGNUP_READY_MARKET_SOURCES.md

| 항목 | 분류 |
|------|------|
| preserved intent | Day-1 HTTP API 소스 · KR 중고앱/Chrono24/스크래핑 금지 · **yahoo_jp API/adapter/data-source FORBIDDEN** |
| runtime-revalidate | ebay marketplaceId · 카드 API 선택 |
| superseded presentation | **「유저 카피에 Yahoo 문자열 0」** = `SUPERSEDED_PRESENTATION_CONFLICT` (C-07). API 금지가 파트너 표기 금지가 아님 |
| synthetic/fake risk | 없음 |
| partner impact | API ban ≠ partner display ban. §38 공식 파트너 유지 |
| current authority owner | Engine adapters (ebay 등) + §38 partner display |

혼합: `PRESERVE_CURRENT_INTENT` (API 금지) · `SUPERSEDED_CONSUMER_PRESENTATION` (카피 금지)

---

## 45_PRICE_COMPARE_MARGIN_UX.md

| 항목 | 분류 |
|------|------|
| preserved intent | 마진 공식 owns=Engine · 유저 직접거래 암시 0 · FX snapshot 없는 ≈원화 0 |
| runtime-revalidate | fee/buffer/`platform_reserve` 수치 |
| superseded presentation | PriceCompare 4면 기하 · Canon |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | Engine pricing · 화면 = 승인 Figma |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE` + `SUPERSEDED_CONSUMER_PRESENTATION`

---

## 46_CAPITAL_TIER_CATALOG.md

| 항목 | 분류 |
|------|------|
| preserved intent | required capital · affordable/nearMiss/suggestDeposit · 밴드 개념 |
| runtime-revalidate | **micro 10~99 등 정확한 구간·시드 비율·퀵버튼 금액** |
| superseded presentation | 필터 칩 레이아웃 · 온보딩 한 줄 카피 |
| synthetic/fake risk | 없음 |
| partner impact | 없음 |
| current authority owner | Engine capital-band runtime |

`PRESERVE_RUNTIME_REVALIDATE` + 개념 `PRESERVE_CURRENT_INTENT`

---

## 46b_ASSET_IMAGE_SSOT.md

| 항목 | 분류 |
|------|------|
| preserved intent | SKU 1:1 · compareReady∧image · **런타임 상품 이미지 ≠ 디자인 목업 PNG** |
| runtime-revalidate | 카테고리 enum |
| superseded presentation | Canon execution thumb · ADR-013 전면 mockup 금지(새 디자인 mockup 워크플로 허용) |
| synthetic/fake risk | 타 카테고리 사진 |
| partner impact | 없음 |
| current authority owner | Engine asset + 승인 자산 파이프라인 |

`PRESERVE_CURRENT_INTENT` (목업을 상품 사진으로 쓰지 않음) · mockup blanket ban = SUPERSEDED (C-04)

---

## 47_PERSONAL_AI_USER_TWIN.md

| 항목 | 분류 |
|------|------|
| preserved intent | 퍼뜩 · Fact ≠ Twin · P/G/S · AI가 Money Truth 창작 0 · 단일 PG · GitHub에 PII 0 |
| runtime-revalidate | Day-1 `gemini_free` 등 provider · quota |
| superseded presentation | 칩/온보딩 루프 시각 |
| synthetic/fake risk | 추정 숫자 = FORBIDDEN (유지) |
| partner impact | 없음 |
| current authority owner | Engine AI runtime |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE`

---

## 48_AI_EXECUTION_ROOM_AND_POLICY.md

| 항목 | 분류 |
|------|------|
| preserved intent | 실제 결과 enum · Safe Stop · settlement.completed 전 성공 UI 금지 · 난수 성공 0 · matchStrictness→실조건 |
| runtime-revalidate | **Soft60 / Hard90 / maxRematch** |
| superseded presentation | Canon 3면 · `presentation.duration` 타이머 연출 · 고정 CTA 문구를 현재 IA로 고정 |
| synthetic/fake risk | 가짜 대기인원·당첨게이지·demo merge = FORBIDDEN (유지) |
| partner impact | 없음 |
| current authority owner | Engine matching/settlement · 시각 = 승인 Figma |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE` + `SUPERSEDED_CONSUMER_PRESENTATION`

---

## 49_PRINCIPAL_RETENTION_AND_PROFIT_WITHDRAW.md

| 항목 | 분류 |
|------|------|
| preserved intent | 4버킷 · requiredCapital=principal · settlement→profit · practice 현금화 0 · 원금 출금 도달 |
| runtime-revalidate | 가드 순서 세부 · practice 만료일 |
| superseded presentation | 3CTA 레이아웃 |
| synthetic/fake risk | practice/G4 demo를 profit 승격 금지 (유지) |
| partner impact | 없음 |
| current authority owner | Money buckets runtime |

`PRESERVE_CURRENT_INTENT`

---

## 50_SETTINGS_LEGAL_AND_PLAIN_KOREAN.md

| 항목 | 분류 |
|------|------|
| preserved intent | 쉬운 한글 · §50.9 운영사 DET · 약관 4종 · 성별 0 · IT 용어 0 |
| runtime-revalidate | fontScale 3단이 미래 설정 IA에 남는지 |
| superseded presentation | `/me/settings` IA · **Lux 다크 고정** |
| synthetic/fake risk | 허가 업종 추정 렌더 금지 (유지) |
| partner impact | 없음 |
| current authority owner | legal copy + operator-entity · 설정 IA = 미래 UX |

`PRESERVE_CURRENT_INTENT` + `SUPERSEDED_CONSUMER_PRESENTATION`

---

## 51_PLATFORM_COMPLETENESS_AND_RULE_ENGINE.md

| 항목 | 분류 |
|------|------|
| preserved intent | MATCH_SUCCESS pointer · sellSuccessRate≠Rule · simulation · CS · practice · Nest JWT Auth · ADR-001~016 스택 |
| runtime-revalidate | Auth provider 조합 · Soft60/Hard90 인용 |
| superseded presentation | Lux/Canon · ADR-013 Canon/Lux/Brand > 목업 |
| synthetic/fake risk | DayPulse/G4 demo merge · 가짜 presence 금지 (유지) |
| partner impact | `yahoo_jp FORBIDDEN` = **API**. 파트너 표기 ≠ 이 줄 |
| current authority owner | 교차 runtime + ADR 스택 |

혼합 문서. Consumer presentation 절 = SUPERSEDED. Rule/Auth/Money pointer = PRESERVE.

---

## 51_REFERRAL_VIRAL_LADDER.md

| 항목 | 분류 |
|------|------|
| preserved intent | 실초대 루프 · L2/L3만 현금 · Pool FIFO · 0원 런칭에도 초대 UI · practice≠profit |
| runtime-revalidate | minRefereeDeposit · clawback 시간 · 소액 L3 |
| superseded presentation | `/me/invite` IA |
| synthetic/fake risk | 합성 초대/보상 금지 |
| partner impact | 없음 |
| current authority owner | Money referral runtime |

`PRESERVE_CURRENT_INTENT` + `PRESERVE_RUNTIME_REVALIDATE`

---

## Cross-cutting (전 29)

| 주장 | 현재 |
|------|------|
| Consumer Visual / Brand / Layout / IA | `SUPERSEDED_CONSUMER_PRESENTATION` |
| Production synthetic activity | `RETIRED_PRODUCTION_SYNTHETIC` |
| Official partners (eBay · Amazon · Yahoo! JAPAN Auction) | PRESERVED |
| Yahoo API / adapter / data-source | FORBIDDEN |
| `Status: ACTIVE` 헤더 | 의도 보존 라벨 · 시각 실행 권위 아님 |
