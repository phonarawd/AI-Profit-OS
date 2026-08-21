---
name: HomeCleanV1 Clean-room
overview: /dev/home-clean-v1 exact bare(children only)에서 HomeCleanV1이 전체 Home Shell을 소유한다. 기존 Home·H7·HVR 재사용 0. 완성 자산 재생성 0. Visual Authority는 Phase 3 전 사용자 승인. 7 view+3 session. fixture/live 분리·production fixture fail-closed. KRW PRIMARY/USDT SECONDARY. OpenNext는 P6/P7 필수·P2 blocker 아님. 자동 commit/push 0. 03 File-Serial YAML 변경 0. / cutover는 사용자 승인 후 render+bare+live atomic.
todos:
  - id: HC0-01
    content: P0 worktree/baseline scope · .gitignore에 _tmp_home_clean/ 1줄 · 앱 코드 0 · 03 YAML 0
    status: completed
  - id: HC0-02
    content: P0 import/CSS graph 고정 · layout→lux-theme→component.css · AppShell·HomePageClient · 앱 코드 0
    status: completed
  - id: HC0-03
    content: P0 기존 Home 9장+errors.json · / · H7 · HVR × 390/768/1440 · _tmp only · 앱 코드 0
    status: completed
  - id: HC0-04
    content: P0 확정 자산팩 inventory · PACKAGE_INTEGRITY_PASS · 설치 0 · WAITING_FOR_USER_ASSET_FILES 금지
    status: completed
  - id: HC0-05
    content: P0 실제 build/verify script inventory · package.json 원문만 · 실행 0
    status: completed
  - id: HC0-06
    content: P0 게이트 HOME_CLEAN_BASELINE_PASS · 앱 diff는 .gitignore+_tmp만 · commit 0
    status: completed
  - id: HC1-01
    content: P1 exact bare 설계 확정 · children only · routes.ts 기본 0 · ia-tabs/nested 재증명
    status: completed
  - id: HC1-02
    content: P1 @aipo/ui/components/home-clean-v1 probe+exports 1키 · 카드 0 · .home-* 0
    status: completed
  - id: HC1-03
    content: P1 /dev/home-clean-v1 page · production notFound · robots noindex · routes.ts 0
    status: completed
  - id: HC1-04
    content: P1 AppShell exact-path children only · HomeChromeProvider 0 · CSS hide 0
    status: completed
  - id: HC1-05
    content: P1 CSS matched-style audit · 11노드 · 예상 밖 component.css declaration 0
    status: completed
  - id: HC1-06
    content: P1 기존 5탭+login chrome 회귀 · Clean 경로 구 chrome DOM 0
    status: completed
  - id: HC1-07
    content: P1 pnpm --filter @aipo/web build · CSS Module/transpile · production 404 · OOM≠PASS
    status: completed
  - id: HC1-08
    content: P1 OpenNext 위치를 P6/P7로 고정 기록 · Phase 2 blocker 아님 · win32 SKIP≠PASS
    status: completed
  - id: HC1-09
    content: P1 게이트 HOME_CLEAN_CSS_ISOLATION_PASS · Next build 필수 · OpenNext는 P6/P7 · commit 0
    status: completed
  - id: HC2-01
    content: P2 --hc-* token root on [data-ui-surface=home-clean-v1] · lux-fintech 의미 0
    status: completed
  - id: HC2-02
    content: P2 HomeCleanShell grid · document scroll 1회 · 카드 시각 0
    status: completed
  - id: HC2-03
    content: P2 Header skeleton · landmark만 · 자산 배선 0 · useHomeChrome 0
    status: completed
  - id: HC2-04
    content: P2 HomeCleanNavigationModel · USER_TABS props · 아이콘 맵 1파일 · presentation 0
    status: completed
  - id: HC2-05
    content: P2 Desktop Sidebar presentation skeleton · 모델만 · BottomNav5 재사용 0
    status: completed
  - id: HC2-06
    content: P2 Mobile Bottom Nav presentation · 같은 모델 · 숨김=hidden+inert+aria-hidden · nav 1개
    status: completed
  - id: HC2-07
    content: P2 safe-area · padding-bottom+env · root viewport-fit 변경 0 · 터치 44~48
    status: completed
  - id: HC2-08
    content: P2 5-viewport shell QA · 320/390/768/1440/3840 · full matrix 금지
    status: completed
  - id: HC2-09
    content: P2 게이트 HOME_CLEAN_SHELL_PASS · 카드 0 · commit 0
    status: completed
  - id: HC25-01
    content: P2.5 확정 ZIP 검증+사용자 자산 승인+identity 계약 · 설치 자동완료 0 · 정적 김 0
    status: completed
  - id: HC25-02
    content: P2.5 승인 자산 manifest/mapping · public 설치 대상 기록 · Brand Kit overwrite 0
    status: completed
  - id: HC25-03
    content: P2.5 승인 자산 로드/provenance · 임의 대체 0 · Desktop 카드 0
    status: completed
  - id: HC25-04
    content: P2.5 게이트 HOME_CLEAN_ASSET_AUTHORITY_APPROVED · 설치는 승인 후 · Phase 3 전 아님
    status: completed
  - id: HC25-05
    content: P2.5 Desktop/Mobile Visual Authority 승인 · HOME_CLEAN_VISUAL_AUTHORITY_APPROVED · Phase 3 전
    status: completed
  - id: HC3-01
    content: P3 Desktop Header 시각 · 승인 Visual Authority+자산만 · AppHeader 재사용 0
    status: completed
  - id: HC3-02
    content: P3 Desktop Sidebar 시각 · USER_TABS href/label · 탭 상수 복제 0
    status: completed
  - id: HC3-03
    content: P3 AI Summary · fixture only · home-clean-assets만 · HOME_V3_ASSET import 0
    status: completed
  - id: HC3-04
    content: P3 Asset 슬롯 · fixture 문자열 · KRW PRIMARY / USDT SECONDARY · 계산 0 · ledgerTotal 의미 미확정
    status: completed
  - id: HC3-05
    content: P3 Discovery · T.home.hero · CTA 의미 불변 · copy SSOT 수정 0
    status: completed
  - id: HC3-06
    content: P3 Products Desktop 3카드 · 선택 family만 · carousel은 P4
    status: completed
  - id: HC3-07
    content: P3 Right Rail · in-flow · 자체 vertical scroll 0
    status: completed
  - id: HC3-08
    content: P3 Desktop composition QA · 390/768/1440 · Visual PASS 선언 금지
    status: completed
  - id: HC3-08C1
    content: P3 사용자 Desktop 승인 correction · column/density · 고정 1440 canvas 0
    status: completed
  - id: HC3-08C2
    content: P3 사용자 Desktop 승인 correction · Header/Sidebar · 정적 김 0 · code-native bell
    status: completed
  - id: HC3-08C3
    content: P3 사용자 Desktop 승인 correction · AI Summary · Robot 위계 · 목업 숫자 0
    status: completed
  - id: HC3-08C4
    content: P3 사용자 Desktop 승인 correction · Asset · 점선 슬롯 0 · KRW/USDT 표시 · 계산 0
    status: completed
  - id: HC3-08C5
    content: P3 사용자 Desktop 승인 correction · Discovery compact + Category chips · T.home 0
    status: completed
  - id: HC3-08C6
    content: P3 사용자 Desktop 승인 correction · Products 1440×1080 밀도 · 가짜 값 0
    status: completed
  - id: HC3-08C7
    content: P3 사용자 Desktop 승인 correction · Right Rail 위계 · 가짜 진행 숫자 0
    status: completed
  - id: HC3-08C8
    content: P3 사용자 Desktop 승인 correction · Desktop 재조립 QA · Visual PASS 선언 금지
    status: completed
  - id: HC3-09
    content: P3 사용자 Desktop 육안 승인 · 자동 완료 금지 · 승인 전 Phase 4 금지
    status: completed
  - id: HC3-10
    content: P3 게이트 HOME_CLEAN_DESKTOP_READY_FOR_USER_REVIEW · commit 0
    status: completed
  - id: HC4-01
    content: P4 Mobile Header · 같은 HomeCleanHeader CSS · 둘째 Header 트리 0
    status: completed
  - id: HC4-02
    content: P4 Mobile AI · 같은 AiSummary · 정보 삭제 0
    status: completed
  - id: HC4-03
    content: P4 Mobile Asset · 금액 의미 불변 · 잘림 0
    status: completed
  - id: HC4-04
    content: P4 Featured Carousel · 같은 Products overflow-x · 둘째 상품 트리 0
    status: completed
  - id: HC4-05
    content: P4 Progress Mobile 흐름 · 새 Progress 컴포넌트 0 · rail 자체 scroll 0
    status: completed
  - id: HC4-06
    content: P4 Trust/System Mobile 배치 · trust copy 의미 0
    status: completed
  - id: HC4-07
    content: P4 Bottom Nav 시각 마감 · 모델 복제 0 · viewport당 nav landmark 1
    status: completed
  - id: HC4-08
    content: P4 Mobile first-view QA · 390×693 필수 정보 잔존
    status: completed
  - id: HC4-09
    content: P4 Landscape/Tablet · 지정 8뷰 · Ultrawide 금지
    status: completed
  - id: HC4-10
    content: P4 Intermediate Desktop · 1024/1280/1366 · Tailwind lg에 의존 금지
    status: completed
  - id: HC4-11
    content: P4 Ultrawide clamp · 1680 또는 --hc-max · 무한 stretch 0
    status: completed
  - id: HC4-12
    content: P4 사용자 Responsive 육안 승인 · 자동 완료 금지 · 승인 전 Phase 5 금지
    status: completed
  - id: HC4-13
    content: P4 게이트 HOME_CLEAN_RESPONSIVE_READY_FOR_USER_REVIEW · commit 0
    status: completed
  - id: HC5-01
    content: P5 authority 이미지 _tmp 정규화 · *mockup* 금지 · docs/mockups 0 · Canon 0
    status: completed
  - id: HC5-02
    content: P5 Desktop 1440 overlay · 참고만 · visual-locks 0
    status: completed
  - id: HC5-03
    content: P5 Mobile 390 overlay · Desktop 축소 적용 금지
    status: completed
  - id: HC5-04
    content: P5 full viewport matrix 생략 금지 · OOM이면 BLOCKED_LOCAL_OOM
    status: completed
  - id: HC5-05
    content: P5 zoom 125/150/200 · a11y · nav landmark 1 · h1 1
    status: completed
  - id: HC5-06
    content: P5 perf/device tier · 새 heavy dep 0 · 시각 일방 삭감 금지
    status: completed
  - id: HC5-07
    content: P5 Chromium 필수 smoke · Firefox/WebKit는 설치 시에만 · 미설치≠PASS
    status: completed
  - id: HC5-08
    content: P5 기존 route 회귀 · / 는 아직 HomePageClient
    status: completed
  - id: HC5-09
    content: P5 사용자 최종 시각 승인 · READY≠Visual PASS · 승인 전 Phase 6 금지
    status: completed
  - id: HC5-10
    content: P5 게이트 HOME_CLEAN_V1_READY_FOR_USER_REVIEW · Canon 승격 0 · commit 0
    status: completed
  - id: HC6-01
    content: P6 HomeCleanViewModel 타입만 · SDK 계약 수정 0
    status: completed
  - id: HC6-02
    content: P6 mapper · 저장소 필드 실측 후 identity 매핑 · 추측 API 0 · 네트워크 0
    status: completed
  - id: HC6-03
    content: P6 explicit fixture/live mode · /dev 기본 fixture · production fixture fail-closed · SSE 0
    status: completed
  - id: HC6-04
    content: P6 7 view states + 3 session states · 가짜 성공 0 · 게스트≠만료
    status: completed
  - id: HC6-05
    content: P6 CTA route inventory 선행 · 실href만 · 없으면 BLOCKED_CTA_ROUTE_MISSING
    status: completed
  - id: HC6-06
    content: P6 fixture/live 타입 분리 · HomeCleanView 1개 · production fixture 0
    status: completed
  - id: HC6-07
    content: P6 runtime 회귀 + OpenNext/Cloudflare 필수 검증 · / 는 HomePageClient · SKIP≠PASS
    status: completed
  - id: HC6-08
    content: P6 사용자 runtime 승인 · 자동 완료 금지 · 승인 전 Phase 7 금지
    status: completed
  - id: HC6-09
    content: P6 게이트 HOME_CLEAN_RUNTIME_READY_FOR_USER_REVIEW · OpenNext 증거 · / 불변 · commit 0
    status: pending
  - id: HC7-01
    content: P7 cutover diff plan · 두 파일만 · 변경 전 hash · production explicit live · 실행 0
    status: pending
  - id: HC7-02
    content: P7 사용자 cutover 승인 · Option A만 · 승인 전 / 수정 금지
    status: pending
  - id: HC7-03
    content: P7 / render + / exact bare atomic · production explicit live · fixture 0 · HC7-04 흡수
    status: pending
  - id: HC7-05
    content: P7 전체 사용자 route 회귀 · / 는 Clean chrome · 다른 탭은 구 AppShell
    status: pending
  - id: HC7-06
    content: P7 rollback drill · 두 파일 동시 · git reset/restore/checkout 금지 · 삭제 0
    status: pending
  - id: HC7-07
    content: P7 게이트 HOME_CLEAN_CUTOVER_READY_FOR_USER_APPROVAL · 레거시 파일 유지 · commit 0
    status: pending
  - id: HC8-01
    content: P8 import/usage audit · 삭제 0
    status: pending
  - id: HC8-02
    content: P8 deletion candidate 4묶음 보고 · HomeExperience는 H7 usage 0 전 삭제 금지
    status: pending
  - id: HC8-03
    content: P8 사용자 삭제 승인 · 묶음별 허가 · 자동 완료 금지
    status: pending
  - id: HC8-04
    content: P8 HomePageClient만 usage 0일 때 삭제 · HomeExperience 이 단계 금지
    status: pending
  - id: HC8-05
    content: P8 H7/HVR 삭제 후 usage 0 Home presentation · USER_TABS 0 · Clean 경로 유지
    status: pending
  - id: HC8-06
    content: P8 component.css Home/AVM 블록만 · web+admin build 필수 · 참조 남으면 중단
    status: pending
  - id: HC8-07
    content: P8 미사용 fixture/asset · 선택 자산·Brand Kit ready 삭제 금지
    status: pending
  - id: HC8-08
    content: P8 web+admin build·5탭 회귀 · Clean production 404 · cf SKIP≠PASS
    status: pending
  - id: HC8-09
    content: P8 게이트 HOME_LEGACY_REMOVAL_READY_FOR_APPROVAL · commit 0
    status: pending
  - id: HC9-01
    content: P9 최종 증거 선택 목록만 · Canon 쓰기 0 · *mockup* 제외
    status: pending
  - id: HC9-02
    content: P9 사용자 증거 승격 승인 · visual-locks는 포함 안 함 · 자동 완료 금지
    status: pending
  - id: HC9-03
    content: P9 승인 파일만 canon/evidence/home-clean-v1 · _tmp 전체 미러 금지
    status: pending
  - id: HC9-04
    content: P9 visual-lock proposal · JSON은 사용자 명시 승인 후에만
    status: pending
  - id: HC9-05
    content: P9 게이트 HOME_CLEAN_FINAL_EVIDENCE_PROMOTION_READY · 03 YAML 0 · commit 0
    status: pending
isProject: false
---

# HomeCleanV1 클린룸 재구축 실행 계획 (최종본)

이 파일이 HomeCleanV1의 **유일한 실행 Plan**이다. 저장소 ACTIVE File-Serial 8파일(`ai_profit_os_*.plan.md`)에 속하지 않는다. 03 UI 플랜은 별도 보호 스트림이다. 구초안(bare에서 `HomeChromeProvider` 유지, Canon 조기 저장, `git-auto-commit-push` 적용, 03 UI YAML에 todo 삽입, 증거 없이 `routes.ts` 수정, Phase 1을 dev+fast만으로 PASS, OpenNext를 Phase 2 절대 blocker로 둠, 완성 자산 재생성, 정적 `김` 프로필, USDT 표시 전면 금지, 5상태만 검증, 숨은 `HC1-R01`, Option B를 기본 후보로 남김, Sidebar/MobileNav 데이터 이중 소유)은 **폐기**한다. 본문과 frontmatter todos가 같은 순서·같은 ID다.

실행 규칙:

- frontmatter todos를 **위에서 아래로 한 개씩** 실행한다. 병렬 금지.
- 모든 todo 초기 상태 `pending`.
- FAIL 또는 blocker면 다음 todo 금지. Phase 건너뛰기 금지.
- 사용자 승인 todo는 에이전트가 완료하지 않는다.
- 한 todo = 한 결과. CSS 격리와 시각 구현을 한 todo에 섞지 않는다.
- `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` 순서·YAML·status 변경 0.
- 자동 commit/push 0. `--no-verify` 0. unrelated dirty staging 0.
- 다음 실행 후보: **HC4-02** (HC4-01 completed · Mobile AI · Desktop AI 정보 삭제 금지).

상태 추적 (bookkeeping · 구현 Allow와 별개):

- 전용 HomeClean 플랜의 status bookkeeping은 각 TODO의 구현 Allow 파일 범위와 별개인 실행 메타데이터다.
- 현재 실행 중인 TODO 하나에 한해서만 frontmatter `status`와 본문 `Status`를 동기화할 수 있다.
- TODO 시작 시 해당 TODO만 `in_progress`로 변경할 수 있다.
- 모든 PASS 조건 충족 후 해당 TODO만 `completed`로 변경할 수 있다.
- FAIL/BLOCKED이면 임의로 `completed` 처리하지 않는다.
- 다음 TODO와 다른 TODO의 status는 변경하지 않는다.
- status bookkeeping을 이유로 TODO 내용·순서·ID·Depends on을 변경하지 않는다.
- 기존 03 File-Serial 플랜에는 이 규칙을 적용하거나 수정하지 않는다.
- status 변경은 commit/push 권한을 의미하지 않는다.

---

## 1. 고정 아키텍처

1. 검수 URL은 exact `/dev/home-clean-v1`만. `startsWith("/dev")` 금지.
2. 이 경로에서 `AppShellRoot`는 **children only**. 기존 Home chrome DOM 0.
3. HomeCleanV1이 Header · Sidebar · Desktop Nav · Main · Right Rail · Mobile Bottom Nav · scroll owner · safe-area · responsive layout를 직접 소유한다.
4. `/` cutover 기본 구조는 Option A다. 실행은 Phase 7 사용자 승인 후, `/` render 전환과 `/` exact bare를 **한 단위**로만 한다.
5. Navigation 의미 소스 1개. Desktop/Mobile은 presentation variant만. 전체 Home tree 이중 렌더 금지.
6. 기존 Home / H7 / HVR presentation 복사 0. Phase 8 사용자 승인 전 삭제 0.
7. Phase 3~5는 fixture only. SDK 계약 수정 0. live는 Phase 6. `/` 연결은 Phase 7. production `/`는 명시적 `live`만. production fixture fallback 금지.
8. Money · Engine · Auth · API · DB · FX · `T.home` 의미 · `USER_TABS` 5탭 · `lux-fintech.ts` 색 의미는 열지 않는다. UI는 포맷/표시만. `KRW PRIMARY / USDT SECONDARY` 보존. HomeClean 화면 카피는 `home-clean-copy.ts` 전용(`HOME_CLEAN_COPY_CONFLICT_DECISION_APPROVED`). `T.home` overwrite 0.
9. Cursor는 Visual PASS를 선언하지 않는다. `READY_FOR_USER_REVIEW` ≠ Visual PASS. Phase 5 overlay는 승인 Visual Authority의 QA 증거일 뿐 새 권위가 아니다.
10. 이 작업 스트림은 File-Serial 03과 섞지 않는다. 03 첫 pending `trust-age-spotcheck`를 밀거나 H7을 재오픈하지 않는다.
11. Home 사진은 제작 완료다. ZIP 무결성=`HOME_VISUAL_ASSET_PACKAGE_INTEGRITY_PASS`. 레포 상태=`REPO_INSTALL_AND_USER_AUTHORITY_PENDING`. ZIP이 있으므로 `WAITING_FOR_USER_ASSET_FILES` 금지. 새 Robot/Product/Logo/Icon 생성·upscale·home-v2/v3 임의 대체 금지. 이 패치에서 설치·승인 자동 완료 금지.
12. Phase 3 진입 전 `HOME_CLEAN_VISUAL_AUTHORITY_APPROVED` 필수. 기존 Figma V4·H7·HVR·과거 overlay는 새 권위가 아니다.
13. 조건부 숨은 TODO 금지. 본문에만 있는 ID 금지. 조건 발생 시 중단 후 사용자 승인 revision.
14. 한 번에 TODO 한 개만 실행. FAIL/blocker면 다음 TODO 금지. 사용자 승인 TODO는 자동 완료 금지.

---

## 2. Bare Shell

현재 사실: root layout은 `apps/web/app/layout.tsx` 1개. `AppShellRoot`는 이미 `"use client"`. route group 이동은 Phase 1에서 하지 않는다.

```text
apps/web/app/layout.tsx          Server 유지
  DeviceTierApply                유지 (html[data-tier] · 기록 후 검토)
  ToastHost                      유지 (Home chrome 아님)
  AppShellRoot                   Client · usePathname()
    pathname ∈ SHELL_BARE_PATHS  →  children only
    그 외                        →  HomeChromeProvider + AppHeader + BottomNav5 + SiteFooter
```

Phase 1 `SHELL_BARE_PATHS`:

```text
["/dev/home-clean-v1"]
```

상수 파일: `packages/ui/components/shell/shell-bare-paths.ts`.

Phase 7 사용자 승인 후, `page.tsx` render 전환과 **같은 변경 단위**로만:

```text
["/dev/home-clean-v1", "/"]
```

`/dev/home-clean-v1`에서 DOM 0:

- `data-testid="app-header"`
- `data-testid="app-sidebar"`
- `data-testid="bottom-nav-5"`
- `data-testid="site-footer"`
- `data-testid="app-shell"`
- `HomeChromeProvider` / `HomeChromeContext`
- 기존 Home scan/avatar bridge

금지: CSS hide, `GuestChrome` overlay, HVR식 `:global(body:has)` + `display:none !important`, root layout을 Client로 승격, `headers()`로 전 page dynamic, 별도 Next/OpenNext 앱.

`verify:part5-shell-toast`는 `AppShellRoot.tsx` 소스에 `BottomNav5` · `SiteFooter` · `AppHeader` · `HomeChromeProvider` 문자열이 있는지만 본다. 기본 분기에 식별자를 유지하고, bare 분기는 호출하지 않는다.

---

## 3. CSS Isolation PASS 계약

CSS Module은 class hash 충돌만 줄인다. Global CSS · 상속 · 변수 · Preflight · `component.css` 무조건부 규칙은 막지 않는다.

진입 체인:

1. `apps/web/app/layout.tsx` → `./globals.css`
2. `apps/web/app/globals.css` → `@aipo/ui/tokens/lux-theme.css`
3. `packages/ui/tokens/lux-theme.css`가 `component.css` · `motion.css` · responsive 3파일을 **직접** import
4. 이 CSS는 route chunk가 아니라 root Global CSS

`packages/ui` CSS Module 전례 0. `apps/web` HVR에만 `HomeVisualRebuild.module.css` 전례가 있다. HVR 방식은 반례이며 복사 금지.

`apps/web/next.config.ts` `transpilePackages: ["@aipo/ui", "@aipo/sdk", "@aipo/schemas"]`.

Phase 1 probe 검사 노드: root(`[data-ui-surface="home-clean-v1"]`) · `main` · `header` · `nav` · `section` · card probe · `h1` · `p` · `button` · `a` · `img`.

검사 범위: `.home-*` · `[data-home-avm]` · `body:has(...)` · `html` · `body` · `*` · tag/attribute/pseudo · `:root` · inheritance · custom property · Preflight · cascade layer · import order · `!important` · global transition/animation · focus · `component.css` unconditional rule.

분류:

- **허용:** Tailwind Preflight 의도 reset, Pretendard, 승인 Lux token(`--color-lux-*`), `html/body` 기본 배경·본문 색, 접근성용 공통 focus
- **기록 후 검토:** `DeviceTierApply`의 `html[data-tier]`, responsive 변수, 전역 motion, 상속 line-height / `html[data-font-scale]`
- **금지:** Home/AVM/Founder correction/H7/HVR selector, 기존 Home geometry/`!important`, 새 UI를 예상 밖 변경하는 `component.css` declaration, `.app-header` / `.app-sidebar` / `.app-header__brand` / `.app-header__mark`, 출처 불명 computed style

최종 PASS:

```text
HomeClean 요소에 적용되는 예상하지 않은 component.css declaration = 0
```

알려진 전역 누수: `.app-header__brand { display: none }` (`packages/ui/tokens/component.css`). Clean은 이 class를 쓰지 않는다. 쓰이면 FAIL. Phase 1~7에서 `component.css` 수정 0.

전략: CSS Module + surface `--hc-*`. Tailwind `lg:`(1280)는 HomeClean geometry 소유자가 아니다. HomeClean breakpoint 소유: 768 / 1024 / 1440 / 1920 / 3840. JS `matchMedia` 0. 신규 `!important` 0. debug attr는 `data-ui-surface="home-clean-v1"`만.

---

## 4. Navigation 단일 소유

```text
apps/web/routes.ts USER_TABS
        ↓ props only (packages/ui는 apps/web import 금지)
HomeCleanNavigationModel
        ↓ HomeCleanNavItem[]  (label, href, active, iconId)
   ├─ HomeCleanSidebar      Desktop presentation
   └─ HomeCleanMobileNav    Mobile presentation
```

- label/href source = `USER_TABS` 1개
- icon mapping = `home-clean-nav-icons.tsx` 1개 (`USER_TABS.icon` 이모지는 렌더에 쓰지 않음. 현 `BottomNav5`와 동일)
- active = 모델 1개 (`usePathname` + href)
- duplicated business meaning 0

두 variant 이유: Desktop은 세로 rail+브랜드+고객센터, Mobile은 하단 고정 5탭. 한 visual markup에 억지로 넣으면 구조 또는 접근성이 깨진다. 목표는 단일 의미이지 무조건 단일 markup이 아니다.

접근성: 보이는 variant만 `<nav aria-label={T.home.sidebar.navAria}>`. 숨김 variant는 `hidden` + `inert` + `aria-hidden="true"` + 포커스 제외. 390과 1440에서 “주요 메뉴” landmark = 1. 두 번 읽히면 FAIL.

---

## 5. Evidence

Phase 0~8 미승인 실험 증거는 여기만:

```text
_tmp_home_clean/v1/baseline/
_tmp_home_clean/v1/phase1/
_tmp_home_clean/v1/phase2/
_tmp_home_clean/v1/phase25/
_tmp_home_clean/v1/phase3/
_tmp_home_clean/v1/phase4/
_tmp_home_clean/v1/phase5/
_tmp_home_clean/v1/phase6/
_tmp_home_clean/v1/phase7/
_tmp_home_clean/v1/phase8/
_tmp_home_clean/v1/phase9/
```

사용자 Visual 승인 전까지 금지: `packages/ui/canon/evidence/home-clean-v1/`.

`verify:mockup-governance`가 워크스페이스를 walk하므로 파일명 `*mockup*` · `*metal-hex*` · `docs/mockups/**` · `assets/ai-profit-os-*.png` 금지.

현재 `.gitignore`는 `_tmp*.md`만 있다. HC0-01에서 `_tmp_home_clean/` 1줄을 추가한다. 이 디렉터리는 commit하지 않는다.

Phase 9에서 사용자가 고른 최종 증거만 Canon 승격 후보. `visual-locks.v1.json`은 HC9-04 별도 승인.

---

## 6. Commit / push

모든 Phase:

- 자동 commit 0 · 자동 push 0 · `--no-verify` 0
- unrelated dirty staging 0 (`_tmp_figma_cmp`, 기존 Home 실험, rules, 03 플랜)
- 사용자 승인 없이 commit 0 · 사용자 지시 없이 push 0
- 게이트 완료 후 결과만 보고

`git-auto-commit-push.mdc`가 슬라이스 T0 commit을 강제하더라도 이 스트림에서는 실행하지 않고 중단한다.

```text
BLOCKED_COMMIT_POLICY_CONFLICT
```

---

## 7. File-Serial 무변경

대상: `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md`

실측: H7(`redesign-r1-home-implementation`) `completed`. 첫 pending = `trust-age-spotcheck`. 다음 = `redesign-r1-home-certification`.

금지: HomeClean todo를 `trust-age-spotcheck` 앞에 삽입, H7 재오픈, pending 순서 변경, 03 todo status 변경, HomeClean 때문에 `pnpm cursor:sync-plans`로 03 YAML을 다시 씀.

File-Serial이 HC0-01을 막는다고 판단되면 03을 편집하지 말고 `BLOCKED_FILE_SERIAL_PLAN_CHANGE_REQUIRED`를 보고한다.

---

## 8. `routes.ts` — 기본 변화 0

실측 (`tooling/verify/ia-tabs.cjs`): `USER_TABS` 5개와 `/` `/profits` `/trades` `/wallet` `/me`의 `page.tsx`만 검사. dev route registry 요구 0.

실측 (`tooling/verify/part5-shell-toast.cjs`): nested lock은 `/me/benefits` · `/me/guide/partners` · `/me/guide/market-weekly`만.

`/dev/h7-home-preview` · `/dev/home-visual-rebuild`가 `USER_NESTED_ROUTES`에 있는 것은 관례다. `/dev/home-clean-v1`을 요구하는 verify는 없다.

Next App Router는 `apps/web/app/dev/home-clean-v1/page.tsx`만으로 라우트를 만든다.

`/dev/home-clean-v1`을 `USER_TABS`에 넣으면 5탭 lock FAIL. 금지.

기본값: `apps/web/routes.ts` 변화 0.

`routes.ts` 수정이 증명되면 숨은 TODO를 만들지 말고 `BLOCKED_ROUTES_TS_REQUIRED`로 중단한다. 사용자 승인 후 정식 플랜 revision에서만 frontmatter+본문에 동시에 추가한다. 본문에만 `HC1-R01` 같은 ID를 두지 않는다.

---

## 9. Viewport 정책

Component loop: `390×693` · `768×1024` · `1440×1080`

Shell/Grid 변경: `320×568` · `390×693` · `768×1024` · `1440×1080` · `3840×2160`

Final matrix (Phase 5만, 생략 금지):

- Mobile: `320×568` `360×640` `375×667` `390×693` `412×915` `430×932` `480×960`
- Landscape/Tablet: `568×320` `667×375` `844×390` `932×430` `600×960` `768×1024` `820×1180` `1024×1366`
- Desktop/Large: `1024×768` `1280×720` `1366×768` `1440×900` `1440×1080` `1536×864` `1920×1080` `2560×1440` `3440×1440` `3840×2160` `5120×1440`

매 컴포넌트 full matrix 금지. Phase 5 full matrix 생략 금지. Playwright workers=1. `pnpm dev:web`과 production build 동시 금지.

---

## 10. 디렉터리

```text
packages/ui/components/home-clean-v1/
  index.ts
  HomeCleanIsolationProbe.tsx
  HomeCleanIsolationProbe.module.css
  HomeCleanView.tsx
  HomeCleanShell.tsx
  HomeCleanHeader.tsx
  HomeCleanSidebar.tsx
  HomeCleanMobileNav.tsx
  HomeCleanNavigationModel.ts
  home-clean-nav-icons.tsx
  HomeCleanAiSummary.tsx
  HomeCleanAsset.tsx
  HomeCleanDiscovery.tsx
  HomeCleanProducts.tsx
  HomeCleanRightRail.tsx
  home-clean.types.ts
  home-clean-assets.ts
  home-clean-assets.manifest.json
  HomeCleanTokens.module.css
  HomeCleanShell.module.css
  HomeCleanNav.module.css
  HomeCleanCards.module.css
  HomeCleanResponsive.module.css

packages/ui/components/shell/shell-bare-paths.ts
packages/ui/components/shell/AppShellRoot.tsx
packages/ui/package.json                    # exports "./components/home-clean-v1" 1키

apps/web/app/dev/home-clean-v1/
  page.tsx
  HomeCleanFixture.ts
  playwright-home-clean-isolation.mjs
  playwright-home-clean-shell.mjs
  playwright-home-clean-desktop.mjs
  playwright-home-clean-responsive.mjs
  playwright-home-clean-qa.mjs

apps/web/app/home-clean/                    # Phase 6
  HomeCleanDataAdapter.tsx
  mapHomeReadModelToCleanViewModel.ts

apps/web/app/page.tsx                       # HC7-03만
apps/web/public/assets/home-clean-v1/       # HC25 승인 후 설치. 이 패치에서 설치 0
```

금지: `packages/ui/components/home/*`에 Clean 추가, `HOME_V3_ASSET` import, HVR CSS/마크업 복사.

Phase 0 캡처 러너는 `apps/web`에 두지 않는다. `_tmp_home_clean/v1/baseline/playwright-baseline.mjs`만.

---

## 11. 실제 명령 (발명 금지)

| 목적 | 명령 |
|---|---|
| T0 | `pnpm verify:gate:fast` |
| T1 (push 하지 않음) | `pnpm verify:gate:push` |
| T2 CI | `pnpm verify:gate` |
| 5탭 | `pnpm verify:ia-tabs` |
| AppShell 소스 lock | `pnpm verify:part5-shell-toast` |
| admin-in-web 0 | `pnpm verify:no-admin-in-web` |
| IT 용어 | `pnpm verify:no-it-jargon` |
| mockup | `pnpm verify:mockup-governance` |
| Canon | `pnpm verify:canon-surfaces` |
| Brand | `pnpm verify:brand-asset-provenance` · `pnpm verify:brand-assets` |
| Home | `pnpm verify:home-state-truth` · `pnpm verify:home-live-wire` · `pnpm verify:home-principal-slots` |
| CTA | `pnpm verify:cta-earn-profit` |
| Consumer Next | `pnpm --filter @aipo/web build` |
| Consumer start | `pnpm --filter @aipo/web start` |
| T2 Next web+admin | `pnpm verify:next-build` |
| Consumer OpenNext | `pnpm --filter @aipo/web build:cf` |
| T2 OpenNext | `pnpm verify:opennext-build` |
| web dev | `pnpm dev:web` |
| RAM | `pnpm lowspec:status` |

사실:

- `apps/web` `build` = `next build`
- `build:cf` = `opennextjs-cloudflare build --config=../../infra/web/wrangler.toml`
- `tooling/verify/opennext-build.cjs`는 **win32에서 exit 0 SKIP**. SKIP ≠ PASS. 기록: `BLOCKED_CLOUDFLARE_BUILD_VERIFICATION`
- 로컬 OOM: `BLOCKED_LOCAL_OOM` + `BLOCKED_PRODUCTION_BUILD_VERIFICATION`. OOM을 PASS로 위장 금지
- 해소: WSL의 `pnpm --filter @aipo/web build:cf` 또는 사용자가 지시한 CI `pnpm verify:gate`의 `verify:opennext-build` 로그만. 에이전트 임의 push 0
- Phase 1 필수 빌드 = consumer `pnpm --filter @aipo/web build` + production에서 `/dev/home-clean-v1` 404. OpenNext/Cloudflare는 Phase 2 진입 절대 blocker가 아니다
- OpenNext/Cloudflare는 **늦어도 Phase 6 runtime gate(HC6-07/HC6-09) 또는 Phase 7 cutover 전** 필수. 배포 경로 검증 없이 cutover 금지
- 저사양에서 Cloudflare build가 불가능하다는 이유만으로 Phase 1 static Shell 전체를 조기 중단하지 않는다. cutover 전에는 반드시 해결한다
- admin 빌드는 Phase 8 CSS 삭제 시 필수
- `pnpm verify:gate:fast`는 `packages/ui/` · `apps/web/` 변경 시 `no-it-jargon` · `mockup-governance` · `canon-surfaces`를 domain step으로 돌린다
- rewrite는 `/ads`, `/api/v1/:path*`만. `/dev/home-clean-v1` 영향 0

---

## 12. 레포 실측 (오차 방지)

- `component.css` 3326줄. Slice 주석은 Slice 1·2·3만. 이후 `Home V2` · `Founder correction V2` · `Home AVM v3`. “Slice 4/5” 라벨 없음
- Home `!important` 9곳, 전부 Home/AVM 계열
- named BP: `packages/ui/tokens/breakpoints.ts` `md=768` `lg=1280` `xl=1920` `2xl=3840`. `CONTENT_RAIL.maxWidthPx=1680`. 1600은 `VIEWPORT_TEST_POINTS.desktop`일 뿐 named BP 아님
- `HomePageClient` fetch: `@aipo/sdk/home-read-model` + `@aipo/sdk/user-feed` + `@aipo/sdk/growth`. `wallet` / `peotteok` / `execution-stream` import 0
- `HomeHero` 파일 0. `HOME_V2_ASSET` 런타임 import 0. 현재 Home/HVR는 `HOME_V3_ASSET` / `HVR_ASSET`
- `home-v3/` Brand provenance manifest 0
- `BrandMark`는 `✦`. Home 런타임 경로에 없음
- `body:has([data-home-avm="v3"])`는 attr 있을 때만. `body:not(:has(...)) .home-right-rail`은 attr 없고 class만 있으면 발동
- `@layer`는 `packages/ui/tokens`에 0
- Admin `apps/admin/app/globals.css`도 `lux-theme.css` import → `component.css`는 web+admin 전역
- `visual-locks.v1.json` `locks: []`
- `T.home.greeting.hello` / `helloNamed`에 `👋`, `T.home.aiSummary.foundReady`에 `✨`. `T.home` 임의 수정 0. HomeClean 렌더는 `home-clean-copy.ts` (`HOME_CLEAN_COPY_CONFLICT_DECISION_APPROVED`). 구 `VISUAL_FUNCTIONAL_CONTRACT_CONFLICT`는 이 결정으로 해소.
- `generateViewport` / `viewport-fit=cover` 없음. Phase 2에서 root viewport 변경 금지. `env(..., 0px)`만
- page.tsx 다수, route group 0. `verify:ia-tabs`는 `/`를 `apps/web/app/page.tsx`로 고정

재사용 가능 (presentation 아님): `HomeReadModelResponse`, `HomeViewState`, `HomeSessionStatus`, `OpportunityCardModel`, `DayPulseModel`, `fetchHomeReadModel`, `fetchOpportunityFeed`, `fetchDayPulse`, `fetchGrowthPublicSurface`, `toOpportunityCardModel`, `hasUserSessionCookie`, `T.home.*`(의미 불변 · HomeClean 충돌 카피는 사용하지 않음), `home-clean-copy.ts`(HomeClean presentation only), `T.brand.consumer`, `USER_TABS` label/href, Canon `home-visual-v2.wire.json`의 `factSurface` / `forbidden` / `navLabels` / `navHrefs` / `primaryCta`.

재사용 금지: `HomeExperience` 및 `components/home/*` UI, `useHomeMobileSurface`, `HomeChromeContext` scan/avatar, HVR 아이콘·CSS Module, `.home-*`, AVM attr.

기존 Brand Kit / home-v2 / home-v3 / AVM 번개는 **대체 후보가 아니다.** 완성 자산 계약은 §12A. 레거시 경로는 HC0-04에서 “사용하지 않음”으로만 기록한다.

---

## 12A. 확정 자산팩 계약

이 ZIP은 새 생성 후보가 아니다. Phase 0·Phase 2.5의 자산 SSOT 후보다. 이 패치에서 저장소 설치·복사 0. 사용자 승인·설치를 Cursor가 자동 완료하지 않는다. ZIP이 존재하므로 `WAITING_FOR_USER_ASSET_FILES`를 선언하지 않는다.

| 항목 | 값 |
|---|---|
| 사용자 표기 파일명 | `peotteok-homeclean-assets-final(1).zip` |
| 디스크 실측 경로 | `c:\Users\PC\Desktop\peotteok-homeclean-assets-final.zip` |
| ZIP 바이트 | 16170061 |
| ZIP SHA-256 | `d4fdb977f2e6a51d92f22ccdc9e2a3caf806858771cfb978523a843291a22d56` |
| ZIP 무결성 | `HOME_VISUAL_ASSET_PACKAGE_INTEGRITY_PASS` |
| 레포/승인 | `REPO_INSTALL_AND_USER_AUTHORITY_PENDING` |
| 워크스페이스 설치 | `apps/web/public/assets/home-clean-v1/` = 아직 없음 |

구성: Robot PNG 6 · Product 투명 PNG 3 · `brand-symbol.svg` · `metric-search.svg` · `metric-opportunity.svg` · `metric-time.svg` · `avatar-fallback.svg` · `BrandLockup.reference.tsx` · `DynamicUserIdentity.reference.tsx` · `Identity.reference.module.css` · `asset-manifest.json` · `SHA256SUMS.txt` · Robot/Product contact sheet.

금지: 새 Robot/Product/Logo/Icon 생성, AI upscale로 새 원본, home-v2/v3 임의 대체, Brand Kit만으로 결정, 완성본 재경쟁.

### ZIP 내부 실측 (생성 금지 · 재경쟁 금지)

경로 = ZIP 루트 `peotteok-homeclean-assets-final/` 이하. sha256 = 압축 해제 바이트. PNG alpha = IHDR color type 실측(`6`=RGBA 채널, `2`=불투명 RGB).

| ZIP 경로 | 용도 | 형식 | bytes | WxH / viewBox | alpha | sha256 |
|---|---|---|---|---|---|---|
| raster/robots/robot-master.png | 퍼뜩 AI 기준 identity · 일반 안내·빈 상태 | PNG | 1488274 | 1024×1536 | RGBA 투명 | 8e0c0ae6d2ea8b8f0355b381e56c4e533184326eed9f2dbd4f26de94a5210cb6 |
| raster/robots/robot-ai-summary-desktop.png | Desktop AI Summary | PNG | 1437182 | 1536×1024 | RGBA 투명 | 2210d0d425bae39412f32e75f4be332dcc700cab2a1c92a08254de30b2fe57de |
| raster/robots/robot-ai-summary-mobile.png | Mobile AI Summary | PNG | 1606217 | 1024×1536 | RGBA 투명 | b4fb1ad0090f1ffa8b3cece51929eb0da0aa6823356432e261bc1b66b85a524b |
| raster/robots/robot-discovery-chart.png | Discovery/기회 차트 | PNG | 1461234 | 1024×1536 | RGBA 투명 | 3962fd9b08d8693f34732c5a6d6bc313c93d88c53d842190d53680eb7e90e6b7 |
| raster/robots/robot-sidebar-open-hands.png | Desktop Sidebar AI | PNG | 1360675 | 1024×1536 | RGBA 투명 | 83a0bc1793c07698e4366c47974daca2b98402b5c32a92d763b7ac2c3bb6e10f |
| raster/robots/robot-avatar-ai-only.png | 퍼뜩 AI 전용 아바타. 사용자 프로필 금지 | PNG | 1388440 | 1254×1254 | RGB 불투명 | aed6a190abdc800ddd997cc6da68a91e75173b51e6ddb1500a6fe1551d678ea0 |
| raster/products/product-watch.png | 시계 상품 visual fixture | PNG | 1229675 | 1254×1254 | RGBA 투명 | 1c01cd1f6d01a67f13602a71bf91577e3f477151cb55a49755a74708d3abf1b6 |
| raster/products/product-collectible-card.png | 카드 상품 visual fixture | PNG | 1672093 | 1254×1254 | RGBA 투명 | 3481bfd91a878bda00b05ef41f618939499ffcffabbd4ffea031031b66197a66 |
| raster/products/product-handbag.png | 가방 상품 visual fixture | PNG | 1950267 | 1254×1254 | RGBA 투명 | 2f13d42f93e01532e4d8a777b9c87580c22097087e7ed82ddfc8d6c4225e4660 |
| vector/brand-symbol.svg | Logo symbol only. 한글 wordmark 아님 | SVG | 911 | viewBox 0 0 64 64 | 벡터 | 07b34a5412cf7881bf1266479fc155f86d2f6f80fe095916ff17581ca3d58996 |
| vector/metric-search.svg | Search icon | SVG | 422 | viewBox 0 0 64 64 | 벡터 | b6683d961ed3ec4690f0fa55078420d4dc289e8d8a6716ec3f23a689574bc6bf |
| vector/metric-opportunity.svg | Opportunity/chart icon | SVG | 709 | viewBox 0 0 64 64 | 벡터 | 16fee056efe9703d4c5ffd6e300c3430d10a68e6273956badc346befd000304e |
| vector/metric-time.svg | Time icon | SVG | 442 | viewBox 0 0 64 64 | 벡터 | 4711f0696e3adeea63f2a9415af3e5e8d38fbceeafeb37b250bf7ee5b179310d |
| vector/avatar-fallback.svg | guest/loading/정보부재 only | SVG | 787 | viewBox 0 0 128 128 | 벡터 | 2ea3109905dc32f2b2cb17c177c0fa1493f5e459f027e01f86f12622bc7a2da9 |
| vector/BrandLockup.reference.tsx | 참고 구현. production 복사 금지 | TSX | 533 | — | — | 07155a4590585bb2d3f4ab9fe2320562cc3c1dfb1c359982245648dc1a6f6d67 |
| vector/DynamicUserIdentity.reference.tsx | 참고 구현. production 복사 금지 | TSX | 1844 | — | — | bedb8f5e971d219fa1f07b8e43c3fd3742b86ccbb70fac311cbf154fb93dad15 |
| vector/Identity.reference.module.css | 참고 CSS. production 복사 금지 | CSS | 1121 | — | — | d82722ba1dec5aa8672e8976e25ac5d60221a36720c0a083aa81c250b2fee08a |
| asset-manifest.json | ZIP 패키지 manifest | JSON | 2763 | — | — | 01e11815f54de32196a669f9b762f9798b7744c61e969a3ef6a4c71efe897e54 |
| SHA256SUMS.txt | 내부 파일 해시 표 | TXT | 2077 | — | — | 79e926aee417d4333db616abfca3fa35a8da05d39d3e205f813b3545c47639bd |
| README.md | 전달 설명. 예시 URL은 설치 경로 아님 | MD | 3751 | — | — | e6921e09faa8e5b76e4c91208658cb7fa906820ea8709b65fa6ed694ef3d49a2 |
| preview/robots-contact-sheet.png | 검수용. 런타임·Visual Authority 금지 | PNG | 1473299 | 1080×760 | RGB 불투명 16bit | 408ac99c451380c3793075d6c7d72e2c81d65a7de806aa01513cc8f7010220a6 |
| preview/products-contact-sheet.png | 검수용. 런타임·Visual Authority 금지 | PNG | 1167756 | 1230×430 | RGB 불투명 16bit | 9881804306c161db2c91141301117d6b1a42e24d6fde240be195cc643a17b4ab |

`asset-manifest.json`의 `assets[]`에는 `avatar-fallback.svg`가 없다. 최종 HomeClean manifest에는 **포함**한다(용도=guest/loading/정보부재). 제외하려면 사용자 승인 + 제외 사유를 기록한다.

`*.reference.tsx` / `*.reference.module.css`는 참고 구현이다. 저장소 viewer/auth 타입 · Next 이미지 정책 · CSS Module 관례를 확인하기 전에 production 파일로 복사하지 않는다.

### 승인 후 설치 매핑 계획 (이 패치에서 설치 0)

설치 루트: `apps/web/public/assets/home-clean-v1/`  
public URL 루트: `/assets/home-clean-v1/`

ZIP README 예시 `/assets/home/robots/...` 는 **최종 설치 경로가 아니다. 그대로 복사 금지.**

| ZIP 경로 | 설치 경로 | public URL |
|---|---|---|
| raster/robots/robot-master.png | `.../home-clean-v1/robots/robot-master.png` | `/assets/home-clean-v1/robots/robot-master.png` |
| raster/robots/robot-ai-summary-desktop.png | `.../home-clean-v1/robots/robot-ai-summary-desktop.png` | `/assets/home-clean-v1/robots/robot-ai-summary-desktop.png` |
| raster/robots/robot-ai-summary-mobile.png | `.../home-clean-v1/robots/robot-ai-summary-mobile.png` | `/assets/home-clean-v1/robots/robot-ai-summary-mobile.png` |
| raster/robots/robot-discovery-chart.png | `.../home-clean-v1/robots/robot-discovery-chart.png` | `/assets/home-clean-v1/robots/robot-discovery-chart.png` |
| raster/robots/robot-sidebar-open-hands.png | `.../home-clean-v1/robots/robot-sidebar-open-hands.png` | `/assets/home-clean-v1/robots/robot-sidebar-open-hands.png` |
| raster/robots/robot-avatar-ai-only.png | `.../home-clean-v1/robots/robot-avatar-ai-only.png` | `/assets/home-clean-v1/robots/robot-avatar-ai-only.png` |
| raster/products/product-watch.png | `.../home-clean-v1/products/product-watch.png` | `/assets/home-clean-v1/products/product-watch.png` |
| raster/products/product-collectible-card.png | `.../home-clean-v1/products/product-collectible-card.png` | `/assets/home-clean-v1/products/product-collectible-card.png` |
| raster/products/product-handbag.png | `.../home-clean-v1/products/product-handbag.png` | `/assets/home-clean-v1/products/product-handbag.png` |
| vector/brand-symbol.svg | `.../home-clean-v1/brand-symbol.svg` | `/assets/home-clean-v1/brand-symbol.svg` |
| vector/metric-search.svg | `.../home-clean-v1/metric-search.svg` | `/assets/home-clean-v1/metric-search.svg` |
| vector/metric-opportunity.svg | `.../home-clean-v1/metric-opportunity.svg` | `/assets/home-clean-v1/metric-opportunity.svg` |
| vector/metric-time.svg | `.../home-clean-v1/metric-time.svg` | `/assets/home-clean-v1/metric-time.svg` |
| vector/avatar-fallback.svg | `.../home-clean-v1/avatar-fallback.svg` | `/assets/home-clean-v1/avatar-fallback.svg` |

설치하지 않음: `README.md` · `SHA256SUMS.txt` · `asset-manifest.json`(원본은 증거, HomeClean manifest는 별도 작성) · `*.reference.*` · `preview/**`.

Robot/Product 렌더: `object-fit: contain` · 비율 왜곡 금지 · 임의 crop 금지.

상품 이미지: Phase 3~5 visual fixture는 승인 Product PNG 사용 가능. Phase 6 live는 서버 `assetImageUrl` 또는 확인된 first-party 우선. 제작 이미지를 listing 증거처럼 표시 금지. live 없을 때 제작 이미지를 production fallback으로 쓸지는 별도 사용자 승인.

---

## 12B. Logo · Robot · Viewer identity

### Logo

- SVG에는 승인 `brand-symbol.svg`만. 브랜드 이름은 React/HTML 실제 텍스트 `퍼뜩`. Pretendard.
- 한글 `퍼뜩`을 vector path로 만들지 않음. 이상한 한글 wordmark SVG 금지.
- 사용자 승인 전 기존 공식 logo overwrite 금지.

### Robot

- Robot = 퍼뜩 AI identity. 로그인 사용자 identity로 사용 금지.
- 위치별 승인 variant만. 임의 crop·비율 왜곡 금지. `object-fit: contain`.

### 로그인 사용자 identity

정적 `김` / `김퍼뜩` 프로필 금지. Robot을 사용자 avatar로 사용 금지.

표시 이름 resolver 우선순위:

1. `nickname`
2. `displayName`
3. `name`
4. `email`의 `@` 앞부분
5. 최종 fallback `"사용자"`

Avatar:

1. 실제 `avatarUrl`이 있으면 사진
2. 없으면 resolve된 displayName의 첫 Unicode 문자(NFC 후)를 원형 avatar
3. 표시 이름과 initial은 같은 displayName
4. `avatar-fallback.svg`는 guest/loading/사용자 정보 부재만

저장소 실측(추측 API 계약 아님 · HC25-01/HC6-02에서 재확인 후 adapter 매핑):

- `schemas/user-profile.v1.json`에 `displayName` · `email` 존재. `nickname` · `name` · `avatarUrl`은 이 스키마에 없음
- `HomeReadModelResponse`에 viewer identity 필드 없음
- 없는 필드 이름을 API에 발명하지 않음. 없으면 해당 resolver 단계를 건너뛰고 다음 확인 필드로
- HVR fixture `김퍼뜩`은 HomeClean live/fixture identity로 재사용 금지

---

## 12C. Visual Authority

Phase 3 전 게이트: `HOME_CLEAN_VISUAL_AUTHORITY_APPROVED` (HC25-05 · **completed**).

확인 대상: 새 Desktop 기준 이미지, 새 Mobile 기준 이미지, 각 해상도, 최신 HomeClean 목표 여부, PC/Mobile 정보 구조, 승인 Logo/Robot/Product/Icon 대응, 유지할 핵심 영역, 반응형으로 해석할 부분, 픽셀 복사가 아니라 구조·비율·정보 우선순위로 보존할 부분.

증거: `_tmp_home_clean/v1/phase25/VISUAL_AUTHORITY.md`. 실측 Desktop `1448×1086` · Mobile `887×1774`. 검수 viewport는 `1440×1080` / `390×693`. 이미지 원본은 레포에 복사하지 않음.

권위가 **아닌** 것: 기존 실패 Figma V4, H7, HVR, 과거 overlay, zip `preview/*-contact-sheet.png`.

Phase 5 overlay는 승인 Visual Authority와 비교하는 QA 증거일 뿐 새 권위를 만들지 않는다.

---

## 12D. View state · Session

`HomeViewState` 7개 유지: `loading` · `ready_empty` · `ready_data` · `stale` · `recoverable_error` · `blocked` · `unauthorized`.

실측: 서버 타입 `packages/sdk/src/home-read-model/types.ts`는 6개(`loading` 제외). `loading`은 클라이언트 로컬(`HomeClientViewState`). 7개를 모두 표시·검증한다. 새 enum 발명 금지.

`HomeSessionStatus` 3개 유지: `guest` · `authenticated` · `expired`.

HC6-04 PASS = 7 view + 3 session. “5상태” 폐기.

- guest와 expired를 동일 처리 금지
- ready_empty를 성공 데이터 위장 금지
- stale에는 실제 `asOf` 기반 정보
- recoverable_error에는 재시도 가능 상태
- blocked 사유 추측 금지
- unauthorized에는 인증 흐름
- 누락 숫자를 0으로 표시 금지
- fake success 금지

---

## 12E. Money · 원금 · 수익 · 통화

숫자 진실 소유권: 잔액=Ledger/서버 · 매칭 필요 원금=Engine/read model · 예상 수익=Engine/read model · 실제 수익=Ledger/정산 · 환율=FX snapshot/server · 기회 개수=feed/read model · 진행 상태=Engine/거래 상태.

HomeClean 라벨(`HOME_CLEAN_COPY_CONFLICT_DECISION_APPROVED`): `내 자산`=섹션 제목. 실제 사용 가능 잔액 필드=`내 잔액`. Ledger balance를 전체 자산으로 위장 금지. `필요 원금`=required principal 실값만. 없으면 `—`/`확인 중`/`정보 없음`.

UI는 계산하지 않고 포맷/표시만.

금지: client FX/principal/expected profit 계산, 목업 숫자를 runtime 값으로 사용, 누락 값 0 위조, 가짜 KRW/USDT 환산, 가짜 평균 수익, 가짜 update time, 실측 전 `ledgerTotal` 의미 확정, 실측 전 COUNT 또는 Money 단정.

계약: `KRW PRIMARY / USDT SECONDARY` (`governance/global-product/parser-implementation-contract.v1.md`). USDT 표시 전면 금지는 폐기.

누락 값 안전 표시: `—` · `확인 중` · `정보 없음`.

JPY/KRW runtime = SAFE STOP. 이 플랜에서 구현/변경 금지.

상품별 매칭 필요 원금 runtime이 없으면 가짜 금액 금지. absent 표시 + 후속 blocker 기록.

실측 힌트(확정 아님): `growth.ledgerTotal` / top-level `ledgerTotal`은 서버 derived. Home 카드 의미는 HC6-02에서 재실측. Phase 3 fixture는 문자열만.

---

## 12F. Fixture / live 분리

Phase 3~5: `/dev/home-clean-v1` 전용 visual fixture만. production runtime 값이 아님을 코드 계약으로 분리. live 복사 위장 금지. production `/`에서 선택 불가. QA에 fixture 이름·상태 기록.

Phase 6: 명시적 mode/타입 분리.

- dev route 기본값: `fixture`
- production `/` 기본값: 금지. 반드시 명시적 `live`
- production에서 fixture mode 선택 시 fail-closed
- production fixture fallback 금지
- `HomeCleanView` presentation 1개. fixture/live 전용 둘째 Home tree 금지

Phase 7: `/`는 live adapter 명시 호출. `/dev/home-clean-v1`은 fixture 검수 유지. production `/` fixture 데이터 0. `NO_FAKE_RUNTIME_DATA`. session/auth 의미 유지. read model 실패를 fixture 성공으로 대체 금지.

---

## 12G. CTA route inventory

HC6-05 핸들러 구현 전, 같은 TODO의 선행 조건으로 각 경로를 실측한다. 없는 경로 신설·임의 대체 금지. 없으면 `BLOCKED_CTA_ROUTE_MISSING`.

확인할 경로: `/profits` · `/wallet/deposit` · `/me/inbox` · `/me` · `/me/support` · `T.home.hero.ctaHref`.

각 항목: 실제 `page.tsx` · `routes.ts`/registry · 인증 필요 · guest 동작 · CTA 의미=목적지 · stub/no-op 여부 · 기존 verifier.

패치 시점 힌트(확정 아님 · HC6-05 재실측): `apps/web/app/profits/page.tsx` · `wallet/deposit/page.tsx` · `me/inbox/page.tsx` · `me/page.tsx` · `me/support/page.tsx` 존재. 존재 ≠ 의미 검증 PASS.

CTA는 실제 `href` 또는 검증된 handler만. 빈 `onClick` · no-op · 가짜 성공 버튼 금지.

---

## 12H. Safe rollback

금지 명령: `git reset` · `git restore` · `git checkout --` · stash/pop.

각 TODO rollback = 그 TODO Allow 파일만. 수동 patch 또는 안전한 `apply_patch`. 다른 dirty 덮어쓰기 금지. commit/push 없이. rollback 후 diff·route 재검증.

Phase 7 atomic cutover/rollback drill:

- 변경 대상 정확히 두 파일: `apps/web/app/page.tsx` · `packages/ui/components/shell/shell-bare-paths.ts`
- 변경 전 내용/hash 기록
- 두 파일을 한 변경 단위로 적용
- 한 파일만 바뀐 중간 상태를 완료로 보고 금지
- rollback도 두 파일을 같은 단위로 복원

---

## 12I. HOME_CLEAN_COPY_CONFLICT_DECISION_APPROVED

Founder 결정. 증거: `_tmp_home_clean/v1/phase25/COPY_CONFLICT_DECISION.md`. 실행 카피: `packages/ui/components/home-clean-v1/home-clean-copy.ts`.

원칙: `T.home` overwrite 0. HomeClean 전용 presentation copy. 03 플랜·legacy Home copy·다른 페이지 변경 0. `USER_TABS` 변경 0. href 변경 0. Money/Engine/Auth/API 변경 0.

확정 카피: `안녕하세요` · scanning/loading `퍼뜩 AI가 수익 기회를 찾고 있어요` · ready_data `퍼뜩 AI가 발견한 기회` · 섹션 `내 자산` · 잔액 필드 `내 잔액` · `필요 원금` · `진행 중인 매칭` · `퍼뜩 업데이트` · `신뢰와 안전` · `인사이트 요약`. AI 제목은 상태별. 전 상태 `찾고 있어요` 고정 금지.

HC3-09 FAIL 후 추가 승인 presentation copy(HomeClean 전용, `T.home` 0): Category `전체 · 시계 · 카드 · 가방`. profile fallback `사용자`. Asset 단위 `KRW`/`USDT` · CTA `자산 내역`.

Navigation 권위 = USER_TABS: `홈` `/` · `기회` `/profits` · `수익` `/trades` · `지갑` `/wallet` · `내정보` `/me`. Visual Authority 이미지의 `매칭`/`자산`/`내 정보` 복사 금지.

구 `VISUAL_FUNCTIONAL_CONTRACT_CONFLICT`(HC25-05 보고)는 이 결정으로 해소. Phase 3에서 `T.home`을 고쳐 풀지 않는다.

---

## 12J. HOME_CLEAN_HC3_09_DESKTOP_VISUAL_APPROVED

Founder Desktop 육안 승인. 증거: `_tmp_home_clean/v1/phase3/USER_DESKTOP_REVIEW.md`.

사용자 승인 문장 (원문):

```text
HOME_CLEAN_HC3_09_DESKTOP_VISUAL_APPROVED

1440×1080 Desktop Visual Authority 기준으로 HC3-09를 승인한다.

승인 범위:
- AI Summary 위계 및 Robot 배치
- Asset 카드 밀도 및 decorative trend
- Products 3장과 CTA viewport 노출
- Sidebar AI 도움 카드 및 고객센터 배치
- Desktop 3열 비율
- header bell 및 profile pill
- overflow·겹침·잘림 없음

다음 차이는 의도적으로 허용한다.
- USER_TABS 기존 라벨
- fixture 상태의 `확인 중`
- 가짜 금액·건수·날짜·stepper 미사용
- 기존 HomeClean 카피
- 승인 Robot/Product PNG와 원본 일러스트의 픽셀 차이
```

선행 FAIL `HOME_CLEAN_HC3_09_DESKTOP_VISUAL_FAIL`은 보존. 이 승인으로 해소.
검수 viewport: `1440×1080`. Visual Authority SHA-256 `ab4418dbd4b18f903a640d225edd16a5aa01445b2855fb615e250cf5a95d4d42`.
재검수 캡처: `_tmp_home_clean/v1/phase3/desktop-correction/desktop-correction-1440x1080.png`.

Phase 4 진입은 HC3-10 `HOME_CLEAN_DESKTOP_READY_FOR_USER_REVIEW` 후, HC3-10 Next(`HC4-01`)만.
승인 범위를 넘는 legacy Home · `T.home` · `USER_TABS` · href · Money · Engine · Auth · API · DB · FX 변경 0.

---

## 12K. HOME_CLEAN_HC4_12_RESPONSIVE_VISUAL_APPROVED

Founder Responsive 육안 승인. 증거: `_tmp_home_clean/v1/phase4/USER_RESPONSIVE_REVIEW.md`.

사용자 승인 문장 (원문):

```text
HOME_CLEAN_HC4_12_RESPONSIVE_VISUAL_APPROVED

390·768·1440 Responsive 기준으로 HC4-12를 승인한다.

승인 범위:
- Mobile Header/AI/Asset/Products carousel/Progress/Trust/BottomNav
- Tablet·중간 Desktop 필수 영역 잔존
- Desktop 1440 composition 유지
- Ultrawide 1680 clamp
- overflow·겹침·잘림 없음

다음 차이는 의도적으로 허용한다.
- USER_TABS 기존 라벨
- fixture 상태의 확인 중
- 가짜 금액·건수 미사용
- Next.js 개발 인디케이터
```

검수 viewport: `390×693` · `768×1024` · `1440×1080`.
재검수 캡처: `_tmp_home_clean/v1/phase4/first-view/first-view-390x693.png` · `landscape-tablet/lt-768x1024.png` · `mobile-ai/ai-1440x1080.png`.

Phase 5 진입은 HC4-13 `HOME_CLEAN_RESPONSIVE_READY_FOR_USER_REVIEW` 후, HC4-13 Next(`HC5-01`)만.
승인 범위를 넘는 legacy Home · `T.home` · `USER_TABS` · href · Money · Engine · Auth · API · DB · FX · Canon · visual-locks 변경 0.

---

## 12L. HOME_CLEAN_HC5_09_FINAL_VISUAL_APPROVED

Founder 최종 육안 승인. 증거: `_tmp_home_clean/v1/phase5/USER_VISUAL_REVIEW.md`.

사용자 승인 문장 (원문):

```text
HOME_CLEAN_HC5_09_FINAL_VISUAL_APPROVED
```

선행 대기 `WAITING_FOR_USER_FINAL_VISUAL_APPROVAL`은 이 승인으로 해소.
검수 viewport: `390×693` · `1440×1080`.
Visual Authority SHA-256 Desktop `ab4418dbd4b18f903a640d225edd16a5aa01445b2855fb615e250cf5a95d4d42` · Mobile `eaa4377faeb633327d1c26560d83f3aecc82f0407947822683cf7554422ba225`.
재검수 캡처: `_tmp_home_clean/v1/phase5/hc5-09-final/capture-desktop-1440x1080.png` · `check-final-390x693.png`.

Phase 6 진입은 HC5-10 `HOME_CLEAN_V1_READY_FOR_USER_REVIEW` 후, HC5-10 Next(`HC6-01`)만.
승인 범위를 넘는 legacy Home · `T.home` · `USER_TABS` · href · Money · Engine · Auth · API · DB · FX · Canon · visual-locks 변경 0.

---

## 12M. HOME_CLEAN_V1_P5_FINAL_VISUAL_APPROVED

Founder P5 Final Visual Approval + ZIP 독립 검수. HC5-10 closeout.

사용자 승인 문장 (원문):

```text
HOME_CLEAN_V1_P5_FINAL_VISUAL_APPROVED
```

```text
AI_SUMMARY_ROBOT_CROP_NARROW_EXCEPTION_APPROVED
```

Robot crop 범위 (확대 금지): AI Summary Desktop/Mobile 승인 Robot asset에 한하여 Visual Authority composition 재현을 위한 비율 왜곡 없는 `cover` / `object-position`. Product Robot 및 Sidebar Robot은 `contain` 유지.

게이트 marker (기존 형식, 유지):

```text
HOME_CLEAN_V1_READY_FOR_USER_REVIEW
```

closeout:

```text
HC5_10_PASS
PHASE_6_NOT_STARTED
```

증거: `_tmp_home_clean/v1/final-fidelity-closure/FINAL_VISUAL_FIDELITY_REPORT.md` · `geometry.json` · `regression-audit.json` · `zoom-a11y.json` · `_tmp_home_clean/v1/phase5/GATE.md` §7.
390: firstProduct 534.6 · nav 645 · visible 110.4. Zoom 200: 5 tabs · all inside viewport.
이 기록 런에서 production visual source · Canon · visual-locks · `/` · 03 UI plan · Phase 6 착수 0.
commit 0 · push 0 · stash 0.

---

## 12N. HOME_CLEAN_HC6_08_RUNTIME_APPROVED

Founder runtime 승인. 증거: `_tmp_home_clean/v1/phase6/USER_RUNTIME_REVIEW.md`.

사용자 승인 문장 (원문):

```text
HOME_CLEAN_HC6_08_RUNTIME_APPROVED
```

선행 대기 `WAITING_FOR_USER_RUNTIME_APPROVAL`은 이 승인으로 해소.
검수 경로: `/dev/home-clean-v1` · `/dev/home-clean-v1?mode=live`.
production `/` 는 기존 `HomePageClient` 유지.

이 승인으로 `/` cutover · Phase 7 실행 · Wallet 26장 최종 완료 · commit/push/stash 를 열지 않는다.
`HOME_CLEAN_RUNTIME_READY_FOR_USER_REVIEW`는 HC6-09 게이트다.

---

## 13. Phase · 게이트

| Phase | 게이트 | 진입 |
|---|---|---|
| 0 Baseline | `HOME_CLEAN_BASELINE_PASS` | HC0-01부터 |
| 1 Isolation | `HOME_CLEAN_CSS_ISOLATION_PASS` | P0 PASS + Consumer Next build. OpenNext는 P2 blocker 아님 |
| 2 Shell | `HOME_CLEAN_SHELL_PASS` | P1 PASS |
| 2.5 Asset + Identity + Authority | `HOME_CLEAN_ASSET_AUTHORITY_APPROVED` 후 `HOME_CLEAN_VISUAL_AUTHORITY_APPROVED` | P2 PASS + **사용자 자산 승인** + **Visual Authority 승인** |
| 3 Desktop | `HOME_CLEAN_DESKTOP_READY_FOR_USER_REVIEW` | Visual Authority 승인 전 금지 |
| 4 Responsive | `HOME_CLEAN_RESPONSIVE_READY_FOR_USER_REVIEW` | P3 + **Desktop 승인** |
| 5 QA | `HOME_CLEAN_V1_READY_FOR_USER_REVIEW` | P4 + **Responsive 승인** |
| 6 Runtime | `HOME_CLEAN_RUNTIME_READY_FOR_USER_REVIEW` | P5 + **최종 시각 승인** + OpenNext 증거 |
| 7 Cutover | `HOME_CLEAN_CUTOVER_READY_FOR_USER_APPROVAL` | P6 + **runtime 승인** + **cutover 승인** + OpenNext |
| 8 Legacy | `HOME_LEGACY_REMOVAL_READY_FOR_APPROVAL` | P7 안정 + **삭제 승인** |
| 9 Evidence | `HOME_CLEAN_FINAL_EVIDENCE_PROMOTION_READY` | 최종 Home 승인 + **승격 승인** |

Scroll: document scroll 단일 owner. Right rail/sidebar 자체 vertical scroll 금지. `top:650px` 금지. Mobile nav `position: fixed` + 콘텐츠 `padding-bottom: calc(nav + env(safe-area-inset-bottom, 0px))`.

공통 Protected: 03 UI 플랜, `apps/web/app/page.tsx`(HC7-03 전), `HomePageClient.tsx`, `packages/ui/components/home/**`, `component.css`(HC8-06 전), `lux-fintech.ts`, `packages/ui/copy/ko/**`, `apps/web/routes.ts`(증명+revision 전), `visual-locks.v1.json`(HC9-04 전), `packages/ui/canon/evidence/**`, `brand.manifest.json`, SDK · Nest · DB · FX.

---

## 14. 위험 · blocker

| ID | 내용 | 대응 |
|---|---|---|
| R1 | Bare 오판으로 5탭 chrome 소실 | exact set + HC1-06 |
| R2 | Module만으로 CSS PASS | 확대 matched-style |
| R3 | `component.css` 수정 → web+admin | P1~7 수정 0 |
| R4 | dirty 오스테이지 | HomeClean 경로만. `_tmp_home_clean/` ignore |
| R5 | 저사양 OOM | 1프로세스. PASS 위장 금지 |
| R6 | File-Serial이 03 편집 요구 | `BLOCKED_FILE_SERIAL_PLAN_CHANGE_REQUIRED` |
| R7 | 완성 자산 무시·재생성·레거시 대체 | ZIP SSOT 유지 · 생성 0 · 설치는 사용자 승인 후 |
| R8 | Cutover 중간 상태 | HC7-03 atomic. HC7-04 실행 금지 |
| R9 | greeting/foundReady emoji vs 영구 UI 금지 | copy 수정 0. 사용자 결정 |
| R10 | `viewport-fit=cover` 전역 | root viewport 변경 0 |
| R11 | HVR/H7 붙여넣기 | 복사 0 |
| R12 | overlay를 새 Visual Authority로 승격 | 승인 authority QA만 |
| R13 | win32 OpenNext SKIP을 PASS | 금지. P2 blocker는 아님 |
| R14 | Clean을 `USER_TABS`에 추가 | 금지 |
| R15 | 자동 commit 강제 | `BLOCKED_COMMIT_POLICY_CONFLICT` |
| R16 | `_tmp` 파일명 `mockup` | mockup-governance FAIL |
| R17 | AppShell 식별자 삭제 | 기본 분기 유지 |
| R18 | pathname flicker | 첫 페인트에 구 shell 보이면 FAIL |
| R19 | Visual Authority 없이 Phase 3 | `WAITING_FOR_USER_VISUAL_AUTHORITY_FILES` |
| R20 | 정적 `김` / Robot을 사용자 프로필 | identity 계약 |
| R21 | production fixture fallback | fail-closed |
| R22 | 없는 CTA 경로 신설/대체 | `BLOCKED_CTA_ROUTE_MISSING` |
| R23 | rollback에 git reset/restore/checkout | 금지. apply_patch만 |
| R24 | 숨은 본문-only TODO | 중단 후 revision |

---

## 15. 순차 To-Do (전문)

필드 약어: Dep=Depends on, Allow=Allowed files, Prot=Protected files(공통 Protected + 아래), Act=Exact actions, Val=Validation commands, URL=Playwright URL, VP=Viewports, Ev=_tmp 경로, UA=User approval required, Next=Next To-Do.

공통 Rollback 원칙: 해당 todo Allow 파일만 수동 patch/`apply_patch`로 되돌림. `git reset` · `git restore` · `git checkout --` · stash/pop 금지. 다른 dirty 덮어쓰기 금지. commit/push 없이 diff·route 재검증. `_tmp`는 삭제 가능. 03 플랜·SDK·`/`(HC7-03 전)는 되돌릴 대상이 아님.

---

### Phase 0

#### HC0-01
- Phase: 0 · Title: worktree/baseline scope · Status: completed · Dep: 없음
- Purpose: 무관 dirty 보존. 임시 증거가 커밋되지 않게 한다.
- Allow: `.gitignore`(`_tmp_home_clean/` 1줄), `_tmp_home_clean/v1/baseline/WORKTREE.md`
- Prot: 앱 소스 0. 03 YAML 0
- Act: `git status`/`git diff --stat`을 WORKTREE.md에 기록. `_tmp_figma_cmp`·기존 Home·rules·03 플랜 staging 금지라고 명시. `.gitignore`에 `_tmp_home_clean/`만 추가. 03 YAML 읽기만.
- Val: `git status --short` — 앱 파일 변경 0
- URL: 없음 · VP: 없음 · Ev: `v1/baseline/WORKTREE.md`
- PASS: dirty 기록. 앱 소스 0. ignore 1줄. 03 불변
- FAIL: 앱 수정, 무관 staging, 03 변경
- Rollback: ignore 1줄 revert. WORKTREE.md 삭제
- UA: No · Next: HC0-02

#### HC0-02
- Phase: 0 · Title: import/CSS graph · Status: completed · Dep: HC0-01
- Purpose: Home CSS·Shell·데이터 import를 경로로 고정.
- Allow: `_tmp_home_clean/v1/baseline/IMPORT_CSS_GRAPH.md`
- Prot: 앱 소스 0
- Act: layout→globals→lux-theme→component/motion/responsive 기록. AppShellRoot→Provider→Header/BottomNav5/Footer 기록. page→HomePageClient→HomeExperience fetch 3종 기록. H7/HVR와 `data-home-avm="v3"` 기록. 코드 수정 0.
- Val: 없음 · URL: 없음 · VP: 없음 · Ev: `v1/baseline/IMPORT_CSS_GRAPH.md`
- PASS: 체인·경로 기록. 앱 diff 0
- FAIL: 추측 경로, 앱 수정
- Rollback: MD 삭제 · UA: No · Next: HC0-03

#### HC0-03
- Phase: 0 · Title: 기존 Home 스크린샷·에러 · Status: completed · Dep: HC0-02
- Purpose: `/`·H7·HVR 현재 화면과 pageerror 고정.
- Allow: `_tmp_home_clean/v1/baseline/playwright-baseline.mjs`, `v1/baseline/*.png`, `v1/baseline/errors.json`
- Prot: `apps/web/**` 소스 0
- Act: `pnpm lowspec:status` 후 `pnpm dev:web`만. `_tmp` 러너로 3 URL 캡처. 파일명에 `mockup` 금지(예: `prod-home-390x693.png`). errors.json 기록. HVR 스크립트 복사 금지. 서버 종료.
- Val: `pnpm dev:web` (1프로세스)
- URL: `/` `/dev/h7-home-preview` `/dev/home-visual-rebuild`
- VP: 390×693, 768×1024, 1440×1080
- Ev: `v1/baseline/{route}-{w}x{h}.png`, `errors.json`
- PASS: 9장 + errors.json. 앱 소스 0
- FAIL: Canon 저장, `*mockup*.png`, 앱 수정, OOM을 PASS
- Rollback: baseline png/json/mjs 삭제 · UA: No · Next: HC0-04

#### HC0-04
- Phase: 0 · Title: 확정 자산팩 inventory · Status: completed · Dep: HC0-03
- Purpose: §12A 확정 ZIP을 SSOT 후보로 재실측·매핑 계획만 기록. 새 생성 0. 설치 0. 승인 자동 완료 0.
- Allow: `_tmp_home_clean/v1/baseline/ASSET_INVENTORY.md`
- Prot: `brand.manifest.json`, `home-v3-assets.ts`, 앱 public 설치 0, 이미지 생성 0
- Act: ZIP SHA-256=`d4fdb977f2e6a51d92f22ccdc9e2a3caf806858771cfb978523a843291a22d56` 재확인. 상태 `HOME_VISUAL_ASSET_PACKAGE_INTEGRITY_PASS` + `REPO_INSTALL_AND_USER_AUTHORITY_PENDING`. §12A 표(경로·bytes·WxH·alpha·hash·용도·설치 URL)를 원본과 대조. `WAITING_FOR_USER_ASSET_FILES` 선언 금지. README `/assets/home/robots/`를 설치 경로로 쓰지 않음. home-v2/v3/Brand Kit 대체 금지. `home-clean-assets.ts` 생성 0. public 복사 0.
- Val: ZIP SHA-256 + 내부 `SHA256SUMS.txt` 원문 대조. 설치 명령 0
- URL: 없음 · VP: 없음 · Ev: `v1/baseline/ASSET_INVENTORY.md`
- PASS: 확정 세트 표 완결. 생성 0. 설치 0. WAITING 미선언
- FAIL: 이미지 생성, 레거시 대체, Brand Kit 수정, 설치, WAITING 오선언
- Rollback: MD 삭제 · UA: No · Next: HC0-05

#### HC0-05
- Phase: 0 · Title: build/verify script inventory · Status: completed · Dep: HC0-04
- Purpose: Phase 1 명령을 package.json 원문으로 고정.
- Allow: `_tmp_home_clean/v1/baseline/BUILD_VERIFY_SCRIPTS.md`
- Prot: package.json 읽기만
- Act: §11 명령을 root/`@aipo/web`/`@aipo/ui`에서 재확인. transpilePackages·exports 관례. ia-tabs가 dev route 비요구. opennext win32 SKIP≠PASS. ui `.module.css` 전례 0. **script 실행 0.**
- Val: 없음 · URL: 없음 · VP: 없음 · Ev: `v1/baseline/BUILD_VERIFY_SCRIPTS.md`
- PASS: 명령이 package.json과 일치. 발명 0
- FAIL: 없는 script, 빌드 실행
- Rollback: MD 삭제 · UA: No · Next: HC0-06

#### HC0-06
- Phase: 0 · Title: baseline gate · Status: completed · Dep: HC0-05
- Purpose: `HOME_CLEAN_BASELINE_PASS`.
- Allow: `_tmp_home_clean/v1/baseline/GATE.md`
- Act: HC0-01~05 체크. `git diff --name-only`가 `.gitignore`와 `_tmp_home_clean/**`만. 03 불변. commit 0.
- Val: `git diff --name-only`, `pnpm verify:home-state-truth`, `pnpm verify:home-live-wire`
- URL: 없음 · VP: 없음 · Ev: `v1/baseline/GATE.md`
- PASS: inventory·9장·확정 ZIP 자산표(생성 0·설치 0)·script표·앱 0·03 0
- FAIL: 빠진 산출물, 앱 변경, Canon 저장
- Rollback: Phase 0 `_tmp` 삭제 · UA: No · Next: HC1-01

---

### Phase 1

#### HC1-01
- Phase: 1 · Title: exact bare · routes.ts 확인 · Status: completed · Dep: HC0-06
- Purpose: children-only 확정. `routes.ts` 기본 0 재증명.
- Allow: `_tmp_home_clean/v1/phase1/BARE_PATH_DESIGN.md`
- Prot: `routes.ts`, `AppShellRoot.tsx` (이 todo 수정 0)
- Act: `ia-tabs.cjs` · `part5-shell-toast.cjs` · `legal-plain-ko.cjs` · `market-briefing-no-investment-advice.cjs` 재읽기. `USER_TABS`에 Clean 금지 이유 기록. `SHELL_BARE_PATHS=["/dev/home-clean-v1"]` + children only 확정. 증거 없으면 `routes.ts` 변경 0. 증거 있으면 숨은 TODO를 만들지 말고 `BLOCKED_ROUTES_TS_REQUIRED`로 정지 후 사용자 승인 revision.
- Val: `pnpm verify:ia-tabs` (현재 트리 재확인)
- URL: 없음 · VP: 없음 · Ev: `v1/phase1/BARE_PATH_DESIGN.md`
- PASS: children-only 확정 + routes 0 근거, 또는 blocker 정지
- FAIL: 증거 없이 routes 수정, `startsWith("/dev")`, Provider 유지 채택
- Rollback: MD 삭제 · UA: blocker면 Yes · Next: HC1-02

#### HC1-02
- Phase: 1 · Title: 최소 UI export + probe · Status: completed · Dep: HC1-01
- Purpose: `@aipo/ui/components/home-clean-v1`로 probe만.
- Allow: `packages/ui/components/home-clean-v1/index.ts`, `HomeCleanIsolationProbe.tsx`, `HomeCleanIsolationProbe.module.css`, `packages/ui/package.json` exports 1키
- Prot: `components/home/**`, `component.css`, `routes.ts`
- Act: probe에 root/main/header/nav/section/card/h1/p/button/a/img. attr는 `data-ui-surface="home-clean-v1"`만. Module hash만. `.home-*`/`data-home-avm`/`app-header` class 0. `components/home` import 0. `!important` 0. 화면 한글. IT 용어 0.
- Val: `pnpm verify:no-it-jargon`, `pnpm verify:mockup-governance`
- URL: 없음 · VP: 없음 · Ev: `v1/phase1/PROBE_EXPORT.md`
- PASS: export 키. probe만. 카드 0
- FAIL: Home 재사용, 카드, `component.css` 수정
- Rollback: 신규 파일 삭제 + exports 키 제거 · UA: No · Next: HC1-03

#### HC1-03
- Phase: 1 · Title: 최소 dev route · Status: completed · Dep: HC1-02
- Purpose: App Router만으로 `/dev/home-clean-v1` 생성.
- Allow: `apps/web/app/dev/home-clean-v1/page.tsx`
- Prot: `routes.ts`, `apps/web/app/page.tsx`
- Act: `NODE_ENV==="production"`이면 `notFound()` (H7과 동일). `robots: { index:false, follow:false }`. probe만. `HomeExperience`/HVR 0. `routes.ts` 0.
- Val: `pnpm verify:ia-tabs`, `pnpm verify:no-admin-in-web`
- URL: `/dev/home-clean-v1` (서버는 HC1-05) · VP: 없음 · Ev: `v1/phase1/ROUTE.md`
- PASS: page 존재. routes diff 0. notFound 분기 존재
- FAIL: `USER_TABS` 변경, nested 추가, `/` 변경
- Rollback: page.tsx 삭제 · UA: No · Next: HC1-04

#### HC1-04
- Phase: 1 · Title: AppShell children-only bypass · Status: completed · Dep: HC1-03
- Purpose: Clean 경로에서 구 Home chrome 마운트 0.
- Allow: `packages/ui/components/shell/shell-bare-paths.ts`, `AppShellRoot.tsx`
- Prot: `AppHeader.tsx`, `BottomNav5.tsx`, `SiteFooter.tsx`, `HomeChromeContext.tsx` 내용 0
- Act: exact `["/dev/home-clean-v1"]`. 일치 시 `return children`만. Provider/wrapper 0. 그 외 현재 트리 유지. CSS hide 0. `startsWith("/dev")` 0.
- Val: `pnpm verify:part5-shell-toast`
- URL: HC1-05에서 확인 · VP: 없음 · Ev: `v1/phase1/BARE_SHELL.md`
- PASS: 기본 분기 식별자 유지. bare는 children only
- FAIL: Provider 유지, CSS hide, prefix 매칭
- Rollback: AppShellRoot revert + bare-paths 삭제 · UA: No · Next: HC1-05

#### HC1-05
- Phase: 1 · Title: CSS matched-style audit · Status: completed · Dep: HC1-04
- Purpose: 예상 밖 `component.css` declaration 0 실측.
- Allow: `apps/web/app/dev/home-clean-v1/playwright-home-clean-isolation.mjs`, `v1/phase1/matched-styles.json`, `bare-dom.json`, first-paint png(`mockup` 이름 금지)
- Prot: `component.css`
- Act: `pnpm dev:web`만. 11노드 matched style. 허용/검토/금지 분류. bare DOM에서 app-header/sidebar/bottom-nav-5/site-footer/app-shell=0. 첫 페인트 구 shell이면 FAIL. 서버 종료. CDP 실패 시 `getComputedStyle`+`document.styleSheets` 폴백.
- Val: `node apps/web/app/dev/home-clean-v1/playwright-home-clean-isolation.mjs`
- URL: `/dev/home-clean-v1` · VP: 390×693, 768×1024, 1440×1080
- Ev: `v1/phase1/matched-styles.json`, `bare-dom.json`
- PASS: 금지 0. 예상 밖 component.css 0. 구 chrome 0
- FAIL: Module만으로 PASS, 금지 selector, flicker
- Rollback: isolation 스크립트+_tmp phase1 · UA: No · Next: HC1-06

#### HC1-06
- Phase: 1 · Title: 기존 route 회귀 · Status: completed · Dep: HC1-05
- Purpose: bare가 5탭·login chrome을 제거하지 않았는지.
- Allow: `_tmp_home_clean/v1/phase1/regression/**`
- Act: `pnpm dev:web`. `/` `/profits` `/trades` `/wallet` `/me` `/auth/login`에서 app-header/app-sidebar/site-footer 존재. Phase 0와 비교. 서버 종료.
- Val: isolation 스크립트 regression 단계, `pnpm verify:ia-tabs`
- URL: 위 6경로 · VP: 390×693, 1440×1080 · Ev: `v1/phase1/regression/`
- PASS: 기존 chrome 존재. Clean chrome 0
- FAIL: 5탭 chrome 소실
- Rollback: HC1-04 revert · UA: No · Next: HC1-07

#### HC1-07
- Phase: 1 · Title: Consumer Next production build · Status: completed · Dep: HC1-06
- Purpose: ui CSS Module + transpilePackages가 production Next에서 깨지지 않는지.
- Allow: `_tmp_home_clean/v1/phase1/NEXT_BUILD.md`
- Prot: next.config, wrangler, admin
- Act: dev 서버 OFF. `pnpm lowspec:status`. `pnpm --filter @aipo/web build`. CSS asset 오류 0. 이어서 `pnpm --filter @aipo/web start`로 `/dev/home-clean-v1`이 404인지 확인 후 start 종료. OOM이면 `BLOCKED_LOCAL_OOM`+`BLOCKED_PRODUCTION_BUILD_VERIFICATION`로 중단. PASS 위장 금지.
- Val: `pnpm --filter @aipo/web build` 그다음 `pnpm --filter @aipo/web start`
- URL: start의 `/dev/home-clean-v1` (404) · VP: 없음 · Ev: `v1/phase1/NEXT_BUILD.md`
- PASS: build exit 0. CSS 오류 0. production 404
- FAIL: 빌드 실패, production에서 페이지 열림, OOM을 PASS
- Rollback: `.next` cleanup · UA: No · Next: HC1-08

#### HC1-08
- Phase: 1 · Title: OpenNext 위치 고정 · Status: completed · Dep: HC1-07
- Purpose: OpenNext를 Phase 2 blocker가 아니라 P6/P7 필수로 기록.
- Allow: `_tmp_home_clean/v1/phase1/OPENNEXT_DEFER.md`
- Prot: `infra/web/wrangler.toml` 읽기만. build:cf 이 todo에서 강제 0
- Act: win32 `verify:opennext-build` SKIP≠PASS를 기록. 필수 검증 위치=HC6-07/HC6-09 그리고 HC7 cutover 전. 이 todo에서 build:cf 실패를 Phase 2 금지로 쓰지 않음. 임의 push 0. OOM을 PASS 위장 0.
- Val: 없음(실행 0). 명령 원문은 §11
- URL: 없음 · VP: 없음 · Ev: `v1/phase1/OPENNEXT_DEFER.md`
- PASS: 위치 기록. Phase 2 진입 허용. SKIP을 PASS로 쓰지 않음
- FAIL: SKIP을 PASS, 이 todo에서 Phase 2를 OpenNext로 차단
- Rollback: MD 삭제 · UA: No · Next: HC1-09

#### HC1-09
- Phase: 1 · Title: isolation gate · Status: completed · Dep: HC1-08
- Purpose: `HOME_CLEAN_CSS_ISOLATION_PASS`.
- Allow: `_tmp_home_clean/v1/phase1/GATE.md`
- Act: HC1-01~08. Consumer Next build(HC1-07) 필수. OpenNext 증거는 Phase 1 PASS에 불필요. 카드 파일 0. `pnpm verify:gate:fast` 보고만. commit 0.
- Val: `pnpm verify:gate:fast`, `pnpm verify:ia-tabs`, `pnpm verify:part5-shell-toast`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase1/GATE.md`
- PASS: children only + CSS 계약 + 회귀 + web next + production 404
- FAIL: Next build 미완료, 카드, routes 무단 변경
- Rollback: Phase 1 Allow 전부 · UA: No · Next: HC2-01

---

### Phase 2

#### HC2-01
- Phase: 2 · Title: semantic token root · Status: completed · Dep: HC1-09
- Purpose: surface에 `--hc-*`만.
- Allow: `HomeCleanTokens.module.css`, probe/barrel 최소 import
- Prot: `lux-fintech.ts`, `lux-theme.css`, `component.css`
- Act: 페이지 변수는 surface root만. hex는 Lux 참조. 전역 색 의미 0. Tailwind `lg:`를 geometry 소유자로 쓰지 않음.
- Val: `pnpm verify:lux-theme-sync`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase2/tokens.md`
- PASS: `--hc-*` surface only. lux-fintech diff 0
- FAIL: 전역 토큰 의미 변경
- Rollback: 토큰 파일 삭제 · UA: No · Next: HC2-02

#### HC2-02
- Phase: 2 · Title: Shell/grid/scroll owner · Status: completed · Dep: HC2-01
- Purpose: document scroll 1회.
- Allow: `HomeCleanShell.tsx`, `HomeCleanShell.module.css`, barrel, page가 Shell+probe 슬롯
- Prot: `SHELL_BARE_PATHS`에 `/` 추가 0
- Act: `min-h-dvh` 1회. rail/sidebar 자체 vertical scroll 0. `top:650px` 0. 카드 시각 0. placeholder만.
- Val: `pnpm verify:gate:fast`
- URL: `/dev/home-clean-v1` · VP: 320/390/768/1440/3840 · Ev: `v1/phase2/shell-grid.md`
- PASS: 중첩 scroll 0
- FAIL: `useHomeMobileSurface`, AVM geometry
- Rollback: Shell 삭제, page를 probe-only · UA: No · Next: HC2-03

#### HC2-03
- Phase: 2 · Title: Header skeleton · Status: completed · Dep: HC2-02
- Purpose: Header 자리만. 시각 마감 0.
- Allow: `HomeCleanHeader.tsx`, Shell 슬롯
- Prot: `AppHeader.tsx`, `HomeChromeContext.tsx`
- Act: `<header>` 1. greeting/bell/profile 슬롯. 자산 0. `useHomeChrome` 0. 카피 키 `T.home.header`/`T.home.greeting`. copy 파일 0. 이모지는 원문, 충돌 기록만.
- Val: `pnpm verify:no-it-jargon`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase2/header-skeleton-*.png`
- PASS: header 존재. `app-header` 0. 자산 0
- FAIL: AppHeader 재사용, 로고 임의 선택
- Rollback: Header 삭제 · UA: No · Next: HC2-04

#### HC2-04
- Phase: 2 · Title: Navigation model · Status: completed · Dep: HC2-03
- Purpose: 5탭 의미 소스 1곳. presentation 파일 0.
- Allow: `HomeCleanNavigationModel.ts`, `home-clean-nav-icons.tsx`, `home-clean.types.ts` nav 타입
- Prot: `USER_TABS` 수정 0
- Act: 모델은 `USER_TABS`를 props로. ui→apps/web import 0. item은 label/href/active/iconId. 아이콘 맵은 href 1파일. 이모지 렌더 0. Sidebar/MobileNav 이 todo에서 생성 0.
- Val: `pnpm verify:ia-tabs`
- URL: 없음 · VP: 없음 · Ev: `v1/phase2/nav-model.md`
- PASS: source 1. USER_TABS diff 0
- FAIL: 라벨/href 복제 상수
- Rollback: 모델 파일 삭제 · UA: No · Next: HC2-05

#### HC2-05
- Phase: 2 · Title: Desktop Sidebar presentation · Status: completed · Dep: HC2-04
- Purpose: Desktop Sidebar 골격.
- Allow: `HomeCleanSidebar.tsx`, `HomeCleanNav.module.css`, Shell, page가 USER_TABS props
- Prot: `BottomNav5.tsx`
- Act: 모델 배열만 렌더. Desktop에서 nav landmark 1. 고객센터는 `T.home.sidebar`. 로고 자산 0.
- Val: `pnpm verify:no-it-jargon`
- URL: `/dev/home-clean-v1` · VP: 1440×1080, 768×1024 · Ev: `v1/phase2/sidebar-skeleton-1440.png`
- PASS: Desktop sidebar nav 1. href/label=USER_TABS
- FAIL: 자체 5탭 상수, BottomNav5 재사용
- Rollback: Sidebar 삭제 · UA: No · Next: HC2-06

#### HC2-06
- Phase: 2 · Title: Mobile Bottom Nav presentation · Status: completed · Dep: HC2-05
- Purpose: 같은 모델의 Mobile presentation.
- Allow: `HomeCleanMobileNav.tsx`, Nav CSS, Shell
- Prot: `BottomNav5.tsx`
- Act: 동일 item 배열. 390에서 nav landmark 1. 1440에서 이 노드 `hidden`+`inert`+`aria-hidden`+포커스 제외. 390에서 Sidebar presentation에 동일 숨김. 전체 Home tree 이중 렌더 0.
- Val: shell/isolation 스크립트에 nav count
- URL: `/dev/home-clean-v1` · VP: 390×693, 1440×1080 · Ev: `v1/phase2/nav-a11y.json`
- PASS: viewport당 읽히는 nav 1. href 소스 1
- FAIL: 이중 Home tree, 스크린리더 이중 읽기
- Rollback: MobileNav 삭제 · UA: No · Next: HC2-07

#### HC2-07
- Phase: 2 · Title: safe-area · Status: completed · Dep: HC2-06
- Purpose: Mobile nav가 콘텐츠·홈 인디케이터를 가리지 않음.
- Allow: `HomeCleanShell.module.css`, `HomeCleanNav.module.css`
- Prot: `apps/web/app/layout.tsx` viewport 메타 0
- Act: `padding-bottom: calc(nav-height + env(safe-area-inset-bottom, 0px))`. `viewport-fit=cover` 0. 터치 최소 44 목표 48. 36px 0.
- Val: shell 스크립트 safe-area computed
- URL: `/dev/home-clean-v1` · VP: 390×693, 430×932 · Ev: `v1/phase2/safe-area.json`
- PASS: nav/콘텐츠 겹침 0. viewport 메타 불변
- FAIL: viewport-fit 추가, 터치 36, nav가 CTA 가림
- Rollback: safe-area CSS · UA: No · Next: HC2-08

#### HC2-08
- Phase: 2 · Title: 5-viewport shell QA · Status: completed · Dep: HC2-07
- Purpose: Shell/grid 필수 5뷰. full matrix 금지.
- Allow: `playwright-home-clean-shell.mjs`, `v1/phase2/shell-qa/**`
- Prot: 카드 컴포넌트 생성 0
- Act: `pnpm dev:web`. overflow/overlap/nav/img0/pageerror. 카드 시각 추가 0. 서버 종료.
- Val: `node apps/web/app/dev/home-clean-v1/playwright-home-clean-shell.mjs`
- URL: `/dev/home-clean-v1` · VP: 320×568, 390×693, 768×1024, 1440×1080, 3840×2160
- Ev: `v1/phase2/shell-qa/`
- PASS: 5뷰 overflow 0. 중첩 scroll 0. 구 Home class 0. 36px 0
- FAIL: full matrix, matchMedia, 이중 tree
- Rollback: 스크립트+_tmp. 구조 FAIL면 HC2-02부터 · UA: No · Next: HC2-09

#### HC2-09
- Phase: 2 · Title: shell gate · Status: completed · Dep: HC2-08
- Purpose: `HOME_CLEAN_SHELL_PASS`.
- Allow: `_tmp_home_clean/v1/phase2/GATE.md`
- Act: HC2-01~08. Desktop 카드 파일 0. `verify:gate:fast` 보고. commit 0.
- Val: `pnpm verify:gate:fast`, `pnpm verify:ia-tabs`, `pnpm verify:part5-shell-toast`
- URL: `/dev/home-clean-v1` · VP: shell 5뷰 · Ev: `v1/phase2/GATE.md`
- PASS: token·scroll·nav 모델·두 presentation·safe-area·5뷰
- FAIL: 자산 임의 배선, 카드, P2.5 없이 P3
- Rollback: Phase 2 Allow. Phase 1 유지 · UA: No · Next: HC25-01

---

### Phase 2.5

#### HC25-01
- Phase: 2.5 · Title: 완성 자산 검증 + identity 계약 · Status: completed · Dep: HC2-09
- Purpose: §12A 완성 세트를 검증하고 사용자 최종 승인을 받는다. §12B identity 계약을 기록한다. 새 생성 0.
- Allow: `_tmp_home_clean/v1/phase25/ASSET_AUTHORITY_REQUEST.md`, `IDENTITY_CONTRACT.md`
- Prot: Brand Kit overwrite 0, `home-v3-assets.ts`, 이미지 생성 0
- Act: HC0-04/§12A 확정 ZIP 표를 그대로 제시. 완성본 재경쟁 0. ZIP이 있으므로 `WAITING_FOR_USER_ASSET_FILES` 금지. 설치·승인을 이 todo에서 자동 완료 금지. identity: avatarUrl 우선, nickname→displayName→name→email 앞부분→`사용자`, 사진 없으면 선택 이름 첫 Unicode, 정적 `김` 금지, Robot≠user. 저장소 필드 실측(추측 API 0).
- Val: 없음 · URL: 없음 · VP: 없음 · Ev: `v1/phase25/ASSET_AUTHORITY_REQUEST.md`, `IDENTITY_CONTRACT.md`
- PASS: 사용자 최종 자산 승인 + identity 계약 기록
- FAIL: 에이전트 임의 완료, 새 이미지, 레거시 대체, 승인 전 Phase 3
- Rollback: request MD · UA: **Yes** · Next: HC25-02

#### HC25-02
- Phase: 2.5 · Title: 승인 자산 매핑 · Status: completed · Dep: HC25-01
- Purpose: 승인 자산 선언 1곳. 설치 대상 경로만 기록하거나 승인 후 설치.
- Allow: `home-clean-assets.ts`, `home-clean-assets.manifest.json`, 승인 시에만 `apps/web/public/assets/home-clean-v1/**`
- Prot: `brand.manifest.json`, `HOME_V3_ASSET`, 공식 logo overwrite 0
- Act: §12A 설치 매핑만 사용(`/assets/home-clean-v1/...`). README `/assets/home/robots/` 복사 금지. HomeClean manifest에 `avatar-fallback.svg` 포함(또는 사용자 승인 제외 사유). `*.reference.*` production 복사 금지. `HOME_V3_ASSET` import 0. Brand Kit overwrite 0. 설치는 사용자 승인 후에만.
- Val: `pnpm verify:brand-asset-provenance`, `pnpm verify:brand-assets`
- URL: 없음 · VP: 없음 · Ev: `v1/phase25/ASSET_MAP.md`
- PASS: 선언 1세트. Brand Kit diff 0
- FAIL: 미승인 포함, 임의 이미지, 공식 logo overwrite
- Rollback: 두 파일 + 이번 설치분만 삭제 · UA: No · Next: HC25-03

#### HC25-03
- Phase: 2.5 · Title: 렌더·provenance · Status: completed · Dep: HC25-02
- Purpose: 깨진 경로·0크기·임의 대체 0.
- Allow: Shell 임시 img 슬롯(승인 자산만), `v1/phase25/provenance.json`
- Act: 각 URL 200이고 width/height>0. 200% 확대 선명도·가장자리 artifact·비율 왜곡 기록. 없으면 `MISSING_VISUAL_ASSET`만. 대체 생성 0. Desktop 카드 0.
- Val: `pnpm verify:brand-asset-provenance`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase25/provenance.json`
- PASS: 로드 또는 명시 MISSING
- FAIL: 깨진 URL 성공 처리, 새 PNG 창작
- Rollback: 임시 img 제거 · UA: No · Next: HC25-04

#### HC25-04
- Phase: 2.5 · Title: asset authority gate · Status: completed · Dep: HC25-03
- Purpose: `HOME_CLEAN_ASSET_AUTHORITY_APPROVED`.
- Allow: `_tmp_home_clean/v1/phase25/ASSET_GATE.md`
- Act: 승인 세트와 `home-clean-assets.ts` 일치. identity 계약 기록 존재. Phase 3 파일 0. Visual Authority 없이는 다음 HC25-05만. commit 0.
- Val: `pnpm verify:brand-asset-provenance`
- URL: 없음 · VP: 없음 · Ev: `v1/phase25/ASSET_GATE.md`
- PASS: 승인+선언+provenance+identity 기록
- FAIL: 승인 전 PASS, 생성/대체
- Rollback: Phase 2.5 자산 파일 · UA: No · Next: HC25-05

#### HC25-05
- Phase: 2.5 · Title: Visual Authority 승인 · Status: completed · Dep: HC25-04
- Purpose: `HOME_CLEAN_VISUAL_AUTHORITY_APPROVED`. Phase 3 진입 게이트.
- Allow: `_tmp_home_clean/v1/phase25/VISUAL_AUTHORITY.md`
- Prot: Canon evidence 0, visual-locks 0, Figma V4/H7/HVR 승격 0
- Act: Founder 승인 `HOME_CLEAN_VISUAL_AUTHORITY_APPROVED`. Desktop/Mobile 원본 실측·hash·역할·권위 범위·숫자 비권위·카피 원칙을 `VISUAL_AUTHORITY.md`에 기록. contact-sheet·Figma V4·H7·HVR·과거 overlay는 권위 아님. 앱 구현 0. HC3-01 이 세션에서 미실행.
- Val: 없음 · URL: 없음 · VP: Desktop/Mobile 원본 해상도 · Ev: `v1/phase25/VISUAL_AUTHORITY.md`
- PASS: 사용자 Visual Authority 승인 문장
- FAIL: 에이전트 자동 승인, 구 권위 승격, 승인 전 Phase 3
- Rollback: MD만 · UA: **Yes** · Next: HC3-01

---

### Phase 3

fixture only. live SDK 0. 한 todo에 카드 2개 금지. component loop 3뷰. copy 의미 0.

#### HC3-01
- Phase: 3 · Title: Desktop Header · Status: completed · Dep: HC25-05
- Purpose: Header Desktop 시각. 승인 Visual Authority + 승인 자산만.
- Allow: `HomeCleanHeader.tsx`, `HomeCleanHeader.module.css`, `home-clean-copy.ts`, `home-clean-assets.ts` 사용
- Prot: `AppHeader.tsx`, `packages/ui/copy/ko/**` (`T.home` overwrite 0)
- Act: greeting·bell·profile만. greeting=`HOME_CLEAN_COPY.greeting.heading`(`안녕하세요`). 로고=symbol SVG + 텍스트 `퍼뜩`(헤더에 로고 넣지 않음 · Sidebar는 HC3-02). 정적 `김` 0. Robot≠user avatar. fixture 정보부재 avatar=`avatar-fallback.svg`. 알림 아이콘 승인 자산 없음 → `MISSING_VISUAL_ASSET` 슬롯(신규 emoji/임의 아이콘 0). `HomeChromeContext` 0. Sidebar/카드 동시 제작 0. fixture only.
- Val: `pnpm verify:no-it-jargon`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase3/header-desktop/`
- PASS: Desktop Header 존재. 승인 자산. 신규 emoji 0
- FAIL: AVM Header 복사, 미선택 로고, `!important`
- Rollback: Header를 skeleton · UA: No · Next: HC3-02

#### HC3-02
- Phase: 3 · Title: Desktop Sidebar · Status: completed · Dep: HC3-01
- Purpose: Sidebar Desktop 시각.
- Allow: `HomeCleanSidebar.tsx`, `HomeCleanNav.module.css`
- Prot: `BottomNav5.tsx`, `USER_TABS`
- Act: 모델만 스타일. href/label 복제 0. Visual Authority `매칭`/`자산`/`내 정보`를 USER_TABS에 복사 금지. 라벨/href=USER_TABS(`홈` `/` · `기회` `/profits` · `수익` `/trades` · `지갑` `/wallet` · `내정보` `/me`). 사이드바 AI/고객센터는 `T.home.sidebar`+선택 robot. MobileNav 재작성 0.
- Val: `pnpm verify:ia-tabs`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase3/sidebar-desktop/`
- PASS: 5탭=USER_TABS. `app-sidebar` class 0
- FAIL: 두 번째 탭 상수, HVR 아이콘 복사
- Rollback: Sidebar skeleton · UA: No · Next: HC3-03

#### HC3-03
- Phase: 3 · Title: AI Summary · Status: completed · Dep: HC3-02
- Purpose: AI 카드만.
- Allow: `HomeCleanAiSummary.tsx`, `HomeCleanCards.module.css`, `HomeCleanFixture.ts` AI 필드, `HomeCleanView.tsx` 슬롯, `home-clean-copy.ts`, `index.ts` export, `apps/web/app/dev/home-clean-v1/page.tsx` View 장착, `HomeCleanShell.tsx` 빈 AI region 제거
- Prot: `HomeExperience`, SDK, `packages/ui/copy/ko/**`
- Act: fixture 문자열. robot은 `home-clean-assets.ts`. AI 제목은 `home-clean-copy.ts` 상태별(loading=`퍼뜩 AI가 수익 기회를 찾고 있어요` · ready_data=`퍼뜩 AI가 발견한 기회`). 전 상태 `찾고 있어요` 고정 금지. `T.home` overwrite 0. Asset 동시 0. `HOME_V3_ASSET` import 0.
- Val: `pnpm verify:no-it-jargon`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase3/ai-summary/`
- PASS: AI 카드. 임의 로봇 0. live 0
- FAIL: 숫자 발명, AVM 마크업 복사
- Rollback: AiSummary 삭제 · UA: No · Next: HC3-04

#### HC3-04
- Phase: 3 · Title: Asset · Status: completed · Dep: HC3-03
- Purpose: 자산/원금/가능수익 슬롯.
- Allow: `HomeCleanAsset.tsx`, `HomeCleanCards.module.css`, `HomeCleanFixture.ts` 금액 문자열, `home-clean-copy.ts`, `HomeCleanView.tsx` 슬롯, `HomeCleanShell.tsx` 빈 money region 제거
- Prot: Money/SDK, `HomeMoneySurface`, `packages/ui/copy/ko/**`
- Act: fixture 문자열만. 섹션 제목=`내 자산`. 잔액 필드=`내 잔액`(전체 자산 위장 금지). `필요 원금`은 required principal 실값만. 계산 0. `KRW PRIMARY / USDT SECONDARY` 표시 의미 보존. `ledgerTotal` 의미를 이 todo에서 COUNT/Money로 단정 금지. `ACTUAL_PROFIT_BINDING=UNRESOLVED_SAFE_ABSENT`. 누락은 `—`/`확인 중`/`정보 없음`. 가짜 0 금지. Discovery 동시 0.
- Val: `pnpm verify:home-state-truth`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase3/asset/`
- PASS: 슬롯 존재. 계산/SDK 0
- FAIL: 잔액 UPDATE, wallet import
- Rollback: Asset 삭제 · UA: No · Next: HC3-05

#### HC3-05
- Phase: 3 · Title: Discovery · Status: completed · Dep: HC3-04
- Purpose: 참여 안내만.
- Allow: `HomeCleanDiscovery.tsx`, `HomeCleanCards.module.css`, `HomeCleanFixture.ts`, `HomeCleanView.tsx` 슬롯, `HomeCleanShell.tsx` 빈 discovery region 제거
- Prot: CTA 의미
- Act: `T.home.hero`. 새 영어 CTA 0. Canon `primaryCta`. copy 0. Products 동시 0.
- Val: `pnpm verify:cta-earn-profit`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase3/discovery/`
- PASS: Discovery 존재. CTA 의미 불변
- FAIL: 금지 CTA, 새 카피 SSOT
- Rollback: Discovery 삭제 · UA: No · Next: HC3-06

#### HC3-06
- Phase: 3 · Title: Products · Status: completed · Dep: HC3-05
- Purpose: Desktop 3카드만.
- Allow: `HomeCleanProducts.tsx`, `HomeCleanCards.module.css`, `HomeCleanFixture.ts` 3장, `home-clean-copy.ts`, `HomeCleanView.tsx` 슬롯, `HomeCleanShell.tsx` 빈 featured region 제거
- Prot: live `assetImageUrl` (Phase 6)
- Act: 승인 Product PNG 3장(시계/카드/가방). 임의 생성 0. live `assetImageUrl` 증거 위장 0. carousel은 Phase 4. Right Rail 동시 0.
- Val: `pnpm verify:product-image`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase3/products/`
- PASS: 3카드. 승인 family
- FAIL: 미선택 상품, 임의 일러스트
- Rollback: Products 삭제 · UA: No · Next: HC3-07

#### HC3-07
- Phase: 3 · Title: Right Rail · Status: completed · Dep: HC3-06
- Purpose: progress · update · trust · insight 슬롯만.
- Allow: `HomeCleanRightRail.tsx`, `HomeCleanCards.module.css`, `HomeCleanFixture.ts`, `home-clean-copy.ts`, `HomeCleanShell.tsx` rail 슬롯
- Prot: `HomeRightRail.tsx`, `packages/ui/copy/ko/**`
- Act: in-flow. 자체 vertical scroll 0. 제목=`home-clean-copy.ts` rail(`진행 중인 매칭` · `퍼뜩 업데이트` · `신뢰와 안전` · `인사이트 요약`). `T.home` overwrite 0. 선택 chart/clock/globe만. Desktop 전체 재배치 0.
- Val: `pnpm verify:no-it-jargon`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase3/right-rail/`
- PASS: rail 존재. 중첩 scroll 0
- FAIL: `top:650px`, AVM rail 복사
- Rollback: RightRail 삭제 · UA: No · Next: HC3-08

#### HC3-08
- Phase: 3 · Title: Desktop composition QA · Status: completed · Dep: HC3-07
- Purpose: 1440 Desktop 전체 조립 검사.
- Allow: `HomeCleanView.tsx` 조립, `playwright-home-clean-desktop.mjs`, `v1/phase3/desktop-qa/**`, `HomeCleanShell.module.css` asset-audit 비표시
- Prot: `/` page
- Act: Header→Rail 한 화면 존재. CTA in-view. overlay는 참고만. full matrix 금지. Visual PASS 선언 금지.
- Val: `node apps/web/app/dev/home-clean-v1/playwright-home-clean-desktop.mjs`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase3/desktop-qa/`
- PASS: 필수 영역 존재. overlap 0. fixture only
- FAIL: Visual PASS 선언, 21뷰 실행
- Rollback: View 조립 · UA: No · Next: HC3-08C1

#### HC3-08C1
- Phase: 3 · Title: Desktop column/density correction · Status: completed · Dep: HC3-08
- Purpose: 승인 원본 방향 3열 비율. Sidebar ~220px 계열. Main을 넓히고 Rail을 상대적으로 줄임. 세로 밀도 토큰.
- Allow: `HomeCleanTokens.module.css`, `HomeCleanShell.module.css`
- Prot: `lux-fintech.ts`, `component.css`, 고정 `width:1440px`, 전체 absolute, `top:650px`, Money/Engine/Auth/API, `T.home`, `USER_TABS`, commit/push, HC3-09 completed, HC3-10, Phase 4
- Act: HomeClean 전용 `--hc-sidebar-w` / `--hc-rail-*` / density token만. lux 전역 토큰 의미 변경 0.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 1440×1080 · Ev: 없음(C8에서 재조립)
- PASS: 페이지 전용 비율 토큰. 고정 canvas 0
- FAIL: lux 전역 변경, 1440 고정 canvas
- Rollback: 토큰 되돌림 · UA: No · Next: HC3-08C2

#### HC3-08C2
- Phase: 3 · Title: Header/Sidebar correction · Status: completed · Dep: HC3-08C1
- Purpose: bell SVG. 동적 profile pill(`사용자` fallback). Sidebar 도움 카드·고객센터 위계. 정적 김 0.
- Allow: `HomeCleanHeader.tsx`, `HomeCleanHeader.module.css`, `HomeCleanSidebar.tsx`, `HomeCleanNav.module.css`, `home-clean-ui-icons.tsx`, `home-clean-profile.ts`, `home-clean-copy.ts`
- Prot: `T.home`, `USER_TABS`, Brand Kit, 신규 raster, AppHeader, HomeChrome
- Act: `HOME_CLEAN_CODE_NATIVE_UI_ICON_APPROVED` bell만. identity resolver. Sidebar는 USER_TABS 라벨 유지.
- Val: `pnpm verify:no-it-jargon` · URL: `/dev/home-clean-v1` · VP: 1440×1080
- PASS: 빈 bell 원 0. pill에 동적 이름/fallback. 김 0
- FAIL: 정적 김, 전역 아이콘 시스템 변경
- Rollback: Header/Sidebar 되돌림 · UA: No · Next: HC3-08C3

#### HC3-08C3
- Phase: 3 · Title: AI Summary correction · Status: completed · Dep: HC3-08C2
- Purpose: Robot을 핵심 시각으로. 왼쪽 headline/status · 우측 3지표 패널.
- Allow: `HomeCleanAiSummary.tsx`, `HomeCleanCards.module.css`, `home-clean-copy.ts`
- Prot: 목업 숫자 복사, Money/FX, `HOME_V3_ASSET`, `T.home` overwrite
- Act: fixture `확인 중` 유지. 승인 Desktop Search Robot만.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 1440×1080
- PASS: Robot 핵심 배치. 가짜 런타임 숫자 0
- FAIL: 목업 건수/초 복사
- Rollback: AI Summary 되돌림 · UA: No · Next: HC3-08C4

#### HC3-08C4
- Phase: 3 · Title: Asset correction · Status: completed · Dep: HC3-08C3
- Purpose: 점선 `MISSING_VISUAL_ASSET` 0. KRW PRIMARY / USDT SECONDARY 표시. decorative/loading trend.
- Allow: `HomeCleanAsset.tsx`, `HomeCleanCards.module.css`, `home-clean-ui-icons.tsx`, `home-clean-copy.ts`
- Prot: Money/FX/Ledger 계산, 실데이터 위장 숫자, 신규 raster
- Act: code-native trend line. 표시 단위만. 계산 0.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 1440×1080
- PASS: 빈 점선 슬롯 0. 계산 0
- FAIL: 가짜 잔액, FX 변환
- Rollback: Asset 되돌림 · UA: No · Next: HC3-08C5

#### HC3-08C5
- Phase: 3 · Title: Discovery/Category correction · Status: completed · Dep: HC3-08C4
- Purpose: `전체 · 시계 · 카드 · 가방` chips. Discovery를 추천 기회 compact intro로 통합.
- Allow: `HomeCleanDiscovery.tsx`, `HomeCleanCategoryChips.tsx`, `HomeCleanView.tsx`, `HomeCleanCards.module.css`, `home-clean-copy.ts`
- Prot: `T.home` overwrite, CTA href 변경, 가짜 server filtering
- Act: HomeClean 전용 copy. 선택 chip만 보라색. href=`T.home.hero.ctaHref` 불변.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 1440×1080
- PASS: chips 존재. 대형 Discovery로 Products 밀림 0
- FAIL: T.home 수정, 가짜 필터 API
- Rollback: Discovery/chips 되돌림 · UA: No · Next: HC3-08C6

#### HC3-08C6
- Phase: 3 · Title: Products correction · Status: completed · Dep: HC3-08C5
- Purpose: 1440×1080에서 상품 3개 이미지+필요 원금+예상 수익+예상 시간+CTA 확인.
- Allow: `HomeCleanProducts.tsx`, `HomeCleanCards.module.css`
- Prot: 승인 외 Product PNG, 가짜 금액, CTA href 변경
- Act: 세로 밀도만. 값 없으면 `정보 없음`/`확인 중`.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 1440×1080
- PASS: 3카드 핵심 정보+CTA in-view 후보
- FAIL: 목업 숫자, 임의 상품 이미지
- Rollback: Products 되돌림 · UA: No · Next: HC3-08C7

#### HC3-08C7
- Phase: 3 · Title: Right Rail correction · Status: completed · Dep: HC3-08C6
- Purpose: progress/update/trust/insight 아이콘·강조·간격. empty state 유지.
- Allow: `HomeCleanRightRail.tsx`, `HomeCleanCards.module.css`, `home-clean-ui-icons.tsx`
- Prot: 가짜 진행 단계/숫자, rail 자체 vertical scroll, `top:650px`
- Act: code-native 소형 아이콘. 데이터 없으면 empty copy 유지.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 1440×1080
- PASS: 위계 보완. 가짜 숫자 0. 중첩 scroll 0
- FAIL: 가짜 stepper 숫자
- Rollback: RightRail 되돌림 · UA: No · Next: HC3-08C8

#### HC3-08C8
- Phase: 3 · Title: Desktop 재조립 QA · Status: completed · Dep: HC3-08C7
- Purpose: 새 1440 캡처 + side-by-side + 50% overlay. Visual PASS 선언 금지.
- Allow: `playwright-home-clean-desktop-correction.mjs`, `_tmp_home_clean/v1/phase3/desktop-correction/**`, `USER_DESKTOP_REVIEW.md`
- Prot: Visual PASS 선언, HC3-09 completed, HC3-10, Phase 4, commit/push
- Act: fixture/session/route/viewport 기록. 남은 시각 차이 목록. 사용자 재승인 대기.
- Val: `node apps/web/app/dev/home-clean-v1/playwright-home-clean-desktop-correction.mjs`
- URL: `/dev/home-clean-v1` · VP: 1440×1080 · Ev: `v1/phase3/desktop-correction/`
- PASS: 캡처·비교 증거 존재. Visual PASS 미선언
- FAIL: 자동 승인, Phase 4 진입
- Rollback: QA 파일만 · UA: No · Next: HC3-09

#### HC3-09
- Phase: 3 · Title: 사용자 Desktop 육안 · Status: completed · Dep: HC3-08C8
- Purpose: 승인 전 Phase 4 금지. 에이전트 자동 완료 금지.
- Allow: `_tmp_home_clean/v1/phase3/USER_DESKTOP_REVIEW.md`
- Prot: 구현 수정 0 · HC3-10 · Phase 4
- Act: 1440 캡처 경로 제시. 수치만 맞고 구조가 다르면 결함 보고. 승인 전 HC3-10 PASS 금지.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 1440×1080 · Ev: `v1/phase3/USER_DESKTOP_REVIEW.md`
- PASS: 사용자 Desktop 승인 문장
- FAIL: 에이전트 자동 승인, 승인 전 Phase 4. 선행 FAIL 기록=`HOME_CLEAN_HC3_09_DESKTOP_VISUAL_FAIL`
- Rollback: 없음 · UA: **Yes** · Next: HC3-10

#### HC3-10
- Phase: 3 · Title: Desktop gate · Status: completed · Dep: HC3-09
- Purpose: `HOME_CLEAN_DESKTOP_READY_FOR_USER_REVIEW`.
- Allow: `_tmp_home_clean/v1/phase3/GATE.md`
- Act: HC3-01~09 + 사용자 승인. `verify:gate:fast` 보고. commit 0.
- Val: `pnpm verify:gate:fast`
- URL: `/dev/home-clean-v1` · VP: 1440×1080 · Ev: `v1/phase3/GATE.md`
- PASS: Desktop 7영역 + 사용자 승인
- FAIL: 승인 없음
- Rollback: 해당 카드 · UA: No · Next: HC4-01

---

### Phase 4

둘째 Home tree 금지. 같은 컴포넌트 CSS/presentation만. JS viewport 분기 0.

#### HC4-01
- Phase: 4 · Title: Mobile Header · Status: completed · Dep: HC3-10
- Purpose: `HomeCleanHeader` Mobile 시각만.
- Allow: `HomeCleanHeader.tsx`, `HomeCleanResponsive.module.css`
- Prot: Desktop Header 구조 삭제 금지
- Act: `HomeCleanMobileHeader.tsx` 신설 0. 390에서 greeting/bell/profile 잘림 0. AI 동시 변경 0.
- Val: `pnpm verify:no-it-jargon`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase4/mobile-header/`
- PASS: 390 Header 필수 정보 잔존. Desktop 유지
- FAIL: 둘째 Header 트리, 정보 삭제
- Rollback: Header responsive CSS · UA: No · Next: HC4-02

#### HC4-02
- Phase: 4 · Title: Mobile AI · Status: completed · Dep: HC4-01
- Purpose: AI Summary Mobile composition.
- Allow: `HomeCleanAiSummary.tsx`, `HomeCleanResponsive.module.css`
- Prot: Desktop AI 정보 삭제 금지
- Act: 390에서 robot/카피/건수 잔존. 선택 mobile robot이 있으면 그 URL만. Asset 동시 0.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase4/mobile-ai/`
- PASS: 390 AI 필수 정보 잔존
- FAIL: 둘째 AI 트리, 정보 삭제
- Rollback: AI responsive CSS · UA: No · Next: HC4-03

#### HC4-03
- Phase: 4 · Title: Mobile Asset · Status: completed · Dep: HC4-02
- Purpose: Asset Mobile composition.
- Allow: `HomeCleanAsset.tsx`, `HomeCleanResponsive.module.css`
- Prot: 금액 의미
- Act: 390에서 원금/가능수익 잘림 0. 숫자 변경 0. Carousel 동시 0.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase4/mobile-asset/`
- PASS: 390 Asset 슬롯 잔존
- FAIL: 금액 삭제, 새 계산
- Rollback: Asset responsive CSS · UA: No · Next: HC4-04

#### HC4-04
- Phase: 4 · Title: Featured Carousel · Status: completed · Dep: HC4-03
- Purpose: Products Mobile overflow-x만.
- Allow: `HomeCleanProducts.tsx`, `HomeCleanResponsive.module.css`
- Prot: Desktop 3카드 그리드 삭제 금지
- Act: 같은 Products 노드에 overflow-x만. 둘째 상품 트리 0. Progress 동시 0.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase4/carousel/`
- PASS: 390 가로 스와이프. Desktop 그리드 유지
- FAIL: 이중 Products, 상품 정보 삭제
- Rollback: carousel CSS · UA: No · Next: HC4-05

#### HC4-05
- Phase: 4 · Title: Progress · Status: completed · Dep: HC4-04
- Purpose: Right Rail progress를 Mobile 흐름에.
- Allow: `HomeCleanRightRail.tsx`, Responsive/Shell CSS
- Prot: progress 단계 의미
- Act: 390에서 progress가 document 흐름. 새 Progress 컴포넌트 0. Trust 동시 마감 0.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase4/progress/`
- PASS: 390 progress 잔존. rail 자체 scroll 0
- FAIL: 정보 삭제, 둘째 progress 트리
- Rollback: progress 배치 CSS · UA: No · Next: HC4-06

#### HC4-06
- Phase: 4 · Title: Trust/System · Status: completed · Dep: HC4-05
- Purpose: trust/update/insight Mobile 배치.
- Allow: `HomeCleanRightRail.tsx`, `HomeCleanResponsive.module.css`
- Prot: trust copy 의미
- Act: 390 trust/system 잔존. Bottom Nav 동시 마감 0.
- Val: `pnpm verify:trust-copy`
- URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase4/trust/`
- PASS: 390 trust 잔존
- FAIL: 면책 삭제, 새 영어 카피
- Rollback: trust 배치 CSS · UA: No · Next: HC4-07

#### HC4-07
- Phase: 4 · Title: Bottom Navigation 시각 · Status: completed · Dep: HC4-06
- Purpose: Phase 2 Mobile Nav 시각 마감.
- Allow: `HomeCleanMobileNav.tsx`, `HomeCleanNav.module.css`
- Prot: NavigationModel 의미, `USER_TABS`
- Act: 아이콘/라벨 소스 복제 0. 390 nav 1. 1440 hidden/inert/aria-hidden 유지. Landscape 동시 0.
- Val: `pnpm verify:ia-tabs`
- URL: `/dev/home-clean-v1` · VP: 390×693, 1440×1080 · Ev: `v1/phase4/bottom-nav/`
- PASS: 5탭 href 일치. 이중 읽기 0. 터치 44~48
- FAIL: 새 탭 데이터, BottomNav5 재사용
- Rollback: MobileNav 시각을 skeleton · UA: No · Next: HC4-08

#### HC4-08
- Phase: 4 · Title: Mobile first-view QA · Status: completed · Dep: HC4-07
- Purpose: 390 first view 필수 정보.
- Allow: `playwright-home-clean-responsive.mjs` first-view, `v1/phase4/first-view/**`
- Act: 390에서 Header/AI/Asset/Products/Progress/Trust/BottomNav 존재. safe-area, clipping, nav overlap. full matrix 금지.
- Val: `node apps/web/app/dev/home-clean-v1/playwright-home-clean-responsive.mjs --first-view`
- URL: `/dev/home-clean-v1` · VP: 390×693 · Ev: `v1/phase4/first-view/`
- PASS: 390 필수 정보 잔존. overflow 0
- FAIL: first view 핵심 카드 소실
- Rollback: Phase 4 원인 CSS · UA: No · Next: HC4-09

#### HC4-09
- Phase: 4 · Title: Landscape/Tablet · Status: completed · Dep: HC4-08
- Purpose: 짧은 가로·태블릿 Shell.
- Allow: Responsive/Shell CSS
- Prot: Desktop 1440 구조 삭제 금지
- Act: 아래 viewport만. Ultrawide 동시 0.
- Val: responsive 스크립트 landscape/tablet
- URL: `/dev/home-clean-v1`
- VP: 568×320, 667×375, 844×390, 932×430, 600×960, 768×1024, 820×1180, 1024×1366
- Ev: `v1/phase4/landscape-tablet/`
- PASS: overflow/overlap 0. 정보 삭제 0
- FAIL: 가로모드 nav가 콘텐츠 영구 가림
- Rollback: 해당 CSS · UA: No · Next: HC4-10

#### HC4-10
- Phase: 4 · Title: Intermediate Desktop · Status: completed · Dep: HC4-09
- Purpose: 1024~1366 중간 깨짐 제거.
- Allow: Responsive/Shell CSS
- Prot: 1440 composition 삭제 금지
- Act: Tailwind `lg:1280`에 의존해 1024를 버리지 않음. HomeClean CSS가 1024 소유. Ultrawide 동시 0.
- Val: responsive 스크립트 intermediate
- URL: `/dev/home-clean-v1` · VP: 1024×768, 1280×720, 1366×768 · Ev: `v1/phase4/intermediate-desktop/`
- PASS: 1024 필수 영역 잔존. 가로 overflow 0
- FAIL: 1024 미지원으로 방치
- Rollback: 해당 CSS · UA: No · Next: HC4-11

#### HC4-11
- Phase: 4 · Title: Ultrawide · Status: completed · Dep: HC4-10
- Purpose: 무한 stretch 금지.
- Allow: Shell/Responsive CSS
- Prot: `CONTENT_RAIL.maxWidthPx`, `lux-fintech.ts`
- Act: `max-width`를 1680 또는 `--hc-max`. 5120에서 카드 전체 stretch 0.
- Val: responsive 스크립트 ultrawide
- URL: `/dev/home-clean-v1` · VP: 1920×1080, 2560×1440, 3440×1440, 3840×2160, 5120×1440
- Ev: `v1/phase4/ultrawide/`
- PASS: clamp. 무한 stretch 0
- FAIL: 5120 가독성 붕괴 무시
- Rollback: max-width CSS · UA: No · Next: HC4-12

#### HC4-12
- Phase: 4 · Title: 사용자 Responsive 육안 · Status: completed · Dep: HC4-11
- Purpose: 승인 전 Phase 5 금지.
- Allow: `_tmp_home_clean/v1/phase4/USER_RESPONSIVE_REVIEW.md`
- Prot: 구현 수정 0
- Act: 390·tablet·desktop 캡처 제시. 승인 전 HC4-13 PASS 금지.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 390/768/1440 · Ev: `v1/phase4/USER_RESPONSIVE_REVIEW.md`
- PASS: 사용자 Responsive 승인
- FAIL: 자동 승인
- Rollback: 없음 · UA: **Yes** · Next: HC4-13

#### HC4-13
- Phase: 4 · Title: Responsive gate · Status: pending · Dep: HC4-12
- Purpose: `HOME_CLEAN_RESPONSIVE_READY_FOR_USER_REVIEW`.
- Allow: `_tmp_home_clean/v1/phase4/GATE.md`
- Act: HC4-01~12 + 승인. `verify:gate:fast` 보고. commit 0.
- Val: `pnpm verify:gate:fast`
- URL: `/dev/home-clean-v1` · VP: Phase 4 사용 뷰 (full matrix는 P5) · Ev: `v1/phase4/GATE.md`
- PASS: Mobile~Ultrawide + 사용자 승인
- FAIL: 승인 없음, 이중 Home tree
- Rollback: Phase 4 CSS · UA: No · Next: HC5-01

---

### Phase 5

#### HC5-01
- Phase: 5 · Title: authority image normalization · Status: completed · Dep: HC4-13
- Purpose: overlay 참고 이미지를 비교 가능 크기로. 레포 mockup 경로 0.
- Allow: `_tmp_home_clean/v1/phase5/authority/**` (`mockup` 이름 금지)
- Prot: `docs/mockups/**` 생성 금지, Canon evidence
- Act: HC25-05에서 승인된 Desktop/Mobile Visual Authority만 `_tmp`에 복사·리사이즈. Figma V4/H7/HVR/과거 overlay/contact-sheet를 새 권위로 쓰지 않음. overlay를 SSOT로 쓰지 않음.
- Val: `pnpm verify:mockup-governance`
- URL: 없음 · VP: 390, 1440 · Ev: `v1/phase5/authority/`
- PASS: `_tmp`만. mockup-governance PASS
- FAIL: docs/mockups, Canon 승격
- Rollback: authority 폴더 · UA: No · Next: HC5-02

#### HC5-02
- Phase: 5 · Title: Desktop overlay · Status: completed · Dep: HC5-01
- Purpose: 1440 overlay. 참고. SSOT 아님.
- Allow: qa 스크립트 desktop overlay, `v1/phase5/overlay-desktop/**`
- Prot: Canon, visual-locks
- Act: 승인 Visual Authority와 same-run 1440 캡처+overlay/diff를 `_tmp`. 불일치는 결함 후보. overlay는 QA 증거일 뿐 새 권위 아님. locks 0. Visual diff 수치만으로 PASS 금지.
- Val: `node apps/web/app/dev/home-clean-v1/playwright-home-clean-qa.mjs --overlay-desktop`
- URL: `/dev/home-clean-v1` · VP: 1440×1080 · Ev: `v1/phase5/overlay-desktop/`
- PASS: overlay 존재. SSOT 선언 0
- FAIL: overlay를 Visual PASS
- Rollback: overlay 파일 · UA: No · Next: HC5-03

#### HC5-03
- Phase: 5 · Title: Mobile overlay · Status: completed · Dep: HC5-02
- Purpose: 390 overlay. Desktop 축소 적용 금지.
- Allow: qa mobile overlay, `v1/phase5/overlay-mobile/**`
- Act: 390×693만. Desktop/Mobile은 same-run 캡처. Desktop 캡처를 Mobile PASS로 쓰지 않음. overlay는 승인 Mobile authority QA만.
- Val: `node apps/web/app/dev/home-clean-v1/playwright-home-clean-qa.mjs --overlay-mobile`
- URL: `/dev/home-clean-v1` · VP: 390×693 · Ev: `v1/phase5/overlay-mobile/`
- PASS: Mobile overlay. Desktop 전용 판정 0
- FAIL: Desktop 이미지를 Mobile SSOT
- Rollback: overlay-mobile · UA: No · Next: HC5-04

#### HC5-04
- Phase: 5 · Title: full viewport matrix · Status: completed · Dep: HC5-03
- Purpose: 최종 matrix 생략 금지.
- Allow: qa `--matrix`, `v1/phase5/matrix/**`
- Act: §9 전 목록. workers=1. overflow/clip/overlap/CTA/BottomNav 가림/safe-area/img distortion/nav landmark 1/fixed가림/긴 한국어/큰 Money/pageerror. OOM이면 `BLOCKED_LOCAL_OOM`. 생략 뷰를 PASS로 채우지 않음. Desktop/Mobile same-run.
- Val: `node apps/web/app/dev/home-clean-v1/playwright-home-clean-qa.mjs --matrix`
- URL: `/dev/home-clean-v1` · VP: §9 Final matrix 전부 · Ev: `v1/phase5/matrix/`
- PASS: 전 뷰 기록. 실패는 FAIL. 생략 0 또는 blocker
- FAIL: 390/1440만 실행하고 PASS
- Rollback: matrix 산출물 · UA: No · Next: HC5-05

#### HC5-05
- Phase: 5 · Title: zoom / a11y · Status: completed · Dep: HC5-04
- Purpose: 확대·키보드·landmark.
- Allow: qa `--a11y`, `v1/phase5/a11y/**`
- Prot: copy SSOT
- Act: landmark, h1 1, Button vs Link, `:focus-visible`, keyboard, alt, touch 최소 44. zoom 125/150/200. 긴 카피·큰 숫자. `prefers-reduced-motion`. nav landmark viewport당 1. console error 0. hydration warning 0.
- Val: `node apps/web/app/dev/home-clean-v1/playwright-home-clean-qa.mjs --a11y`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase5/a11y/`
- PASS: 항목 기록. 이중 nav 0
- FAIL: canvas/resize listener, 포커스 함정
- Rollback: 해당 컴포넌트 a11y · UA: No · Next: HC5-06

#### HC5-06
- Phase: 5 · Title: performance / device tier · Status: completed · Dep: HC5-05
- Purpose: 새 heavy dep 없이 핵심 UX.
- Allow: `_tmp_home_clean/v1/phase5/perf.md`
- Prot: `ppe-ladder.ts`, Visual 다운그레이드 금지
- Act: WebGL/3D/heavy dep 소스 검색 0이어야 함. `html[data-tier=b]`에서 핵심 정보 소실 기록. 로컬 느림으로 시각 삭감 금지. 필요 시 `VISUAL_PERFORMANCE_CONFLICT`로 정지. money count-up/도박형 motion 0.
- Val: 소스 검색 + qa `--perf`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase5/perf.md`
- PASS: heavy dep 0. tier b 핵심 잔존 또는 충돌 보고
- FAIL: 성능 이유로 시각 일방 삭감
- Rollback: 삭감한 시각 복구 · UA: conflict면 Yes · Next: HC5-07

#### HC5-07
- Phase: 5 · Title: cross-browser smoke · Status: completed · Dep: HC5-06
- Purpose: 설치된 브라우저만. 미설치 ≠ PASS.
- Allow: `_tmp_home_clean/v1/phase5/browsers.md`
- Act: Chromium 필수. Firefox/WebKit는 설치 시에만 390·1440. 미설치는 `SKIPPED_BROWSER_NOT_INSTALLED`.
- Val: qa `--browsers`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase5/browsers.md`
- PASS: Chromium 기록. 나머지는 실행 또는 SKIP 명시
- FAIL: 미설치를 PASS
- Rollback: 없음 · UA: No · Next: HC5-08

#### HC5-08
- Phase: 5 · Title: 기존 route 회귀 · Status: completed · Dep: HC5-07
- Purpose: `/`와 5탭 불변.
- Allow: `v1/phase5/regression/**`
- Act: `/` `/profits` `/trades` `/wallet` `/me` `/auth/login` chrome 존재. Phase 0 비교. `/` render 변경 0.
- Val: `pnpm verify:ia-tabs`, `pnpm verify:part5-shell-toast`, `pnpm verify:home-live-wire`
- URL: 위 6경로 · VP: 390, 1440 · Ev: `v1/phase5/regression/`
- PASS: 기존 chrome. `/`는 HomePageClient
- FAIL: 5탭 chrome 소실, `/` 무단 교체
- Rollback: AppShell/Clean 원인 · UA: No · Next: HC5-09

#### HC5-09
- Phase: 5 · Title: 사용자 최종 시각 · Status: completed · Dep: HC5-08
- Purpose: 승인 전 Phase 6 금지. READY ≠ Visual PASS.
- Allow: `_tmp_home_clean/v1/phase5/USER_VISUAL_REVIEW.md`
- Prot: visual-locks 0
- Act: overlay·matrix·a11y 경로 제시. Visual PASS 선언 금지.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase5/USER_VISUAL_REVIEW.md`
- PASS: 사용자 최종 시각 승인
- FAIL: 에이전트 Visual PASS
- Rollback: 없음 · UA: **Yes** · Next: HC5-10

#### HC5-10
- Phase: 5 · Title: final visual review gate · Status: completed · Dep: HC5-09
- Purpose: `HOME_CLEAN_V1_READY_FOR_USER_REVIEW`. Visual PASS 아님.
- Allow: `_tmp_home_clean/v1/phase5/GATE.md`
- Prot: Canon, visual-locks
- Act: HC5-01~09 + 승인. Canon 승격 0. `verify:gate:fast` 보고. commit 0.
- Val: `pnpm verify:gate:fast`, `pnpm verify:mockup-governance`
- URL: `/dev/home-clean-v1` · VP: HC5-04 증거 재사용 · Ev: `v1/phase5/GATE.md`
- PASS: QA + 사용자 승인. locks 0
- FAIL: Canon 승격, locks, 승인 없음
- Rollback: Phase 5 `_tmp` · UA: No · Next: HC6-01

---

### Phase 6

SDK · Nest · DB 0. `/dev/home-clean-v1` fixture 유지.

#### HC6-01
- Phase: 6 · Title: view-model contract · Status: completed · Dep: HC5-10
- Purpose: `HomeCleanViewModel` 정의만.
- Allow: `packages/ui/components/home-clean-v1/home-clean.types.ts`
- Prot: `@aipo/sdk/home-read-model` 타입
- Act: 표시 필드만. SDK 타입 재수출로 계약 변경 0. mapper/adapter 이 todo 0.
- Val: 없음 · URL: 없음 · VP: 없음 · Ev: `v1/phase6/view-model.md`
- PASS: 타입만. SDK diff 0
- FAIL: SDK 필드 추가/삭제
- Rollback: 타입 추가분 · UA: No · Next: HC6-02

#### HC6-02
- Phase: 6 · Title: read-model mapper · Status: completed · Dep: HC6-01
- Purpose: 순수 매퍼만.
- Allow: `apps/web/app/home-clean/mapHomeReadModelToCleanViewModel.ts`
- Prot: SDK, Nest, `HomePageClient.tsx` 이 todo 0
- Act: 기존 fetch/`toOpportunityCardModel` 재사용. 순수 함수. 네트워크 0. viewer 필드는 저장소 실측 후 adapter 매핑(추측 API 0). `ledgerTotal` 의미를 실측 전 COUNT/Money로 단정 금지. 가짜 0 금지. JPY/KRW runtime 변경 0.
- Val: `pnpm verify:home-live-wire`
- URL: 없음 · VP: 없음 · Ev: `v1/phase6/mapper.md`
- PASS: 매퍼 존재. SDK 0. HomePageClient 0
- FAIL: SDK 수정, 추정 값
- Rollback: mapper 삭제 · UA: No · Next: HC6-03

#### HC6-03
- Phase: 6 · Title: live data adapter · Status: completed · Dep: HC6-02
- Purpose: adapter만. `/` 불변.
- Allow: `apps/web/app/home-clean/HomeCleanDataAdapter.tsx`
- Prot: `apps/web/app/page.tsx`, SDK
- Act: HomePageClient 이관 금지. adapter 신설. 명시적 fixture/live mode. `/dev` 기본 `fixture`. production `/`에서 fixture 선택 시 fail-closed. `/` 0. SSE 0. production fixture fallback 0.
- Val: `pnpm verify:home-live-wire`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase6/adapter.md`
- PASS: adapter. `/`는 HomePageClient. fixture 유지
- FAIL: `/` 무단 교체, SSE
- Rollback: adapter 삭제 · UA: No · Next: HC6-04

#### HC6-04
- Phase: 6 · Title: session/loading/error/empty · Status: completed · Dep: HC6-03
- Purpose: 가짜 성공 0.
- Allow: adapter, `HomeCleanView` 상태 슬롯, 새 배너(레거시 `HomeSessionBanner` 마크업 복사 금지)
- Prot: Auth 의미, `T.home.session`
- Act: `hasUserSessionCookie`/`HomeSessionStatus`/`HomeViewState` 재사용. 7 view(`loading` 포함)+3 session 전부 표시·의미 검증. 게스트≠만료. ready_empty 위장 금지. stale=`asOf`. recoverable_error=재시도. blocked 사유 추측 0. unauthorized=인증 흐름. 누락 숫자 0 위조 금지. 동적 viewer identity. 정적 `김` 0. Robot≠user.
- Val: `pnpm verify:no-fake-zero-status`, `pnpm verify:auth-session-cookie`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase6/states/`
- PASS: 7 view states + 3 session states 구분. 가짜 성공 0
- FAIL: 5상태만 검증, 빈 화면을 수익 0 위장, 게스트=만료
- Rollback: 상태 슬롯 · UA: No · Next: HC6-05

#### HC6-05
- Phase: 6 · Title: CTA/navigation handlers · Status: completed · Dep: HC6-04
- Purpose: 실href. 무동작 0.
- Allow: Clean Link/handler, adapter
- Prot: `USER_TABS`, CTA 카피
- Act: 선행 inventory: `/profits` `/wallet/deposit` `/me/inbox` `/me` `/me/support` `T.home.hero.ctaHref`의 page.tsx·registry·auth·guest·의미·stub·verifier. 없으면 `BLOCKED_CTA_ROUTE_MISSING`. 경로 신설/임의 대체 0. 확인된 href/handler만. HomeChromeContext 0. 빈 onClick 0.
- Val: `pnpm verify:cta-earn-profit`, `pnpm verify:stub-page-actions`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase6/handlers.md`
- PASS: 각 CTA 실href
- FAIL: 죽은 버튼, 금지 CTA
- Rollback: handler · UA: No · Next: HC6-06

#### HC6-06
- Phase: 6 · Title: fixture/live parity · Status: completed · Dep: HC6-05
- Purpose: 같은 View 1개.
- Allow: dev `page.tsx` 스위치, adapter, `v1/phase6/parity.md`
- Prot: `apps/web/app/page.tsx`
- Act: 명시적 fixture/live 타입. `/dev` 기본 fixture. production `/`는 이 todo에서 live 연결 금지. live여도 `HomeCleanView` 1개. fixture/live 전용 둘째 트리 0. live 숫자를 fixture에 복사 금지. production fixture fallback 0.
- Val: `pnpm verify:home-state-truth`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase6/parity.md`
- PASS: View 1. fixture 유지. `/` 불변
- FAIL: live 전용 둘째 Home tree
- Rollback: 스위치 제거 · UA: No · Next: HC6-07

#### HC6-07
- Phase: 6 · Title: runtime regression · Status: completed · Dep: HC6-06
- Purpose: 기존 `/` live wire 유지.
- Allow: `v1/phase6/runtime-regression/**`
- Act: `/`는 HomePageClient. home-live-wire/state-truth/principal-slots. SSE 신설 검색 0. OpenNext/Cloudflare 필수: `pnpm --filter @aipo/web build:cf` 또는 사용자 지시 CI `verify:opennext-build` 로그. win32 SKIP≠PASS. 임의 push 0. 미완료면 `BLOCKED_CLOUDFLARE_BUILD_VERIFICATION` — Phase 7 금지.
- Val: `pnpm verify:home-live-wire`, `pnpm verify:home-state-truth`, `pnpm verify:home-principal-slots`, OpenNext 증거
- URL: `/`, `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase6/runtime-regression/`
- PASS: `/` live 불변. Clean fixture 유지. OpenNext 증거
- FAIL: `/` 파괴, SKIP을 PASS, OpenNext 없이 Phase 7
- Rollback: adapter/mapper · UA: No · Next: HC6-08

#### HC6-08
- Phase: 6 · Title: 사용자 runtime 리뷰 · Status: completed · Dep: HC6-07
- Purpose: 승인 전 Phase 7 금지.
- Allow: `_tmp_home_clean/v1/phase6/USER_RUNTIME_REVIEW.md`
- Prot: `/` page
- Act: fixture/live 사용법 기록. `/` cutover 이 todo 0.
- Val: 없음 · URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase6/USER_RUNTIME_REVIEW.md`
- PASS: 사용자 runtime 승인
- FAIL: 승인 전 `/` 변경
- Rollback: 없음 · UA: **Yes** · Next: HC6-09

#### HC6-09
- Phase: 6 · Title: runtime gate · Status: pending · Dep: HC6-08
- Purpose: `HOME_CLEAN_RUNTIME_READY_FOR_USER_REVIEW`.
- Allow: `_tmp_home_clean/v1/phase6/GATE.md`
- Prot: `/` page
- Act: HC6-01~08 + 승인 + OpenNext 증거. `verify:gate:fast` 보고. commit 0.
- Val: `pnpm verify:gate:fast`, `pnpm verify:home-live-wire`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase6/GATE.md`
- PASS: adapter+7/3상태+CTA inventory+handler+OpenNext+승인. `/` 불변
- FAIL: `/` 변경, SDK 변경, production fixture, OpenNext 없음
- Rollback: `apps/web/app/home-clean/` · UA: No · Next: HC7-01

---

### Phase 7

HC7-03과 구 HC7-04를 합치는 이유: `/`만 View로 바꾸면 AppShell+HomeCleanShell 이중 Shell. `/`만 bare하고 page가 HomePageClient면 Shell 0. 중간 커밋/배포 금지. **HC7-04는 실행 항목이 아니다.** frontmatter에도 없다.

#### HC7-01
- Phase: 7 · Title: cutover diff plan · Status: pending · Dep: HC6-09
- Purpose: 바꿀 파일과 rollback을 실행 전 고정.
- Allow: `_tmp_home_clean/v1/phase7/CUTOVER_DIFF_PLAN.md`
- Prot: `page.tsx`, `shell-bare-paths.ts` 이 todo 수정 0
- Act: 변경 예정 2파일만. 변경 전 내용/hash 기록. page는 live adapter를 **명시** 호출(`fixture` 선택 불가). `HomePageClient` 삭제 0. `SHELL_BARE_PATHS`에 `"/"` exact 추가. OpenNext 증거 재확인. 레거시 삭제 0.
- Val: 없음 · URL: 없음 · VP: 없음 · Ev: `v1/phase7/CUTOVER_DIFF_PLAN.md`
- PASS: 두 파일 변경안+rollback 기록
- FAIL: 이 todo에서 실제 수정
- Rollback: MD 삭제 · UA: No · Next: HC7-02

#### HC7-02
- Phase: 7 · Title: 사용자 cutover 승인 · Status: pending · Dep: HC7-01
- Purpose: `/` 변경 전 명시 승인.
- Allow: `_tmp_home_clean/v1/phase7/USER_CUTOVER_APPROVAL.md`
- Prot: page/bare 수정 0
- Act: Option A만 제시. Option B를 기본 후보로 제시 금지. 승인 전 HC7-03 금지.
- Val: 없음 · URL: 없음 · VP: 없음 · Ev: `v1/phase7/USER_CUTOVER_APPROVAL.md`
- PASS: 사용자 cutover 승인
- FAIL: 승인 전 `/` 수정
- Rollback: 없음 · UA: **Yes** · Next: HC7-03

#### HC7-03
- Phase: 7 · Title: `/` render + `/` exact bare atomic · Status: pending · Dep: HC7-02
- Purpose: 이중 Shell/Shell 0 없는 한 단위.
- Allow: `apps/web/app/page.tsx`, `packages/ui/components/shell/shell-bare-paths.ts`
- Prot: `HomePageClient.tsx`, `HomeExperience`, H7/HVR, `component.css`
- Act: 같은 작업 단위에서만 두 파일 수정. 한 파일만 바뀐 중간 상태를 완료로 보고 금지. 하나 먼저 커밋/푸시 금지. page는 **explicit live** adapter. production `/` fixture 데이터 0. `NO_FAKE_RUNTIME_DATA`. read model 실패를 fixture 성공으로 대체 금지. `hasUserSessionCookie` 유지. bare paths는 `"/dev/home-clean-v1"`과 `"/"` exact. `/dev`는 fixture 검수 유지. `HomePageClient` 파일 삭제 0. `/`에서 이중 header면 즉시 두 파일 rollback(reset/restore/checkout 금지).
- Val: `pnpm verify:ia-tabs`, `pnpm verify:part5-shell-toast`, `pnpm verify:home-live-wire`
- URL: `/`, `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase7/atomic-cutover.md`
- PASS: `/`에 Clean Shell만. 구 app-header/sidebar/site-footer 0. `/dev` 동일. HomePageClient 파일 존재
- FAIL: 한 파일만 변경 후 중단, 이중 Shell, Shell 0
- Rollback: 두 파일 동시 revert · UA: No · Next: HC7-05

#### HC7-05
- Phase: 7 · Title: 전체 사용자 route 회귀 · Status: pending · Dep: HC7-03
- Purpose: 5탭·nested·auth.
- Allow: `v1/phase7/full-regression/**`
- Act: `/` `/profits` `/trades` `/wallet` `/me` `/auth/login` `/wallet/deposit` `/me/inbox`. `/`는 Clean chrome. 다른 탭은 구 AppShell. Clean nav href 실제 이동.
- Val: `pnpm verify:ia-tabs`, `pnpm verify:part5-shell-toast`, `pnpm verify:home-live-wire`, `pnpm verify:wallet-live-wire`, `pnpm verify:profits-live-wire`
- URL: 위 목록 · VP: 390, 1440 · Ev: `v1/phase7/full-regression/`
- PASS: `/` Clean only. 다른 탭 구 chrome. 이동 가능
- FAIL: 전 탭 chrome 소실, `/` 이중 chrome
- Rollback: HC7-03 두 파일 · UA: No · Next: HC7-06

#### HC7-06
- Phase: 7 · Title: rollback drill · Status: pending · Dep: HC7-05
- Purpose: 두 파일 revert로 구 Home 복구 확인. 삭제 0.
- Allow: `_tmp_home_clean/v1/phase7/ROLLBACK_DRILL.md`
- Prot: 레거시 삭제 금지
- Act: 두 파일만 같은 단위로 수동 patch/`apply_patch` 복원. `git reset`/`git restore`/`git checkout --`/stash 금지. 다른 dirty 덮어쓰기 금지. `/`가 HomePageClient+구 AppShell인지 확인. rollback 후 diff·route 재검증. HC7-02 승인이 유효하면 다시 두 파일을 한 단위로 cutover 상태. commit/push 0.
- Val: `pnpm verify:home-live-wire`, `pnpm verify:ia-tabs`
- URL: `/` · VP: 390×693 · Ev: `v1/phase7/ROLLBACK_DRILL.md`
- PASS: revert 복구 확인 + 재적용. 삭제 0
- FAIL: drill 중 레거시 삭제, 한 파일만 revert
- Rollback: 두 파일을 승인 상태 · UA: No · Next: HC7-07

#### HC7-07
- Phase: 7 · Title: cutover gate · Status: pending · Dep: HC7-06
- Purpose: `HOME_CLEAN_CUTOVER_READY_FOR_USER_APPROVAL`.
- Allow: `_tmp_home_clean/v1/phase7/GATE.md`
- Prot: 레거시 파일
- Act: atomic·회귀·drill·OpenNext 증거·production fixture 0 확인. `verify:gate:fast` 보고. commit/push 0.
- Val: `pnpm verify:gate:fast`, `pnpm --filter @aipo/web build`
- URL: `/` · VP: 390, 1440 · Ev: `v1/phase7/GATE.md`
- PASS: `/` Option A. 레거시 파일 존재. rollback 가능
- FAIL: 레거시 삭제, 이중 Shell
- Rollback: HC7-03 두 파일 · UA: No · Next: HC8-01

---

### Phase 8

사용자 승인 전 삭제 0. `HomeExperience`는 H7 import 동안 HC8-04에서 삭제 금지.

#### HC8-01
- Phase: 8 · Title: import/usage audit · Status: pending · Dep: HC7-07
- Purpose: 레거시 심볼 사용처 고정. 삭제 0.
- Allow: `_tmp_home_clean/v1/phase8/USAGE_AUDIT.md`
- Prot: 모든 레거시 파일
- Act: `HomeExperience` · `HomePageClient` · `HomeChromeProvider` · `useHomeMobileSurface` · `.home-*` · `data-home-avm` · H7 · HVR 검색. 삭제 0.
- Val: 검색만 · URL: 없음 · VP: 없음 · Ev: `v1/phase8/USAGE_AUDIT.md`
- PASS: 사용처 표. 삭제 0
- FAIL: audit 중 삭제
- Rollback: MD 삭제 · UA: No · Next: HC8-02

#### HC8-02
- Phase: 8 · Title: deletion candidate report · Status: pending · Dep: HC8-01
- Purpose: 4묶음 보고.
- Allow: `_tmp_home_clean/v1/phase8/DELETION_CANDIDATES.md`
- Act: 묶음 = production Home 엔트리 / H7·HVR / Home CSS / 미사용 fixture·asset. `HomeExperience`는 H7 usage 0일 때만 삭제 가능. CSS는 admin도 쓰므로 web+admin 회귀 필수.
- Val: 없음 · URL: 없음 · VP: 없음 · Ev: `v1/phase8/DELETION_CANDIDATES.md`
- PASS: 묶음별 경로. 삭제 0
- FAIL: 보고 없이 삭제
- Rollback: MD 삭제 · UA: No · Next: HC8-03

#### HC8-03
- Phase: 8 · Title: 사용자 삭제 승인 · Status: pending · Dep: HC8-02
- Purpose: 묶음별 허가.
- Allow: `_tmp_home_clean/v1/phase8/USER_DELETION_APPROVAL.md`
- Prot: 모든 후보
- Act: 묶음마다 허용/보류. 미허용 묶음 삭제 todo 실행 금지.
- Val: 없음 · URL: 없음 · VP: 없음 · Ev: `v1/phase8/USER_DELETION_APPROVAL.md`
- PASS: 묶음별 허가 기록
- FAIL: 포괄 추정 삭제
- Rollback: 없음 · UA: **Yes** · Next: HC8-04

#### HC8-04
- Phase: 8 · Title: 구 production Home 엔트리 · Status: pending · Dep: HC8-03
- Purpose: `/`가 안 쓰는 엔트리만. `HomeExperience` 이 단계 금지.
- Allow: `apps/web/app/HomePageClient.tsx` (usage 0·허가 시에만), `v1/phase8/removal-home-entry.md`
- Prot: `HomeExperience` 및 `components/home/**` (H7 usage>0), H7/HVR, `component.css`
- Act: HomePageClient import 0 재검색. 허가+usage 0일 때만 삭제. home 카드/`useHomeMobileSurface` 이 todo 0. H7가 HomeExperience를 쓰면 HC8-05로 넘김.
- Val: `pnpm verify:home-live-wire`, `pnpm verify:ia-tabs`, `pnpm --filter @aipo/web build`
- URL: `/`, `/dev/h7-home-preview` · VP: 390, 1440 · Ev: `v1/phase8/removal-home-entry.md`
- PASS: 허용 엔트리만. H7 열림. `/` Clean
- FAIL: HomeExperience 조기 삭제, 승인 없는 삭제
- Rollback: HomePageClient 복구 · UA: No · Next: HC8-05

#### HC8-05
- Phase: 8 · Title: H7/HVR 제거 · Status: pending · Dep: HC8-04
- Purpose: 허용된 preview와 이후 usage 0 Home presentation.
- Allow: `apps/web/app/dev/h7-home-preview/**`, `apps/web/app/dev/home-visual-rebuild/**`, usage 0 `packages/ui/components/home/**`, `routes.ts`의 해당 두 `/dev` 줄만
- Prot: `component.css` 이 todo 0, `/dev/home-clean-v1`, Brand Kit, `USER_TABS`
- Act: HC8-03 H7/HVR 허가 확인. 아니면 중단. H7/HVR 삭제. HomeExperience import 0 재검색 후에만 home/** 삭제. routes에서 두 `/dev` 줄만. USER_TABS 0. Clean 경로를 nested에 넣지 않음. 다른 verify가 문자열 lock이면 `BLOCKED_ROUTES_TS_REQUIRED`.
- Val: `pnpm verify:ia-tabs`, `pnpm verify:part5-shell-toast`, `pnpm verify:no-admin-in-web`, `pnpm --filter @aipo/web build`
- URL: H7/HVR 404, `/dev/home-clean-v1` 유지, `/`
- VP: 390, 1440 · Ev: `v1/phase8/removal-h7-hvr.md`
- PASS: H7/HVR 404. Clean·`/` 유지. USER_TABS 불변
- FAIL: Clean 삭제, 이 단계 CSS 삭제, 5탭 변경
- Rollback: preview/home + routes 두 줄 · UA: No · Next: HC8-06

#### HC8-06
- Phase: 8 · Title: Home legacy CSS · Status: pending · Dep: HC8-05
- Purpose: Home/AVM/Founder correction 블록만.
- Allow: `packages/ui/tokens/component.css`의 해당 블록만
- Prot: 비-Home 규칙, lux-theme import(Home 전용 아니면)
- Act: `.home-*`/`[data-home-avm]`/`body:has([data-home-avm` 참조 0 확인. 남으면 중단. Home 블록만 제거. `.app-header__brand{display:none}`이 전역 누수면 사용자 확인 없이 비-Home 규칙 삭제 금지. web build 후 admin build 순차. OOM이면 blocker.
- Val: `pnpm verify:lux-theme-sync`, `pnpm verify:dark-leak-guard`, `pnpm --filter @aipo/web build`, `pnpm --filter @aipo/admin build`
- URL: `/`, `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase8/removal-home-css.md`
- PASS: Home/AVM selector 잔여 0. web+admin build 0
- FAIL: 전역 토큰 삭제, admin 미검증, 참조 남은 채 삭제
- Rollback: component.css Home 블록 · UA: No · Next: HC8-07

#### HC8-07
- Phase: 8 · Title: unused fixture/assets · Status: pending · Dep: HC8-06
- Purpose: 미선택·import 0만.
- Allow: usage 0 H7/HVR fixture, HC8-03 허용 미선택 v2/v3
- Prot: Brand Kit ready, `home-clean-assets.ts` 대상, 선택 public mirror
- Act: 각 후보 import/URL 0 확인. ready 자산 무단 삭제 0. manifest 기본 0. `*mockup*` 신설 0.
- Val: `pnpm verify:brand-asset-provenance`, `pnpm verify:brand-assets`, `pnpm verify:mockup-governance`
- URL: `/dev/home-clean-v1` · VP: 390, 1440 · Ev: `v1/phase8/cleanup-assets.md`
- PASS: 허용·usage 0만. 선택 자산 잔존
- FAIL: 선택 자산 삭제, Brand Kit 무단 변경
- Rollback: 삭제 파일 복구 · UA: No · Next: HC8-08

#### HC8-08
- Phase: 8 · Title: web/admin build and regression · Status: pending · Dep: HC8-07
- Purpose: 삭제 후 빌드·5탭.
- Allow: `v1/phase8/build-regression/**`
- Prot: 추가 삭제 0
- Act: web 서버 OFF. `pnpm --filter @aipo/web build` 후 `pnpm --filter @aipo/admin build`. start로 `/`·5탭 확인. production에서 `/dev/home-clean-v1` 404. `pnpm --filter @aipo/web build:cf`. win32 SKIP이면 `BLOCKED_CLOUDFLARE_BUILD_VERIFICATION`.
- Val: web/admin build, `pnpm verify:ia-tabs`, `pnpm verify:home-live-wire`, `pnpm verify:no-admin-in-web`
- URL: `/` `/profits` `/trades` `/wallet` `/me` `/auth/login` · VP: 390, 1440 · Ev: `v1/phase8/build-regression/`
- PASS: web+admin 0. 5탭. Clean production 404. `/` Clean
- FAIL: admin 미빌드, 5탭 파손, SKIP을 PASS
- Rollback: Phase 8 삭제분 · UA: No · Next: HC8-09

#### HC8-09
- Phase: 8 · Title: legacy removal gate · Status: pending · Dep: HC8-08
- Purpose: `HOME_LEGACY_REMOVAL_READY_FOR_APPROVAL`.
- Allow: `_tmp_home_clean/v1/phase8/GATE.md`
- Act: HC8-01~08와 허가 대조. 남은 레거시 import 0 재검색. `verify:gate:fast` 보고. commit 0.
- Val: `pnpm verify:gate:fast`, `pnpm verify:ia-tabs`, `pnpm verify:brand-asset-provenance`
- URL: `/` · VP: 390, 1440 · Ev: `v1/phase8/GATE.md`
- PASS: 허가 삭제만. usage 0. 빌드 회귀
- FAIL: 무단 삭제, 남은 import
- Rollback: Phase 8 삭제분 · UA: No · Next: HC9-01

---

### Phase 9

`_tmp` 통째 승격 금지. 사용자 최종 Home 승인 후.

#### HC9-01
- Phase: 9 · Title: 최종 증거 선택 · Status: pending · Dep: HC8-09
- Purpose: Canon 후보 목록만. Canon 쓰기 0.
- Allow: `_tmp_home_clean/v1/phase9/EVIDENCE_SELECTION.md`
- Prot: `packages/ui/canon/evidence/**` 이 todo 0
- Act: 최종 screenshot·matrix 요약·계약 증거 목록. 실패 overlay 제외. `mockup` 이름 제외/개명. Canon 디렉터리 생성 0.
- Val: `pnpm verify:mockup-governance`
- URL: 없음 · VP: 없음 · Ev: `v1/phase9/EVIDENCE_SELECTION.md`
- PASS: 선택 목록만. Canon 0
- FAIL: 선택 전 Canon 복사
- Rollback: selection MD · UA: No · Next: HC9-02

#### HC9-02
- Phase: 9 · Title: 사용자 증거 승격 승인 · Status: pending · Dep: HC9-01
- Purpose: 선택 파일만 옮길 허가. locks는 포함 안 함.
- Allow: `_tmp_home_clean/v1/phase9/USER_EVIDENCE_PROMOTION_APPROVAL.md`
- Prot: Canon evidence, `visual-locks.v1.json`
- Act: 목록 제시. 승인 전 HC9-03 금지. locks는 HC9-04.
- Val: 없음 · URL: 없음 · VP: 없음 · Ev: `v1/phase9/USER_EVIDENCE_PROMOTION_APPROVAL.md`
- PASS: 사용자 승격 승인
- FAIL: 자동 승격
- Rollback: 없음 · UA: **Yes** · Next: HC9-03

#### HC9-03
- Phase: 9 · Title: Canon evidence promotion · Status: pending · Dep: HC9-02
- Purpose: 승인 파일만 `packages/ui/canon/evidence/home-clean-v1/`.
- Allow: 해당 Canon 경로 (승인 목록만)
- Prot: 다른 Canon, `docs/mockups/**`, visual-locks
- Act: 승인 파일만 복사. `_tmp` 전체 미러 금지. `mockup` 이름 금지. 실험 원본은 `_tmp` 유지.
- Val: `pnpm verify:mockup-governance`, `pnpm verify:canon-surfaces`
- URL: 없음 · VP: 없음 · Ev: Canon 경로 + `v1/phase9/PROMOTION.md`
- PASS: 승인 파일만 Canon. mockup-governance PASS
- FAIL: `_tmp` 전체 복사, `*mockup*.png`
- Rollback: `packages/ui/canon/evidence/home-clean-v1/` 삭제 · UA: No · Next: HC9-04

#### HC9-04
- Phase: 9 · Title: visual-lock proposal · Status: pending · Dep: HC9-03
- Purpose: 초안만. 승인 전 JSON 0.
- Allow: `_tmp_home_clean/v1/phase9/VISUAL_LOCK_PROPOSAL.md`
- Prot: `packages/ui/canon/visual-locks.v1.json`
- Act: surfaceId·contract 경로·메타를 MD만. JSON 기본 0. 거부 시 proposal만 닫음. 명시 승인 후에만 JSON 항목 추가.
- Val: JSON을 쓴 뒤에만 `pnpm verify:responsive`. proposal-only면 실행 0
- URL: 없음 · VP: 없음 · Ev: `v1/phase9/VISUAL_LOCK_PROPOSAL.md`
- PASS: proposal 존재. JSON은 승인 후에만
- FAIL: 승인 전 locks 채움
- Rollback: visual-locks revert · UA: **Yes (JSON 전)** · Next: HC9-05

#### HC9-05
- Phase: 9 · Title: final governance gate · Status: pending · Dep: HC9-04
- Purpose: `HOME_CLEAN_FINAL_EVIDENCE_PROMOTION_READY`.
- Allow: `_tmp_home_clean/v1/phase9/GATE.md`
- Prot: 03 UI 플랜, Money/Engine/Auth/API
- Act: 승격 목록·승인·locks 승인/거부 확인. 03 YAML 불변. `verify:gate:fast` 보고. commit/push 0.
- Val: `pnpm verify:gate:fast`, `pnpm verify:mockup-governance`, `pnpm verify:canon-surfaces`, `pnpm verify:plans-ssot`
- URL: `/` · VP: 390, 1440 · Ev: `v1/phase9/GATE.md`
- PASS: 선택 증거만 Canon. locks는 승인된 경우만. 03 YAML 0. 자동 commit 0
- FAIL: 실험 증거 대량 승격, 03 변경, 자동 commit
- Rollback: Canon 승격분 · locks 항목 · UA: No · Next: 없음

---

## 16. 실행 시작점

- 완료: **HC0-01~HC0-06** · **HC1-01~HC1-09** · **HC2-01~HC2-09** · **HC25-01~HC25-05** · **HC3-01~HC3-10** · **HC4-01**
- 다음 실행 후보: **HC4-02** (Mobile AI · 같은 AiSummary · Desktop AI 정보 삭제 금지)
- `in_progress` 0. 첫 pending = HC4-02
- HC7-04는 본문·frontmatter 모두 없음 (HC7-03 흡수)
- 숨은 `HC1-R01` 없음. `routes.ts`가 필요하면 `BLOCKED_ROUTES_TS_REQUIRED` 후 revision
- 03 File-Serial 플랜 변경 0
- 이 파일은 File-Serial ACTIVE 8파일 밖 전용 실행 SSOT다
- 자동 commit/push 0
