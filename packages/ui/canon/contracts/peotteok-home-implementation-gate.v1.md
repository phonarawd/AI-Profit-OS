# STEP 4.4 — Peotteok Home Implementation Gate v1

> **역할:** STEP 5 코드 착수 **전** 최종 검증 체크리스트 + Founder 승인 게이트  
> **코드:** 본 문서 승인 전까지 `apps/web` / `packages/ui/components` **변경 0**  
> **트랙:** Home Visual Upgrade · PART9 아님 · 타 시스템 영역 **동결**

**버전:** v1.0  
**일자:** 2026-08-10  
**선행:** STEP 3 Founder ACK ✅ · STEP 4.1–4.3 amend ✅  

---

## Track Status

```text
STEP 0       ✅ LOCKED
STEP 0.5     ✅ CODE FACT LOCKED
STEP 1       ✅ PC GAP LOCKED · ⚠ Mobile UNKNOWN
STEP 2       ✅ COMPLETE / FOUNDER ACK / LOCKED
STEP 3       ✅ APPROVED / LOCKED · 3 LOCKS
STEP 4.1     ✅ ADR / Contract amendment
STEP 4.2     ✅ Wire amendment
STEP 4.3     ✅ Token amendment
STEP 4.4     ✅ APPROVED — proceed STEP 5 Slice 0 (C01 only)
STEP 5       ✅ Slice 0–3 CLOSED · next Slice 4 Opportunity
```

---

## 1. Founder 3 LOCKS (재확인 · 깨면 Gate FAIL)

| Lock | Must hold |
|---|---|
| **A Data SSOT** | Fact > Contract > Reference · `ledgerTotal`=COUNT · USDT 재해석 금지 · mock 숫자 금지 · 누적 수익 USDT 미표시 |
| **B Geometry Reference** | 레이아웃·밀도·비율·위계만 PC Reference · 숫자/상태/FSM/VIP/차트/도넛 복제 금지 · Product Contract 충돌 시 Contract 승 |
| **C PART9 Boundary** | Experience/CSS/copy 중심 · `HomePageClient` 최소 binding · fetch→mapper→SDK→Nest→DB→ledger→auth 동결 · `HomePageV2`/병렬 파이프라인 금지 |

---

## 2. Artifact checklist (STEP 4 산출물)

| # | Artifact | Path | OK |
|---|---|---|---|
| 4.1a | ADR-017 amend | `packages/ui/canon/contracts/ADR-017-peotteok-home-light-theme.md` | [x] |
| 4.1b | Visual Contract v1.4 | `packages/ui/canon/contracts/peotteok-home-visual-contract.v1.md` | [x] |
| 4.1c | Conflict Resolution | `packages/ui/canon/contracts/peotteok-home-conflict-resolution.v1.md` | [x] |
| 3 | Implementation Contract | `packages/ui/canon/contracts/peotteok-home-visual-implementation-contract.v1.md` | [x] ACK |
| 4.1d | Impl mapping v1.1 | `packages/ui/canon/contracts/home-visual-implementation-mapping.v1.md` | [x] |
| 4.2 | Wire | `packages/ui/canon/surfaces/home-visual-v2.wire.json` | [x] |
| 4.3 | Token SPEC | `packages/ui/tokens/peotteok-light.specification.md` | [x] |
| 4.4 | This Gate | `packages/ui/canon/contracts/peotteok-home-implementation-gate.v1.md` | [x] |

---

## 3. Semantic locks (코드 전 문서 검증)

| ID | Lock | Documented in |
|---|---|---|
| C01 | `ledgerTotal` = COUNT · never USDT | ADR · Visual §6.2a · Wire `ledgerTotal_as_usdt` forbidden · Mapping slice 0 |
| C02 | Money = `principalUsdt` + today possible only | Visual §4.1 · Wire money block |
| C03 | No 30d chart / growth% | Visual §4 · Wire forbidden |
| C04 | RightRail = settle + today possible + TOP3 | Visual §6.2 · Wire rightRail note |
| C05 | No live AI FSM claim | Wire header note · Implementation Contract §06 |
| C08 | IA `기회` · no `내거래` | Wire navLabels |
| Mobile | provisional structure only | Wire `mobile.status` · Visual §8 |

---

## 4. STEP 5 entry conditions

모두 만족해야 구현 시작:

1. [x] **Founder ACK on this Gate** (§7 · 2026-08-10)  
2. [x] STEP 3 APPROVED / 3 LOCKS  
3. [x] STEP 4.1–4.3 artifacts present  
4. [x] No requirement to change Nest/SDK/mapper/Auth/Ledger for Home Experience polish  
5. [x] First slice defined = **C01 semantic binding fix**  

---

## 5. STEP 5 queue (승인 후 · 순서 고정)

```text
STEP 5
  ├─ Slice 0  C01 ledgerTotal count-only OR hide   ← FIRST
  ├─ Slice 1  Shell (Sidebar / Header / IA)
  ├─ Slice 2  Hero
  ├─ Slice 3  Money
  ├─ Slice 4  Opportunity
  ├─ Slice 5  RightRail
  ├─ Slice 6  Partner / polish
  └─ Slice 7  Regression gates
```

### Slice 0 definition (C01)

```text
BEFORE (defect):
  totalResultValue = ledgerTotal > 0 ? `${ledgerTotal} USDT` : null

AFTER (required):
  ledgerTotal / settlementCompletedToday
    → count semantic presentation  OR  hide
    → NEVER bind as USDT amount
    → HomePayoutCounter same semantics
```

허용 편집 범위 (Slice 0):

- `apps/web/app/HomePageClient.tsx` (binding only)
- `packages/ui/components/home/HomeExperience.tsx`
- `packages/ui/components/home/HomeRightRail.tsx`
- `HomePayoutCounter` / 관련 lux counter 표시
- `packages/ui/copy/ko/home*` (count 라벨)

금지 (Slice 0 포함 전 STEP 5):

- Nest / SDK / mapper / Auth / DB / Ledger
- `HomePageV2`
- Mock 숫자로 빈 슬롯 채우기
- Mobile geometry 최종 확정 주장

---

## 6. Regression gates (각 슬라이스 후)

| Gate | Required |
|---|---|
| `verify:home-live-wire` | PART9 path |
| `verify:home-principal-slots` | Money |
| `verify:canon-surfaces` | wire |
| `verify:ia-tabs` | 5탭 |
| `verify:no-it-jargon` | copy |
| `verify:cta-earn-profit` | card CTA |
| `verify:brand-consumer` | 퍼뜩 |
| `verify:lux-theme-sync` | tokens (theme edit 시) |
| `verify:mockup-governance` | PNG |
| `verify:gate:fast` | T0 commit |
| Manual C01 | Home surface에 `ledgerTotal`+`USDT` 결합 **0** |

저사양: 관련 verify만 · `pnpm -r` 풀빌드 금지 · 프로세스 1개.

---

## 7. Founder approval

| | |
|---|---|
| Gate verdict | ✅ **APPROVED** (2026-08-10) |
| Approves | STEP 5 Slice 0 (C01) 착수 권한 |
| Does not approve | Nest/SDK/Ledger/Auth 변경 · Mobile visual final · 목업 Fact 복제 · Slice 0에 타 UI 혼입 |

**승인 문구:** `STEP 4.4 Gate APPROVED — proceed STEP 5 Slice 0 (C01 only)`

---

## 8. One-line Verdict

> 문서는 닫혔다. 코드는 아직이다. Gate ACK 전에는 UI 한 줄도 바꾸지 않고, ACK 후에는 **C01 semantic binding**부터 고친다.
