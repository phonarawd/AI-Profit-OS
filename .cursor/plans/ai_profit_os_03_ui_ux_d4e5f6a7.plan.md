---
name: AI Profit OS — UI & UX
overview: v7.23.0 PART0~9 completed 불변 · 00 R0→01 Money R1→02 Engine R1→02.5 QA(ENGINE_ACCEPTED_FOR_UI·UI_UX_ENTRY_GATE=OPEN) 후 Redesign R1 Home→spotcheck→R2 Acquisition→R3 Wallet→R4 Core Loop→R5 Account Hub · ADR-017 Light+Purple·새 5탭 라벨·PART9 binding 보존 · v7.24.0(2026-08-16) ADR-018 Peotteok Visual Master Reset — R1 Home 시각(geometry) authority가 ADR-017→ADR-018로 승계, STEP5 Slice5/6(RightRail/Partner) SUPERSEDED/STOPPED, Founder Home Visual Master intake 대기(구현코드0) · v7.24.1(2026-08-16) ADR-018 PENDING TODO REBASE — H1/H5/H6 신규 todo(Visual Master intake/Visual Contract/Implementation Contract) 삽입, H0~H11 실행 큐 SSOT 명시, Legacy Replacement Safety Gate 신설, R2~R5 하이브리드 상태모델, §33.8 ADR-013/018 정합, 02.5 UI_UX_ENTRY_GATE=CLOSED 기록(구현코드0 · completed 이력 불변) · v7.24.2(2026-08-16) ENGINE ACCEPTANCE GATE RESYNC — v7.24.1 기록 시점의 02.5 verdict=ENGINE_NOT_ACCEPTED(QA8_ADMIN_BOUNDARY P0)는 **이력**이다; 이후 admin 인증/RBAC repair(services/api-nest/src/common/admin.guard.ts 등) 완료 + QA1-8 재실행 + QA9 재판정으로 verdict=ENGINE_ACCEPTED_FOR_UI(ISSUED)·UI_UX_ENTRY_GATE=OPEN(baseline ea-baseline-64b0f8a6d984-3657543f36b5 · governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md · pnpm verify:engine-acceptance 라이브 재확인)로 전환됐음을 본 patch가 반영 — **Engine Gate(H7 등 실행 전 UI_UX_ENTRY_GATE 조건)는 충족**되었으나 **H1/H4/H5/H6/H6.5 Visual Master 계약 선행조건 및 R2~R5 화면별 Visual Master 규칙은 불변**(Visual Master 없이 실제 runtime 착수 불가) · 구현코드0 · completed 이력 불변 · v7.24.3(2026-08-16) H1 HOME VISUAL MASTER INTAKE COMPLETE — Founder가 Desktop/Mobile Home Visual Master 이미지 2장을 `APPROVED VISUAL MASTER`로 명시 지정, `packages/ui/canon/contracts/peotteok-home-visual-master-intake.v1.md` 신설(provenance+hash+dimensions+functional conflict matrix+legacy forensic preview+asset production candidates 기록) + `home-visual-v2.wire.json`에 `visualMasterIntakeRef` pointer 추가 · `redesign-r1-home-visual-master-intake`(H1) pending→**completed** · Visual Contract(H5)/Implementation Contract(H6)/Visual Lock 착수 **0** · 원본 이미지 파일 레포 저장 **0** · 발견된 미해결 blocking conflict **0**(NOT_SUPPORTED/VISUAL_FUNCTIONAL_CONTRACT_CONFLICT 항목은 H4/H5에서 Founder 결정 대기로 기록만) · runtime/CSS/API/DB 변경 **0** · 다음 File-Serial pending=`redesign-r1-home-brand-assets`(R1-2 Part A) · v7.24.4(2026-08-16) REDESIGN-R1-HOME-BRAND-ASSETS PART A COMPLETE — Brand Kit+markets+membership manifest 전수 SHA-256/mirror 검증(21 assets·17/17 mirror-consistent·중복0) + `tooling/verify/brand-asset-provenance.cjs` 신설+CATALOG · ADR-018 §13 legacy candidate 표에 `avatar-512.png` 보완 · Part B/H4~H7/runtime/신규 asset 생성 = 착수 0 · todo status는 Part B 미완료로 **pending 유지**(스키마 3번째 값 전례 0 확인) · content에 Part A 증거 append. · v7.24.5(2026-08-16) BRAND-ASSETS SPLIT RESOLUTION + H4 START — `redesign-r1-home-brand-assets`를 Part A(completed)로 확정하고 Part B를 신규 `redesign-r1-home-visual-asset-production`(YAML 목록상 H6.5 다음·H7 앞으로 실제 이동)으로 SPLIT(원문 이전만·재작성 0) → File-Serial first pending이 `redesign-r1-home-product-contract`(H4)로 정상화됨을 확인 → H4 Home Product Contract(`packages/ui/canon/contracts/peotteok-home-product-contract.v1.md`) 작성 착수. · v7.24.6(2026-08-16) H4 HOME PRODUCT CONTRACT COMPLETE — 15섹션 Functional Truth Contract 완성. 핵심 발견: (1) `WalletBuckets.profitUsdt`=출금가능 누적수익이나 Home 응답에 `FORBIDDEN_RESPONSE_KEYS` 하드 가드 존재 → "실제 수익" name-match binding 거부, `FUNCTIONAL_BINDING_UNRESOLVED`로 확정(Founder/Money-owner 결정 대기) (2) `estimatedDurationSec`/KRW FX 인프라는 실존하나 Home 미배선(FUNCTIONAL_BINDING_REQUIRED) (3) 다음 업데이트 리터럴 시각=`NOT_SUPPORTED_AS_LITERAL_RUNTIME_TRUTH`(대체 slot 3종 제시) · blocking conflict=0 · fake binding=0 · 신규 backend 발명=0 · `verify:home-product-contract.cjs` 신설+CATALOG · runtime/H5/H6/H7 착수=0. · v7.24.7(2026-08-16) H5 HOME VISUAL CONTRACT COMPLETE — Desktop(`home-visual-desktop`)+Mobile(`home-visual-mobile`) 시각 계약 완성(`packages/ui/canon/contracts/peotteok-home-visual-contract.v2.md` 20절: authority refs·Desktop/Mobile composition·shared design language·layout/typo/card/color hierarchy·money/opportunity/AI visual hierarchy·update-trust·nav·responsive intent·accessibility·asset matrix·VISUAL_ONLY_EXAMPLE 처리·H4 unresolved carry-forward·legacy forbidden reuse·H6 handoff) · geometry/색/spacing는 관계·범위로만 계약, 옛 ADR-017 px 미재사용(`PENDING_CALIBRATION_FROM_MASTER`로 명시) · 실제 수익 슬롯=APPROVED/바인딩=UNRESOLVED 유지 · 다음 업데이트 리터럴=NOT_SUPPORTED 유지(대체안 3종 제시) · 영구 emoji(👋/✨) 리터럴 미계약(타이포/색으로 강조 대체) · asset 6종 매트릭스 식별(제작 0) · `home-visual-v2.wire.json` newVisualContractRef pointer 추가 · runtime/CSS/API/DB/H6/H6.5/H7/Brand Assets Part B/Visual Lock 착수=0.
todos:
  - id: ui-preflight-constitution
    content: "[grok-4.5|256K] PART0 착수게이트 · **선행: Engine 02 Pre-UI Runtime Gate(§0.9 E-R1~E-R8) pending0 + Money money-user-benefits-read completed 필수(미충족 시 본 todo·이하 전부 착수 금지)** · BOOTSTRAP §0.6 실측기록(DB76/mig28/fn5·Canon·routes·Admin교차·verify live/pending) · **v7.22.50 감사 3정정 기록 흡수(§0.6 U13~U15·색토큰=lux-fintech·§29.6 Phase1+·eBay query: gap=Engine follow-up)** · File-Serial 재정렬 0 · 구현코드0 · 다음=market-partner-trust-surfaces"
    status: completed
  - id: match-tension-ux-surfaces
    content: "[grok-4.5|256K] v7.22.30 §48.3b 긴장감 UX·등급≠대기 · Index §20.2 · verify:match-tension-surface"
    status: completed
  - id: sla-requeue-copy-lock
    content: "[grok-4.5|256K] v7.22.29 §48 Soft/Hard 카피3줄·MATCH_TIMEOUT safe_stop · Index §20.2 · Audit A4"
    status: completed
  - id: admin-match-strictness-ui
    content: "[grok-4.5|256K] ABSORBED→Admin admin-execution-policy · Canon admin-execution-policy.wire.json 유지 · apps/admin §48.6 구현=Admin File-Serial · UI 재실행 금지"
    status: completed
  - id: market-partner-trust-surfaces
    content: "[grok-4.5|256K] PART1a §38.10 Brand markets SVG+manifest·MarketPartner*·Canon market-partner-trust·/me/guide/partners·routes잠금 · adapter≠표기(yahoo_jp Day1 adapter0·표기필수) · verify:market-partner-trust/brand-logo-single · Admin partners=pointer · 실측(v7.22.52 §0.8.3): Grid/Leg/Strip+brand/markets.ts+guide페이지 이미 실물 존재·verify live — 착수 즉시 `pnpm verify:market-partner-trust` 먼저 실행, PASS면 로고 SVG 자산 교체 갭만(전면 재작성 금지) · CLOSE: 7 SVG ready+manifest/markets.ts/wire unblocked · verify PASS without BLOCKER · REQUIRE_READY=1 PASS"
    status: completed
  - id: korean-first-copy
    content: "[grok-4.5|256K] PART1b §27+§27.10 copy/ko SSOT · toneBand · 퍼뜩voice·도움말·쉬운말·귀여운이모지(20~70·캡/팔레트) · auth/onboarding/landing/kyc/toast/empty/guide 키골격 · **landing utility namespace**(`utilityDisclaimer`·`transitionDisclosure`·`ctaOpenPriceMap`·`ctaStartUtility`·variant·금지어0) 키골격(본문깊이=PART2a/2c Owns·중복0) · retired브랜드0 · verify:korean-ui/brand-consumer/age-tone-surfaces/toast-emoji(+cute-emoji-palette CATALOG등록시) · CLOSE: Guest auth utility 금지어0 · korean-ui landing키+Guest금지어 잠금 · cute-emoji-palette PASS"
    status: completed
  - id: mockup-governance-adr013
    content: "[grok-4.5|256K] PART1c §33.8 Canon 권위·사진PNG0·archive INTENT ONLY · admin-execution-policy.wire=Admin Owns확인(UI앱구현0) · verify:mockup-governance/canon-surfaces/brand-logo-single · CLOSE: 3 verify PASS · photo0 · owns=Admin · appsWebImplement=false · apps/web/admin 0 · 갭코드0"
    status: completed
  - id: ux-design-system
    content: "[grok-4.5|256K] PART1d Lux tokens + fontScale md/lg/xl + spacing/line-height senior · MotionCTA · reduced-motion · Light테마토글0 · verify:lux-theme-sync · CLOSE: lux-theme-sync+ux-design-system+font-scale-three PASS · hex=#3DDC97/#7AA2FF 재발명0 · 갭코드0"
    status: completed
  - id: onboarding-experiential
    content: "[grok-4.5|256K] PART2a §6.4(+v7.22.55 supersede) 체험형 온보딩 · Guest/광고유입=utility 톤 · 첫화면 `T.landing.transitionDisclosure` 1줄(전환고지≠capital허가) · ACTION CTA=`시작하기`/`시세 맵 계속`(「수익 벌기」0) · 수익|투자|USDT|테더|보장|차익|괴리율 0 · Partner strip 1slide · Canon wires · verify:onboarding-experiential/canon-surfaces · CLOSE: compareMiniUtility·utilityDisclaimer wire · demo +$제거 · practice banner 수익0 · verify 잠금"
    status: completed
  - id: auth-login-signup-ui
    content: "[grok-4.5|256K] PART2b Canon auth-login/signup/complete-profile · Kakao primary(login/signup **내부** · 랜딩 firstViewport 직행0) · Guest=utility 톤(§6.4c.1 F) · Stage A/B · 성별필드0 · verify:auth-surfaces · 선행pointer=Infra auth-kakao-oauth-runtime(Kakao.env=founder·callback미구현→UI mock/disabled가드)"
    status: completed
  - id: operator-entity-support-email
    content: "[grok-4.5|256K] PART2c-pre §50.9 schemas/operator-entity.v1.json+instance.json `supportEmail`(format email·required) · examples 동기 · JSX 하드코딩0 · verify:operator-footer scaffold=supportEmail 존재+instance 일치 · LandingOperatorFooter 바인딩=landing-3s-ui Owns(중복0) · **§0.8.2 #5 승격(v7.22.55)** · 실측 supportEmail already→갭-only(전면 재작성 금지) · 구현=schema+instance only"
    status: completed
  - id: landing-3s-ui
    content: "[grok-4.5|256K] PART2c §6.4c+§6.4c.1(v7.22.55) 듀얼레이어 utility 랜딩 · Canon landing-3s · firstViewport≤5 · Tier-A MarketPartnerTrustStrip · GuestChrome(5탭0) · /l/*+/ads 동일 · **인수조건:** (1) LandingOperatorFooter=operator-entity→legalName+license+supportEmail+jurisdiction+`/me/legal`1 · (2) utilityDisclaimer CTA직하+footer직전 2중 · (3) 포지셔닝=시세·가격 비교 · 금지어 수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바 0 · CTA=`실시간 시세 맵 열기`→/onboarding|/auth/login · (4) expectedNotGuaranteed 랜딩폐기 · (5) consent실행계약=Infra sdk · UI Lead emit only if consentMarketing===true · 미실장=emit0 · (6) 완료=`verify:landing-3s`+`verify:marketing-compliance`+`verify:operator-footer` PASS · copy↔Infra §31.4/§31.7 금지어 동기"
    status: completed
  - id: opportunity-scan-home-ux
    content: "[grok-4.5|256K] PART3a §5.3b 홈3초·arbitrageTypeKo·기회스캔 위계·PartnerTrustStrip/Leg · CTA라벨 미구현(다음 todo) · verify:opportunity-scan-surface"
    status: completed
  - id: capital-provider-match-ux
    content: "[grok-4.5|256K] PART3b §5.3b/§48 CTA=수익 벌기·상세=이 기회로 수익 벌기·면책배지·trader jargon0 · verify:cta-earn-profit/user-trader-jargon-0"
    status: completed
  - id: price-compare-margin-ux
    content: "[grok-4.5|256K] PART3c PriceCompareMargin 4면 · 공식=Engine §0.0.4 pointer(재계산0) · compareReady 가드 · verify:margin-compare-surface · 실측(v7.22.52 §0.8.2 #3): 컴포넌트·verify스크립트·CATALOG등재 전부 0건(고아 참조였음) — 신규 구현 필수, 완료 조건에 `tooling/verify/margin-compare-surface.cjs` 신설+CATALOG.md 등재 포함(3종 세트)"
    status: completed
  - id: asset-image-execution-ux
    content: "[grok-4.5|256K] PART3d §48.3a assetImageUrl 썸네일·필터 가방·Canon productThumb · verify:asset-image-surface"
    status: completed
  - id: balance-aware-home-ux
    content: "[grok-4.5|256K] PART3e §5.3a affordable/nearMiss·입금 suggest CTA·카피 · verify:balance-aware-feed"
    status: completed
  - id: ai-execution-ux
    content: "[grok-4.5|256K] PART4a §48 진행실·성공·안전중단 + copy/ko/execution + Soft/Hard카피3줄 배선 · verify:execution-surfaces · 실측(v7.22.52 §0.8.3): `useTradeExecution` polling훅=live이나 `AiProgressRoom`/`ExecutionSuccessReceipt`/`ExecutionSafeStop`/`ExecutionStepList` 컴포넌트 0건(현재 execute page는 2-state 임시텍스트) — 3면 신규 구현 필수(스킵 금지), PART3d `ProductThumb` 재사용"
    status: completed
  - id: ai-coach-ui
    content: "[grok-4.5|256K] PART4b §6.4e/§6.4e.1+§27.10 voice copy/ko/peotteok+Canon · /me/peotteok SSE·P칩·Gstream·S거절·degrade·귀여운말투캡 · 선행=Engine ai-coach-runtime(completed) · verify:canon-surfaces+ai-coach-*+age-tone-surfaces"
    status: completed
  - id: public-ticker-g4-surface
    content: "[grok-4.5|256K] [밀도:가벼움] PART5a §33.2a LivePayoutTicker·CountUp(settlement.completed only) · ticker_mode/counter_mode 투영 · DayPulse merge0 · PII0 · Admin §35.4 pointer · verify:ticker-pii-0(또는 UI게이트) · 실물 우선·갭-only · **2~3개 연속 묶기 OK**(5a~5f)"
    status: completed
  - id: user-ia-shell-screens
    content: "[grok-4.5|256K] [밀도:가벼움] PART5b apps/web 5탭 shell+USER_NESTED_ROUTES(/me/benefits·/me/guide/partners 포함) · /profits·/trades 골격 · retired브랜드0 · verify:ia-tabs/no-admin-in-web · ≠홈심화(PART3) · 실물 우선·갭-only · **2~3개 연속 묶기 OK**(5a~5f)"
    status: completed
  - id: wallet-surfaces-ui
    content: "[grok-4.5|256K] [밀도:가벼움] PART5c §49 지갑홈·입금·출금(USDT/KRW)·내역 · DemoWalletBanner·NetworkPlainWarning · Canon wallet-* · Money pointer · verify:deposit-network-plain-ko+wallet Canon · 실물 우선·갭-only · **2~3개 연속 묶기 OK**(5a~5f)"
    status: completed
  - id: settings-legal-ko
    content: "[grok-4.5|256K] [밀도:가벼움] PART5d §50.1 fontScale3단+depositPref+약관4종·DET §50.9 · verify:legal-plain-ko/font-scale-three · 실물 우선·갭-only · **2~3개 연속 묶기 OK**(5a~5f)"
    status: completed
  - id: toast-notification
    content: "[grok-4.5|256K] [밀도:가벼움] PART5e toast catalog §8.2(+KRW_REJECTED)+§48/§49/REFERRAL/CAMPAIGN/MISSION · §50.2+§27.10.3 팔레트 · push dedup · verify:toast-emoji · 실물 우선·갭-only · **2~3개 연속 묶기 OK**(5a~5f)"
    status: completed
  - id: plain-korean-surfaces
    content: "[grok-4.5|256K] [밀도:가벼움] PART5f 유저 surface IT용어0+§27.10 쉬운말/이모지캡 스캔(도움말·empty·힌트 포함 · 어드민 plain=Admin Owns) · verify:no-it-jargon/toast-emoji · 실물 우선·갭-only · **2~3개 연속 묶기 OK**(5a~6c)"
    status: completed
  - id: kyc-surfaces-ui
    content: "[grok-4.5|256K] [밀도:가벼움] PART6a Canon kyc-guide/doc/confirm Lux3면 · Money §42 pointer · RRN입력0 · verify:kyc-surfaces · 실물 우선·diff 보완 · **2~3개 연속 묶기 OK**(5a~6c)"
    status: completed
  - id: trust-education-ux
    content: "[grok-4.5|256K] [밀도:가벼움] PART6b §38 Objection4+DepositWhyGate+면책 CI · §38.10 로고는 market-partner todo Owns(중복구현0) · Admin growth?tab=content 면책잠금 pointer · verify:trust-copy/tax-disclaimer/objection4 · 실물 우선·diff 보완 · **2~3개 연속 묶기 OK**(5a~6c)"
    status: completed
  - id: trust-get-usdt-guide
    content: "[grok-4.5|256K] [밀도:가벼움] PART6c §38.8 /me/guide/get-usdt + 입금 네트워크 한글경고 · TRC20 화면0 · verify:deposit-network-plain-ko · 실물 우선·diff 보완 · **2~3개 연속 묶기 OK**(5a~6c)"
    status: completed
  - id: invite-explain-kr-2070
    content: "[grok-4.5|256K] [밀도:가벼움] PART7a §5.9.1a 친구초대 설명·toneBand·Canon invite-home · 횟수∞ · Money §51.5 pointer · verify:invite-explain-surfaces/age-tone-surfaces · 실물 diff 후 갭-only · **2~3개 연속 묶기 OK**(7a·7c·7d)"
    status: completed
  - id: benefit-hub-surfaces
    content: "[grok-4.5|256K] [밀도:무거움·체감최우선] PART7b §5.9.5 /me/benefits+routes · Daily/One-Time/Weekly/Streak·Hero·캐러셀 · Credits0 · Money §51.8a·Engine §48.13.4 pointer · Admin missions pointer · verify:benefit-hub-surfaces/benefit-no-credits-currency/benefit-g4-ledger-separation · 실측(v7.22.52 §0.8.2 #2 결함): 현 verify PASS=Money API(GET 2종)+copy파일 존재만 검사 · 실제 page.tsx=1줄 골격(Hero/Carousel/D·M·W·S 카드 0) — verify PASS를 완료 증빙으로 오독 금지, 딥 UI 전량 신규 구현이 완료 조건 · **단독 세션 권장**(묶기≤1 가벼운 todo)"
    status: completed
  - id: membership-grade-ux
    content: "[grok-4.5|256K] [밀도:가벼움] PART7c §5.9.2c·§51.18a 등급표·AI해금·배지Brand SVG·100%아님 · Admin §9.8.10 pointer · verify:membership-surfaces/membership-badge-assets · 실물 diff 후 갭-only · **2~3개 연속 묶기 OK**(7a·7c·7d)"
    status: completed
  - id: notify-prefs-inbox
    content: "[grok-4.5|256K] [밀도:가벼움] PART7d §50.1n 가입시 prefs 전부ON · §5.9.4 쪽지함 · toast MATCH/WITHDRAW_BLOCK · Admin 쪽지 pointer · verify:notification-prefs-default-on/ops-inbox · 실물 우선 확인 · **2~3개 연속 묶기 OK**(7a·7c·7d)"
    status: completed
  - id: loop-psychology-5124
    content: "[grok-4.5|256K] [밀도:가벼움] PART8a §51.24 DayPulse·PreCTA·L1~L24 · G4 merge0 · verify:loop-psychology/day-pulse-live-only/preflight-may-stop · 실물 우선·갭-only · **2~3개 연속 묶기 OK**(8a·8c)"
    status: completed
  - id: trust-surfaces-v722
    content: "[grok-4.5|256K] [밀도:무거움] PART8b §51.16~21(20 Weekly Market Briefing 포함·v7.22.52~53 고아게이트 Owns 재배정·verify PART8b 신설) Proof/SafeStop/Journey/AdapterHealth/WeeklyMarketBriefing/DepositConsult · /me/guide/market-weekly route+USER_NESTED_ROUTES등록+Canon(market-weekly-briefing.wire.json)+copy/ko/guide.ts+verify:market-briefing-no-investment-advice 신설(§51.20 · 현재 ghost) · Loop본문=loop-psychology Owns(중복0) · verify 해당 게이트 · 5+1종 **신규 구현** · **단독 세션 권장**"
    status: completed
  - id: responsive-device-tier
    content: "[grok-4.5|256K] [밀도:가벼움] PART8c fluid+touch-target + device-tier S/A/B + Virtual · verify:responsive · 회귀·harness live · **2~3개 연속 묶기 OK**(8a·8c)"
    status: completed
  - id: part9-pre-dev-api-proxy
    content: "[grok-4.5|256K] [밀도:가벼움] PART9-pre next.config.ts 기존 rewrites()에 /api/v1/:path* → API_HOST 항목 추가(/ads 규칙 보존·덮어쓰기 금지) + TOOLCHAIN 1줄 · verify:dev-api-proxy 또는 phase0-bootstrap needle · **File-Serial 다음 채팅=본 todo only**"
    status: completed
  - id: part9-pre2-auth-session-hardening
    content: "[grok-4.5|256K] [밀도:보안·최우선·단독세션] PART9-pre2 §0.9 실측: 세션쿠키 발급 0(main.ts cookie-parser 미등록·AuthService Set-Cookie 0)+AuthLogin/AuthSignup 실제 제출핸들러 0(Kakao 리다이렉트 외 전부 disabled)+WalletController 유저라우트 9개·KycController 2개 JwtAuthGuard 0·query/body userId 신뢰(IDOR) → httpOnly 세션쿠키 발급(로그인 성공 경로 전부 Set-Cookie, JSON accessToken 응답 유지)+JwtAuthGuard cookie fallback+§0.9 표 지정 라우트만 session userId 전환(내부 7라우트=범위 밖·가드 미부착) · verify:auth-session-cookie+verify:wallet-kyc-session-auth · verify:auth-flows/auth-jwt-runtime 회귀 PASS(약화 금지) · 선행=9-pre"
    status: completed
  - id: part9a-sdk-user-feed
    content: "[grok-4.5|256K] [밀도:가벼움] PART9a @aipo/sdk/user-feed (fetchOpportunityFeed/Detail/DayPulse) + package exports · listFeed 응답 nearMissCount → BalanceAwareHome prop nearMissExtraCount 매핑 필수 · 선행=9-pre2 · verify:sdk-user-feed · **2~3개 연속 묶기 OK**(9a·9b)"
    status: completed
  - id: part9b-verify-live-wire
    content: "[grok-4.5|256K] [밀도:가벼움] PART9b verify home/profits/wallet-live-wire 3종 + CATALOG + domain-by-path 등재 + 9-pre2 신규 verify 2종(auth-session-cookie·wallet-kyc-session-auth) CATALOG 동시 등재 · **2~3개 연속 묶기 OK**(9a·9b)"
    status: completed
  - id: part9c-home-live-wire
    content: "[grok-4.5|256K] [밀도:무거움·체감최우선] PART9c 홈 / live feed+DayPulse · HomePageClient · 401 graceful(9-pre2 세션쿠키 배선 선행 필수) · verify:home-live-wire PASS · 선행=9a·9b · **단독 세션 권장**"
    status: completed
  - id: part9d-home-principal-slots
    content: "[grok-4.5|256K] [밀도:무거움] PART9d §5.3 B/D HomePrincipalRail + Canon wire + lux-feed-grid · verify:home-principal-slots · 선행=9c · **단독 세션 권장**"
    status: completed
  - id: part9e-profits-detail-wire
    content: "[grok-4.5|256K] [밀도:가벼움] PART9e /profits + /profits/[id] live · verify:profits-live-wire PASS · 선행=9a · **2~3개 연속 묶기 OK**(9e·9f)"
    status: completed
  - id: part9f-wallet-live-wire
    content: "[grok-4.5|256K] [밀도:가벼움] PART9f /wallet buckets 조회 화면 배선(순수 프론트 — Nest 인증전환=9-pre2 완료 전제) + @aipo/sdk/wallet fetchWalletBuckets · verify:wallet-live-wire · **2~3개 연속 묶기 OK**(9e·9f)"
    status: completed
  - id: part9f2-withdraw-flow-wire
    content: "[grok-4.5|256K] [밀도:무거움·신규화면] PART9f2 §0.9 실측: /wallet/withdraw·/withdraw/usdt·/withdraw/krw 3페이지 금액입력·수수료·step-up UI 0 → WithdrawAmountPanel 신규 + step-up challenge/verify + POST /wallet/withdraw(idempotencyKey) · PrincipalConfirmSheet 토큰=클라랜덤(서버미검증) pointer(재설계=Money 후속·범위 밖) · verify:withdraw-flow-wire · 선행=9f·9-pre2 · **단독 세션 권장**"
    status: completed
  - id: part9g-growth-public-api
    content: "[grok-4.5|256K] [밀도:무거움] PART9g §0.9 실측(growth_control≠ticker_mode · 백엔드 설정저장소 0) → 신규 singleton growth_ticker_config(ticker_mode/counter_mode default off·RLS ON) + Nest GET /api/v1/growth/public-surface(read-only·PII 마스킹 서버측·ledgerTotal=settlement.completed aggregate only) · Owns=growth config read · verify:growth-public-surface · **완료조건: Admin 04 §9.2 교차표 테이블명 pointer 동기**(admin-growth-ticker-organic=후속 PATCH+Organic Hybrid · apps/admin 코드0) · **단독 세션 권장**"
    status: completed
  - id: part9h-home-ticker-wire
    content: "[grok-4.5|256K] [밀도:가벼움] PART9h 홈 ticker/counter 9g API 투영 · mode=off server-driven only · verify:ticker-pii-0+home-live-wire · 선행=9g·9c · **2~3개 연속 묶기 OK**(9h·9i)"
    status: completed
  - id: part9i-stub-page-actions
    content: "[grok-4.5|256K] [밀도:가벼움] PART9i deposit 주소조회·복사 + kyc 제출(멀티파트) + support wrong-chain POST 배선(withdraw=9f2 Owns·본 todo 범위 아님) · §0.6 pointer 해소 · verify 해당 게이트 + no-it-jargon · 선행=9-pre2 · **2~3개 연속 묶기 OK**(9h·9i)"
    status: completed
  - id: redesign-r1-home-truth-preflight
    content: "[grok-4.5|256K] Redesign R1-1 · 02 HomeReadModelV1 선행 · HomePageClient/PART9 binding 보존 · guest/static scan claim·fake zero·ledgerTotal currency 오해·client sumAffordableExpectedProfitUsdt 제거(서버 derived 소비)·nearMiss 문맥·BottomNav 결과표시를 실제 state/Fact로 교정 · keep|adapt|new|remove mapping · HomePageV2/병렬 fetch0 · verify:home-state-truth/no-fake-zero-status/home-live-wire"
    status: completed
  - id: redesign-r1-home-visual-master-intake
    content: "[grok-4.5|256K] Redesign R1 · ADR-018 §9 H1 · Founder-provided Home Visual Master intake 등록 — 절차: candidate(원본 이미지 파일 레포 저장 0·세션 참고만) → functional conflict check(Canon `factSurface`/`forbidden`·legal·a11y·security 스캔 · 충돌 시 `VISUAL_FUNCTIONAL_CONTRACT_CONFLICT`) → Founder가 'APPROVED VISUAL MASTER'로 명시 지정(confirmation) → 해당 화면 Visual Authority(ADR-018 §3) 최상단 registration(텍스트 pointer만 · 이미지 파일 커밋 0) · **Desktop/Mobile 별도 authority**(ADR-018 §10 · 한쪽만 제공 시 나머지는 register/LOCK 없이 구조적 provisional만 유지) · 일반 미승인 mockup과 Founder-approved Visual Master 구분(ADR-013 mockup 규칙은 미승인 이미지에만 적용) · **Founder 이미지가 실제 제공되기 전에는 본 todo status=pending 유지 · geometry/색/spacing/hero 추측 절대 금지** · 절차 SSOT=`.cursor/rules/visual-master-intake.mdc` · 완료조건=등록된 Visual Authority pointer+conflict check 기록(이미지 파일 0) · 다음=H5 New Visual Contract · **2026-08-16 COMPLETE:** Founder가 Desktop+Mobile Home 이미지 2장을 APPROVED VISUAL MASTER로 명시 지정 → `packages/ui/canon/contracts/peotteok-home-visual-master-intake.v1.md`(provenance/hash/dimensions + functional conflict matrix + legacy forensic preview + asset production candidates) + `home-visual-v2.wire.json visualMasterIntakeRef` 등록 완료 · Visual Contract/Implementation Contract/Visual Lock 착수 0 · runtime/CSS/API/DB 변경 0"
    status: completed
  - id: redesign-r1-home-brand-assets
    content: "[grok-4.5|256K] Redesign R1-2 · SPLIT(2026-08-16 ADR-018): (A) 착수 가능 — Brand Kit+markets manifest provenance/hash/public mirror · third-party logo AI재현0 · blocked/ready lifecycle · partner logo validation · 현재 ready 재사용 우선·중복에셋0 · verify:brand-assets/market-partner-trust + verify:brand-asset-provenance 신설+CATALOG · (B) 착수 금지(H5 New Visual Contract·H6 New Implementation Contract 이전) — Home Hero 신규 생성 · avatar 신규 시각 확정 · Home illustration 선택 · Home 배치용 시각 자산 확정 · 기존 robot+globe hero illustration/`wordmark-dark`/`BrandMark ✦`/legacy dark tokens(`lux-dark`)는 `LEGACY VISUAL CANDIDATE — NOT NEW MASTER AUTHORITY`로 취급(ADR-018 §13 개념 · 삭제·교체 금지·새 Master 근거 없는 재사용 금지) · **2026-08-16 PART A COMPLETE(Part B는 여전히 BLOCKED_UNTIL_H5_H6 · status는 의도적으로 pending 유지 — 스키마 전수 확인 결과 이 플랜 7개 파일 어디에도 `pending`/`completed` 외 3번째 값 전례 0·Part B 미완료를 completed로 표기하지 않음):** Brand Kit 6종(appIcon/maskableSource/wordmarkDark/aiAvatar/ogDefault/heroIllustration 4변형)+markets manifest 7 logos+membership manifest 5 badges 전수 SHA-256/size/PNG dims 계산 · canonical↔`apps/web/public/brand` mirror 17/17 byte-identical(icons 4종 appIcon/maskableSource/wordmarkDark/ogDefault는 리사이즈 export 대상이라 1:1 비교 제외) · 중복/stale 등록 0(단 `appIcon`==`maskableSource` 동일 바이트 NOTE 기록 · 의도 확인 필요) · ADR-018 §13 Legacy Visual Candidates 표에 `avatar-512.png` 행 누락 발견→보완(원표는 hero-illustration만 등재) · PWA icon export(`maskable-512.png`/`apple-touch-180.png`) 미생성 확인 → ADVISORY로만 기록(생성 0 · out-of-scope) · `tooling/verify/brand-asset-provenance.cjs` 신설(standalone·market-partner-trust와 동일 축·T0/T1/T2 gate 미배선)+`package.json`+CATALOG 등록 · verify:brand-assets/market-partner-trust/membership-badge-assets/brand-logo-single/brand-asset-provenance 전부 PASS · Part B(Home Hero 신규 생성·avatar 신규 시각 확정 등)·H4·H5·H6·H7·runtime·신규 asset 생성 = 착수 0 · **2026-08-16 SPLIT RESOLUTION(governance amendment · Part A 재실행/취소 아님 · Part B 삭제 아님·이전만):** File-Serial first-pending이 본 todo 자기 자신(Part B 잔여)에 묶여 순환하는 구조 문제를 해소하기 위해, 위 문단의 (B) 범위 전체를 신규 todo `redesign-r1-home-visual-asset-production`으로 이전한다(YAML 목록상 실제 위치 = H6.5 `redesign-r1-home-contract-sync` 바로 다음·H7 `redesign-r1-home-implementation` 바로 앞 · 원문 그대로 이전, 내용 재작성 0). 본 todo(`redesign-r1-home-brand-assets`)는 이 이전 이후로는 **Part A 범위만** 나타내며, Part A가 이미 완료됐으므로 지금 `completed`로 확정한다. 이 변경은 문서 구조 정리(governance amendment)일 뿐이며 Part A 재검증·재작업이 아니다."
    status: completed
  - id: redesign-r1-home-product-contract
    content: "[grok-4.5|256K] Redesign R1-3 · packages/ui/canon/contracts/peotteok-home-product-contract.v1.md 신설 · Facts/types/units/source/asOf/states/actions/allowlist/forbidden/zero-vs-absent/guest-auth 명시 · R0 fact-state registry와 1:1 · Visual/Implementation 섞기0 · verify:home-product-contract 신설+CATALOG · 2026-08-16 ADR-018: 본 Product Contract는 Functional Authority(ADR-018 §3)이며 시각 authority(Visual Master)와 여전히 분리 — 착수 시점 변경 없음 · **H-mapping:** H2(Home screen forensic)+H3(functional truth check)는 completed `redesign-r1-home-truth-preflight`가 이미 충족(재실행 금지) · 본 todo=**H4** · Visual Master의 geometry/색/spacing/hero는 결정하지 않음(H5 Owns) · 다음=H5 New Visual Contract(신규 todo) · **2026-08-16 COMPLETE:** `packages/ui/canon/contracts/peotteok-home-product-contract.v1.md` 신설(15섹션: route/state truth·data source matrix·Money semantics·KRW/USDT binding·actual-vs-estimated profit·opportunity binding·processing-time·AI summary·CTA ownership·states·update-schedule·conflicts·H5/H6 handoff·blocker count) · Money `WalletBuckets.profitUsdt`(실측: `trades.execution.service.ts` MATCH_SUCCESS 정산 시 profit bucket credit=출금가능 누적수익) 발견하되 `home-money-read.map.ts`의 `FORBIDDEN_RESPONSE_KEYS`(profitUsdt 포함) 하드 가드 확인 → name-match binding 대신 `FUNCTIONAL_BINDING_UNRESOLVED`로 정정 기록(가짜 binding 0) · `estimatedDurationSec`(Engine per-item, 초 단위) wire엔 도달하나 `opportunity-card-map.ts` 미매핑 발견 · KRW FX(Frankfurter fx-snapshot, fail-closed) 존재하나 `principalKrwApprox` 미배선 발견 · `verify:home-product-contract.cjs` 신설(standalone)+`package.json`+CATALOG 등록 · blocking conflict=0 · runtime/API/DB/Engine/Money/Auth 변경=0 · H5/H6/H7 착수=0"
    status: completed
  - id: redesign-r1-home-visual-contract
    content: "[grok-4.5|256K] Redesign R1 · ADR-018 H5 · New Home Visual Contract — 승인된 Home Visual Master(H1 completed)에서만 시각 계약(geometry·색·타이포·spacing·상태)을 파생 · **선행: H1 completed + Home Product Contract(H4) available** · **금지:** ADR-017 geometry 복사 · 기존 card proportions 자동 재사용 · 기존 Hero 자동 재사용 · old RightRail/Sidebar dimensions 자동 재사용 · 기존 hex를 새 Master와 무관하게 기본값으로 복사(ADR-018 §1.2/§6) · 산출물=`packages/ui/canon/contracts/<surface>.visual-contract.v1.md`(surfaceId desktop/mobile 분리 · ADR-018 §10) · Canon wire functional 필드(route/state/factSurface/forbidden)는 참조만(재정의 금지) · Home Visual Master 미등록 상태에서 착수 금지 · 다음=H6 New Implementation Contract · **2026-08-16 COMPLETE:** `packages/ui/canon/contracts/peotteok-home-visual-contract.v2.md` 신설(v1은 HISTORICAL 보존·변경0) — surfaceId `home-visual-desktop`(Desktop Master 단독 파생)+`home-visual-mobile`(Mobile Master 단독 파생) 분리 계약, 20섹션(authority refs/Desktop·Mobile composition/shared design language/layout·typo·card·color hierarchy/money·opportunity·AI visual hierarchy/update-trust/nav/responsive intent/accessibility/asset matrix/VISUAL_ONLY_EXAMPLE handling/H4 unresolved carry-forward/forbidden legacy reuse/H6 handoff) · 정확한 px 미증명 항목은 전부 관계·범위 또는 `PENDING_CALIBRATION_FROM_MASTER`로 명시(ADR-017 수치 대체 채움 0) · 색/spacing/radius/shadow/fontScale는 기존 Layer-1 토큰만 인용(신규 hex/px 발명 0) · ACTUAL_PROFIT_VISUAL_SLOT=APPROVED·RUNTIME_BINDING=UNRESOLVED 명시 보존(WalletBuckets.profitUsdt 등 어떤 Money 필드도 선택 안 함) · Update Schedule 리터럴 NOT_SUPPORTED 유지+대체안 3종(asOf/scanIdle/scanEmpty) 제시 · 영구 UI 이모지(👋/✨) 리터럴 런타임 미계약(강조는 타이포/색으로 대체, H5 결정) · asset 매트릭스 6항목 식별(ASSET_PRODUCTION_REQUIRED 4·REUSE 1·INVESTIGATE 1, 제작/생성 0) · ADR-018 §13 legacy candidate + §1.2 옛 geometry 값 재확인(둘 다 미인용) · `home-visual-v2.wire.json`에 `newVisualContractRef`/`newVisualContractStatus` pointer 추가(functional 필드 route/state/factSurface/forbidden 변경 0) · H6/H6.5/H7/Brand Assets Part B/Visual Lock 착수=0 · React/CSS/API/DB/Money/Engine/Auth 변경=0"
    status: completed
  - id: redesign-r1-home-implementation-contract
    content: "[grok-4.5|256K] Redesign R1 · ADR-018 H6 · New Home Implementation Contract — 새 Visual Contract(H5)와 기존 Functional/Product Contract(H4)를 실제 코드 구조에 매핑 · **선행: H5 completed** · **작성 전 의무(Legacy Replacement Safety Gate Safety-A):** 기존 Home 화면 component/hook/handler 전수를 `KEEP`/`REWIRE`/`REMOVE_FROM_RUNTIME`/`REPLACE`/`INVESTIGATE` 5분류(구 `keep|adapt|new|remove` 데이터 forensic=H2/H3와는 별개 축·혼동 금지) · 분류 없이 새 컴포넌트 추가 금지 · 이 단계에서만 keep/adapt/replace/remove(정확히는 위 5분류) 최종 결정 · Home Visual Master intake(H1) 완료 전 착수 금지(geometry/색/spacing/hero 추측 금지) · 다음=H6.5 contract sync"
    status: pending
  - id: redesign-r1-home-contract-sync
    content: "[grok-4.5|256K] Redesign R1-4 · Product→ADR-017→conflict-resolution→Implementation→Visual→wire→token SPEC→mapping→implementation-gate→manifest 전수 sync · semantic change면 v2 생성+before/after+affected gates, v1 in-place overwrite0 · 320~2560+ responsive/state truth/C01 COUNT lock · verify:canon-surfaces/home-product-contract/lux-theme-sync · 2026-08-16 ADR-018 SUPERSEDE: sync 대상에서 ADR-017/conflict-resolution/Visual/mapping/implementation-gate(구 시각 체인)는 HISTORICAL로 제외하고 대신 ADR-018 §9 intake로 생성될 신규 Visual Contract/Implementation Contract를 sync 대상으로 삼는다 · Product Contract→Canon wire functional 필드(route/state/factSurface/forbidden)→manifest 동기는 유지 · **선행조건(2026-08-16 정정): H5 New Visual Contract completed + H6 New Implementation Contract completed 둘 다 충족 전 착수 금지**(H1 intake만으로는 착수 불가) · 본 todo=**H6.5**"
    status: pending
  - id: redesign-r1-home-visual-asset-production
    content: "[grok-4.5|256K] Redesign R1-2B · 2026-08-16 SPLIT from `redesign-r1-home-brand-assets`(구 Part B 원문 그대로 이전 · governance amendment · 신규 발명 아님) — Home Hero 신규 생성 · avatar 신규 시각 확정 · Home illustration 선택 · Home 배치용 시각 자산 확정. 기존 robot+globe hero illustration/`wordmark-dark`/`BrandMark ✦`/legacy dark tokens(`lux-dark`)/`avatar-512.png`는 `LEGACY VISUAL CANDIDATE — NOT NEW MASTER AUTHORITY`로 취급(ADR-018 §13 · H1 intake `peotteok-home-visual-master-intake.v1.md` §10/§11 Asset Production Candidates와 동일 축) · 삭제·교체 금지 · 새 Master 근거 없는 임의 재사용 금지 · **착수 금지(선행 미충족):** New Implementation Contract(H6) completed 전 착수 금지 · H6.5 contract sync 완료 권장 · H7 presentation implementation 착수 전에 completed 필요(H7은 이 asset의 존재를 전제) · **위치(고정):** H6.5 이후 · H7 이전 · 다음(본 todo completed 후)=H7"
    status: pending
  - id: redesign-r1-home-implementation
    content: "[grok-4.5|256K] Redesign R1 · ADR-018 H7 presentation implementation · **SUPERSEDED ORDERING(더 이상 사용 금지):** ~~C01 semantic binding→Shell/Header/Nav→Hero→Money→Opportunity→RightRail→Partner/Footer 순서~~ · ~~STEP5 Slice 0~6 번호체계~~ · ~~ADR-017 시각 가정(구 peotteok-light geometry/Hero/RightRail/Sidebar 비율)~~ — 위 3항목은 새 구현의 근거로 재사용하지 않는다(ADR-018 §1.2/§6) · **새 정의:** Founder-approved Home Visual Master + New Visual Contract(H5) + New Implementation Contract(H6) 기반 **presentation replacement**(ADDITION 아님 · Legacy Replacement Safety Gate 전수 준수 · Safety-A KEEP/REWIRE/REMOVE_FROM_RUNTIME/REPLACE/INVESTIGATE 분류 없이 컴포넌트 추가 금지 · Safety-B runtime/interaction/data uniqueness=0 · Safety-C old+new 동시 렌더 금지) · 기존 functional runtime(HomePageClient fetch/세션/401 처리·SDK·Nest·ledger binding·C01 `ledgerTotal`=COUNT semantic fix)은 보존 · HomePageV2·병렬 fetch/SDK/Nest 재작성 0 · peotteok-light token은 새 Visual Contract가 재확정하기 전까지 임시 참고만(자동 상속 금지) · responsive/a11y/reduced-motion/perf · **선행:** H1 completed + H5 completed + H6 completed + H6.5 completed · **게이트:** 본 todo의 실제 runtime 변경 착수는 `UI_UX_ENTRY_GATE=OPEN`(02.5 verdict=`ENGINE_ACCEPTED_FOR_UI`) 이후에만 가능 — **현재 UI_UX_ENTRY_GATE=OPEN**(02.5 verdict=ENGINE_ACCEPTED_FOR_UI ISSUED · baseline ea-baseline-64b0f8a6d984-3657543f36b5 · 이력: 최초 판정 P0=QA8_ADMIN_BOUNDARY는 admin 인증/RBAC repair 후 재검증 PASS로 해소됨) · **Engine Gate는 충족되었으나 위 H1/H5/H6/H6.5 completed 선행조건은 불변이므로 Visual Master 없이 본 todo 착수는 여전히 금지**"
    status: pending
  - id: trust-age-spotcheck
    content: "[grok-4.5|256K] Redesign R1-6 수동실사 · **위치: H9(Founder review) 이후 · H11(certification) 이전**(ADR-018 H0~H11 실행 큐 SSOT) · R1 Home H7 implementation 완료 후 20·40·60~70대 각3명 · **Founder-approved new Home Visual Master 기반 화면** 가독성/새 5탭/3초 질문/C01 count/도움말이모지/퍼뜩첫인사/면책이모지0/성별중성 · 결과 evidence+Admin ai-logs?tab=spotcheck pointer · 자동 verify0 · 코드 수정과 분리"
    status: pending
  - id: redesign-r1-home-certification
    content: "[grok-4.5|256K] Redesign R1-7 · ADR-018 H11 certification · **인증 authority = New Visual Contract(H5) + New Implementation Contract(H6)** — historical `home-visual-implementation-mapping.v1.md`는 인증 근거로 재사용 금지(ADR-018 §4) · 필수 항목: New Visual Contract 충족+New Implementation Contract 충족+functional verification+responsive verification(320~2560+)+accessibility+Founder review(H9 증거)+visual lock 등록(H10 · `visual-locks.v1.json`)+Legacy Replacement Safety Gate 전수(Runtime/Interaction/Data uniqueness=0) · 기존 home-live-wire/home-principal-slots/home-state-truth/no-fake-zero-status/brand-asset-provenance + 신규 bottom-nav-result-indicator/home-horizontal-overflow 스크립트+package+CATALOG · T0/T1/T2 · known P0~P3 defect0 · governance observation snapshot · **선행: UI_UX_ENTRY_GATE=OPEN 필수 — 현재 OPEN**(02.5 verdict=ENGINE_ACCEPTED_FOR_UI · baseline ea-baseline-64b0f8a6d984-3657543f36b5 · 위 필수 항목 H7+H9+H10 completed 등은 불변) · 다음=R2"
    status: pending
  - id: redesign-r2-acquisition-contract
    content: "[grok-4.5|256K] Redesign R2-1 · /l/[variant]·/ads*·/auth/login|signup|complete-profile·/onboarding Product/Visual/Implementation Contract+wire+copy/API mapping · utility→capital disclosure·Nest JWT/Kakao/Passkey·consent·recovery · existing PART2/Infra contracts keep|adapt · 새 route0"
    status: pending
  - id: redesign-r2-acquisition-implementation
    content: "[grok-4.5|256K] Redesign R2-2 · R2 contracts 기준 Landing/Auth/Profile/Onboarding gap-only 구현 · existing GuestChrome/utility copy/consent/session-cookie/PART9 보존 · duplicate landing/auth component0 · 320~2560+/a11y/perf"
    status: pending
  - id: redesign-r2-acquisition-certification
    content: "[grok-4.5|256K] Redesign R2-3 · onboarding-experiential/auth-surfaces/landing-3s/marketing-compliance/operator-footer/auth-session-cookie + verify:acquisition-release 신설+CATALOG · actual guest/auth/error/resume · known P0~P3 defect0"
    status: pending
  - id: redesign-r3-wallet-contract
    content: "[grok-4.5|256K] Redesign R3-1 · /wallet·deposit·withdraw*·history·/me/kyc·get-usdt Product/Visual/Implementation Contract+wire · Money completed ledger/mutation API pointer only · principal/profit/locked/practice·1/19conf·KRW승인·KYC/step-up·error recovery"
    status: pending
  - id: redesign-r3-wallet-implementation
    content: "[grok-4.5|256K] Redesign R3-2 · wallet/deposit/withdraw/history/KYC gap-only · PART9 wallet/withdraw/stub-action wire 보존 · balance UPDATE0·offline money queue0·duplicate mutation0 · peotteok-light/a11y/responsive"
    status: pending
  - id: redesign-r3-wallet-certification
    content: "[grok-4.5|256K] Redesign R3-3 · wallet-live-wire/withdraw-flow-wire/bucket-invariant/withdraw-mode-default/kyc/deposit-confirm/plain-ko/webauthn + verify:wallet-release 신설+CATALOG · money/security 100% · known P0~P3 defect0"
    status: pending
  - id: redesign-r4-core-loop-contract
    content: "[grok-4.5|256K] Redesign R4-1 · /profits·/profits/[id]·/trades·/trades/[id]/execute Product/Visual/Implementation Contract+wire · object identity·preflight·running/requeue/success/safe_stop·proof/freshness/recovery · Engine Rule 재정의0"
    status: pending
  - id: redesign-r4-core-loop-implementation
    content: "[grok-4.5|256K] Redesign R4-2 · discovery→detail→preflight→participate→execution→receipt/safe-stop gap-only · existing SDK/feed/polling/PART9 보존 · trader semantics/random/fake progress0 · peotteok-light/a11y/responsive"
    status: pending
  - id: redesign-r4-core-loop-certification
    content: "[grok-4.5|256K] Redesign R4-3 · profits-live-wire/execution-surfaces/match-success-rule/preflight-may-stop/participate-proof/cta/jargon/margin/image + verify:core-loop-release 신설+CATALOG · success/safe-stop 실제 E2E CI · known P0~P3 defect0"
    status: pending
  - id: redesign-r5-account-hub-contract
    content: "[grok-4.5|256K] Redesign R5-1 · /me·settings·membership·invite·inbox·benefits·events·strategies·peotteok·support·guide·legal Product/Visual/Implementation Contract+wire matrix · 4그룹 profile/security/money/help · existing domain SSOT pointer"
    status: pending
  - id: redesign-r5-account-hub-implementation
    content: "[grok-4.5|256K] Redesign R5-2 · Account Hub route 전수 gap-only 통합 · existing BenefitHub/Invite/Inbox/Membership/Peotteok/Guide/Legal 재사용 · duplicate hub/copy/fact path0 · peotteok-light/a11y/responsive"
    status: pending
  - id: redesign-r5-account-hub-certification
    content: "[grok-4.5|256K] Redesign R5-3 · benefits/invite/membership/inbox/ai-coach/trust/legal/notification/support/market-weekly + verify:account-hub-release 신설+CATALOG · route-contract matrix 100% · known P0~P3 defect0 · 03 pending0 후 04 Admin"
    status: pending
isProject: false
---

# AI Profit OS — UI & UX (v7.24.1 · ADR-018 Visual Master Reset + Redesign R1~R5 hybrid)

> 분리 플랜 — Index: `ai_profit_os_00_index_a1b2c3d4.plan.md` · ARCHIVE: `ai_profit_os_launch_54c1261e.plan.md` · 착수전: `docs/CONSTITUTION_BOOTSTRAP.md`  
> **단일 편집본:** 워크스페이스 `.cursor/plans` 해시 파일만 · 외부 `플랫폼_전체_재설계_로드맵_d903eef7`=REFERENCE ONLY · 홈 orphan 플랜 실행 금지

> **제로 목표:** 오류0 · 결함0 · 오차0 · 중복0  
> **모델 잠금:** 신규 Redesign todo 전부 **`[grok-4.5|256K]`** · 한 채팅=한 todo · 묶기0 · 실물 gap-only
> **completed 잠금:** PART0~8c+PART9 전부 불변·재실행 금지. v7.22 밀도/묶기 표는 완료 이력이다.
> **현재 실행 권위:** 00 R0 → 01 R1 → 02 R1 뒤 본 파일. 본 파일 첫 pending=`redesign-r1-home-truth-preflight`.
> **v7.22.59 (PART9 CLOSE):** 9-pre~9i verify PASS·T0 commit · Index/BOOTSTRAP 「다음」=`trust-age-spotcheck` · **v7.22.58 이력:** 착수전 포인터=`part9-pre-dev-api-proxy`
> **v7.22.57 (PART9 Live Wiring 흡수 · 코드0 메타):** 홈감사 `ui_live_wiring_part9_a6643cf7` v2 → 본 파일 YAML 흡수(9-pre~9i 12건 + 8d 유지·중복0) · §0.9 실측 요약 · §0.8.3 PART9 행 · File-Serial=9 완료 후 8d · composer 태그 **0**  
> **v7.22.56 (pending todo 밀도 · 코드0):** 미완료 YAML에 `[밀도:*]` + 묶기 힌트 · §0.8.3 표 밀도 열 · completed todo 변경 **0** · *(v7.22.57이 pending 큐를 PART9로 supersede)*  
> **v7.22.55 (§6.4c.1 5결정문 · 코드+문서 SSOT · 오류0):** (1) 톤 허용 시점 SSOT=로그인 후·첫 capital surface(`/`,`/profits`,기회 CTA)부터 수익|투자|USDT 언어 허용 · Guest(`/l/*`→`/onboarding`·`/auth/*`)=utility 유지 + 온보딩 첫화면 `transitionDisclosure` 1줄(**전환 고지≠capital 톤 허가**) · §6.4 ACTION「수익 벌기」**supersede**=capital surface only · (2) 랜딩 포지셔닝=`시세·가격 비교`(괴리율·차익 **0**) · `copy/ko/landing` ↔ Infra §31.4 sanitizer ↔ `verify:marketing-compliance` **동시** 갱신이 완료 조건 · (3) GuestChrome consent Owns=Infra `packages/sdk/marketing` · UI=`consentMarketing===true`일 때만 Lead emit · 미실장=emit **0** · (4) 완료 정의=`verify:landing-3s`+`verify:marketing-compliance`+`verify:operator-footer` · (5) PART2c-pre를 §0.8.2 #5로 **같은 diff 승격**(File-Serial 위반≠·의존 삽입)  
> **v7.22.54 (듀얼레이어 광고 Compliance · 오류0):** §6.4c.1 신설 — `/l/*`·`/ads/*`=**utility-only** · `LandingOperatorFooter` · `utilityDisclaimer` 2중 · CTA=`실시간 시세 맵 열기` · PART2c-pre · CAPI=Infra Owns · File-Serial=2b→**2c-pre**→2c  
> **v7.22.53 (§0.8.2~3 패치):** 감사조치/구현시점 열 · verify 검사범위 1줄 · 실행밀도 · §51.20 wording — v7.22.52 불변  


> **v7.22.20:** §48.3a `assetImageUrl` · `시세 불러오는 중...` · 필터 `가방`  
> **v7.22.21:** §5.3a 잔액 인식 홈 · 사진 PNG 목업 **레포 0**  
> **v7.22.22:** §5.9.1a 친구초대 **20~70 설명** · 초대횟수∞ 카피 · Money §51.5 pointer  
> **v7.22.23:** §48.6 **매칭 성공 조절** · 난수 성공률 **0** · Engine §48.13.3 · **apps/admin Owns=Admin** (UI Canon만)  
> **v7.22.24:** §5.9.2c·§51.18a **멤버십 등급·AI 해금 설명·참고율·고액 희소** · Engine §0.0.7  
> **v7.22.25:** §50.1n **알림 prefs 가입 기본 전부 ON** · §5.9.4 쪽지함 · §5.9.2c **등급 배지=Brand Kit 벡터** (사진목업 0)  
> **v7.22.26:** **§5.3b** 기회스캔 홈·`arbitrageTypeKo` · Index §20.1 · Engine §4.2a  
> **v7.22.27:** 자본참여자 · Index §20.2 · Engine §4.2b · 유저 trader 용어 **0**
> **v7.22.28:** 유저 CTA **`수익 벌기`** · domain=`participate` · `expectedSellDays` 유저0 · CTA후≈1분 · 상세=`이 기회로 수익 벌기` · `이 상품으로…` 금지  
> **v7.22.29:** Soft60/Hard90 · REQUEUE·`MATCH_TIMEOUT` 유저 카피 **3줄** · Index §20.2 · Audit A4  
> **v7.22.30:** **§48.3b** 매칭 긴장감(과정 Fact) · Soft/Hard **전 등급 동일** · 등급≠대기특권 · Index §20.2 · Audit A6  
> **v7.22.31:** 시장 카피 **동적 LabelKo** · Day-1 listing Owns=Engine §0.0.1a (ebay멀티\|admin)  
> **v7.22.32:** `yahoo_jp` **adapter/ENV/listing Day-1 = 영구 FORBIDDEN** (철회 0) · **표기(로고+LabelKo)는 v7.22.41이 supersede**  
> **v7.22.40:** **§33.2a** PublicTicker surface · G4 Organic Hybrid **pointer**=Admin §35.4 · PII0·DayPulse merge0  
> **v7.22.41 (Founder lock):** **§38.10 Market Partner Trust** — eBay·Amazon·Yahoo! JAPAN Auction 등 **공식 협력사** · 회사 **로고+LabelKo** · 「시세 참고만」단독 톤 **폐기** → 「공식 협력 · 시세·데이터 연동」 · orchestrateTruth(직접 사지 않음) **유지** · v7.22.32 **표기 금지 supersede** · **adapter 금지(v7.22.32) 불변** · Engine §0.0.1c  
> **v7.22.42:** **§5.9.5 혜택·미션 허브** `/me/benefits` — Daily/One-Time/Weekly/Streak·Hero·캠페인 캐러셀 · Credits 화폐 **0** · auto ledger=Money **§51.8a** · Engine **§48.13.4** fanout only · Admin `growth?tab=missions`  
> **v7.22.43:** 퍼뜩 OpenAI/풀스택 pointer · Engine §47.15 completed · UI §6.4e.1 = `ai-coach-ui`  
> **v7.22.46 (감사 흡수):** UI preflight §0.6 · Admin 교차 §0.7 · todo Grok256K PART0~8 · `yahoo-jp-copy-ban`→`market-partner-trust-surfaces` · `admin-match-strictness-ui`→Admin Owns · composer 혼재 제거 · routes 누락(`/me/benefits`·`/me/guide/partners`) 잠금  
> **v7.22.47 (Founder 흡수):** **§27.10** — 유저 **도움말·쉬운말·퍼뜩 말투·빈화면·힌트** 전면 **한글친화 + 귀여운 이모지** · 한국 **20~70대** 공통 호감 · 표면별 캡/팔레트 · 「이모지 전부」=전 표면 적용(폭탄·카지노·면책과다 **0**) · Owns=`korean-first-copy` · 배선=`ai-coach-ui`·`plain-korean-surfaces`·`toast-notification`  
> **v7.22.48 (Pre-UI Runtime Gate 흡수 · Engine §0.9 pointer):** 실측 재검증에서 `participate`/`execute`/유저 기회 피드 API가 **코드 0**임이 확인 → Engine `02`가 REOPEN(가산 `engine-runtime-preflight-gap`~`engine-pre-ui-close`) · Money `money-user-benefits-read` 가산 · **본 파일 전 todo 착수는 그 완료 후만**(§0.6 갱신) · `trade.execution.step`는 Phase0=**polling**(`execute-tick`) 채택(SSE 가정 폐기·Phase1+ 전환 시 응답채널만 교체) · 기존 stub 페이지 미배선 버튼(§0.6 실측 표) pointer 신설  
> **v7.22.49:** **§27.8a** Store listing 한글 short/full 카피 Owns=UI · APK/AAB·Console 절차=PWA §24 **pointer only** · UI todo 가산 **0**  
> **v7.22.50 (UI preflight 감사 흡수 · `ui-preflight-constitution` 기록):** 마스터감사 3정정만 SSOT에 반영 · **File-Serial/PART0→8 순서·todo 가산 0** · (1) §6.2/§33.1 색 hex 표 → shipped `lux-fintech.ts`(visual_kit_v1) 미러 · (2) §29.6 `realtime-service` = Phase1+ 인터페이스(Phase0=polling 훅 계약) · (3) eBay `assetId: query:*` ingest drop = Engine-owned backend gap 로그(§0.6·§48.3a pointer) · UI는 `ProductImage` source-agnostic만  
> **v7.22.52 (종합 실물 재검증 · 5관점 감사 · `§0.8` 신설):** 유저 요청형 "DB·마이그레이션·함수·SQL·테이블·엔진·Supabase·폴더·기술스택·파일·헌법·기술코드 전수 확인" 감사 · Supabase MCP 재실측 + 레포 FS 전수 + 04 Admin/01 Money/05 PWA/06 Infra 전문 재확인 · **File-Serial/PART0→8 순서·모델배정 변경 0**(적합 판정) · 발견 5건: (1) migration 파일명 버전 drift(로컬≠원격) → **즉시 rename 해소** (2) `verify:benefit-hub-surfaces`="live" 표기가 Money API 존재만 검사·§5.9.5 딥 UI 미검증(실제 페이지=1줄 골격)인데 "완료"로 오독될 위험 → 문서+todo content 경고 (3) `verify:margin-compare-surface` 3개 플랜 인용·실물 스크립트/컴포넌트 0(고아 참조) → todo content에 신설요건 명시 (4) Engine §51.20 Weekly Market Briefing이 유저 라우트 요구하나 UI Owns 절·PART배정·route등록 0(고아 게이트) → PART8b 범위 확장+§51.20 신설 (5) PART1~PART8 다수가 YAML `pending`인데 레포엔 이미 우량 구현체 존재(우량 드리프트) → PART별 실측 착수가이드(§0.8.3) 신설로 중복구현 방지  
> **v7.22.53 (`§0.8.2~3` 문서 패치 · 코드0):** §0.8.2 표에 **감사 세션 조치 / 구현 시점** 열 분리(동급 "해소" 혼동 제거) · §0.8.3 표에 **verify 검사 범위 1줄** 열 추가(스크립트 헤더+실측 대조) · **실행 밀도** 지침(1a~1d·5a~6c=갭-only·1채팅 목표 · 3c·4a·7b·8b=무거운 구현 · 4a·7b=유저 체감 최우선 부채 · File-Serial 순서 **유지**) · §51.20 "고아 게이트 해소"→**Owns 재배정·verify 미착수** wording 정정  

> **Consumer + AI 이름:** **퍼뜩** (동일) · Engine §47 P/G/S · 5탭 고정  
> **KR 유저 SSOT:** §27+**§27.10**(쉬운말·귀여운이모지·퍼뜩voice) · §38.9 toneBand · §50.1 fontScale 3단 · §38.8 테더준비 가이드 · **성별 UI 분기 금지**(중성 존댓말)  
> **Loop/Preflight:** **§51.24** (Admin/Engine/CATALOG pointer 대상 · 유령 절 금지)  

> **마진 공식:** Engine §0.0.4 Owns · UI=화면/카피만  
> **선행 CLOSED(불변):** 01 Money 15/15+benefits · 02 Engine 26/26+E-R1~E-R8 · PART0~8c+PART9. 신규 R1은 00/01/02 가산 pending 0 후 시작한다.

## v7.23.0 Redesign R1~R5 실행 계약

### Authority

- 출시 Consumer theme는 ADR-017 `peotteok-light` **Light+Purple 단일 테마**다. Lux Dark는 archive/legacy이며 dual toggle을 만들지 않는다. *(theme mode 방향 자체는 유지 · 정확한 시각 값은 아래 2026-08-16 ADR-018 참고)*
- 5탭 라벨은 **홈 · 기회 · 수익 · 지갑 · 내정보**다. href는 기존 `/`, `/profits`, `/trades`, `/wallet`, `/me`를 보존한다. *(IA/Functional authority — ADR-018 대상 아님)*
- Backend Fact > Product Contract > IA > Implementation Contract > Visual Contract > Reference 순서다. *(2026-08-16부터: "Implementation Contract > Visual Contract > Reference" 구간은 화면별로 ADR-018 §3의 Visual Authority 사다리로 대체되며, 앞의 "Backend Fact > Product Contract > IA" 구간은 ADR-018 §3 Functional Authority 사다리로 계속 유효 — 두 사다리를 섞지 않는다.)*
- PART9 `HomePageClient`·SDK·session/auth·Nest/ledger binding은 보존한다. `HomePageV2`와 병렬 fetch/data mapper를 금지한다.
- 각 R단계는 Contract → keep/adapt/new/remove mapping → implementation → certification 순서이며 이전 R단계 certification 전 다음 단계 착수를 금지한다.

> **v7.24.0 (2026-08-16 · ADR-018 Peotteok Visual Master Reset — Founder 승인 · 구현코드0):**
>
> **Old:** ADR-017 기반 Redesign R1 실행(Home Visual/Implementation Contract chain → STEP4 amend → STEP5 Slice 구현).
> **New:** **ADR-018 Visual Master Reset 기반 Screen-by-Screen Redesign.**
>
> ADR-017의 **시각 디자인 권위**(geometry·spacing·Hero composition·RightRail/Sidebar 비율·색 적용 등)는 종료되어
> [`ADR-018-peotteok-visual-master-reset.md`](../../packages/ui/canon/contracts/ADR-018-peotteok-visual-master-reset.md)로
> 승계되었다. ADR-017 문서·Founder ACK·conflict resolution history·비시각 데이터 바인딩 지식(C01 `ledgerTotal`=COUNT 등)·
> 접근성 원칙·API/state/routing은 historical evidence/functional truth로 보존한다(삭제 0).
>
> **새 진행 순서(화면 1개당 · 반복):**
>
> ```text
> 1. Visual Master intake
> 2. screen forensic
> 3. functional truth check
> 4. Visual Contract
> 5. Implementation Contract
> 6. implementation
> 7. verification
> 8. Founder review
> 9. Visual Lock
> 10. next screen
> ```
>
> `redesign-r1-home-implementation`(STEP5, 현재 위치 = Slice 4 CLOSED → Slice 5 RightRail/Slice 6 Partner 착수 대기)은
> 이 시점부로 **시각 구현 관점에서 SUPERSEDED / STOPPED BY ADR-018 VISUAL RESET**이다. 새 Home Visual Master가
> intake(위 1단계)되고 새 Visual Contract(4)·Implementation Contract(5)가 나오기 전까지 재개하지 않는다.
> `redesign-r1-home-product-contract`(R1-3)·`redesign-r1-home-contract-sync`(R1-4)의 "동기 대상"도 ADR-017 체인이
> 아니라 ADR-018 체인을 가리키도록 아래 todo content에서 갱신했다(YAML `status`는 변경하지 않음 — 여전히 `pending`).
>
> Change Control: `governance/platform-redesign/change-control.v1.md` §6.5 `cc.adr018.peotteok-visual-master-reset`(L3).
> **다음 허용 단계 = Founder-provided Home Visual Master intake.** 이 세션에서 Home 코드를 새로 구현하지 않는다.

> **v7.24.1 (2026-08-16 · ADR-018 PENDING TODO REBASE — 직전 `03_UI_UX ADR-018 PENDING TODO REBASE AUDIT REPORT` 기준 · governance/plan patch only · 구현코드0):**
>
> 아래 표가 R1 Home의 **H0~H11 실행 큐 단일 권위(SSOT)**다. v7.24.0의 "새 진행 순서(1~10)"를 대체하지 않고 H-번호 + todo id로 정밀화한다.
>
> | H | 단계 | todo id / 상태 |
> |---|------|------|
> | H0 | Founder Home Visual Master 제공 | 외부 이벤트(전제조건) · **제공됨(2026-08-16 · Desktop+Mobile 2장 · v7.24.3)** |
> | H1 | Visual Master intake | `redesign-r1-home-visual-master-intake` **completed**(2026-08-16 · v7.24.3 · `peotteok-home-visual-master-intake.v1.md`) |
> | H2 | Home screen forensic | `redesign-r1-home-truth-preflight` **completed**가 이미 충족(`keep\|adapt\|new\|remove` 데이터 mapping) — 재실행 금지 |
> | H3 | functional truth check | 위와 동일(`redesign-r1-home-truth-preflight` **completed**) — 재실행 금지 |
> | H4 | Product Contract | `redesign-r1-home-product-contract` **completed**(2026-08-16 · v7.24.6 · `peotteok-home-product-contract.v1.md`) · Functional Authority |
> | H5 | New Visual Contract | `redesign-r1-home-visual-contract` **completed**(2026-08-16 · v7.24.7 · `peotteok-home-visual-contract.v2.md` · surfaceId `home-visual-desktop`+`home-visual-mobile`) |
> | H6 | New Implementation Contract | `redesign-r1-home-implementation-contract` **(신규)** · pending · 선행=H4+H5 · KEEP/REWIRE/REMOVE_FROM_RUNTIME/REPLACE/INVESTIGATE forensic 포함 |
> | H6.5 | contract sync | `redesign-r1-home-contract-sync` · pending · 선행=H5+H6 |
> | — | Home visual asset production(brand-assets Part B) | `redesign-r1-home-visual-asset-production` **(2026-08-16 신규 · `redesign-r1-home-brand-assets` Part B에서 SPLIT · YAML 목록상 H6.5 바로 다음·H7 바로 앞에 위치)** · pending · 선행=H6 completed |
> | H7 | presentation implementation | `redesign-r1-home-implementation` · pending · 선행=H6.5 · **UI_UX_ENTRY_GATE=OPEN 필수 — 현재 OPEN**(Engine Gate 충족 · H6.5 Visual Master 선행은 불변) |
> | H8 | verification | 별도 todo 없음 — H7 완료조건 내 domain verify(T0/T1/T2)로 수행 |
> | H9 | Founder review | 별도 todo 없음 — H11 착수 전 승인, 증거는 H11 certification에 기록 |
> | — | `trust-age-spotcheck` | pending · **H9 이후 · H11 이전** 위치(고정) |
> | H10 | Visual Lock | `packages/ui/canon/visual-locks.v1.json` 등록 — H11 certification 내 수행 |
> | H11 | certification | `redesign-r1-home-certification` · pending · 선행=H7+H9+H10 |
>
> **02.5 UI_UX_ENTRY_GATE 분리** (`.cursor/plans/ai_profit_os_02_5_engine_acceptance_qa_fd1cd7cc.plan.md` pointer · **본 patch는 02.5 자체를 수정하지 않음**): 02.5는 QA0~QA9 todo **전부 completed**이고 **verdict=`ENGINE_ACCEPTED_FOR_UI`(ISSUED)** · **`UI_UX_ENTRY_GATE=OPEN`**이다(baseline `ea-baseline-64b0f8a6d984-3657543f36b5` · `governance/engine-acceptance/ENGINE_ACCEPTANCE_REPORT.md` · `pnpm verify:engine-acceptance` 라이브 재확인, 2026-08-16 resync). **이력(v7.24.1 기록 시점):** 당시 verdict는 `ENGINE_NOT_ACCEPTED`(defects.P0=1 · `QA8_ADMIN_BOUNDARY` — admin 라우트 19개 전부 미인증)였으며 해제 조건을 repair round(L8 `ENGINE_ACCEPTANCE_REBASE_V1`) 후 재판정으로 명시했었다. 그 repair(admin 인증/RBAC 배선)는 이후 완료됐고 QA1-8 재실행 → QA9 재판정을 거쳐 현재 상태에 도달했다(`plan-file-serial.mdc` "03 착수 = verdict `ENGINE_ACCEPTED_FOR_UI` + `acceptance_scope.unchanged` only" 조건 충족 확인됨). **주의: Engine Gate가 OPEN이라는 것은 H7 등의 즉시 실행 허용을 의미하지 않는다** — 아래 분리 원칙과 H1/H4/H5/H6/H6.5 Visual Master 선행조건은 이 gate와 별개로 계속 적용된다.
>
> **분리 원칙:** H1 intake·H5 Visual Contract·H6 Implementation Contract·H6.5 contract sync 및 본 patch류 governance/문서 작업(구현 코드 0)은 `UI_UX_ENTRY_GATE` 상태와 무관하게 진행 가능하다. 그러나 **H7 presentation implementation의 실제 runtime 변경, H8 verification의 실제 build/E2E, H9 Founder review의 "실제 화면" 확인, H10 Visual Lock 등록, H11 certification의 실제 인증은 `UI_UX_ENTRY_GATE=OPEN`(02.5 verdict=`ENGINE_ACCEPTED_FOR_UI`) 이후에만 착수한다.** R2~R5의 각 `-implementation`/`-certification` todo도 동일 게이트가 적용된다(아래 R2~R5 절). **2026-08-16 현재 `UI_UX_ENTRY_GATE=OPEN`으로 이 조건은 충족되었다 — 남은 것은 각 todo 본문의 H1/H4/H5/H6/H6.5(및 R2~R5는 해당 화면 Visual Master) completed 선행조건뿐이며, Visual Master가 없는 화면에 대한 임의 재설계는 여전히 금지다.**
>
> **status 처리:** 본 patch는 governance 구조 변경만이다. 기존 `completed` 변경 **0** · 기존 `pending` 임의 complete 처리 **0** · 신규 H1/H5/H6 = `pending`(Founder 이미지 제공 전 H1 complete 금지).
>
> **v7.24.3 (2026-08-16 · H1 HOME VISUAL MASTER INTAKE COMPLETE · governance/문서 전용 · 구현코드0):** Founder가 본 세션에서 Desktop Home + Mobile Home 이미지 2장을 각각 `APPROVED VISUAL MASTER — DESKTOP HOME` / `APPROVED VISUAL MASTER — MOBILE HOME`으로 명시 지정했다(ADR-018 §9 intake 절차 §2 확인 단계 충족). `redesign-r1-home-visual-master-intake`(H1) = **completed**. 산출물: `packages/ui/canon/contracts/peotteok-home-visual-master-intake.v1.md`(provenance registry·SHA-256·dimensions·Desktop/Mobile 시각 intent·Money/Processing-time/AI role lock·Functional Conflict Matrix·Legacy Home forensic classification preview·Asset Production Candidates) + `packages/ui/canon/surfaces/home-visual-v2.wire.json`에 `visualMasterIntakeRef`/`visualMasterIntakeStatus` pointer 추가(`layout.*`/`factSurface`/`forbidden`/`navLabels` 등 기존 functional 필드는 변경 0). 원본 이미지 파일은 레포에 저장하지 않았다(ADR-013/ADR-018 §9 불변). Functional Conflict Matrix에서 발견된 항목 중 **blocking conflict(구현을 막는 미해결 충돌) = 0** — `NOT_SUPPORTED`(다음 업데이트 예정 시각) 1건과 `VISUAL_FUNCTIONAL_CONTRACT_CONFLICT`(영구 UI 이모지 👋/✨ · 기존 legacy AI 마스코트 자산 스타일 불일치) 2건은 **H4/H5에서 Founder 결정 대기**로 기록만 하며 H1을 임의로 완료 처리하지 않았다(§16 정책 준수). Visual Contract(H5)·Implementation Contract(H6)·Visual Lock(H10)·실제 runtime 착수 = 모두 **0**(불변). R1 Home hybrid state(§R2~R5 Hybrid Rebase 상태모델과 동일 축) = `WAITING_FOR_MASTER` → **`MASTER_INTAKE`(완료)** → 다음 `VISUAL_CONTRACT`(미착수). **File-Serial 다음 pending = `redesign-r1-home-brand-assets`**(R1-2 · Part A만 착수 가능 · Part B는 H5/H6 이후) — `redesign-r1-home-product-contract`(H4)는 그 다음이다.
>
> **v7.24.4 (2026-08-16 · REDESIGN-R1-HOME-BRAND-ASSETS PART A COMPLETE · governance/검증 스크립트 전용 · runtime 0):** `redesign-r1-home-brand-assets`(R1-2) Part A(Brand Kit+markets manifest provenance/hash/public mirror) 실행 완료. Brand Kit 6종(appIcon·maskableSource·wordmarkDark·aiAvatar·ogDefault·heroIllustration 4변형)+markets manifest 7 logos+membership manifest 5 badges = 21개 canonical 자산 SHA-256/size/(PNG only)dimensions 전수 계산, `apps/web/public/brand/**` public mirror 17/17 byte-identical 확인(icons 4종은 리사이즈 export 대상이라 1:1 비교 제외), 중복/stale 등록 0(informational: `appIcon`==`maskableSource` 동일 바이트). `tooling/verify/brand-asset-provenance.cjs` 신설(standalone·`market-partner-trust`와 동일 축·T0/T1/T2 gate 미배선) + `package.json`+CATALOG 등록. 부수 발견: ADR-018 §13 Legacy Visual Candidates 표에 `avatar-512.png` 행이 원래 없었음(hero-illustration만 등재) → 보완 완료(governance 완전성 fix, 코드0). PWA icon export(`maskable-512.png`/`apple-touch-180.png`) 미생성은 ADVISORY로만 기록(생성 0). **Part B(Home Hero 신규 생성·avatar 신규 시각 확정 등)·H4·H5·H6·H7·runtime·신규 Home visual asset 생성 = 착수 0.** 본 플랜의 `status:`는 `pending`/`completed` 2값만 사용한 전례(7개 파일 전수 확인) 외 3번째 값이 없어, Part B 미완료 상태에서 본 todo를 `completed`로 표기하지 않았다 — todo `content`에 Part A 완료 증거를 append하고 YAML `status`는 의도적으로 `pending` 유지(Part B가 열려 있다는 뜻이며 실패가 아니다). **File-Serial 재확인:** YAML 순서상 다음 `pending`은 `redesign-r1-home-brand-assets` 자신(Part B 잔여)이며, H-table SSOT상 `redesign-r1-home-product-contract`(H4)는 이 todo의 Part B에 의존하지 않는다(H4 선행=H1+H2+H3뿐) — 단 이 문서는 그 사실을 **보고만** 하며 H4 착수를 승인하지 않는다.

### R1 Home

- Product Contract 신규 파일: `packages/ui/canon/contracts/peotteok-home-product-contract.v1.md`. *(변경 없음 — 여전히 필요한 다음 파일 · H4)*
- ~~동기 대상: ADR-017, conflict-resolution, Product, Implementation, Visual, `home-visual-v2.wire.json`, `peotteok-light.specification.md`, mapping, implementation-gate, Canon manifest.~~ **(SUPERSEDED 2026-08-16 — 위 ADR-018 note 참고)**
- **동기 대상(신규 · 2026-08-16):** ADR-018, Product Contract(신규 작성), 화면별 New Visual Contract, 화면별 New Implementation Contract, 새 Canon wire(functional 필드만 승계·geometry는 신규 추출), Canon manifest, Change Control §6.5.
- 의미 변경은 새 major 문서 버전과 before/after diff를 요구한다. `.v1.md` 의미를 조용히 덮어쓰지 않는다.
- ~~구현 순서: C01 `ledgerTotal=COUNT` → Shell/Nav → Hero → Money → Opportunity → RightRail → Partner/Footer.~~ **(STEP5 Slice 순서 · old peotteok-light geometry 가정 — SUPERSEDED/STOPPED, 새 구현의 근거로 재사용 금지. C01 semantic fix 자체는 롤백 대상 아님.)**
- **구현 순서(신규 · SSOT):** 위 v7.24.1 콜아웃의 **H0~H11 표** — `redesign-r1-home-visual-master-intake`(H1) → `redesign-r1-home-visual-contract`(H5) → `redesign-r1-home-implementation-contract`(H6) → `redesign-r1-home-contract-sync`(H6.5) → `redesign-r1-home-implementation`(H7, **UI_UX_ENTRY_GATE=OPEN 필수 — 현재 충족**, Visual Master 선행 H1/H5/H6/H6.5는 불변) → `trust-age-spotcheck` → `redesign-r1-home-certification`(H11).
- 수동 `trust-age-spotcheck`은 **H9(Founder review) 이후 · H11(certification) 이전**에 위치한다(고정 · 재정렬 금지).

### Legacy Replacement Safety Gate (ADR-018 신규 · 전 R-stage 공통 · 2026-08-16)

> 새 UI를 기존 UI **위에 추가**하는 방식은 금지한다. 화면 구현은 **ADDITION이 아니라 REPLACEMENT**다. 아래 3개 축은 R1~R5 전 화면의 Implementation Contract 작성·presentation implementation·certification에서 공통으로 적용한다(R1 Home 기준 = H6/H7/H11).

#### Safety-A. KEEP / REWIRE / REMOVE_FROM_RUNTIME / REPLACE / INVESTIGATE forensic

New Implementation Contract 작성 전, 기존 화면의 component/hook/handler를 전수 분류한다 — **분류 없이 새 컴포넌트를 추가하지 않는다.**

| 분류 | 의미 |
|------|------|
| `KEEP` | 기능/데이터/보안 로직 — 그대로 보존 |
| `REWIRE` | 기능은 보존하되 새 presentation에 연결 |
| `REMOVE_FROM_RUNTIME` | 기존 presentation이 새 Master와 충돌 — **runtime import에서 제거**(history/legacy source 파일 삭제는 별개이며 무조건 삭제 금지) |
| `REPLACE` | 새 Visual Master 기반 component로 대체 |
| `INVESTIGATE` | presentation과 business logic이 혼재 — 분리 필요 대상으로 등록만(본 단계에서 분리 완료를 요구하지 않음) |

> 이 5분류는 **presentation-component forensic**이다. `redesign-r1-home-truth-preflight`가 이미 수행한 `keep\|adapt\|new\|remove`(데이터/functional forensic, H2/H3)와는 **별개 축**이며 서로 대체하지 않는다.

#### Safety-B. Runtime / Interaction / Data uniqueness (certification 필수 검사)

교체 완료 화면은 아래 항목 전부 = **0**(중복 없음)이어야 certification PASS:

- **Runtime uniqueness:** old presentation runtime reference=0 · new presentation runtime=1 · duplicate page shell=0 · duplicate sidebar=0 · duplicate header=0 · duplicate bottom navigation=0 · duplicate sticky CTA=0 · duplicate modal/sheet=0
- **Interaction uniqueness:** duplicate Primary CTA=0 · duplicate onClick action=0 · duplicate form submit=0 · duplicate mutation=0 · duplicate participate request=0 · duplicate withdraw request=0 · duplicate toast trigger=0
- **Data uniqueness:** old/new presentation으로 인한 duplicate API fetch=0 · duplicate polling loop=0 · duplicate subscription/listener=0 · duplicated local business logic=0

기존 presentation component가 더 이상 쓰이지 않으면 **runtime import에서 제거**한다(Safety-A `REMOVE_FROM_RUNTIME`). 단 history 파일·legacy source 자체를 무조건 삭제하는 것은 금지한다.

#### Safety-C. No dual render

어떤 화면에서도 최종 교체 시 다음 구조는 **금지**:

```text
OLD PRESENTATION + NEW PRESENTATION
```

정상 구조만 허용:

```text
PRESERVED DATA / ACTION / BUSINESS LOGIC
                ↓
       NEW PRESENTATION ONLY
```

feature flag·임시 비교가 필요해도 별도 승인 없이 production route에서 old/new를 동시 렌더하지 않는다.

### R2~R5

- R2 Acquisition: Landing/Auth/Profile/Onboarding. utility→capital 경계와 consent/Auth recovery를 보존한다.
- R3 Wallet: Wallet/Deposit/Withdraw/History/KYC. Money ledger/mutation은 pointer이며 UI에서 재구현하지 않는다.
- R4 Core Loop: Opportunities/Participate/Trades/Execution/Settlement. Rule·상태·object identity를 보존한다.
- R5 Account Hub: Me/Settings/Membership/Invite/Inbox/Benefits/Events/Strategies/Peotteok/Support/Guide/Legal.
- 모든 route는 R0 route-contract matrix의 Product/Visual/Implementation/Canon/Copy/API/Owner/Verify 열을 100% 채운다.
- certification은 known P0/P1/P2/P3 defect 0, required a11y/responsive/performance 100%, 해당 domain verify+T0/T1/T2를 요구한다.

> **R2~R5 Hybrid Rebase (2026-08-16 · ADR-018 · 구현코드0):** 위 4단계의 "Product/Visual/Implementation Contract"는 **하이브리드**로 실행한다 — **Functional Contract는 R-stage 단위 유지**(4개 `-contract` todo가 Product Contract·API·copy·route mapping을 R-stage 그룹으로 계속 작성) 하되 **Visual은 screen(route)-specific ADR-018 Visual Master authority**를 따른다(R-stage 단위로 뭉쳐서 시각을 확정하지 않음). 각 화면은 아래 상태 중 하나를 갖는다:
>
> ```text
> WAITING_FOR_MASTER        ← 기본값(Visual Master 미제공)
> MASTER_INTAKE             ← candidate intake 진행 중(ADR-018 §9)
> VISUAL_CONTRACT           ← Visual Contract 작성 중/완료
> IMPLEMENTATION_CONTRACT   ← Implementation Contract 작성 중/완료
> IMPLEMENTING              ← presentation replacement 진행 중(Legacy Replacement Safety Gate 적용)
> VERIFYING                 ← 도메인 verify + T0/T1/T2
> FOUNDER_REVIEW            ← Founder 승인 대기/진행
> VISUAL_LOCKED             ← visual-locks.v1.json 등록 완료
> LEGACY_VISUAL_UNCHANGED   ← Visual Master 없음 · 기존 화면 시각 유지(임의 재설계 금지)
> ```
>
> **현재:** R2~R5의 모든 화면 = `WAITING_FOR_MASTER`(R1 Home 외 어떤 화면에도 아직 Visual Master가 제공되지 않았다). Visual Master가 없는 화면은 **임의 재설계 금지** — `LEGACY_VISUAL_UNCHANGED`로 유지하며 해당 `-implementation` todo는 그 화면에 대해 **기능 gap-only**만 수행한다(시각 변경 0). 위 12개(R2~R5 `-contract`×4·`-implementation`×4·`-certification`×4) todo YAML content의 "Product/Visual/Implementation Contract" 문구는 본 hybrid 모델의 적용을 받는다 — 문구 자체는 축약 표기로 유지하고 본 절이 override한다(개별 재편집·중복 서술 금지). Legacy Replacement Safety Gate(위)는 R2~R5 어떤 화면이 `IMPLEMENTING`으로 전환되어도 동일하게 적용되며, 각 `-implementation`/`-certification` todo의 실제 runtime 착수도 R1과 동일하게 **`UI_UX_ENTRY_GATE=OPEN` 이후에만** 가능하다. *(2026-08-16: Engine 측 `UI_UX_ENTRY_GATE=OPEN` 조건은 충족됐으나, 이 절의 핵심 제약인 **Visual Master 부재**는 R2~R5 전 화면에서 불변이다 — Engine gate 충족이 Visual Master 요구를 대체하지 않으며, `WAITING_FOR_MASTER` 화면은 계속 `LEGACY_VISUAL_UNCHANGED`/기능 gap-only로만 진행한다.)*

## 0.6 UI 착수 전 실측 (v7.22.48 · `ui-preflight-constitution` · **PASS v7.22.50** · 예측0 · 감사 3정정 흡수)

> **Owns:** 본 절 + BOOTSTRAP §0.6 동기 · **구현 코드 0** (기록·갭표만) · v7.22 이력=`market-partner-trust-surfaces`→`part9-pre…9i`→`trust-age-spotcheck`; v7.23 현재는 00 R0부터다.
> **방법(2026-08-10 CLOSE 재실측):** 레포 FS(`CONSTITUTION/`29·Canon 28 wires·`apps/web`·`packages/ui`·ebay-adapter·catalog-runtime-seed·`lux-fintech.ts`) + Money/Engine YAML completed + Supabase MCP `list_tables`(public **76**) + CATALOG live 게이트 · `execute_sql`/`list_migrations`는 본 세션 MCP hook fail-closed로 차단 → mig/함수 수는 FS+§0.5.1 CLOSE 인용  
> **선행(v7.22.49 충족 · 재확인):** Money CLOSED(15/15+`money-user-benefits-read` **completed**) · Engine CLOSED(26/26+E-R1~E-R8 **completed** · `engine-pre-ui-close` **completed**) · Pre-UI Runtime Gate **CLOSED**  
> **v7.22.50 감사 기록(본 todo Owns · File-Serial 재정렬 0):** 색토큰 drift(U13) · realtime-service Phase0 reframe(U14) · eBay `query:` ingest gap(U15) — 아래 표·§0.6.2·본문 §6.2/§33.1/§29.6/§48.3a pointer에 **텍스트만** 반영 · **앱 구현코드 0**

| 대상 | 실측 (2026-08-09 · **+2026-08-10 v7.22.50 CLOSE**) | UI 함의 |
|------|-------------------|--------|
| Supabase | ref=`mgsytcetsiecllmhcyox` · Seoul · PG **17.6** · ACTIVE_HEALTHY | 원격 only · Docker OFF |
| `public` 테이블 | **76** · RLS ON (MCP `list_tables` 재실측) | mission_*/growth_*/execution_*/ai_* 존재 · Nest service_role |
| migrations | **28** 로컬 SQL · 끝=`20260809144814_catalog_runtime_day1_fx_bootstrap`(v7.22.52 §0.8.2 #1에서 `144409`→`144814` rename 해소 · 원격 1:1) | UI DDL **0** (스키마 Owns≠UI) |
| public 함수 | **5** (`ledger_*`3 + `users_stage_a_identity_ok` + `user_opportunity_overrides_pin_cap`) · §0.5.1 | Rule/RPC UI 호출 금지 · Nest API only |
| Gate MCP rows | `execution_policies` rows**1** · `opportunities` rows**6** · `assets`**94** · `listings`**12** | UI 배선 대상 존재(시드 경로) |
| mission SSOT | `mission_definitions`·`mission_accruals`·`mission_program_config` | UI=`/me/benefits` 표시 · accrual=Money §51.8a · **읽기 API=`GET /me/benefits(+summary)` live**(money-user-benefits-read completed) |
| **Engine — Gate CLOSE 후 (v7.22.49→50 · 오차0)** | E-R1~E-R8 **completed** · FS: `OpportunitiesUserController`·`BenefitsUserController`·`trades/:id/execute-tick` **live** · CATALOG `user-opportunity-feed`/`participate-http`/`execute-rule-loop` **live** | PART3~4 배선 **허용**(대상 API 존재) · completed Engine/Money todo 재실행 **금지** |
| **E-R1 이력 pointer (v7.22.48 · 해소됨)** | 당시 MCP 행0·유저 `@Controller` 코드0 → §0.9 가산으로 **해소**(위 Gate CLOSE 행) | 이력만 유지 · 「착수 금지」문구 **폐기** |
| 실행실 실시간 채널 (**v7.22.50 U14 정정**) | `services/realtime-service` 폴더 **0**(Engine §0.9.2 동일) · Phase0=`POST /trades/:id/execute-tick` **polling live** | §29.6 = **Phase1+ 인터페이스 계약만**(지금 폴더/WS 가정 **금지**) · PART4a=`useTradeExecution` 훅이 Phase0 polling · Phase1+ SSE 교체 시 훅 내부만 · §48.3 SSE 전제 **보류 유지** |
| **색 토큰 SSOT drift (v7.22.50 U13 · CONFLICT RESOLVED)** | 구 §6.2/§33.1 표=`#00FF87`/`#FF2E63`/`#F59E0B`/`#00D294`/`#1A56FF` · **shipped** `packages/ui/tokens/lux-fintech.ts`=`accent/profit:#3DDC97` · `principal:#7AA2FF` · `danger:#FF5C7A` · `warning:#F5C542` · Brand Kit(§5.9.2b)·Canon `tokenRef`와 일치 | 권위=§33.8.1 tokens>plan · **plan hex 표는 코드 미러로 정정**(아래 §6.2/§33.1) · PART1d `ux-design-system`은 이 hex를 재발명 **금지** |
| **eBay 실사진 ingest gap (v7.22.50 U15 · Engine Owns · UI 수정0)** | `workers/ebay-adapter`가 `assetId:\`query:${query}\`` placeholder · `normalizeIngestListingsForPersist()`가 `query:` prefix **drop** · matchers(`watch/card/bag-match`)는 존재하나 ingest **미배선** · `public.opportunities` 현재 행=시드(~40–80 SKU)·`imageSource=admin_r2` 템플릿 URL · 실 eBay CDN URL은 fetch되나 **DB 미도달** | **UI 차단 아님** · PART3d=`ProductImage`/`assetImageUrl` source-agnostic(`ebay`\|`pokemontcg`\|`ygoprodeck`\|`admin_r2`) · 데이터 수정=Engine `engine-ebay-identity-match-ingest`(§0.10 · Index 예외2 · UI todo/File-Serial 재정렬 **0**) · §48.3a pointer |
| 기존 stub 페이지 버튼 배선 (실측 · 이 게이트 범위 밖 pointer) | `/wallet/deposit`(주소복사·계속) · `/me/kyc`(시작하기) 버튼 `onClick` **미정의** · `/wallet/withdraw` 제출은 `onClick` 있으나 네트워크 호출 **0**(주석 처리) · `/me/support` wrong-chain 제출은 `setSubmitted(true)`만 실행하고 실제 `POST /api/v1/wallet/deposit-disputes` **미호출**(거짓 성공) | 버그로 확인·수정은 해당 PART todo(§5.7~5.8·§51.6) 배선 시 필수 · **본 todo에서 코드 수정 금지**(기록만) |
| Brand | *(PART0 CLOSE 시점 `assets/markets/` 0 → §0.8.3·BOOTSTRAP §0.6.4 재실측: scaffold 실물 · SVG 7=blocked)* | PART1a=**로고 SVG 갭-only** · 전면 재작성 금지 |
| Canon wires | *(PART0 CLOSE 시점 `market-partner-trust.wire.json` 0 → §0.8.3: wire+manifest 등록 실물)* | PART1a 갭=SVG only |
| `apps/web/routes.ts` | *(PART0 CLOSE 시점 partners/benefits 0 → 현재 `/me/guide/partners`·`/me/benefits` **잠금됨**)* | PART1a route OK · benefits 딥 UI=PART7b |
| `apps/web/app/me/benefits` | 페이지 골격 존재 · Hero/Carousel/D·M·W·S **0**(§0.8.2 #2) | benefit-hub-surfaces |
| Admin routes | `growth?tab=missions|partners|ticker` + `ai-logs?tab=spotcheck|coach` **잠금됨** | deep UI=**Admin 플랜 todos** (본 플랜 pointer) |
| Admin FS | growth legacy path pages(content/deposit/whale/ticker)만 · missions/partners **탭 deep 0** | Admin `admin-growth-*` todos Owns |
| verify | `match-tension`·`benefit-hub-*`·`market-partner-adapters`·`market-partner-trust`·`canon-surfaces` **live**(scaffold PASS·SVG BLOCKER) · `verify:gate` 로컬은 build+stack-lock+stub 65종만(E2E 아님) | ghost verify 이름 **금지** · "verify PASS"≠"화면 작동" 오독 금지 · PART1a=§0.8.3 |
| Kakao | founder `.env`만 · Infra `auth-kakao-oauth-runtime` **pending** | auth UI=가드/표면 · callback 구현≠UI |

### 0.6.1 헌법·문서 읽기 체크 (UI Owns · preflight에서 ✓)

| 파일 | 판정 |
|------|------|
| `CONSTITUTION/22_UX_AND_COPY_SSOT.md` | ✅ 5탭·레이아웃 |
| `CONSTITUTION/25_KOREAN_FIRST_UX_POLICY.md` | ✅ ko·금지어 |
| `CONSTITUTION/26_PERFORMANCE_AND_RESPONSIVE_UX.md` | ✅ fluid·tier |
| `CONSTITUTION/28_LUX_FINTECH_DESIGN_AND_MOTION.md` | ✅ Lux·motion |
| `CONSTITUTION/38_TRUST_EDUCATION_AND_REVENUE_TRANSPARENCY.md` | ✅ 신뢰·면책 |
| `CONSTITUTION/48_AI_EXECUTION_ROOM_AND_POLICY.md` | ✅ 실행실 |
| `CONSTITUTION/50_SETTINGS_LEGAL_AND_PLAIN_KOREAN.md` | ✅ 설정·약관·DET |
| `docs/CONSTITUTION_BOOTSTRAP.md` | ✅ §0.5 Engine CLOSE · **§0.6 본 todo가 기록** |
| Admin `ai_profit_os_04_admin_*.plan.md` §9.1.1·§35.4·§35.7 | ✅ 교차 계약 |
| Money §51.8a · Engine §0.0.1c·§47.15·§48.13.4 | ✅ pointer only |

### 0.6.2 흡수 모순 (본 버전에서 해소)

| # | 발견 | 해소 |
|---|------|------|
| U1 | 첫 todo=`yahoo-jp-copy-ban`인데 본문은 표기 **필수**(§38.10) | → id=`market-partner-trust-surfaces` · adapter금지≠표기금지 분리 |
| U2 | UI에 `admin-match-strictness-ui` + Admin `admin-execution-policy` 이중 Owns | → UI todo **ABSORBED** · apps/admin=Admin only |
| U3 | composer-2.5 혼재 · mega todo(`user-app-screens`) | → 전량 grok-4.5\|256K · PART 분리 |
| U4 | capital-provider가 opportunity-scan보다 선행 → 홈위계 전 CTA 혼선 | → PART3a 스캔 → PART3b CTA |
| U5 | trust-education이 §38.10 로고 재구현 위험 | → 로고 Owns=`market-partner-*` · education=Objection4/면책 |
| U6 | `/me/benefits`·`/me/guide/partners` routes 누락 | → PART1a/5b/7b 잠금 |
| U7 | `assets/markets/`·`verify:market-partner-trust` 실물 0 | → PART1a deliverable |
| U8 | §38.4 Admin 경로 `/admin/growth/content`·`/admin/content/trust` 유령 | → canonical `growth?tab=content`·`partners` |
| U9 | Admin missions/partners/G4/coach deep todo 공백 | → Admin 플랜 §0.7 교차 + Admin YAML 흡수 |
| U10 | BOOTSTRAP 다음=UI `yahoo-jp-copy-ban` stale | → `ui-preflight-constitution` |
| U11 | 「귀여운 이모지 전부」해석이 폭탄/면책과다/Admin귀여움과 충돌 가능 | → **§27.10** = 유저 전 표면 **적용** + 표면별 **캡/팔레트** · toast수치=§50.2 · Admin=§27.5(귀여움0) · 면책·약관 본문 이모지0 |
| U12 | Engine "todos 26/26 CLOSED"를 "participate/execute API 있음"으로 오독 → 03 UI가 대상 없는 API에 배선을 시도할 뻔함(실측: app.module.ts에 Trades/Execution/Participate 모듈 0) | → Engine `§0.9 Pre-UI Runtime Gate`(가산 E-R1~E-R8) + Money `money-user-benefits-read` 신설 · 본 파일 착수 선행조건에 추가(위 §0.6 선행) · 홈 미러 단독 플랜(`pre-ui_engine_gate_8f59a783.plan.md`) 전량 흡수 후 원본 삭제(중복0) |
| U13 | §6.2/§33.1 색 hex 표(`#00FF87` 등) ≠ shipped `lux-fintech.ts`/`brand.manifest` visual_kit_v1(`#3DDC97`·`#7AA2FF`…) — 플랜 이중 SSOT | → **CONFLICT RESOLVED** · 권위=§33.8.1 tokens>plan · §6.2/§33.1 표를 코드 미러로 정정(v7.22.50) · 구 neon/coral/amber/actionNeon 표기 **폐기** |
| U14 | §29.6이 `services/realtime-service`를 Phase0 도달 가능처럼 서술 · Engine §0.9.2는 폴더 **0**·Phase0=polling | → **CONFLICT RESOLVED** · §29.6 = Phase1+ 배치/티어 인터페이스 · Phase0=`useTradeExecution`/`useOpportunityFeed` polling이 동일 계약 준수 · 폴더 신설 전 WS/SSE 클라 가정 **금지** |
| U15 | 실 eBay 사진이 유저 카드에 안 보이는 원인 미기록 · `assetId: query:*` → persist drop · matchers 미배선 | → **EXTEND(문서)** · §0.6 표 + §48.3a pointer · Owns=Engine todo `engine-ebay-identity-match-ingest`(§0.10 filed v7.22.51) · UI todo/File-Serial **가산·재정렬 0** · PART3d는 URL 소스 무관 렌더만 |

**판정 (v7.22.50 · 2026-08-10):** `ui-preflight-constitution` = **PASS** · 헌법 8종+46b ✅ · Canon 28 · Brand markets/**0** · CLIME **0** · 사진목업 PNG **0**(ADR-013) · U13~U15 **흡수** · File-Serial 재정렬 **0** · 구현코드 **0**.  
**v7.22 당시 다음:** **03 UI** `trust-age-spotcheck` only. v7.23은 00 R0가 supersede하며 completed Engine/Money/PART0~9 재실행 **금지**.

## 0.7 Admin 교차 계약 (UI surface → Admin Owns · 중복0)

> **규칙:** UI 플랜은 `apps/admin/**` 구현 **금지**. 아래는 Admin 플랜이 **반드시** deep 구현할 계약(실측: routes 잠금·페이지 deep 일부 0).

| UI surface / 기능 | Admin route | Admin todo (04 플랜) | 잠금 |
|-------------------|-------------|----------------------|------|
| LivePayoutTicker §33.2a | `growth?tab=ticker` | `admin-growth-ticker-organic` | Organic Hybrid · DayPulse merge0 |
| Benefit Hub §5.9.5 | `growth?tab=missions` | `admin-growth-missions` | catalog·halt·queued_pool · **유저별 수동지급 0** |
| Market Partner §38.10 | `growth?tab=partners` | `admin-growth-partners` | Tier-A ON/OFF·순서 · 로고=manifest only |
| 면책/신뢰 카피 편집 | `growth?tab=content` | `admin-ops` shell + G1 필드 | 면책 블록 잠금 · 규모주장 1곳 |
| 매칭 성공 조절 §48.6 | `/admin/execution-policy` | `admin-execution-policy` | 난수성공률 UI **0** |
| 퍼뜩 Eval/trace | `ai-logs?tab=coach\|eval\|pick` | `admin-ai-peotteok-ops` | Engine §47.15 · override 0 |
| spot-check 메모 §38.6b | `ai-logs?tab=spotcheck` | `admin-ai-peotteok-ops` | UI 프로토콜 결과 저장 |
| 쪽지 발송 §5.9.4 | users 360 | `admin-user-block-notify` | 1인 쪽지 · fanout=PWA |
| 멤버십 강제 | `users/:id?tab=membership` | `admin-user-membership-credentials` | Engine §0.0.7 |
| 기회 override | `users/:id?tab=opportunities` | `admin-user-opportunity-override` | ledger 직접변경 0 |

**Admin adapters KPI면:** `yahoo_jp` **Day-1 adapter 0**(v7.22.32) · **표기 ON/OFF는 partners 탭**(§38.10) — 「yahoo 0」을 로고 표기 금지로 오해 **금지**.

## 0.8 종합 실물 재검증 (v7.22.52 · 5관점 감사 · 예측0 · 구현코드0)

> **Owns:** 본 절 = 유저 요청형 "DB·마이그레이션·함수·SQL·테이블·엔진·Supabase·폴더·기술스택·파일·헌법·기술코드 전수 확인" 감사 기록(Index §0.7 방법론을 UI 플랜에 적용). **File-Serial·PART0→8 순서/모델배정 변경 0** — 발견된 드리프트·모순·공백만 최소 diff로 흡수(코드 신설 0 · 파일명 rename 1건만 실행).  
> **방법(2026-08-10):** Supabase MCP(`list_projects`/`list_tables`/`list_migrations`/`list_extensions`/`execute_sql`/`get_advisors`) 실측 + 레포 FS 전수(`apps/web`·`apps/admin`·`packages/ui`·`packages/sdk`·`tooling/verify`·`supabase/migrations`) + `tooling/verify/CATALOG.md` 원문 대조 + **04 Admin·01 Money·05 PWA·06 Infra 전문 재확인**(발췌 아님) + `git status`/`git log` 실측.

### 0.8.1 실측 표 (오차0)

| 대상 | 실측 (2026-08-10) | 판정 |
|------|------|------|
| Supabase | ref=`mgsytcetsiecllmhcyox` · Seoul · PG **17.6.1** · ACTIVE_HEALTHY | ✅ §0.6 기재와 일치 |
| `public` 테이블 | **76** (MCP `list_tables` 재실측) | ✅ §0.6 기재와 일치 |
| migrations applied | **28** · MCP `list_migrations` 실측 | ⚠️→✅ **드리프트 발견·해소**(0.8.2 #1) |
| public 함수 | **5**(`ledger_*`×3 + `users_stage_a_identity_ok` + `user_opportunity_overrides_pin_cap`) · 전수 `search_path=public` | ✅ |
| security advisors | ERROR **0** · WARN **0** · INFO=`rls_enabled_no_policy`(deny-by-default 의도) 전수 | ✅ |
| Gate rows | `execution_policies`1 · `opportunities`6 · `assets`94 · `listings`12 · `mission_definitions`2 | ✅ |
| `apps/admin/routes.ts` | 12모듈+2b · `ADMIN_CHILD_ROUTES` 32행 · Growth legacy redirect 4종 | ✅ Admin §9.1.1과 1:1 실측 확인 |
| `apps/admin/app/admin/growth/{content,deposit,whale,ticker}/page.tsx` | 개별 폴더 존재하나 **전부 `redirect("/admin/growth?tab=…")` 1줄만** · 실화면은 `growth/page.tsx`의 `?tab=` 분기 렌더 | ✅ 이중 IA 아님(§35.6 규칙 실물 준수 확인) |
| `apps/web/routes.ts` | `USER_NESTED_ROUTES` 34행 · 5탭 불변 | ⚠️→기록 **§51.20 라우트 미등재**(0.8.2 #4) |
| `packages/ui/components/execution/` | **`ProductThumb.tsx` 1개만** — `AiProgressRoom`·`ExecutionSuccessReceipt`·`ExecutionSafeStop`·`ExecutionStepList` **0건** | ⚠️→기록(0.8.3 PART4a) |
| `packages/ui/components/{trust,toast,lux,auth,kyc,onboarding,legal,settings,shell,brand,product,landing}` | 다수 실물 컴포넌트 확인(우량) | ✅ |
| `tooling/verify/*.cjs`(UI 신설분) + `CATALOG.md` | 신규 스크립트 다수 실존 + 다수 **"live"** 등재 | ⚠️→기록 **verify=live ≠ 화면완성 오독 위험 구체 사례**(0.8.2 #2) |
| git 상태 | 위 신규 파일 대부분 **미커밋**(uncommitted) · YAML todo는 대부분 `pending` 유지 | 기록만 — **커밋 여부는 본 감사 범위 밖**(운영자 판단) |

### 0.8.2 흡수 모순·결함 (발견 즉시 해소 또는 정확 기록 · 중복0)

> **감사 vs 구현 분리(v7.22.53):** **감사 세션 조치** = v7.22.52~53 플랜·YAML·rename만(앱 코드 **0**) · **구현 시점** = 해당 PART 착수 시 코드·verify 스크립트 작성.

| # | 발견 (실측) | 감사 세션 조치 (v7.22.52~53 · 코드0) | 구현 시점 (PART · 코드) |
|---|------|---------------------------|----------------------|
| 1 | `supabase/migrations/20260809144409_catalog_runtime_day1_fx_bootstrap.sql` 로컬 파일명 버전(`144409`) ≠ MCP `list_migrations` 실제 적용 버전(`144814`) — §3.2/BOOTSTRAP§9 "로컬 파일명=원격 1:1" 불변식 위반. Index §0.7.1 #2(`execution_policy_day1_bootstrap` 102초 drift)와 **동일 클래스의 재발** | **`git mv` rename 완료** → `20260809144814_catalog_runtime_day1_fx_bootstrap.sql` · SQL 무변경 · 원격 재적용 불필요 | **—** (메타만 · 추가 PART 없음) |
| 2 | `verify:benefit-hub-surfaces`가 CATALOG에 "live" → **PART7b 완료로 오독 위험**. 스크립트는 Money API·copy·wire만 검사(Money §51.8a.7). `apps/web/app/me/benefits/page.tsx`는 **1줄 골격**(Hero/Carousel/D·M·W·S **0**) | §0.8.2 기록 + PART7b todo content 경고 + §0.8.3 **verify 검사 범위** 열(§0.8.2 #2 유형 표기) | **PART7b** — §5.9.5 딥 UI 전량 신규 구현 · (선택) verify 스크립트에 page/컴포넌트 검사 확장 |
| 3 | `verify:margin-compare-surface`가 UI·Index·Engine 3플랜 **인용만** · `tooling/verify/*.cjs`·CATALOG **0** · `PriceCompareMargin` 컴포넌트 **0** | PART3c todo content에 **컴포넌트+스크립트+CATALOG 3종 세트** 명시 · §0.8.3 ghost 표기 | **PART3c** — `PriceCompareMargin` + `tooling/verify/margin-compare-surface.cjs` + CATALOG 등재 |
| 4 | Engine §51.20 Weekly Market Briefing — UI Owns·PART·route·Canon·verify **0**(Index §19만 존재하는 **고아 게이트**) | §51.20 Owns 절 신설 + PART8b `§51.16~21` 확장 · wording **"해소"→"Owns 재배정·verify 미착수"** (v7.22.53) | **PART8b** — `/me/guide/market-weekly` + Canon + `verify:market-briefing-no-investment-advice` **신설**(현재 ghost · margin-compare와 동일 클래스) |
| 5 | v7.22.54 PART2c-pre(`operator-entity-support-email`) 삽입이 changelog·§0.8.3만 · **§0.8.2 감사조치/구현시점 표 미승격** | **본 행 승격(v7.22.55)** · File-Serial=2c **하드 선행 의존** 삽입(순서 뒤집기·위반 **≠**) · 구현밀도=`v1+instance patch only` | **PART2c-pre** — schema+instance 갭-only(실측 `supportEmail` already → 전면 재작성 금지) · footer 바인딩=2c Owns |
| 6 | §6.4c.1 구멍: 전환톤 미잠금 · 괴리율=차익 동의어인데 금지어 누락 · consent 실행계약 부재 · 완료정의에서 `verify:marketing-compliance` 누락 · copy↔Infra sanitizer 비동기 | **§6.4c.1 F~H + §6.4 CTA supersede + Infra §31.2/§31.4/§31.7 동기(v7.22.55)** · 대안 나열 **0**(결정문만) | **PART2a·2b·2c** — §6.4c.1 인수조건 전량 · Infra `marketing-compliance`/sanitizer **동시 PASS**가 UI 완료 조건 |

**우선순위 메모(v7.22.53 · File-Serial 불변):** §0.8.4 운영자/유저 관점에서 **PART4a·7b=유저 체감 최우선 구현 부채** · PART3c·8b=신규 구현 부채 · **순서는 PART0→8 유지**(4a는 PART3d `ProductThumb` 선행 · 7b는 Money API=live). #2·#4의 **문서 SSOT 결손은 감사 세션에서 흡수 완료** — 남은 것은 위 **구현 시점** 열의 코드 작업뿐.

### 0.8.3 PART별 실측 착수 가이드 (오류0 · 위→아래 실행 시 필수 선확인)

> **판정 요지:** PART0~8 **구조·순서·모델배정(전량 grok-4.5|256K)은 유지**(변경 불필요) — 의존관계·범위분리가 이미 정확하다(아래 0.8.4 다관점 판정 근거). 다만 **레포 실물이 YAML 상태보다 앞서 있는 파트가 많아**, 다음 실행 에이전트는 "미구현으로 간주하고 새로 작성" 대신 **실물 우선 확인** 후 갭만 보완해야 결함·중복이 0이 된다.  
> **verify 주의(v7.22.53):** `pnpm verify:*` PASS ≠ PART 완료. 아래 **verify 검사 범위** 열이 좁으면(예: benefit-hub=Money API만) **해당 행의 "필수 행동"이 verify보다 우선**한다.  
> **실행 밀도(v7.22.53 · File-Serial 유지):** **1a~1d·5a~6c** = verify PASS 후 **갭-only·1채팅 목표**(전면 재작성 금지) · **3c·4a·7b·8b** = **무거운 신규 구현**(스킵 금지) · 그중 **4a·7b** = §0.8.4 **유저 체감 최우선 부채**(순서 앞당기기 **0** · 도달까지 중복 재작성 금지).  
> 이 표는 완료 판정이 아니라 **착수 전 확인 순서**다.

| PART | todo id | 밀도 | verify 검사 범위 (1줄 · `tooling/verify/*.cjs` 헤더+실측) | 실물 상태(2026-08-10 실측) | 다음 에이전트 필수 행동 |
|------|---------|------|--------------------------------------------------------|---------------------------|----------------------|
| 1a | market-partner-trust-surfaces | — | `market-partner-trust`: Canon+copy+route+MarketPartner*+guide **page** · 로고 SVG **7/7 ready** · BLOCKER **0** | Grid/Leg/Strip+`brand/markets.ts`+Canon+`/me/guide/partners`+7 SVG **CLOSED** | **COMPLETED** · `MARKET_PARTNER_LOGOS_REQUIRE_READY=1` PASS · 전면 재작성 금지 유지 |
| 1b | korean-first-copy | — | `korean-ui`/`toast-emoji`/`cute-emoji-palette`: copy/ko 필수 파일·voice·retired brand·landing utility키·Guest금지어0 (**페이지 UX 깊이 0**) | `copy/ko/*` 15+ · verify live · auth Guest drift 해소 | **COMPLETED** · 파일 재생성 금지 유지 · 본문깊이=PART2a/2c |
| 1c | mockup-governance-adr013 | — | `mockup-governance`/`canon-surfaces`/`brand-logo-single`: ADR-013·Canon manifest·단일 Brand Kit | 거버넌스·CI 정착 · Admin wire Owns 확인 | **COMPLETED** · 갭코드0 · 재작성 금지 |
| 1d | ux-design-system | — | `lux-theme-sync`+`ux-design-system`+`font-scale-three`: tokens/breakpoints/motion/font-scale/PPE/MotionCTA | 전부 live · hex visual_kit_v1 일치 | **COMPLETED** · 갭코드0 · hex 재발명 금지 |
| 2a | onboarding-experiential | — | `onboarding-experiential`: Canon+OnboardingFlow+page · Guest utility CTA0·transitionDisclosure·compareMiniUtility | live · capital drift **해소** | **COMPLETED** · wire/demo/practice 갭 닫음 |
| 2b | auth-login-signup-ui | — | `auth-surfaces`: auth 3면+Kakao ENABLED가드 · Guest=utility(§6.4c.1 F) · landing Kakao0 | live · GuestChrome 3면 · tone=utility wire | **COMPLETED** · Infra callback 전 `NEXT_PUBLIC_OAUTH_KAKAO_ENABLED=0` |
| 2c-pre | operator-entity-support-email | — | schema JSON Schema valid · instance `supportEmail` · **§0.8.2 #5** | v1 `required`+instance `support@hiptk.app` 실물 | **COMPLETED** · 갭-only |
| 2c | landing-3s-ui | — | `landing-3s`+`marketing-compliance`+`operator-footer`: utility·footer·disclaimer·금지어(괴리율 포함)·consent emit 가드 | Landing3s+GuestChrome · utility/footer/disclaimer/consent | **COMPLETED** |
| 3a | opportunity-scan-home-ux | — | `arbitrage-type-label` live · **`opportunity-scan-surface` 스크립트 0** · 홈 스캔 레이아웃 전량 검사 0 | `arbitrage-type-label` live | **COMPLETED** |
| 3b | capital-provider-match-ux | — | `cta-earn-profit`: CTA 카피+Canon · `user-trader-jargon-0`: copy+select pages 금지어 스캔 | 둘 다 live | **COMPLETED** |
| 3c | price-compare-margin-ux | 무거움 | **`margin-compare-surface` ghost** (스크립트·컴포넌트 0) | **0.8.2 #3** | **COMPLETED** · 3종 세트 |
| 3d | asset-image-execution-ux | — | `asset-image-surface`/`product-image`: ProductImage·R2 가드·Canon4면 | live · `ProductThumb.tsx` 존재 | **COMPLETED** |
| 3e | balance-aware-home-ux | — | `balance-aware-feed`: Engine classify+suggest **API·Nest wire** (홈 슬롯 배선 0) | Engine 측 live | **COMPLETED** |
| 4a | ai-execution-ux | 무거움·체감최우선 | `trade-execution-hook`: `useTradeExecution`+polling+execute **page 배선** (**AiProgressRoom 등 4컴포넌트 0**) | 훅 live · execute=2-state 임시 텍스트 | **COMPLETED** · 3면 신규 |
| 4b | ai-coach-ui | 무거움 | 전용 verify **0** | `/me/peotteok` 골격 스텁 | **COMPLETED** · 신규 구현 |
| 5a | public-ticker-g4-surface | — | `ticker-pii-0`: LivePayoutTicker·PII0 · settlement.completed only | ticker 실물 | **COMPLETED** · 재작성 금지 |
| 5b | user-ia-shell-screens | — | `ia-tabs`/`no-admin-in-web`: 5탭·USER_NESTED_ROUTES | BottomNav5·routes 실물 | **COMPLETED** · 재작성 금지 |
| 5c | wallet-surfaces-ui | — | `deposit-network-plain-ko`+wallet Canon | wallet 실물 | **COMPLETED** · 재작성 금지 · live 배선=PART9f/f2/i |
| 5d | settings-legal-ko | — | `legal-plain-ko`/`font-scale-three` | legal/settings 실물 | **COMPLETED** · 재작성 금지 |
| 5e | toast-notification | — | `toast-emoji`/`part5-shell-toast` | ToastHost 실물 | **COMPLETED** · 재작성 금지 |
| 5f | plain-korean-surfaces | — | `no-it-jargon`/`toast-emoji` | copy 스캔 | **COMPLETED** · 재작성 금지 |
| 6a | kyc-surfaces-ui | — | `kyc-surfaces`: KycFlow+page | `KycFlow` 실물 | **COMPLETED** · 재작성 금지 · 제출 배선=PART9i |
| 6b | trust-education-ux | — | `trust-copy`/`tax-disclaimer`/`objection4` | ObjectionFourAccordion 등 | **COMPLETED** · 재작성 금지 |
| 6c | trust-get-usdt-guide | — | `deposit-network-plain-ko`: TRC20 plain | GetUsdtGuide 실물 | **COMPLETED** · 재작성 금지 |
| 7a | invite-explain-kr-2070 | — | `invite-explain-surfaces` | invite 실물 | **COMPLETED** · 재작성 금지 |
| 7b | benefit-hub-surfaces | — | `benefit-hub-surfaces`(+딥 UI) · §0.8.2 #2 이력 | `BenefitHub`+page live | **COMPLETED** · 재작성 금지 |
| 7c | membership-grade-ux | — | `membership-surfaces`/`membership-badge-assets` | 등급·배지 실물 | **COMPLETED** · 재작성 금지 |
| 7d | notify-prefs-inbox | — | `ops-inbox`/`notification-prefs-default-on` | prefs·쪽지 실물 | **COMPLETED** · 재작성 금지 |
| 8a | loop-psychology-5124 | — | `loop-psychology`/`day-pulse-live-only`/`preflight-may-stop` | DayPulse·PreCTA 실물 | **COMPLETED** · 재작성 금지 · home live=PART9c |
| 8b | trust-surfaces-v722 | — | Proof/SafeStop/Journey/AdapterHealth/WeeklyBriefing/DepositConsult+`market-briefing-*` | 5+1종 실물 | **COMPLETED** · 재작성 금지 |
| 8c | responsive-device-tier | — | `verify:responsive`: Playwright multi-viewport **Canon structure** | harness live | **COMPLETED** · 재작성 금지 |
| 9-pre | part9-pre-dev-api-proxy | **가벼움** | phase0-bootstrap needle: `/api/v1` rewrite · `/ads` 보존 | `next.config.ts`에 `/ads` rewrite만 · `/api/v1` **0** | **COMPLETED** · verify PASS · 재작성 금지 |
| 9-pre2 | part9-pre2-auth-session-hardening | **보안·최우선·단독** | `auth-session-cookie`+`wallet-kyc-session-auth`+회귀 `auth-flows`/`auth-jwt-runtime` | 세션쿠키 **0** · Wallet/Kyc JwtAuthGuard **0**(§0.9) | **COMPLETED** · verify PASS · 재작성 금지 |
| 9a | part9a-sdk-user-feed | **가벼움** | `sdk-user-feed`: exports+fetchOpportunity* · nearMissCount→nearMissExtraCount | `@aipo/sdk` peotteok/execution-stream만 | SDK 신설 · **9a·9b 묶기 OK** |
| 9b | part9b-verify-live-wire | **가벼움** | home/profits/wallet-live-wire + 9-pre2 verify 2종 CATALOG/domain-by-path | live-wire verify **0** | CATALOG 등재 · **9a·9b 묶기 OK** |
| 9c | part9c-home-live-wire | **무거움·체감최우선** | `home-live-wire`: page↔SDK↔DayPulse·401 graceful | `page.tsx` stub `items={[]}` | HomePageClient live · **단독 권장** |
| 9d | part9d-home-principal-slots | **무거움** | `home-principal-slots`: HomePrincipalRail+Canon+lux-feed-grid | B/D 슬롯 **0** | **COMPLETED** · verify:home-principal-slots PASS · 재작성 금지 |
| 9e | part9e-profits-detail-wire | **가벼움** | `profits-live-wire`: /profits·/profits/[id] | 골격 위주 | **COMPLETED** · verify PASS · 재작성 금지 |
| 9f | part9f-wallet-live-wire | **가벼움** | `wallet-live-wire`: buckets 조회+sdk/wallet | buckets 미배선 | **COMPLETED** · verify PASS · 재작성 금지 |
| 9f2 | part9f2-withdraw-flow-wire | **무거움·신규화면** | `withdraw-flow-wire`: 금액·수수료·step-up·POST withdraw | 출금 3페이지 UI **0** | **COMPLETED** · verify PASS · 재작성 금지 |
| 9g | part9g-growth-public-api | **무거움** | `growth-public-surface`: growth_ticker_config+GET public-surface | ticker 설정 저장소 **0**(`growth_control`≠mode) | **COMPLETED** · verify PASS · 재작성 금지 |
| 9h | part9h-home-ticker-wire | **가벼움** | `ticker-pii-0`+home-live-wire 회귀 | ticker/counter `mode="off"` 하드코드 | **COMPLETED** · server-driven mode · 재작성 금지 |
| 9i | part9i-stub-page-actions | **가벼움** | `stub-page-actions` + `no-it-jargon` | stub 버튼·§0.6 pointer | **COMPLETED** · verify PASS · 재작성 금지 |
| 8d | trust-age-spotcheck | **수동실사** | 자동화 **0** (사람 실사) | — | **PART9 전 completed 후** · 운영자 spot-check · **코드 세션 분리** · File-Serial **마지막** |

### 0.8.4 다관점 판정 (예측0 · 실측 근거만)

| 관점 | 판정 |
|------|------|
| 세계 지존급 앱테크·핀테크 개발팀 | 원장·Rule·단일PG·PG사0 불변식은 여전히 무결(01/02 CLOSED 재확인). **실물이 todo 상태보다 앞서 있는 드리프트**(§0.8.3)가 유일한 실행 리스크 — 다음 에이전트가 "0부터 재작성"하면 중복 컴포넌트·중복 카피 파일이 생겨 오히려 결함이 된다. 본 절의 "실물 우선 확인" 규칙이 이를 차단한다. PART0~8 파트 분리·모델배정(전량 grok-4.5\|256K)·의존순서는 재검토 결과 **수정 불필요**로 판정. |
| 운영자(나) | Admin↔UI 교차계약(§0.7)을 `apps/admin/routes.ts` 실물과 1:1 재대조한 결과 **공백 0**(누락된 어드민 화면 없음) — 12모듈+자식 tab이 이 플랜이 만드는 모든 유저 기능을 이미 관리 가능한 구조다. 다만 `/me/benefits` 딥 UI가 비어 있으면 "혜택·미션"을 아무리 홍보해도 유저가 빈 화면을 보게 된다 — **PART7b가 체감상 가장 시급**하다. |
| 의심 많고 욕심 많고 단순한 것을 좋아하는 20~70대 한국 유저 | 신뢰 표면(§38.10 협력사 로고), 쉬운말(§27.10), USDT 안내(§38.8)는 이미 실물로 구현되어 "화면이 있다"는 인상은 준다. 그러나 **혜택 탭이 빈 화면**이고 **실행실이 임시 텍스트 2줄**이면 "이 앱 미완성 아니야?"라는 의심을 정확히 촉발한다 — 욕심(보상 확인) 많고 의심 많은 유저일수록 이 두 화면(PART4a·PART7b)의 완성도가 이탈 여부를 가른다. |
| 세계 지존급 1위 감사관 | DB·보안 어드바이저·마이그레이션 정합성은 PASS(1건 드리프트는 발견 즉시 해소). **`verify:X=live` 라벨을 "완료 증빙"으로 오독할 수 있는 지점(0.8.2 #2)**이 감사 관점 최대 리스크였다 — CATALOG 표기 자체가 거짓은 아니다(스크립트는 실제로 그 좁은 범위에서 PASS한다). 그러나 범위가 좁아 오해를 유발하므로 **§0.8.3 verify 검사 범위 열 + todo content 범위 명시**가 감사 보완의 핵심이었고, v7.22.53 패치로 흡수했다. |
| 세계 지존급 1위 분석관 | 이번 리스크의 본질은 v7.22.48 Pre-UI Runtime Gate 때(§0.6 U12)와 **동일 패턴**("완료 정의"의 해상도 부족)이 PART 단위에서 재발한 것이다 — 그때는 "Engine todo 26/26 completed"가 "유저 API 존재"를 의미하지 않았고, 지금은 "verify:X live"가 "화면 완성"을 의미하지 않는다. 재발 방지책은 §0.8.3처럼 **PART별 실측 스냅샷을 todo content에 직접 명시하는 것**(본문 어딘가에 적혀 있는 것만으로는 다음 에이전트가 놓칠 수 있음) — 아래 YAML 갱신에 반영했다. |

**v7.22 판정:** PART0~8c+PART9 CLOSED, 잔여=`trust-age-spotcheck`. **v7.23 판정:** completed는 불변이고 신규 R1~R5 queue가 앞에 추가되며 spot-check는 R1 구현 뒤 수행한다.

## 0.9 PART9 Live Wiring — 실측 감사 요약 (v7.22.57 · 예측0)

> **v7.22 실행 큐 이력:** `part9-pre`…`part9i` → `trust-age-spotcheck`. v7.23 실행 큐는 frontmatter 신규 `redesign-r1-*`부터다.
> **감사 전문(참조 only·todo 실행 금지):** `%USERPROFILE%\.cursor\plans\ui_live_wiring_part9_a6643cf7.plan.md` = **ABSORBED** (중복 todo **0**).  
> **Owns:** Nest 세션/Wallet·Kyc 가드·`growth_ticker_config` read API = UI PART9 범위(유저 surface 완성 선행) · Admin ticker PATCH/Organic Hybrid = **04 Admin pointer only**(`apps/admin` 코드 **0**).

| ID | 실측 결함 | 흡수 todo |
|----|-----------|-----------|
| P9-1 | 세션쿠키 발급 **0** (`cookie-parser` 미등록 · AuthService Set-Cookie **0**) · web Bearer/storage **0** | 9-pre2 |
| P9-2 | AuthLogin/AuthSignup 실제 제출핸들러 **0**(Kakao redirect 외 disabled) | 9-pre2 |
| P9-3 | `WalletController` 유저 라우트 9개 JwtAuthGuard **0** · query/body `userId` 신뢰(IDOR) · **내부 7라우트는 가드 미부착 유지** | 9-pre2 |
| P9-4 | `KycController` 동일 패턴 | 9-pre2 |
| P9-5 | 타 유저 컨트롤러는 JwtAuthGuard 이미 있음(대조) | 기록 |
| P9-6 | ops-inbox migration 파일명 drift(로컬≠원격) | 메타 해소(rename) · 본 PART 코드 범위 밖 |
| P9-7 | `growth_control`≠ticker_mode/counter_mode · 백엔드 ticker 설정 저장소 **0** | 9g |
| P9-8 | PrincipalConfirmSheet 토큰=클라 랜덤(서버 미검증) | 9f2 pointer · Money 후속 |
| P9-9 | 출금 3페이지 금액·수수료·step-up UI **0** | 9f2 |
| P9-10 | Admin File-Serial: 03 UI 완료 전 Admin deep **금지** · 9g=최소 테이블+GET only | 9g |
| P9-11 | PART9 초안 composer 태그 → **전량 grok-4.5\|256K** | YAML 잠금 |

**File-Serial(위→아래 · 한 채팅=한 todo · 가벼움만 2~3 묶기):**  
`9-pre` → `9-pre2`(단독) → `9a`↔`9b` → `9c`(단독) → `9d`(단독) → `9e`↔`9f` → `9f2`(단독) → `9g`(단독) → `9h`↔`9i` → `8d`(수동·마지막).

## 0.1 Trust 잠금 정책 (v7.3)

| 구분 | v7.3 |
|------|------|
| LivePayoutTicker [A] | **`ticker_mode`:** off / live / demo / hybrid · Organic Hybrid=Admin **§35.4** · surface=**§33.2a** |
| 오늘 지급 합계 [F] | **`counter_mode`:** off / ledger / demo / blended (§35 G4) · DayPulse와 슬롯·숫자 **분리** |
| CountUp (거래·정산 UI) | **`settlement.completed`만** (ledger truth) · 티커 demo와 **무관** |
| FOMO Coral | engine staleAt/잔여한도 · G4 ON 시 Admin boost · 티커와 색 경쟁 금지 |
| 앱 카드 "수익 확정" | **금지** · "예상 수익" SSOT |
| Product Identity 미주장 | **헌법 잠금 유지** (§1) · G1~G2 copy surface 예외 |
| fake JSON-LD 별점 | **금지** · real reviews only |
| 카지노 sfx / 슬롯 metaphor | **금지** · Lux chime only (티커 기본 무음) |
| 티커 PII | email·legalName·원본 displayName·userId **유저 DTO 0** · 라벨=서버 마스킹만 |

### §35 Growth Conversion (G1~G4 — Admin ON)

| # | 영역 | Admin | 해지/기능 |
|---|------|-------|-----------|
| G1 | **가짜 연혁·공지** | `/admin/growth?tab=content` | 연혁·누적 문구 · **규모(100만) 직접 주장=여기 또는 랜딩 1곳만** |
| G2 | **입금 유도 FOMO** | `/admin/growth?tab=deposit` | 랜딩·온보딩 social proof · 홈 상시 배너 ❌ |
| G3 | **고액 입금·웨일** | `/admin/growth?tab=whale` | **≥100,000 USDT** VIP Desk · tier ladder · OTC/고액 AML |
| G4 | **Organic Hybrid ticker·counter** | `/admin/growth?tab=ticker` | **§35.4** live우선·침묵메움·곡선·지터·corpus · UI §33.2a |

**Ledger 분리 (오차0):** UI demo/blend ≠ ledger SSOT · reconciliation은 **ledger만** · audit log 필수 · **G4≠DayPulse**(§51.24 L16)

**유지 (기술·금융 무결성):** double-entry ledger, reconciliation, circuit breaker, KYC/AML, WebAuthn, API 보안.

---

## 5. 사용자 IA — 메뉴 SSOT (변경 금지)

### 5.1 하단 네비 (모바일) — **정확히 5개, 절대 증가 금지**

| 순서 | 아이콘 | 라벨 | route |
|------|--------|------|-------|
| 1 | 🏠 | 홈 | `/` |
| 2 | ✨ | 기회 | `/profits` |
| 3 | 📈 | 수익 | `/trades` |
| 4 | 💰 | 지갑 | `/wallet` |
| 5 | 👤 | 내정보 | `/me` |

### 5.2 PC 레이아웃
- **좌측 사이드바:** 동일 5메뉴 (순서·라벨·route 동일)
- **우측 메인:** 카드 3~4열 그리드, 홈=추천+피드+지급현황

### 5.3 홈 `/` — Lux 레이아웃 (5탭·IA 불변)

> **ADR-018 pointer(2026-08-16):** 아래 ASCII는 **현재 runtime 레이아웃의 기록**(슬롯 A~G의 존재·데이터 바인딩=Functional Authority·불변)이다. 슬롯의 **정확한 geometry·비중·Hero 크기 등 시각 값**은 새 Home Visual Contract(ADR-018 H5)의 **자동 입력값이 아니다** — Founder Visual Master 등록 후 재추출한다(H1→H5). 슬롯 존재 자체는 Product Contract(H4) Owns로 계속 유효.

```
🏠 홈 (ADR-017 Peotteok Light)  — §5.3b 기회스캔 인지 필수
 ├─ [A] LivePayoutTicker     `ticker_mode` §35 G4 (off/live/demo/hybrid) · **DayPulse와 슬롯 분리** (§51.24)
 ├─ [A2] DayPulse (live only)  오늘 실측 요약 · G4 demo 수치 merge **금지** (§51.24)
 ├─ [B] 내 USDT 잔액 (대형) + ≈원화  · 표시 우선은 prefs (아래)
 ├─ [C] 🔥 오늘 벌 수 있는 기회 Hero  · 부제: AI가 지금 시장을 스캔했어요 (engine staleAt · G4 boost)
 ├─ [D] 💰 오늘 가능한 수익 합계
 ├─ [E] 🤖 AI 추천 / 퍼뜩 한 줄 제안 (§47.12 Fact)
 ├─ [F] 🎉 오늘 지급 합계    `counter_mode` §35 G4 (ledger/demo/blended)
 └─ [G] Sticky MotionCTA      ko SSOT **"수익 벌기"** (모바일 only · 기회 바인딩 시 §48 Primary와 동일 action)
```

**Sticky CTA:** `position: sticky; bottom: calc(5tab + safe-area)` — 5탭 가리지 않음 · **PC 전폭 sticky 하단 CTA 금지** (Hero/카드 Primary만)  
**기회 Primary 정식 라벨:** `수익 벌기` (§7.3 · §48 · Index §20.2) · sticky=`수익 벌기` · 상세=`이 기회로 수익 벌기`  

**금액 표시:** 기본 KR 런칭=`≈₩` 크게 + USDT 보조 · `depositPref`는 **입금 탭**만 · 원장 SoT=USDT (Money pointer)  
**PriceCompareMargin:** 홈/상세/확인/영수증 4면 · **공식·필드=Engine §0.0.4** · UI는 컴포넌트·ko 라벨만 (재계산 금지) · **FX도 동일 컴포넌트**

### 5.3a 잔액 인식 홈·수익 피드 (표시 Owns · 삭제 금지)

> **분류·suggest = Engine §0.0.5.1** · **principal = Money §49.2a** · 본 절 = 슬롯·카피·CTA만 · **스캔 위계=§5.3b**.

| 슬롯 | 잠금 (ko) |
|------|-----------|
| Hero [C] | `affordable` 1건 우선 · `assetImageUrl` 실사진 (§48.3a) · **§5.3b 카드3단** |
| 섹션 `지금 수익 가능` | `affordable` 리스트 · Primary **`수익 벌기`** |
| 섹션 요약 줄 | `내 자본으로 가능한 기회 {n}개` (Fact) |
| 섹션 `조금 더 넣으면` | `nearMiss` · Secondary/대체 Primary **`+{suggest} USDT 넣고 열기`** → Money 딥링크 |
| 접힘 `더 큰 기회` | `lockedHigh` · 펼치기 전 미리보기 1줄 |
| 퍼뜩 한 줄 [E] | Fact: `지금 잔액으로 {N}건 · +{S}면 {M}건 더` (G레인 금지) |
| 카드 잠금 뱃지 | nearMiss=`입금하면 가능` · lockedHigh=`자본 부족` · 협박/타이머 **금지** |

**카피 SSOT** (`packages/ui/copy/ko/feed.ts`):
```typescript
T.feed = {
  homeTitle: '오늘 벌 수 있는 기회',
  homeScanSub: 'AI가 지금 시장을 스캔했어요',
  sectionAffordable: '지금 참여 가능',
  sectionAffordableCount: '내 자본으로 가능한 기회 {n}개',
  sectionNearMiss: '조금 더 넣으면',
  sectionLockedHigh: '더 큰 기회',
  ctaDepositSuggest: '+{n} USDT 넣고 열기',
  badgeNearMiss: '입금하면 가능',
  badgeLocked: '자본 부족',
  peotteokLine: '지금 잔액으로 {n}건 · +{s}USDT면 {m}건 더',
  chipTimeSensitive: '마감 임박', // P1 · tag time_sensitive · 미노출 시 키만 유지
} as const;
```

**검증:** `verify:balance-aware-feed` · `verify:opportunity-scan-surface` · `verify:no-it-jargon`

### 5.3b 기회스캔 홈·카드 표현 (v7.22.26 + §20.2 v7.22.27 · 삭제 금지 · 중복0)

> **중복0 Owns:** **레이아웃·위계·카피·금지 CTA = 본 절** · **역할/레이어 = Index §20.2** · **타입·내부필드 = Engine §4.2a·§4.2b**  
> **3초 테스트:** “이 기회에 얼마 넣고 예상 결과는?” 에 답할 수 없으면 **표현 결함**.  
> **유저 역할:** capital provider · **거래자 UX 금지**.

#### 인식 잠금

| 해야 함 | 하면 안 됨 |
|---------|------------|
| AI가 발견한 **참여 가능 수익 기회** | 상품 카탈로그·“롤렉스 사고팔기” 앱 |
| `AI 매칭 가능` + `arbitrageTypeKo` + 회랑(저가측→고가측) | category만 Hero · 구매/판매 CTA |
| 수익·실행가능성 정렬 (§0.0.5.1) | 트레이더 터미널·호가창·마켓 선택 |

#### Opportunity 카드 위계 (오차0 · price·fx 동일 · §20.2)

```
┌─ 🔥 AI 매칭 가능
├─ {buyMarketLabelKo} → {sellMarketLabelKo}  {arbitrageTypeKo} 기회
├─ assetLabel (작게·보조 · “상품 쇼핑”처럼 키우지 않음)
├─ 필요 자본     {requiredCapitalUsdt}          ← 투입
├─ 예상 수익     +{expectedProfitUsdt}  (강조·실금액) ← 결과
├─ AI 매칭 적합도 {aiConfidenceScore}%
├─ (접힘/상세) 기회 근거 PriceCompareMargin · 과거 유사 매칭+window+asOf
├─ 배지: 직접 사지 않아요 · 직접 팔지 않아요
├─ 면책: 예상 결과는 시장 상황에 따라 달라질 수 있습니다
└─ Primary [ 수익 벌기 ]
```
> `expectedSellDays` **유저 카드 노출 0** · 목표 처리≈1분은 진행실/내역(초) · Index §20.2

**FX:** 동일 위계·동일 컴포넌트 · FX 전용 카드 **금지**.  
**executionPlatforms:** 유저 카드/상세 **미노출**.

#### 필터 칩 (홈·`/profits` 공통 키)

기존: `전체 | 즉시 | 고수익 | 초보 | AI추천 | 즐겨찾기`  
**P1 추가 검토:** `마감 임박` ← `tags`∋`time_sensitive` · Day-1 칩 OFF 허용  
자본·category 칩: Engine §0.0.5 — **1급 탐색 트리 아님**

#### CTA · 유저 여정 (불변 · §20.2)

| 허용 | 금지 (CI · `verify:user-trader-jargon-0`) |
|------|------------------------------------------|
| **수익 벌기** → 투입 확인 → AI 자동 매칭 → 처리 → 수익 확정 → 정산·실금액 지급 (CTA후≈1분) | `구매하기` · `판매하기` · `마켓 둘러보기` · `거래하기` · `이 상품으로 수익 벌기` · 유저메인 `매칭 참여` |
| sticky=`수익 벌기` · 상세=`이 기회로 수익 벌기` | 호가창 · 외부 마켓 선택 · “내가 판매 중” |

**검증:** `verify:opportunity-scan-surface` · `verify:arbitrage-type-label` · `verify:cta-earn-profit` · `verify:user-trader-jargon-0` · `verify:margin-compare-surface`

### 5.4 수익 `/profits` — Market Radar (선택 뷰)

```
🔥 수익
 ├─ 필터: 🟢 전체 | ⚡ 즉시 | 💎 고수익 | 😊 초보 | 🤖 AI추천 | ❤️ 즐겨찾기 | (P1) ⏰ 마감 임박
 ├─ [Radar Mode] opportunity.created → green ping (S/A only)
 └─ VirtualOpportunityList   ← §5.3b 카드 위계 동일
```

`/profits?view=radar` — S/A: ping animation · B: static list only

**저장 전략 필터 (내정보 하위 `/me/strategies`):**
- 💰 소액 고회전 (10~50만원, 당일)
- 🚀 고수익 (100만원+)
- ⚡ 30초 완료
- 🛡️ 안정형
- 🤖 AI 자동 추천

→ 알림: "당신 전략에 맞는 기회 3건"

### 5.5 수익 `/trades` — 정산·진행 이력

```
📈 수익
 ├─ 상단: 오늘 +USDT / 이번달 +USDT (CountUp on load, tier-aware)
 ├─ ReceiptCard: 종이 출력 모션 (S/A) / instant (B) + TronScan 도장
 ├─ 진행 중 · 완료 · 거래 내역 · 월별 수익
```

### 5.6 지갑 `/wallet` — **§49 버킷 표시 SSOT**

```
💰 지갑
 ├─ 🪙 USDT 총액 (크게) + ≈ ₩
 ├─ 분리 표시 (오차0 · 숨김 금지):
 │    · 근무 중 원금 (principal)     ← 참여에 사용
 │    · 출금 가능 수익 (profit)      ← 기본 출금 대상
 │    · 진행 중 잠금 (locked)        ← 거래 중
 │    · 연습 잔액 (practice)         ← 출금·참여 불가 (있으면)
 ├─ 한 줄: "원금은 다음 수익에 쓰이고, 수익만 가져갈 수 있어요"
 ├─ 💵 원화 (동등 노출)
 ├─ ➕ 입금하기 → /wallet/deposit
 ├─ ➖ 출금하기 → /wallet/withdraw  (?mode=profit 기본)
 └─ 📜 입출금·수익 내역 (버킷별 필터)
```

### 5.7 입금 `/wallet/deposit` — **USDT · 원화 둘 다 · USDT 추천 ⭐**

**탭:** `🪙 테더(USDT) ⭐ 추천` | `💵 원화`

**기본 진입:** `?tab=usdt` (deeplink·푸시·온보딩)

#### USDT 탭 — **§41 유저 전용 주소 · 자동 확인**

```
┌─ 🪙 테더(USDT) 입금 ⭐ 추천 ─────────────────┐
│ [QR]  [내 전용 주소 복사]  ← user별 TRC20 §41 │
│ ⚡ 입금 감지→19확정 후 잔액 반영 (§43)         │
│ 🐋 10만 USDT+ 고액 입금 가능 (웨일 지원)       │
│ ── 💡 왜 USDT가 편할까요? (탭하면 펼침) ──      │
│ ① 빠름 — 온체인 확인 후 바로 거래 (원화는 검수) │
│ ② 한 흐름 — 입금→수익→출금이 USDT로 이어짐     │
│ ③ 글로벌 정산 — 해외 시세 OS와 같은 방식       │
│ ── 원화 vs USDT (쉬운 비교) ──                 │
│  원화: 국내 계좌 이체 · 검수 대기 · 통장 기록   │
│  USDT: 내 전용 주소 · **자동 확인** · 빠른 출금 │
│ ── ⚠️ 세금 안내 (면책, 고정 문구) ──            │
│  수익·세금은 개인마다 달라요.                   │
│  원화 입출금은 국내 금융 기록과 연결될 수 있어요.│
│  궁금하면 세무 전문가와 상담하세요.             │
│ [자세히 보기 → /me/guide/usdt]                 │
└────────────────────────────────────────────────┘
```

- **QR · 주소** — `GET /api/v1/wallet/my-deposit-address` · **유저마다 전용 TRC20** (§41)
- **자동 반영** — chain-watchers → ledger → SSE → `DEPOSIT_DETECTED` toast 🎉
- **WhyUsdtCard** — `packages/ui/components/trust/WhyUsdtCard.tsx` · copy `T.trust.usdt.*`
- **금지:** PG·결제모듈 · 공유 단일 입금주소(유저 surface) · "수동 확인 대기"(USDT)

#### 원화 탭 — **§41 PG-free · 운영자 승인/거절 (v7.22.12)**

```
┌─ 💵 원화 입금 (서류·PG 없음) ──────────────────┐
│ ① 입금액 입력  [________] 원                   │
│ ② 입금자명     [________] (통장 표시 이름)      │
│ ③ [입금 신청하기]                              │
│ ── 송금 안내 (Admin 대표계좌 §37) ──           │
│  국민은행 123-456-789012  예금주 ○○○           │
│  💳 입금 요청 금액  **{payableAmountKrw}원**   │
│  ⚠️ 위 금액 **그대로** 송금 (끝자리 가산 포함) │
│ ── 상태 ──                                     │
│  ⏳ 확인 중 / ✅ 반영 완료 / ❌ 거절됨          │
│ [더 빠른 USDT 입금 보기 →]                     │
└────────────────────────────────────────────────┘
```

- **PG 모듈 0** — 신청 → 송금 → **Admin [승인]/[거절]** (§41.3·§43.3) · CSV 안내 문구 **0**
- 은행명 · 계좌 · 예금주 — §37 Admin · SSE 즉시 반영
- **카피 잠금:** 「신청액과 동일」단독 문구 **금지** · 반드시 `payableAmountKrw` 숫자 노출 (§51.8)
- **짧은 안내:** "표시된 금액으로 보내 주시면, 확인 후 잔액에 반영돼요 (보통 영업시간 내)"
- **토스트/푸시 (Money owns 이벤트 · copy 여기):**
  - 토스트 본문 SSOT = **§8.2** (`KRW_DEPOSIT_SUBMITTED|APPROVED|REJECTED|EXPIRED`) — 여기 문구 재정의 금지
  - 지갑·입금 내역에 `pending|approved|rejected|expired` **항상 표시**

**Admin 변경 → 유저:** `wallet.deposit_config.updated` SSE

### 5.8 출금 `/wallet/withdraw` — **§49 수익 기본 · 원금 항상 가능 · §42 KYC 1회**

**탭 (동등):** `🪙 USDT 출금` | `💵 원화 출금`

| 탭 | route | guard |
|----|-------|-------|
| USDT | `/wallet/withdraw/usdt` | **§42 KYC** · WebAuthn · **§49 mode+bucket** · tier cap |
| 원화 | `/wallet/withdraw/krw` | **§42 KYC** · WebAuthn · **Admin 승인** · **§49 mode+bucket** · tier cap |

**출금 모드 (§49 · 기본값 잠금):**

| mode | 기본 | 차감 버킷 | UX |
|------|------|-----------|-----|
| `profit` | **✅ 기본 진입** | `profit` only | 카드 강조 · 상한=출금가능수익 |
| `principal` | 접힘/고급 | `principal` | **확인 시트 필수** (기회비용 비교) |
| `combined` | 접힘 | profit 우선 후 principal | 확인 시트 필수 · 명세 분리 |

**금지:** 원금 출금 메뉴 숨김 · 고객센터-only 원금출금 · 원금출금 시 수익 몰수  
**고정 카피:** `원금은 언제든 출금할 수 있어요. 보통은 수익만 가져가요.`

**§42 KYC 게이트 (출금만 · 1회):**
```
유저 [출금하기] 클릭
  → kycStatus !== 'approved'
  → toast: "🔐 출금하려면 본인 확인이 필요해요! 1번만 하면 돼요 😊"
  → 800ms 후 router.push('/me/kyc?return=/wallet/withdraw?mode=profit')
  → /me/kyc 에서 신청 → Admin 승인 → 이후 출금 **재요청 없음**
```

- USDT: TRC20 주소 입력 · TronScan 추적
- 원화: 등록 계좌 · 출금액 · 승인 대기 toast
- **거래(participate)는 KYC 불필요** — **principal(+명시 merge)** · circuit · pricingVersion
- 상세 SSOT → **§49**

### 5.9 내정보 `/me`

```
 👤 내정보
 ├─ 💬 퍼뜩에게 묻기          ← /me/peotteok · Canon peotteok-chat · Engine §47.12~14 P칩+G대화+S거절
 ├─ 🏅 내 등급                ← /me/membership (§5.9.2c · Engine §0.0.7)
 ├─ ✉️ 알림·쪽지              ← /me/inbox (§5.9.4 · Admin §9.8.8d)
 ├─ 🎯 혜택 · 미션            ← /me/benefits (§5.9.5 · Money §51.8a)
 ├─ 👥 친구 초대              ← /me/invite (§51.5)
 ├─ 📢 이벤트·공지            ← /me/events (notice|campaign · Growth OFF면 campaign 빈 안내)
 ├─ 🔔 알림 설정              ← §50.1n (설정과 동일 prefs)
 ├─ 💾 내 전략                ← /me/strategies
 ├─ 📞 고객센터              ← §51.6 `/me/support` 티켓·FAQ·분쟁
 ├─ 📖 이용안내
 │   ├─ /me/guide/usdt        ← 왜 테더로 충전하나요?
 │   ├─ /me/guide/get-usdt    ← 테더 준비·보내기 (§38.8 · 선택 가이드)
 │   ├─ /me/guide/revenue     ← 플랫폼은 어떻게 운영되나요?
 │   ├─ /me/guide/faq         ← 자주 묻는 질문
 │   └─ /me/guide/principal   ← 원금과 수익 출금
 ├─ 🪪 본인 확인             ← §42 (출금 1회)
 ├─ 👤 프로필 완성            ← /auth/complete-profile (Stage B · Infra §51.9.1 · 미완 시 노출)
 └─ ⚙️ 설정                  ← **§50.1 전수**
```

**금지:** 5탭에 퍼뜩 탭 추가 · 퍼뜩이 출금/지급 버튼 실행  

#### 5.9.1 친구 초대 `/me/invite` (§51.5 Viral Ladder)

```
👥 친구 초대
 ├─ [Explain] §5.9.1a 초보자 설명 (접기 기본 펼침 1회 / toneBand)
 ├─ 3단 진행: ①친구 가입 → ②친구 첫 충전 → ③친구 첫 수익 (쉬운말 · L1/L2/L3 영문 노출 0)
 ├─ 내 코드 · 공유 링크 (공유하기 / 카카오 / 복사) · **초대 인원 제한 없음** 명시
 ├─ 공유 안내: 하루 공유 보내기 한도는 **스팸 방지용** (친구 몇 명까지 ≠)
 ├─ 초대 현황: 가입 N · **혜택 진행(첫충전+) N** · 확인 중 N · 받은 보너스(수익)
 ├─ 티어: 씨앗/불꽃/로켓/고래메이커 · 시즌 순위(이름 가림)
 ├─ 공유 카드 미리보기 4종 · [자랑하기]
 ├─ 안내: 가입 직후=연습(꺼내기 불가) · 친구 충전·수익 후=내 **수익**에 보너스 · 부정 이용 시 회수
 └─ toast: 보류/회수/보너스준비중 — §8.2 REFERRAL_* · Pool대기=초대실패 카피 금지
```

**딥링크:** `/r/{code}` · 설치 후 sticky 90d · 수동 코드 입력 1회  
**성공 영수증 Secondary:** 「친구에게 자랑하고 보너스」→ share (Primary=출금/지갑 유지)  
**규칙·금액 SSOT:** Money §51.5 · 화면 숫자=서버 config 표시만 (하드코딩 금지)

#### 5.9.1a 친구 초대 설명 — KR 20~70 이해 SSOT (삭제 금지)

> **Owns:** 본 절 · toneBand=§38.9 · fontScale=§50.1 · 금액 공식=Money §51.5  
> **목표:** 20~70대 한국인이 **한 화면**에서 “뭐 하면 / 언제 돈 / 제한이 뭔지” 이해 후 공유 가능  
> **금지:** 다단계·피라미드·보장수익·IT용어(L1/edge/promo pool 영문) · 성별 분기 · “N명까지만”

**필수 블록 (Canon `invite-home`):**

| 블록 id | 쉬운말 (기본 mid · 잠금 의미) |
|---------|------------------------------|
| `title` | **친구 초대** |
| `oneLiner` | 친구를 **몇 명이든** 부를 수 있어요. 혜택은 친구가 **충전·수익**을 하면 생겨요. |
| `steps3` | ① 친구가 내 링크로 가입 ② 친구가 첫 충전 ③ 친구가 첫 수익 — 그때마다 진행 표시 |
| `whenMoney` | **지금 바로 큰돈이 들어오지 않아요.** 친구 충전·수익이 확인된 뒤, 내 **수익**으로 들어와요. |
| `practiceNote` | 가입 직후 보이는 연습 금액은 **꺼낼 수 없어요.** 연습용이에요. |
| `noCap` | **부를 수 있는 친구 수 제한은 없어요.** |
| `shareLimitNote` | 하루 공유 보내기 한도는 **너무 많은 자동 발송 방지**용이에요. |
| `holdNote` | 확인 중이거나 보너스가 잠시 멈춘 때는 **부정 이용 방지**예요. 초대가 취소된 건 아니에요. |
| `poolWaitNote` | 「보너스 준비 중」= 지급 대기 · **초대 실패 아님** |
| `abuseNote` | 같은 사람이 여러 계정으로 돌리거나 충전 직후 바로 빼면 보너스가 **회수**될 수 있어요. |
| `ctaShare` | **친구에게 링크 보내기** (Primary) |
| `ctaCode` | 코드 복사 · 직접 입력 안내 |

**toneBand 변형 (문자열만 · 의미 동일 · 이모지 캡=§27.10):**
- **young:** 짧은 bullet 3줄 · 이모지≤2  
- **mid:** 위 표 문장 + 작은 FAQ 3문항 · 제목 이모지≤1  
- **senior:** 한 문장씩 · 글자 크게(fontScale) · 「다음」으로 단계 읽기 허용 · 전문용어 0 · 이모지≤1/문장(길잡이)  

**FAQ 3 (mid/senior):**
1. Q. 가입만 하면 돈이 들어오나요? → A. 아니요. 친구가 **충전**해야 혜택이 시작돼요.  
2. Q. 몇 명까지 초대할 수 있나요? → A. **제한 없어요.**  
3. Q. 보너스는 어디서 보나요? → A. **지갑 → 수익**에 들어와요. 원금이랑 섞지 않아요.

**카피 파일:** `packages/ui/copy/ko/invite.ts` = `T.invite.*` · JSX 하드코딩 금지  
**Canon:** `packages/ui/canon/surfaces/invite-home.wire.json`  
**검증:** `verify:invite-explain-surfaces` · `verify:age-tone-surfaces` · `verify:no-it-jargon` · 월간초대캡 카피 0

#### 5.9.2 이벤트·공지 `/me/events` (§51.5b)

```
🎁 이벤트·공지
 ├─ 탭 A 공지(notice): 운영 사실만 · 보상/확정수익 문구 0 · 읽음 표시
 ├─ 탭 B 이벤트(campaign): Growth ON + live만 · 예산/기간/CTA allowlist
 ├─ Growth OFF 또는 campaign 0: "진행 중인 이벤트가 없어요" (fake 카드 금지)
 ├─ 홈 배너: notice|campaign 각 1 · dismiss persist · G4 ticker와 슬롯 분리
 └─ claim 실패: 종료/예산마감/중복 → CAMPAIGN_* toast (서버 권위)
```

**금지:** G1 FOMO seed를 notice 본문에 합치기 · campaign을 notice로 위장 · demo 금액을 이벤트 보상으로 표시

#### 5.9.2b Brand Kit Surface (중복0 · ADR-011 · ADR-013 · visual_kit_v1)

> **ADR-018 pointer(2026-08-16):** 아래 `ready` 에셋·Visual Kit 색은 **현재 runtime 미러로 계속 유효**(코드 미변경)하나, **Home 화면 배치용 신규 확정**(Hero 재생성·avatar 신규 시각·illustration 선택)은 Home Visual Master + New Implementation Contract(H1/H5/H6) 이전 금지 — `redesign-r1-home-visual-asset-production`(2026-08-16 `redesign-r1-home-brand-assets` Part B에서 SPLIT · YAML 목록상 H6.5 다음·H7 앞 위치) 참고. robot+globe hero illustration 등 legacy 자산은 `LEGACY VISUAL CANDIDATE — NOT NEW MASTER AUTHORITY`.

> **SSOT 경로:** `packages/ui/brand/` · `brand.manifest.json` · 소비자/AI 표기 **퍼뜩** · 코드명 AI Profit OS  
> **Visual Kit (ADR-017):** Light `#F6F4FC` + Purple `#6B3CFF` + profit `#12B76A` · **플래시 통찰 마크** · 한글 워드마크 · AI=추상 아바타(성별·인간형 0)
> **ready 에셋:** `assets/icons/app-icon-1024.png` · `maskable-source-1024.png` · `wordmark/wordmark-dark.png` · `ai/avatar-512.png` · `og/og-default.png`  
> **삭제됨:** metal-hex·사진 목업 PNG — 재추가 금지 (ADR-013 · Brand ready 5종만)  
> **파이프라인:** Brand assets → (apps/web 존재 시) `public/icons/*` 리사이즈 export → `verify:brand-assets` · `verify:brand-logo-single`  
> **후속 export(앱 골격 후):** icon-192/512 · maskable-512 · apple-touch-180 · favicon · share-card×4  
> **금지:** 런타임 AI 아이콘 · 미등록 CDN · 타사 로고 · 사진목업 로고 복제 · 화면마다 다른 마크 · 코인/카지노 톤 마크

#### 5.9.2c 멤버십 등급 `/me/membership` (삭제 금지 · v7.22.24)

> **중복0 Owns:** **카피·등급표·참고율 라벨·Canon = 본 절** · **enum·승급·일일캡·해금 플래그 = Engine §0.0.7** · **Admin 강제/조회 = Admin §9.8.10**  
> **≠** 초대 티어(seed…whale_maker) · **≠** `userTier` vip_desk

```
🏅 내 등급
 ├─ 현재 등급 배지 (새싹→VIP) + 다음 등급까지 (입금/성공 조건 1줄)
 ├─ 「요즘 조건이 맞은 비율」 = fulfillRate7d (참고 · 당첨% 아님)
 ├─ AI·기능 해금 목록 (등급별 · 엔진 플래그 투영만)
 ├─ 안내 고정:
 │   · 등급이 높아도 매칭 100% 아님
 │   · 고액·VIP는 건당 수익↑ · 하루 횟수↓ (희소)
 └─ [등급별 혜택 표] 펼침 · toneBand mid/senior FAQ
```

| copyKey | 잠금 (ko) |
|---------|-----------|
| `T.membership.title` | 내 등급 |
| `T.membership.fulfillRateLabel` | 요즘 조건이 맞은 비율 |
| `T.membership.notGuaranteed` | 등급이 높아도 매번 맞는 건 아니에요 |
| `T.membership.highScarce` | 고액·VIP는 기회가 적고, 맞으면 수익이 커요 |
| `T.membership.aiUnlock*` | 등급별 해금 한 줄 (Engine aiPerkFlags) |

**Canon:** `membership-home` · route `/me/membership`  
**금지:** 성공률% 슬라이더 · “당첨” · 100% 보장 · IT등급명 노출 · 초대 티어와 동일 배지 · **등급별 Soft/Hard·대기특권·성공 구매 암시** (Index §20.2 · §48.3b)  
**등급 차별 허용(대기 외):** 일일캡·기회 노출·AI 해금·지위 카피 only (Engine §0.0.7)  
**CI:** `verify:membership-surfaces` · `verify:no-fulfill-rate-as-rule` (UI 입력 0) · `verify:match-tension-surface`

##### 등급 배지 시각 SSOT (v7.22.25 · 아이디어 잠금)

> **판정:** 사진 목업 PNG로 등급 이모지를 “맞춰 찍기” = **금지** (ADR-013).  
> **채택 = B안 Brand Kit 벡터 배지** (아래 비교 후 잠금).

| 안 | 내용 | 판정 |
|----|------|------|
| A | 유니코드 이모지 단독 (🌱➡️👑) | 보조 라벨만 허용 · OS별 글리프 달라 **주 배지 불가** |
| **B** | `packages/ui/brand/assets/membership/{sprout,entry,core,high,vip}.svg`(+png 2x) · Lux mint/principal 톤 · 플래시 마크 DNA | **✅ Day-1 SSOT** |
| C | AI/사진으로 실사 배지 목업 제작 | ❌ `docs/mockups`·사진목업 재도입 · 픽셀 QA 금지 |

**구현 규칙:**
- manifest `brand.manifest.json` → `membershipBadges.status=ready` 후 consume  
- 컴포넌트 `MembershipBadge` — SVG 우선 · emoji fallback은 a11y `aria-label`용 텍스트만  
- Admin 목록·유저 `/me/membership`·홈 칩 **동일 5에셋** (화면마다 다른 그림 0)  
- **CI:** `verify:membership-badge-assets` · `verify:brand-logo-single` 확장

#### 5.9.3 내 전략 `/me/strategies`

```
💾 내 전략
 ├─ CRUD: 소액고회전 / 고수익 / 30초 / 안정 / AI추천 (필터 프리셋)
 ├─ 알림 토글 → push `strategy_match`
 └─ [이 전략으로 수익 보기] → /profits?strategy=
```

#### 5.9.4 알림·쪽지함 `/me/inbox` (삭제 금지 · v7.22.25)

> **Owns:** 목록·읽음·카피 = 본 절 · **1인 발송 = Admin §9.8.8d** · **플랫폼 fanout = PWA §23.5a** · prefs = §50.1n

```
✉️ 알림·쪽지
 ├─ 필터: 전체 | 운영 쪽지 | 공지 | 이벤트 | 수익 기회 | 충전·출금
 ├─ 행: 아이콘 · 제목 · 미리보기 · 상대시간 · 미읽음 점
 ├─ 탭 → 딥링크(href) 또는 본문 시트
 └─ 숨기기(하드삭제 0)
```

**토스트 (차단):** `MATCH_BLOCKED` · `WITHDRAW_APPLY_BLOCKED` — 쉬운 한글 · “고객센터” CTA 선택  
**CI:** `verify:ops-inbox`

#### 5.9.5 혜택 · 미션 `/me/benefits` (v7.22.42 · 삭제 금지 · Reward Center형 · 중복0)

> **Owns:** 본 절 + Canon + `packages/ui/copy/ko/benefits.ts`  
> **Money Owns:** accrual·idempotency·Pool·ledger·clawback = **§51.8a** · **Engine Owns:** domain event emit only · **§48.13.4** fanout 경계  
> **≠** 친구 초대 본문(§5.9.1) · **≠** Credits 가상화폐 · **≠** Admin 유저별 수동 지급  
> **5탭 IA 불변** · 6번째 탭 **0**  
> **실측 경고(v7.22.52 §0.8.2 #2):** `verify:benefit-hub-surfaces`는 **Money API(`GET /me/benefits(+summary)`)·copy 파일 존재만 검사**한다 — PASS라도 아래 Hero/Carousel/Daily~Streak 카드가 구현됐다는 뜻이 **아니다**. 실제 `apps/web/app/me/benefits/page.tsx`는 현재 제목+빈 문구 1줄뿐인 골격이다(코드 주석 "deep Benefit Hub = PART7b Owns" 자기문서화). PART7b는 verify PASS 여부와 무관하게 **아래 전체 블록을 신규 구현**해야 완료다.

```
🎯 혜택 · 미션
 ├─ [Hero] 이번 달 받은 보너스 ≈₩X · 받을 혜택 N · 확인 중 M · KST 자정 카운트다운
 ├─ [Carousel] 진행 중 이벤트 1~3 (Admin campaign live · Money §51.5b mirror)
 ├─ ▼ 오늘 (Daily) — D01~D08 카드 그리드
 ├─ ▼ 처음 한 번 (One-Time) — M01~M14
 ├─ ▼ 이번 주 (Weekly) — W01~W05 progress bar
 ├─ ▼ 연속 (Streak) — S03/S07/S14 · 출석 코인 화폐 0
 ├─ 카드: icon · title · body · +N USDT 또는 ≈₩ · 상태 · CTA
 └─ footer: 「친구 초대 → /me/invite」·「이벤트 더보기 → /me/events」 (한 줄 each)
```

**진입:** 내정보 · 홈 배지 `받을 혜택 N` · Push `benefit` · 정산 영수증 secondary · 퍼뜩 Fact 칩

**카드 상태 (서버 권위):**

| status | 라벨 | CTA |
|--------|------|-----|
| locked | 준비 중 | disabled |
| available | 시작하기 | deepRoute |
| in_progress | 진행 중 | 이어하기 |
| pending_hold / posting | 확인 중… | — |
| released | 받았어요 ✓ | — |
| queued_pool | 보너스 준비 중 | FAQ |
| expired | 종료됐어요 | — |

**보상 표기 (Credits ❌):**

| kind | UI |
|------|-----|
| none | 완료 뱃지만 |
| practice | `연습 +N` · DemoWalletBanner 연동 §51.7 |
| promo_profit | `수익 +N` · ⚡=보너스 아이콘(not currency) |
| fee_coupon | `출금 수수료 -N` |

**autoClaim:** 조건 충족 → Nest posting → 카드 `released` (기본 **받기 버튼 없음** · slow network 재동기화 optional)

**Day-1 vs Growth ON:**

| | rewardsEnabled=false | true |
|---|---------------------|------|
| Hero | 교육 미션 N개 | 받은 보너스 ≈₩ |
| D03/W 금전 | 숨김 | live |
| M05/M07 | 숨김 | live |

**금지:** G4 ticker/demo 숫자 Hero 합산 · DayPulse merge · 카지노·룰렛·출석 코인 · 「100% 당첨」 · 레퍼럴 L2/L3 단계 UI 본문 · IT용어(Credits/accrual/L2)

**카피 파일:** `packages/ui/copy/ko/benefits.ts` = `T.benefits.*`  
**Canon:** `benefit-hub.wire.json` · `benefit-mission-card.wire.json`  
**CI:** `verify:benefit-hub-surfaces` · `verify:benefit-no-credits-currency` · `verify:benefit-g4-ledger-separation`

### 5.10 설정 `/me/settings` — **§50.1 SSOT (v1)**

```
⚙️ 설정
 ├─ 계정 · 보안
 │   ├─ 내 프로필
 │   ├─ 로그인 보안 (지문·얼굴·비밀번호)
 │   ├─ 본인 확인 상태
 │   ├─ 로그아웃
 │   └─ 회원 탈퇴 (깊은 곳 · 확인 2회)
 ├─ 알림                          ← §50.1n 전수
 │   ├─ 앱 알림(마스터)
 │   ├─ 수익 기회 알림
 │   ├─ 충전·출금 알림
 │   ├─ 공지 알림
 │   ├─ 이벤트 알림
 │   └─ 운영 쪽지 알림
 ├─ 보기
 │   ├─ 글자 크기: 보통 / 크게 / 더크게
 │   ├─ 화면 스타일: 어두운 화면(고정)
 │   └─ (선택) 움직임 줄이기 안내
 ├─ 내 돈 관련
 │   ├─ 기본 출금: 수익만 (§49 고정 권장)
 │   ├─ 기본 충전 탭: 테더 / 원화
 │   └─ 출금 주소·계좌 관리
 ├─ 약관과 정보 (§50.3 대본)
 │   ├─ 이용약관
 │   ├─ 개인정보 처리방침
 │   ├─ 오픈소스 고지
 │   └─ 라이선스·저작권
 └─ 앱 정보: 버전 · 고객센터
```

#### 50.1n 알림 환경설정 · 가입 기본값 (삭제 금지 · v7.22.25)

```typescript
// schemas/user-notification-prefs.v1.json — 가입 시 전부 true
interface UserNotificationPrefs {
  master: boolean;          // false면 하위 Push 전부 스킵 (인박스 저장은 유지)
  opportunity: boolean;     // 매칭/기회 공개·전략매치
  wallet: boolean;          // 충전·출금
  notice: boolean;          // 공지
  campaign: boolean;        // 이벤트
  opsMessage: boolean;      // 운영 1인 쪽지 Push
  strategyMatch: boolean;   // 내 전략 매치
}
```

| 잠금 | 내용 |
|------|------|
| **가입 기본** | **모든 채널 `true`** (마스터 포함) |
| OFF 효과 | 해당 채널 **Web Push 0** · 인박스 row는 **저장**(마스터 OFF도 동일) |
| OS 권한 | 브라우저/iOS 거부 ≠ prefs OFF · prefs ON이어도 OS 거부면 Push 실패·인박스만 |
| 금지 | 가입 시 일부 채널 기본 OFF · 끄기 UI 숨김 · prefs 무시 강제 Push |
| CI | `verify:notification-prefs-default-on` |

---

## 6. 화면별 UI/UX SSOT

### 6.1 시선 순서 (모든 카드·상세 공통 · v7.22.27 · §20.2)

1. 🔥 **AI 매칭 가능** (+ optional 마감 임박)
2. 🏷️ **기회** — 회랑 + `arbitrageTypeKo` (시세차익/환율차익)
3. 💵 **필요 자본** (`requiredCapitalUsdt`) — 투입
4. 💰 **예상 수익** (가장 크게, `--profit-emerald`)
5. 🤖 **AI 매칭 적합도** (`aiConfidenceScore` — 「판매 성공률」·당첨률 혼용 금지)
6. 🟢 **수익 벌기** (Primary · §7.3/§48) · 면책 1줄
7. ~~expectedSellDays~~ **유저 0**
8. 📦 **assetLabel** (작게·보조)
9. 📐 **기회 근거** PriceCompareMargin (저가/고가 시세 · §0.0.4) — 접힘 가능
10. 📎 footnote (§38) · 상세 **과거 유사 매칭** + window/asOf (§51.3)

### 6.2 Peotteok Light 색상 · 타이포 · 반응형 SSOT

> **테마:** Consumer = **ADR-017 `peotteok-light` Light+Purple 단일 출시 테마** · Admin = **Ops Light**
> **SSOT:** `packages/ui/tokens/peotteok-light.specification.md` → runtime `lux-fintech.ts` + `lux-theme.css`
> **legacy:** 아래 v7.22 dark hex 표는 이력 설명이며 신규 Consumer 구현 입력이 아니다. 실행값은 Token SPEC만 사용한다.
> **ADR-018 pointer(2026-08-16):** 위 실행값(Token SPEC/`lux-fintech.ts`)은 **현재 runtime 색 미러로 계속 유효**하나, Home 등 ADR-018 §9 신규 Visual Master가 등록되는 화면에는 **자동 입력값이 아니다** — 방향(Light+Purple)은 유지되어도 정확한 hex 적용 규칙은 새 Home Visual Contract(H5)가 Master에서 재확정한다(ADR-018 §6·§14).

| 역할 | token (lux-fintech) | hex | 용도 |
|------|-------|-----|------|
| 배경 | `color.bg` | `#F6F4FC` | App background |
| 표면 | `color.surface` | `#FFFFFF` | 카드·시트 |
| elevated | `color.elevated` | `#FFFFFF` | 레이어 |
| border | `color.border` | `#E4E0F0` | 구분선 |
| accent | `color.accent` | `#6B3CFF` | Purple CTA · active nav |
| accentMuted | `color.accentMuted` | `#8B6CFF` | hover/soft fill |
| 수익 | `color.profit` | `#12B76A` | positive only |
| 원금 / principal | `color.principal` | `#6B3CFF` | CTA·원금 강조 |
| 위험 | `color.danger` | `#F04438` | 실제 에러만 |
| 경고 | `color.warning` | `#F79009` | 주의 태그 |
| 본문 | `color.text` | `#14121F` | body |
| 보조 본문 | `color.textMuted` | `#6B6680` | caption·힌트 |
| 본문 크기 | `--text-body` | clamp | fluid §29 |
| 수익 숫자 | `--text-profit` | clamp | CountUp target |

**금지:** 카지노 레드/골드 팔레트 · pure black `#000` · 수익=빨강 · 구 neon hex 재도입 · Token SPEC 밖 보라색/그라데이션 추가

**상세 모션:** §33 · **성능 tier:** §29 (중복 정의 ❌)

### 6.3 UI 카피 (헌법 준수)
- 영어·IT 전문용어 화면 노출 ❌ (§25)
- **수익 확정 금지** — "예상 수익" + 리스크 tooltip (§35 G2=**공지·앱 capital surface**만 예외 · **랜딩·Guest onboarding/auth=수익 언어 0** · §6.4c.1 F)
- 차트/호가 등 UX 금지 (§22 레이아웃 유지)

### 6.4 온보딩 — 체험형 (SSOT · ≤15초 · §19 게이트 동일) — v7.22.11 · **v7.22.55 CTA/톤 supersede**

> **중복0:** Auth 필드=Infra §51.9 · 랜딩 3초 예산=Infra §31.2b · KYC 서류/상태=Money §42 · Canon wires=`packages/ui/canon/surfaces/onboarding-*.wire.json`  
> **목표:** “읽고 넘기기”가 아니라 **한 번 눌러 체험** 후 홈 진입  
> **v7.22.55 톤 잠금(§6.4c.1 F · 결정문):** Guest/광고 유입(`/l/*`·`/ads/*`→본 surface)·`/auth/*` = **utility 톤** · 수익|투자|USDT|테더|보장|차익|괴리율 **0** · `T.landing.transitionDisclosure` 온보딩 **첫 화면 상단 1줄**(전환 고지 · **capital 톤 허가증 아님**) · 「수익 벌기」=**capital surface only**(§7.3·§20.2 · `/`·`/profits`·기회 카드)

```
0 (≤2초·필수) toneBand 선택 또는 시드
   · UI: [짧게 볼게요] young · [비교로 볼게요] mid · [한 줄씩 볼게요] senior
   · 시드: attribution.landingVariant → §38.9 표 (Infra §31.2 pointer) · 유저 재선택 승
   · fontScale: senior 선택 시 기본=크게 (§50.1) · mid/young=보통
   · **Disclosure(필수·광고유입/Guest):** `T.landing.transitionDisclosure` 1줄
1 IDENTITY (Canon: onboarding-identity) ≤3초
   · 브랜드 히어로=퍼뜩 · 한 줄 정체성(**utility** · 시세·가격 비교) · PriceCompareMargin 미니(**차익 라벨 0**) · utility 면책 1줄
   · 금지: 통계 스트립·보장 CTA·성별 분기·수익/투자 CTA
2 DEMO TAP (Canon: onboarding-demo-card) ≤5초
   · 데모 카드 1장 · 탭 → practice-only 미리보기(원장 기록 0 또는 practice만)
   · 배너: "연습·미리보기 · 출금 아님" (§51.7 pointer) · 수익 확정 암시 0
3 CHARGE PREP (기존 USDT step · **유틸리티 라벨**) 🪙 toneBand variant · 티커/테더 단어 **0**(§38.8 deep-link는 capital surface 이후)
4 ACTION 💰 CTA 라벨 SSOT=[시작하기] 또는 [시세 맵 계속] · **「수익 벌기」금지**(v7.22.55 supersede)
5 PAYOUT+GO 🎉 연습 준비 완료 · [시작하기] → depositPref (§50.1) 또는 `/` (홈 진입 후 capital 톤 허용)
```

**가입 후 상태머신 (pointer · Auth=§51.9):**  
`signed_up` → `onboarding_incomplete` → (step0~5) → `ready` · 중도이탈=재진입 resume · skip 허용 스텝=3(CHARGE PREP)만(면책/정체성/데모 **필수**)

**온보딩 §38 톤 (중복0 · 배선=§38.9 · 문장·이모지=§27.10):** young=짧은 bullet+이모지≤2 · mid=비교표+제목이모지≤1 · senior=큰 글씨+한 줄씩+길잡이이모지≤1+다음 버튼형  
**금지:** 성별(남/여) 온보딩 분기 · 성별 전용 카피/테마 · 데모에서 실출금 유도 · 이모지 폭탄·카지노 이모지 · Guest 경로「수익 벌기」

**CI:** `verify:onboarding-experiential` · `verify:canon-surfaces` (onboarding-identity · onboarding-demo-card 필수)

### 6.4b 로그인·가입 surface (UI owns · 필드 SSOT=Infra §51.9)

| Canon | route | Primary | 비고 |
|-------|-------|---------|------|
| `auth-login` | `/auth/login` | Kakao | Google·Passkey secondary · Email tertiary · **랜딩 firstViewport 직행 0**(§6.4c.1 B) |
| `auth-signup` | `/auth/signup` | Kakao | Stage A 즉시 가입 · Stage B 프로필=§51.9.1 |
| `auth-complete-profile` | `/auth/complete-profile` | 저장하고 계속 | Stage B · 출금/KYC 전 필수 · displayName·phone·birthDate·email* |

**톤:** Guest=`utility`(§6.4c.1 F) · 수익|투자|USDT|테더|보장|차익|괴리율 **0**  
**금지:** 히어로 통계·수익보장·주민번호 입력·성별 필드 · IT 용어

**CI:** `verify:auth-surfaces`

### 6.4e 퍼뜩 채팅 surface (UI owns wire · Runtime SSOT=Engine §47.12~47.15)

| Canon | route | Primary |
|-------|-------|---------|
| `peotteok-chat` | `/me/peotteok` | (없음 · 칩 + 자유입력) |

블록: 브랜드 · 대화 로그(stream partial) · **P레인 Fact 칩**(입금/미션/출금안내/가이드) · 입력창 · (선택) lane 배지 비노출(유저 IT용어 0)  
**동작:** 칩→P · 자유입력→Intent P|G|S · S면 “출금은 지갑에서 직접” 템플릿+deep-link · G stream · P는 숫자 Fact tools  
**말투·이모지:** **§27.10 Owns** (`T.peotteok.voice.*` · 중성 존댓말 · 귀여운 이모지 캡 · 20~70 toneBand)  
**면책 1줄(고정):** “앱 숫자·상태는 원장 기준이에요. 일상 답은 참고용이에요.” (면책 줄 이모지 **0**)  
**degrade:** G 쿼터/장애 시 채팅에 busy 템플릿 + toast `PEOTTEOK_LLM_BUSY` (§8.2) · P칩/Fact 안내는 유지  
**금지:** 자율 출금 CTA · Twin 잔액 · 실체결 암시 · 성별 멘트 · “모든 질문 완벽” 카피 · 반말·이모지폭탄(≥3)·카지노 이모지  

#### 6.4e.1 구현 체크 (v7.22.43 · Engine `#24` API contract 후 · v7.22.47 voice)

| # | Deliverable | SSOT |
|---|-------------|------|
| 1 | `packages/ui/copy/ko/peotteok.ts` | `T.peotteok.chatTitle` · `laneDisclaimer` · `factChips` · `placeholder` · `llmBusy` · S-refuse · P-refresh · **`voice.*`(§27.10)** |
| 2 | `apps/web/app/me/peotteok/page.tsx` | Canon `peotteok-chat.wire.json` blocks 100% |
| 3 | SSE client | `POST /api/v1/me/peotteok/chat` partial stream · `GET .../chips` |
| 4 | P chips | §47.12 제안 우선순위 · lane P 고정 · 칩 라벨 쉬운말+이모지≤1 |
| 5 | S path | template + `/wallet/withdraw` deep-link · execute CTA 0 · `voice.refuseS` |
| 6 | degrade | inline busy + toast `PEOTTEOK_LLM_BUSY` · P Fact 칩 유지 |
| 7 | toneBand | `fontScale` from prefs API (read-only) · §38.9 · pace=§27.10 young/mid/senior |
| 8 | G system seed | Engine §47 pointer · UI는 §27.10 팔레트/캡을 prompt seed 키로 제공(중복 문장 Owns≠UI) |

**선행:** Engine todo `ai-coach-runtime` (#24) SSE contract · **병행 금지**  
**CI:** `verify:ai-coach-fact-only`(P) · `verify:ai-general-no-money-tools`(G UI path) · `verify:ai-coach-no-autonomy` · `verify:llm-quota-degrade` · `verify:canon-surfaces` · `verify:no-it-jargon` · `verify:age-tone-surfaces`

### 6.4c 랜딩 첫화면 3초 예산 (UI owns wire · route SSOT=Infra §31.2 · **듀얼레이어=§6.4c.1**)

Canon `landing-3s` · `firstViewportMaxBlocks=5`: 브랜드 · 정체성 1줄 · **utility 면책 1줄** · Primary CTA 1 · Tier-A 신뢰 strip  
**scroll (firstViewport 밖):** `LandingOperatorFooter` · CTA 직하 `utilityDisclaimer` 반복 1줄(§6.4c.1)  
**금지:** 카드 다발·스케줄·stat strip·보장 수익 · 사진 픽셀 복제 · 랜딩 variant에 `수익|투자|USDT|테더|보장|차익|괴리율|재테크|알바`  
**CI:** `verify:landing-3s` · `verify:marketing-compliance`(Infra · landing 금지어 · pointer) · `verify:operator-footer`

### 6.4c.1 듀얼레이어 광고 랜딩 — Utility Compliance (v7.22.54 · **v7.22.55 5결정문** · PART2c 인수조건 SSOT)

> **원칙:** `/l/*`·`/ads/*` = **시세·가격 비교 툴** 포지셔닝 only · 앱 capital surface(`/`, `/profits` …) = capital-provider 톤(§20.2) · **copy namespace 분리** · drift=결함0  
> **GuestChrome:** 5탭 BottomNav **0** · Infra §31.2a alias와 **동일 surface**  
> **CAPI/client pixel:** Infra §31.3c·§31.4 Owns · UI=허용 trigger만 emit(Lead·ViewContent) · **consent 실행계약=§6.4c.1 G**  
> **유료 소재 카피 SSOT:** Infra **§31.2d** (Meta/TikTok/Google×10 · 20~70 중성 · Human Review) · 랜딩과 bait drift **0**

#### A) Copy namespace (`packages/ui/copy/ko/landing.ts`)

| 키 | 랜딩 `/l/*` · Guest onboarding/auth | 앱 capital surface |
|----|-------------------------------------|-------------------|
| `variants.{meta,tt,google}` | **시세·가격 비교** 톤 · 금지어 **0** | — |
| `utilityDisclaimer` | 데이터 툴·권유/결과약속 0 (이모지 0 · 금지어 문자열 자체 0) | — |
| `transitionDisclosure` | 온보딩 첫화면 상단 1줄 · 전환 고지(아래 F) | — |
| `ctaOpenPriceMap` | `실시간 시세 맵 열기` | — |
| `ctaStartUtility` / `ctaContinueUtility` | `시작하기` / `시세 맵 계속` | — |
| `expectedNotGuaranteed` | **랜딩·Guest 경로 사용 금지**(구 카피=결함) | 앱 surface만(`T.trust.*`) |

**금지어 (Human Review·bot · landing variant·utilityDisclaimer·transitionDisclosure·firstViewport·Guest onboarding/auth):**  
`수익` · `투자` · `USDT` · `테더` · `보장` · `차익` · `괴리율` · `재테크` · `알바`  
**허용 포지셔닝 문장(대체 SSOT):** `글로벌 시세·가격 비교` · `실시간 시세 맵` · `시세 모니터링·비교 툴` — **스프레드·수익·기회·괴리 암시 0**  
**크로스플랜 동기(완료 조건 · 중복0):** 위 금지어·허용문 = Infra §31.2 표 · §31.4.0 landing sanitizer · `verify:marketing-compliance` 검사목록과 **1:1** (UI만 바꾸고 Infra 잔류=결함)

#### B) Primary CTA · 퍼널

| 항목 | 규칙 |
|------|------|
| Label | `T.landing.ctaOpenPriceMap` |
| Action | `/onboarding` 또는 `/auth/login` (Kakao OAuth는 login/onboarding **내부** · 랜딩 firstViewport 직행 Kakao **폐기**) |
| Pixel | `Lead` on click · **G) consent 실행계약 충족 시에만** · Infra manual publisher §31.3c |

#### C) Utility disclaimer — 배치·타이포

| # | 위치 | 스타일 |
|---|------|--------|
| 1 | Primary CTA **직하** | `text-xs text-lux-text-muted` · **opacity-* 중첩 0** (WCAG 이중 감쇠 금지) |
| 2 | `LandingOperatorFooter` **직상** | 동일 카피 1줄 반복(숨김 아님 · 구조적 2중) |
| 3 | Google variant (`senior`) | `text-caption` fluid token (min **12px** · §38.9) |

**금지:** `<10px` · viewport 밖 배치 · opacity로 “법적 은폐” 인상

#### D) `LandingOperatorFooter` (scroll 최하단 · PART2c-pre `supportEmail` 선행 · §0.8.2 #5)

**SSOT import:** `schemas/operator-entity.instance.json` 단일 (JSX 하드코딩 0)

| 필드 | 노출 |
|------|------|
| `legalName` | ✅ |
| `licenseNumber` + DET pointer | ✅ |
| `supportEmail` | ✅ mailto |
| `jurisdiction` / primary address 1줄 | ✅ |
| `/me/legal` | 링크 **1개** |
| 약관 전문·장문 KYB | ❌ (과잉 방어 금지) |

**컴포넌트:** `packages/ui/components/shell/LandingOperatorFooter.tsx` (신규) · `SiteFooter`와 drift 0 · `verify:operator-footer`

#### E) Verify · Infra cross-pointer

| verify | Owner | 검사 |
|--------|-------|------|
| `verify:landing-3s` | UI PART2c | wire blocks · firstViewport≤5 · GuestChrome · CTA navigate · utility keys |
| `verify:marketing-compliance` | Infra §31.7 | landing 금지어(**괴리율 포함**) · auto pixel import 0 on `/l/*` |
| `verify:operator-footer` | Infra+UI | schema↔footer↔legal 3면 · `supportEmail` |

#### F) 톤 허용 시점 SSOT (v7.22.55 · 결정문 · 대안 나열 0)

| 구간 | 톤 | 규칙 |
|------|-----|------|
| `/l/*` · `/ads/*` | **utility** | A) 금지어 0 · 시세·가격 비교 only |
| `/onboarding` · `/auth/*` (Guest) | **utility** | 동일 금지어 0 · ACTION≠「수익 벌기」(§6.4 supersede) |
| 온보딩 첫 화면 상단 | **Disclosure 1줄** | `T.landing.transitionDisclosure` = “시세·가격 비교 도구이며, 가입 후 기회 참여로 이어질 수 있어요.” · 투자권유·수익보장 **0** · **capital 톤 허가 아님**(전환 고지 only) |
| 로그인 후 · 첫 capital surface(`/`·`/profits`·기회 카드 CTA 등) | **capital-provider** | 「수익 벌기」·§20.2 허용 |

**NEVER:** Disclosure를 capital 톤 시작 신호로 해석 · §6.4만 읽고 온보딩에「수익 벌기」박기 · 랜딩 utility → 광고 소재 investment(bait)

#### G) Consent 실행 계약 (v7.22.55 · Owns 분리 · 재설계 0)

| 항목 | 규칙 |
|------|------|
| Consent UI Owns | Infra `packages/sdk/marketing` (`consent.ts` · CMP banner ko) · §31.3c |
| UI 책임 | GuestChrome/랜딩에서 Lead·ViewContent **trigger emit만** |
| 게이트 | `consentMarketing === true`일 때만 emit · **미실장·false·unknown = emit 0** |
| Verify | `verify:marketing-compliance` = auto import 0 · **emit 가드는 PART2c 인수조건**(verify 범위 < 필수 행동 → 필수 행동 우선 · §0.8.3) |

#### H) 완료 정의 (v7.22.55 · verify PASS ≠ 선택)

위 **A~G 전부** + Canon `landing-3s.wire.json` 동기 +  
`pnpm verify:landing-3s` PASS + `pnpm verify:marketing-compliance` PASS + `pnpm verify:operator-footer` PASS  
(+ Infra §31.4.0 landing sanitizer 금지어 목록이 A)와 **동일**)

### 6.4d KYC surface (UI owns wire · 규칙 SSOT=Money §42)

Canon: `kyc-guide` → `kyc-doc-capture` → `kyc-confirm` · Lux 금융 톤 · **주민번호 타이핑 0**  
**CI:** `verify:kyc-surfaces`

---

## 7. 버튼 구성 SSOT (전수)

### 7.1 Global

| 버튼 | 위치 | action | guard |
|------|------|--------|-------|
| 시작하기 | 온보딩 | → `/` | 1회 |
| 시작하기 | 홈 Hero | → `/profits/{id}` | — |

### 7.2 홈

| 버튼 | action |
|------|--------|
| 시작하기 (Hero) | opportunity detail |
| 카드 탭 | `/profits/{id}` |

### 7.3 수익 · 상세

| 버튼 | label | action | guard |
|------|-------|--------|-------|
| Primary | **수익 벌기** | POST `/opportunities/{id}/participate` → `/trades/{id}/execute` (§48) | balance, circuit, **pricingVersion+minProfitUsdt (§43)**, staleAt≤policy, rate limit (**KYC ❌ §42**) |
| Secondary | ❤️ 즐겨찾기 | toggle favorite | auth |
| Tertiary | 📋 실행 경로 보기 | expand platforms | — |

**필수 배지(Primary 인근):** `직접 사지 않아요` · `직접 입찰·판매 안 함` (§48.2)  
**잔액 부족 시 Primary 대체:** `잔액 충전 후 참여` → `/wallet/deposit?tab=usdt`

### 7.4 거래 진행 `/trades/{id}/execute` — **§48 SSOT (Canon 3면 · ADR-013)**

> 구 `AI 거래중...` 한 줄 UI **폐기**. 아래 3화면으로 **100% 대체**.

| 상태 | 화면 (§48) | Primary | Secondary |
|------|------------|---------|-----------|
| `running` / `requeue` | **AI 진행실** | (없음·자동) | `그만두기` (orchestrate cancel) |
| `success` | **수익 들어옴 영수증** | `확인 · 지갑 보기` → `/wallet` | `다른 상품 보기` → `/profits` |
| `safe_stop` (시세변동·미달 등) | **안전하게 멈춤** | `비슷한 상품 보기` | `홈으로` |
| `failed` (시스템) | 안전중단 변형 또는 toast | `고객센터` / `홈으로` | — |

### 7.5 지갑 · 입출금

| 버튼 | action |
|------|--------|
| ➕ 입금하기 | `/wallet/deposit` (USDT·원화 탭) |
| 🪙 USDT 입금 | `/wallet/deposit?tab=usdt` |
| 💵 원화 입금 | `/wallet/deposit?tab=krw` |
| ➖ 출금하기 | `/wallet/withdraw` |
| 🪙 USDT 출금 | `/wallet/withdraw/usdt` |
| 💵 원화 출금 | `/wallet/withdraw/krw` |
| 📋 주소/계좌 복사 | clipboard + toast |

### 7.6 내정보

| 버튼 | action |
|------|--------|
| 친구 초대 | share link + referral code |
| 알림 설정 | toggle matrix |
| 전략 저장 | CRUD saved-strategies |

### 7.7 버튼 whitelist 원칙
- Primary 1개/화면 (한 화면 = 한 행동)
- Destructive = Confirm modal 필수
- Disabled 시 toast로 이유 (침묵 실패 금지)

---

## 8. 토스트 · 알림 SSOT (중복0)

### 8.1 3축 분리 (혼용 금지)

| Surface | Resolver | Tone | visibleToasts |
|---------|----------|------|---------------|
| User error | `resolveToastDetail` | **쉬운 한글 + 이모지 1~2 필수** (§50.2) | 1 |
| User success (금융) | `toastSurfaceMessage` | 쉬운 한글 + 이모지 1~2 + 금액 합성 | 1 |
| Admin | `resolveAdminToastDetail` | **왕초보 한글 평문** · 이모지 ≤1 · IT용어 0 | 2 |

**금지:** `CODE_MESSAGES`를 cute로 rewrite · ErrorState에 toast resolver 연결 · 유저 토스트에 영문 코드·HTTP·스택 · 어드민 토스트에 DLQ/API/Error 등

### 8.2 User Toast Catalog (필수)

| code | toast (KO) | trigger |
|------|------------|---------|
| `INSUFFICIENT_BALANCE` | 😅 USDT가 부족해요. 입금 후 다시 시도해 주세요 | participate |
| `KYC_WITHDRAW_REQUIRED` | 🔐 출금하려면 본인 확인이 필요해요! 1번만 하면 돼요 😊 | withdraw tap · **→ /me/kyc auto** |
| `KYC_PENDING` | ⏳ 본인 확인을 검토 중이에요. 잠시만 기다려 주세요 🙏 | kyc submitted |
| `KYC_REJECTED` | 😔 본인 확인이 반려됐어요. 다시 신청해 주세요 | kyc rejected |
| `KYC_APPROVED` | ✅ 본인 확인 완료! 이제 출금할 수 있어요 🎉 | admin approve |
| `CIRCUIT_OPEN` | ⏸️ 잠시 거래를 멈췄어요. 곧 다시 열릴게요 | any money |
| `RATE_LIMITED` | 🐢 잠깐만요! 너무 빠르게 눌렀어요 | click spam |
| `OPPORTUNITY_EXPIRED` | ⏰ 이 기회는 방금 마감됐어요 | stale participate |
| `EXEC_SAFE_STOP_PRICE` | 🛡️ 가격이 움직여서 이번엔 안전하게 멈췄어요 | execute PRICE_MOVED |
| `EXEC_SAFE_STOP_MIN` | 🛡️ 예상보다 적어져서 진행하지 않았어요 (잔액 그대로) | execute BELOW_MIN_PROFIT |
| `EXEC_SUCCESS` | 🎉 수익이 들어왔어요 | settlement.completed |
| `EXEC_CANCELLED` | 중단했어요. 잔액은 그대로예요 | user cancel |
| `WITHDRAW_PROFIT_OK` | 🎉 수익 출금을 신청했어요 | profit withdraw |
| `WITHDRAW_PRINCIPAL_WARN` | 원금을 빼면 다음 기회 참여가 줄어들 수 있어요 | principal confirm |
| `INSUFFICIENT_PROFIT` | 출금 가능한 수익이 부족해요 | profit mode |
| `INSUFFICIENT_PRINCIPAL` | 근무 중 원금이 부족해요. 충전 후 참여해 주세요 | participate |
| `PRACTICE_NOT_WITHDRAWABLE` | 연습 잔액은 출금할 수 없어요 | practice |
| `MERGE_PROFIT_OK` | 수익을 원금에 합쳤어요. 다음 기회에 바로 쓸 수 있어요 | merge |
| `DEPOSIT_DETECTED` | 👀 USDT {amount} 입금 감지! 확정까지 잠시만요 | §43 1 confirmation (잔액 미반영) |
| `DEPOSIT_CONFIRMED` | 🎉 USDT {amount} 입금 확정! 바로 거래할 수 있어요 | §43 19 confirmations + ledger |
| `KRW_DEPOSIT_SUBMITTED` | 📝 원화 입금 신청 접수! 송금 후 확인해 드릴게요 | krw request |
| `KRW_DEPOSIT_APPROVED` | ✅ 원화 입금이 확인됐어요. 잔액에 반영됐어요 🎉 | admin approve (§5.7 동일) |
| `KRW_DEPOSIT_REJECTED` | 😔 원화 입금을 확인할 수 없어요. 내역에서 이유를 확인해 주세요 | admin reject (§5.7 동일) |
| `KRW_DEPOSIT_EXPIRED` | ⏰ 입금 신청이 만료됐어요. 다시 신청해 주세요 | TTL expire |
| `WITHDRAW_SUBMITTED` | 📤 출금 요청을 받았어요 | withdraw |
| `TRADE_COMPLETE` | 🎉 +{amount} USDT 지급 완료! | settlement |
| `NETWORK_ERROR` | 📡 연결이 불안정해요. 다시 시도해 주세요 | fetch fail |
| `SESSION_EXPIRED` | 🔐 다시 로그인해 주세요 | 401 |
| `ACCOUNT_FROZEN` | ⏸️ 계정이 일시 정지됐어요. 고객센터에 문의해 주세요 | admin freeze |
| `ACCOUNT_BANNED` | 🚫 이용이 제한된 계정이에요 | admin ban |
| `WITHDRAW_BLOCKED` | 📤 출금이 일시 중지됐어요 | admin restrict |
| `BALANCE_ADJUSTED` | 💰 잔액이 조정됐어요 | admin ledger adjust |
| `DEPOSIT_CONFIG_UPDATED` | 🔄 입금 정보가 업데이트됐어요 | SSE (optional toast) |
| `MIN_HOLDING` | ⏳ 원금은 충전 후 {hours}시간이 지나야 출금할 수 있어요 | §11.2 principal/combined |
| `WITHDRAW_FEE_HINT` | 💸 이체 수수료 {fee} USDT가 빠져요 | withdraw confirm |
| `REFERRAL_BOUND` | 🤝 초대가 연결됐어요! | code bind L1 |
| `REFERRAL_L2_PENDING` | ⏳ 친구 첫충전 보너스를 확인 중이에요 | L2 hold window |
| `REFERRAL_L2_RELEASED` | 🎉 초대 보너스가 수익에 들어왔어요 | L2 release |
| `REFERRAL_CLAWBACK` | ↩️ 어뷰징으로 초대 보너스가 회수됐어요 | wash/clawback |
| `REFERRAL_HELD` | ⏸️ 초대 보너스가 잠시 보류됐어요 | risk hold |
| `REFERRAL_CAP` | 📊 오늘 공유 보내기 한도에 도달했어요 | share API/day · **초대 인원캡 아님** |
| `REFERRAL_POOL_WAIT` | ⏳ 보너스를 준비 중이에요. 초대는 유지돼요 | queued_pool |
| `REFERRAL_SHARE_LIMIT` | 🐢 공유는 하루 {n}번까지예요 | share rate |
| `CAMPAIGN_CLAIM_OK` | 🎁 이벤트 보너스를 받았어요 | campaign claim |
| `CAMPAIGN_ENDED` | ⏰ 이 이벤트는 종료됐어요 | claim after end |
| `CAMPAIGN_BUDGET` | 📭 이벤트 예산이 마감됐어요 | budget_exhausted |
| `CAMPAIGN_DUP` | ✋ 이미 받은 보너스예요 | idempotent claim |
| `MISSION_RELEASED` | 🎁 미션 보너스를 받았어요 | §51.8a released |
| `MISSION_POOL_WAIT` | ⏳ 보너스 준비 중이에요 | queued_pool |
| `MISSION_HOLD` | ⏳ 미션 보너스를 확인 중이에요 | pending_hold |
| `MISSION_CLAWBACK` | ↩️ 부정 이용으로 미션 보너스가 회수됐어요 | clawback |
| `STREAK_COUPON` | 🎫 연속 미션 수수료 쿠폰을 받았어요 | streak |
| `NOTICE_PUSH` | 📢 새 공지가 있어요 | notice live+push |
| `PEOTTEOK_LLM_BUSY` | 🤖 퍼뜩이 잠시 바빠요. 조금 뒤 다시 물어봐 주세요 | Engine §47.13 G레인 쿼터/429/degrade |

### 8.3 Push / In-app Notification

| category | title 예 | href |
|----------|----------|------|
| `ai_pick` | 🤖 AI 추천 — +18.5 USDT | `/profits/{id}` |
| `strategy_match` | 💾 내 전략에 맞는 기회 3건 | `/profits?strategy=` |
| `deposit` | 🎉 입금 확인 | `/wallet` |
| `withdraw` | 📤 출금 처리 중/완료 | `/wallet/history` |
| `promo` | 🎁 이벤트 (campaign live · Growth ON) | `/me/events?tab=campaign` |
| `notice` | 📢 공지 | `/me/events?tab=notice` |
| `referral` | 🤝 초대 보너스 / 보류 안내 | `/me/invite` |
| `benefit` | 🎯 받을 혜택 / 미션 완료 | `/me/benefits` |

### 8.4 중복0 기술

- DB: `UNIQUE (user_id, source_event_id) WHERE source_event_id IS NOT NULL`
- Insert 23505 → re-select existing (race defense)
- Sonner: user `visibleToasts={1}` id single-flight
- Push + In-app + Toast 동시: **1 source_event → 1 toast OR 1 in-app** (정책 테이블)

---

## 33. Peotteok Light Design · Motion · FOMO

> **SSOT:** `CONSTITUTION/28_LUX_FINTECH_DESIGN_AND_MOTION.md`  
> **토큰:** `packages/ui/tokens/lux-fintech.ts` + `lux-theme.css` (`@theme` · Tailwind v4)  
> **성능 tier 수치:** §29/26 SSOT (여기서 재정의 ❌)  
> **ADR-018 pointer(2026-08-16 · §33 전체 적용):** 본 §33(33.0~33.8)의 hex·모션·컴포넌트 수치는 **현재 runtime 코드의 기록**이며 코드는 미변경이다. 그러나 Home 등 ADR-018 §9로 새 Visual Master가 등록되는 화면에게는 이 절의 값이 **자동 입력값이 아니다** — 새 화면은 Visual Master → Visual Contract(H5) → Implementation Contract(H6)에서 값을 재추출한다(§33.1/§33.5 개별 pointer 참고 · Motion 방향성(§33.2~33.4 절대 윤리 금지 항목)은 계속 유효, 정확한 수치만 재확인 대상).

### 33.0 피드백 검토 — 동의 vs 수정 (오차0)

| 피드백 | 판정 | 플랜 반영 |
|--------|------|-----------|
| Peotteok Light `#F6F4FC` 배경 | ✅ ADR-017 | `color.bg` default |
| Purple accent `#6B3CFF` | ✅ ADR-017 | CTA·active nav·principal |
| Profit green `#12B76A` | ✅ ADR-017 | 실제 positive Fact만 |
| Danger `#F04438` | ✅ 조건부 | 실제 error만 |
| Warning `#F79009` | ✅ | 주의 태그 |
| Count-Up 0.3s | ✅ 동의 | `CountUpNumber` tier-aware |
| Pulse CTA 무한 glow | ❌ ADR-017 | `MotionCTA`는 hover/press/one-shot transition만 · reduced-motion off |
| S/A/B blur·particle 분기 | ✅ 동의 | §33.3 = §29 tier 연동 |
| Sticky 대형 CTA | ✅ 동의 | §5.3 [G] |
| Market Radar ping | ✅ 동의 | `/profits?view=radar` |
| Receipt print + TronScan | ✅ 동의 | `ReceiptCard` |
| **Live 익명 지급 ticker** | ✅ **G4 Admin** | `ticker_mode`: off / live / demo / hybrid |
| **카지노 칩 사운드** | ❌ **금지** | **Lux chime** (§23.7) |
| **카지노 슬롯 Count-Up 톤** | ⚠️ **수정** | fintech count-up · slot metaphor ❌ |
| **폭죽 Confetti 3중** | ⚠️ **수정** | tier S/A: light burst · B: flash only · reduced-motion: none |
| **"3초 차익 수령" CTA** | ❌ **금지** | ko SSOT **"수익 벌기"** (sticky **"수익 벌기"**) |
| **고급 카지노 심리 연출** | ❌ **금지** | **명품관 Lux-Fintech** reframe |
| **CONSTITUTION 23** | ❌ **충돌** | **`28`** (23=PWA) |
| DopamineButton name | ⚠️ **rename** | **`MotionCTA`** (카지노 연상 ↓) |
| 구 `#00FF87`/`#FF2E63`/`#1A56FF`/`#8B5CF6` plan 표 | ❌ **폐기(v7.22.50 U13)** | shipped `lux-fintech.ts` only |

### 33.1 Visual Identity Lock (중복0 · ADR-017 · **2026-08-16 ADR-018 pointer**)

> **ADR-018:** 아래 `luxFintech.color` 값은 **현재 runtime 코드 미러로 계속 유효**(코드 미변경)하나, Home 등 새 Visual Master가 등록되는 화면의 **자동 기본값이 아니다**(ADR-018 §1.2 "old color treatment 자동 채택 금지"). 새 Home Visual Contract(H5)는 이 표를 그대로 복사하지 않고 Master에서 재추출한다.

```typescript
// peotteok-light.specification.md → lux-fintech.ts runtime mirror
export const luxFintech = {
  color: {
    bg: '#F6F4FC',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    border: '#E4E0F0',
    text: '#14121F',
    textMuted: '#6B6680',
    accent: '#6B3CFF',
    accentMuted: '#8B6CFF',
    danger: '#F04438',
    warning: '#F79009',
    profit: '#12B76A',
    principal: '#6B3CFF',
  },
  // 전체 SSOT는 peotteok-light.specification.md · 여기 임의 확장 금지
} as const;
```

**테마 적용:**
- `apps/web` → `class="theme-peotteok-light"` on `<html>`
- `apps/admin` → `theme-ops-light` (운영 가독성, §9)

### 33.2 도파민 · FOMO 4대 모션 (G4 Admin-configurable)

| # | 장치 | 컴포넌트 | 데이터 소스 (mode) |
|---|------|----------|-------------------|
| 1 | **Count-Up** | `CountUpNumber` | **ledger only** (settlement.completed) · 티커 demo **무관** |
| 2 | **Live Ticker** | `LivePayoutTicker` | Admin **§35.4** Organic Hybrid · surface=**§33.2a** |
| 3 | **Motion CTA** | `MotionCTA` | CSS 200~300ms one-shot · 무한 glow 0 |
| 4 | **Tri-Sensation** | `MotionCTA` + `feedback.ts` | vibrate + lux chime + tier particle |

**홈 [F] counter:** `counter_mode` ledger / demo / blended — Admin `/admin/growth?tab=ticker` · **DayPulse[A2]와 숫자·카피 분리**

**FOMO Coral:** engine `urgency` · G4 ON 시 Admin intensity boost · 티커 줄과 동시 점멸 경쟁 **금지**

#### 33.2a PublicTicker surface (v7.22.40 · Owns=UI 화면 · 스케줄=Admin §35.4)

> **목표:** “전 세계가 쓰는 활기” · 유저가 **연출 존재를 알 수 없게** · Lux 명품관 톤(카지노❌).  
> **중복0:** mode·곡선·corpus·마스킹·caps·audit = **Admin §35.4** · 본 절 = 슬롯·컴포넌트·카피·모션·PII 표시 가드만.

| 잠금 | 내용 |
|------|------|
| 슬롯 | 홈 **[A]만** · 실행실·지갑·DayPulse·PreCTA에 티커 침투 **0** |
| DTO | `PublicTickerEvent` — `displayLabel`·`amountKrwText`·`templateKey`·`at` only (Admin §35.4) |
| 카피 SSOT | `T.ticker.justSettled` / `justReflected` / `participantAmt` — `{name}`=`displayLabel` |
| 예시 | `방금 {name}님이 +{amount} 정산했어요` · 티커 본문에 `100만`/`대박`/`당첨` **0** |
| 모션 | 한 줄 fade 150~220ms · S/A · B=교체만 · reduced-motion=즉시 · **가상리스트 max 50** |
| 사운드 | 기본 **OFF** · Lux chime은 세션당 극희소(설정 ON 시에만) |
| World Pulse | 옵션 strip · 도시명만 · 숫자0 · flag · G4와 슬롯 분리 |
| 규모 문장 | G1 또는 랜딩 3s **1곳** (Admin/랜딩 Owns) · 홈 Hero에 상시 100만 배너 **금지** |
| SSE batch | device-tier §29 — B 3s / A 1s / S 0.5s · 홈 전체 리렌더 금지 |

```typescript
// packages/ui — props (스케줄러 상태 클라 재구현 금지)
interface LivePayoutTickerProps {
  mode: 'off' | 'live' | 'demo' | 'hybrid'; // 서버/Admin 설정 투영
  events: PublicTickerEvent[];              // 이미 마스킹된 라벨만
  maxItems: 50;
}
```

**CI (UI):** `verify:ticker-pii-0` · `verify:day-pulse-live-only` · `verify:no-it-jargon` · (스케줄 규칙=`verify:ticker-organic-hybrid` Admin/Nest)

### 33.3 Tier × Motion Matrix (§29 연동, 재표기 최소)

| 연출 | S | A | B |
|------|---|---|---|
| Card bg | backdrop-blur-xl | rgba surface | opaque surface |
| Settlement particle | canvas light burst | CSS spark | opacity flash only |
| Count-Up duration | 300ms | 400ms | 150ms (minimal) |
| Motion CTA transition | one-shot | one-shot | static border |
| Radar ping | ON | fade ping | OFF |
| Price tick anim | spring 100ms | fade 500ms | number swap 1s |
| Haptics+sound | full | full | visual only |

**`prefers-reduced-motion: reduce`** → **전 tier: motion OFF** (법칙 최우선)

### 33.4 핵심 컴포넌트 SSOT

```
packages/ui/components/lux/
├── CountUpNumber.tsx       # requestAnimationFrame, tier duration
├── LivePayoutTicker.tsx    # Virtual scroll · ticker_mode §35 G4
├── MotionCTA.tsx           # Pulse + onSuccess feedback hook
├── LuxHeroCard.tsx         # 3D tilt S/A only (pointer-fine)
├── MarketRadarPing.tsx     # SSE opportunity.created
├── ReceiptCard.tsx         # print slide + TronScan badge
└── index.ts
```

**Props contract:**
```typescript
// LivePayoutTicker — §33.2a (SettlementTickerEvent/demoQueue 클라 전달 폐기 · 서버 PublicTickerEvent만)
interface LivePayoutTickerProps {
  mode: 'off' | 'live' | 'demo' | 'hybrid';
  events: PublicTickerEvent[];
  maxItems: 50;
}
interface HomePayoutCounterProps {
  mode: 'off' | 'ledger' | 'demo' | 'blended';
  ledgerTotal?: Decimal;
  demoSeed?: { base: Decimal; hourlyBoost?: Decimal };
}
```

### 33.5 Tailwind / Animation Tokens

> **ADR-018 pointer(2026-08-16):** 아래 token mirror는 **현재 runtime 코드**로 계속 유효하나, 새 Home Visual Contract(H5)가 이 값을 자동으로 상속하지 않는다 — Visual Master에서 재확인 후 필요 시 새 token 확장을 별도 L2 변경으로 추가한다(임의 확장은 여전히 금지).

```typescript
// packages/ui/tokens/lux-theme.css (@theme · Tailwind v4) — hex는 lux-fintech.ts 미러만
extend: {
  colors: { background: '#F6F4FC', surface: '#FFFFFF', accent: '#6B3CFF', profit: '#12B76A', danger: '#F04438', warning: '#F79009', ... },
  keyframes: {
    // ADR-017 Home trust surface에서는 glow/neon loop 금지
    'count-roll': { /* opacity only on B */ },
  },
  animation: {
    'count-roll': 'count-roll 0.2s ease-out 1',
  },
}
```

### 33.6 Lux UX Abuse · 오류

| # | 시나리오 | 방어 |
|---|----------|------|
| D1 | Unbounded demo ticker spam | Admin `organicCaps` + max ring 50 (§35.4) |
| D2 | Count-Up on expected not settled | CountUp only on `settlement.completed` |
| D3 | FOMO red always on | server `urgency` or G4 flag |
| D4 | B-tier GPU spike | tier class + CI perf budget |
| D5 | Motion when reduced-motion | CSS media query hard off |
| D6 | Demo mode without audit | `ticker_mode≠live` → audit log required |
| D7 | 유저 DTO에 email/raw displayName | `verify:ticker-pii-0` · 서버 마스킹 only |
| D8 | 티커 숫자를 DayPulse에 표시/합산 | §51.24 L16 · `verify:day-pulse-live-only` |
| D9 | 티커 본문에 100만/당첨/대박 | copy CI · 규모 문장=G1/랜딩1곳만 |
| D10 | 클라에서 demoQueue 스케줄 재구현 | 스케줄 Owns=Admin/Nest §35.4 |

### 33.7 CI Gates (§34)

- `verify:lux-tokens` — no hardcoded hex outside lux-fintech.ts
- `verify:ticker-mode-audit` — demo/hybrid modes emit audit events
- `verify:ticker-pii-0` — public ticker payload PII 0
- `verify:ticker-organic-hybrid` — live우선·caps·곡선 규칙 (Admin/Nest · pointer)
- `verify:motion-tier` — B-tier screenshot: no backdrop-filter
- `verify:cta-copy` — no "차익 수령"/"수익 확정" in **앱 카드·진행 중** (성공 화면 `확정 지급` 배지만 §48 허용)
- `verify:mockup-governance` — ADR-013 · 사진목업 픽셀기준 0 · Canon checklist만
- `verify:canon-surfaces` — Canon wire JSON ↔ 구현 surface 필드/위계 일치
- `verify:brand-logo-single` — Brand Kit wordmark/icon 단일 해시

### 33.8 Mockup Governance SSOT (v7.22.4 · ADR-013 · 오류0)

> **헌법:** 사진/PNG 목업은 로고·톤·여백이 **서로 다름**. 픽셀 SSOT로 쓰면 화면이 깨지거나 화면마다 다른 앱이 된다.  
> **잠금:** 구현·에이전트는 **시각 복제 금지**. 구조·플로우 의도만 허용.

#### 33.8.1 권위 사다리 (오차0 · 상위 승 · **일반 미승인 mockup 전용** — 2026-08-16 ADR-018 분리)

> **적용 범위:** 아래 사다리는 **일반 미승인 mockup/reference 이미지**(ADR-013 기본값)에 적용된다. Owner가 "APPROVED VISUAL MASTER"로 명시 지정하고 ADR-018 §9 intake를 거쳐 등록한 **Founder-approved Visual Master** 화면은 이 사다리 대신 **ADR-018 §3 Visual Authority hierarchy**(Visual Master → Visual Contract → Implementation Contract → tokens/컴포넌트 → runtime)를 따른다. 두 사다리를 섞지 않는다.

| 순위 | SSOT | 용도 |
|------|------|------|
| 1 | `packages/ui/tokens` · Lux · Brand Kit | 색·타입·로고·아이콘·간격 토큰 |
| 2 | `packages/ui` 컴포넌트 · 5탭 IA · §8 toast · copy/ko | 재사용 UI·카피 |
| 3 | 본 플랜 절(§5/§7/§48…) + Canon wire | 화면 위계·필수 블록·CTA |
| — | ~~사진 PNG 목업~~ | **레포 삭제됨** · 재추가 금지 · 인덱싱 제외 |

**충돌 시(일반 미승인 mockup):** 1>2>3만. 외부 사진·기억 속 목업과 다르면 **무시**.  
**Founder-approved Visual Master 화면:** ADR-018 §3 사다리 적용 — Visual Master/Visual Contract가 이 표보다 우선한다(Functional Authority는 별도 사다리로 계속 유효, ADR-018 §3 하단).

#### 33.8.2 사진 목업 — 강제 무시 목록 (결함0 · **UNAPPROVED / REFERENCE MOCKUP ONLY** — Founder-approved Visual Master 예외)

> 본 절은 **미승인·참고용(reference) mockup**에만 적용된다. Owner가 "APPROVED VISUAL MASTER"로 명시 지정하고 ADR-018 §9 intake를 거쳐 등록된 화면은 아래 무시 목록에서 **제외**되며, 그 화면은 대신 해당 Visual Contract(측정값)를 따른다.

에이전트/구현이 사진에서 **절대 가져오면 안 되는 것 (미승인 mockup 기준):**

- 로고·워드마크·파비콘·스플래시 (→ Brand Kit만)
- 색 헥스·그라데이션·그림자·블러 (→ Lux tokens)
- 폰트 패밀리·크기 px (→ fluid type tokens)
- 여백·카드 radius·아이콘 세트 (→ spacing/radius/icon SSOT)
- 잘못된 하단 탭·영문 헤더·타사 마크·난수 성공률 UI
- “목업이랑 픽셀 동일” QA 기준

**허용 (구조 의도만):** 블록 순서 · Primary 1개 · 정보 위계(제목>금액>CTA) · 화면 목적(진행/성공/중단)

#### 33.8.3 Canon Surfaces (Functional / Structural Truth — **2026-08-16 ADR-018 정정: 시각 SSOT 아님**)

> **정정(ADR-018):** Canon은 **기능/구조적 truth**(어떤 블록·필드·CTA·`forbidden`이 있어야 하는가)다. **정확한 visual authority**는 Canon이 아니라 `Founder-approved Visual Master → Visual Contract → Implementation Contract`(ADR-018 §3)다. 아래 "Canon wire 필수 필드"는 계속 유효하지만 geometry·색·spacing 등 시각 값의 SSOT는 아니다.

```
packages/ui/canon/
  manifest.json                 # surface id → route · checklist
  surfaces/
    execution-running.wire.json
    execution-success.wire.json
    execution-safe-stop.wire.json
    admin-execution-policy.wire.json
    # … 홈/지갑/초대 등 추가 시 동일 패턴
.cursor/rules/mockup-governance.mdc  # alwaysApply · 사진목업 경로 0
```

**Canon wire 필수 필드:** `route` · `blocks[]`(id, role, copyKey) · `primaryCta` · `forbidden[]` · `brandRef=packages/ui/brand`  
**승격 규칙:** 새 화면은 Canon wire 작성 **후** 구현. 사진만 주고 “똑같이” 구현 **금지**.  
**스크린샷:** 필요 시 구현 후 Canon+Brand로 **앱 실화면**만 촬영 · `docs/mockups` 재생성 **금지**.

#### 33.8.4 어뷰징·오류 매트릭스 (MUP*)

| # | 실패 모드 | 방어 |
|---|-----------|------|
| MUP1 | 화면마다 다른 로고 | Brand Kit 단일 · `verify:brand-logo-single` |
| MUP2 | 목업 색/여백 복제로 깨짐 | 토큰 only · hex hardcode Fail |
| MUP3 | 탭/IA가 목업따라 drift | 5탭 불변 · `verify:ia-tabs` |
| MUP4 | §48를 사진 픽셀 QA | Canon checklist · 픽셀 diff 금지 |
| MUP5 | archive PNG를 SSOT 경로로 import | `_archive` import Fail CI |
| MUP6 | 에이전트가 목업 첨부 복제 | rule alwaysApply · ADR-013 |
| MUP7 | Canon 없이 화면 추가 | `verify:canon-surfaces` Fail |
| MUP8 | 성공률/영문 헤더 목업 잔재 | §48.0 + copy CI |

> **예외(2026-08-16 ADR-018):** 위 MUP1~MUP8 및 아래 33.8.5의 절대 규칙은 **Founder-approved / ADR-018 §9 registered / `visual-locks.v1.json` LOCK된 Visual Master surface**에는 그대로 적용되지 않는다 — 그 화면은 pixel-accurate 구현이 **의무**다(`.cursor/rules/visual-master-intake.mdc` 역할 잠금). 일반 미승인 mockup 규칙(픽셀 diff 금지·"목업이랑 똑같이" 거부·사진 불일치=비결함)은 **그 외 모든 화면**에서 계속 100% 유효하다.

#### 33.8.5 에이전트 운영 규칙 (중복0)

1. UI 작업 시 **사진 목업을 열지 않음** (기본). 열어도 구조 의도만.  
2. 구현 전 Canon wire + Brand + Lux 확인.  
3. “목업이랑 똑같이” 요청 → **Canon/토큰 기준으로 재해석** 후 구현 (픽셀 맞추기 거부).  
4. 리뷰 지적에 사진-픽셀 불일치 = **비결함** (ADR-013). Canon/플랜 불일치만 결함.  
5. **예외(ADR-018):** 대상 화면이 Founder-approved Visual Master로 등록되어 있으면 위 1~4가 아니라 `visual-master-intake.mdc`의 pixel-accurate 구현 규칙을 따른다 — 그 화면의 Visual Contract 불일치는 **결함**이다.

---

## 34. Consumer Theme 출시 게이트

> **ADR-018 pointer(2026-08-16):** 아래 체크리스트는 **현재 runtime의 ADR-017 `peotteok-light` 이력**이며, ADR-018 §9로 새 Visual Master가 등록되는 화면(Home 등)의 **자동 입력값이 아니다**. 값 자체는 코드 미변경으로 계속 유효하되, 새 Home Visual Contract는 이 표를 복사하지 않고 Master에서 재추출한다(ADR-018 §6). 신규 등록 화면은 이 표와 별개로 자신의 Visual Contract 게이트를 추가로 통과해야 한다.

- [ ] ADR-017 Peotteok Light applied · Lux Dark runtime path 0
- [ ] CountUp fires only on real settlement E2E
- [ ] `ticker_mode=live`: LivePayoutTicker = ledger only
- [ ] `ticker_mode=demo`: Admin queue renders · audit logged
- [ ] `counter_mode=blended`: ledger+demo sum · admin preview matches user
- [ ] MotionCTA opportunity Primary = ko SSOT **"수익 벌기"** (sticky **"수익 벌기"** · PC 전폭 sticky 금지)
- [ ] B-tier: no blur, no particle, 45fps+ scroll
- [ ] reduced-motion: all lux motion OFF
- [ ] 320px sticky CTA clears 5-tab nav
- [ ] **ADR-013:** 사진목업 시각복제 0 · Canon 4면+Brand 단일 로고 · `verify:mockup-governance` PASS

---

## 38. 신뢰 교육 — USDT 납득 · 플랫폼 수익 투명 (v7.5)

> **SSOT:** `CONSTITUTION/38_TRUST_EDUCATION_AND_REVENUE_TRANSPARENCY.md` · §5.7 · §6.4 · `/me/guide/*`  
> **대상:** 한국 유저 **20~70대** · 초등어휘~존댓말 · **면책 문구 CI 잠금**

### 38.1 설계 원칙

| 원칙 | 설명 |
|------|------|
| **USDT 추천, 원화 선택** | USDT default · 원화 강제 금지 |
| **납득 > 설득** | "왜 이 플랫폼 구조인지" 설명 · 과장 FOMO 분리(§35) |
| **세금=면책** | "세금 0" **금지** · "개인·상황별" + 세무사 상담 권장 **고정** |
| **운영 수익=투명** | 플랫폼이 **어디서** 버는지 숫자·도식 공개 |
| **연령 톤** | **§38.9 toneBand** — young/mid/senior (아래 SSOT) |
| **쉬운말·이모지·퍼뜩** | **§27.10** — 한글친화 + 귀여운 이모지(캡) · 도움말/가이드 · 20~70 |
| **성별** | **중성 존댓말만** · 남/여 UI·카피·테마 분기 **영구 금지** |

### 38.2 왜 USDT로 충전하나? — ko SSOT (`T.trust.usdt`)

**핵심 메시지 (3줄 — 모든 surface 공통):**
1. **이 플랫폼은 해외 시세 차익 OS** → 정산 통화가 **USDT(테더)** 로 맞춰져 있어요.
2. **USDT 입금 = 입금 확인 후 바로 거래** · 원화는 **은행 검수** 후 반영돼요.
3. **원화 입출금**은 국내 **통장 기록**과 연결될 수 있어요 · USDT는 **플랫폼 지갑 정산** 흐름이에요.

**비교표 (입금 페이지 · /me/guide/usdt):**

| | 🪙 USDT ⭐ | 💵 원화 |
|---|-----------|---------|
| 속도 | 자동 확인 · 빠름 | 검수 · 느림 |
| 거래 연결 | 입금→거래→출금 **한 통장(지갑)** | USDT 환산 후 거래 |
| 기록 | 플랫폼 정산 · TronScan 추적 | **국내 은행 계좌 이체** |
| 추천 | **대부분 회원 선택** | 익숙한 분만 |

**세금·소득 관련 (면책 블록 — CI 잠금, Admin 편집 불가):**
> 수익 발생 시 **세금·신고 의무는 개인 상황**마다 달라질 수 있습니다.  
> 원화로 입·출금하면 **국내 금융 기록**과 연결될 수 있습니다.  
> USDT 정산은 **플랫폼 글로벌 정산 방식**이며, **세금이 없다고 보장하지 않습니다.**  
> 궁금하시면 **세무 전문가**와 상담해 주세요.

**금지 표현:** 탈세 · 무조건 신고 안 됨 · 세금 0 · 불법 아님 보장

**비유 copy (60~70대):**
- "해외 쇼핑몰에서 받는 **달러 정산**처럼, 여기서는 **테더(USDT)** 로 맞춰요."
- "통장 대신 **앱 지갑**에 쌓였다가, 필요할 때 꺼내 쓰는 구조예요."

### 38.3 플랫폼은 어떻게 돈을 버나? — 투명 수익 모델

> **화면:** `/me/guide/revenue` · 거래 상세 하단 · 온보딩 optional  
> **원칙:** "회원 돈을 가져간다" ❌ → **"시세 차이에서 플랫폼 마진"** ✅

```mermaid
flowchart LR
  Market[해외_A마켓_시세] --> Spread[차익_금액]
  Spread --> UserShare[회원_예상_수익]
  Spread --> PlatformFee[플랫폼_마진_pct]
  PlatformFee --> Ops[운영_인프라_AI_리스크]
```

**유저에게 보이는 설명 (ko):**

| 질문 | 답 (plain ko) |
|------|----------------|
| **플랫폼 수입은?** | 글로벌 **시세 차이(스프레드)** 에서 **플랫폼 마진 %** (§9.5.2 · §36) |
| **회원 수익은?** | 차익에서 마진·수수료 뺀 **예상 순수익** (카드 1순위 숫자) |
| **입금금을 가져가?** | **아니요** — 입금은 **내 지갑(ledger)** · 플랫폼은 **거래마다 마진** |
| **마진율은?** | Admin 설정 · **카드/상세에 "포함 수수료"** footnote (투명) |
| **0% 이벤트?** | Growth ON 시 **프로모 풀** — 평소 마진과 **분리** 표시 |

**OpportunityCard footnote (작게):**
> "예상 수익에는 플랫폼 운영 수수료(마진)가 반영된 금액이에요."

**Admin:** canonical **`/admin/growth?tab=content`** (면책 블록 잠금 · 비교·수익 설명 copy) · 협력사 표기 ON/OFF=**`/admin/growth?tab=partners`** · 구 path `/admin/growth/content`·유령 `/admin/content/trust` = **금지(redirect/미사용)**

### 38.10 Market Partner Trust — 공식 협력사 표기 (v7.22.41 · Founder lock · Owns=UI)

> **제품 잠금:** eBay·Amazon·Yahoo! JAPAN Auction 등은 **사칭·가짜 연출이 아닌 공식 협력사** · 유저 신뢰 surface에 **회사 로고+한글 라벨**을 **반드시** 노출.  
> **중복0:** partner registry·adapter 계약=**Engine §0.0.1c** · 본 절=**어디에·어떻게** 보이게 할지 · Brand asset=**§38.10.3** · orchestrateTruth=§48·§50.3 **불변**(협력≠대리 구매).

#### 38.10.1 공식 협력사 레지스트리 (표기 SSOT)

| tier | partner_id | 유저 LabelKo | 로고 asset | listing leg Day-1 | 표기 |
|------|------------|--------------|------------|-------------------|------|
| **A** | `ebay_us` | 이베이(미국) | `markets/ebay.svg` | ✅ | **항상** |
| **A** | `ebay_gb` | 이베이(영국) | `markets/ebay.svg` | ✅ | **항상** |
| **A** | `ebay_de` | 이베이(독일) | `markets/ebay.svg` | ○ | **항상** |
| **A** | `ebay_au` | 이베이(호주) | `markets/ebay.svg` | ○ | **항상** |
| **A** | `amazon_us` | 아마존(미국) | `markets/amazon.svg` | Phase1+ leg | **항상** |
| **A** | `amazon_jp` | 아마존(일본) | `markets/amazon.svg` | Phase1+ leg | **항상** |
| **A** | `amazon_de` | 아마존(독일) | `markets/amazon.svg` | Phase1+ leg | **항상** |
| **A** | `yahoo_jp` | Yahoo! JAPAN オークション | `markets/yahoo-jp.svg` | Phase1+ leg | **항상** · v7.22.32 표기금지 **supersede** |
| **B** | `pokemontcg` | 포켓몬 TCG 공식 API | `markets/pokemontcg.svg` | catalog | 신뢰/edu |
| **B** | `ygoprodeck` | 유희왕 카드 DB | `markets/ygoprodeck.svg` | catalog | 신뢰/edu |
| **C** | `coingecko` | CoinGecko | `markets/coingecko.svg` | fx | 지갑/edu |
| **C** | `frankfurter` | Frankfurter | `markets/frankfurter.svg` | fx | 지갑/edu |

**카피 SSOT (`T.trust.partners.*`):**
- stripHeadline: `공식 협력 · 글로벌 시세·데이터 연동`
- stripSub: `대형 쇼핑몰·도소매 시장과 연동해 시세를 가져와요`
- legCaption: `{buyLabel} ↔ {sellLabel}` · footnote: `공식 협력 · 시세·데이터 연동`
- badgeOrchestrate: `직접 사지 않아요` / `직접 팔지 않아요` (**유지** · 협력과 양립)

**금지 (결함0):** 「시세 참고용만」을 **유일** 신뢰 문구로 쓰기 · 미등록 몰 로고 · 퍼뜩 Brand Kit 자리에 타사 마크 · 「공식 대리 구매/판매」 · Growth G1 가짜 연혁에 협력사 위장

#### 38.10.2 표기 surface (시선·IA)

| surface | 블록 | 내용 |
|---------|------|------|
| **랜딩 3s** | 신뢰 1줄 (§6.4c) | Tier-A 로고 **4~6개** 가로 · `공식 협력` 1줄 · firstViewport≤5 유지 |
| **홈 `/`** | PartnerTrustStrip | Hero 아래 얇은 strip · Tier-A 전체 · Lux monochrome · **G4 ticker와 슬롯 분리** |
| **기회 카드·상세** | `MarketPartnerLeg` | **해당 opportunity leg만** 로고2+LabelKo+화살표 · PriceCompareMargin 위 |
| **실행실** | step 2 active | leg 로고2 · `시세 불러오는 중...` · LabelKo 동적 |
| **성공 영수증** | log row | `{buyLabel} ↔ {sellLabel} 시세 반영` · **「○○ 판매 완료」금지** |
| **`/me/guide/partners`** | 전체 그리드 | Tier A/B/C · 2열 카드 · 로고+LabelKo+1줄 설명 |
| **온보딩 DEMO** | 1 slide | Partner strip 3초 · orchestrateTruth 1줄 |
| **SiteFooter** | compact | eBay·Amazon·Yahoo JP **로고 small** + `공식 협력` |

**넣지 않음:** 지갑 입출금 CTA 옆(금융 혼선) · G4 LivePayoutTicker · Admin Brand wordmark 영역

#### 38.10.3 Brand · 로고 asset (ADR-013)

```
packages/ui/brand/assets/markets/
├── manifest.json          # partner_id · logo path · labelKo · tier · displayOrder
├── ebay.svg
├── amazon.svg
├── yahoo-jp.svg
├── pokemontcg.svg
├── ygoprodeck.svg
├── coingecko.svg
└── frankfurter.svg
```

| 규칙 | 잠금 |
|------|------|
| 높이 | 카드 leg **20px** · strip **24px** · edu **32px** |
| 변형 | Peotteok Light 공식 원본/monochrome 변형 only · 임의 리컬러 **금지** |
| clear space | 각사 가이드 min · 겹침 **0** |
| href | 유저 클릭 → **외부 쇼핑몰 딥링크 금지** · `/me/guide/partners` 또는 noop |
| manifest | `status=ready`만 렌더 · CDN 무단 **0** |

**컴포넌트:**
```
packages/ui/components/trust/
├── MarketPartnerLeg.tsx       # buy/sell 2-logo row
├── MarketPartnerTrustStrip.tsx
├── MarketPartnerGrid.tsx      # /me/guide/partners
└── index.ts
```

**Canon wire (todo):** `market-partner-trust.wire.json` · `opportunity-card`/`opportunity-detail`/`execution-running` leg 슬롯

#### 38.10.4 Admin (표시만 · sidebar 13 금지)

| route | 액션 |
|-------|------|
| `/admin/growth?tab=partners` | Tier-A 순서 · ON/OFF · **로고 교체 금지**(manifest only) · audit |
| `/admin/opportunities` | leg별 partner_id — Engine Owns |

**CI:** `verify:market-partner-trust` — registry manifest · Tier-A strip 4+ · leg 컴포넌트 · yahoo/amazon 로고 경로 · orchestrate 배지 공존 · `verify:brand-logo-single`(퍼뜩 단일) · `verify:mockup-governance`

### 38.4 UI 컴포넌트 · 라우트

```
packages/ui/components/trust/
├── WhyUsdtCard.tsx              # 입금·온보딩
├── UsdtVsKrwCompareTable.tsx
├── PlatformRevenueExplainer.tsx # /me/guide/revenue
├── MarketPartnerLeg.tsx         # §38.10
├── MarketPartnerTrustStrip.tsx
├── MarketPartnerGrid.tsx
├── TrustFAQAccordion.tsx        # /me/guide/faq
└── TaxDisclaimerBlock.tsx       # CI locked — Admin override ❌

apps/web/app/
├── wallet/deposit/page.tsx      # WhyUsdtCard + NetworkPlainWarning + tabs
├── me/guide/usdt/page.tsx
├── me/guide/get-usdt/page.tsx   # §38.8
├── me/guide/partners/page.tsx   # §38.10
├── me/guide/revenue/page.tsx
└── me/guide/faq/page.tsx
```

### 38.5 Copy 파일 (`packages/ui/copy/ko/trust.ts`)

```typescript
export const trust = {
  usdt: {
    recommendBadge: '⭐ 추천',
    headline: '왜 테더(USDT)로 충전하나요?',
    reason1: '해외 시세 OS — 정산이 USDT로 맞춰져 있어요',
    reason2: '입금 확인 후 바로 거래할 수 있어요',
    reason3: '입금→수익→출금이 한 지갑에서 이어져요',
    krwNote: '원화는 익숙하지만 검수 대기가 있어요',
  },
  revenue: {
    headline: '플랫폼은 어떻게 수익을 내나요?',
    body: '시세 차이에서 플랫폼 마진을 받아요. 회원 입금금을 가져가지 않아요.',
    marginLabel: '포함된 운영 수수료',
  },
  disclaimer: { /* CI locked — see CONSTITUTION/38 appendix */ },
};
```

### 38.6 CI · 출시

- `verify:trust-copy` — 금지어 scan: 탈세 · 세금0 · 무조건 · 100% 안전
- `verify:tax-disclaimer` — 입금·guide·온보딩에 면책 블록 **필수 존재**
- `verify:age-tone-surfaces` — toneBand별 온보딩·Trust·퍼뜩(AI) variant·**`T.peotteok.voice.*` pace** 키 존재 · 성별 분기 문자열 0
- `verify:deposit-network-plain-ko` — 입금 USDT 탭에 네트워크 한글 경고 100% · `TRC20` 렌더 0
- `verify:font-scale-three` — 설정 글자 3단 + senior 기본≥크게
- [ ] **§38.6b spot-check:** **20대 · 40대 · 60~70대** 각 **3명**(남녀 혼합·중성 과제 · 성별 UI 분기 0) — "USDT 왜?" · fontScale 읽기 · 입금 네트워크 한글 경고 · senior/xl 밝은 실내 가독성 · **§27.10:** 도움말 이모지 길잡이 이해 · 퍼뜩 첫인사 부담 없음 · 면책 줄 장난 이모지 **0**
- [ ] `/me/guide/revenue` — 마진 footnote ↔ Admin `platform_margin_pct` 일치
- [ ] `verify:objection4` — 4반박 답변 surface(온보딩·입금게이트·FAQ·상세) 100%

### 38.7 광고유입 4대 반박 — Objection UX (v7.14) SSOT

광고·부업 키워드로 들어온 유저의 **이탈 질문 4개**.  
답은 마케팅 문구가 아니라 **제품 구조 + 화면 증거**로 한다.

#### Q1. “유저에게 수익 많이 주면 회사는 뭘로 벌어요?”

| 레이어 | 설계 |
|--------|------|
| 한 줄 | “회사는 **시세 차이 안의 운영 마진**으로 벌어요. 회원 지갑 돈을 가져가지 않아요.” |
| 증거 UI | `PriceCompareMargin`에서 **유저 마진 / 플랫폼 마진** 두 줄 분리 표시 |
| 도식 | A시장 매수가 → B시장 매도가 → **차이 100** 중 회원 85 · 플랫폼 15 (예시 %, Admin 실제값 연동) |
| 금지 | “회원 수익을 깎아서” 톤 · “영원히 공짜” |

#### Q2. “왜 내가 입금해야 돼요?”

| 레이어 | 설계 |
|--------|------|
| 비유 | “부동산 앱이 집을 대신 사 주지 않듯, **기회에 넣을 내 자본**이 필요해요.” |
| 구조 | 입금 = **내 지갑 잔액(ledger)** · 거래 담보 · 출금 가능 자산 |
| 증거 UI | 입금 전: 기회 카드는 보이되 CTA=`잔액 충전 후 참여` · 입금 후: 같은 카드로 즉시 참여 |
| 소액 | “**10 USDT부터** 가능한 소액 기회” 칩으로 Q2 완화 (§0.0.5 micro) |

#### Q3. “회사에서 돈 주고 그걸로 하면 안 돼요?”

| 레이어 | 설계 |
|--------|------|
| 한 줄 | “회사 돈으로 대신 넣어 주면 **내 수익이 아니라 회사 투자**가 돼요. 여기는 **내 자본으로 기회에 참여**하는 구조예요.” |
| 보조 | 데모/연습: **모의 잔액 1회** 가능하되 **실출금 0** · “연습과 실제는 분리” 배지 |
| 금지 | 가입 보너스 실USDT를 ‘회사 대납 원금’처럼 포장 · 원금보장 |
| 대안 | 첫 참여 수수료 할인(프로모 풀)은 OK · **원금 대납은 금지** |

#### Q4. “부업인데 왜 돈을 넣어요?”

| 레이어 | 설계 |
|--------|------|
| 재정의 | “알바형 부업(시간→시급)이 아니라 **시세차익형 부업(자본→마진)** 이에요.” |
| 비교표 | `시간형 부업` vs `이 앱(자본형)` 2열 — 입금 이유·수익 원천·리스크를 plain ko로 |
| 안심 | 소액 밴드·출금 경로·비교 근거 숫자 · “원하면 언제든 출금 신청” |
| 금지 | “돈 안 넣어도 수익” · “클릭만 하면 월급” |

#### 배치 (언제 보여 줄까)

```
광고 랜딩 히어로 하단: Objection 2줄 요약 + [자세히]
온보딩 step: "회사는 마진으로 / 나는 내 자본으로" 1장
첫 입금 게이트 모달: Q2+Q4 필수 확인 체크 1개 후 입금 폼
/me/guide/faq: Q1~Q4 아코디언 (항상)
기회 상세 하단: Q1 미니 (플랫폼 마진 한 줄) + [수익 구조 보기]
```

#### 컴포넌트 추가

```
packages/ui/components/trust/
├── ObjectionFourAccordion.tsx   # Q1~Q4
├── CapitalVsWageCompare.tsx     # Q4 부업 유형 비교
├── DepositWhyGate.tsx           # 첫 입금 전 납득 모달
└── DemoWalletBanner.tsx         # 모의 연습 (실출금 0)
```

#### Copy SSOT (`packages/ui/copy/ko/objections.ts`)

```typescript
export const objections = {
  q1: {
    q: '유저 수익을 주면 회사는 뭘로 벌어요?',
    a: '두 시장 가격 차이 중 일부를 운영 마진으로 받아요. 내 지갑 잔액은 회사 수입이 아니에요.',
  },
  q2: {
    q: '왜 내가 입금해야 돼요?',
    a: '기회에 참여할 내 자본이에요. 입금은 내 지갑에 보관되고, 거래 후 남은 돈은 출금할 수 있어요.',
  },
  q3: {
    q: '회사가 돈을 줘서 시작하면 안 돼요?',
    a: '회사 돈으로 하면 내 부업이 아니에요. 연습은 모의로, 실제 수익·출금은 내 입금으로만 가능해요.',
  },
  q4: {
    q: '부업인데 왜 돈을 넣어요?',
    a: '시간 팔아 시급 받는 알바와 달라요. 시세 차이로 마진을 노리는 자본형 부업이라 소액부터 내 돈이 필요해요.',
  },
};
```

### 38.8 테더 준비·보내기 가이드 (`/me/guide/get-usdt`) — v7.22.10

> **owns:** 본 절 · Money §41 네트워크 경고는 **pointer**  
> **목적:** USDT가 없는 유저(특히 mid/senior)가 **원화 대안** 또는 **테더 준비→보내기**를 쉬운 말로 이해  
> **금지:** 특정 거래소 필수 추천·수익 보장·탈세 암시 · 화면 `TRC20`/`ERC20`/`BEP20` 문자열

**화면 블록 (순서 고정):**
1. **먼저 선택:** [원화로 충전] → `/wallet/deposit?tab=krw` · [테더로 충전] → 아래 2~4  
2. **테더(USDT)란?** 한 줄 · WhyUsdt 링크  
3. **준비:** “거래소·지갑 앱에서 테더(USDT)를 준비한 뒤, **아래 네트워크 이름과 같은지** 확인해요” (외부 브랜드 필수 표기 금지 · 일반명만)  
4. **보내기 주의 (입금 화면과 동일 문장):** Money §41.6 `T.wallet.networkWarning`  
5. **잘못 보냈어요:** `/me/support` + §51.11 wrong-chain 안내 링크  
6. **세금 면책:** TaxDisclaimerBlock (Admin 편집 불가)

**컴포넌트:** `GetUsdtGuide.tsx` · `NetworkPlainWarning.tsx` (입금 USDT 탭 상단 고정)  
**CI:** `verify:deposit-network-plain-ko` · guide route 존재

### 38.9 toneBand · 연령 톤 배선 (중복0 · v7.22.10 · v7.22.47 pointer)

> **enum SSOT:** `schemas/user-ux-prefs.v1.json` → `toneBand: 'young'|'mid'|'senior'`  
> **카피:** `T.*.{young|mid|senior}` 또는 shared + `senior` override · JSX 하드코딩 금지  
> **성별:** 분기 **0** (중성 존댓말만)  
> **이모지·퍼뜩·도움말 문장형:** **§27.10 Owns** (본 절=배선·시드만 · 팔레트/캡 재정의 금지)

| toneBand | 기본 매핑 | 카피 형태 | fontScale 기본 |
|----------|-----------|-----------|----------------|
| `young` | 랜딩 tt / 선택 “짧게” | 짧은 bullet · 이모지≤2/블록(§27.10) | `md`(보통) |
| `mid` | 랜딩 meta / “비교로” | 비교표·2열 · 제목 이모지≤1 | `md` |
| `senior` | 랜딩 google / “한 줄씩” | 한 문장+다음 · 길잡이 이모지≤1/문장 | `lg`(크게) 이상 |

**시드 규칙 (오차0):**
1. `UserAttribution.firstTouch.landingVariant` ∈ {`tt`→young, `meta`→mid, `google`→senior} (Infra §31.2)  
2. 온보딩 step0에서 **유저 재선택 승**  
3. `fontScale=xl`(더 크게)로 바꾸면 toneBand를 senior로 **강제하지 않음**(독립) · 다만 온보딩 최초 senior 선택 시 fontScale≥lg  
4. Twin/ prefs에 저장 · 퍼뜩(AI) Fact로 제공 (Engine §47.12)

**Light 단일 테마 보완:** senior·xl에서 `--text-contrast`·줄간격↑ · spot-check에 “밝은 실내” 조건 포함 (§38.6b) · dual theme 0

**CI:** `verify:age-tone-surfaces` · `verify:font-scale-three`

---

## 29. Performance · Responsive · Device-Tier (v5)

> **PO LOCK (v7.22.x amend):** `.cursor/rules/peotteok-performance-target.mdc`  
> 개발자 PC ≠ 제품 baseline · 타깃 = **GLOBAL AVERAGE → HIGH-END** · **PREMIUM VISUAL + PRODUCTION PERF**  
> Canon wire = Functional SSOT · Visual Master = Visual SSOT — 성능으로 재작성·다운그레이드 금지  
> WebGL/runtime 3D/canvas/blur/glow = 기술명 영구금지 아님 · **static optimized artwork 선호**(엔지니어링) · §4 8조건  
> 로컬 OOM/timeout = `BLOCKED_LOCAL_*` · 예산 충돌 = `VISUAL_PERFORMANCE_CONFLICT` → PO  
> Tier S/A/B = **rendering path only** (feature parity) · B-tier degrade ≠ “싸보이게 재설계”

| 피드백 | 판정 | 플랜 반영 |
|--------|------|-----------|
| 320px~4K 반응형 | ✅ 동의 | breakpoint + container SSOT |
| clamp() fluid typography | ✅ 동의 | `--text-*` tokens |
| @container 카드/버튼 | ✅ 동의 | OpportunityCard, TouchButton |
| min-height 48px 터치 | ✅ 동의 | `--touch-min: 48px` |
| flex-shrink:0 on controls | ✅ 동의 | 버튼·탭·CTA |
| TanStack Virtual | ✅ 동의 | 수익 피드·지급 ticker·어드민 큐 |
| Device S/A/B tier | ✅ 동의 | `packages/sdk/device-tier.ts` |
| B-tier blur/무거운 motion OFF | ✅ 동의 | tier class `data-tier=b` |
| B-tier WS batch 1s | ✅ 동의 | realtime-service contract |
| Admin TOP5 | ✅ 동의 | §9.5 위젯 (route 중복 없음) |
| TronScan 어드민 링크 | ✅ 동의 | wallet review rows |
| **1px 오차 0** | ⚠️ **수정** | **visual regression + container query** — 절대 1px 보장 ❌ |
| **60fps 무력 보장** | ⚠️ **수정** | **60fps 목표 + tier degrade + perf budget CI** |
| CONSTITUTION **21**번 | ❌ **충돌** | **`26`** (21=GROWTH) |
| **px font 전면 금지** | ⚠️ **수정** | **font-size는 rem/clamp** · 1px border/hairline 허용 |
| **모든 버튼 nowrap** | ⚠️ **수정** | Primary CTA nowrap+ellipsis · 좁은 container에서 clamp 축소 |
| deviceMemory만으로 tier | ⚠️ **수정** | **복합 시그널** (아래 §29.3) |
| Auto-Fit Text JS | ⚠️ **보조** | CSS clamp 1순위 · JS는 `@container` 초과 시만 |
| CPU 5% 미만 | ⚠️ **목표치** | Lighthouse TBT + Long Task monitor |
| Framer Motion S/A 풀가동 | ⚠️ **수정** | **`prefers-reduced-motion` 항상 최우선** |
| "무인 제어" 완전 자동 | ⚠️ **수정** | **원클릭 보조** — 고액·출금 human Confirm |

### 29.1 반응형 4대 법칙 (코드 SSOT)

#### 법칙 1 — Fluid Typography & Container Queries

```css
/* packages/ui/responsive/fluid-type.css */
:root {
  --text-body: clamp(0.875rem, 0.5rem + 1.2vw, 1.125rem);
  --text-profit: clamp(1.5rem, 1rem + 3vw, 2.75rem);
  --text-caption: clamp(0.75rem, 0.65rem + 0.4vw, 0.875rem);
}
.opportunity-card { container-type: inline-size; }
@container (max-width: 280px) {
  .profit-amount { font-size: clamp(1.25rem, 8cqi, 1.75rem); }
}
```

**MUST:** `font-size` 신규 = clamp 또는 `var(--text-*)`  
**ALLOW:** `1px` border / divider  
**NEVER:** `font-size: 14px` 단독 hardcode

#### 법칙 2 — Touch Target Guard

```css
/* packages/ui/responsive/touch-target.css */
.touch-target {
  min-height: var(--touch-min, 48px);
  min-width: var(--touch-min, 48px);
  flex-shrink: 0;
  padding-inline: clamp(0.75rem, 2cqi, 1.25rem);
}
.touch-target__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
@container (max-width: 320px) {
  .touch-target__label { font-size: clamp(0.75rem, 4cqi, 0.875rem); }
}
```

**5탭 하단 네비:** 아이콘+짧은 ko 라벨, 320px에서 ellipsis  
**JS Auto-Fit:** `FitText` optional — clamp로 해결 안 될 때만

#### 법칙 3 — Device Tiering (S / A / B)

```typescript
// packages/sdk/device-tier.ts
export type DeviceTier = 'S' | 'A' | 'B';

export function detectDeviceTier(): DeviceTier {
  const cores = navigator.hardwareConcurrency ?? 2;
  const memory = (navigator as any).deviceMemory; // undefined on iOS
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = (navigator as any).connection?.saveData;
  if (reduced || saveData) return 'B';
  if (memory != null && memory <= 2) return 'B';
  if (cores <= 4) return 'B';
  if (memory != null && memory >= 8 && cores >= 8) return 'S';
  return 'A';
}
```

| Tier | 조건(요약) | UX |
|------|------------|-----|
| **B** | reduced-motion / saveData / RAM≤2GB / cores≤4 | blur OFF, particle OFF, motion minimal, WS **3s** batch |
| **A** | default | standard motion, WS **1s** |
| **S** | RAM≥8 + cores≥8 | full motion, haptics, WS **0.5s**, optional 120Hz |

**HTML:** `<html data-tier="b">` — CSS `[data-tier=b] .glass { backdrop-filter: none }`

**iOS deviceMemory 미지원:** cores + `prefers-reduced-motion` + measured FPS fallback

#### 법칙 4 — DOM Virtualization

| 리스트 | 컴포넌트 | threshold |
|--------|----------|-----------|
| `/profits` feed | `<VirtualOpportunityList>` | >20 items |
| 홈 지급 ticker | `<VirtualTicker>` | >50 rows |
| 어드민 검수함 | `<VirtualReviewQueue>` | >30 rows |

**패키지:** `@tanstack/react-virtual`  
**MUST:** overscan 3 · estimateSize from card height token · skeleton same height (layout shift 0)

### 29.2 Breakpoint SSOT (viewport + container)

| 이름 | width | 테스트 필수 |
|------|-------|-------------|
| **xs** | 320px | Galaxy Fold narrow, old Android |
| **sm** | 390px | iPhone standard |
| **md** | 768px | tablet portrait |
| **lg** | 1280px | laptop |
| **xl** | 1920px | FHD desktop |
| **2xl** | 3840px | 4K — max-width container, no stretch |

**4K:** `max-width: 1440px` content rail + `margin: 0 auto` — 카드 무한 늘어남 방지

### 29.3 Performance Budget (60fps **목표**)

| Metric | S/A target | B target | CI |
|--------|------------|----------|-----|
| LCP | <2.0s | <2.5s | Lighthouse |
| INP | <100ms | <200ms | Lighthouse |
| CLS | <0.05 | <0.05 | Lighthouse |
| FPS (scroll) | ≥55 avg | ≥45 avg | perf e2e |
| Long Task | <50ms | <100ms | OTel RUM |
| JS bundle (web) | <180KB gzip | <150KB gzip | size limit |

**NEVER:** `will-change` 남용 · main thread particle · tier B blur

### 29.4 packages/ui 컴포넌트 (공통 SSOT)

```
packages/ui/
├── responsive/
│   ├── fluid-type.css
│   ├── touch-target.css
│   └── container.css
├── components/
│   ├── TouchButton.tsx       # min 48px + ellipsis
│   ├── FluidCard.tsx         # @container + OpportunityCard
│   ├── VirtualList.tsx       # TanStack wrapper
│   ├── BottomNav5.tsx        # 5탭 잠금
│   └── AdminTop5Widgets.tsx  # §9.5
├── copy/ko/
└── tokens.css
```

### 29.5 Admin ↔ Performance 연동

| TOP5 | tier 영향 |
|------|-----------|
| 돈줄 전광판 | B=3s refresh, S=1s |
| 검수함 Virtual | >30건 virtualize |
| 긴급 정지 | tier 무관 **100ms** |

### 29.6 Realtime Batch Contract (중복0 · **v7.22.50 U14 · Phase1+ 인터페이스**)

> **잠금(Engine §0.9.2 정합):** `services/realtime-service` 폴더는 **Phase0에 없음**. 본 절 = **Phase1+** 도입 시 서버가 존중할 배치/티어 **인터페이스 계약**만.  
> **Phase0:** `useTradeExecution` / `useOpportunityFeed`(및 티커 훅)가 **동일 ms 밴드**를 polling interval로 준수 · 응답채널만 Phase1+에서 SSE로 교체(호출부 재작성 0).  
> **금지:** Phase0에서 WS/SSE/`realtime-service` import·다중 `EventSource`·폴더 존재를 가정한 UI 코드.

```typescript
// Phase1+ realtime-service subscribe policy (폴더 신설 전 · 계약만)
// Phase0 polling hooks MUST conform to the same StreamPolicy bands
interface StreamPolicy {
  tier: DeviceTier;
  opportunityFeedMs: 500 | 1000 | 3000; // S / A / B
  payoutTickerMs: 1000 | 3000 | 5000;
}
```

Client tier → Phase0=훅 interval · Phase1+=query param or first stream hello · server respects

### 29.7 CI Gates (§30)

- `verify:responsive` — 320/390/768/1280/1920/3840 screenshot diff
- `verify:touch-target` — all interactive ≥48px
- `verify:no-px-fonts` — ast scan apps/web, apps/admin
- `verify:virtual-list` — feeds >20 use VirtualList
- Lighthouse perf ≥85 (mobile), ≥90 (desktop)

---

## 30. Performance · Responsive 출시 게이트

- [ ] 320px E2E — 5탭·Hero CTA·거래버튼 **클립/overflow 0**
- [ ] 3840px — content rail centered, no ultra-wide stretch
- [ ] `data-tier=b` — backdrop-filter computed none
- [ ] Virtual list 10k items — heap stable, no tab crash
- [ ] Admin TOP5 — TronScan link, circuit <100ms drill
- [ ] `prefers-reduced-motion` — motion OFF
- [ ] visual regression PASS all breakpoints

---

## 27. Korean-First UX (v5/v7) — 쉬운 한글 SSOT


> **SSOT:** `CONSTITUTION/25_KOREAN_FIRST_UX_POLICY.md`  
> **코드 SSOT:** `packages/ui/copy/ko/*` + `schemas/ui-copy-glossary.v1.json`

### 27.0 피드백 검토 — 동의 vs 수정 (오차0)

| 피드백 | 판정 | 플랜 반영 |
|--------|------|-----------|
| 유저·어드민 UI 영어 0% | ✅ **동의** (범위 명확화) | **화면 노출 0%** — 코드/API/로그는 영어 OK |
| 초등학생·70대·초보 운영자 톤 | ✅ 동의 | copy 가이드 + lint |
| Spread→차익금액, Wallet→내 지갑 등 | ✅ 동의 | glossary SSOT |
| 어드민 Adapter→해외 시세 수집기 | ✅ 동의 | admin 12모듈 ko 라벨 |
| ko.ts 상수 강제, 하드코딩 금지 | ✅ 동의 | ESLint + useCopy |
| CONSTITUTION **20**번 | ❌ **번호 충돌** | **`25_KOREAN_FIRST`** (20=SECURITY) |
| 영어 **한 글자도** 무예외 | ⚠️ **수정** | **예외 화이트리스트** §27.4 (브랜드·USDT·AI) |
| 22와 금지어 중복 | ⚠️ **분리** | 22=레이아웃 · 25=모든 문자열 |
| packages/ui/constants/ko.ts 단일 파일 | ⚠️ **구조화** | `copy/ko/user.ts` + `admin.ts` + `toast.ts` |
| "수익 확정!" 카피 | ⚠️ **수정** | **"예상 수익"** — 헌법 00 Identity와 충돌 방지 |
| i18n en.ts v1 | ⚠️ **보류** | v1 ko-only, **폴더 구조만 en 확장 준비** |

### 27.1 3-Layer 언어 분리 (중복0)

| Layer | 언어 | 예 |
|-------|------|-----|
| **L1 화면 (User+Admin)** | **한국어만** | `T.user.wallet.title` → "내 지갑" |
| **L2 코드·API·DB** | 영어 | `SettlementLedger`, `/api/v1/wallet` |
| **L3 약관·헌법·ADR** | 한국어+법률용어 | 투자 아님 명시 |

**NEVER:** L2 문자열을 L1에 직접 렌더 (`{error.code}`, `{status}`)

### 27.2 Copy 패키지 구조

```
packages/ui/copy/
├── ko/
│   ├── user.ts          # T.user.* — 5탭, 카드, 지갑, 온보딩
│   ├── admin.ts         # T.admin.* — 12모듈, 버튼, 테이블 헤더
│   ├── toast.ts         # T.toast.* — schemas/toast-codes mirror
│   ├── push.ts          # T.push.* — 알림 title/body
│   ├── trust.ts         # T.trust.* — §38 USDT·수익·면책
│   ├── settings.ts      # T.settings.* — §50.1
│   ├── legal.ts         # T.legal.* — §50.3 약관4종 대본
│   ├── operator.ts      # T.operator.* · T.legal.operator — §50.9 DET 푸터
│   ├── principal-profit.ts
│   ├── execution.ts
│   ├── peotteok.ts      # T.peotteok.* + voice.* (§27.10)
│   ├── invite.ts
│   ├── benefits.ts
│   └── glossary.ts      # G.status.* G.adminJob.* — enum→한글
├── use-copy.ts          # useCopy('user.wallet.title')
└── index.ts
```

**사용 패턴 (MUST):**
```tsx
// ✅
<h1>{T.user.home.greeting}</h1>
// ❌ FAIL
<h1>Hello</h1>
<h1>Wallet</h1>
```

**동적 데이터:** `assetLabel`(Rolex Submariner) = **시장 데이터** → glossary 거치지 않음 (§27.4)

### 27.3 유저 화면 — 금지어 → 표시어 (전수 SSOT)

| 금지 (화면 노출) | 표시 (ko) |
|------------------|-----------|
| Spread | 차익 금액 / 예상 순수익 |
| Opportunity | 수익 기회 |
| Wallet | 내 지갑 |
| Asset | 내 자산 |
| Deposit | 충전하기 |
| Withdraw | 출금하기 |
| Pending | 지급 대기 중 |
| Settlement | 정산 완료 |
| Network Fee / Gas | 이체 수수료 |
| Margin | (유저 UI **금지**) → "예상 수익" |
| Arbitrage, ROI, PnL | **전부 금지** |
| KYC | 본인 확인 |
| TRC20 / Blockchain / Token | **숨김** → "테더(USDT)" / "입금 주소" |
| Execute / Confirm / Submit | 수익 벌기 / 투입 확인 / 신청하기 |
| Matching / Orchestrate / Pipeline | 진행 중 / AI가 진행 중 |
| Principal / Profit bucket | 근무 중 원금 / 출금 가능 수익 |
| Idempotency / Webhook / SSE | **화면 금지** |
| Staging / QA / Debug / Testnet | **화면 금지** |
| Mock / PoC / MVP / Beta | **화면 금지** (유저·어드민) |
| API / JSON / Schema / Endpoint | **화면 금지** |
| Ledger / Double-entry | 장부 / 받을돈·줄돈 기록 |
| Hot wallet / Sweep / Gas | 회사 금고 / 모으기 / 이체 수수료 |

**5탭 라벨 (잠금):** 홈 · 기회 · 수익 · 지갑 · 내정보

**카피 톤 (유저 · 쉬운말 · 20~70대 · 남녀 공통):**
- ❌ "지금 누르면 45,000원 **수익 확정**!" / 한자·영어·법률체 남발
- ❌ 성별 호칭·성별 전용 테마/일러스트 강제 (남/여 분기 **금지**)
- ✅ "예상 수익 **+45,000원**" + "실제 금액은 달라질 수 있어요"
- ✅ 문장 짧게 · **중성 존댓말** · 초등~중학생도 이해 가능한 단어
- ✅ 토스트·푸시: **한글 + 이모지 1~2개** (§50.2)
- ✅ 도움말·쉬운말·퍼뜩·빈화면·힌트: **한글친화 + 귀여운 이모지** (**§27.10 Owns**)
- ✅ 연령 표현 차이 = **toneBand만** (§38.9) · 성별 아님

### 27.4 화면 노출 예외 화이트리스트 (오차0)

| 예외 | 이유 | 규칙 |
|------|------|------|
| **USDT** | 국제 표준 + 사용자 요청 | "12.45 USDT" + ≈원화 병기 |
| **AI** | 국내 보편 약어 | "AI 추천" OK · "Artificial Intelligence" ❌ |
| **브랜드·모델명** | 시장 데이터 | Rolex, iPhone 등 (카드 하단 작게) · 금지 adapter 브랜드를 **시세 출처**로 표기 ❌ |
| **₩ / 원** | 원화 | "₩17,200" · "약 1만 7천원" |
| **숫자·%** | universal | "+12.45", "91%" |

**NOT 예외 (여전히 금지):** KRW 라벨, BTC, ETH, TRC20, Pending, Failed, Test, Debug, Staging, Mock, API, JSON, Error 500, null, undefined

**브랜드 예외 추가 잠금:** Chrono24 등 **금지 시세출처 브랜드를 ‘시세 출처’로 표시 금지** (상품명 시장데이터와 별개 · §0.0.2)

### 27.5 어드민 — 왕초보 운영자용 한글만 (IT·개발·테스트 용어 화면 0)

> **헌법:** 프로그래밍 지식 0인 운영자도 **한눈에** 이해.  
> **어드민 화면에 영어 IT/개발/테스트/문서 용어 절대 노출 금지** (§50.4 확장 금지어).

| 내부 (코드/로그 · 비노출) | 어드민 화면 표시 (오직 이것) |
|---------------------------|-------------------------------|
| Market Adapters | 해외 시세 수집기 |
| Settlement Ledger | 입출금·정산 장부 |
| Double-Entry Journal | 받을돈·줄돈 기록 (쌍으로) |
| Risk / Anomaly | 사기·이상 거래 방지 |
| DLQ | 다시 해야 할 실패 목록 |
| NATS / JetStream / Kafka | **화면 금지** → 필요 시 `실시간 알림 줄` |
| Temporal / Workflow | 자동 처리 대기줄 |
| Feature Store | 시세·회원 자료함 |
| Circuit Breaker | 긴급 정지 |
| Reconciliation | 장부 맞춤 검사 |
| Shadow Replay | 어제 숫자 다시 맞춰보기 |
| KYC / AML | 본인 확인 / 이상한 돈 흐름 감시 |
| WebAuthn | 지문·얼굴로 확인 |
| Idempotency | 같은 요청 두 번 막기 (화면 설명문만) |
| Webhook / SSE / gRPC | **화면 금지** |
| Staging / QA / Testnet | **화면 금지** |
| successRatePercent | **화면 금지** |

**어드민 상세:** 기본 한글만.  
내부번호(기회번호 등)가 필요하면 라벨을 **`관리 번호`** 로만 · **"개발자 보기" 영문 토글 금지** → 필요 시 RBAC `기술지원` 역할에 **`자세한 관리 번호 보기`**(한글) default OFF.

### 27.6 API 오류 · 상태 → 한글 (결함0)

```
problem.code (영어, 내부) → glossary.ts → toast/inline (한글)
```

| code | 유저 표시 |
|------|-----------|
| INSUFFICIENT_BALANCE | USDT가 부족해요 |
| CIRCUIT_OPEN | 잠시 거래를 멈췄어요 |
| OPPORTUNITY_EXPIRED | 이 기회는 방금 마감됐어요 |

**금지:** `{error.message}`, `{problem.code}`, HTTP 503 등 **raw 노출**

### 27.7 CI · ESLint 강제 (오류0)

| Gate | 명령 | Fail 조건 |
|------|------|-----------|
| Hardcoded UI | ESLint `no-hardcoded-ui-text` | JSX string literal in apps/web, apps/admin |
| English leak | `verify:korean-ui.mjs` | `[A-Za-z]{3,}` in rendered copy keys (whitelist 제외) |
| Glossary coverage | `verify:glossary-coverage` | 모든 ProblemCode·TradeStatus enum에 ko mapping |
| Admin plain | `verify:admin-plain-language` | IT·개발·테스트 금지어 in admin.ts values |
| No jargon | `verify:no-it-jargon` | 유저·어드민 렌더 트리 금지어 (§50.4) |
| Toast emoji | `verify:toast-emoji` | 유저 toast 이모지 1~2 · 어드민 ≤1 |
| Cute emoji palette | `verify:cute-emoji-palette` (CATALOG 등록 후) | §27.10 금지 이모지·면책본문 이모지·캡 초과 |
| Age tone + voice | `verify:age-tone-surfaces` | toneBand + `T.peotteok.voice.*` pace 키 |
| Legal plain | `verify:legal-plain-ko` | 약관4종 어려운말/영문IT 스캔 |
| Operator footer | `verify:operator-footer` | schema ↔ footer ↔ legal operator block 일치 |
| check:light | CI | 위 전부 GREEN |

**스캔 제외:** `route`, `className`, `data-testid`, import path, 주석, **L2 코드파일**(화면 번들 문자열만 검사)

### 27.8 PWA · Push · Install 한글 (카피 Owns=UI · 구현=PWA §23)

| surface | ko SSOT |
|---------|---------|
| manifest `name` / apple-title | 퍼뜩 |
| Install prompt iOS | "홈 화면에 추가하면 앱처럼 쓸 수 있어요" |
| Install Android | "1초 만에 앱 설치" |
| Offline banner | "📡 연결 확인 후 다시 시도" + 새로고침 |
| SW update | "새 버전으로 새로고침" |
| Push title | `T.push.*` · §8.3 — 예: "🤖 AI 추천 — +18.5 USDT" |

manifest `lang: ko-KR` · `description` 한국어 only · **theme/bg 색=Lux·PWA §23.1** (카피 절에서 hex 재정의 금지)  
**Canon:** `install-ios` · `install-android` · `offline-banner` (PWA 구현 todo)

### 27.8a Store listing 한글 (카피 Owns=UI · 절차 Owns=PWA §24 · v7.22.49)

> **Owns:** Uptodown/Play **스토어 카드용** short/full 한글 문장 키 (`packages/ui/copy/ko/**` · 예: `T.store.uptodown.*` / `T.store.play.*`).  
> **Pointer only (재정의 금지):** APK/AAB·assetlinks·Developers Console·Country Restriction·publication criteria = **PWA §24** · Legal 법인명·DET = **§50.9** · Brand 아이콘/1024×500 = Brand Kit.  
> **한도 (오차0 · Uptodown 문서):** short **≤70자** · full **≥50단어** · 쉬운 한글 · IT용어 0 (§27) · retired `오늘수익`·`바로번다` **0** · 타사 상표 사칭 0.  
> **금지:** UI 플랜에 TWA/APK 빌드 절차 장문 · Money/Engine Store todo.

### 27.9 Korean UX 어뷰징 · 오류

| # | 시나리오 | 방어 |
|---|----------|------|
| K1 | API detail 영어 그대로 toast | resolveToastDetail + glossary 필수 |
| K2 | Admin raw enum on screen | admin.ts + plain-language lint |
| K3 | Dynamic adapter name leak | adapter.displayNameKo 필수 필드 |
| K4 | Copy drift (22 vs 25) | 22는 25 pointer only |
| K5 | Hardcoded "Wallet" in new PR | ESLint fail |
| K6 | 이모지 폭탄·카지노·면책 본문 이모지 | §27.10 캡/팔레트 + verify:toast-emoji |
| K7 | 퍼뜩 반말·성별호칭·타코치명 | §27.10 voice + `verify:age-tone-surfaces` · brand-consumer |

### 27.10 한글친화 · 귀여운 이모지 · 도움말·쉬운말·퍼뜩 말투 (v7.22.47 · 20~70 · 중복0)

> **Owns:** 유저 surface의 **도움말 · FAQ · 가이드 설명 · 빈화면 · 인라인 힌트 · placeholder · 쉬운말 문장형 · 퍼뜩(AI) 말투 · 귀여운 이모지 팔레트/캡**  
> **목표:** 한국 사람 **20대~70대**가 “쉽고 친근·부담 없음”으로 느끼게 · 오류0·결함0·오차0·중복0  
> **해석 잠금:** 「이모지 전부」= **적용 표면 전부**(도움말·쉬운말·퍼뜩·토스트·빈화면·힌트) · **문장마다 무제한 나열 금지**  
> **Pointer only (재정의 금지):** toast **본문 문장**=§8.2 · toast **1~2 필수 수치**=§50.2 · toneBand enum·시드=§38.9 · 퍼뜩 SSE/레인=Engine §47 · wire=§6.4e · 어드민 plain=§27.5(본 절 귀여움 **0**) · 멤버십 주배지 SVG=§5.9.2c  
> **코드 SSOT:** `packages/ui/copy/ko/**` · `peotteok.ts`(`T.peotteok.voice.*`) · guide/help/empty 키 · todo Owns=`korean-first-copy` (배선=`ai-coach-ui`·`plain-korean-surfaces`·`toast-notification`)

#### 27.10.1 원칙 (잠금)

1. 화면 말 = **쉬운 한글 중성 존댓말** only (`해요`/`예요`/`할게요`) · 초등~중학 어휘 · 한자·영문 IT 0 (§27.3 금지어)  
2. **귀여운 이모지** = 친근·길잡이 신호 · 20대도 부담 없게 · 70대도 “무슨 화면인지” 한눈에  
3. 연령 차이 = **toneBand만** (young/mid/senior) · **성별 분기 0** · 반말·급식체·아재개그 **강요 0**  
4. 금액·면책·세금·약관 **본문** = 이모지 **0** (제목만 0~1) · 신뢰 > 귀여움  
5. Primary CTA 라벨(`수익 벌기` 등) = 이모지 강제 **0** (가독·오탭 방지) · 옆 보조 설명에만 허용  
6. 어드민 = §27.5 · 웃긴/귀여운 톤 **금지**

#### 27.10.2 표면별 이모지 캡 (오차0)

| 표면 | 이모지 | 비고 |
|------|--------|------|
| toast / push / in-app 알림 | **1~2 필수** | 수치 Owns=§50.2 · 문장 Owns=§8.2 |
| `/me/guide/*` · FAQ · Objection · DepositWhy · 도움말 카드 | 제목 **1** · 본문≤**2**/카드 | 카드마다 제목 이모지 권장 |
| 빈화면 (empty state) | **1 필수** | `{이모지} 아직 ~가 없어요` + CTA 1 |
| 인라인 힌트 · placeholder · 필드 도움말 | **1** | 차가운 영문 hint 0 |
| 온보딩 · 초대 Explain | young≤2/블록 · mid 제목≤1 · senior≤1/문장 | §38.9 배선 |
| 퍼뜩 UI 템플릿 버블 | 문장당 ≤**2** · 연속 3버블 중 ≥1개에 이모지 1 | Fact 숫자 **옆 장식 나열 0** |
| 퍼뜩 G스트림 (LLM) | 권장 1 · ≤2/답변 · 카지노·도박 이모지 0 | Engine §47 system seed ← 본 팔레트 |
| Soft/Hard · 실행 진행 힌트 | ≤1 | 긴장감 Fact 유지 · 장난 톤 0 |
| 면책·세금·약관·DET 본문 | **0** | 제목 0~1만 |
| 멤버십 **주** 배지 | **0** | Brand SVG only · 이모지=보조 라벨만 (§5.9.2c) |
| Admin 전 표면 | ≤1 · 귀여움 0 | §27.5 |

#### 27.10.3 허용 팔레트 · 금지 (귀여움 ∩ 금융 신뢰)

**권장 (cute + clear):** ✨ 😊 🙌 💡 🪙 💰 💸 🎉 🛡️ 🔐 📡 🤖 🎁 ✅ 👋 💙 🌟 📱 🤝 📝 ⏱️ 🏠 ⭐  

**금지:** 🎰 🃏 🎲(당첨·도박 암시) 🔞 💀 · FOMO 🔥 과다 · 피부톤/성별 강제 조합 · 「100%」「대박」「당첨」과 결합한 축하 과잉 · 이모지 **3개 이상** 연속

#### 27.10.4 쉬운말 · 도움말 문장 형 (20~70 공통)

| 패턴 | 잠금 예 |
|------|---------|
| 도움말 오프닝 | `{이모지} {쉬운 한 줄}` + (선택) `자세히` 접기 |
| 빈화면 | `{이모지} 아직 보여줄 수익 기회가 없어요` + [충전하기] |
| 어려운 말 1회 병기 | `시세(지금 가격)` · `정산(수익 반영)` |
| 한 문장 한 뜻 | 복문·한자 나열 0 |
| 호칭 | 호칭 생략 우선 · 「회원님」허용 · 「오빠/언니/유저님」금지 |
| 금지 톤 | 반말 · 명령 위협 · 투자권유 · “무조건 벌어요” |

**가이드 루트 (`/me/guide/*`) 적용:** usdt · get-usdt · revenue · faq · principal · partners — 제목·카드 리드에 §27.10.2 캡 필수.

#### 27.10.5 퍼뜩 말투 SSOT (`T.peotteok.voice.*`)

| 키 | 잠금 문장 (ko) |
|----|----------------|
| `persona` | 친근한 도우미 · 이름 **퍼뜩** · 성별·인간형 암시 0 |
| `greeting` | `안녕하세요! 퍼뜩이에요 😊 무엇을 도와드릴까요?` |
| `shortConfirm` | `네, 살펴볼게요 ✨` |
| `moneyFactTail` | Fact 문장 끝 이모지 ≤1 · 보장/확정/수익률 약속 0 |
| `refuseS` | `출금은 지갑에서 직접 해 주세요 🔐` (+ deep-link) |
| `busy` | §8.2 `PEOTTEOK_LLM_BUSY` 문장 승 (재작성 금지) |
| `helpNudge` | `💡 아래 안내를 눌러 보시면 더 쉬워요` |
| `seniorPace` | 한 문장 + 확인 질문 1 · 긴 단락 0 · 이모지 ≤1 |
| `youngPace` | 짧은 2문장 · 이모지 1~2 |
| `midPace` | 설명 1 + 예시 1 · 이모지 1 |

**퍼뜩 금지:** 반말 · 성별 호칭 · 타프로젝트 코치명 · 자율 출금 CTA · IT용어(P/G/S 레인명 화면 노출) · 이모지 ≥3 · 카지노 이모지 · “모든 질문 완벽”

#### 27.10.6 toneBand × 귀여움 (의미 동일 · 표현만 · §38.9 배선)

| band | 도움말·쉬운말 | 퍼뜩 |
|------|---------------|------|
| `young` | 짧은 bullet · 이모지 문장 앞 | 짧고 경쾌 · 이모지 1~2 |
| `mid` | 비교·단계 번호 · 제목 이모지 | 설명+예시 · 이모지 1 |
| `senior` | 한 줄씩 · 큰글 · **길잡이 이모지 문장 앞 1** · 장식 나열 0 | 천천히 · 확인 질문 · 이모지 ≤1 |

#### 27.10.7 중복0 Owns 표

| 주제 | Owns |
|------|------|
| 팔레트·캡·도움말 형·퍼뜩 `voice.*` · empty/hint | **§27.10** |
| toast 문장 카탈로그 | §8.2 |
| toast 1~2 필수 규칙 | §50.2 |
| toneBand enum·시드 | §38.9 |
| 퍼뜩 SSE·P/G/S 런타임 | Engine §47 |
| 퍼뜩 Canon wire | §6.4e |
| Admin 왕초보 한글 | §27.5 · §50.5 |
| 금지어→표시어 표 | §27.3 |

#### 27.10.8 파일 · CI

```
packages/ui/copy/ko/peotteok.ts    # T.peotteok.voice.* + chat 키
packages/ui/copy/ko/trust.ts       # guide 리드·FAQ 제목 이모지
packages/ui/copy/ko/user.ts        # empty/hint/placeholder
packages/ui/copy/ko/toast.ts       # §8.2 mirror · 이모지 포함
schemas/ui-copy-glossary.v1.json   # 금지어
scripts/verify-toast-emoji.mjs     # 기존
# 신설 시: scripts/verify-cute-emoji-palette.mjs → CATALOG 등록 후 verify:cute-emoji-palette
```

| Gate | Fail 조건 |
|------|-----------|
| `verify:korean-ui` | 화면 영어 누수 |
| `verify:toast-emoji` | 유저 toast 이모지 0 또는 ≥3 · 어드민 >1 |
| `verify:age-tone-surfaces` | young/mid/senior · voice pace 키 부재 · 성별 분기 문자열 |
| `verify:no-it-jargon` | 도움말/퍼뜩/empty IT용어 |
| `verify:cute-emoji-palette` (등록 후) | 금지 이모지 · 면책 본문 이모지 · 캡 초과 |

**spot-check 연계 (§38.6b):** 20·40·60~70대 과제에 「도움말 이모지 길잡이 이해」「퍼뜩 첫인사 부담 없음」「면책 줄에 장난 이모지 0」 체크 포함.

---

## 28. Korean-First 출시 게이트

- [ ] `verify:korean-ui` PASS
- [ ] `verify:glossary-coverage` 100%
- [ ] `verify:admin-plain-language` PASS
- [ ] `verify:no-it-jargon` PASS (유저+어드민)
- [ ] `verify:toast-emoji` PASS
- [ ] `verify:age-tone-surfaces` PASS (§27.10 voice·pace 키 포함)
- [ ] `verify:cute-emoji-palette` PASS (CATALOG 등록 후 · 미등록이면 korean-first-copy에서 등록)
- [ ] `verify:legal-plain-ko` PASS (§50 약관4종)
- [ ] `verify:operator-footer` PASS (§50.9 DET 1135431 · PRE-OWNED WATCHES L.L.C)
- [ ] 설정: 다크/밝은/시스템 토글 **없음** · 글자 크기 있음 (§50.1)
- [ ] 유저 5탭·어드민 12메뉴 **라벨 = admin.ts/user.ts 일치**
- [ ] 스크린샷 회귀 — 영어 pixel 0 (브랜드·USDT·AI 예외만)
- [ ] problem.code raw 노출 E2E 0건
- [ ] 왕초보 운영자 워킹: 입출금 검수·긴급정지·회원찾기 **가이드 없이 완료**
- [ ] 도움말·empty·퍼뜩 greeting에 귀여운 이모지 적용 · 면책/약관 본문 이모지 **0** (§27.10)
- [ ] 20·40·60~70 spot-check에 §27.10 항목 포함 (§38.6b)

---

## 48. AI 진행실 · 성공/안전중단 · Admin 진행정책 (v7.18) — Canon 4면 SSOT

> **ADR-013:** 사진 PNG 목업 **레포 삭제됨** · 재추가 금지 · **픽셀 SSOT 아님**.  
> **시각·구조 SSOT:** `packages/ui/canon/surfaces/execution-*.wire.json` + Lux + Brand Kit only  
> **헌법:** `CONSTITUTION/48_AI_EXECUTION_ROOM_AND_POLICY.md`  
> **카피:** `packages/ui/copy/ko/execution.ts` = `T.execution.*`  
> **스키마:** `schemas/execution-policy.v1.json` · `schemas/trade-execution-state.v1.json`  
> **검증:** `verify:execution-surfaces` + `verify:canon-surfaces` — Canon 체크리스트·카피·금지어 100% (**사진 픽셀 diff 금지**)

### 48.0 사진목업 drift 교정 (플랜·Canon 승 · 오차0 · ADR-013)

| 사진목업에 보이는 현상 | 구현 잠금 (사진 무시) |
|-----------|-----------|
| 화면마다 로고·톤 다름 | **Brand Kit + Lux만** · 사진 로고/색 복제 금지 |
| 성공 화면 하단 탭이 분석/상품/알림 등으로 보임 | **5탭 불변:** 홈·기회·수익·지갑·내정보 · 성공 후 **지갑 탭 하이라이트**만 |
| 안전중단 영문 `MATCH FAILURE` | 유저 노출 **`매칭 중단`** (ko) · 블록 위계는 Canon wire |
| 추천 카드 `AI 매칭 성공률 92%` | 필드는 **`aiConfidenceScore`** · 라벨 **`AI 매칭 적합도 92%`** (난수 당첨·판매성공률 아님) |
| Admin 사이드바 단순화 | 톱레벨 **12모듈 유지** + **2b 진행 정책** 자식 링크 |
| 성공 카드 `이베이 판매 완료` | **시스템 상태 문구** (유저가 판 것 아님) · 배지 `직접 사지 않아요`·`직접 팔지 않아요` 병기 |
| 여백·카드·아이콘이 장마다 다름 | spacing/radius/icon **토큰 단일** · 장별 미세조정 금지 |

### 48.1 유저 플로우 (행동 최소)

```
상세/홈 Primary [수익 벌기] · 상세 대안 [이 기회로 수익 벌기]
  + 배지: 직접 사지 않아요 · 직접 팔지 않아요
  → 투입 금액 확인 시트
  → POST /opportunities/:id/participate  (잔액·circuit·pricingVersion·minProfit·stale)
  → /trades/:id/execute
       ├─ running/requeue → AI 매칭·처리 진행실 (§48.3)  ← 대기 Fact optional
       ├─ success         → 수익 영수증 (§48.4)  ← settlement.completed 후에만
       └─ safe_stop       → 안전하게 멈춤 (§48.5) ← 잔액 불변
```

**금지:** 진행 중 입찰/구매/판매 CTA · 호가창 · “경매 참여하기” · 외부 마켓 이동  
**허용 유저 행동:** `그만두기`(진행 중) · 성공/중단 후 확인·다른 기회·비슷한 기회·홈

### 48.2 결과 enum (엔진·API·UI 단일)

```typescript
type ExecutionResultCode =
  | 'MATCH_SUCCESS'       // → ledger settlement → success UI
  | 'REQUEUE'             // → 진행실 유지 · "재매칭" 단계 루프
  | 'PRICE_MOVED'         // → safe_stop
  | 'BELOW_MIN_PROFIT'    // → safe_stop (Admin minProfitUsdt)
  | 'CANCELLED_BY_USER'   // → 잔액 불변 · toast EXEC_CANCELLED
  | 'CIRCUIT_OPEN'        // → CIRCUIT_OPEN toast
  | 'SYSTEM_FAILED';       // → 안전중단 변형 + 고객센터
```

**절대금지:** `Math.random()` / `successRatePercent` 로 `MATCH_SUCCESS` 결정 · 연출 타이머 만료 = 자동 입금 · Soft/Hard를 성공 보장으로 카피

#### Soft / Hard · 유저 카피 3줄 (v7.22.29 · Index §20.2 Owns)

| # | 키 | 문장 (고정) | 언제 |
|---|-----|-------------|------|
| ① | `T.execution.slaSoftHint` | **보통 1분 안에 결과가 나와요** | 진행실 footnote (보장 톤 금지) |
| ② | `T.execution.requeueHint` | **조건을 다시 맞추는 중이에요 · 손댈 것 없음** | `status=requeue` |
| ③ | `T.execution.matchTimeout` | **시간이 지나 안전하게 멈췄어요 · 잔액은 그대로예요** | `MATCH_TIMEOUT` safe_stop |

Soft=목표 60s · Hard=wall 90s · **전 등급 동일** · presentation 8~15s≠SLA · 입금 체인 합산 0 · 영문 timeout/SLA **유저 0**.

### 48.3b 매칭 긴장감 UX (v7.22.30 · Owns 본 절 · 원칙=Index §20.2)

> **중복0:** Soft/Hard/REQUEUE/카피3줄 = §20.2·위 표 · Rule 성공 = Engine §48.13 · 멤버십 enum/캡 = Engine §0.0.7 · 본 절 = **진행실 긴장 연출·카피 박자만**.  
> **불변:** 연출·박자·표시 수렴이 `MATCH_SUCCESS`/ledger/credit를 **바꾸지 않음**. CountUp = `settlement.completed` only.

#### 등급 × 대기

| 항목 | 잠금 |
|------|------|
| Soft60 / Hard90 | **전 등급 동일** |
| presentation `durationSecMin~Max` | 기본 **8~15** · high/VIP만 하한 **6** 허용(연출 only) |
| 금지 | 등급별 Hard 단축 · “빠른 매칭권” · 대기로 성공 구매 암시 |

#### 긴장감 소스 (허용 · Fact only)

| # | 요소 | 잠금 |
|---|------|------|
| 1 | 스텝·로그 박자 | 서버 `trade.execution.step` 메시지 전환마다 호흡 · 예: 시세 불러오는 중→스프레드 확인→조건 맞추는 중→(REQUEUE) 다시 맞추는 중 |
| 2 | 적합도 표시 수렴 | `aiConfidenceScore` **서버값** · UI는 좁은 밴드→확정 %로 **표시만** 수렴 · 당첨/보장 게이지 **금지** |
| 3 | 시세·스프레드 숨쉬기 | pricing 캐시·SSE Fact 범위 안 미소 갱신 · **난수 틱 금지** · 소스 없으면 슬롯 숨김 |
| 4 | Soft 중반 피크 | T0+**45~55s** 1회: `T.execution.slaAlmost` = **거의 다 됐어요 · 마지막 조건 확인 중** |
| 5 | Hard 임박 | T0+**80s~** : 불안 과장 금지 · 안전 정지 예고 톤 → timeout 카피(③)로 연결 |
| 6 | 성공 직전 정적 | `MATCH_SUCCESS` 수신 후 영수증 전 **0.5~1.0s** 고요 → CountUp(ledger) · 카지노 confetti 금지 |
| 7 | 아깝게 실패 | safe_stop 사유 분기: `T.execution.priceNearMiss` = **시세가 살짝 어긋났어요** · Primary **비슷한 기회 / 다시 수익 벌기** · (피드 `nearMiss` 입금제안과 **키 분리**) |

#### 금지 (결함)

- 가짜 `matchWaitersCount` · G4 demo 수치 merge  
- `Math.random`/타이머로 성공·실패·대기 연장  
- Soft/Hard를 “1분 보장·무조건 성공”으로 카피  
- 연출 끝 = 지급 암시  
- IT: timeout/SLA/hard/queue 유저 노출  

**Canon:** `execution-running` blocks에 `tensionBeats`·`slaAlmost`·적합도 슬롯(옵션)  
**CI:** `verify:match-tension-surface` · `verify:execution-surfaces` · `verify:no-success-rate-percent`

### 48.3 화면 A — AI 진행실 (`running`) — Canon wire 100%

**Route:** `/trades/[id]/execute` · `status=running|requeue`  
**테마:** ADR-017 Peotteok Light · accent purple · profit green

| 영역 | 잠금 (ko) |
|------|-----------|
| 상품 행 | **§48.3a** `assetImageUrl` 썸네일 + `assetLabel` + ref · 배지 **`직접 입찰·판매 안 함`** · footnote `시세 참고용` |
| 헤드 | **`AI가 자동으로 진행 중`** · 보조 **`· 손댈 것 없음`** |
| Soft 힌트 | **`보통 1분 안에 결과가 나와요`** (`slaSoftHint`) |
| REQUEUE 힌트 | **`조건을 다시 맞추는 중이에요 · 손댈 것 없음`** (`requeueHint`) |
| Soft 중반 | T0+45~55s · **`거의 다 됐어요 · 마지막 조건 확인 중`** (`slaAlmost` · §48.3b) |
| 적합도 | 서버 `aiConfidenceScore` 표시 수렴 (§48.3b · 당첨 게이지 금지) |
| 스텝 1 | done ✓ `상품 확인 완료` · active ● `상품 확인 중...` |
| 스텝 2 | done ✓ `두 시장 시세 대조 완료` · **active ● `시세 불러오는 중...`** (시장명 하드코딩 금지 · LabelKo 동적 · v7.22.31) |
| 스텝 3 | done ✓ `매칭 완료` · active ● `매칭 시도 중...` (active border/fill · 무한 glow 0) |
| 스텝 4 | done ✓ `정산 준비` · active ● `정산 준비 중...` |
| 스텝 5 | done ✓ `내 잔액으로 송금` · active ● `내 잔액으로 송금 중...` |
| 진행바 | 0~100% · Admin `presentation.durationSecMin~Max` 구간에 매핑 (연출 only) |
| 로그 | `HH:mm:ss` + 서버 step message 예: `시세 불러오는 중...` · `수수료 차감 계산 중` |
| Secondary | **`그만두기`** → cancel orchestrate · 잔액 불변 |

**컴포넌트:** `packages/ui/components/execution/AiProgressRoom.tsx`  
**실시간 (v7.22.50 U14):** Phase0=`useTradeExecution` → `POST /trades/:id/execute-tick` **polling** · Phase1+ SSE `trade.execution.step`(realtime-service) 시 훅 내부만 교체 · B-tier 배치 ms=§29.6

### 48.3a 카테고리 상품 썸네일 (표시 Owns · 삭제 금지)

> **중복0:** URL·hydrate·공개 가드 = **Engine §0.0.6** · 본 절 = 화면 슬롯·fallback·카피만.  
> **v7.22.50 U15 backend-gap pointer (UI 수정0):** 실 eBay CDN 사진은 adapter가 fetch하나 `assetId: query:*` → `normalizeIngestListingsForPersist` drop으로 **DB 미도달** · 현재 카드 이미지는 시드/`admin_r2` 경로 · **Owns=Engine `engine-ebay-identity-match-ingest`**(§0.10 · Index 예외2 · matcher→ingest 배선) · UI PART3d는 `imageSource` 무관 `ProductImage`만 · File-Serial 재정렬 0

| 규칙 | 잠금 |
|------|------|
| 데이터 | `OpportunityCard.assetImageUrl` · `assetImageAltKo` · `category` · **SKU 1:1** (Engine §0.0.6) · `imageSource`=`ebay`\|`pokemontcg`\|`ygoprodeck`\|`admin_r2` **동일 슬롯** |
| 노출면 | 홈 카드 · 상세 · 확인 · **진행실** · **성공** · 안전중단 추천카드 — **동일 실물 이미지** |
| 카테고리 | `watch`→**해당 레퍼런스** 시계 사진 · `trading_card`→**해당** 포켓몬/유희왕 카드 사진 · `luxury_bag`→**해당** 가방 사진 |
| 필터 칩 | `전체` `시계` `카드` `가방` (Engine §0.0.5 pointer) |
| 로드 실패 | Lux 플레이스홀더 + `assetIcon`(⌚/🃏/👜) · 깨진 URL 빈칸 **금지** |
| 금지 | 사진 목업 픽셀 복제 · 교차 카테고리 이미지 · “판매 완료/내가 팜” 암시 · 성별 분기 · UI에서 eBay identity-match/ingest **수정 시도** |
| 캡션 | **`공식 협력 · 시세·데이터 연동`** (`T.trust.partners.legCaption`) · §38.10 |

**Canon:** `execution-running` · `execution-success` blocks에 `productThumb` 필수  
**검증:** `verify:asset-image-surface` · `verify:execution-surfaces`

### 48.4 화면 B — 성공 영수증 (`success`) — Canon wire 100%

**진입 조건:** `settlement.completed` + `ExecutionResultCode=MATCH_SUCCESS` only  
**CountUp:** ledger 확정액만 (§0.1 · §33)

| 영역 | 잠금 (ko) |
|------|-----------|
| 상단 칩 | `AI 분석 완료` |
| 헤드 | **`수익이 들어왔어요`** |
| 상품 | **§48.3a** `assetImageUrl` 썸네일 + assetLabel · 시스템 상태 예: `두 시장 시세 반영 완료` (목업 `이베이 판매 완료` 교정 · 야후/Yahoo 문자열 0 · v7.22.32) · `시세 참고용` |
| 금액 | `+{settledUsdt} USDT` · 배지 **`확정 지급`** · `≈ ₩…` |
| 로그 | `{buyMarketLabelKo} → {sellMarketLabelKo} 차이 반영` · `수수료 차감 완료` |
| 잔액바 | **`내 잔액에 반영됐어요`** · `지금 바로 확인해보세요` |
| Primary 행 (§49) | **`수익만 출금`** → `/wallet/withdraw?mode=profit` · **`원금에 합치기`** (merge) · **`나중에`** |
| Secondary | **`확인 · 지갑 보기`** → `/wallet` · **`다른 상품 보기`** → `/profits` |
| 하단탭 | 5탭 SSOT · **지갑** active |

**모션:** tier S/A light spark · B flash · reduced-motion OFF · 카지노 confetti 금지 · **성공 직전 0.5~1s 정적(§48.3b) 후** CountUp  
**컴포넌트:** `ExecutionSuccessReceipt.tsx` (ReceiptCard 계열) · 성공 직후 §49 습관 CTA 필수

### 48.5 화면 C — 안전 중단 (`safe_stop`) — Canon wire 100%

**진입:** `PRICE_MOVED` | `BELOW_MIN_PROFIT` | `MATCH_TIMEOUT` | (선택) `SYSTEM_FAILED`  
**장부:** 잔액 변동 **0** · 예상액 지급 **0**

| 영역 | 잠금 (ko) |
|------|-----------|
| 칩 | **`매칭 중단`** |
| 헤드 | **`이번엔 안전하게 멈췄어요`** (`MATCH_TIMEOUT`은 카피③ 우선) |
| 본문 | **`가격이 움직여서 매칭하지 않았어요. 손해 나지 않게 AI가 중단했습니다.`** · 분기:`priceNearMiss` **시세가 살짝 어긋났어요** (§48.3b) |
| 강조박스 | **`잔액은 그대로예요`** (민트 글로우) |
| 사유 칩 | `시세 변동 · 수익 미달 방지 · 시간 초과` (코드별 분기 · IT코드 유저0) |
| 예상 미지급 | `예상이었던 +{expected} USDT` · **`(지급 안 됨)`** |
| Primary | **`비슷한 기회 보기`** → `/profits?similar={assetId}` · 또는 **`수익 벌기`** 재진입 |
| Secondary | **`홈으로`** → `/` |
| 하단 추천 | `AI 추천 기회` 카드 1장 · `+N USDT 예상` · 배지 `매칭 안정` · **`AI 매칭 적합도 {aiConfidenceScore}%`** |

**컴포넌트:** `ExecutionSafeStop.tsx`

### 48.6 화면 D — Admin 진행 정책 — Canon wire 100%

> **Owns 분리(중복0 · 오독 방지):** 본 §48.6~§48.9는 **스펙 SSOT**(Canon wire·스키마·API 계약·카피)만 담는다 — **실제 코드 구현 위치는 `apps/admin`이며 Admin 플랜의 `admin-execution-policy` todo(File-Serial)가 담당**한다. `admin-match-strictness-ui`(UI 구 todo)는 **ABSORBED**되어 재실행 대상이 아니다(YAML 상단 참조). UI가 `apps/admin` 코드를 직접 작성하는 것은 **금지**.

**Route:** `/admin/execution-policy` · Ops Light  
**헤더:** breadcrumb `홈 / admin / 진행 정책` · **`저장`**  
**경고 배너 (고정):** `장부(실돈)와 연출은 분리됨`  
**운영자 성공 조절 Owns:** 본 절 UI · 맵·Rule = Engine **§48.13.3**

#### 상단 — 매칭 성공 조절 (필수 · v7.22.23)

| 컨트롤 | 잠금 (ko) |
|--------|-----------|
| 제목 | **매칭 성공 조절** |
| 도움말 | 성공이 잘 나오게/적게 나오게 **엄격도**로 조절해요. **주사위·난수 당첨률이 아니에요.** |
| 세그먼트 | `여유` · `표준` · `타이트` · `희소` · `직접 설정` → `lenient\|standard\|tight\|scarce\|custom` |
| 적용 | 선택 즉시 좌측 실조건 필드에 Engine 맵 값 **채움** (저장 전 미리보기) |
| 격자(선택) | 멤버십×자본대 오버레이 ON/OFF · 셀 클릭 시 프리셋 |
| 관측 | **오늘 실제 성공 %** (KPI 읽기전용) · “목표 %로 자동 맞춤” 버튼 **Day-1 금지** |

#### 좌 컬럼 — 실조건 (정산·성공/실패에 영향)

| 필드 | 기본(standard) | 범위 | 효과 |
|------|----------------|------|------|
| `matchStrictness` | **standard** | enum+custom | §48.13.3 프리셋 |
| `minProfitUsdt` | **5** | 0~50 | 미달 → `BELOW_MIN_PROFIT` |
| `staleAllowanceSec` | **3** | 0~30 | stale → `PRICE_MOVED` |
| `maxRematchCount` | **2** | 0~10 | `REQUEUE` 상한 |
| `retryWaitSec` | **4** | 1~20 | 재매칭 대기 |
| `slippageBoundBps` | **50** | 5~200 | 슬리피지 초과 → 실패 계열 |
| `dailyUserMatchCap` | **5** | 1~50 | 유저·일 참여 상한 |
| `dailyOppSlotsDefault` | **12** | 1~100 | 상품 일일 슬롯 기본 |
| `autoCancelOnShortfall` | **ON** | bool | 미달 시 자동 취소 |
| `circuitStatus` | read-only chip | — | §9.5 TOP5 |

**미리보기 박스:** `이 엄격도면 성공이 잘/덜 나는 편 · 오늘 관측 성공 {n}%` (관측=실적 · 입력 아님)

#### 우 컬럼 — 화면 연출만 (잔액 지급 금지)

| 필드 | 기본 | 규칙 |
|------|------|------|
| `durationSecMin` / `durationSecMax` | **8** / **15** (VIP 연출 하한6 허용) | 진행바 연출 only · Soft/Hard **불변** · §48.3b |
| step 문구 preview | 상품확인→시세→매칭… | `T.execution.steps` |
| 경고 | `연출이 잔액 지급·성공/실패를 바꾸지 않음` | 고정 |

#### 금지 카드 (항상 disabled 노출)

- 타이틀: **`금지: 난수 성공률`**
- 게이지 0% disabled · 라벨 `successRatePercent` **없음**
- 푸터: `성공 조절은 엄격도(실조건)로만 · 잔액 지급용 난수 성공률 금지`
- 스키마에 `successRatePercent` **존재 금지** (CI fail)

#### 하단 KPI — 오늘 결과 (관측 성공률)

| KPI | 집계 소스 |
|-----|-----------|
| **성공 N건 (%)** | `MATCH_SUCCESS` ← 운영자가 보는 “성공률” |
| 시세 변동 N건 (%) | `PRICE_MOVED` |
| 수익 미달 N건 (%) | `BELOW_MIN_PROFIT` |
| 재매칭 N건 (평균 회/건) | `REQUEUE` |

**audit footer:** 마지막 변경 · `matchStrictness` · before/after 실조건 · `admin.execution_policy.updated`

### 48.7 스키마 잠금

```typescript
// schemas/execution-policy.v1.json
interface ExecutionPolicy {
  matchStrictness: 'lenient'|'standard'|'tight'|'scarce'|'custom';
  minProfitUsdt: string;
  staleAllowanceSec: number;
  maxRematchCount: number;
  retryWaitSec: number;
  slippageBoundBps: number;
  dailyUserMatchCap: number;
  dailyOppSlotsDefault: number;
  autoCancelOnShortfall: boolean;
  membershipBandOverlayEnabled?: boolean;
  // overlay keys optional — Engine §48.13.3
  presentation: {
    durationSecMin: number;
    durationSecMax: number;
    steps: Array<'product_check'|'price_compare'|'matching'|'settle_prep'|'credit'>;
  };
  // ❌ successRatePercent — FORBIDDEN key
  updatedAt: string;
  updatedByAdminId: string;
}

// schemas/trade-execution-state.v1.json
interface TradeExecutionState {
  tradeId: string;
  opportunityId: string;
  pricingVersion: number;
  status: 'running'|'requeue'|'success'|'safe_stop'|'cancelled'|'failed';
  resultCode?: ExecutionResultCode;
  stepIndex: 0|1|2|3|4;
  progressPct: number;            // presentation only until terminal
  logLine?: string;
  expectedProfitUsdt: string;
  settledProfitUsdt?: string;     // only success
  asset: { id: string; label: string; iconUrl?: string; ref?: string };
}
```

### 48.8 API · 이벤트

| Method | Path | 역할 |
|--------|------|------|
| GET | `/admin/api/v1/execution-policy` | 정책 조회 |
| PUT | `/admin/api/v1/execution-policy` | 저장 + audit |
| GET | `/admin/api/v1/execution-policy/stats/today` | KPI 4종 |
| POST | `/api/v1/opportunities/:id/participate` | 기존 + policy 가드 |
| GET/SSE | `/api/v1/trades/:id/execution` | TradeExecutionState 스트림 |
| POST | `/api/v1/trades/:id/cancel` | 그만두기 |

**Events:** `trade.execution.step` · `trade.execution.terminal` · `admin.execution_policy.updated`  
**RBAC:** execution-policy 쓰기 = `ops`+`finance` 이상 (§40)

### 48.9 카피 SSOT (`T.execution`)

```typescript
// packages/ui/copy/ko/execution.ts + opportunity.ts — 하드코딩 JSX 금지
export const T = {
  execution: {
    ctaEarn: '수익 벌기',
    ctaDetail: '이 기회로 수익 벌기',
    ctaDepositEarn: '입금하고 수익 벌기',
    ctaStickyShort: '수익 벌기',
    disclaimerResult: '예상 결과는 시장 상황에 따라 달라질 수 있습니다.',
    badgeNoBuy: '직접 사지 않아요',
    badgeNoSell: '직접 팔지 않아요',
    badgeNoBid: '직접 입찰·판매 안 함',
    progressTitle: 'AI가 기회를 찾는 중',
    progressHandsFree: '손댈 것 없음',
    progressWaiters: '현재 대기자 {n}명',      // Fact only · 없으면 숨김
    progressMatchable: '매칭 가능 기회 {n}개', // Fact only · 없으면 숨김
    imageRightsNote: '시세 참고용 · 기회 근거',
    steps: [
      { key: 'confirm', active: '투입 금액 확인 중...', done: '투입 금액 확인' },
      { key: 'quote', active: '시세·조건 확인 중...', done: '시세·조건 확인' },
      { key: 'match', active: 'AI 매칭 중...', done: '매칭 완료' },
      { key: 'settle', active: '처리·정산 중...', done: '정산 준비' },
      { key: 'credit', active: '지갑으로 지급 중...', done: '지갑 지급' },
    ],
    cancel: '그만두기',
    successTitle: '수익이 들어왔어요',
    successBadge: '확정 지급',
    successAiDone: 'AI 처리 완료',
    successBalance: '내 잔액에 반영됐어요',
    successBalanceSub: '지금 바로 확인해보세요',
    successPrimary: '확인 · 지갑 보기',
    successSecondary: '다른 기회 보기',
    safeTitle: '이번엔 안전하게 멈췄어요',
    safeBody: '조건이 맞지 않아 매칭하지 않았어요. 손해 나지 않게 AI가 중단했습니다.',
    safeBalance: '잔액은 그대로예요',
    safeChip: '시세 변동 · 수익 미달 방지',
    safeExpectedNotPaid: '지급 안 됨',
    safePrimary: '비슷한 기회 보기',
    safeSecondary: '홈으로',
    safeRecommend: 'AI 추천 기회',
    adminTitle: 'AI 진행 정책',
    adminLedgerSplit: '장부(실돈)와 연출은 분리됨',
    adminRealCol: '실조건',
    adminPresentCol: '화면 연출만',
    adminForbidRng: '금지: 난수 성공률',
    adminForbidRngHelp: '잔액 지급과 무관한 난수 성공률 사용 금지',
    adminPresentWarn: '연출이 ledger 입금 성공률을 바꾸지 않음',
  },
  // arbitrageTypeKo = Engine §4.2a 투영 · UI 하드코딩 맵 금지
  opportunity: {
    badgeMatchable: 'AI 매칭 가능',
    historicalMatchHint: '과거 유사 매칭',
    historicalWindow: '최근 {n}일 기준',
    historicalAsOf: '업데이트 {relative}',
    labelRequiredCapital: '필요 자본',
    labelExpectedProfit: '예상 수익',
    labelExpectedTurn: '예상 처리기간',
    labelAiConfidence: 'AI 매칭 적합도',
    corridor: '{buy} → {sell} {type} 기회',
  },
} as const;
```

### 48.10 컴포넌트 · 파일 트리

> **실측(v7.22.52 §0.8.2 #2 유사·§0.8.3 PART4a):** `packages/ui/components/execution/`에 **`ProductThumb.tsx`만 실존** — 아래 4개(`AiProgressRoom`·`ExecutionSuccessReceipt`·`ExecutionSafeStop`·`ExecutionStepList`)는 **미생성**. `apps/web/app/trades/[id]/execute/page.tsx`는 현재 `useTradeExecution` 훅(polling·live)만 배선된 2-state(진행중/성공) 임시 텍스트이며, 코드 주석이 "Full AiProgressRoom / safe_stop UX = ai-execution-ux todo"로 자기문서화되어 있음(정직한 스텁 · 결함 아님). PART4a 착수 시 **아래 4개 컴포넌트 신규 구현이 필수**다.

```
packages/ui/components/execution/
├── AiProgressRoom.tsx
├── ExecutionSuccessReceipt.tsx
├── ExecutionSafeStop.tsx
├── ExecutionStepList.tsx          # steps[].active|done
├── ProductThumb.tsx               # §48.3a assetImageUrl + fallback icon (실존)
└── index.ts
packages/ui/components/opportunity/
├── OpportunityCard.tsx            # §5.3b 3단·arbitrageTypeKo · §48.3a 썸네일
├── CategoryFilterChips.tsx        # 전체|시계|카드|가방 (보조 · 탐색트리 아님)
└── OpportunityScanBadge.tsx       # arbitrageTypeKo · time_sensitive
packages/ui/copy/ko/execution.ts
packages/ui/copy/ko/opportunity.ts
packages/ui/copy/ko/feed.ts        # §5.3a/b homeTitle·scanSub
packages/sdk/execution-stream/useTradeExecution.ts
apps/web/app/trades/[id]/execute/page.tsx
apps/admin/app/admin/execution-policy/page.tsx
schemas/execution-policy.v1.json
schemas/trade-execution-state.v1.json
schemas/opportunity-card.v1.json   # assetImageUrl · Engine §0.0.6
schemas/asset-master.v1.json
CONSTITUTION/48_AI_EXECUTION_ROOM_AND_POLICY.md
CONSTITUTION/46b_ASSET_IMAGE_SSOT.md
```

### 48.11 CI · 출시 게이트 (§19 pointer)

- `verify:execution-surfaces` — 4 surface 체크리스트 + `productThumb` + steps active/done PASS  
- `verify:asset-image-surface` — available 카드·진행·성공에 `assetImageUrl` 슬롯 · `시세 불러오는 중...` 카피 키 · 교차카테고리 0  
- `verify:no-success-rate-percent` — schema/API/UI에 `successRatePercent`·난수 성공률 컨트롤 **0**  
- `verify:match-strictness` — Admin 「매칭 성공 조절」프리셋·맵 필드 · 관측 KPI write 0 · Engine §48.13.3  
- `verify:presentation-cannot-credit` — duration만 변경한 테스트에서 settlement 결과 불변  
- E2E: 벌기 → 진행실(카테고리 썸네일+시세 스텝) → (성공|안전중단) · 성공 시 잔액+ · 중단 시 잔액0변화  
- 금지어 스캔: 유저 CTA/본문에 `입찰`/`경매 참여`/`판매하기`/`구매하기`/`마켓 둘러보기`/`이 상품으로 수익 벌기`/`판매 성공률`/유저메인`매칭 참여` **0** · 상세 `이 기회로 수익 벌기` **허용**
- `verify:cta-earn-profit` — Primary=`수익 벌기` · sticky=`수익 벌기` · 상세=`이 기회로 수익 벌기` · 면책+배지
- `verify:user-trader-jargon-0` — 유저 surface trader 용어·executionPlatforms 노출 0
- `verify:opportunity-scan-surface` — 홈/카드 §5.3b 위계·`arbitrageTypeKo`

### 48.12 §36 / §43 / §7 교차 (중복0)

| 주제 | SSOT |
|------|------|
| 가격·pricingVersion | §36 · §43 |
| minProfit / stale | **§48.6 정책값**이 §43 기본을 **오버라이드** (단일 읽기: execution-policy) |
| Primary 버튼 라벨 | §7.3 = §48.9 `ctaEarn` |
| execute 3면 | §7.4 → **본 절** |
| CountUp | settlement.completed only (§33) |
| Admin 긴급정지 | §9.5 TOP5 = circuitStatus 표시 |
| 성공 후 출금 CTA | **§49** 수익만/합치기/나중에 |

> **§48.13 MATCH_SUCCESS Rule Engine** → `ai_profit_os_02_engine_b2c3d4e5.plan.md` (§48.13.1 participate · §48.13.2 golden)

## 50. 설정 · 약관 대본 · 운영사 DET · 쉬운 한글 · 토스트 이모지 (v7.21)

> **SSOT:** `CONSTITUTION/50_SETTINGS_LEGAL_AND_PLAIN_KOREAN.md`  
> **카피:** `packages/ui/copy/ko/settings.ts` · `legal.ts` · `operator.ts` · `toast.ts` · `admin.ts`  
> **운영사 schema:** `schemas/operator-entity.v1.json`  
> **검증:** `verify:no-it-jargon` · `verify:toast-emoji` · `verify:legal-plain-ko` · `verify:operator-footer` · `verify:korean-ui`  
> **중복0:** 레이아웃=§22 · 문자열=§27+본 절 · 약관 본문=본 절만 · 운영사=§50.9 schema 단일

### 50.1 설정 `/me/settings` (잠금)

| 구역 | v1 | 비고 |
|------|----|------|
| 글자 크기 **보통/크게/더 크게** | ✅ | `fontScale: md\|lg\|xl` · fluid 토큰 · **3단 필수** (§38.9) |
| 화면 다크/밝은/시스템 | ❌ | **ADR-017 Light+Purple 단일 출시 테마** · 토글 UI 없음 · 가독성은 contrast/줄간격/글자크기 |
| 읽기 톤 (toneBand) | ✅ | 짧게/비교로/한 줄씩 · §38.9 · 설정에서 변경 가능 |
| 충전 화면 기본 탭 | ✅ | `depositPref: usdt\|krw` **표시 기본만** · 엔진·추천 USDT 정책 불변 |
| 알림 세분화 | ✅ | 기회·충전출금·공지 |
| 기본 출금=수익만 | ✅ | §49 · 토글로 원금기본 바꾸기 **비권장**(숨김 가능) |
| 약관 4종 링크 | ✅ | §50.3 |
| 언어 영어 전환 | ❌ | ko only |
| 성별·테마 퍼스널 | ❌ | **남/여 UI 분기 금지** |

**토큰 잠금:**
| fontScale | 배율(기준 md=1) | 줄간격 |
|-----------|-----------------|--------|
| `md` 보통 | 1.00 | 기본 |
| `lg` 크게 | ≥1.15 | +0.05 |
| `xl` 더 크게 | ≥1.30 | +0.10 |

**결함:** 설정에 `Theme`/`System`/`Dark Mode` 영문 노출 · Lux Dark runtime 재활성 · 글자 2단만 제공 · 성별 토글

### 50.1b 본인 진행 확인 카피 (공유 기기 · 중복0)

> **owns:** 카피만 본 절 · 출금/원금 시트 배치=Money §49.4 pointer

출금 폼·PrincipalConfirmSheet·고액 참여 확인 직전 **고정 1줄** (`T.security.selfOnly`):  
`본인만 진행해 주세요. 다른 분 폰·계정에서는 출금하지 마세요.`  
선택 Secondary: [로그아웃] → `/auth/logout`  
**금지:** 새 하단 탭 · 성별/가족 관계 수집 UI

### 50.2 유저 알림·토스트 (한글 친화 + 이모지)

> **중복0:** 본 절 = toast/push **수치·톤 규칙** · 문장 카탈로그=§8.2 · **팔레트·전 표면 캡·퍼뜩/도움말**=§27.10 (여기 재정의 금지)

**규칙 (오류0):**
1. 유저 toast/push/in-app **본문은 쉬운 한글만**  
2. **이모지 1~2개** 필수 (과다 금지 · 카지노 슬롯 이모지 금지 · 허용 집합=§27.10.3)  
3. 문장 끝 부드러운 존댓말 (`해요`/`예요`)  
4. **절대 금지:** problem.code, HTTP, null, Failed, Pending, API…  
5. 어드민 toast: 이모지 ≤1 · **웃긴 톤 금지** · 평문 한글 (“입금 3건 검수 대기”)

**문장 SSOT:** `schemas/toast-codes.v1.json` + §8.2 코드표 = **유일한 본문**. 아래는 tone 예시일 뿐 · §8.2와 불일치 시 **§8.2 승** (중복0).

**카탈로그 보강 예 (전부 `T.toast.*` · §8.2 mirror):**

| 상황 | 유저 토스트 |
|------|-------------|
| 충전 감지 | 🎉 충전이 확인됐어요! 곧 잔액에 반영돼요 |
| 수익 지급 | ✨ 수익이 들어왔어요! 내 지갑을 확인해 보세요 |
| 안전 중단 | 🛡️ 이번엔 안전하게 멈췄어요. 잔액은 그대로예요 |
| 수익 출금 신청 | 💸 수익 출금을 신청했어요 |
| 원금 출금 확인 | 💡 원금을 빼면 다음 기회 참여가 줄어들 수 있어요 |
| 잔액 부족 | 😅 충전 금액이 부족해요. 충전 후 다시 시도해 주세요 |
| 네트워크 | 📡 연결이 불안정해요. 잠시 후 다시 시도해 주세요 |
| 긴급 정지 | ⏸️ 잠시 거래를 멈췄어요. 곧 다시 열릴게요 |
| 본인 확인 | 🔐 출금하려면 본인 확인이 필요해요! 1번만 하면 돼요 😊 |
| 글자 크기 변경 | 🔤 글자 크기를 바꿨어요 |

### 50.3 약관·개인정보·오픈소스·라이선스 — **쉬운말 대본 SSOT**

> 법률 확정본은 변호사 검수 필수. 아래는 **제품 톤·구조 SSOT**(유저가 읽는 화면 문구).  
> 어려운 법률 한자어는 괄호 쉬운말로 병기. **영문 IT 용어 본문 금지**(USDT·AI 예외만).

#### A) 이용약관 — 화면 제목: `이용약관`  
경로: `/me/legal/terms` · `T.legal.terms.*`

**한 줄 소개**  
이 앱은 전 세계 가격 차이를 찾아 드리며, 버튼을 누르면 AI가 진행을 도와주는 **부수입·시세 기회 앱**입니다.

**쉬운 조항 대본 (요약 카드 + 전문 스크롤):**

1. **이 앱이 하는 일**  
   해외 **두 시장** 시세를 비교해 **예상 수익 기회**를 보여 줍니다. 직접 경매장에 들어가 입찰하실 필요가 없습니다. AI가 진행을 돕고, 조건이 안 맞으면 안전하게 멈출 수 있습니다.

2. **회원과 계정**  
   정확한 정보로 가입해 주세요. 계정 빌려주기·여러 계정으로 이벤트만 받아 가기 등은 제한될 수 있습니다.

3. **충전(입금)과 잔액**  
   테더(USDT) 또는 원화로 충전할 수 있습니다. 충전된 돈은 **근무 중 원금**과 **출금 가능 수익** 등으로 나뉘어 보입니다. 연습으로 받은 숫자는 출금할 수 없습니다.

4. **수익 기회 참여**  
   [수익 벌기]를 누르면 참여가 시작됩니다. 예상 수익은 말 그대로 **예상**이며, 시세가 움직이면 진행이 취소되고 잔액은 그대로일 수 있습니다.

5. **출금**  
   기본은 **수익만 출금**입니다. 원금도 언제든 출금할 수 있으나, 원금을 빼면 다음 기회 참여가 어려워질 수 있습니다. 출금 전에는 **본인 확인을 한 번** 해 주세요. 테더 출금 시 **이체 수수료**가 빠질 수 있으며 화면에 표시합니다.

5-1. **진행 방식 (orchestrate 진실)**  
   **직접 사지 않아요.** AI가 두 시장 시세 조건이 맞을 때만 수익을 정산해요. 외부 경매장에 들어가 입찰·구매하지 않습니다. (`T.execution.orchestrateTruth` · Engine §48.13와 동일 문장)

6. **수수료·플랫폼 몫**  
   두 곳 가격 차이 중 일부는 운영 비용·플랫폼 몫으로 빠질 수 있습니다. 상품 상세에서 확인할 수 있게 합니다.

7. **금지 행위**  
   해킹, 시세 조작 시도, 타인 명의 도용, 불법 자금, 시스템을 속이는 행위는 이용 제한·수사 협조 대상이 될 수 있습니다.

8. **서비스 중단**  
   점검·긴급 상황에서는 거래를 잠시 멈출 수 있습니다. 멈춘 동안 안내를 드립니다.

9. **책임 범위**  
   시세 변동·통신 장애·외부 시장 사정으로 예상과 다른 결과가 날 수 있습니다. 법령이 허용하는 범위에서 책임을 정합니다.

10. **문의**  
    내정보 → 고객센터로 연락해 주세요.

11. **운영 주체 (사업자 정보)** — `T.legal.operator.*` · §50.9  
    본 서비스는 **PRE-OWNED WATCHES L.L.C**(두바이, UAE)가 운영합니다.  
    두바이 경제관광부(DET) 상업 면허 **1135431** · 허가 업종: 시계·명품 중고 매매, 트레이딩 카드·수집품 거래, 해외 시세 비교·국제 중개, 온라인 전자상거래·앱 운영, AI 시세 기회 안내·거래 지원.

**하단 고정 면책 (모든 약관·입금·온보딩 공통 톤)**  
수익과 세금은 사람마다 달라요. 필요하면 세무 전문가와 상담하세요.

#### B) 개인정보 처리방침 — `개인정보 처리방침`  
`/me/legal/privacy` · `T.legal.privacy.*`

**한 줄**  
회원가입·충전·출금·본인 확인에 필요한 정보만 최소한으로 모으고, 안내한 목적 외로 쓰지 않습니다.

**쉬운 대본 블록:**
- **모으는 정보:** 연락처, 로그인 정보, 기기 알림 토큰, 입출금에 필요한 주소·계좌, 본인 확인 자료, 서비스 이용 기록  
- **쓰는 이유:** 회원 확인, 충전·출금 처리, 부정 이용 방지, 고객 지원, 법령 의무  
- **보관:** 목적 달성 또는 법령 기간까지 · 이후 안전하게 삭제·분리  
- **맡기는 경우:** 문자·이메일·클라우드·본인 확인 대행 등 **필요한 업체만** · 계약으로 보호  
- **해외 이전:** 있는 경우 화면에 알기 쉽게 고지  
- **내 권리:** 열람·정정·삭제·처리 정지 요청 가능 (법령 예외 있음)  
- **문의:** 개인정보 보호 담당 · 고객센터  
- **운영 주체:** PRE-OWNED WATCHES L.L.C · DET 면허 1135431 · 허가 업종 §50.9.A-1

**금지 문구:** 개인정보를 “마케팅에 무제한 활용” 같은 포괄 동의 숨김.

#### C) 오픈소스 고지 — `오픈소스 고지`  
`/me/legal/oss` · `T.legal.oss.*`

**한 줄**  
이 앱은 여러 오픈소스 프로그램을 안전하게 사용해 만들어졌습니다.

**쉬운 대본:**
- 화면에는 **이름 · 라이선스 종류 · 고마운 마음 한 줄**만 보여 줍니다.  
- 어려운 영문 전문은 **「자세히」**를 눌렀을 때만 (가능하면 한글 요약 먼저).  
- “오픈소스 = 우리 돈을 공개한다”가 아니라, **이미 공개된 도구를 규칙을 지켜 사용한다**는 뜻입니다.  
- 목록은 빌드 시 자동 생성 (`NOTICE` / 고지 목록) · 누락 0.

#### D) 라이선스·저작권 — `라이선스·저작권`  
`/me/legal/license` · `T.legal.license.*`

**한 줄**  
앱 이름, 화면 디자인, 글, AI 안내 문구, 로고는 플랫폼과 정당한 권리자에게 있습니다.

**쉬운 대본:**
- 무단 복제·재판매·서비스 미러링 금지  
- 상품 사진·브랜드명(롤렉스 등)은 각 권리·시장 관행을 존중하며, **시세 참고용**으로만 표시  
- 유저가 올린 문의 내용 등은 지원 목적 범위에서만 사용  
- 문의: 고객센터

### 50.4 화면 금지어 확장 (유저+어드민 · 결함0)

**카테고리별 절대 금지 (렌더 문자열):**

| 종류 | 예시 (일부) |
|------|-------------|
| 테스트 | test, Testnet, QA, staging, sandbox, mock, dummy, fixture |
| 개발 | debug, TODO, WIP, refactor, stack, traceback, console, localhost |
| IT/인프라 | API, JSON, webhook, SSE, gRPC, NATS, Kafka, Redis, Postgres, Docker, K8s, DLQ, CDN, SSR |
| 문서/ titling | RFC, ADR, SSOT, schema, enum, payload, idempotency(영문 그대로) |
| 금융영문 | Ledger, PnL, ROI, Arbitrage, Margin(단독), Settlement(영문) |
| 크립토영문 | TRC20, on-chain, gas, hot wallet, mnemonic |

**허용 화이트리스트:** §27.4 (USDT, AI, ₩, 브랜드·모델명, 숫자/%)  
**어드민도 동일 금지** + 왕초보 한글 대체표 §27.5

### 50.5 어드민 UX 원칙 (왕초보)

1. 메뉴·버튼·표 헤더·토스트·빈 화면 안내 = **쉬운 한글만**  
2. 한 화면 한 일 · 큰 버튼 · 빨간/초록 의미 고정 (정지=위험, 승인=진행)  
3. 설명은 `?` 아이콘으로 한 줄: “이 버튼을 누르면 회원 잔액에 돈이 반영돼요”  
4. 실패 시: “다시 시도” + “고객센터로 남기기” · 영문 로그 화면 금지  
5. TOP5 유지: 검수함·시세·사기방지·돈줄·긴급정지

### 50.6 파일 · 라우트

```
apps/web/app/me/settings/page.tsx
apps/web/app/me/legal/terms/page.tsx
apps/web/app/me/legal/privacy/page.tsx
apps/web/app/me/legal/oss/page.tsx
apps/web/app/me/legal/license/page.tsx
packages/ui/components/SiteFooter.tsx
packages/ui/copy/ko/settings.ts
packages/ui/copy/ko/legal.ts
packages/ui/copy/ko/operator.ts
packages/ui/copy/ko/toast.ts          # 이모지 포함 문장만
schemas/operator-entity.v1.json
CONSTITUTION/50_SETTINGS_LEGAL_AND_PLAIN_KOREAN.md
scripts/verify-no-it-jargon.mjs
scripts/verify-toast-emoji.mjs
scripts/verify-legal-plain-ko.mjs
scripts/verify-operator-footer.mjs
```

### 50.7 어뷰징·결함 방어 (본 절)

| # | 위험 | 방어 |
|---|------|------|
| L1 | 약관에 확정수익·원금보장 | legal CI + Identity §1 |
| L2 | 유저 화면에 API 에러 영문 | glossary + toast resolver |
| L3 | 어드민에 DLQ/NATS 노출 | verify:no-it-jargon |
| L4 | 토스트 이모지 과다/없음 | verify:toast-emoji |
| L5 | 설정에 dual theme/Lux Dark 재활성 | 토글 코드경로 v1 삭제 · ADR-017 단일 테마 |
| L6 | 약관 영문 템플릿 복붙 | legal.ts ko only |
| L7 | OSS 목록 누락 | NOTICE 생성 CI |
| L8 | 운영사 면허번호·법인명 drift | operator-entity.v1 + verify:operator-footer |

### 50.9 운영사 · DET 면허 · 푸터 (KYB SSOT)

> **목적:** AI Profit OS 앱·랜딩·약관·SEO에 **동일한 사업자 정보** 노출.  
> **내부 KYB 참고:** `COMPANY_REGISTRATION_SUMMARY.md` (플랜 §50.9가 SSOT · 문서는 pointer만)  
> **플랫폼 도메인(hiptk.app):** consumer PWA·랜딩·푸터·JSON-LD canonical — **앱 SSOT와 번호·법인명·supportEmail 일치 필수**

#### A) 운영 주체 (잠금 · owner-provided · DET PDF로 최종 확인)

| Field | Value |
|-------|-------|
| **Legal Name** | PRE-OWNED WATCHES L.L.C |
| **Legal Form** | Limited Liability Company (LLC) |
| **License Number** | **1135431** |
| **Issuing Authority** | Department of Economy and Tourism (DET), Dubai, UAE |
| **License Type** | Commercial License |
| **Status** | Active *(owner-stated; verify via DET portal before launch)* |
| **Primary Activity (EN)** | Watches & Clocks & Spare Parts Retailing *(DET 등록 · PDF 확인)* |
| **Primary Activity (KO)** | 시계 및 예비 부품 소매업 *(DET 등록 · PDF 확인)* |
| **Platform-Aligned Activities** | §50.9.A 표 — AI Profit OS 운영 범위와 정렬 *(DET PDF·추가 등록 확인)* |

#### A-1) 허가 업종 — 플랫폼 컨셉 정렬 (DET PDF 최종 확인)

| # | 허가 업종 (KO) | Activity (EN) | Likely DET Code | 플랫폼 매핑 |
|---|----------------|---------------|-----------------|-------------|
| 1 | 시계·시계 부품 소매·무역 | Watches & clocks & spare parts retail/trading | 4773.03 · 4773.13 | §0.0 watch vertical |
| 2 | 중고 명품 시계·시계류 매매 | Pre-owned luxury watches trading | 4774.02 · 4774.94 | hiptk.app · 시계 기회 |
| 3 | 트레이딩 카드·수집품 소매·무역 | Trading cards & collectibles retail/trading | 4778.99 · 4690.01 | §0.0 trading_card vertical |
| 3b | 명품 가방·가죽제품 소매·무역 *(DET 추가 확인)* | Luxury handbags & leather goods retail/trading | 4771.* *(PDF 확인)* | §0.0 `luxury_bag` · §0.0.6 이미지 |
| 4 | 해외 시세 비교·국제 상품 중개 | Cross-border price comparison & trade brokerage | 4690.01 | 글로벌 시세 차익·기회 카드 |
| 5 | 온라인 전자상거래·모바일 앱 운영 | E-commerce & mobile app operation | 4791.01 | **퍼뜩** PWA · 5탭 앱 |
| 6 | AI 시세·수익 기회 안내·거래 지원 | AI-assisted market opportunity & execution support | 6201.01 *(면허 추가 시)* | §48 AI 진행실 · participate flow |

> **오차0:** 위 코드는 **내부 KYB 참고용 추정** — 유저 화면·푸터·약관·JSON-LD에는 `operator-entity.verifiedAt`이 채워진 뒤 **PDF에 실제 등록된 값만** 노출. 추정 코드·미검증 업종 문자열 **렌더 경로 0** (`verify:operator-footer`). 미등록 업종은 PRO를 통해 DET **activity amendment** 후 schema 갱신.

| **Likely Activity Code (registered)** | 4773.03 / 4773.13 *(confirm on official Trade License PDF)* |
| **Trading Brand** | Pre-Owned Watches / Pre-Owned Watches UAE |
| **Related Website** | https://hiptk.app *(consumer platform · ROOT_DOMAIN SSOT)* |
| **Support Email** | support@hiptk.app |

**주소 (웹사이트 공개 · Ejari/면허 PDF와 교차확인):**
- Kia Flagship Office G05, Sheikh Zayed Road, Al Quoz 1, Dubai
- Office 322, Blue Bay Tower, Al Abraj Street, Business Bay, Dubai

**공식 확인 링크:**
- [Invest in Dubai — Business Directory](https://www.investindubai.gov.ae/en/dubai-business-directory-search)
- [DET License Lookup](https://eservices.dubaided.gov.ae/Pages/Anon/CompLookup.aspx)

#### B) Schema SSOT — `schemas/operator-entity.v1.json`

```typescript
interface OperatorEntityV1 {
  legalName: "PRE-OWNED WATCHES L.L.C";
  legalForm: "LLC";
  licenseNumber: "1135431";
  issuingAuthority: "Dubai Department of Economy and Tourism";
  jurisdiction: "AE-DU"; // Dubai Mainland
  licenseStatus: "active" | "pending_verification";
  primaryActivityEn: "Watches & Clocks & Spare Parts Retailing";
  primaryActivityKo: "시계 및 예비 부품 소매업";
  licensedActivities: {
    activityKo: string;
    activityEn: string;
    likelyDetCode?: string;
    platformScope: "watch" | "trading_card" | "luxury_bag" | "platform" | "ecommerce" | "ai_service";
  }[];
  tradingBrand?: string;
  relatedWebsite?: string; // https://hiptk.app — platform consumer domain
  supportEmail: string; // support@hiptk.app · Human Review 필수 · v7.22.54
  addresses: { label: string; lines: string[]; city: string; country: "AE" }[];
  verificationUrls: { label: string; url: string }[];
  verifiedAt?: ISO8601; // set after DET PDF on file
}
```

**소비처 (단일 import):** `SiteFooter` · **`LandingOperatorFooter`**(§6.4c.1) · `T.legal.operator.*` · `generateMetadata` · JSON-LD `@graph` · Admin audit footer *(ops only, not user SEO)*

#### C) 유저 앱 푸터 — `SiteFooter` · **`LandingOperatorFooter`** (§6.4c.1)

**노출 surface (MUST):**
- `apps/web` 5탭 레이아웃 — BottomNav **위** 고정 1줄 (320px ellipsis OK) → **`SiteFooter`**
- `/me/legal/*` 4면 하단 → **`SiteFooter`**
- `(landing)/l/*` · `/ads/*` scroll **최하단** → **`LandingOperatorFooter`** (legalName·license·**supportEmail**·jurisdiction·`/me/legal` 1링크 · §6.4c.1)
- **숨김:** Admin · ops · in-app modal · toast

**랜딩 footer 필수 필드 (Human Review · v7.22.54):** `legalName` · DET `licenseNumber` · **`supportEmail`** · 관할 1줄 · `/me/legal` 링크 1개 · **약관 전문 복붙 0**

**카피 (ko · `T.operator.footer.line`):**
```
두바이 경제관광부(DET) 면허 | 사업자등록번호 1135431 | PRE-OWNED WATCHES L.L.C
```

**선택 링크:** DET → Invest in Dubai (새 탭 · `rel=noopener`)

**스타일:** `text-xs` · muted · Peotteok Light semantic token · 5탭·sticky CTA 가리지 않음 (§5.3)

**플랫폼 푸터 (hiptk.app · ko/en · pointer):**
```
Licensed by the Dubai Department of Economy and Tourism (DET) | Trade License No. 1135431 | PRE-OWNED WATCHES L.L.C | support@hiptk.app
```
→ 구현 SSOT는 `operator-entity.instance.json` · **번호·법인명·이메일·도메인 100% 일치**

#### D) 카피 키 — `packages/ui/copy/ko/operator.ts`

```typescript
export const T = {
  operator: {
    footer: {
      line: "두바이 경제관광부(DET) 면허 | 사업자등록번호 1135431 | PRE-OWNED WATCHES L.L.C",
      detLinkLabel: "두바이 경제관광부",
    },
    legal: {
      sectionTitle: "운영 주체",
      body: "본 서비스는 PRE-OWNED WATCHES L.L.C(두바이, UAE)가 운영합니다.",
      licenseLine: "두바이 경제관광부(DET) 상업 면허 번호 1135431",
      activityLine:
        "허가 업종: 시계·명품 중고 매매, 트레이딩 카드·수집품 거래, 해외 시세 비교·국제 중개, 온라인 전자상거래·앱 운영, AI 시세 기회 안내·거래 지원",
    },
  },
};
```

`T.legal.operator.*` = `operator.ts` re-export (중복 문자열 금지)

#### E) 출시 전 KYB 체크리스트

- [ ] DET Trade License PDF (1135431) 보관 · `verifiedAt` 기록
- [ ] Invest in Dubai / DET 포털에서 면허 상태·만료일 확인
- [ ] VAT TRN(해당 시) · §50.9.A-1 플랫폼 정렬 업종이 DET PDF에 포함 확인
- [ ] `verify:operator-footer` PASS — schema ↔ footer ↔ legal 약관 3곳 일치
- [ ] hiptk.app 푸터·JSON-LD·operator-entity instance 동기화 (support@hiptk.app)

#### F) 어뷰징·결함 방어

| # | 위험 | 방어 |
|---|------|------|
| O2 | 앱·랜딩·약관 footer drift | verify:operator-footer |
| O3 | JSON-LD fake rating/review | §31.5 honest Organization only |
| O4 | UK dissolved entity 혼동 | UI=UAE LLC only · CH #05458999 **미표기** |
| O5 | 면허 만료 후 미갱신 | Admin `licenseStatus` + 분기 재검수 알림 |

### 50.8 교차 참조

> **배치:** §50.9(운영사 본문) 다음 appendix pointer — ADR-004 허용 · 재번호 금지.

| 주제 | SSOT |
|------|------|
| 금지어·glossary | §27 + 본 절 50.4 |
| 토스트 코드 | **§8.2 = 본문 SSOT** · 본 절 50.2 = tone/이모지 규칙만 |
| 설정 IA | §5.10 + 본 절 50.1 |
| 면책·USDT | §38 |
| 원금·수익 | §49 |
| 어드민 모듈명 | §9.1 |
| 운영사·DET·푸터 | **본 절 50.9** · `operator-entity.v1.json` |
| SEO Organization | §31.5 |
| 외부 WP 푸터(EN) | `FOOTER_LICENSE_COPY.md` → schema pointer |

---

### 51.14 USDT Confirmation Intermediate UX

| conf | 유저 상태 | ledger | participate |
|------|-----------|--------|-------------|
| 0 | — | — | — |
| **1** | `DEPOSIT_DETECTED` toast · "거의 다 됐어요" | **0** | **locked principal 불가** (unconfirmed) |
| 1~18 | progress chip `/wallet` | 0 | 불가 |
| **19** | `DEPOSIT_CONFIRMED` · usable | credit principal | 가능 |

**카피 SSOT:** `T.wallet.depositConfirming` · `T.wallet.depositAlmostDone`

### 51.16 Proof-at-Participate

```typescript
// schemas/participate-proof.v1.json
interface ParticipateProof {
  tradeId: string;
  pricingVersion: number;
  buyPriceUsdt: Decimal;
  sellPriceUsdt: Decimal;
  expectedProfitUsdt: Decimal;
  fxSnapshotId: string;
  proofHash: string;           // SHA256 canonical JSON
  capturedAt: ISO8601;
}
```

**UI:** success/safe_stop 화면 · "참여할 때 본 조건" collapsible · hash truncated + [복사]  
**CI:** `verify:participate-proof` — every participate stores proof · success UI shows match

### 51.17 Safe Stop Trust Metric

- **유저:** `/me` 또는 `/wallet` · `"AI가 손해 없이 멈춘 횟수"` · ledger `safe_stop` count (demo ❌)  
- **카피:** `T.trust.safeStopCount` — FOMO 대신 **신뢰 역전** (§38 납득 톤)  
- **금지:** safe_stop = 실패 framing · "당첨 실패" metaphor

### 51.18 Capital Band Journey

| Unlock | 조건 | 효과 |
|--------|------|------|
| micro | default | catalog access |
| small | **2× MATCH_SUCCESS** settlements OR deposit ≥100 | filter chip 해금 |
| mid | 5× success OR deposit ≥1k | mid band sort boost |
| high/whale | deposit threshold OR Admin whale tier | §0.0.5 catalog |

**금지:** deposit-only paywall without micro path · **진행 = settlement 횟수 + 잔액** (§0.0.5 공존)

#### 51.18a 멤버십 여정 설명 (UI Owns · v7.22.24)

> capitalBand(§51.18)와 **병행** · 멤버십 enum SSOT=Engine §0.0.7 · 화면=`/me/membership` §5.9.2c

| 유저에게 보여 줄 것 | 잠금 |
|---------------------|------|
| 등급 사다리 | 새싹→입문→본격→고액→VIP (ko만) |
| AI가 등급에 따라 좋아짐 | 해금 목록 · **환각 금지** (플래그만) |
| 매칭 100% 아님 | `T.membership.notGuaranteed` 고정 |
| 고액·VIP | 좋은 조건·큰 수익 · **하루 횟수 적음** (`highScarce`) |
| 참고율 | 「요즘 조건이 맞은 비율」=관측 · Rule 입력 금지 |

**홈 칩(선택):** 현재 등급 배지 1개 · 클릭→`/me/membership` · 초대 티어 배지와 슬롯 분리

### 51.19 Adapter Health — User Surface

**컴포넌트:** `AdapterHealthChip.tsx` on OpportunityCard footer  
**표시:** `시세 갱신 {relativeKo}` · `출처 {n}` · stale → `비교 준비중` + CTA lock reason (§0.0.4)  
**데이터:** `staleAt` · `pricing.lastAdapterSyncAt` · **Admin health SSE**

### 51.20 Weekly Market Briefing — User Surface (v7.22.52 흡수 · 고아 게이트 → UI Owns 재배정 · verify 미착수 · Owns=UI 신설)

> **발견(§0.8.2 #4):** Engine `ai_profit_os_02_engine_*.plan.md` §51.20이 M0.5 시뮬레이션 산출물을 유저에게 "이번 주 시세 차이 분포" 형태로 안내하도록 정의하며 라우트 `/me/guide/market-weekly`(§38 guide 가족과 동일 패턴)까지 명시했으나, **UI 플랜에는 Owns 절·PART 배정·route 등록·Canon wire·CI가 전혀 없었다**(Index §19 게이트만 존재하는 **고아 게이트**). 본 절이 그 공백을 **UI Owns로 재배정**한다 — **"해소" 아님**: `verify:market-briefing-no-investment-advice`는 **PART8b 착수 시 신설**(v7.22.53 실측: `tooling/verify/*.cjs` **0** · `margin-compare-surface`와 동일 ghost 클래스).  
> **중복0:** 산출 데이터(`spreadDistribution`)·주기·투자권유 금지 원칙 = **Engine §51.4/§51.20 Owns** · 본 절 = **화면·라우트·카피·CI**만.

| 항목 | 잠금 |
|------|------|
| Route | `/me/guide/market-weekly` (guide 계열 · `USER_NESTED_ROUTES` 등록 필수) |
| 소스 | Engine M0.5 `spreadDistribution`(주 1회 갱신) — **읽기만**, UI 재계산 금지 |
| 목적 | **교육용** "이번 주 시세 차이가 왜 생겼는지" 요약 — 매수·매도 권유 **아님** |
| 진입 | 주 1회 push/in-app(옵트인) · `/me/guide/*` 목록 · `/me/settings` 알림에서 opt-out |
| 카피 톤 | §27.10 캡 적용(제목 이모지 1) · toneBand(§38.9) young=요약bullet·mid=비교표·senior=한 줄씩 |
| 금지 | "지금 사세요/파세요" 등 투자 권유·매수매도 지시형 문장 · 확정 수익 암시 · 특정 SKU 매수 추천 |
| Canon | `market-weekly-briefing.wire.json` (todo 신설) |
| Push | `T.push.*`에 `market_weekly` 카테고리 추가(§8.3 pointer) |

**카피 SSOT:** `packages/ui/copy/ko/guide.ts`에 `T.guide.marketWeekly.*` 추가 (신규 JSX 하드코딩 금지)  
**검증:** `verify:market-briefing-no-investment-advice`(**PART8b에서 신설** · Index §19 인용 · v7.22.53 현재 ghost) · `verify:canon-surfaces` · `verify:ia-tabs`(nested route 등록 확인)  
**Owns=PART8b** `trust-surfaces-v722`(§51.16~21 범위로 확장 · YAML 참조).

### 51.21 Personal AI — First Deposit 60s Consult

- **Gate:** `DepositWhyGate` (§38.7) + §47 **Template path Q2/Q4 우선**  
- **Flow:** 첫 `/wallet/deposit` · Objection accordion 60s · [이해했어요] → deposit form  
- **Fact Card:** balance=0 · opportunities preview · `toneBand` · `fontScale` · `depositPref` · **이 surface는 P레인** — LLM 문장화만 · money tools 강제 (§47.4 · §47.12~14)  
- **senior:** 한 문장 + [다음] · get-usdt/원화 탭 CTA 우선  
- **CI:** `verify:deposit-ai-template-path` — Q2/Q4 = template not raw LLM

### 51.24 Loop Psychology · DayPulse · PreCTA (v7.22.15 · Owns=UI · 유령 금지)

> **SSOT:** 본 절 · `CONSTITUTION/51` Loop 절 pointer · `schemas/day-opportunity-pulse.v1.json`  
> **참조자:** Engine §48.13.1 P0 · Admin §35 경계 · CATALOG `loop-psychology` / `day-pulse-live-only` / `preflight-may-stop`  
> **중복0:** G4 ticker/counter = Admin **§35.4** Organic Hybrid · surface=UI **§33.2a** · **DayPulse/PreCTA 수치·문구는 Growth 스위치와 무관** · demo↔DayPulse merge **0**

#### 51.24.1 DayPulse (홈 [A2])

| 잠금 | 내용 |
|------|------|
| 소스 | ledger + settlement **live 집계만** (engine day-pulse API) |
| 표시 예 | 오늘 안전중단 N · 오늘 정산 완료 N · (실측 0이면 행 숨김 또는 `아직 없어요`) |
| **금지** | Admin 수동 숫자 편집 · G4 `demo`/`hybrid`/`blended` 수치 merge · 가짜 “오늘 N명 수익” seed |
| CI | `verify:day-pulse-live-only` |

#### 51.24.2 PreCTA / Preflight (participate 직전)

| 잠금 | 내용 |
|------|------|
| 화면 | 상세/확인 시트 · `mayStop` 안내 1줄 (“시세가 움직이면 안전하게 멈출 수 있어요”) |
| 완료 토큰 | Nest가 검증 · 없으면 **`412 PREFLIGHT_REQUIRED`** (Engine §48.13.1 P0) |
| **금지** | PreCTA 스킵 딥링크 · “무조건 성공” 문구 · 연출 타이머=지급 |
| CI | `verify:preflight-may-stop` |

#### 51.24.3 Presence

| 잠금 | 내용 |
|------|------|
| 기본 | **OFF** — “보는 중 N명” 미표시 |
| ON 조건 | feature flag `presence_live` + **실측 세션 수**만 |
| **금지** | 랜덤/시드 presence · FOMO용 가짜 대기열 |

#### 51.24.4 platformSafeStopToday

| 잠금 | 내용 |
|------|------|
| 소스 | ledger `safe_stop` count (오늘 · 전 유저 또는 본인 — 제품 설정 키 1개) |
| 용도 | §51.17 신뢰 메트릭 · DayPulse 한 줄 |
| **금지** | Growth/G4 편집 · “실패/낙첨” 프레이밍 |

#### 51.24.9 어뷰징 방어 L1~L24 (요약 잠금 · 전수 CI)

| ID | 공격 | 방어 |
|----|------|------|
| L1 | DayPulse 위조 숫자 | live API only · Admin 필드 0 |
| L2 | G4 demo→DayPulse merge | 코드경로 0 · verify |
| L3 | 가짜 “지금 N명 보는 중” | presence 기본 OFF |
| L4 | 가짜 대기열/줄서기 | UI 컴포넌트 금지 |
| L5 | presence 시드 | flag+실측만 |
| L6 | presence와 ticker 슬롯 합치기 | 슬롯 분리 |
| L7 | PreCTA 스킵 | 412 PREFLIGHT_REQUIRED |
| L8 | mayStop 문구 삭제 A/B | copy key 필수 |
| L9 | “무조건 수익” PreCTA | 금지어 CI |
| L10 | 연출 duration=지급 | §48 · presentation-cannot-credit |
| L11 | safe_stop=낙첨 카피 | §51.17 |
| L12 | FOMO Coral이 비교블록 가림 | §0.0.4 |
| L13 | sticky CTA가 5탭 가림 | §5.3 |
| L14 | 카지노 슬롯 이모지/SFX | §33·§50 |
| L15 | notice에 G2 FOMO 합침 | §5.9.2 |
| L16 | G4↔DayPulse merge | **본 절 핵심** |
| L17 | counter_mode blended를 DayPulse에 표시 | 금지 |
| L18 | Admin DayPulse 수동 편집 UI | route/필드 0 |
| L19 | 딥링크로 preflight bypass | Nest 검증 |
| L20 | 홈에 보장수익 배지 | trust CI |
| L21 | “이베이에서 팔림” 진행 카피 | orchestrateTruth |
| L22 | IT jargon in pulse | no-it-jargon |
| L23 | 성별 FOMO 카피 | 성별 분기 0 |
| L24 | Pulse/PreCTA 영문 코드 노출 | toast/problem 코드 비노출 |

**CI:** `verify:loop-psychology` — L1~L24 스캔 + DayPulse/PreCTA/presence 규칙  
**Admin:** DayPulse **편집 UI 금지** (§35 ticker 탭과 분리 · pointer)