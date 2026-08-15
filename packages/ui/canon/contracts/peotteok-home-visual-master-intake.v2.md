# Peotteok Home — Visual Master Intake V2 (ADR-018 §9 · Founder V2 Rebase)

| | |
|---|---|
| Status | **INTAKE COMPLETE — V2 VISUAL AUTHORITY REGISTERED** (Delta Contract는 별도 문서, §11 참고) |
| Date | 2026-08-16 |
| Todo | `redesign-r1-home-visual-master-v2-rebase` — `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| Authority class | **Visual Authority intake** (ADR-018 §3 사다리 1단계) — H1(v1) intake의 후속 개정, H4 Functional Authority는 별도·불변 |
| Supersedes (시각 authority만) | [`peotteok-home-visual-master-intake.v1.md`](./peotteok-home-visual-master-intake.v1.md) — v1은 삭제하지 않고 HISTORICAL로 전환(본 문서와 동시 커밋으로 배너 추가, §10) |
| Governs | Home(`/`) Desktop/Mobile **Visual Master가 V1→V2로 교체**된 사실과 새 이미지 3장의 authority 등급만. Functional truth·API·DB·Money·Engine은 범위 밖 |
| Runtime code changed by this document | **0** |
| Inputs | Founder가 본 세션에서 첨부한 이미지 3장(§1) · 기존 `peotteok-home-visual-master-intake.v1.md`(H1) · `peotteok-home-visual-contract.v2.md`(H5) · `peotteok-home-implementation-contract.v2.md`(H6) · `peotteok-home-contract-sync.v1.md`(H6.5) |
| Next step | `peotteok-home-v2-delta-sync.v1.md` — H5/H6/H6.5를 V2 기준으로 재대조(본 문서는 그 착수를 승인하되 delta 판단 자체는 수행하지 않음) |

---

## 0. 이 문서가 하는 일 / 하지 않는 일

```text
한다:   Founder가 첨부한 이미지 3장의 역할(Primary/Secondary/Reference)을 프롬프트 §0 원문 그대로 등록한다.
        각 이미지의 실제 file path·SHA-256·dimensions·device authority를 실측 기록한다.
        V1 Visual Master의 시각 authority를 V2로 승계하고 V1은 HISTORICAL로 전환한다(삭제 0).
        이미지에서 실제로 읽을 수 있는 시각 의도(구성·위계·문구 예시)를 서술한다.

하지 않는다: geometry px 확정 · component 매핑 · H5/H6/H6.5 delta 판정(별도 문서) · React/CSS/API/DB 변경 ·
            asset 생성 · Secondary Reference를 Primary로 승격 · Founder 승인 임의 확대
```

---

## 1. Attached Image Authority Registry (실측)

**절대 규칙(프롬프트 §0/§27 원문 준수):** 아래 3개 역할은 첨부 순서가 아니라 각 이미지의 **실제 내용**으로 식별했다(추측 금지 원칙 — 파일명 자체는 authority를 담고 있지 않으므로 이미지 픽셀을 직접 읽어 대조했다). Secondary를 Primary로 승격하지 않았고, 서로 임의 합성하지 않았다.

| 역할 | 원본 파일(workspace 상대 캐시 경로) | SHA-256 | Bytes | 실측 치수(px) | Device |
|---|---|---|---|---|---|
| **DESKTOP_HOME_VISUAL_MASTER_V2** (PRIMARY AUTHORITY) | `...images_ChatGPT_Image_2026__8__16_____03_45_13-94b34d91-46e8-4fd2-8860-f60a78382f21.png`(실제 인코딩=JPEG, 확장자만 `.png`) | `a5c0f19114003b7856cc2ecbc1f730d2cc962a807561ddc12ef391dce32c7cab` | 147,378 | 1024×768 | Desktop |
| **DESKTOP_OPPORTUNITY_REFERENCE** (SECONDARY REFERENCE ONLY) | `...images_ChatGPT_Image_2026__8__15_____12_21_34__1_-04ed786f-4c0f-4c2a-8706-22206cefee75.png`(실제 인코딩=JPEG) | `5689ccec5ae40b6cce2ed70cd47c90827c9d4968782dbd095ab16256e8acd88e` | 158,041 | 1024×768 | Desktop |
| **MOBILE_HOME_VISUAL_MASTER_V2** (PRIMARY MOBILE AUTHORITY) | `...images_ChatGPT_Image_2026__8__16_____06_55_54-fdad5b7d-7e1b-4142-9ed6-f597ea22afe7.png`(실제 인코딩=JPEG) | `f8b1568e5c512bfb013ef2488c10dcf5485fb51e14d300e18f1c96ce98c6e07f` | 114,317 | 576×1024 | Mobile |

원본 이미지 파일은 레포에 저장하지 않는다(ADR-013/ADR-018 §9 불변) — 위 경로는 Cursor 세션 첨부 캐시 위치(workspace 밖)이며, 이 표는 provenance 기록용 텍스트일 뿐 이미지 자체를 커밋하지 않는다.

### 1.1 판정 방법(추측 금지 재확인)

3장을 모두 직접 열어 픽셀 콘텐츠를 확인했다. 판정 근거:

- **DESKTOP_HOME_VISUAL_MASTER_V2로 판정한 이유**: Sidebar(홈·기회·수익·지갑·내정보)+Greeting("김퍼뜩님, 반가워요! 👋")+AI summary 3-stat row(검색 아이콘 "발견한 기회 7건"·그래프 아이콘 "예상 평균 수익률 2.8%"·시계 아이콘 "평균 처리 시간 약 1~3분")+로봇 티저("AI가 선별한 참여 기회를 확인해보세요")+3-category 카드(Watches/Trading Cards/Luxury Bags, 범위 표기)+RightRail("진행 현황"·"다음 기회 업데이트 예정"·"안전하고 신뢰할 수 있어요"·"퍼뜩 인사이트") 구성이 프롬프트 §2 Desktop V2 핵심 hierarchy(Greeting↓AI Summary↓Asset Summary↓Discovery↓3 Opportunities, RightRail=Progress/Trust/Insight)와 구조적으로 정확히 대응한다.
- **DESKTOP_OPPORTUNITY_REFERENCE로 판정한 이유**: 프롬프트 §0의 "참고 금지" 목록(전체 레이아웃 authority·Hero geometry 복제·RightRail 구조 복제·시장지수/가짜 통계 그대로 사용)이 실제로 이 이미지에만 해당하는 요소를 정확히 지칭한다 — 이 이미지는 자체 Hero("AI가 찾은 오늘의 글로벌 기회")·자체 RightRail(내 자산 요약/퍼뜩 AI/**글로벌 시장 동향**[미국+0.35%·일본+0.28%·영국+0.18%·한국+0.12%·중국-0.07%]/바로가기)를 갖고 있다 — "글로벌 시장 동향"이 바로 금지 대상인 "시장지수/가짜 통계"다. 반면 "참고 허용" 목록(실제 상품 이미지·opportunity card 구체성·상품별 필요금액/예상수익/처리시간)은 이 이미지의 3개 카드(롤렉스 서브마리너 126610LN/피카츄 VMAX(CSR)/루이비통 네버풀 MM, 각각 구체적 금액·수익·처리시간·상태·CTA)와 정확히 대응한다.
- **MOBILE_HOME_VISUAL_MASTER_V2로 판정한 이유**: 유일한 세로(576×1024) 이미지이며, 구성(Header→Greeting→AI summary→Large Asset card→Featured Opportunity carousel→진행중/최근확인 2열→BottomNav)이 프롬프트 §4 Mobile V2 hierarchy와 정확히 일치한다.

---

## 2. DESKTOP_HOME_VISUAL_MASTER_V2 — Visual Intent (Primary, 실측)

```text
Sidebar: 홈·기회·수익·지갑·내정보(5탭) + 퍼뜩AI/혜택/초대하기 보조 메뉴 + 알림/설정/고객지원 + 프리미엄 업셀 카드
Main:
  1. Greeting — "김퍼뜩님, 반가워요! 👋"
  2. AI Summary — 로봇 아이콘 + 3-stat row(발견한 기회 7건 · 예상 평균 수익률 2.8% · 평균 처리 시간 약 1~3분)
     보조 시각: line chart + donut(2.8%) — 로봇 마스코트("0<" 포즈) 동반
  3. [본 캡처에는 Asset Summary 카드가 시각적으로 확인되지 않음 — §9 Functional Conflict Matrix 참고]
  4. Opportunity Discovery 티저 — "AI가 선별한 참여 기회를 확인해보세요" + CTA "기회 보기 →"
  5. 3-category 카드(Watches/Trading Cards/Luxury Bags) — 카테고리별 대표 이미지 1개 + 범위 표기
     (예상수익 범위 · 예상수익률 범위 · 처리시간 범위, 특정 단일 opportunity 아님)
Right Rail:
  Zone(진행 현황) — 개별 opportunity 스테퍼(롤렉스 서브마리너, "①분석완료 ②처리중 ③완료대기", 2/3단계) + "전체보기 →"
  Zone(다음 기회 업데이트 예정) — "오늘 오후 2:00"(VISUAL_ONLY_EXAMPLE, §6)
  Zone(안전하고 신뢰할 수 있어요) — 원금 상태 확인 · 처리 상태 확인 · 개인정보 보호
  Zone(퍼뜩 인사이트) — 지구본 아이콘 + "시장의 흐름을 플랫폼 소식과 함께 확인하세요" + "더보기"
```

**Money Semantics Lock(재확인, V1과 동일 축 — Founder rule):**

```text
KRW = primary · USDT = secondary
원금(principal) · 예상 수익(estimated) · 실제 수익(actual) = 서로 분리 · 병합 금지
```

**Processing-Time Semantics Lock(재확인):** 분 단위 경험("약 1~3분") — Engine `Soft60/Hard90`과 방향 일치, 카테고리별 정확한 차등은 여전히 미확증(§12 delta 문서에서 재확인).

**AI Role Lock(재확인):** 퍼뜩 AI = 시장 탐색·기회 설명·처리 안내로 한정. 자금 자동운용·자동매매·수익보장을 암시하는 표현 없음(MATCH, 기존 정책과 상충 없음).

---

## 3. DESKTOP_OPPORTUNITY_REFERENCE — Bounded Reference Intent (Secondary only, 실측)

**참고로 채택하는 것(프롬프트 §0 "참고 허용" 그대로):**

```text
카드당 실제 상품 이미지 1개(시계/트레이딩카드/명품가방) + 구체적 상품명("롤렉스 서브마리너 126610LN" 등)
시장/국가 context 표기 방식(예: "미국 → 일본")
카드별 필요 금액(₩ + 약 USDT 병기) · 예상 수익(₩ + 약 USDT 병기) · 예상 처리 시간(단일 opportunity의 실제 범위, 예: "약 3~5분")
카드별 상태 배지("매칭 가능") + 단일 CTA("수익 벌기")
```

**참고에서 명시적으로 제외하는 것(프롬프트 §0 "참고 금지" 그대로 — 본 문서가 실제로 확인한 위반 후보):**

| 요소 | 이 이미지에 실재 | 판정 |
|---|---|---|
| 전체 레이아웃(Hero+3카드+RightRail 조합) authority | 있음 | **REFERENCE ONLY** — Desktop 전체 구조는 §2(Primary)가 authority |
| Hero geometry("AI가 찾은 오늘의 글로벌 기회" 대형 일러스트) | 있음 | **복제 금지** |
| RightRail 구조(내 자산 요약·퍼뜩 AI·글로벌 시장 동향·바로가기) | 있음 | **복제 금지** — Desktop RightRail 구조는 §2(Primary)가 authority |
| "글로벌 시장 동향"(국가별 %, 미국+0.35% 등) | 있음 | **금지 — 시장지수/가짜 통계.** `home-visual-v2.wire.json forbidden: growth_percent_without_fact` 위반 후보 그대로 |
| "총자산 ₩1,904,000"(원금+수익 합산 표시) | 있음 | **금지 재확인** — H5 §9.2/Money §49.2a "3-슬롯 분리·합산 금지"를 정면 위반하는 패턴. Reference로도 이 숫자·구조는 절대 인용하지 않는다 |
| "1 USDT = ₩1,370.00" 환율 리터럴 표시 | 있음 | **금지** — `fx_recalc_in_ui`/`fake_krw_rate` 축(§8 delta에서 재확인, Asset Summary는 Primary 권한이라 이 Secondary의 패턴 자체를 채택하지 않음) |
| "퍼뜩 시스템 상태"(시장탐색·기회분석·매칭및처리·정산시스템·데이터품질 전부 "정상") | 있음 | **live status로 채택 금지** — Fact 근거 0(§14 delta에서 static Trust copy로만 흡수) |
| 바로가기 "내거래" 라벨 | 있음 | **금지** — `home-visual-v2.wire.json deprecatedNavLabels: ["내거래"]` 재확인, 이 Secondary 이미지가 구버전 IA를 담고 있다는 추가 증거 |

**결론:** DESKTOP_OPPORTUNITY_REFERENCE는 "Opportunity 카드 하나의 구체성"에 대해서만 참고하며, 그 밖의 모든 화면 요소(Hero/RightRail/전역 레이아웃/시장 통계/자산 합산 표시/구버전 IA)는 이 문서가 authority로 사용하지 않는다.

---

## 4. MOBILE_HOME_VISUAL_MASTER_V2 — Visual Intent (Primary Mobile, 실측)

```text
Header: 퍼뜩 로고 + 알림(dot) + 아바타
Greeting: "김퍼뜩님, 반가워요! 👋" + "퍼뜩 AI가 글로벌 시장에서 기회를 찾고 있어요"
AI Summary: 로봇+돋보기 아이콘 + "퍼뜩 AI가 발견한 기회" + 큰 숫자 "7건"
  ※ Desktop과 달리 이 Mobile capture는 3-stat 전체가 아니라 itemCount 단일 stat만 보인다(§10 delta에서 재확인)
Large Asset Summary(보라 그라디언트 카드):
  "내 자산"(눈 아이콘 toggle) ₩1,720,000 / 약 1,250.00 USDT ⓘ
  입금 / 출금 버튼(풀와이드 페어)
  원금 ₩1,560,000 · 예상 수익ⓘ +₩128,000 · 실제 수익ⓘ "연결 예정"
Today's Recommended + Featured Opportunity Carousel:
  "오늘의 추천 기회 +" · "모두 보기 →"
  카드: "AI 추천" 배지 + 롤렉스 서브마리너 126610LN + "미국 → 일본" + 필요금액 ₩1,720,000(약1,243.20USDT)
        + 예상수익 +₩117,500(약84.70USDT) + 예상처리시간 약1~2분 + CTA "기회 보기 →"
  pagination dots(5개, 첫 활성) + adjacent-card peek(좌우 카드 일부 노출)
진행중 / 최근 확인(2열):
  진행중 — 롤렉스 서브마리너 "처리 중" 배지 + progress bar "2/3 단계"
  최근 확인 — "1분 전" 새로고침 아이콘 + 시장 데이터/처리 시스템/보안 시스템 "정상" 3행
BottomNav: 홈(active)·기회·수익·지갑·내정보
```

Desktop의 단순 축소가 아니다(구성 자체가 다름 — ONE dominant opportunity + carousel, Asset Summary가 Main 최상단에 크게 위치, "진행중/최근확인" 2열이 Update+Trust 조합이 아니라 Progress+System-check 조합).

---

## 5. Shared Design Language (V1과 동일 방향, 재확인만)

```text
Light-first · White · Premium Purple(#6B3CFF 방향) · Soft Lavender
Consumer Fintech · AI Intelligence · Rounded premium geometry · Soft dimensional card
```

crypto exchange/trading terminal/casino 방향 이탈 = 0(재확인, 3장 모두 해당 없음).

---

## 6. VISUAL_ONLY_EXAMPLE Handling (프롬프트 §6 원문 재확인)

아래는 이미지 속 예시일 뿐이며 어떤 코드/설정/seed/placeholder에도 하드코딩하지 않는다:

```text
₩1,720,000 · 1,250.00 USDT · ₩1,560,000 · ₩128,000 · +₩117,500 · +₩184,000 · ₩1,904,000
7건 · 2.8% · 1~3분 · 1~2분 · 2/3단계 · 1분 전 · 오늘 오후 2:00
₩18,000~₩42,000 · 1.5%~3.2% · 1 USDT = ₩1,370.00
각 상품 가격(롤렉스/피카츄/루이비통 등)
```

실제 값은 §3(Money Semantics)·§4(Opportunity)에서 이미 확정된 SSOT 필드에서만 온다(H4/H6/H6.5 승계, 본 문서가 재계산하지 않음).

---

## 7. Money Semantics Lock — Founder Rule 재확인(변경 0)

```text
KRW = PRIMARY
USDT = SECONDARY
원금 / 예상 수익 / 실제 수익 = 분리 · 합산 표시 금지
```

두 Primary(Desktop/Mobile) 이미지 모두 이 방향과 상충하지 않는다(원금·예상수익·실제수익이 각각 별도 슬롯으로 표기됨, 합산 숫자는 등장하지 않음 — 합산이 등장하는 유일한 곳은 Secondary Reference의 "총자산"이며 §3에서 이미 배제했다).

---

## 8. Functional Conflict Matrix (V2 신규 발견분만 · 추측 금지)

| 발견 | 이미지 | 분류 | 처리 |
|---|---|---|---|
| Asset Summary 카드가 Desktop Primary capture에 시각적으로 없음 | Primary(Desktop) | 시각 누락(캡처 한계로 추정, 삭제 승인으로 해석하지 않음) | H5 §5 Layout Hierarchy + 본 프롬프트 §2 텍스트가 이미 "Greeting<AI summary<**Asset summary**<Discovery<Category cards" 순서를 명문화 — 이미지의 시각적 부재를 기능 삭제로 해석하지 않는다. Position=`PENDING_CALIBRATION_FROM_MASTER` 유지 |
| RightRail Zone A(COUNT, 오늘 정산 건수)가 Primary capture에 없음 | Primary(Desktop) | 시각 누락 후보 | `home-visual-v2.wire.json factSurface.rightRail: settlementCompletedToday`(C01 lock, Functional Authority)가 존재를 요구 — Visual이 침묵해도 Functional이 우선(ADR-018 §3). §17 delta에서 위치만 미확정으로 재확인 |
| RightRail 순서: "진행 현황"(Zone B 개념)이 최상단, Zone A는 안 보임 | Primary(Desktop) | Zone 순서 delta 후보 | Zone B는 데이터 축 부재로 여전히 DEFER(H6.5 불변) — 이 순서 delta는 Zone B가 실제로 bind되기 **전까지는 실질 영향 0**(§17 delta에서 명시) |
| "AI 추천" 배지(Mobile Featured card) | Primary(Mobile) | 신규 배지 | `bucket==="affordable"`+`hero=affordable[0]` 기존 선택 로직에 대한 **신규 라벨/copy**일 뿐 — 신규 Fact/데이터 아님(§6 delta에서 확정) |
| 국가 context "🇺🇸 미국 → 🇯🇵 일본"류 flag 표기 | Primary(Mobile) 텍스트 서술 | 리터럴 flag emoji 위험 | 실제 코드(`OpportunityCard.tsx`/`MarketPartnerLeg.tsx`) 재실측 결과 buy/sell market은 **파트너 로고**(브랜드 승인 이미지)로만 표시하며 국가 flag 자산 자체가 레포에 없음 — flag **이모지** 글자를 영구 Product UI에 쓰면 emoji 금지 정책 위반(`visual-master-intake.mdc` §Emoji). §6 delta에서 "텍스트 라벨 유지(기존 corridorText) 우선, flag 아이콘은 신규 INVESTIGATE" 로 확정 |
| "시장 데이터/처리 시스템/보안 시스템 정상" 3행(Mobile "최근 확인") | Primary(Mobile) | Live-health Fact 부재 | 대응하는 backend Fact가 H4 Money/Opportunity/DayPulse 어디에도 없음 — `forbidden: live_ai_scan_fsm_claim`류와 같은 축의 "없는 진행상태 발명" 위험. §14 delta에서 static Trust copy로 흡수(live status로 채택 금지) |
| Mobile "진행중/최근확인" 2열 = 기존 H5 "Update/Trust 2열"과 내용이 다름(Progress+Health-ish vs Update+Trust) | Primary(Mobile) | 콘텐츠 delta | §17/§14 delta에서 정확히 재정의 — Trust 불릿리스트(원금상태확인 등) 자체는 요구사항으로 유지, Mobile 내 정확한 위치만 `PENDING_CALIBRATION_FROM_MASTER` |

Blocking conflict(구현을 막는 미해결 충돌) = **0** — 전부 아래 delta 문서로 이관 가능.

---

## 9. Legacy V1 Visual Candidate 재확인

V1(구 Desktop/Mobile Visual Master, `peotteok-home-visual-master-intake.v1.md` 등록분)은 ADR-017의 "LEGACY VISUAL CANDIDATE"(avatar-512.png 등)와 **다른 범주**다 — V1은 ADR-018 §9 절차를 정식으로 거친 Founder-approved Visual Master였다. 본 문서는 V1에 새 라벨을 부여한다:

```text
V1_VISUAL_MASTER_STATUS = SUPERSEDED_BY_V2 (HISTORICAL)
```

V1이 도출한 비-geometry 지식(Money Semantics Lock·Processing-Time 방향·AI Role Lock·Functional Conflict Matrix의 실제 코드 실측 결과)은 V2와 내용이 동일하여 계속 유효하다(§7/§8 재확인이 이를 증명). V1의 정확한 px/구성 가정만 NON-AUTHORITATIVE로 전환한다(§10, ADR-018 §4와 동일 패턴).

---

## 10. V1 → V2 Supersession 실행 (본 문서와 동시 커밋)

`peotteok-home-visual-master-intake.v1.md` 파일 최상단에 다음 배너를 추가했다(내용 삭제 0, 배너만 추가):

```text
SUPERSEDED BY V2 · HISTORICAL FOR GEOMETRY/COMPOSITION · NON-AUTHORITATIVE FOR NEW VISUAL IMPLEMENTATION
Money/Processing-Time/AI-Role locks and the Functional Conflict Matrix's code-level findings remain valid
(carried forward unchanged into V2, packages/ui/canon/contracts/peotteok-home-visual-master-intake.v2.md).
```

---

## 11. Next Authorized Step

```text
peotteok-home-v2-delta-sync.v1.md (H5/H6/H6.5를 V2 기준으로 재대조)
```

본 문서는 그 착수를 승인하되, delta 판정 자체(UNCHANGED/DELTA_REQUIRED/OBSOLETED_BY_V2/NEW_V2_REQUIREMENT)는 수행하지 않는다. Asset Production Part B(`redesign-r1-home-visual-asset-production`)와 H7(`redesign-r1-home-implementation`)은 이 두 문서 모두 완료된 후에만 게이트 판정을 받는다(§31/§32, delta 문서에서 최종 확정).

---

## Document Control

| | |
|---|---|
| Fake binding count | 0 |
| New backend feature invented | 0 |
| Runtime implementation | 0 |
| Asset generated | 0 |
| Secondary→Primary 승격 | 0 |
| 임의 Founder approval 생성 | 0(프롬프트 §0 원문 role만 사용) |
| V1(`peotteok-home-visual-master-intake.v1.md`) | 배너만 추가, 본문 내용 변경 0 |
| Desktop Primary surfaceId | `home-visual-desktop`(변경 없음, 이미지만 V2로 교체) |
| Mobile Primary surfaceId | `home-visual-mobile`(변경 없음, 이미지만 V2로 교체) |
| Secondary Reference role | `REFERENCE_ONLY` / `NOT_AUTHORITY`(전체 레이아웃·RightRail·시장지수 authority 0) |
| H5/H6/H6.5/H7/Brand Assets Part B/Visual Lock started by this document | NO |
| Next authorized step | `peotteok-home-v2-delta-sync.v1.md` |
