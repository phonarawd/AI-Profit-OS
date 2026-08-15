# ADR-018 — Peotteok Visual Master Reset

| | |
|---|---|
| Status | **ACCEPTED / ACTIVE** — Founder-authorized visual authority reset |
| Date | 2026-08-16 |
| Supersedes | [`ADR-017-peotteok-home-light-theme.md`](./ADR-017-peotteok-home-light-theme.md)의 **시각 디자인 권위** (geometry·spacing·Hero composition·RightRail/Sidebar 비율·색 적용·shadow/radius·반응형 시각 기하) |
| Does not supersede | ADR-017의 **비시각 기록**(의사결정 로그·Founder ACK 이력·conflict resolution history·rollback history·데이터 바인딩 지식·접근성 원칙·API/state/routing) — historical evidence로 보존 |
| Does not supersede | ADR-002 Brand 3-layer · ADR-013 mockup governance(사진=Reference only 원칙 자체) · ADR-014/015/016 스택·툴체인·자동화 · PART9 live wire · Money ledger Truth · Canon functional wire(route/state/factSurface/forbidden) |
| Governs | Consumer UI **Visual Authority**만. Backend/API/DB/ledger/wallet/session/auth/KYC/membership/withdrawal/opportunity FSM/backend validation/routes/state management는 본 ADR 범위 밖(§7) |
| Change Control | `governance/platform-redesign/change-control.v1.md` §6.5 `cc.adr018.peotteok-visual-master-reset` (L3) |
| Plan SSOT | `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md` §2.1 · `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` Authority/R1 Home |
| Absorbs (historical draft) | `packages/ui/canon/VISUAL_AUTHORITY_RESET.v1.md` (v1) · `packages/ui/tokens/peotteok-visual-foundation.v0.md` (v0) — 아래 §6 |

---

## 0. Context (Founder decision)

기존 시각 디자인을 새 디자인과 **섞지 않는다.** ADR-017 기반 디자인을 수정해서 진화시키는 방식이 아니라, ADR-017의 **시각 권위를 정식으로 종료**하고 새 Visual Master 체계를 유일한 Visual Authority로 승격한다.

```text
OLD VISUAL DESIGN        = HISTORICAL ONLY
NEW APPROVED VISUAL MASTER = NEW VISUAL SOURCE OF TRUTH
```

기존 ADR/Contract/Implementation Contract 파일은 **삭제하지 않는다.** 감사·rollback 기록을 위해 보존하되 ACTIVE authority · implementation authority · visual reference authority를 제거하고 historical/archive status로 전환한다(§4).

이 문서는 **거버넌스/문서 정리 작업**이다. 새 UI 구현은 이 문서로 시작하지 않는다. 다음 단계는 §17 Founder-provided Home Visual Master intake다.

---

## 1. Decision A — ADR-017 Visual Authority 종료

`ADR-017 Peotteok Home Light Theme`의 **시각 디자인 권위는 본 ADR 발효 시점부로 종료**된다.

### 1.1 보존되는 것 (비시각·역사적 정보)

| 보존 항목 | 위치 |
|---|---|
| 의사결정 기록 · Founder ACK 이력 | ADR-017 §Founder 3 LOCKS · Implementation Contract §7 |
| Conflict resolution history (C01–C10) | `peotteok-home-conflict-resolution.v1.md` |
| Rollback history | Implementation Gate Track Status |
| 데이터 바인딩 지식 (`ledgerTotal`=COUNT 등 semantic lock) | §8 Canon functional truth — **시각이 아니라 Fact 계약이므로 계속 유효** |
| 접근성 원칙 (3초 인지, fontScale, toneBand) | §14 메타 원칙으로 승계 |
| API / state / routing 관련 내용 | §7 비시각 로직 보존 |

### 1.2 새 디자인 구현 기준으로 사용 금지 (ADR-017에서 파생된 시각 결정)

다음은 **ADR-017 산하에서 확정된 시각 결정**이며, 새 Visual Master가 등록되기 전까지도 이후에도 **자동 채택 금지**다. 새 Home 실장은 이 값을 참고·복사하지 않고 새 Visual Master에서 다시 추출한다(§6 원칙과 동일):

- geometry (sidebar 240px · rightRail 320–360px · header 64px 등)
- spacing (xs4/sm8/md16/lg24/xl32 Home 적용 방식)
- card proportions
- typography hierarchy (Home 전용 스케일 적용)
- Hero composition (480–600px · illustration ≤46% 등)
- RightRail geometry
- Sidebar visual proportions
- old Header styling
- old Home layout assumptions
- old robot placement
- old visual hierarchy
- old responsive visual geometry (mobile 320–420 provisional stack)
- old color treatment (Home 적용 맥락의 `#6B3CFF`/`#F6F4FC` 등 — §6.3 참고)
- old shadow/radius decisions
- old visual copy placement
- old component proportions

> ADR-017 문서는 historical evidence로 남지만, **ACTIVE VISUAL AUTHORITY가 아니다.**

---

## 2. New Visual Source of Truth

앞으로 퍼뜩 Consumer UI의 시각적 기준은 **Founder-approved Visual Master images**다.

- Visual Master 이미지가 제공된 화면은 그 이미지가 해당 화면의 **최고 시각 authority**가 된다(§9 intake 절차를 거쳐 등록된 후).
- 문서나 기존 CSS가 Visual Master와 충돌할 경우 **Visual Master가 우선**한다.
- 단, Visual Master가 **기능적 truth / data contract / legal / accessibility / security requirement**와 충돌할 경우에는 무작정 이미지대로 구현하지 않는다. `VISUAL_FUNCTIONAL_CONTRACT_CONFLICT`로 명시해 Founder 판단을 요청한다(기존 `.cursor/rules/visual-master-intake.mdc` §4 절차와 동일 축).
- Visual Master가 평균 기기 성능 예산과 충돌하면 `VISUAL_PERFORMANCE_CONFLICT`로 증거·대안을 보고한다(`.cursor/rules/peotteok-performance-target.mdc`). PO 로컬 저사양 실패만으로 Visual Master를 깎지 않는다.

---

## 3. Visual Authority Hierarchy (신규 · 충돌 시 상위 승)

### VISUAL AUTHORITY

```text
1. Founder-approved Visual Master image
2. Screen-specific New Visual Contract        (packages/ui/canon/contracts/<screen>.visual-contract.v2.md 계열)
3. Screen-specific New Implementation Contract (packages/ui/canon/contracts/<screen>.implementation-contract.v2.md 계열)
4. New design tokens / component contract      (packages/ui/tokens/** · packages/ui 컴포넌트 API)
5. Runtime implementation
```

### FUNCTIONAL AUTHORITY (별도 유지 · 시각과 섞지 않음)

```text
1. Backend / data contract
2. Canon functional wire (packages/ui/canon/surfaces/*.wire.json — route/state/factSurface/forbidden)
3. route / state contract
4. copy SSOT (packages/ui/copy/ko/*)
5. security / legal / accessibility requirements
```

**중요:** Visual authority와 Functional authority를 섞지 않는다. 화면 구현 시 두 사다리를 각각 통과해야 하며, 하나가 통과했다고 다른 하나가 자동으로 맞는다고 가정하지 않는다. 두 사다리가 충돌하면 **Functional Authority가 이긴다** (§2 conflict 규칙과 동일).

---

## 4. 기존 Home 계약 체인 — Historicization

다음 8개 파일은 **삭제하지 않는다.** 각 파일 상단에 아래 3중 상태를 명시하는 배너를 추가했다(본 ADR과 동시 커밋):

```text
SUPERSEDED · HISTORICAL · NON-AUTHORITATIVE FOR NEW VISUAL IMPLEMENTATION
```

| # | 파일 | 새 상태 | 비시각 보존 내용 |
|---|---|---|---|
| 1 | `ADR-017-peotteok-home-light-theme.md` | SUPERSEDED (본 ADR §1) | Founder 3 LOCKS 의사결정 기록 |
| 2 | `peotteok-home-visual-contract.v1.md` | HISTORICAL | Fact allowlist 지식(§6.2 계열)은 §8로 승계 |
| 3 | `peotteok-home-visual-implementation-contract.v1.md` | HISTORICAL | LOCK A(Data SSOT)·LOCK C(PART9 Boundary) 원칙은 §7/§8로 승계 |
| 4 | `peotteok-home-conflict-resolution.v1.md` | HISTORICAL | C01–C10 decision matrix — 새 Visual Contract 작성 시 참고용 사례집 (권위 아님) |
| 5 | `peotteok-home-implementation-gate.v1.md` | SUPERSEDED / STOPPED (§5) | STEP 5 Slice 진행 기록 |
| 6 | `home-visual-implementation-mapping.v1.md` | HISTORICAL | keep/adapt 컴포넌트 매핑 사례 — 새 mapping 작성 시 참고 |
| 7 | `home-visual-v2.wire.json` | 부분 SUPERSEDED | `navLabels`/`navHrefs`/`factSurface`/`forbidden`(semantic lock) = 계속 유효 · `layout.*`(px geometry) = NON-AUTHORITATIVE |
| 8 | `peotteok-light.specification.md` | 부분 SUPERSEDED | 색 hex는 **현재 런타임 미러로 계속 작동**(코드 미변경) · Home geometry 값(hero 480–600px 등)은 NON-AUTHORITATIVE for new impl |

기록을 왜곡하거나 삭제하지 않는다. 각 파일의 배너는 다음 문장을 공통으로 포함한다:

> "이 결정은 당시에는 유효했지만, 새 Visual Master Reset(ADR-018)에 의해 시각 권위가 superseded되었다."

---

## 5. STEP 5 Implementation — SUPERSEDED / STOPPED BY ADR-018

`peotteok-home-implementation-gate.v1.md` Track Status 기준 진행 상태:

```text
STEP 5   Slice 0–2 CLOSED · Pre-Slice Hero Fix COMPLETE
         Slice 3 Money AMEND (mobile polish) COMPLETE
         Slice 4 Opportunity mobile polish COMPLETE
         next: Slice 5 RightRail / Slice 6 Partner   ← 본 ADR 발효 시점 위치
```

**판정:** 위 진행(Slice 5 RightRail / Slice 6 Partner 착수 대기 포함 이후 전체)은 **SUPERSEDED / STOPPED BY ADR-018 VISUAL RESET**이다.

- Slice 0–4에서 반영된 **비시각 semantic fix**(C01 `ledgerTotal` count-only binding 등)는 데이터 바인딩 결함 수정이므로 **코드 롤백 대상이 아니다** — 이미 배포된 defect fix는 유지한다.
- Slice 5(RightRail)·Slice 6(Partner)·Slice 7(regression polish)은 **ADR-017 Visual/Implementation Contract 기준으로 착수하지 않는다.**
- 새 Home 시각 구현은 새 Home Visual Master intake(§9) → 새 Visual Contract → 새 Implementation Contract 이후에만 재개한다. 이전 Slice 순서·번호를 그대로 이어받는다고 가정하지 않는다(새 Implementation Gate가 새 큐를 정의한다).
- 이유: 새 Visual Master 기반 New Home Contract가 아직 생성되지 않았다.

---

## 6. 새 디자인에 옛 디자인 참고 금지

새 Visual Contract 생성 시 기존 Home v1.4의 숫자·구조를 자동으로 가져오지 않는다. 금지:

- old px values copy · old gap values copy · old Hero dimensions copy · old card geometry copy
- old typography scale copy · old RightRail size copy
- old responsive thresholds를 시각 기준으로 그대로 사용
- old robot positioning copy

새 Visual Master에서 **다시 추출**해야 한다. (§6.3) 색 방향(Light + Purple/Lavender)은 §14 메타 원칙으로 계속되지만, 정확한 hex/적용 규칙은 새 Visual Master 확정 후 재확정한다 — 지금 새 hex를 임의로 만들지 않는다.

---

## 7. 비시각 로직 보존 (Reset 대상 아님)

이번 리셋은 **UI/Visual Reset**이다. 아래는 리셋 대상이 아니며 본 ADR이 건드리지 않는다:

API · SDK · database · ledger logic · wallet accounting · session · authentication · KYC workflow · membership state · withdrawal logic · opportunity state machine · backend validation · routes · state management · existing business logic · security rules.

기존 UI 컴포넌트 안에서도 데이터/로직과 프레젠테이션을 분리할 수 있다면 로직은 보존한다 (예: `HomePageClient` fetch/세션/401 처리, `opportunity-card-map.ts`, SDK 호출부).

---

## 8. Canon Functional Truth 보존

기존 Canon wire(`packages/ui/canon/surfaces/*.wire.json`)의 다음 필드는 함부로 삭제하지 않는다: `route` · `state` · `factSurface` · `forbidden`(semantic lock, 예: `ledgerTotal_as_usdt`) · required data · legal truth · money truth · transaction state.

`home-visual-v2.wire.json`의 `navLabels`/`navHrefs`/`deprecatedNavLabels`/`heroTimeline`(용어 락)/`factSurface`/`forbidden` semantic 항목은 **기능적 truth로 계속 유효**하다. 반면 `layout.desktop.*`/`layout.mobile.*`(px geometry)는 새 Master 기준으로 재작성 **가능**해야 한다 — 단, 그 재작성은 이번 마이그레이션 세션에서 수행하지 않는다(§17 이후 단계).

---

## 9. Visual Master Intake 절차

Founder-provided 목업 이미지는 일반 PNG mockup이 아니라 **Founder-provided Visual Master Candidate**로 intake한다. ADR-013의 "무분별한 mockup 저장 / pixel matching 금지" 정책은 무시하지 않는다 — intake는 명시적 승인 절차를 거친다.

```text
Founder image
  → Master candidate (repo에 원본 이미지 파일 저장 안 함 · 채팅 세션 참고만)
  → functional conflict check (데이터 계약·legal·a11y·security와 충돌 스캔)
  → Founder confirms Master ("APPROVED VISUAL MASTER"로 명시 지정)
  → register authority (해당 screen의 Visual Authority 상단에 등록 · 본 ADR §3 사다리)
  → derive contract (Visual Contract → Implementation Contract, 치수/색/타이포/spacing/상태 측정 추출)
  → implement (Implementation Gate 승인 후에만)
```

세부 실행 SSOT는 `.cursor/rules/visual-master-intake.mdc`(본 ADR 발효와 함께 candidate 단계·PC/Mobile 분리·ADR-018 포인터를 반영해 갱신)다. 5-Layer 권위·LOCK 절차·Missing Asset·Emoji 정책은 그 규칙 파일이 계속 SSOT다 — 본 ADR과 중복 정의하지 않는다.

---

## 10. PC / Mobile 분리

새 Visual Master는 **Desktop**과 **Mobile**을 별도 authority로 취급한다.

- Desktop 이미지를 모바일에 단순 축소 적용하지 않는다.
- Mobile geometry는 Mobile Visual Master가 별도로 제공되었을 때만 확정한다.
- 둘 중 하나만 제공된 경우 나머지 플랫폼은 §9 절차 없이 "구조 provisional"로만 유지한다(ADR-017 §13 Mobile provisional 원칙과 동일 축 — 단 이제 ADR-017이 아니라 본 ADR이 그 원칙의 authority다).

---

## 11. Visual Locks

`packages/ui/canon/visual-locks.v1.json`은 `locks: []`(빈 배열) 상태를 유지한다. 새 Visual Master가 있다고 즉시 lock하지 않는다.

**LOCK 조건 (순서대로 전부 충족 후에만):**

1. 해당 화면 Visual Master 등록 (§9)
2. New Visual Contract 작성
3. New Implementation Contract 작성
4. 구현
5. QA
6. Founder visual approval
7. 이후에만 screen-level lock 등록

기존 ADR-017 lock을 복원하거나 자동 등록하지 않는다 — 등록 시점에도 `locks[]`는 비어 있었으므로(2026-08-16 확인) 복원할 대상 자체가 없다.

---

## 12. 오늘 생성된 비공식 Draft 문서 흡수

| 문서 | 처리 |
|---|---|
| `packages/ui/canon/VISUAL_AUTHORITY_RESET.v1.md` | **ABSORBED BY ADR-018** — historical pre-ADR draft로 배너 전환. 경쟁 authority 아님 |
| `packages/ui/tokens/peotteok-visual-foundation.v0.md` | **ABSORBED BY ADR-018** — historical pre-ADR draft(direction 초안)로 배너 전환. Primitives/Shell 방향 아이디어는 §9 새 Visual Contract 작성 시 참고 후보일 뿐 권위 아님 |

두 문서는 ADR-018과 동급 ACTIVE authority로 남지 않는다.

---

## 13. Legacy Visual Candidates (분류만 · 코드 변경 0)

Audit(`packages/ui/tokens/LEGACY_ASSET_LIST.md`, `VISUAL_RESET_REPORT.md`)에서 식별된 아래 자산/코드는 이번 세션에서 **삭제·교체하지 않는다.** 다음 라벨로만 분류한다:

```text
LEGACY VISUAL CANDIDATE — DO NOT USE AS NEW MASTER AUTHORITY
```

| 대상 | 위치(참고) |
|---|---|
| `BrandMark.tsx`의 `✦` 별 마크 | `packages/ui/components/brand/BrandMark.tsx` |
| BottomNav5 inline star | `packages/ui/components/shell/*` (BottomNav5 계열) |
| `wordmark-dark` | `packages/ui/brand/assets/wordmark/wordmark-dark.png` |
| robot+globe hero illustration | `packages/ui/brand/assets/ai/hero-illustration-*` |
| AI avatar(dark/추상 스파클 마크) *(2026-08-16 추가 — 원표에서 누락, H1 intake 이미지 확인으로 보완)* | `packages/ui/brand/assets/ai/avatar-512.png` |
| legacy dark tokens (`lux-dark`/`luxFintechLegacyDark`) | `packages/ui/tokens/lux-fintech.ts` |

실제 교체는 새 Visual Master 화면 구현 단계에서, 해당 화면의 새 Implementation Contract가 명시할 때만 진행한다.

---

## 14. 퍼뜩 제품 방향 메타 원칙 (계속 유지)

향후 Visual Master 계약이 들어오면 다음 제품 원칙을 유지한다 — 단 **정확한 pixel geometry는 Visual Master에서 추출**한다(§6):

- 브랜드: 퍼뜩 · AI: 퍼뜩 AI
- Light UI · Premium Purple / Lavender direction
- Korean Consumer Fintech · KRW-first · USDT secondary
- 분 단위 processing experience
- direct trading UI 금지 · fake social proof 금지
- Safe Stop은 실패 화면이 아님
- 메인 IA: 홈 · 기회 · 수익 · 지갑 · 내정보

---

## 15. Forbidden (본 ADR)

1. ADR-017 시각 결정을 새 디자인에 조용히 이식
2. `home-visual-v2.wire.json`의 `layout.*` px 값을 새 Contract 작성의 기본값으로 재사용
3. `visual-locks.v1.json`에 항목을 즉흥 추가
4. `VISUAL_AUTHORITY_RESET.v1.md` / `peotteok-visual-foundation.v0.md`를 본 ADR과 동급 authority로 인용
5. 본 ADR을 근거로 Canon functional wire의 route/state/factSurface/forbidden 삭제
6. 본 ADR을 근거로 API/SDK/DB/ledger/session/auth/KYC/membership/withdrawal/opportunity FSM 변경
7. Founder 명시 지정 없는 이미지를 "Visual Master"로 승격
8. STEP 5 Slice 5(RightRail)/6(Partner) 재개를 새 Contract 없이 진행
9. 본 ADR 승인만으로 새 Home UI 구현 착수 (§17 intake가 먼저다)

---

## 16. Governance Pointers

| 문서 | 반영 내용 |
|---|---|
| `governance/platform-redesign/change-control.v1.md` | §6.5 `cc.adr018.peotteok-visual-master-reset` (L3) |
| `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md` | §2.1 ADR-018 supersession 기록 |
| `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` | Authority/R1 Home 절 + `redesign-r1-home-*` todo 3건 supersede 포인터 |
| `.cursor/rules/visual-master-intake.mdc` | candidate 단계 + PC/Mobile 분리 + ADR-018 포인터 반영 |
| `packages/ui/brand/README.md` | Dark Obsidian 레거시 절 deprecated 표시 |
| `packages/ui/tokens/LEGACY_ASSET_LIST.md` | Legacy Visual Candidate 라벨 + 본 ADR 포인터 |

---

## 17. NEXT AUTHORIZED STEP

```text
Founder-provided Home Visual Master intake
```

이 문서(및 본 마이그레이션 세션의 나머지 산출물) 완료 후 **다음으로 허용된 유일한 단계**는 위 intake다. 새 Home UI 구현을 임의로 시작하지 않는다.

---

## Document control

| | |
|---|---|
| Status | ACCEPTED / ACTIVE |
| Supersedes | ADR-017 visual authority (비시각 이력 보존) |
| Implementation code changed by this ADR | **0** (governance/문서 전용) |
| Runtime UI changed by this ADR | **0** |
| Visual locks after this ADR | `[]` (불변) |
