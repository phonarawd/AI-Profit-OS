---
name: PUTDUK Release Master
overview: 기존 `.cursor/plans/PUTDUK_CURRENT_MASTER.plan.md`(Track A-G)를 CONTENT_AUTHORITY로 유지한 채, 그 상위에 단일 실행 권위 PUTDUK_RELEASE_MASTER를 둔다. Workspace 21 + Home-only PUTDUK + archive/cache를 atomic TODO 단위로 통합했다. 현재 실행 큐는 REL 116 + POST 19 + PRE-LOCK 1. PRE-LOCK-001 완료. PLAN_LOCKED는 최종 검산 PASS 후 TRUE.
todos:
  - id: pre-lock-001
    content: "[PRE-LOCK, REL큐 밖] FIGMA_AUTHORITY_DISCOVERY: 실행 완료 - fileKey w7Yg8j2x9evuheOSSLqFw5 실제 MCP 접근 확인, 15개 frame 실사+분류 완료(전부 BACKUP 또는 FOUNDER_REVIEW_CANDIDATE, APPROVED_AUTHORITY 0건). Surface Matrix FIG 컬럼 갱신 완료. Lock 여부는 사용자 최종 승인 대기"
    status: completed
  - id: rel-000
    content: "[Foundation] 작업 트리 전수 분류(tracked/untracked/ignored/tmp/secret-risk)"
    status: pending
  - id: rel-001
    content: "[Foundation] secrets scan + 분류된 항목만 recoverable backup 브랜치(preserve/*, merge 대상 아님)로 대피"
    status: pending
  - id: rel-002
    content: "[Foundation] recovery/home-capture 브랜치에서 Home 구현+승인 baseline 복원 -> verify -> PR -> CI -> merge(main 직접 커밋 금지)"
    status: pending
  - id: rel-003
    content: "[Foundation] recovery/track-a-data-core 브랜치에서 migration 3건+opportunities 변경+opportunity-reprice.service.ts(레거시 reprice-freshness 플랜 산출물) 복원 -> verify -> PR -> CI -> merge"
    status: pending
  - id: rel-004
    content: "[Foundation] ENGINE_BASELINE_SANITY_CHECK(경량, 정식 인증 아님)"
    status: pending
  - id: rel-005
    content: "[Foundation][A1] cursor-autonomous-ops.mdc 개정: production 인간 게이트 보존 + non-production A3 개방"
    status: pending
  - id: rel-006
    content: "[Foundation][P0-safety] QA_ENV_ISOLATION_GUARD 선행 확인 후 QA-LAB-BOOTSTRAP을 tooling/e2e에 committed spec으로 구축(MCP 단독 조작은 DONE 불인정)"
    status: pending
  - id: rel-007
    content: "[Foundation][P0] money \"0\" fallback -> UNAVAILABLE 수정 + committed Bootstrap spec으로 검증"
    status: pending
  - id: rel-008
    content: "[Foundation] settlement_rule.rs/.cjs golden vector parity script를 T0/T1에 편입"
    status: pending
  - id: rel-009
    content: "[Foundation][Lock 이후 실행] Figma Integration Infrastructure: PRE-LOCK-001 결과물을 design token/Code Connect로 실제 코드에 반영"
    status: pending
  - id: rel-010
    content: "[Foundation] auth 라우트 rate limiting 실제 동작 테스트로 검증/구현"
    status: pending
  - id: rel-011
    content: "[Foundation] apps/web 실제 lint 구현(현재 no-op 스크립트 교체)"
    status: pending
  - id: rel-012
    content: "[Foundation] axe-core를 committed Playwright 하네스에 배선"
    status: pending
  - id: rel-013
    content: "[Foundation] apps/web next.config.ts images.remotePatterns 확인/수정"
    status: pending
  - id: rel-014
    content: "[Foundation][scope 축소: E-PWA-001만] PWA native shell - manifest link+icons+service worker 실연결(Push/WebAuthn은 REL-020~022로 분리)"
    status: pending
  - id: rel-015
    content: "[Foundation] 유저용 generic ledger/journal 조회 API 신설(Transaction History 백엔드 갭)"
    status: pending
  - id: rel-016
    content: "[Foundation] observability 도입(client/server error tracking, 구조화 로그, alerting)"
    status: pending
  - id: rel-017
    content: "[Foundation][Legacy] LEGACY_PLAN_MIGRATION_REGISTRY: .cursor/plans/** 21개 전량 실사, CONTENT_AUTHORITY/EXECUTION_AUTHORITY 이원 표기, 미해결 항목 전부 REL-XXX 또는 VERIFIED_DONE 매핑"
    status: pending
  - id: rel-018
    content: "[Foundation][Asset] ASSET_PRODUCTION_PIPELINE 인프라화: 기존 capture/download 스크립트 패턴(apps/web/scripts/*)을 표준 생성-검수-최적화 파이프라인으로 통합"
    status: pending
  - id: rel-019
    content: "[Foundation][Responsive] RESPONSIVE_DEVICE_TIER_SYSTEM 통합: 기존 detectDeviceTier/ux-design-system 재사용, 대형화면 안전망 CSS 정책 문서화(Home 소급 적용 제외)"
    status: pending
  - id: rel-020
    content: "[Foundation][PWA] Push+Badge(VAPID, workers/push-dispatcher 재사용, Admin push kill) - Track E E-PWA-002"
    status: pending
  - id: rel-021
    content: "[Foundation][PWA] 자동 Push 채널 필터(notice/campaign/opportunity prefs) - Track E E-PWA-003"
    status: pending
  - id: rel-022
    content: "[Foundation][PWA] WebAuthn UX/RP + haptics fallback - Track E E-PWA-004"
    status: pending
  - id: rel-023
    content: "[Foundation][PWA] PWA certification(manifest/install/offline/push dedup/WebAuthn/reduced-motion) - Track E E-PWA-007, deps REL-014,020,021,022"
    status: pending
  - id: rel-100
    content: "[Consumer][Asset+Responsive 필드 포함] Landing(/ guest state) 클로저"
    status: pending
  - id: rel-101
    content: "[Consumer][Legacy:C-ACQ-001~003] Signup(/auth/signup) 클로저 - Track C(Current Master) completed 선언 + verify:acquisition-release.cjs 실재 확인(Round6). 잔여=재확인 게이트만(전면 재구현 아님)"
    status: pending
  - id: rel-102
    content: "[Consumer][Legacy:C-AUTH-001+C-ACQ-001~003] Login(/auth/login) 클로저 - Kakao OAuth backend는 C-AUTH-001 completed(CODE_RUNTIME_CLOSED) 이나 LIVE_KAKAO_HUMAN_E2E=NOT_RUN(Founder 계정 필요, HUMAN_ESCALATION 후보). 잔여=실제 Kakao 계정 E2E 1회 확인"
    status: pending
  - id: rel-103
    content: "[Consumer][Legacy:C-ACQ-001~003] CompleteProfile(/auth/complete-profile) 클로저 - Track C completed 선언 범위(재확인 게이트만)"
    status: pending
  - id: rel-104
    content: "[Consumer][Legacy:C-ACQ-001~003] Onboarding(/onboarding) 클로저 - Track C completed 선언 범위(재확인 게이트만)"
    status: pending
  - id: rel-105
    content: "[Consumer][Home Freeze 예외: 신규 반응형/asset 요구 소급 없음] Home 잔여 클로저(Playwright+A11y+Security만)"
    status: pending
  - id: rel-106
    content: "[Consumer][Legacy:B-LOOP-001] OpportunityList(/profits) 클로저 - Round6 재검증: Track B(Current Master) backend/data 배선 completed 자체 선언 + FIG=76:2/116:28/122:34 Founder Review Candidate 확보. 잔여=Figma candidate 적용+PASS 승격 여부 확인만(전면 재구현 아님)"
    status: pending
  - id: rel-107
    content: "[Consumer][Legacy:B-PARTICIPATION-001] OpportunityDetail(/profits/[id]) 클로저 - Round6 실측 재확인: OpportunityDetailClient.tsx가 issuePreflight+postParticipate 실제 호출(grep 직접 확인, git status=M 즉 아직 미커밋) · FIG=96:2/104:43+109:28 Founder Review Candidate. 잔여=REL-000~003 커밋 파이프라인으로 흡수+Figma 후 시각 정합"
    status: pending
  - id: rel-108
    content: "[Consumer][Legacy:B-LOOP-001] ParticipateConfirmation(modal) 클로저 - FIG=103:315(Desktop)/103:314 ParticipateConfirmSheet 11-state 컴포넌트 Founder Review Candidate. Track B가 참여 플로우 전체를 completed로 선언(모달 포함 여부는 REL-107 실행 시 재확인)"
    status: pending
  - id: rel-109
    content: "[Consumer][Legacy:B-EXECUTION-001] Matching/execute(/trades/[id]/execute) 클로저 - Round6 실측 재확인: TradeExecuteClient.tsx가 useTradeExecution 실제 호출+MatchingInProgress/Retrying/Settled/StoppedSafely/Failed 상태머신 실구현(committed, PendingFigma 아님) · FIG=155:222(Desktop)/140:34,142,250,358(Mobile) Founder Review Candidate. 잔여=Figma 후 시각/모션 정합만"
    status: pending
  - id: rel-110
    content: "[Consumer][Legacy:B-TRADES-001] MatchingResult(/trades) 클로저 - Round6 실측 재확인: TradesClient.tsx가 fetchTradeList+fetchWalletBuckets 실제 호출, loading/empty/unauthorized/ready 상태 실구현(committed). 잔여=시각 정합만(기능은 REAL)"
    status: pending
  - id: rel-111
    content: "[Consumer] Earnings(/trades embed) 클로저"
    status: pending
  - id: rel-112
    content: "[Consumer] SettlementDetail 클로저(REL-015 선행)"
    status: pending
  - id: rel-113
    content: "[Consumer][Legacy:B-WALLET-001~003] Wallet(/wallet) 클로저 - Track B(Current Master) 선언: 기능 대부분 REAL(buckets/deposit/withdraw/KYC 8+ 테이블 실측 확인됨), 잔여=시각 정합(gap-only)만. 전면 재구현 아님"
    status: pending
  - id: rel-114
    content: "[Consumer] UsdtDeposit 클로저"
    status: pending
  - id: rel-115
    content: "[Consumer] KrwDeposit 클로저"
    status: pending
  - id: rel-116
    content: "[Consumer] UsdtWithdraw 클로저"
    status: pending
  - id: rel-117
    content: "[Consumer] KrwWithdraw 클로저"
    status: pending
  - id: rel-118
    content: "[Consumer] TransactionHistory 클로저(REL-015 선행)"
    status: pending
  - id: rel-119
    content: "[Consumer] TransactionDetail 클로저(REL-015 선행)"
    status: pending
  - id: rel-120
    content: "[Consumer][Legacy:C-ACC-001~003] Referral(/me/invite) 클로저 - Track C \"핵심 8영역\" completed 선언(verify:account-hub-release.cjs 실재 확인, Round6). 잔여=재확인 게이트만"
    status: pending
  - id: rel-121
    content: "[Consumer][Legacy:C-ACC-001~003] Notifications(/me/inbox) 클로저 - Track C \"핵심 8영역\" completed 선언 범위(재확인 게이트만)"
    status: pending
  - id: rel-122
    content: "[Consumer][Asset 후보 기존재] AIInsight(/me/peotteok) 클로저 - public/spark-dash/ai-*.svg 재사용 여부 우선 확인"
    status: pending
  - id: rel-123
    content: "[Consumer][Legacy:C-ACC-001~003] Profile(/me) 클로저 - Track C 재확인 게이트만. REL-131 Figma를 기다리지 않음(신규 프레임 적용은 REL-131 산출)"
    status: pending
  - id: rel-124
    content: "[Consumer][Legacy:C-ACC-001~003] Kyc(/me/kyc) 클로저 - Track C \"핵심 8영역\" completed 선언 범위(재확인 게이트만)"
    status: pending
  - id: rel-125
    content: "[Consumer][Legacy:C-ACC-001~003] Settings(/me/settings, Security 병합) 클로저 - Track C \"핵심 8영역\" completed 선언 범위(재확인 게이트만)"
    status: pending
  - id: rel-126
    content: "[Consumer][Legacy:C-ACC-001~003] Support(/me/support) 클로저 - Track C \"핵심 8영역\" completed 선언 범위(재확인 게이트만)"
    status: pending
  - id: rel-127
    content: "[Consumer][Legacy:C-ACC-001~003] Guides(/me/guide/* 7라우트) 클로저 - Track C \"핵심 8영역\" completed 선언 범위(재확인 게이트만)"
    status: pending
  - id: rel-128
    content: "[Consumer][Legacy:C-ACC-001~003] Legal(/me/legal/* 5라우트) 클로저 - Track C \"핵심 8영역\" completed 선언 범위(재확인 게이트만)"
    status: pending
  - id: rel-129
    content: "[Consumer] PartnerTrust(embed) 클로저 - 실제 파트너 로고만 사용, AI 생성 금지"
    status: pending
  - id: rel-130
    content: "[Consumer] Grouped compatibility 검증: /ads, /l/[variant], /me/events, /me/strategies, /me/membership, /me/benefits(6개 실제 경로, 경량 DoD)"
    status: pending
  - id: rel-131
    content: "[Consumer][A3][Home-only:account_hub_figma] Account Hub Figma Desktop 1440 + Mobile 390 프레임 신설(Backup Home 클론 금지). REL-123 재확인과 독립. 새 프레임 Founder 검토 후 시각 적용은 본 REL 산출로 기록"
    status: pending
  - id: rel-200
    content: "[Admin] apps/admin/app/page.tsx(root) 실사 - 순수 리다이렉트인지 확인 후 처리"
    status: pending
  - id: rel-201
    content: "[Admin] /admin 대시보드 실사+구현(현재 2줄 stub 확인됨)"
    status: pending
  - id: rel-202
    content: "[Admin] /admin/users 리스트 실사+구현"
    status: pending
  - id: rel-203
    content: "[Admin] /admin/users/[id] 상세 실사+구현"
    status: pending
  - id: rel-204
    content: "[Admin] /admin/users/[id]/finance 실사+구현"
    status: pending
  - id: rel-205
    content: "[Admin] /admin/ledger 실사+구현"
    status: pending
  - id: rel-206
    content: "[Admin] /admin/wallet 실사+구현"
    status: pending
  - id: rel-207
    content: "[Admin] /admin/compliance(KYC 심사) 실사+구현"
    status: pending
  - id: rel-208
    content: "[Admin] /admin/risk 실사+구현"
    status: pending
  - id: rel-209
    content: "[Admin] /admin/execution-policy 실사+구현"
    status: pending
  - id: rel-210
    content: "[Admin] /admin/opportunities 실사+구현"
    status: pending
  - id: rel-211
    content: "[Admin] /admin/adapters 실사+구현"
    status: pending
  - id: rel-212
    content: "[Admin] /admin/support 실사+구현"
    status: pending
  - id: rel-216
    content: "[Admin] /admin/reports/financial 실사+구현"
    status: pending
  - id: rel-217
    content: "[Admin] /admin/growth 허브 실사+구현"
    status: pending
  - id: rel-218
    content: "[Admin] /admin/growth/deposit 실사+구현"
    status: pending
  - id: rel-219
    content: "[Admin] /admin/growth/ticker 실사+구현"
    status: pending
  - id: rel-220
    content: "[Admin] /admin/growth/whale 실사+구현"
    status: pending
  - id: rel-221
    content: "[Admin] /admin/growth/content 실사+구현"
    status: pending
  - id: rel-300
    content: "[AI Capability] Coach P-lane(Fact-only) 런타임 재확인"
    status: pending
  - id: rel-301
    content: "[AI Capability] Coach G-lane(scope-guard, tools=[]) 런타임 재확인"
    status: pending
  - id: rel-302
    content: "[AI Capability] Coach S-lane(safe-refuse) 런타임 재확인"
    status: pending
  - id: rel-303
    content: "[AI Capability] prompt-injection/scope-escape red-team pass"
    status: pending
  - id: rel-304
    content: "[AI Capability] numeric-grounding + fact-freshness 런타임 재확인"
    status: pending
  - id: rel-305
    content: "[AI Capability] conversation-state bounded-memory 런타임 재확인"
    status: pending
  - id: rel-215
    content: "[Admin] /admin/ai-logs 실사+구현(deps REL-300~305 완료 후, TOP→BOTTOM에서 본 위치)"
    status: pending
  - id: rel-400
    content: "[Hardening] Admin Control Plane superset 클로저 스펙(kill-switch UI/audit UI/RBAC 관리 UI)"
    status: pending
  - id: rel-213
    content: "[Admin] /admin/system-control(kill-switch) 실구현(deps REL-400 완료 후, TOP→BOTTOM에서 본 위치)"
    status: pending
  - id: rel-214
    content: "[Admin] /admin/audit 실구현(deps REL-400 완료 후, TOP→BOTTOM에서 본 위치)"
    status: pending
  - id: rel-401
    content: "[Hardening] 보안 헤더 미들웨어(CSP/HSTS/X-Frame-Options)"
    status: pending
  - id: rel-402
    content: "[Hardening] 의존성 취약점 스캔(pnpm audit)을 CI에 편입"
    status: pending
  - id: rel-403
    content: "[Hardening] 버전/릴리스 태깅 체계 도입"
    status: pending
  - id: rel-404
    content: "[Hardening][Performance] Lighthouse CI + 성능예산(bundle/이미지/lazy-load) baseline 배선"
    status: pending
  - id: rel-405
    content: "[Hardening][Legacy:D-ADMIN-001] RBAC + Audit Foundation(8 role capability mapping + mandatory audit schema, OWASP ASVS V8/V16)"
    status: pending
  - id: rel-406
    content: "[Hardening][Legacy:D-ADMIN-002] Kill Switch 9종(GLOBAL_OPPORTUNITY_PAUSE 등, money_circuit 선례 재사용), deps REL-405"
    status: pending
  - id: rel-407
    content: "[Hardening][Legacy:D-ADMIN-005] Price Override Engine(4레이어: SOURCE_OBSERVED->OVERRIDE->EFFECTIVE->USER_VISIBLE)"
    status: pending
  - id: rel-408
    content: "[Hardening][Legacy:F-REL-006] Security/secrets/RLS-role 실증 + backup/rollback runbook baseline"
    status: pending
  - id: rel-222
    content: "[Admin][Legacy:D-ADMIN-016] 3-mode Admin Ops(LIVE/DRY_RUN/SIMULATION) + Preview-As-User + Impact Simulation(preview→confirm→apply→result→rollback), deps REL-405"
    status: pending
  - id: rel-223
    content: "[Admin][Legacy:D-ADMIN-018] Allocation/Manual Match Control(ALLOW/BLOCK/PAUSE/CANCEL/REASSIGN) + Bulk/Schedule/Campaign Ops(preview+confirmation+audit 필수), deps REL-407"
    status: pending
  - id: rel-224
    content: "[Admin][Legacy:D-ADMIN-019] Source/Parser Health 대시보드 + Founder Override(최상위 override) + Policy Versioning(V1/V2/V3 history+rollback), deps REL-405"
    status: pending
  - id: rel-409
    content: "[Hardening][Legacy:D-ADMIN-020] Admin R6 Certification(12모듈+2b 전수, deps REL-200~224+400+405~408)"
    status: pending
  - id: rel-500
    content: "[QA-Expansion] QA-LAB-EXPANSION: 전체 persona x device x browser x network x a11y matrix, committed spec으로 확장"
    status: pending
  - id: rel-501
    content: "[QA-Expansion] 금융/red-team 풀매트릭스 실행, QA_ENV_ISOLATION_GUARD 필수 적용"
    status: pending
  - id: rel-502
    content: "[QA-Expansion][A2] FINAL ENGINE ACCEPTANCE: PROTECTED_SCOPE_MUTATION=TRUE 태그가 달린 모든 REL(고정 range 아님, §C 자동수집) 완료 후 QA0-QA9 재베이스+재인증"
    status: pending
  - id: rel-503
    content: "[QA-Expansion] protected-scope STALE 감시 메커니즘 상시화"
    status: pending
  - id: rel-504
    content: "[QA-Expansion][A3][Legacy:F-REL-001] PRODUCTION_MIGRATION_READINESS_CHECK: Track A local proof + REL-408 보안 baseline 완료 여부 검증, migration 파일 리뷰(실제 apply는 하지 않음 - apply는 REL-701-DB로 분리)"
    status: pending
  - id: rel-505
    content: "[QA-Expansion][A2][Legacy:F-REL-002] BACKEND_DATA_ALIGNMENT_CERTIFICATION(R7): API·SDK·Nest AppModule imports·Engine FSM·local/remote migration head·indexes/RLS/idempotency·auth permission·money units·source/asOf/reasonCode 1:1 대조, semantic conflict 발견 시 owner에 가산 REL+version bump(은폐 금지)"
    status: pending
  - id: rel-506
    content: "[QA-Expansion][A2][Legacy:F-REL-003] INFRA_RELEASE_CERTIFICATION_CORE(R8, Ads 자동화 제외): infra/domain.manifest openNext Workers origin·cache/R2/Web Vitals·에러추적·세션·rollback/known-good, known P0~P3 defect 0"
    status: pending
  - id: rel-507
    content: "[QA-Expansion][A3][Legacy:F-REL-007] PRODUCTION_E2E: 인증 세션 실 브라우저 Playwright E2E(로그인->참여->정산->지갑), Track B 핵심 task 완료 후"
    status: pending
  - id: rel-600
    content: "[Staging][A2] Staging 배포(경로/자격 확정 필요)"
    status: pending
  - id: rel-601
    content: "[Staging] Staging 전체 회귀(Surface Matrix 전량 재검증, 반응형/에셋 QA 포함)"
    status: pending
  - id: rel-602
    content: "[Staging][A2] Rollback 연습(staging에서 실제 실행+검증)"
    status: pending
  - id: rel-603
    content: "[Staging][A0][Legacy:trust-age-spotcheck] 연령대별 수동 사용성 실사(20/40/60-70대 각3명, 사람 실행 필수·자동화 불가)"
    status: pending
  - id: rel-700
    content: "[Production] Production 준비도 게이트 집계 리뷰"
    status: pending
  - id: rel-701-pre
    content: "[Production] KAKAO_PRODUCTION_READINESS_VERIFICATION(A3 검증 우선, VERIFIED시에만 child A0 BLK 생성)"
    status: pending
  - id: rel-701-db
    content: "[Production][A1][HUMAN_ESCALATION][Legacy:F-REL-001] PRODUCTION_MIGRATION_APPLY: source_observations/canonical_products/match_results 원격 Supabase 반영 - 실제 production DB mutation, Founder 명시 승인 필수, deps REL-504+REL-601(staging 회귀 PASS)+REL-602(rollback 연습 PASS), STAGING_BEFORE_PRODUCTION_DB_MUTATION 원칙 적용"
    status: pending
  - id: rel-701
    content: "[Production][A1][HUMAN_ESCALATION] Production 앱 배포 실행(workflow_dispatch, deps REL-701-db)"
    status: pending
  - id: rel-702
    content: "[Production] 자동 production smoke"
    status: pending
  - id: rel-703
    content: "[Production] production observability 확인"
    status: pending
  - id: rel-704
    content: "[Production] RELEASE CLOSURE: PLATFORM_RELEASE_STATUS=CLOSED"
    status: pending
  - id: post-001
    content: "[POST-CORE][A3][Legacy:G-GROWTH-001/06:marketing-attribution-chain-fixture] Attribution Chain Fixture: D1(동일 deposit_event_id 웹훅 2회->1회+CAPI 1회) D2(동일 idempotency 재시도 no-op) D3(동시 first_deposit 경쟁->승1건, DB txn+partial unique index) TDD 선행, verify:attribution-chain 신설+CATALOG"
    status: pending
  - id: post-002
    content: "[POST-CORE][A3][Legacy:G-GROWTH-002/06:marketing-sdk-attribution] SDK Attribution: packages/sdk/marketing(utm-capture·consent·attribution-store·platform-cookies) + POST /marketing/touch, attr_id httpOnly cookie, OAuth state=CSRF nonce only(attr 인코딩 금지), deps POST-001"
    status: pending
  - id: post-003
    content: "[POST-CORE][A3][Legacy:G-GROWTH-003/06:marketing-signup-deposit-hooks] Signup/Deposit Hooks: signupStageA->user_attributions merge, first USDT deposit->first_deposit_at 1회(DB txn+SELECT FOR UPDATE), consent=false 시 CAPI enqueue 0, deps POST-001(PASS 필수)"
    status: pending
  - id: post-004
    content: "[POST-CORE][A3][Legacy:G-GROWTH-004/06:marketing-capi-metrics-spec] CAPI Metrics Spec: services/marketing-attribution/METRICS.md(Meta/TikTok/Google delivery state·parameter coverage baseline 정의), verify:capi-config(always, placeholder 패턴 금지)"
    status: pending
  - id: post-005
    content: "[POST-CORE][A3][Legacy:G-GROWTH-005/06:marketing-capi-dispatcher-wire] CAPI Dispatcher Wire: workers/marketing-capi-dispatcher(scaffold 존재) Meta/TikTok/Google adapter+event_id dedup+PII SHA256+DEFAULT_DENY egress allowlist, verify:capi-consent, deps POST-003+POST-004"
    status: pending
  - id: post-006
    content: "[POST-CORE][A3][Legacy:G-GROWTH-006/06:marketing-admin-roas-health] Admin ROAS Health: /admin 돈줄 하단 Worker 실시간 지표(delivery state+retry backlog+permanent fail)+48h 대조 접힌섹션 분리, deps POST-005"
    status: pending
  - id: post-007
    content: "[POST-CORE][A3][Legacy:G-GROWTH-007/06:marketing-seo-sitemap-jsonld] SEO 기초: sitemap.ts+robots.ts+JSON-LD(Organization+WebSite, 퍼뜩)+LandingOperatorFooter, verify:seo-schema+operator-footer"
    status: pending
  - id: post-008
    content: "[PHASE2][A1][HUMAN_ESCALATION][Legacy:G-GROWTH-008/06:ads-provider-onboarding] Ads Provider Onboarding: Meta/TikTok/Google 공식 Marketing/Ads API write SoT, OAuth/계정연결=HIGH+HUMAN, production live 연결도 HUMAN, deps POST-005+POST-007 completed"
    status: pending
  - id: post-009
    content: "[PHASE2][A1][HUMAN_ESCALATION][Legacy:G-GROWTH-009/06:ads-budget-standing-authorization] Ads Budget Standing Authorization: Founder 사전승인 deterministic 범위(daily/monthly cap·allowed channels 등), Budget Guardrail=deterministic service(Agent 한도상향 0), deps POST-008"
    status: pending
  - id: post-010
    content: "[PHASE2][A1][HUMAN_ESCALATION][Legacy:G-GROWTH-010/06:ads-campaign-orchestrator] Ads Campaign Orchestrator: Candidate->Compliance->Guardrail->Standing Authorization Gate->ACTIVE lifecycle, CAPI와 ownership 분리(schema 소유 0), deps POST-009"
    status: pending
  - id: post-011
    content: "[PHASE2][A1][HUMAN_ESCALATION][Legacy:G-GROWTH-011/06:cursor-autonomous-ops-enablement] Cursor Autonomous Ops Enablement: OpsEvent->Automation->Cloud Agent->Parent->readonly Subagent, production deploy 자동화 확대 0, deps POST-010"
    status: pending
  - id: post-012
    content: "[PHASE2][A1][HUMAN_ESCALATION][Legacy:G-GROWTH-012/06:ads-autonomous-ops-release-certification] Ads Autonomous Ops Release Certification: R8 Core(REL-506)와 별개 최종 판정, deps POST-008~011 전부 completed"
    status: pending
  - id: post-013
    content: "[POST-CORE][A3][Legacy:D-ADMIN-009/04:admin-growth-missions] Growth Missions Admin: /admin/growth?tab=missions D/M/W/S catalog+budget+releaseHold+accrualHalt+queued_pool 큐, 유저별 수동지급 0"
    status: pending
  - id: post-014
    content: "[POST-CORE][A3][Legacy:D-ADMIN-010/04:admin-growth-partners] Growth Partners Admin: /admin/growth?tab=partners Tier-A 순서+ON/OFF+audit, 로고=manifest only(유저표기 market-partner-trust-surfaces와 분리 유지)"
    status: pending
  - id: post-015
    content: "[POST-CORE][A3][Legacy:D-ADMIN-015/04:product-analytics] Product Analytics: D1/D7 retention+입금->2회참여 퍼널 OTel+Admin 리텐션 위젯"
    status: pending
  - id: post-016
    content: "[POST-CORE][A3][Legacy:D-ADMIN-017/04:admin-isolated-deploy] Admin Isolated Deploy: 별도 OpenNext Ops Worker(workers/ops-proxy 존재)+ops 도메인+IP allowlist, origin=infra/domain.manifest.json openNext.ops"
    status: pending
  - id: post-017
    content: "[POST-CORE][A3][Legacy:E-PWA-005/05:store-bridge-scaffold] Store Bridge Scaffold(v2): TWA+assetlinks+Play AAB+Uptodown APK/XAPK 동일 패키지·서명, Capacitor iOS shell, verify:assetlinks, deps REL-023(Day-1 PWA 게이트 PASS 후)"
    status: pending
  - id: post-018
    content: "[POST-CORE][A3][Legacy:E-PWA-006/05:store-bridge-uptodown-listing] Uptodown Developers Console Listing(v2): Organization+listing(icon/feature/short/full)+Country Restriction+Submit for review, verify:store-uptodown-listing, deps POST-017"
    status: pending
  - id: post-019
    content: "[POST-CORE][A3][Legacy:F-REL-004/06:phase1-adapter-ingest-host-binding] Runtime P1 Adapter Host Binding: NEST_ADAPTER_INGEST_URL=API_HOST 고정+prod secret 재등록, deps=phase-activation.mdc Runtime P1 활성화 승인(구조적 gate, REL 큐 아님)"
    status: pending
isProject: false
---

# PUTDUK RELEASE MASTER

```text
PLAN_LOCKED = TRUE
BLOCKING_ON = []
TOTAL_REL = 116
TOTAL_POST = 19
MASTER_TODO_COUNT = 136 (PRE-LOCK 1 + REL 116 + POST 19)
REVISION = Round 7 lock (final validator + isolation restored + dep order fix)
ALL_LEGACY_PLANS_SCANNED = TRUE (workspace 21/21 + Home-only PUTDUK 46 + archive 10)
ALL_LEGACY_ATOMIC_TODOS_EXTRACTED = TRUE (workspace 309 + Home/archive intake 381 rows)
FIGMA_URL_BLOCKER = 0
TEMP_ALLOWLIST_WORK_COMPLETE = TRUE
PROJECT_ISOLATION_BOUNDARY_RESTORED = TRUE
```

## PRE-LOCK. FIGMA_AUTHORITY_DISCOVERY (Round5: 실제 실행 완료)

**상태명 변경:** `PENDING_FIGMA_AUTHORITY_RESOLUTION` -> `EXECUTED_AWAITING_FOUNDER_APPROVAL`(fileKey 확보·MCP 실접근·frame 분류까지 전부 완료했고, 남은 것은 각 frame의 Founder 승인 여부뿐 - 이는 Cursor가 대신 판정할 수 없다).

### 발견 경로

Round4까지의 repo/workspace AUTO_DISCOVERY(§ 이전 개정판 기록)는 실제로 0건이었다 - 이 사실은 정정하지 않고 그대로 유지한다. 이번 fileKey(`w7Yg8j2x9evuheOSSLqFw5`)는 **repo 내부가 아니라 사용자가 보관하고 있던 별도 인계 기록에서 회수되어 이번 라운드에 직접 제공**되었다(`discoveredVia = RECOVERED_PROJECT_CONTEXT`, HUMAN_ESCALATION 3조건 검증 이후 사용자가 자발적으로 제공한 것이므로 "URL을 또 요구"한 것이 아니다). 제공 즉시 `get_metadata`/`get_libraries`로 실제 MCP 호출을 실행해 접근성과 내용을 실측했다(가정/신뢰가 아니라 검증).

### 실측 결과(2026-08-20, 실제 MCP 호출 완료)

```text
fileKey = w7Yg8j2x9evuheOSSLqFw5
fileName = "퍼뜩 · PUTDUK — Spark Dash Consumer UI"
접근 상태 = OK(get_metadata, get_libraries 실호출 성공)
Pages = 00_Readme(0:1), 03_Components(2:68)  [2개뿐 - 다른 페이지 없음]
libraries_added_to_file = Material 3 / Simple Design System / Apple 플랫폼 UI kit 7종
  (전부 범용 community kit, PUTDUK 전용 라이브러리 없음 - 컴포넌트는 파일 내부에 직접 정의)
```

`00_Readme`(0:1) 원문 발췌(요약이 아닌 실제 text node 내용):

```text
"퍼뜩 · PUTDUK — Spark Dash Consumer UI"
"STATUS: Desktop Final Close Candidate · Founder Review Pending · NOT PRESENTATION_TRUTH"
"Product IA: Home · Wallet · My" / "Approved Visual Direction: Spark Dash"
"Business Truth: Backend / Engine / Money / Ledger"
"Presentation Truth: Founder 승인 후 이 Native Figma"   <- 조건문. 승인 전에는 truth가 아니다.
"가짜 참여자 수 / 가짜 카운트다운 / 가짜 매칭 % / fake money 금지"
"USDT primary · KRW reference only"
"Old Visual Master / Lux / fixed 5-tab authority = 0"
```

`03_Components`(2:68) 실사 - 15개 최상위 frame 전수(생략 없음):

| node | name | 분류 |
|---|---|---|
| 11:2 | PUTDUK / File Readme | README(화면 아님) |
| 46:2 | Home / Desktop / **Backup** before Final Truth+Visual Overhaul | **BACKUP** |
| 72:762 | Home / Mobile / Spark Dash / 390x693 **Review** | **BACKUP**(Review = 미승인, Home 실제 authority는 screenshot freeze) |
| 76:2 | Opportunities / Desktop / Spark Dash / **Founder Review Pending** | **FOUNDER_REVIEW_CANDIDATE** |
| 96:2 | Opportunity Room / Desktop / Spark Dash / **Founder Review Candidate** | **FOUNDER_REVIEW_CANDIDATE** |
| 103:315 | Participate Confirmation / Desktop / Spark Dash / **Founder Review Candidate** | **FOUNDER_REVIEW_CANDIDATE** |
| 104:43 | Opportunity Room / Mobile / Spark Dash / **Founder Review Candidate** | **FOUNDER_REVIEW_CANDIDATE** |
| 109:28 | Opportunity Room / Mobile / Scroll Content / Founder Review | **FOUNDER_REVIEW_CANDIDATE**(서브 변형) |
| 116:28 | Opportunities / Mobile / Spark Dash / **Founder Review Candidate** | **FOUNDER_REVIEW_CANDIDATE** |
| 122:34 | Opportunities / Mobile / Empty State / Founder Review | **FOUNDER_REVIEW_CANDIDATE**(빈 상태 변형) |
| 140:34 | Execution / Mobile / Running / Spark Dash / Founder Review Candidate | **FOUNDER_REVIEW_CANDIDATE** |
| 140:142 | Execution / Mobile / Requeue / Spark Dash / Founder Review | **FOUNDER_REVIEW_CANDIDATE** |
| 140:250 | Execution / Mobile / Success / Spark Dash / Founder Review | **FOUNDER_REVIEW_CANDIDATE** |
| 140:358 | Execution / Mobile / Safe Stop / Spark Dash / Founder Review | **FOUNDER_REVIEW_CANDIDATE** |
| 155:222 | Execution / Desktop / Running / Spark Dash / Founder Review Candidate | **FOUNDER_REVIEW_CANDIDATE** |

**APPROVED_AUTHORITY = 0건.** 파일 안의 모든 화면급 frame이 스스로 "Founder Review Pending/Candidate" 또는 "Backup"이라고 선언하고 있다 - 최근에 발견됐다는 이유로, 혹은 내용이 상세하다는 이유로 이것을 임의로 승격하지 않는다.

### 교차검증(독립된 두 소스가 서로를 확증)

1. `46:2`(Home Desktop) 내부 레이어명 - "Asset / Hero Lightning Raster", "Asset / Opportunity Energy Raster", "Asset / ProductMedia Sneaker", "Brand / Spark", "Icon / Home" 등이 실제 repo의 `apps/web/public/spark-dash/{hero-lightning-raster.png,opportunity-energy.png,product-sneaker.png,brand-spark.svg,icon-home.svg}` 파일명과 **정확히 일치** - 기존 committed 에셋이 이 Figma frame에서 나왔다는 물리적 증거.
2. `76:2`/`116:28`(Opportunities) = "Founder Review Pending/Candidate" <-> `docs/product/consumer/CONSUMER_CORE_LOOP_CONTRACT.md`가 독립적으로 이미 서술한 "`/profits` Spark Dash. Discovery only. **Founder Review Candidate**"와 완전 일치.
3. `103:*`(ParticipateConfirmSheet 컴포넌트, 11개 state: ready/issuing/submitting/accepted/reused/preflight_required/insufficient/stale/expired/blocked/auth) = 실제 코드 `participate-sheet` 타입의 PHASE_* 상수와 상태명 1:1 일치.
4. `139:92`/`155:222`/`140:*`(ExecutionMotionCore: Running/Requeue/Success/SafeStop) = `settlement_rule.cjs`/`TradeExecutionState.status`의 실제 상태값과 일치. CUX-005 모션 주석 텍스트 안에 **"founder workstation = Celeron G6900 2C/2T, ~8GB RAM"**이 그대로 적혀 있음 - 이는 이 repo의 `phase0-ram.mdc`가 기록한 이 워크스테이션의 실제 사양과 완전히 동일한, 우연일 수 없는 프로젝트 고유 정보. **이 Figma 파일이 이 프로젝트를 위해, 이 프로젝트의 실제 제약을 알고 작성되었다는 결정적 증거.**
5. `161:102`(Design Fixture Policy) 원문: `"KNOWN_GAP: TradeExecutionState has no KRW secondary field today... implementation must wire a real FX-secondary owner (CurrentFxApprox single owner) before shipping KRW on this screen, or omit KRW until it exists. missing != 0."` - 이 repo 전역의 `FX_SECOND_TRUTH=0`/`MISSING_TO_ZERO=0` 불변식과 정확히 동일한 원칙을 독립적으로 명시하고 있음.

결론: **이 fileKey는 진짜이고, 이 프로젝트 전용이며, 신뢰할 수 있는 상세 후보 설계다.** 그러나 "진짜 파일을 찾았다" != "안의 화면들이 승인됐다". 파일 스스로도 이를 구분해서 선언하고 있으므로 그 선언을 그대로 존중한다.

### Home 기존 authority와의 충돌 여부 - 침범 없음 확정

`46:2`는 이름 자체가 "**Backup** before Final Truth+Visual Overhaul"이다. 즉 Figma 파일 스스로 이것이 최종본이 아니라 이후 실제 코드에서 진행된 "Final Truth+Visual Overhaul"(=현재 `governance/consumer-home-approval/home-approval-freeze.v1.json` screenshot baseline, 2026-08-19 승인)보다 **먼저 만들어진 백업**이라고 선언한다. 따라서 이 frame이 Home의 authority를 덮어쓸 수 없고, `home-presentation-freeze.mdc`가 정한 기존 screenshot 권위는 그대로 유지된다. Round2~4에서 이미 확정한 "Home Freeze 예외"는 이번 실사로 오히려 강화 확증되었다(변경 없음).

### FIGMA_PROJECT_REGISTRY(확정 - 영구 보존, 재요청 금지)

```yaml
PUTDUK_FIGMA_AUTHORITY:
  fileKey: w7Yg8j2x9evuheOSSLqFw5
  fileName: "퍼뜩 · PUTDUK — Spark Dash Consumer UI"
  team: "퍼뜩의 팀"
  pages: ["00_Readme(0:1)", "03_Components(2:68)"]
  designSystemLibraries: [Material3, SimpleDesignSystem, "Apple platform kits x5"]  # PUTDUK 전용 라이브러리 없음
  authorityStatus: FOUNDER_REVIEW_CANDIDATE   # 파일 자체 선언, APPROVED_AUTHORITY 아님
  homeAuthorityConflict: NONE (46:2는 자기선언 BACKUP, 기존 screenshot freeze가 여전히 유일 authority)
  candidateFrames:
    home_desktop_backup: "46:2"
    home_mobile_review: "72:762"
    opportunities_desktop: "76:2"
    opportunities_mobile: "116:28"
    opportunities_mobile_empty: "122:34"
    opportunity_room_desktop: "96:2"
    opportunity_room_mobile: "104:43"
    opportunity_room_mobile_scroll: "109:28"
    participate_confirmation_desktop: "103:315"
    execution_desktop_running: "155:222"
    execution_mobile_running: "140:34"
    execution_mobile_requeue: "140:142"
    execution_mobile_success: "140:250"
    execution_mobile_safestop: "140:358"
  componentLibraryNode: "2:68"  # PrimaryButton/StatusBadge/RequiredCapital/NavItem/WalletSummary/
                                 # PartnerBadge/OpportunityCard/AIInsight/ParticipateConfirmSheet/
                                 # ExecutionMotionCore + CUX-005 모션 스펙 3종
  lastVerifiedAt: "2026-08-20"
  discoveredVia: RECOVERED_PROJECT_CONTEXT   # repo AUTO_DISCOVERY=0건, 사용자가 별도 인계기록에서 회수해 제공
```

REL-009(Figma Integration Infrastructure, Lock 이후 실행)는 이 레지스트리를 그대로 재사용한다. 각 candidate frame을 실제 화면 구현(REL-106~110)에 반영할 때는 여전히 개별 Founder 승인 확인이 필요하며, "파일이 진짜였다"가 "화면이 승인됐다"로 자동 치환되지 않는다.

```text
FIGMA_AUTO_DISCOVERY_ATTEMPTED = TRUE (0건 - 정정하지 않고 그대로 기록)
REPEATED_FIGMA_URL_REQUEST = 0 (사용자가 자발적으로 제공, Cursor가 재요구하지 않음)
KNOWN_FIGMA_FILEKEY_NOT_REUSED = 0
UNNECESSARY_FIGMA_HUMAN_ESCALATION = 0
FIGMA_ACCESS_UNVERIFIED = 0 (get_metadata·get_libraries 실호출로 실제 검증 완료)
FOUNDER_APPROVAL_FABRICATED = 0 (전 frame이 스스로 미승인 선언 - Cursor가 승인으로 조작하지 않음)
HOME_AUTHORITY_OVERWRITTEN_BY_FIGMA = 0 (46:2는 self-declared BACKUP, 기존 freeze 유지)
```

## A. 라운드 1(유지) / A2. 라운드 2(유지) - 요약

라운드1: placeholder 제거(94개 REL 전량 생성) / Engine Acceptance 위치 수정 / REL-000 분류 파이프라인 / Figma-Lock 분리 / 거버넌스 개정 태스크 / QA Lab 2단계 / Surface Matrix 신설.
라운드2: PRE-LOCK-001 분리로 deadlock 완전 해소 / REL-002·003 branch-PR-merge 전환 / QA_ENV_ISOLATION_GUARD 신설 / Playwright MCP-committed spec 권위 분리 / REL-701-PRE 추측 제거(A0->A3 검증) / Surface count 정규화(34 surface/42 route/6 grouped-compat, AI는 별도 매트릭스).
상세는 이 파일의 이전 개정 이력과 동일하며 이번 라운드에서 되돌리지 않는다.

## A3. 라운드 3 수정 반영(신규, 이번 요청 2건)

1. **LEGACY PLAN MIGRATION** -> §I. 21개 plan 전량에 대해 CONTENT_AUTHORITY/EXECUTION_AUTHORITY 이원 표기 + REGISTRY 테이블 신설. **교차검증 중 실제 갭 2건을 발견해 즉시 반영**: Track E의 Push/WebAuthn/인증(E-PWA-002~004,007)이 REL-014 하나로는 커버되지 않아 REL-020~023으로 분리 신규 생성했고, 레거시 `opportunity_reprice_freshness` 플랜의 산출물(`opportunity-reprice.service.ts`)을 REL-003 복원 대상에 추가했다.
2. **AUTONOMOUS VISUAL ASSET PIPELINE + RESPONSIVE/PERFORMANCE EXCELLENCE** -> §J, §K 신설. 기존 `verify:toast-emoji`/`verify:cute-emoji-palette`(카피 안의 절제된 이모지)와 충돌하지 않도록 신규 이모지 금지 규칙은 "아이콘/일러스트/사진 대체" 용도에만 한정. Home(REL-105)은 이미 Founder 승인·LOCKED 상태이므로 신규 반응형/에셋 요구를 소급 적용하지 않는다(Home Freeze 우선).

## A4. 라운드 5 수정 반영(신규, 이번 요청 4건 + Figma 실사)

1. **Figma 실사 완료** - §PRE-LOCK 전면 재작성. fileKey `w7Yg8j2x9evuheOSSLqFw5`를 실제 MCP로 호출해 2 page/15 frame을 전수 분류했다. 결과는 APPROVED_AUTHORITY 0건, 전부 BACKUP 또는 FOUNDER_REVIEW_CANDIDATE. `FIGMA_URL_BLOCKER=0`으로 해제했으나 `PLAN_LOCKED`는 사용자 최종 승인 전까지 그대로 FALSE 유지(이번 라운드에서 자동으로 TRUE 전환하지 않음).
2. **TOTAL_REL 정합성** - 헤더 108 vs Validator 101의 stale 불일치를 실제 REL ID 전수 재계산으로 해소했다. REL-504를 readiness-check(§3 참조)로 재정의하며 실제 apply 작업을 REL-701-DB로 신규 분리한 결과 **109**로 확정(§F 재계산).
3. **Engine Acceptance 의존성 속성화** - §C를 고정 range(`REL-400~404`) 방식에서 `PROTECTED_SCOPE_MUTATION=TRUE` 속성 자동수집 방식으로 전환. REL-405~409를 포함해 전 REL을 재검사한 현재 목록을 §C에 명시했다.
4. **REL-504 위치 재검증** - Track F 원문(`F-REL-001`)을 재대조한 결과 "원격 Supabase migration **적용**"은 명백히 실제 production DB mutation이며 단순 readiness verification이 아니다(원문에 `Founder/GPT 명시 승인 전 apply_migration 금지` 명시). 따라서 QA-Final의 REL-504는 **readiness check만** 담당하도록 재정의하고, 실제 `apply_migration` 실행은 **REL-701-DB**(Production 구간, staging 회귀+rollback 연습 이후, A1)로 분리 이동했다.
5. **Home 반응형 예외 정밀화** - `RESPONSIVE_REQUIRED=NO_RETROACTIVE`가 "대형화면에서 깨져도 무방"으로 오독될 여지를 제거했다. `HOME_RETROACTIVE_VISUAL_REDESIGN=NO`(시각 재작업 없음)와 `HOME_LARGE_SCREEN_SAFETY_QA=YES`(2560/3440/3840에서 overflow/clipping/absurd-stretch/interaction-break/성능저하 없음을 구조적으로만 검증)를 분리했다(§D, §K).

## A5. 라운드 6 수정 반영(신규 - LEGACY PLAN 통합 엄격화)

사용자가 "pointer-only migration"을 명시 거부하고, 21개 legacy plan의 **모든 atomic todo**를 5분류(VERIFIED_DONE/DUPLICATE/INVALID/SUPERSEDED/CANONICAL_WORK_REQUIRED)로 판정 + 전 CANONICAL_WORK_REQUIRED를 REL/POST 12+필드 완비로 편입 + 전수 traceability table + 기계적 검산을 요구했다. §I를 전면 재작성했다:

1. **atomic 전수 파싱** - 21개 파일에서 실제로 309개 atomic todo(레거시9=222+CurrentMaster·TrackA-G=83+슬라이스4=4)를 하나씩 Read하고 ID/원문/status를 그대로 인용했다(요약 아님).
2. **5분류 + traceability table** - 309건 전부를 §I.1~I.3의 21개 표에 개별 행으로 기록했다. 결과: VD=195·DUP=6·INV=0·SUP=1·CWR=107(레거시9의 1차 CWR 54건 + CurrentMaster/TrackA-G의 최종 CWR 53건, 이중집계 방지 주석 포함).
3. **본 세션 실제 재검증(추정 아님)** - Track B의 "completed" 선언 3건을 grep/Read로 직접 확인(`OpportunityDetailClient.tsx`/`TradeExecuteClient.tsx`/`TradesClient.tsx` 전부 실배선, PendingFigma 아님) + Track B/C의 certification 4건이 인용한 verify 스크립트 4종 실재 확인. 이 결과로 **REL-101~104·106~110·113·120·121·123~128**의 content를 "전면 클로저"에서 "backend 완료 확인+잔여 게이트/Figma 정합만"으로 갱신했다.
4. **gap 발견 + 신규 REL/POST** - Track A-G의 canonical task 중 REL/POST 커버리지 0건이던 6개 REL(Admin 3: REL-222~224 / Production cert 3: REL-505~507)과 19개 POST(Marketing/CAPI/SEO 7 + Ads자동화 5 + Admin post-core 4 + PWA v2 2 + Phase1 adapter 1)를 신규 생성했다. POST는 §L에서 ID/TITLE/STATUS/SOURCE_PLAN/SOURCE_TODO_IDS/ORIGINAL_INTENT/CURRENT_SCOPE/DEPENDENCIES/IMPLEMENTATION_STEPS/VERIFY/ACCEPTANCE/EVIDENCE/EXIT_GATE 13필드를 전부 완비했다(주제명 나열이 아니다).
5. **기계적 검산** - §I.1~I.4에서 파일별 `ORIGINAL_ATOMIC_TODO_COUNT = VD+DUP+INV+SUP+CWR` 및 `CWR = MAPPED_TO_EXECUTABLE_MASTER_TASK` 검산을 전부 PASS시켰다(§I.4 GRAND TOTAL: 195+6+0+1+107=309).
6. **TOTAL_REL/POST 갱신** - REL 109->**115**, POST 0->**19**. §F Validator에 11개 신규 체크(`UNKNOWN_OLD_TODO=0` 등)를 추가했다.

## B. Foundation 상세(REL-000 ~ REL-023)

REL-000~016은 라운드2와 동일(§B 이전 개정판 참조). 이번 라운드 변경/신규만 기술한다.

### REL-003 갱신 - 복원 대상 파일 추가

기존 목록에 `services/api-nest/src/opportunities/opportunity-reprice.service.ts`를 추가한다(레거시 `ai_profit_os_opportunity_reprice_freshness.plan.md`가 `COMPLETED=YES`·`COMMIT_PUSH=FORBIDDEN`으로 남긴 미커밋 산출물로 추정 - REL-003 실행 시 실제로 이 파일의 diff가 해당 플랜의 서술과 일치하는지 먼저 확인한다).

### REL-014 갱신 - 스코프 축소

기존 REL-014는 "PWA 전체"로 뭉뚱그려 있었으나, Track E 원문 재대조 결과 `E-PWA-001`(manifest+Serwist+install+SW)만 해당하고 `E-PWA-002~004,007`은 누락되어 있었다. REL-014는 이제 **E-PWA-001만** 담당한다.

### REL-017 - LEGACY_PLAN_MIGRATION_REGISTRY(신규)

`.cursor/plans/**` 21개 파일 전량을 실사하여 아래 §I 레지스트리를 확정판으로 완성하고, 각 파일 frontmatter에 다음을 실제로 기입한다:

```text
과거 전부(Track A-G, Current Master 포함):
  EXECUTION_AUTHORITY = NO
Track A-G, Current Master(WHAT authority 유지 대상)만:
  CONTENT_AUTHORITY = YES
  SUPERSEDED_FOR_EXECUTION_BY = PUTDUK_RELEASE_MASTER.plan.md
그 외(레거시 9 + 완료 이력 4건):
  CONTENT_AUTHORITY = NO (또는 HISTORICAL_REFERENCE_ONLY)
  SUPERSEDED_BY = PUTDUK_RELEASE_MASTER.plan.md
  DO_NOT_EXECUTE = YES
```

삭제 없음. `pnpm cursor:sync-plans` 재실행으로 UI 미러 동기화.

### REL-018 - ASSET_PRODUCTION_PIPELINE 인프라화(신규)

기존에 이미 존재하는 애드혹 스크립트(`apps/web/scripts/download-spark-dash-assets.mjs`, `download-spark-dash-mobile-assets.mjs`, `process-product-sneaker.mjs` 등)를 표준 파이프라인으로 통합한다. 상세는 §J.

### REL-019 - RESPONSIVE_DEVICE_TIER_SYSTEM 통합(신규)

기존 `detectDeviceTier()`(cores/memory/reduced-motion/saveData 기반 S/A/B 판정, 레거시 03 UI 플랜에 정의됨) 및 `verify:ux-design-system`을 재사용/승격한다. 신규 시스템을 새로 발명하지 않는다. 상세는 §K.

### REL-020~023 - PWA 잔여(신규, Track E 재대조로 발견)

- REL-020 Push+Badge: VAPID 키 자체 생성(외부 계정 불필요, A3), `workers/push-dispatcher`(scaffold 존재) 재사용, Admin push kill switch 연동.
- REL-021 자동 Push 채널 필터: `notification_prefs` 테이블 재사용, notice/campaign/opportunity 분리.
- REL-022 WebAuthn UX/RP + haptics fallback: Money §43 fallback 계약 재사용.
- REL-023 PWA 인증: REL-014,020,021,022 통합 인증, Lighthouse PWA 카테고리 포함. `store-bridge`(E-PWA-005/006)는 Track E 원문이 이미 "Day-1 게이트 제외"로 자체 선언했으므로 **의도적으로 REL 큐에서 제외**(누락이 아님).

## C. Engine Acceptance 재배치 메커니즘(Round5: 고정 range -> 속성 기반으로 전환)

### 문제였던 것

기존 표기 `REL-005~023, REL-100~305, REL-400~404`는 REL-502의 의존 구간을 **숫자 range**로 고정했다. Round4에서 `REL-405~409`(RBAC/KillSwitch/PriceOverride/Security-RLS 등, 명백히 protected root를 건드리는 작업)가 신규로 생겼는데도 range 끝이 `404`에 머물러 있었다면 REL-502가 그 완료를 기다리지 않고 통과할 수 있었다 - 이것이 정확히 사용자가 지적한 위험이다.

### 해결 - PROTECTED_SCOPE_MUTATION 속성 자동수집

숫자 range를 버리고, **모든 REL 항목에 `PROTECTED_SCOPE_MUTATION` 불리언을 부여**한다. 대상 protected root는 기존 `governance/engine-acceptance/protected-scope.v1.json`과 동일하게 `services/api-nest/**`, `services/engine-rust/**`, 관련 `schemas/**`, `eval/**`, `supabase/migrations/**`로 고정한다.

```text
REL-502 dependency = { REL_id | REL_id.PROTECTED_SCOPE_MUTATION == TRUE }
(고정 range 아님 - 이후 REL이 추가되고 그것이 protected root를 건드리면
 자동으로 REL-502 의존 집합에 편입된다. 사람이 매번 range를 다시 세지 않는다)
```

### 현재 시점 실제 계산 결과(REL-000~409 전량 재검사, 2026-08-20)

| PROTECTED_SCOPE_MUTATION=TRUE | 근거 |
|---|---|
| REL-003 | supabase/migrations 3건 + services/api-nest/src/opportunities 복원 |
| REL-008 | settlement_rule.rs/.cjs parity 불일치 발견 시 engine-rust 수정 가능성(보수적 TRUE) |
| REL-010 | services/api-nest 인증 rate limiting |
| REL-015 | services/api-nest 신규 ledger 조회 API |
| REL-016 | services/api-nest 서버측 observability 계측 |
| REL-020, REL-021, REL-022 | services/api-nest push/알림설정/WebAuthn 신규 엔드포인트 |
| REL-401 | services/api-nest 보안 헤더 미들웨어 |
| REL-405, REL-406, REL-407, REL-408 | services/api-nest 신규 모듈 + supabase RLS/migration(RBAC/KillSwitch/PriceOverride/Security baseline) |
| REL-222, REL-223, REL-224 | (Round6 신규) services/api-nest 신규 모듈(3-mode ops·allocation/bulk·source health override) + supabase(policy versioning history 테이블) |

나머지(REL-000~002,004~007,009,011~014,017~019,023, REL-100~131, REL-200~221, REL-300~305, REL-400,402~404,409, REL-505~507)는 **현재 시점 기준 FALSE**(apps/web·apps/admin·tooling·문서·governance만 건드림, 또는 순수 검증/집계라 protected root를 수정하지 않음). 단, 실행 중 예상 밖의 backend 변경이 필요해지면 그 즉시 해당 REL에 TRUE를 재부여하고 REL-502 집합에 편입한다(동적 재평가 - 사전 고정 아님).

```text
REL-004(경량 sanity) -> [PROTECTED_SCOPE_MUTATION=TRUE 전체(위 표 + 동적 추가분)]
  -> REL-502 FINAL ENGINE ACCEPTANCE -> REL-503 STALE 감시 -> REL-600 Staging
```

```text
UNTRACKED_PROTECTED_SCOPE_TASK = 0 (전 REL 재검사 완료, 위 표가 현재 시점 전량 - Round6 신규
  REL-222~224 포함 16건, REL-505~507은 검증/인증 성격이라 FALSE 유지)
FINAL_CERTIFICATION_INVALIDATED_BY_LATER_TASK = 0 (REL-502가 고정 range가 아니라
  속성을 구독하므로, 이후 신규 REL이 protected root를 건드려도 자동으로 REL-502
  의존에 편입되어 "인증 후 몰래 protected scope 변경"이 구조적으로 불가능해짐)
```

## D. SURFACE RELEASE MATRIX (Consumer + Admin)

Consumer(REL-100~131, 34 surface + 6 grouped-route + Account Hub Figma REL-131) / Admin(REL-200~224, 22 route/21 surface + 3 ops) 매트릭스 기본 구조는 라운드2와 동일. 이번 라운드는 PRE-LOCK-001 실사 결과로 FIG 컬럼과 Home 반응형 필드를 실측값으로 갱신한다(더 이상 TBD 아님, 해당 화면만):

- **REL-105(Home)**: `FIG=46:2(Desktop)/72:762(Mobile), 분류=BACKUP(authority 아님, 기존 screenshot freeze 유지)` · `ASSET_REQUIRED=NO(이미 확보-committed)` · `HOME_RETROACTIVE_VISUAL_REDESIGN=NO`(시각 재작업 없음, freeze 유지) · `HOME_LARGE_SCREEN_SAFETY_QA=YES`(2560/3440/3840 구조적 안전 QA는 수행 - §K 참조, "소급 없음"이 "검사 안 함"으로 오독되지 않도록 명시 분리)
- **REL-106(OpportunityList)**: `FIG=76:2(Desktop)/116:28(Mobile)/122:34(Mobile Empty), 분류=FOUNDER_REVIEW_CANDIDATE` - 기존 code상 "Founder Review Candidate" 서술과 교차확증됨. 구현 시 이 frame을 REFERENCE로 삼되, 실제 승격은 Founder 승인 이후에만.
- **REL-107(OpportunityDetail/Opportunity Room)**: `FIG=96:2(Desktop)/104:43+109:28(Mobile), 분류=FOUNDER_REVIEW_CANDIDATE`
- **REL-108(ParticipateConfirmation)**: `FIG=103:315(Desktop, 컴포넌트 상세는 03_Components의 103:314 ParticipateConfirmSheet 11-state), 분류=FOUNDER_REVIEW_CANDIDATE`
- **REL-109/110(Matching/execute, MatchingResult)**: `FIG=155:222(Desktop Running)/140:34,140:142,140:250,140:358(Mobile Running/Requeue/Success/SafeStop), 분류=FOUNDER_REVIEW_CANDIDATE`. CUX-005 모션 스펙(에너지 블룸/오빗링/스캐너 스윕/스파크 파티클/상태전이 크로스페이드 등, 각각 DURATION/EASING/REDUCED_MOTION 명시)이 구현 참조 대상 - 단, 애니메이션은 서버 확정 tick보다 절대 선행하지 않는다는 원칙(원문에 명시)을 반드시 준수.
- 그 외 Consumer/Admin 전 행(Signup/Login/Wallet/Deposit/Withdraw/Referral/Notifications/AIInsight/Profile/Kyc/Settings/Support/Guides/Legal/PartnerTrust 및 Admin 전량): `FIG=NOT_FOUND_IN_THIS_FILE`(이 Figma 파일은 Home/Opportunities/Room/Participate/Execution만 포함하고 있고, 나머지 화면의 candidate design은 존재 확인이 안 됐다 - "이 파일에 없다"를 "권위가 없다"로 왜곡하지 않고 정직하게 NOT_FOUND로 표기)
- REL-122(AIInsight): `ASSET_CLASS=illustration/avatar` `ASSET_SOURCE=candidate existing(apps/web/public/spark-dash/{ai-orb,ai-eye-right,ai-pink-glow,ai-ring,mobile-ai-agent,mobile-ai-orb}.svg - 실행 시 재사용 가능 여부부터 확인, 무조건 신규 생성 금지)`
- REL-129(PartnerTrust): `ASSET_CLASS=logo` `ASSET_SOURCE=1순위 고정(실제 파트너 공식 로고만, AI 생성 절대 금지)`
- 그 외 전 행: `ASSET_REQUIRED=TBD_AT_EXECUTION`(위에서 FIG가 확정된 화면 외에는 여전히 실행 시 화면별로 확정)

```text
HOME_RESPONSIVE_SAFETY_GAP = 0 (HOME_RETROACTIVE_VISUAL_REDESIGN=NO와
  HOME_LARGE_SCREEN_SAFETY_QA=YES를 분리 명시함으로써, "Home은 검사 안 해도
  된다"는 오독이 구조적으로 불가능해짐 - REL-105/REL-601 양쪽에 동일하게 적용)
```

## D2. AI CAPABILITY RELEASE MATRIX (변경 없음 - Round2 내용 유지, REL-300~305)

## E. Hardening/QA-Final/Staging/Production(REL-400~704)

REL-404는 Lighthouse뿐 아니라 §K의 성능예산(이미지 포맷/lazy-load/번들)을 포함한다(라운드3 변경, 유지).

### Round5 변경 - REL-504 분리(readiness check vs 실제 apply)

Track F 원문(`F-REL-001`)을 다시 확인한 결과:

```text
"SourceObservation+CanonicalProduct 원격 Supabase migration 적용(별도 승인 슬라이스)
 · Founder/GPT 명시 승인 전 apply_migration 금지 · RISK=HIGH"
```

"원격 Supabase migration **적용**"은 readiness verification이 아니라 **실제 production DB mutation**이다. 따라서 이를 하나의 REL-504로 QA-Final(500번대)에 두면, staging 회귀나 rollback 연습보다 먼저 production DB가 바뀌는 순서 오류가 구조적으로 가능해진다. 이를 막기 위해 둘로 분리한다:

```text
REL-504 [QA-Final, A3] PRODUCTION_MIGRATION_READINESS_CHECK
  = Track A local proof 완료 + REL-408 보안 baseline 완료 + migration 파일 리뷰
  = production을 건드리지 않는 순수 검증/보고
  -> READY 신호만 생성

REL-701-DB [Production, A1, HUMAN_ESCALATION] PRODUCTION_MIGRATION_APPLY
  = 실제 apply_migration 호출(원격 Supabase 실제 스키마 변경)
  = deps: REL-504(readiness) + REL-601(staging 전체 회귀 PASS) + REL-602(rollback 연습 PASS)
  = Founder 명시 승인 없이는 절대 실행하지 않음
  = REL-701(앱 배포 트리거)보다 먼저 실행 - 앱이 의존할 스키마가 먼저 존재해야 하므로
```

```text
STAGING_BEFORE_PRODUCTION_DB_MUTATION = TRUE
  (순서: migration 소스코드 -> QA Supabase branch -> integration tests -> REL-504 readiness
   -> REL-600 staging 배포 -> REL-601 staging 전체회귀 -> REL-602 rollback 연습
   -> REL-700 production 준비도 집계 -> REL-701-DB 실제 migration apply(Founder 게이트)
   -> REL-701 production app 배포 -> REL-702 smoke)
PRODUCTION_DB_MUTATION_BEFORE_STAGING_PASS = 0 (REL-701-DB가 REL-601/602 완료를
  명시적으로 의존하므로 구조적으로 불가능)
```

그 외 REL-400~409, REL-500~503, REL-600~603, REL-700~704는 이전 라운드와 동일.

## F. Master Plan Validator - 자기 감사 결과(Round6, LEGACY ATOMIC ACCOUNTING 전면화)

```text
EXACTLY_ONE_CURRENT_RELEASE_MASTER = TRUE

--- Round7 갱신: TOTAL_REL/POST 정합성(전수 재계산) ---
HEADER_TOTAL_REL = 116
VALIDATOR_TOTAL_REL = 116
ACTUAL_REL_COUNT(frontmatter `- id: rel-` grep 실카운트) = 116
HEADER_TOTAL_POST = 19
VALIDATOR_TOTAL_POST = 19
ACTUAL_POST_COUNT(frontmatter `- id: post-` grep 실카운트) = 19
STALE_TOTAL_REL_COUNT = 0 (115 -> 116, REL-131 Account Hub Figma 1건)

REL 구간별 개수(Round7 갱신):
  Foundation    REL-000~023               = 24
  Consumer      REL-100~131(신규 131)     = 32
  Admin         REL-200~224               = 25
  AI Capability REL-300~305               = 6
  Hardening     REL-400~409               = 10
  QA-Final      REL-500~507               = 8
  Staging       REL-600~603               = 4
  Production    REL-700,701-pre,701-db,701,702,703,704 = 7
  합계 = 24+32+25+6+10+8+4+7 = 116 (OK)

POST 구간별 개수(Round6 신규):
  Marketing/CAPI/SEO   POST-001~007 = 7 (IMPORTANT_POST_CORE)
  Ads 자동화            POST-008~012 = 5 (PHASE2)
  Admin post-core       POST-013~016 = 4 (IMPORTANT_POST_CORE)
  PWA Store Bridge v2   POST-017~018 = 2 (PHASE2/v2)
  Runtime P1 adapter    POST-019     = 1 (phase-gate 대기)
  합계 = 7+5+4+2+1 = 19 (OK)

--- Round6 신규: LEGACY ATOMIC ACCOUNTING(§I 전면 재작성) ---
ALL_LEGACY_PLAN_FILES_READ = TRUE (21/21, todo 전문 Read 완료)
ALL_LEGACY_ATOMIC_TODOS_EXTRACTED = TRUE (309/309, §I.4 GRAND TOTAL 검산: 195 VD+6 DUP+0 INV+1 SUP+107 CWR=309)
LEGACY_TODO_ACCOUNTING_MISMATCH = 0 (21개 파일 각각 ORIGINAL_ATOMIC_TODO_COUNT = 5분류 합, §I.1~I.3 개별 검산 전부 PASS)
UNMAPPED_VALID_OLD_TODO = 0 (Track A-G의 CWR 53건 전부 REL/POST 보유 확인, §I.2 개별 표)
POINTER_ONLY_MIGRATION = 0 ("Track X에 있음"에서 멈추지 않고 전부 구체 REL-XXX/POST-XXX ID까지 도달 -
  POST 19건은 §L에서 13필드 완비, 신규 REL 6건은 §B/§E에 배치+deps 명시)
DETAILLESS_POST_TASK = 0 (POST-001~019 전부 ID/TITLE/STATUS/SOURCE_PLAN/SOURCE_TODO_IDS/
  ORIGINAL_INTENT/CURRENT_SCOPE/DEPENDENCIES/IMPLEMENTATION_STEPS/VERIFY/ACCEPTANCE/
  EVIDENCE/EXIT_GATE 13필드 §L에 완비)
UNKNOWN_OLD_TODO = 0
UNVERIFIED_COMPLETED_EXCLUSION = 0 (Track B의 completed 선언 3건[b-participation-001/
  b-execution-001/b-trades-001]을 본 세션에서 grep+Read로 직접 재검증 - OpportunityDetailClient.tsx/
  TradeExecuteClient.tsx/TradesClient.tsx 전부 실제 배선 확인, PendingFigma 아님. Track B/C의
  certification 선언 4건이 인용한 verify 스크립트 4종[acquisition-release/account-hub-release/
  core-loop-release/wallet-release] 실재 확인)
ORIGINAL_USER_INTENT_LOST = 0 (Track G Marketing 7+Ads 5, Track D post-core 4, Track E v2 2,
  Track F phase-gate 1 = 19건이 REL 큐 밖이라는 이유로 방치되지 않고 POST-001~019로 보존)
DUPLICATE_EXECUTION_TASK = 0 (launch archive 6건은 00_index 동일 ID의 completed 버전을
  canonical로 명시 지정, 실행 대상에서 제외)
CONFLICTING_EXECUTION_TASK = 0 (발견 3건 전부 해소 기록: R1 Home 이중구현 SUPERSEDED 판정 ·
  auth-kakao-oauth-runtime legacy stale status 정정 · launch archive stale pending 6건 DUP 판정)

--- Round5 검증(재확인, 변화 없음) ---
UNTRACKED_PROTECTED_SCOPE_TASK = 0 (REL-000~507 전량 재검사, PROTECTED_SCOPE_MUTATION=TRUE
  16건[REL-003,008,010,015,016,020,021,022,222,223,224,401,405,406,407,408] 전부 REL-502 의존에 편입)
FINAL_CERTIFICATION_INVALIDATED_BY_LATER_TASK = 0
PRODUCTION_DB_MUTATION_BEFORE_STAGING_PASS = 0
STAGING_BEFORE_PRODUCTION_DB_MUTATION = TRUE
HOME_RESPONSIVE_SAFETY_GAP = 0
FIGMA_URL_BLOCKER = 0
FIGMA_ACCESS_UNVERIFIED = 0
FOUNDER_APPROVAL_FABRICATED = 0
HOME_AUTHORITY_OVERWRITTEN_BY_FIGMA = 0

--- 라운드3 검증(재확인, 변화 없음) ---
UNMIGRATED_OLD_PLAN_TODO = 0 / MULTIPLE_EXECUTION_AUTHORITY = 0 / ORPHAN_ACTIVE_PLAN = 0 /
EMOJI_PRODUCTION_ASSET = 0 / PLACEHOLDER_RELEASE_ASSET = 0 / UNQAED_GENERATED_ASSET = 0 /
UNVERIFIED_ASSET_SOURCE = 0 / RESPONSIVE_OVERFLOW_GAPS = 0 /
UNSUPPORTED_LARGE_SCREEN_SURFACES = 0 / LOW_END_PERFORMANCE_GAPS = 0 /
FIXED_WIDTH_ONLY_RELEASE_SURFACES = 0

--- 라운드1/2 검증(재확인, 변화 없음) ---
PRE_LOCK_DEADLOCK = 0 / DIRECT_AGENT_COMMIT_TO_MAIN = 0 /
PROD_DB_MUTATION_RISK_IN_QA = 0 / MCP_ONLY_TEST_AUTHORITY = 0 /
UNVERIFIED_HUMAN_REQUIREMENT = 0 / SURFACE_COUNT_AMBIGUITY = 0 /
TODO_DEPENDENCY_CYCLE = 0 / PLACEHOLDER_TODO = 0 /
CERTIFICATION_INVALIDATED_BY_LATER_TASK = 0 / DUPLICATE_SSOT_CREATED = 0

--- AUTOMATION_LEVEL 재집계(REL 116 기준, 구간별 산출) ---
구간별 A-level 분해:
  Foundation(24)    A3=23(REL-005 제외) A1=1(REL-005)
  Consumer(32)      A3=32
  Admin(25)         A3=25(200~224 전부, 222~224 포함)
  AI(6)             A3=6
  Hardening(10)     A3=10
  QA-Final(8)       A3=5(500,501,503,504,507) A2=3(502,505,506)
  Staging(4)        A3=1(601) A2=2(600,602) A0=1(603)
  Production(7)     A3=5(700,701-pre,702,703,704) A1=2(701-db,701)

A3 = 23+32+25+6+10+5+1+5 = 107
A2 = 3(QA-Final)+2(Staging) = 5
A1 = 1(Foundation)+2(Production) = 3
A0 = 1(Staging)
검산: 107+5+3+1 = 116 (TOTAL_REL과 일치)

--- POST AUTOMATION_LEVEL(19건) ---
A3 = 14 (POST-001~007[7]+POST-013~016[4]+POST-017~018[2]+POST-019[1] = 7+4+2+1=14)
A1 = 5 (POST-008~012, 전부 HUMAN_ESCALATION - 광고 계정/예산/자동집행은 항상 사람 승인)
검산: 14+5 = 19 (OK)

--- Round7 신규: GLOBAL HOME DISCOVERY / TEMP ALLOWLIST ---
TEMP_ALLOWLIST_PRESENT = TRUE
TEMP_ALLOWLIST_WORK_COMPLETE = TRUE
HOME_SOURCE_WRITE_COUNT = 0
HOME_SOURCE_DELETE_COUNT = 0
HOME_SOURCE_EXECUTION_COUNT = 0
HOME_TO_INTAKE_HASH_MISMATCH = 0
WORKSPACE_PLAN_FILES_READ = 21/21
MIRROR_DUPLICATES_VERIFIED = 21/21
PROJECT_HOME_PLAN_FILES_READ = 10/10 (prior Home-only 10) + ADDITIONAL_PUTDUK_HOME = 36
STALE_ARCHIVE_FILES_CLASSIFIED = 10/10
PROJECT_CACHE_SNAPSHOTS_CLASSIFIED = 1/1
UNACCOUNTED_PUTDUK_HOME_PLAN = 0
UNACCOUNTED_PUTDUK_HOME_TODO = 0
UNMAPPED_VALID_OLD_TODO = 0 (Home CWR 11/11 mapped: REL-131 + existing REL-106/107/109/110/112/113~119/012/019/603)
POINTER_ONLY_MIGRATION = 0
MASTER_SELF_RECURSIVE_MIGRATION = 0
RULE_FILE_MODIFIED_BY_CURSOR = 0
PRODUCT_CODE_WRITE_COUNT = 0
DB_MUTATION_COUNT = 0
RUNTIME_MUTATION_COUNT = 0
GIT_COMMIT_COUNT = 0
GIT_PUSH_COUNT = 0
GIT_MERGE_COUNT = 0
UNACCOUNTED_KNOWN_PROJECT_PLAN_SOURCE = 0
KNOWN_CACHE_SNAPSHOT_PATH_STATUS = UNRESOLVED_BUT_NON_BLOCKING
KNOWN_CACHE_SNAPSHOT_EXECUTION_RISK = 0
PROJECT_ISOLATION_BOUNDARY_RESTORED = TRUE

VALIDATOR_VERDICT = PASS. PLAN_LOCKED = TRUE. 첫 실행 TODO = REL-000 (이번 턴 미실행).
```

## G. PLAN_LOCKED = TRUE (최종 검산 PASS)

```text
UNLOCK_REQUIRES (AND):
  1. PRE-LOCK-001 완료 - [COMPLETE]
  2. 사용자 최종 검산 지시 + isolation restore + stale/dep-order 정정 - [COMPLETE]
PLAN_LOCKED = TRUE
FIRST_EXECUTION_TODO = REL-000
THIS_TURN_REL_EXECUTION = 0
```

## H. 실행 순서(Lock 이후 · 이번 턴 미착수)

1. (완료) PRE-LOCK-001 Figma 실사
2. (완료) Global Home Discovery + allowlist 삭제 + isolation restore
3. (완료) Master Validator 최종 재계산 -> PLAN_LOCKED = TRUE
4. (다음 턴) REL-000부터 TOP→BOTTOM. REL-701-DB/REL-701만 Founder 게이트에서 정지
5. REL-017은 21개 plan frontmatter stamp(분류 자체는 Master에 완료)

---

## I. LEGACY PLAN MIGRATION REGISTRY (Round6 확정판 - ATOMIC ACCOUNTING 전면 재작성)

### I.0 방법론 (Round6 - 엄격화 요구 반영)

기존(Round3~5) §I는 plan/그룹 단위 요약이었다. 사용자가 이를 "pointer-only migration"으로 명시 거부했으므로,
**21개 파일의 모든 todo를 atomic item으로 파싱**해 아래 5분류 중 정확히 하나로 판정한다.

```text
A. VERIFIED_DONE        = 현재 repo/runtime/test evidence로 실제 완료 확인
B. DUPLICATE             = 다른 canonical task와 완전 동일(canonical ID 기록)
C. INVALID                = 옛 계획이 기술적/사실적으로 잘못됨(증거 기록)
D. SUPERSEDED            = 현재 architecture/product truth로 대체됨(대체 authority 기록)
E. CANONICAL_WORK_REQUIRED = 현재도 필요·미완료 -> 반드시 REL-XXX 또는 POST-XXX로 편입(pointer-only 금지)
```

**전수 계수(실제 파싱, 추정 0):**

```text
레거시 9(00~06+launch)         = 222 atomic todo (00_index 26 · 01_money 20 · 02_engine 44 ·
                                   02.5 9 · 03_ui_ux 71 · 04_admin 18 · 05_pwa 7 · 06_infra 18 · launch 9)
Current Master + Track A-G(8)  = 83 atomic todo (Index 7 · TrackA 13 · TrackB 9 · TrackC 8 ·
                                   TrackD 20 · TrackE 7 · TrackF 7 · TrackG 12)
완료 이력 슬라이스 4개           = 4 atomic todo
----------------------------------------------------------------
GRAND_TOTAL_ATOMIC_TODO         = 309
```

**핵심 발견(Round6 신규 - 실제 코드 검증, 추측 0):** Current Master의 Track A~G는 이미 legacy 222개 중
pending 항목 다수를 개별 `SOURCE_TRACEABILITY` 컬럼으로 atomic 재매핑해 둔 **선행 완료 audit**이다
(4개 승계 audit: FULL_RECONCILIATION_AUDIT/CORRECTION_ADDENDUM/FOUNDER_REQUIREMENT_PRESERVATION_AUDIT/
FINAL_PRE_MASTER_NORMALIZATION). 이를 무시하고 처음부터 다시 만드는 것은 이미 끝난 개별 reconciliation을
버리는 행위이므로, 본 등록부는 **legacy atomic todo -> Track task ID -> REL/POST**의 3단 체인으로
traceability를 구성한다(중간 단계를 건너뛰는 것이 아니라, 이미 완료된 중간 단계를 인용하는 것).

**본 세션에서 실제로 재검증한 것(추정 아님):**
- Track B의 "completed" 선언 3건을 grep/Read로 직접 재확인: `OpportunityDetailClient.tsx`(issuePreflight+postParticipate 실호출, git status=M) ·
  `TradeExecuteClient.tsx`(useTradeExecution 실호출) · `TradesClient.tsx`(fetchTradeList+fetchWalletBuckets 실호출) — 3건 전부 REAL, PendingFigma 아님.
- Track C/B의 certification 선언 4건이 인용한 verify 스크립트 실재 확인: `tooling/verify/acquisition-release.cjs` ·
  `account-hub-release.cjs` · `core-loop-release.cjs` · `wallet-release.cjs` = 전부 파일 존재.
- 위 검증 결과로 REL-101~104·106~110·113·120·121·123~128 content를 "전면 클로저"에서
  "backend/data 완료 확인 + 잔여 게이트/Figma 정합만"으로 수정했다(§B/§D 프론트매터 갱신 완료).

**Gap 발견(Round6 신규 - Track A-G의 canonical task 중 REL/POST 커버리지 0건이던 것):**
Track D 3건(3-mode ops·allocation/bulk·source health+founder override) -> **REL-222~224 신규 생성**.
Track F 3건(R7 backend-data cert·R8 infra cert core·Production E2E) -> **REL-505~507 신규 생성**.
Track G 12건(Marketing/CAPI/SEO 7 + Ads자동화 5) + Track D post-core 4건(missions/partners/analytics/isolated-deploy)
+ Track E 2건(store-bridge v2) + Track F 1건(phase1 adapter host binding) -> **POST-001~019(19건) 신규 생성**(12필드 완비, §N).

```text
TOTAL_REL = 116 (Round6 당시 115 + Round7 REL-131. 현재 헤더/Validator와 동일)
TOTAL_POST = 19 (신규 전부: POST-001~019)
```

### I.1 레거시 9 - atomic 전수표 (222건, 생략 0)

범례: STAT=원본 status · CLS=분류(VD=VERIFIED_DONE/DUP=DUPLICATE/INV=INVALID/SUP=SUPERSEDED/CWR=CANONICAL_WORK_REQUIRED) · TARGET=canonical REL/POST/사유.

#### `00_index` (26개 - 전부 VERIFIED_DONE, foundational)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| yahoo-jp-permanent-ban | yahoo_jp 영구금지 | completed | VD | governance 반영, listing=ebay only 확인 |
| listing-legs-day1-no-jp-phone | Day1 listing ebay only | completed | VD | 상동 |
| match-tension-ux-lock | 매칭 긴장감 UX 잠금 | completed | VD | §48.3b 반영 |
| requeue-soft-hard-sla-lock | Soft60/Hard90 SLA | completed | VD | settlement_rule.rs/cjs 확인됨(본 세션) |
| cta-earn-profit-lock | CTA=수익벌기 잠금 | completed | VD | copy/ko 반영 |
| capital-provider-model-lock | 자본참여자 모델 | completed | VD | Engine §4.2b 반영 |
| opportunity-scan-expression-lock | 기회스캔 표현 | completed | VD | Engine §4.2a 반영 |
| cursor-stack-lock | ADR-014 stack-lock | completed | VD | `.cursor/rules/stack-lock.mdc` 실재(본 세션 always-rule로 확인) |
| greenfield-toolchain-015 | ADR-015 toolchain | completed | VD | `TOOLCHAIN.md` 실재 |
| constitution-bootstrap-inventory | BOOTSTRAP 실물대조 | completed | VD | `docs/CONSTITUTION_BOOTSTRAP.md` |
| brand-adr002-peotteok | 퍼뜩 브랜드 잠금 | completed | VD | `verify:brand-consumer` CATALOG 등재 |
| index-admin-bootstrap-resync-733 | 실물재감사 v7.22.33 | completed | VD | 이력 기록 |
| constitution-28-core | CONSTITUTION 14개 파일 | completed | VD | `CONSTITUTION/` 폴더 실재 |
| constitution-28-ai-money-ops | CONSTITUTION 47-51 | completed | VD | 상동 |
| schemas-contracts-core | schemas/ Day-1 | completed | VD | `schemas/*.v1.json` 다수 실재(본 세션 다수 인용) |
| schemas-migrations-supabase | supabase/migrations 초기 | completed | VD | `supabase/migrations/` 실재 |
| index-bootstrap-resync-735 | 실물재감사 v7.22.35 | completed | VD | 이력 기록 |
| monorepo-skeleton | apps/services/workers/packages 골격 | completed | VD | 전 디렉토리 Glob 확인(본 세션) |
| copy-canon-cta-sla-lock | copy/ko CTA SSOT | completed | VD | `packages/ui/copy/ko` |
| auth-ssot | OAuth/Passkey/Stage A·B | completed | VD | `services/api-nest/src/auth` 실재(본 세션 jwt-auth.guard.ts 직접 확인) |
| phase0-bootstrap-hosts | Phase0 Bootstrap $0 | completed | VD | infra 문서 |
| platform-redesign-r0-inventory | R0-1 forensic | completed | VD | `governance/platform-redesign/baseline.v1.json` |
| platform-redesign-r0-fact-state | R0-2 fact-state registry | completed | VD | `governance/platform-redesign/fact-state-registry.v1.json` |
| platform-redesign-r0-change-control | R0-3 change-control | completed | VD | `governance/platform-redesign/change-control.v1.md` |
| platform-redesign-r0-observation-registry | R0-4 observation registry | completed | VD | 이력 기록 |
| engine-acceptance-gate-status-resync | 4문서 verdict 동기화 | completed | VD | `ENGINE_ACCEPTANCE_REPORT.md` baseline 인용 확인 |

`ORIGINAL_ATOMIC_TODO_COUNT(00_index) = 26 = VD(26)+DUP(0)+INV(0)+SUP(0)+CWR(0)` ✓

#### `01_money` (20개 - 전부 VERIFIED_DONE)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| pg-gateway-ban | PG사0 용어잠금 | completed | VD | `verify:pg-module-scan` |
| money-preflight-constitution | 착수전 실물대조 | completed | VD | 이력 |
| money-double-entry | 더블엔트리 원장 | completed | VD | `services/api-nest/src/ledger/ledger.posting.service.ts` 직접 확인(본 세션) |
| money-fee-min-holding | 출금수수료+minHolding | completed | VD | `deposit-config.v1.json` |
| money-wallet-usdt-krw | USDT주소+KRW신청 | completed | VD | wallet 모듈 |
| kyc-withdraw-gate | KYC 출금1회게이트 | completed | VD | compliance 모듈 |
| money-withdraw-auth-intent | step-up+intent | completed | VD | withdraw-intent 스키마 |
| chain-watchers | 온체인 이벤트스트림 | completed | VD | `workers/chain-watchers` |
| chain-sweeper | Energy+TRX guard | completed | VD | `workers/chain-sweeper` |
| principal-profit-withdraw | 버킷UI·기본profit | completed | VD | `wallet-buckets.v1.json` |
| principal-profit-abuse-defense | P1~P24/E1~E12 | completed | VD | risk rules |
| balance-suggest-deposit | principal Fact+suggest | completed | VD | `verify:balance-aware-feed` |
| deposit-network-plain-ko | 입금네트워크한글 | completed | VD | `verify:deposit-network-plain-ko` |
| referral-program-ssot | 초대∞·Pool FIFO | completed | VD | `referral-program.v1.json` |
| practice-bucket-onboarding | practice 1회·만료 | completed | VD | `verify:practice-non-withdrawable` |
| money-user-benefits-read | GET /me/benefits 컨트롤러 | completed | VD | `BenefitsUserController` |
| redesign-r1-money-read-contract | Home Money Read Contract | completed | VD | `home-money-read.map.ts`(FORBIDDEN_RESPONSE_KEYS 확인) |
| idempotency-conflict-detection-invariant-gap | idempotency 충돌감지 | completed | VD | `verify:idempotency-conflict-detection` |
| committed-event-publication-durability-gap | outbox durability | completed | VD | Postgres outbox 패턴 |
| money-wallet-auth-remediation | practiceWelcome 인증 | completed | VD | `verify:money-wallet-auth-remediation` |

`ORIGINAL_ATOMIC_TODO_COUNT(01_money) = 20 = VD(20)` ✓

#### `02_engine` (44개 - 전부 VERIFIED_DONE)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| engine-preflight-constitution | 착수전 실물대조 | completed | VD | 이력 |
| yahoo-jp-permanent-ban(engine판) | yahoo_jp 영구금지 | completed | VD | 00_index와 동일 판정(내용 동일, 별도 파일 자체 완결본이라 DUP 아닌 각자 VD) |
| listing-legs-no-jp-phone | Day1 listing | completed | VD | 상동 |
| soft-hard-requeue-timeout | Soft/Hard SLA 잠금 | completed | VD | `match-success-rule-engine`과 세트 |
| market-intel-engine | Asset Master+pricing/FX | completed | VD | `pricing-formula.cjs`/`fx-snapshot-formula.cjs` |
| engine-override-ddl-align | override DDL↔schema | completed | VD | `user_opportunity_overrides` |
| signup-ready-adapters | ebay+pokemontcg+ygo+fx | completed | VD | `workers/*-adapter` |
| capital-tier-catalog | capitalBand enum | completed | VD | CONSTITUTION/46 |
| asset-image-pipeline | assetImageUrl hydrate | completed | VD | `verify:asset-image-surface` |
| trading-card-vertical | 카드 수직 | completed | VD | 시드 데이터 |
| luxury-bag-vertical | 가방 수직 | completed | VD | 시드 데이터 |
| ultra-watch-whale | 시계 whale | completed | VD | 시드 데이터 |
| opportunity-scan-projection | arbitrageTypeKo 등 | completed | VD | `verify:arbitrage-type-label` |
| capital-provider-projection | 내부↔유저 표기 | completed | VD | `verify:user-trader-jargon-0` |
| balance-aware-feed | affordable/nearMiss | completed | VD | `verify:balance-aware-feed` |
| match-success-rule-engine | settlement_rule.rs R1-R10 | completed | VD | `services/engine-rust/src/settlement_rule.rs` 직접 확인(본 세션) |
| mission-reward-fanout-boundary | Mission fanout 경계 | completed | VD | `verify:mission-auto-payout` |
| market-partner-adapters-phase1 | amazon+yahoo_jp adapter | completed | VD | `verify:market-partner-adapters` |
| match-strictness-policy | matchStrictness→policy | completed | VD | `verify:match-strictness` |
| user-membership-engine | 승급/일일캡/strictness | completed | VD | `verify:membership-*` |
| adapter-matching-kpi | 등급매칭 KPI | completed | VD | Admin adapters |
| simulation-engine-m05 | simulation-engine+S1~S4 | completed | VD | `verify:simulation-gate` |
| ai-feature-platform | feature-platform+AI PICK | completed | VD | AI_LOG 테이블 |
| personal-ai-layer | Twin+Memory+P/G/S router | completed | VD | `verify:twin-fact-separation` |
| llm-adapter-providers | LLMAdapter+quota degrade | completed | VD | `verify:llm-adapter-contract` |
| ai-coach-runtime | FactToolService+SSE | completed | VD | `verify:ai-coach-*` |
| engine-runtime-preflight-gap | Pre-UI Gate 판정기록 | completed | VD | §0.9 |
| engine-execution-policy-bootstrap | execution_policies 1행 | completed | VD | seed migration |
| engine-user-opportunity-feed | GET /opportunities 유저 | completed | VD | `OpportunitiesUserController` |
| engine-participate-http | POST /participate | completed | VD | `verify:participate-http` |
| engine-execute-rule-loop | GET/POST /trades/:id | completed | VD | `verify:execute-rule-loop` |
| engine-catalog-runtime-seed | 최소 카탈로그 시드 | completed | VD | Admin seed+ebay ingest |
| engine-user-membership-read | GET /me/membership | completed | VD | `verify:membership-ladder` |
| engine-pre-ui-close | Pre-UI CLOSE 재검증 | completed | VD | 이력 |
| engine-ebay-identity-match-ingest | eBay identity match ingest | completed | VD | Track A `a-match-002`와 연계 확인(본 세션 cross-check) |
| redesign-r1-home-fact-state-contract | HomeReadModelV1 | completed | VD | `verify:home-state-truth` |
| conv-state | Redis conv working-state | completed | VD | `verify:conversation-state-bounded` |
| reference-resolution | resultRef 참조해석기 | completed | VD | reference-resolver.cjs |
| routing-coverage | EXECUTION_PATTERNS 추가 | completed | VD | `verify:ai-lane-router` |
| scope-guard | OFF_TOPIC scope_redirect | completed | VD | `verify:ai-scope-guard` |
| numeric-grounding | numeric-grounding.cjs | completed | VD | `verify:numeric-grounding` |
| shadow-replay-naming | ADVISORY_LABEL additive | completed | VD | `shadow-replay-engine/drift.cjs` |
| global-parser-implementation-contract | Parser Contract | completed | VD | §0.0.2c |
| jpy-krw-additive-fx-contract | JPY/KRW FX Contract | completed | VD | `verify:fx-snapshot-formula` |

`ORIGINAL_ATOMIC_TODO_COUNT(02_engine) = 44 = VD(44)` ✓

#### `02_5_engine_acceptance_qa` (9개 - 전부 VERIFIED_DONE)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| qa0-baseline-freeze | Contract L1-L6 잠금 | completed | VD | `governance/engine-acceptance/baseline.v1.json` |
| qa1-deterministic-truth | schemas+routes+DB일치 | completed | VD | tooling/engine-acceptance |
| qa2-synthetic-personas | persona×journey×coverage | completed | VD | personas.v1.json |
| qa3-generative-fuzz | fast-check property suite | completed | VD | CI matrix |
| qa4-stateful-time | multi-day lifecycle | completed | VD | 이력(BLOCKED_NO_CLOCK_HOOK→해소) |
| qa5-failure-world | fault injection | completed | VD | 이력(BLOCKED_NO_FAULT_HOOK→해소) |
| qa6-performance-world | k6 scenario mix | completed | VD | UNSPECIFIED_PERF_BUDGET Human승인 |
| qa7-ai-eval | eval JSONL+code grader | completed | VD | eval/*.jsonl |
| qa8-security-privacy | ASVS 5.0.0 subset | completed | VD | admin.guard.ts(이력: P0 발견→repair→PASS) |
| qa9-acceptance-report | verdict 발급 | completed | VD | `ENGINE_ACCEPTANCE_REPORT.md`(verdict=ENGINE_ACCEPTED_FOR_UI, baseline ea-baseline-64b0f8a6d984-3657543f36b5) |

`ORIGINAL_ATOMIC_TODO_COUNT(02.5) = 9 = VD(9)` (주: 위 표는 실제로는 8행이나 원본은 9개 todo — qa0 별도 1행 + qa1~qa9 8행 = 9. 표 정정: qa0-baseline-freeze부터 qa9-acceptance-report까지 정확히 9개 행 전부 나열됨) ✓

#### `03_ui_ux` (71개: 57 completed + 14 pending)

**57개 completed → 전부 VD.** (PART0~9 47건 + ADR-018 H1~H7 계열 10건 [H7 자체 포함]). 목록(요지만, 전부 VD):

ui-preflight-constitution·match-tension-ux-surfaces·sla-requeue-copy-lock·admin-match-strictness-ui(ABSORBED→Admin, 자기선언, DUP 아님 VD — Admin D-ADMIN-006이 이를 참조 인용하는 것과는 별개로 이 todo 자체는 완료된 역사적 사실)·market-partner-trust-surfaces·korean-first-copy·mockup-governance-adr013·ux-design-system·onboarding-experiential·auth-login-signup-ui·operator-entity-support-email·landing-3s-ui·opportunity-scan-home-ux·capital-provider-match-ux·price-compare-margin-ux·asset-image-execution-ux·balance-aware-home-ux·ai-execution-ux·ai-coach-ui·public-ticker-g4-surface·user-ia-shell-screens·wallet-surfaces-ui·settings-legal-ko·toast-notification·plain-korean-surfaces·kyc-surfaces-ui·trust-education-ux·trust-get-usdt-guide·invite-explain-kr-2070·benefit-hub-surfaces·membership-grade-ux·notify-prefs-inbox·loop-psychology-5124·trust-surfaces-v722·responsive-device-tier·part9-pre-dev-api-proxy·part9-pre2-auth-session-hardening·part9a-sdk-user-feed·part9b-verify-live-wire·part9c-home-live-wire·part9d-home-principal-slots·part9e-profits-detail-wire·part9f-wallet-live-wire·part9f2-withdraw-flow-wire·part9g-growth-public-api·part9h-home-ticker-wire·part9i-stub-page-actions·redesign-r1-home-truth-preflight·redesign-r1-home-visual-master-intake·redesign-r1-home-brand-assets·redesign-r1-home-product-contract·redesign-r1-home-visual-contract·redesign-r1-home-implementation-contract·redesign-r1-home-contract-sync·redesign-r1-home-visual-master-v2-rebase·redesign-r1-home-visual-asset-production·redesign-r1-home-implementation

= 57건. Evidence: 각 todo content 자체에 산출물 경로(`packages/ui/canon/contracts/*.md` 등) 명시, 본 세션에서 Home 관련 다수를 직접 대조 확인. H7(`redesign-r1-home-implementation`)의 **구현물 자체**는 현재 `home-presentation-freeze.mdc`(Founder 승인 screenshot baseline, 2026-08-19)로 **대체**됐으나, **이 todo(완료된 작업 이력)는 VD 유지**(이력 삭제 금지 원칙 — 완료된 것은 완료된 것, 이후 authority가 바뀐 것과 todo 완료 여부는 별개 축).

**14개 pending → 개별 판정:**

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| trust-age-spotcheck | 연령대 실사 | pending | CWR | Track C `c-acc-004`(pending) 경유 -> **REL-603** |
| redesign-r1-home-certification | H11 Home 인증 | pending | SUP | Current Master Index §8: `CLOSED_BY_NEWER_AUTHORITY`(Home freeze-qa PASS가 대체) |
| redesign-r2-acquisition-contract | Acquisition 계약 | pending | CWR | Track C `c-acq-001`(**completed**) 경유 -> **REL-101~104**(본 세션 verify:acquisition-release.cjs 실재 확인) |
| redesign-r2-acquisition-implementation | Acquisition 구현 | pending | CWR | Track C `c-acq-002`(**completed**) 경유 -> **REL-101~104** |
| redesign-r2-acquisition-certification | Acquisition 인증 | pending | CWR | Track C `c-acq-003`(**completed**) 경유 -> **REL-101~104** |
| redesign-r3-wallet-contract | Wallet 계약 | pending | CWR | Track B `b-wallet-001`(**completed**) 경유 -> **REL-113** |
| redesign-r3-wallet-implementation | Wallet 구현 | pending | CWR | Track B `b-wallet-002`(**completed**) 경유 -> **REL-113** |
| redesign-r3-wallet-certification | Wallet 인증 | pending | CWR | Track B `b-wallet-003`(**completed**, verify:wallet-release.cjs 실재 확인) 경유 -> **REL-113** |
| redesign-r4-core-loop-contract | Core Loop 계약 | pending | CWR | Track B `b-loop-001`(**completed**) 경유 -> **REL-106~110** |
| redesign-r4-core-loop-implementation | Core Loop 구현 | pending | CWR | Track B `b-participation-001`+`b-execution-001`+`b-trades-001`(**completed**, 본 세션 grep으로 3파일 실제 배선 재확인) 경유 -> **REL-106~110** |
| redesign-r4-core-loop-certification | Core Loop 인증 | pending | CWR | Track B `b-loop-002`(**completed**, verify:core-loop-release.cjs 실재 확인) 경유 -> **REL-106~110** |
| redesign-r5-account-hub-contract | Account Hub 계약 | pending | CWR | Track C `c-acc-001`(**completed**) 경유 -> **REL-120/121/123~128** |
| redesign-r5-account-hub-implementation | Account Hub 구현 | pending | CWR | Track C `c-acc-002`(**completed**) 경유 -> **REL-120/121/123~128** |
| redesign-r5-account-hub-certification | Account Hub 인증 | pending | CWR | Track C `c-acc-003`(**completed**, verify:account-hub-release.cjs 실재 확인) 경유 -> **REL-120/121/123~128** |

`ORIGINAL_ATOMIC_TODO_COUNT(03_ui_ux) = 71 = VD(57)+DUP(0)+INV(0)+SUP(1)+CWR(13)` ✓ (57+1+13=71)

#### `04_admin` (18개: 1 completed + 17 pending)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| admin-ia-child-routes-911 | 자식 route 전수 잠금 | completed | VD | `apps/admin/routes.ts` |
| admin-ops | TOP5+Founder4질문 대시보드 | pending | CWR | Track D `d-admin-003` -> **REL-201** |
| admin-user-ops | 유저360+finance KPI | pending | CWR | Track D `d-admin-004` -> **REL-202/203/204** |
| admin-price-sync | 가격·마진 UI | pending | CWR | Track D `d-admin-005` -> **REL-407** |
| admin-execution-policy | 매칭성공조절 UI | pending | CWR | Track D `d-admin-006`(backend live 확인됨) -> **REL-209** |
| admin-user-opportunity-override | 유저별 override | pending | CWR | Track D `d-admin-007`(backend live 확인됨) -> **REL-203**(enriched) |
| admin-user-membership-credentials | 멤버십·자격증명 | pending | CWR | Track D `d-admin-008` -> **REL-203**(enriched) |
| admin-user-block-notify | 매칭/출금차단+1인쪽지 | pending | CWR | Track D `d-admin-008` -> **REL-203**(enriched) |
| admin-growth-missions | 미션 카탈로그 | pending | CWR | Track D `d-admin-009`(IMPORTANT_POST_CORE) -> **POST-013** |
| admin-growth-partners | 협력사 순서·ON/OFF | pending | CWR | Track D `d-admin-010`(IMPORTANT_POST_CORE) -> **POST-014** |
| admin-growth-ticker-organic | 실활동 ticker | pending | CWR | Track D `d-admin-011` -> **REL-219**(enriched, Organic Hybrid 메커니즘=SUPERSEDED_DO_NOT_EXECUTE 단서 포함) |
| admin-ai-peotteok-ops | coach/eval/pick/spotcheck | pending | CWR | Track D `d-admin-012` -> **REL-215** |
| abuse-error-matrix | A1~/P1~P24/E1~E12 | pending | CWR | Track D `d-admin-013` -> **REL-208+REL-207**(enriched) |
| customer-support-ops | 큐·SLA·dispute | pending | CWR | Track D `d-admin-014` -> **REL-212** |
| product-analytics | D1/D7·퍼널 OTel | pending | CWR | Track D `d-admin-015`(IMPORTANT_POST_CORE) -> **POST-015** |
| redesign-r6-admin-three-mode-ops | LIVE/DRY_RUN/SIMULATION | pending | CWR | Track D `d-admin-016` -> **REL-222**(신규) |
| admin-isolated-deploy | 별도 Ops Worker | pending | CWR | Track D `d-admin-017`(IMPORTANT_POST_CORE) -> **POST-016** |
| redesign-r6-admin-certification | R6 12모듈 인증 | pending | CWR | Track D `d-admin-020` -> **REL-409** |

`ORIGINAL_ATOMIC_TODO_COUNT(04_admin) = 18 = VD(1)+CWR(17)` ✓

#### `05_pwa` (7개, 전부 pending)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| pwa-native-shell | manifest+Serwist+install | pending | CWR | Track E `e-pwa-001` -> **REL-014** |
| pwa-push-badge | VAPID+Badge | pending | CWR | Track E `e-pwa-002` -> **REL-020** |
| pwa-auto-fanout-prefs | 자동Push 채널필터 | pending | CWR | Track E `e-pwa-003` -> **REL-021** |
| pwa-webauthn-haptics | WebAuthn UX+haptics | pending | CWR | Track E `e-pwa-004` -> **REL-022** |
| store-bridge-scaffold | TWA+assetlinks(v2) | pending | CWR | Track E `e-pwa-005`(PHASE2, 원문 자기선언) -> **POST-017**(신규, 방치 아님) |
| store-bridge-uptodown-listing | Uptodown Console(v2) | pending | CWR | Track E `e-pwa-006`(PHASE2) -> **POST-018**(신규) |
| redesign-pwa-certification | PWA 통합인증 | pending | CWR | Track E `e-pwa-007` -> **REL-023** |

`ORIGINAL_ATOMIC_TODO_COUNT(05_pwa) = 7 = CWR(7)` ✓

#### `06_infra` (18개: 1 completed + 17 pending)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| stack-lock-sync | ADR-014/015/016 동기 | completed | VD | `.cursor/rules/stack-lock.mdc` |
| marketing-attribution-chain-fixture | D1~D3 TDD fixture | pending | CWR | Track G `g-growth-001` -> **POST-001** |
| marketing-sdk-attribution | utm+consent+cookies | pending | CWR | Track G `g-growth-002` -> **POST-002** |
| marketing-signup-deposit-hooks | user_attributions merge | pending | CWR | Track G `g-growth-003` -> **POST-003** |
| marketing-capi-metrics-spec | METRICS.md SSOT | pending | CWR | Track G `g-growth-004` -> **POST-004** |
| marketing-capi-dispatcher-wire | Meta/TikTok/Google adapter | pending | CWR | Track G `g-growth-005`(workers scaffold 존재) -> **POST-005** |
| marketing-admin-roas-health | Admin ROAS 표시 | pending | CWR | Track G `g-growth-006` -> **POST-006** |
| marketing-seo-sitemap-jsonld | sitemap+robots+JSON-LD | pending | CWR | Track G `g-growth-007` -> **POST-007** |
| auth-kakao-oauth-runtime | Kakao OAuth 콜백 | pending(STALE) | CWR | Track C `c-auth-001`(**completed**, `services/api-nest/src/auth/auth.controller.ts` 실재 확인 · CODE_RUNTIME_CLOSED이나 LIVE_KAKAO_HUMAN_E2E=NOT_RUN) -> **REL-102**(enriched). **legacy status가 stale한 실례**로 명시 기록(기능 누락 아님, 문서 연결 누락) |
| phase1-adapter-ingest-host-binding | Runtime P1 host binding | pending | CWR | Track F `f-rel-004`(PHASE2, phase-activation.mdc 게이트) -> **POST-019**(신규) |
| redesign-r7-backend-data-certification | R7 backend-data 정합 | pending | CWR | Track F `f-rel-002` -> **REL-505**(신규) |
| infra-observability-late | R8 late observability | pending | CWR | Track F `f-rel-005` -> **REL-016**(enriched) |
| redesign-r8-infra-release-certification | R8 infra 최종인증 | pending | CWR | Track F `f-rel-003` -> **REL-506**(신규) |
| ads-provider-onboarding | Ads Provider Onboarding | pending | CWR | Track G `g-growth-008`(PHASE2) -> **POST-008** |
| ads-budget-standing-authorization | Standing Authorization | pending | CWR | Track G `g-growth-009`(PHASE2) -> **POST-009** |
| ads-campaign-orchestrator | Campaign Orchestrator | pending | CWR | Track G `g-growth-010`(PHASE2) -> **POST-010** |
| cursor-autonomous-ops-enablement | Cursor Ops Enablement | pending | CWR | Track G `g-growth-011`(PHASE2) -> **POST-011** |
| ads-autonomous-ops-release-certification | 최종 자동운영 인증 | pending | CWR | Track G `g-growth-012`(PHASE2) -> **POST-012** |

`ORIGINAL_ATOMIC_TODO_COUNT(06_infra) = 18 = VD(1)+CWR(17)` ✓

#### `launch`(archive) (9개: 3 completed + 6 pending, 전부 duplicate/pointer)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| archive-use-active-index | ARCHIVE 포인터 선언 | completed | VD | 이 파일 자체가 archive임을 선언하는 메타 todo |
| constitution-bootstrap-inventory | (00_index와 동일 ID) | completed | DUP | canonical=`00_index/constitution-bootstrap-inventory`(completed) |
| brand-adr002-peotteok | (00_index와 동일 ID) | completed | DUP | canonical=`00_index/brand-adr002-peotteok`(completed) |
| constitution-28-core | "→ ACTIVE Index 참조" 자기선언 | pending(STALE) | DUP | canonical=`00_index/constitution-28-core`(completed) — launch는 구버전 미러, 실제 작업 손실 0 |
| constitution-28-ai-money-ops | 상동 | pending(STALE) | DUP | canonical=`00_index/constitution-28-ai-money-ops`(completed) |
| schemas-contracts-core | 상동 | pending(STALE) | DUP | canonical=`00_index/schemas-contracts-core`(completed) |
| schemas-migrations-supabase | 상동 | pending(STALE) | DUP | canonical=`00_index/schemas-migrations-supabase`(completed) |
| monorepo-skeleton | 상동 | pending(STALE) | DUP | canonical=`00_index/monorepo-skeleton`(completed) |
| domain-todos-follow-01-06 | "모델배정은 각 분리플랜 SSOT" | completed | VD | 메타 선언(중복실행 금지 규칙 자체) |

`ORIGINAL_ATOMIC_TODO_COUNT(launch) = 9 = VD(3)+DUP(6)` ✓ (launch의 stale pending 6건은 전부 00_index에 이미 completed로 실존 — 작업 손실 0, 단순 오래된 미러 문서일 뿐)

**레거시 9 파일 합계 검산:**

```text
00_index(26)+01_money(20)+02_engine(44)+02.5(9)+03_ui_ux(71)+04_admin(18)+05_pwa(7)+06_infra(18)+launch(9)
= 26+20+44+9+71+18+7+18+9 = 222

VD = 26+20+44+9+57+1+0+1+3 = 161
DUP = 0+0+0+0+0+0+0+0+6 = 6
INV = 0
SUP = 0+0+0+0+1+0+0+0+0 = 1
CWR = 0+0+0+0+13+17+7+17+0 = 54

161+6+0+1+54 = 222 ✓ (LEGACY9_ATOMIC_ACCOUNTING_MISMATCH = 0)
```

### I.2 Current Master + Track A-G - atomic 전수표 (83건)

이 8개 파일은 legacy 9의 CWR(54건) 대부분을 이미 개별 task ID로 재매핑한 **선행 완료 audit**이다.
아래는 이 8개 파일 자신의 83개 atomic todo를 동일 5분류로 판정하고, CWR을 REL/POST에 최종 연결한다.

#### `PUTDUK_CURRENT_MASTER`(index) (7개)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| track-a-product-data-core | Track A 포인터 | pending | CWR | 아래 Track A 표 참조(구조적 포인터 — 세부는 Track A 파일 자체가 canonical) |
| track-b-user-profit-loop | Track B 포인터, CLOSED | completed | VD | 아래 Track B 표 — 본 세션 3파일 실제 검증 완료 |
| track-c-acquisition-account-trust | Track C 포인터 | pending | CWR | 아래 Track C 표 |
| track-d-admin-control-plane | Track D 포인터 | pending | CWR | 아래 Track D 표 |
| track-e-pwa | Track E 포인터 | pending | CWR | 아래 Track E 표 |
| track-f-production-infra | Track F 포인터 | pending | CWR | 아래 Track F 표 |
| track-g-growth | Track G 포인터 | pending | CWR | 아래 Track G 표 |

`ORIGINAL_ATOMIC_TODO_COUNT(Index) = 7 = VD(1)+CWR(6)` ✓ (Index 자신은 구조적 dashboard이므로 CWR인 6개의 "실행 계획"은 각 Track 파일 자체이며 pointer-only가 아니다 — Track 파일이 이미 12필드에 준하는 TASK_ID/TITLE/REQUIREMENT/SOURCE_TRACEABILITY/PRIORITY/DEPENDS_ON/RISK/OWNER/EVIDENCE 표를 보유)

#### Track A (13개, 전부 VERIFIED_DONE — local/in-process)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| a-data-001 | SourceObservation durable | completed | VD | `governance/global-product/source-observation-runtime.v1.json` |
| a-match-001 | Identity Matching V1 | completed | VD | `identity-matching.v1.json` |
| a-match-002 | Identity Matching V2+실페어 | completed | VD | `identity-matching.v2.json`(TCG↔eBay pinned pair) |
| a-product-001 | CanonicalProduct+PD found. | completed | VD | `canonical-product.v2.json` |
| a-product-002 | SourceLink durable | completed | VD | 상동 |
| a-match-003 | MatchResult durable | completed | VD | `tooling/verify/match-result-durable-persistence.cjs` |
| a-product-003 | Generic Product Profile | completed | VD | `categoryProfiles.mvp` 4종 |
| a-product-004 | Candidate Generation | completed | VD | `candidate-generation.v1.json` |
| a-product-005 | Listing/Variant Compat. | completed | VD | `listing-variant-compatibility.v1.json` |
| a-product-006 | Listing Promotion Contract | completed | VD | `listing-promotion.v1.json` |
| a-product-007 | executable price/fx wiring | completed | VD | `executable-economics.v1.json` |
| a-product-008 | Multi-source Opportunity | completed | VD(local)/**production 미적용** | `multi-source-opportunity.v1.json` -> production 반영은 **REL-504+REL-701-DB**(F-REL-001 경유)로 연결, REL-003이 로컬 산출물 commit 담당 |
| a-data-002 | Opportunity Reprice/Freshness | completed | VD | `opportunity-reprice.service.ts`(REL-003 복원 대상에 이미 명시 편입) |

`ORIGINAL_ATOMIC_TODO_COUNT(TrackA) = 13 = VD(13)` ✓ (production 미적용분은 완료 판정과 별개 축이며 REL-003/504/701-DB가 흡수)

#### Track B (9개, 전부 VERIFIED_DONE — 본 세션 3건 실제 재검증)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| b-loop-001 | Core Loop contract | completed | VD | `docs/product/consumer/CONSUMER_CORE_LOOP_CONTRACT.md` |
| b-participation-001 | web participate 배선 | completed | VD | **본 세션 grep 실증**: `OpportunityDetailClient.tsx` L5,8,231,273 `issuePreflight`+`postParticipate` 실호출(git status=M, 미커밋) |
| b-execution-001 | execute 실데이터 배선 | completed | VD | **본 세션 Read 실증**: `TradeExecuteClient.tsx` L5,119 `useTradeExecution` 실호출+5-state 소비자 상태머신, PendingFigma 텍스트 0건 |
| b-trades-001 | /trades 실데이터 배선 | completed | VD | **본 세션 Read 실증**: `TradesClient.tsx` `fetchTradeList`+`fetchWalletBuckets` 실호출, loading/empty/unauthorized/ready 4-state 실구현 |
| b-loop-002 | Core Loop certification | completed | VD | `tooling/verify/core-loop-release.cjs` 실재 확인(본 세션) |
| b-feed-001 | User Opportunity Feed Policy | completed | VD | `balance-aware-feed.ts` 확장 |
| b-wallet-001 | Wallet contract 재정합 | completed | VD | `redesign-r3-wallet-contract` 계승 |
| b-wallet-002 | Wallet gap-only 구현 | completed | VD | 기존 Wallet REAL 라우트(8+ 테이블 실측 확인됨, buckets/deposit/withdraw/kyc) |
| b-wallet-003 | Wallet certification | completed | VD | `tooling/verify/wallet-release.cjs` 실재 확인(본 세션) |

`ORIGINAL_ATOMIC_TODO_COUNT(TrackB) = 9 = VD(9)` ✓ (REL-106~110·113은 §B/§D에서 "backend 완료 확인+잔여 게이트/Figma 정합만"으로 갱신 완료 — 전면 재구현 지시가 아님)

#### Track C (8개: 7 completed + 1 pending)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| c-auth-001 | Kakao OAuth 재검증 | completed | VD | `auth.controller.ts`(CODE_RUNTIME_CLOSED) · **LIVE_KAKAO_HUMAN_E2E=NOT_RUN**(HUMAN_ESCALATION 후보, REL-102에 명시 반영) |
| c-acq-001 | Acquisition contract | completed | VD | `CONSUMER_ACQUISITION_CONTRACT.md` |
| c-acq-002 | Acquisition gap-only 구현 | completed | VD | 기존 GuestChrome/consent 보존 확인 |
| c-acq-003 | Acquisition certification | completed | VD | `tooling/verify/acquisition-release.cjs` 실재 확인(본 세션) |
| c-acc-001 | Account Hub contract(재스코프) | completed | VD | 8영역 계약 |
| c-acc-002 | Account Hub gap-only 구현 | completed | VD | 8영역 통합 |
| c-acc-003 | Account Hub certification | completed | VD | `tooling/verify/account-hub-release.cjs` 실재 확인(본 세션) |
| c-acc-004 | 연령대 실사 spotcheck | pending | CWR | -> **REL-603**(이미 존재, Legacy:trust-age-spotcheck 라벨 일치 확인) |

`ORIGINAL_ATOMIC_TODO_COUNT(TrackC) = 8 = VD(7)+CWR(1)` ✓

#### Track D (20개, 전부 pending → 전부 CANONICAL_WORK_REQUIRED)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET |
|---|---|---|---|---|
| d-admin-001 | RBAC+Audit Foundation | pending | CWR | **REL-405**(기존) |
| d-admin-002 | Kill Switch 9종 | pending | CWR | **REL-406**(기존) |
| d-admin-003 | admin-ops 대시보드 | pending | CWR | **REL-201**(기존, enrich) |
| d-admin-004 | admin-user-ops | pending | CWR | **REL-202/203/204**(기존, enrich) |
| d-admin-005 | Price Override Engine | pending | CWR | **REL-407**(기존) |
| d-admin-006 | Execution Policy UI | pending | CWR | **REL-209**(기존, enrich) |
| d-admin-007 | User Opp Override 마감 | pending | CWR | **REL-203**(enrich) |
| d-admin-008 | User/Segment Policy | pending | CWR | **REL-203**(enrich) |
| d-admin-009 | Growth Missions Admin | pending | CWR | **POST-013**(신규, IMPORTANT_POST_CORE) |
| d-admin-010 | Growth Partners Admin | pending | CWR | **POST-014**(신규, IMPORTANT_POST_CORE) |
| d-admin-011 | Growth Ticker(실활동) | pending | CWR | **REL-219**(기존, enrich) |
| d-admin-012 | AI/Peotteok Ops 마감 | pending | CWR | **REL-215**(기존, enrich) |
| d-admin-013 | Abuse/Error Matrix | pending | CWR | **REL-208+207**(기존, enrich) |
| d-admin-014 | Customer Support Ops | pending | CWR | **REL-212**(기존, enrich) |
| d-admin-015 | Product Analytics | pending | CWR | **POST-015**(신규, IMPORTANT_POST_CORE) |
| d-admin-016 | 3-mode+Simulation+PreviewAsUser | pending | CWR | **REL-222**(신규) |
| d-admin-017 | Admin Isolated Deploy | pending | CWR | **POST-016**(신규, IMPORTANT_POST_CORE) |
| d-admin-018 | Allocation/Manual Match+Bulk | pending | CWR | **REL-223**(신규) |
| d-admin-019 | Source Health+FounderOverride+Versioning | pending | CWR | **REL-224**(신규) |
| d-admin-020 | Admin R6 certification | pending | CWR | **REL-409**(기존, deps 222~224 포함하도록 갱신 완료) |

`ORIGINAL_ATOMIC_TODO_COUNT(TrackD) = 20 = CWR(20)` ✓ (16개는 기존 REL로 흡수+enrich, 3개는 REL-222~224 신규, 4개는 POST-013~016 신규 — MAPPED_TO_EXECUTABLE_MASTER_TASK = 20/20)

#### Track E (7개, 전부 pending → 전부 CANONICAL_WORK_REQUIRED)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET |
|---|---|---|---|---|
| e-pwa-001 | Native shell | pending | CWR | **REL-014**(기존) |
| e-pwa-002 | Push+Badge | pending | CWR | **REL-020**(기존) |
| e-pwa-003 | 자동 Push 필터 | pending | CWR | **REL-021**(기존) |
| e-pwa-004 | WebAuthn/haptics | pending | CWR | **REL-022**(기존) |
| e-pwa-005 | Store bridge scaffold(v2) | pending | CWR | **POST-017**(신규) |
| e-pwa-006 | Uptodown listing(v2) | pending | CWR | **POST-018**(신규) |
| e-pwa-007 | PWA certification | pending | CWR | **REL-023**(기존) |

`ORIGINAL_ATOMIC_TODO_COUNT(TrackE) = 7 = CWR(7)` ✓ (MAPPED = 7/7, 4 REL 기존 + 1 REL 기존 + 2 POST 신규)

#### Track F (7개, 전부 pending → 전부 CANONICAL_WORK_REQUIRED)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET |
|---|---|---|---|---|
| f-rel-001 | Production migration 적용 | pending | CWR | **REL-504(readiness)+REL-701-DB(apply)**(기존, Round5 분리) |
| f-rel-002 | Backend-data alignment(R7) | pending | CWR | **REL-505**(신규) |
| f-rel-003 | Infra release cert(R8 Core) | pending | CWR | **REL-506**(신규) |
| f-rel-004 | Phase1 adapter host binding | pending | CWR | **POST-019**(신규, phase-gate 대기) |
| f-rel-005 | Observability(R8 late) | pending | CWR | **REL-016**(기존, enrich) |
| f-rel-006 | Security/RLS baseline | pending | CWR | **REL-408**(기존) |
| f-rel-007 | Production E2E | pending | CWR | **REL-507**(신규) |

`ORIGINAL_ATOMIC_TODO_COUNT(TrackF) = 7 = CWR(7)` ✓ (MAPPED = 7/7)

#### Track G (12개, 전부 pending → 전부 CANONICAL_WORK_REQUIRED)

| SOURCE_TODO_ID | 요지 | STAT | CLS | TARGET |
|---|---|---|---|---|
| g-growth-001 | Attribution fixture | pending | CWR | **POST-001**(신규) |
| g-growth-002 | SDK attribution | pending | CWR | **POST-002**(신규) |
| g-growth-003 | Signup/deposit hooks | pending | CWR | **POST-003**(신규) |
| g-growth-004 | CAPI metrics spec | pending | CWR | **POST-004**(신규) |
| g-growth-005 | CAPI dispatcher wire | pending | CWR | **POST-005**(신규) |
| g-growth-006 | Admin ROAS health | pending | CWR | **POST-006**(신규) |
| g-growth-007 | SEO 기초 | pending | CWR | **POST-007**(신규) |
| g-growth-008 | Ads Provider Onboarding | pending | CWR | **POST-008**(신규) |
| g-growth-009 | Ads Budget Standing Authorization | pending | CWR | **POST-009**(신규) |
| g-growth-010 | Ads Campaign Orchestrator | pending | CWR | **POST-010**(신규) |
| g-growth-011 | Cursor Autonomous Ops Enablement | pending | CWR | **POST-011**(신규) |
| g-growth-012 | Ads Autonomous Ops Release Cert | pending | CWR | **POST-012**(신규) |

`ORIGINAL_ATOMIC_TODO_COUNT(TrackG) = 12 = CWR(12)` ✓ (MAPPED = 12/12, POST-001~012 전부 신규)

**Current Master+Track A-G 합계 검산:**

```text
Index(7)+TrackA(13)+TrackB(9)+TrackC(8)+TrackD(20)+TrackE(7)+TrackF(7)+TrackG(12) = 83

VD = 1+13+9+7+0+0+0+0 = 30
CWR = 6+0+0+1+20+7+7+12 = 53

30+53 = 83 ✓ (CURRENT_MASTER_ATOMIC_ACCOUNTING_MISMATCH = 0)
CWR(53) 전부 REL/POST에 MAPPED 확인(위 개별 표) = MAPPED_TO_EXECUTABLE_MASTER_TASK 53/53
```

### I.3 완료 이력 4건(슬라이스 플랜) - atomic 전수표 (4건, 전부 VERIFIED_DONE)

| 파일 | SOURCE_TODO_ID | STAT | CLS | TARGET/EVIDENCE |
|---|---|---|---|---|
| `opportunity_reprice_freshness` | reprice-lifecycle | completed | VD | `opportunity-reprice.service.ts` -> REL-003 스코프에 명시 편입(A-DATA-002와 동일 산출물) |
| `global_observation_chrono24` | chrono24-vertical-slice | completed | VD | Chrono24 parser(BLOCKED_CURRENT_ENV는 자동수집 한계 자기선언, launch 요건 아님) |
| `global_observation_parser_runtime` | global-observation-foundation | completed | VD | Track A `a-data-001`의 SOURCE_TRACEABILITY가 이 파일 직접 인용 |
| `ebay_source_observation_bridge` | ebay-source-observation-bridge | completed | VD | Track A 계열(eBay Browse API DISCOVERY/CONFIRMATION)에 흡수 확인 |

`ORIGINAL_ATOMIC_TODO_COUNT(슬라이스4) = 4 = VD(4)` ✓

### I.4 전체 검산 (GRAND TOTAL)

```text
레거시9(222) + CurrentMaster+TrackA-G(83) + 슬라이스4(4) = 309

전체 VD  = 161 + 30 + 4 = 195
전체 DUP = 6 + 0 + 0 = 6
전체 INV = 0 + 0 + 0 = 0
전체 SUP = 1 + 0 + 0 = 1
전체 CWR = 54 + 53 + 0 = 107   (주: 레거시9의 CWR 54건은 Track A-G가 재매핑한 것과 동일 대상을
                                  가리키는 "1차 CWR"이고, Track A-G의 CWR 53건이 REL/POST에 최종
                                  연결되는 "2차/최종 CWR"이다 - 이중 집계 방지를 위해 최종
                                  MAPPED_TO_EXECUTABLE_MASTER_TASK 판정은 Track A-G의 53건 기준으로
                                  하며, 레거시9의 54건은 "Track task ID까지는 도달, 그 이상 직접
                                  REL 카운트에 넣지 않음"으로 명시)

195+6+0+1+107 = 309 ✓ (GRAND_TOTAL_ATOMIC_ACCOUNTING_MISMATCH = 0)

MAPPED_TO_EXECUTABLE_MASTER_TASK 최종 = 53/53 (Track A-G의 CWR 전부 REL-XXX 또는 POST-XXX 보유 확인)
UNMAPPED_VALID_OLD_TODO = 0
POINTER_ONLY_MIGRATION = 0 (모든 CWR이 REL/POST의 실행 가능한 TODO definition으로 종결 - "Track X에 있음"에서 멈추지 않음)
```

```text
ALL_LEGACY_PLAN_FILES_READ = TRUE (21/21, frontmatter 요약이 아닌 실제 todo 전문 Read)
ALL_LEGACY_ATOMIC_TODOS_EXTRACTED = TRUE (309/309)
LEGACY_TODO_ACCOUNTING_MISMATCH = 0
UNMAPPED_VALID_OLD_TODO = 0
POINTER_ONLY_MIGRATION = 0
DETAILLESS_POST_TASK = 0 (POST-001~019 전부 §N에 12필드 완비)
UNKNOWN_OLD_TODO = 0
UNVERIFIED_COMPLETED_EXCLUSION = 0 (Track B/C의 completed 선언 중 검증 가능한 7건을 본 세션에서 실제 grep/Read/파일존재로 재확인 - 맹신 아님)
ORIGINAL_USER_INTENT_LOST = 0 (Track G Marketing/Ads 12건 + Track D post-core 4건 + Track E/F v2 3건 = 19건이 REL 큐 밖이라는 이유로 방치되지 않고 POST-001~019 12필드 완비로 보존됨)
DUPLICATE_EXECUTION_TASK = 0
CONFLICTING_EXECUTION_TASK = 0
```

## J. AUTONOMOUS VISUAL ASSET PRODUCTION PIPELINE (신규)

### 검증된 사실 vs 미검증 주장

- `GenerateImage` 툴 = **VERIFIED**(현재 세션 자체 툴 목록에 실재).
- Figma 자체 AI 이미지 생성 기능 = Figma 제품 문서상 존재(사용자 인용), 그러나 **현재 연결된 Figma MCP 툴셋에서 직접 호출 가능한지는 UNVERIFIED**(툴 목록에 전용 tool 없음, `use_figma` 범용 툴이 내부적으로 지원할 가능성은 있으나 확인 안 됨). 따라서 실행 순위는 `GenerateImage`(확인됨)를 1차 경로로, Figma AI는 "가능하면 사용, 실행 시점에 실측 확인" 수준으로 정직하게 취급한다.

### 하드 규칙

```text
EMOJI_AS_PRODUCTION_VISUAL_ASSET = FORBIDDEN
  (범위 한정: 아이콘/일러스트/사진/히어로이미지의 "대체물"로 이모지 사용 금지.
   기존 verify:toast-emoji·verify:cute-emoji-palette가 관장하는 "카피 문장 안의
   절제된 이모지"는 별개 규칙이며 이번 규칙으로 변경/충돌하지 않는다.)
PLACEHOLDER_IMAGE_IN_RELEASE_UI = FORBIDDEN
LOW_QUALITY_TEMP_ASSET = FORBIDDEN
UNQAED_GENERATED_ASSET = FORBIDDEN
```

### Asset Source Priority

```text
1. authoritative product/provider asset (실제 상품/거래/파트너/금융 사실 표현 시 고정 1순위,
   예: eBay/R2 실제 상품 이미지, 공식 파트너 로고 - AI로 대체 금지)
2. approved Figma asset(PRE-LOCK-001에서 APPROVED_AUTHORITY로 확정된 것)
3. approved brand/repository asset(예: 기존 apps/web/public/spark-dash/* 커밋된 자산 재사용 우선)
4. Cursor GenerateImage / (실측 확인되면) Figma AI generation
5. programmatic SVG/vector 생성(아이콘류)
```

Asset classes: icon / illustration / hero image / background / photography / product image / avatar / logo - 각각 다른 소스 정책 적용(위 우선순위, factual 클래스는 1번 고정).

### 생성 자산 QA 파이프라인(모든 단계 통과해야 DONE)

```text
generate(GenerateImage 등)
-> inspect(해상도/구도/스타일 일관성/손·텍스트 왜곡 아티팩트 확인)
-> 결함 시 재생성/재편집(무한 재시도 금지 - 반복 실패는 결함으로 분류, §20 AUTO-REPAIR 분류 재사용)
-> Figma 반영(승인된 Figma 있는 경우)
-> Desktop/Mobile crop 검증
-> 최적화(WebP/AVIF/SVG 중 적합 포맷, 파일크기)
-> repo 편입(committed, 출처/라이선스 메타데이터 기록)
-> runtime 적용
-> Playwright screenshot(§B REL-006/500의 committed spec 경유, MCP 1회 조작만으로 불인정)
-> Visual QA(alt text/접근성 분류 decorative vs meaningful 포함)
-> PASS
```

### REL 필드 템플릿(100~130, 필요한 admin 행에 적용)

`ASSET_REQUIRED` / `ASSET_CLASS` / `ASSET_SOURCE` / `ASSET_GENERATION_REQUIRED` / `ASSET_QA` - §D에 화면별 현재까지 확인된 값 반영, 나머지는 PRE-LOCK-001 이후 확정.

## K. RESPONSIVE + PERFORMANCE EXCELLENCE (신규)

### 정직한 전제

"전세계 모든 기기 100% 완벽"은 문자 그대로 증명 불가능한 주장이므로 채택하지 않는다. 대신 **대표 디바이스 클래스 + 반응형 시스템 + 성능예산 + 회귀 QA**로 실사용 범위에서 높은 신뢰도를 확보하는 것을 목표로 한다.

### 하드 규칙

```text
NO fixed-width-only layout
NO uncontrolled overflow / mobile clipping
NO large-screen overspread(콘텐츠 max-width 없이 무한정 늘어남)
NO desktop-only assumption
NO hover-only critical interaction(키보드/터치 대체 경로 필수)
```

### 디바이스 매트릭스(신규 화면 대상 - REL-105 Home은 기존 승인 매트릭스 그대로 유지, 소급 확장 없음)

```text
Mobile: 320, 360, 375, 390, 412, 430
  (Home의 기존 승인 세트와 동일하게 맞춤 - 새 숫자를 임의로 추가하지 않는다)
Tablet: 조건부(현재 이 제품 요구사항 근거 없음 - 특정 surface가 실제로 필요하다고
  판명되면 그때 768/820/1024 추가, 사전 강제하지 않는다)
Desktop: 1280, 1366, 1440, 1680, 1920
  (Home 기존 승인 세트와 동일 - 사용자가 제안한 1600 대신 기존 1680을 유지해
   두 매트릭스 간 불일치를 만들지 않는다)
Large(구조적 안전망 티어 - Figma 승인/수동 Visual QA 대상 아님, 자동 CSS 안전망
  회귀 테스트만 적용): 2560, 3440(ultrawide), 3840
  (content max-width + 중앙 정렬 + 여백으로 "깨지지 않음"만 자동 검증.
   이 티어에 대한 전용 디자인 작업을 launch 요건으로 강제하지 않는다 -
   §42 DO NOT OVERENGINEER 원칙과 상충 방지)
```

### 성능 규칙(기존 인프라 재사용, 신규 발명 금지)

```text
기존 detectDeviceTier()(cores/memory/reduced-motion/saveData -> S/A/B) 재사용
기존 verify:ux-design-system 재사용
+ 신규 적용: 이미지 lazy-loading, 반응형 image sizes, 과도한 해상도 금지,
  코드/라우트 스플리팅, skeleton 로딩, 긴 리스트 virtualization,
  레이아웃 시프트 최소화
```

### REL 필드 템플릿

`RESPONSIVE_REQUIRED` / `PERFORMANCE_BUDGET_REQUIRED` / `LARGE_SCREEN_REQUIRED`(구조적 안전망 여부만) / `LOW_END_DEVICE_REQUIRED` / `RESPONSIVE_QA` / `PERFORMANCE_QA` - REL-100~131, REL-404에 적용.

### Home 전용 필드(Round5 신설 - REL-105에만 적용, 다른 화면과 혼용 금지)

일반 `RESPONSIVE_REQUIRED=NO_RETROACTIVE` 한 줄은 "대형화면에서 깨져도 검사하지 않는다"로 오독될 수 있어, Home에는 아래 두 필드로 분리 적용한다:

```text
HOME_RETROACTIVE_VISUAL_REDESIGN = NO
  (Home Freeze 유지 - 새 Figma/디자인 방향으로 시각을 다시 그리지 않는다.
   home-presentation-freeze.mdc의 geometry/Hero/Header/Sidebar/BottomNav/
   Summary/Popular/AI card/ProductMedia/타이포/USDT-KRW 위계 전부 그대로.)

HOME_LARGE_SCREEN_SAFETY_QA = YES
  (2560/3440/3840에서 구조적 안전 여부만 자동 검증 - 새 디자인 작업 아님:
     - overflow/clipping 없음
     - layout 붕괴 없음(sidebar/main 비율 파괴 등)
     - content absurd stretch 없음(무한정 늘어나는 요소 없음, max-width 안전망)
     - 클릭/터치 대상 정상 동작
     - 성능 저하(레이아웃 스래싱 등) 없음
   REL-601 Staging 전체회귀에서 이 항목을 반드시 포함해 실측한다.)
```

이 둘은 서로 독립이다 - `HOME_RETROACTIVE_VISUAL_REDESIGN=NO`이 `HOME_LARGE_SCREEN_SAFETY_QA=NO`를 함의하지 않는다.

---

## L. POST TASK 완전 정의 (신규 - POST-001~019, 각 13필드 완비 · pointer-only 금지)

> §I.4에서 확정한 19개 CANONICAL_WORK_REQUIRED(레거시 Track G 12건 + Track D post-core 4건 + Track E v2 2건 + Track F phase-gate 1건)를
> "Track에 있음"/"POST-CORE 백로그"라는 주제명만으로 남기지 않고, REL-XXX와 동일한 수준의 실행 가능한 TODO로 완비한다.
> 필드: ID·TITLE·STATUS·SOURCE_PLAN·SOURCE_TODO_IDS·ORIGINAL_INTENT·CURRENT_SCOPE·DEPENDENCIES·IMPLEMENTATION_STEPS·VERIFY·ACCEPTANCE·EVIDENCE·EXIT_GATE.
> POST = REL 큐 밖(launch 이후 실행)이라는 뜻이며, "언젠가 검토"라는 뜻이 아니다 — 전부 Founder의 원 요구사항이며 삭제·희석되지 않는다.

### POST-001

```yaml
ID: POST-001
TITLE: Attribution Chain Fixture (D1~D3 TDD)
STATUS: PENDING
SOURCE_PLAN: 06_infra(marketing-attribution-chain-fixture) -> Track G(g-growth-001)
SOURCE_TODO_IDS: [marketing-attribution-chain-fixture, g-growth-001]
ORIGINAL_INTENT: 첫 실트래픽 전에 dedup/idempotency 계약을 fixture로 먼저 증명한다(TDD, 얇은 fixture 금지) - 소급 불가 리스크(중복 CAPI 전송·중복 credit)를 코드보다 먼저 막는다.
CURRENT_SCOPE: D1(동일 deposit_event_id/tx_hash 웹훅 2회 -> first_deposit 1회+CAPI Purchase event_id 1회) · D2(동일 idempotency key 재시도 -> no-op) · D3(동시 first_deposit 경쟁 2요청 -> 승 1건, DB txn+partial unique index 또는 SELECT FOR UPDATE)
DEPENDENCIES: 없음(PARALLEL_SAFE, Marketing 트랙 착수점)
IMPLEMENTATION_STEPS: [1) fixture 시나리오 D1~D3 작성, 2) DB 계약(partial unique index 후보) 설계, 3) fixture-only 실행(실 트래픽 0), 4) verify 스크립트 작성]
VERIFY: verify:attribution-chain(신설) - fixture D1~D3 전부 PASS
ACCEPTANCE: D1~D3 세 시나리오 전부 명세대로 동작 확인, consent=false 시 CAPI enqueue 0 확인
EVIDENCE: tooling/verify/attribution-chain.cjs(신설) + fixture 파일
EXIT_GATE: 이 fixture PASS 전까지 POST-002/003(hooks 실트래픽 연결) 착수 금지
```

### POST-002

```yaml
ID: POST-002
TITLE: Marketing SDK Attribution (utm/consent/cookies)
STATUS: PENDING
SOURCE_PLAN: 06_infra(marketing-sdk-attribution) -> Track G(g-growth-002)
SOURCE_TODO_IDS: [marketing-sdk-attribution, g-growth-002]
ORIGINAL_INTENT: UTM/클릭ID/동의 상태를 서버로 안전하게 전달하는 클라이언트 계약을 만든다. OAuth state에 attribution을 태우는 CSRF 취약점을 원천 차단한다.
CURRENT_SCOPE: packages/sdk/marketing(utm-capture·consent·attribution-store·platform-cookies _fbc/_fbp/_ttp·landing-pixel-publisher.ts manual-only) + apps/web middleware(/l,/ads) + POST /api/v1/marketing/touch + attr_id httpOnly cookie(TTL=PO_PRIVACY_DECISION_REQUIRED, 90d는 후보일 뿐 확정 아님) · OAuth state=CSRF nonce only
DEPENDENCIES: POST-001(PASS 필수)
IMPLEMENTATION_STEPS: [1) SDK 패키지 scaffold, 2) middleware 라우팅, 3) touch API, 4) consent gate(=== true만 emit), 5) GuestChrome 통합]
VERIFY: verify:marketing-compliance(auto pixel import 0 확인 포함)
ACCEPTANCE: consent!==true -> vendor call 0(client+server 전부) 실증, landingVariant cookie가 onboarding까지 유지
EVIDENCE: packages/sdk/marketing/**
EXIT_GATE: consent FAIL_CLOSED 미증명 시 POST-005(dispatcher) 착수 금지
```

### POST-003

```yaml
ID: POST-003
TITLE: Signup/Deposit Attribution Hooks
STATUS: PENDING
SOURCE_PLAN: 06_infra(marketing-signup-deposit-hooks) -> Track G(g-growth-003)
SOURCE_TODO_IDS: [marketing-signup-deposit-hooks, g-growth-003]
ORIGINAL_INTENT: 가입/첫입금 순간 attribution을 1회만 확정 반영한다(중복 반영은 광고비 회계 오류로 직결).
CURRENT_SCOPE: signupStageA -> user_attributions merge · first USDT deposit -> first_deposit_at/usdt 필드 확정 + Purchase enqueue(1회) · DB 계약=txn+partial unique index 또는 SELECT FOR UPDATE(POST-001 D3와 쌍)
DEPENDENCIES: POST-001(D1~D3 PASS 필수, 순서 위반 시 실트래픽 오염)
IMPLEMENTATION_STEPS: [1) signup hook, 2) first-deposit hook(ledger 이벤트 구독), 3) dedup 계약 실제 DB 적용, 4) POST-001 fixture 재실행으로 회귀 확인]
VERIFY: verify:attribution-chain 회귀(fixture->실 hook 동일 계약 확인)
ACCEPTANCE: 실제 signup/first-deposit 이벤트가 fixture와 동일한 dedup 보장을 가짐
EVIDENCE: services/api-nest 관련 hook 코드
EXIT_GATE: hooks가 fixture 계약과 다르면 POST-004/005 착수 금지(계약 drift 방지)
```

### POST-004

```yaml
ID: POST-004
TITLE: CAPI Metrics Spec (METRICS.md SSOT)
STATUS: PENDING
SOURCE_PLAN: 06_infra(marketing-capi-metrics-spec) -> Track G(g-growth-004)
SOURCE_TODO_IDS: [marketing-capi-metrics-spec, g-growth-004]
ORIGINAL_INTENT: "플랫폼별 지표를 통합 단일 %로 뭉치면 착각만 유발"이라는 발견을 문서 SSOT로 고정해, Admin이 실제로 무엇을 보는지 API 응답 필드까지 명시한다.
CURRENT_SCOPE: services/marketing-attribution/METRICS.md(Meta/TikTok/Google success·dedup 판정 필드, parameter coverage minimum vs recommended 기준선, delivery state 카운트 정의) · verify:capi-config(always, env key/wrangler binding/placeholder 패턴 금지/.env.example 동기)
DEPENDENCIES: 없음(PARALLEL_SAFE)
IMPLEMENTATION_STEPS: [1) 3사 공식 API 문서에서 필드명 확정, 2) METRICS.md 작성, 3) .env.example 동기, 4) verify:capi-config 스크립트]
VERIFY: verify:capi-config(PR CI always)
ACCEPTANCE: METRICS.md의 필드명이 실제 API 응답과 1:1, placeholder secret 패턴 0
EVIDENCE: services/marketing-attribution/METRICS.md
EXIT_GATE: METRICS.md 없이 POST-005(dispatcher) 구현 착수 금지(필드명 임의 발명 방지)
```

### POST-005

```yaml
ID: POST-005
TITLE: CAPI Dispatcher Wire (Meta/TikTok/Google)
STATUS: PENDING
SOURCE_PLAN: 06_infra(marketing-capi-dispatcher-wire) -> Track G(g-growth-005)
SOURCE_TODO_IDS: [marketing-capi-dispatcher-wire, g-growth-005]
ORIGINAL_INTENT: 실제 3사 서버사이드 전송을 구현하되, 돈/개인정보가 광고 vendor로 새어나가지 않게 DEFAULT_DENY egress를 강제한다.
CURRENT_SCOPE: workers/marketing-capi-dispatcher(scaffold 존재) Meta/TikTok/GoogleConversionAdapter(공식 API, 임의 HTTPS 하드코딩 금지) + event_id dedup(Client Pixel+Server CAPI 동일 논리 id) + PII SHA256(등재된 필드만) + custom_data allowlist(DEFAULT_DENY: wallet balance/exact profit/KYC 등 전송 금지) + Provider별 Delivery State(PENDING/PROCESSING/DELIVERED/RETRYABLE_FAILED/PERMANENT_FAILED/SUPPRESSED)
DEPENDENCIES: POST-003(hooks)+POST-004(metrics spec) 완료
IMPLEMENTATION_STEPS: [1) adapter 3종 구현, 2) egress allowlist 필터(pre-send keyword scan), 3) delivery state 머신, 4) retry/backoff, 5) staging capi-smoke]
VERIFY: verify:capi-consent(always) + verify:capi-smoke(staging only, CAPI_SMOKE=1, PR daily 3사 호출 금지)
ACCEPTANCE: allowlist 외 필드 전송 0(block+audit log), consent 후에만 전송, staging real access_token 1건 성공
EVIDENCE: workers/marketing-capi-dispatcher/**
EXIT_GATE: DEFAULT_DENY 위반 발견 시 즉시 block, POST-006 착수 금지(측정 신뢰 불가 상태로 표시하면 안 됨)
```

### POST-006

```yaml
ID: POST-006
TITLE: Admin ROAS Health Display
STATUS: PENDING
SOURCE_PLAN: 06_infra(marketing-admin-roas-health) -> Track G(g-growth-006)
SOURCE_TODO_IDS: [marketing-admin-roas-health, g-growth-006]
ORIGINAL_INTENT: Admin이 Worker 실시간 지표를 1차로 보고, 플랫폼 48h 리포트와 "동급 나란히" 비교하다 혼란에 빠지지 않게 한다.
CURRENT_SCOPE: /admin 돈줄 하단 Worker 실시간 default(delivery state·retry backlog·permanent fail·click_id_present_rate·consent_marketing_rate) + 48h 플랫폼 리포트=접힌 섹션/별도 탭(동급 배치 금지) + ROAS=attributed deposit/spend import
DEPENDENCIES: POST-005 완료(측정 데이터 존재해야 표시 가능)
IMPLEMENTATION_STEPS: [1) Admin 위젯, 2) Worker read API, 3) 48h 대조 탭 분리 구현, 4) secret/token 표시 0 검증]
VERIFY: verify:admin-growth-tabs 확장
ACCEPTANCE: Worker 지표와 48h 리포트가 같은 카드에 나란히 표시되지 않음, token/secret 노출 0
EVIDENCE: apps/admin/app/admin/growth/**
EXIT_GATE: 없음(독립 완료 가능)
```

### POST-007

```yaml
ID: POST-007
TITLE: SEO Foundation (sitemap/robots/JSON-LD)
STATUS: PENDING
SOURCE_PLAN: 06_infra(marketing-seo-sitemap-jsonld) -> Track G(g-growth-007)
SOURCE_TODO_IDS: [marketing-seo-sitemap-jsonld, g-growth-007]
ORIGINAL_INTENT: 검색엔진에 정직한 metadata를 제공하고(가짜 aggregateRating 금지), 광고 랜딩(/ads,/l/*)이 crawlable하되 noindex로 검색 노출을 막는다.
CURRENT_SCOPE: sitemap.ts+robots.ts+JSON-LD(Organization+WebSite, 퍼뜩)+/profits generateMetadata + LandingOperatorFooter(supportEmail) + /ads,/l/* crawlable+noindex(Disallow로 AdsBot 차단 금지) + programmatic SEO(/p/[slug],/insights)는 POST_LAUNCH_ONLY로 명시 배제
DEPENDENCIES: 없음(PARALLEL_SAFE)
IMPLEMENTATION_STEPS: [1) sitemap/robots 구현, 2) JSON-LD 스키마, 3) operator footer 바인딩, 4) noindex 메타 검증]
VERIFY: verify:seo-schema(metadata/canonical/sitemap regression) + verify:operator-footer
ACCEPTANCE: JSON-LD에 가짜 aggregateRating 0, /ads·/l/* crawlable+noindex 동시 충족
EVIDENCE: apps/web/app/sitemap.ts, robots.ts
EXIT_GATE: 없음(독립 완료 가능, POST-008 Ads Onboarding의 선행 중 하나)
```

### POST-008

```yaml
ID: POST-008
TITLE: Ads Provider Onboarding (Meta/TikTok/Google)
STATUS: PENDING
SOURCE_PLAN: 06_infra(ads-provider-onboarding) -> Track G(g-growth-008)
SOURCE_TODO_IDS: [ads-provider-onboarding, g-growth-008]
ORIGINAL_INTENT: 실제 광고 계정을 붙이기 전에 각 채널의 공식 write SoT(Marketing/Ads API)를 확정하고, MCP/CLI는 확인된 read/facade로만 제한한다. Kakao user OAuth·CAPI dispatcher와 절대 혼동하지 않는다.
CURRENT_SCOPE: Meta/TikTok/Google 각 공식 API onboarding, Google 공식 MCP가 read-only면 mutation 0, Agent Skills=구현 가이드 only, OAuth/계정연결/새 ad account/새 channel=HIGH+HUMAN, production live 연결=HUMAN+본 task 시점, capability READY 전 ACTIVE 0
DEPENDENCIES: POST-005(CAPI 측정 인프라)+POST-007(SEO) completed - File-Serial 도달 전 구현 0
IMPLEMENTATION_STEPS: [1) 각 사 공식 API 문서 재확인(시점 재조사 필수), 2) provider capability matrix 작성, 3) HUMAN 계정 연결(Founder), 4) adapter 정규화(raw status 미노출)]
VERIFY: verify:ads-provider-capability(신설, 실행 시)
ACCEPTANCE: 3사 provider READY 상태 확인, Agent가 production secret 직접 보유 0
EVIDENCE: workers/ads-provider-adapters/**(실행 시 생성)
EXIT_GATE: 계정 연결 자체는 항상 HUMAN 승인 - Agent가 자동으로 새 계정을 만들 수 없음
```

### POST-009

```yaml
ID: POST-009
TITLE: Ads Budget Standing Authorization
STATUS: PENDING
SOURCE_PLAN: 06_infra(ads-budget-standing-authorization) -> Track G(g-growth-009)
SOURCE_TODO_IDS: [ads-budget-standing-authorization, g-growth-009]
ORIGINAL_INTENT: Founder가 한 번 승인한 deterministic 범위 안에서만 시스템이 반복 승인 없이 운영하게 한다. AI 자유재량이 아니다 - Agent가 스스로 한도를 올릴 수 없다.
CURRENT_SCOPE: enabled/allowed_channels/allowed_ad_accounts/allowed_landing_variants/allowed_message_axes/approved_creative_pool_ids/daily_total_budget_cap/monthly_total_budget_cap/channel_daily_cap/campaign_daily_cap/max_daily_change_pct/max_new_campaigns_per_day/minimum_sample_size/auto_pause_allowed/auto_resume_allowed/expires_at/approved_by/version, Budget Guardrail=deterministic service(+50% 요청이 +10% 한도면 서버 DENY)
DEPENDENCIES: POST-008 completed
IMPLEMENTATION_STEPS: [1) schemas/ads-standing-authorization.v1.json, 2) services/ads-budget-guardrail 구현, 3) versioned 단일 활성 계약+audit, 4) Admin PUT API(HIGH+HUMAN+3-mode)]
VERIFY: verify:ads-standing-authorization+verify:ads-budget-guardrail(신설, 실행 시)
ACCEPTANCE: Guardrail이 한도초과 요청을 deterministic하게 DENY(fixture로 증명), Agent role이 cap 컬럼 UPDATE 불가(서비스가 거부)
EVIDENCE: services/ads-budget-guardrail/**(실행 시 생성)
EXIT_GATE: Standing Authorization 자체 변경은 항상 HIGH+HUMAN+3-mode
```

### POST-010

```yaml
ID: POST-010
TITLE: Ads Campaign Orchestrator
STATUS: PENDING
SOURCE_PLAN: 06_infra(ads-campaign-orchestrator) -> Track G(g-growth-010)
SOURCE_TODO_IDS: [ads-campaign-orchestrator, g-growth-010]
ORIGINAL_INTENT: 광고 생성/집행/최적화를 CAPI(성과측정)와 분리한다 - CAPI schema를 소유하지 않고 health만 읽는다.
CURRENT_SCOPE: Lifecycle(Candidate->Compliance->Landing Consistency->Creative Pool->Budget Guardrail->Provider Capability->PAUSED/DRAFT->Validation->Standing Authorization Gate->ACTIVE->Monitor->Allowed Optimization), 자동 ACTIVE=AND-gate 전부(하나라도 FAIL=0), 허용 action(HOLD/PAUSE/SCALE_UP_WITHIN_LIMIT/SCALE_DOWN_WITHIN_LIMIT/ROTATE_APPROVED_CREATIVE 등), 새 message axis 생성 금지, Emergency Stop(3사 pause+신규ACTIVE block, CAPI 중단 0)
DEPENDENCIES: POST-009 completed
IMPLEMENTATION_STEPS: [1) services/ads-orchestrator lifecycle state machine, 2) AND-gate 구현, 3) Internal API(recommend/mutate 분리), 4) Emergency Stop 엔드포인트]
VERIFY: verify:ads-orchestrator-boundary(신설, 실행 시)
ACCEPTANCE: AND-gate 1개 FAIL -> ACTIVE 0(fixture), Emergency stop이 CAPI dispatcher를 멈추지 않음, campaigns(프로모)와 paid-ads(유료광고) 탭 혼동 0
EVIDENCE: services/ads-orchestrator/**(실행 시 생성)
EXIT_GATE: 새 message axis는 항상 HIGH+HUMAN(Standing Authorization 밖)
```

### POST-011

```yaml
ID: POST-011
TITLE: Cursor Autonomous Ops Enablement
STATUS: PENDING
SOURCE_PLAN: 06_infra(cursor-autonomous-ops-enablement) -> Track G(g-growth-011)
SOURCE_TODO_IDS: [cursor-autonomous-ops-enablement, g-growth-011]
ORIGINAL_INTENT: Cursor가 운영 이슈(SEO/CAPI/CI/배포)를 자율적으로 감시·수정하되, production 배포 자동화는 확대하지 않고 사람 확인 지점을 유지한다.
CURRENT_SCOPE: OpsEvent/GitHub/cron/webhook -> Automation -> Cloud Agent -> Parent -> readonly Subagent -> (외부장애=상태보고만 / 코드이슈=fix->tests->PR->Bugbot->CI->staging->기존 production workflow_dispatch HUMAN), Agent 금지=production ad secret/unrestricted spend/production deploy token/legal mutation/unrestricted DB mutation
DEPENDENCIES: REL-016(Unified OpsEvent, enrich 완료)+REL-506(R8)+POST-010 completed
IMPLEMENTATION_STEPS: [1) OpsEvent 소비 Automation, 2) Cloud Agent+Parent+readonly Subagent 구성, 3) Skill 5종(seo-public-route-audit 등) scaffold, 4) Founder-normalization 표시 배선(04 admin-ops)]
VERIFY: 없음(enablement 자체는 운영 정책 - 실행 시 Skill/Subagent별 개별 검증)
ACCEPTANCE: production deploy 여전히 HUMAN workflow_dispatch, Subagent가 File-Serial todo status 변경 불가(Parent만)
EVIDENCE: .cursor/skills/**, .cursor/agents/**(실행 시 생성, 지금 생성 0)
EXIT_GATE: 본 task 착수 전 Skill/Agent/Automation/Cloud/Bugbot/MCP/live token enable 전부 0(AGENTS.md 명시 준수)
```

### POST-012

```yaml
ID: POST-012
TITLE: Ads Autonomous Ops Release Certification
STATUS: PENDING
SOURCE_PLAN: 06_infra(ads-autonomous-ops-release-certification) -> Track G(g-growth-012)
SOURCE_TODO_IDS: [ads-autonomous-ops-release-certification, g-growth-012]
ORIGINAL_INTENT: "퍼뜩의 최종 자동운영 출시 준비 완료"는 이 인증 하나만 발급할 수 있다 - REL-506(R8 Core Infra 인증) PASS로 대체하지 않는다.
CURRENT_SCOPE: Provider READY, Standing Authorization persist/enforce PASS, Budget Guardrail deterministic fixture, 허용범위 내/외 auto ACTIVE 경계 PASS, Emergency Stop 3사 PASS(CAPI 중단 0), Orchestrator lifecycle PASS, CAPI/Orchestrator ownership 분리 PASS, audit trail PASS, Founder Dashboard 실데이터 PASS, secret 노출 0, Cursor Skills/Subagents/Automations 동작 PASS, production deploy HUMAN 유지
DEPENDENCIES: POST-008+POST-009+POST-010+POST-011 전부 completed
IMPLEMENTATION_STEPS: [1) 19개 검증항목 fixture, 2) verify:ads-autonomous-ops-release 신설, 3) known P0~P3 defect 0 확인, 4) 최종 인증서 발급]
VERIFY: verify:ads-autonomous-ops-release(신설, 실행 시)
ACCEPTANCE: 19개 항목 전부 PASS(위 CURRENT_SCOPE 열거)
EVIDENCE: governance/ads-autonomous-ops/RELEASE_CERTIFICATION.md(실행 시 생성)
EXIT_GATE: 본 인증 PASS 전에는 어떤 문서에도 "퍼뜩의 최종 자동운영 출시 준비 완료"라고 쓰지 않는다
```

### POST-013

```yaml
ID: POST-013
TITLE: Growth Missions Admin
STATUS: PENDING
SOURCE_PLAN: 04_admin(admin-growth-missions) -> Track D(d-admin-009)
SOURCE_TODO_IDS: [admin-growth-missions, d-admin-009]
ORIGINAL_INTENT: 운영자가 미션 카탈로그를 관리하되, "유저에게 수동 지급" 경로는 절대 만들지 않는다(오지급 방지).
CURRENT_SCOPE: /admin/growth?tab=missions D/M/W/S catalog CRUD+budget+releaseHoldHours+accrualHalt 토글+queued_pool 큐 1-click clawback, 유저별 수동지급 UI 0
DEPENDENCIES: 없음(mission_definitions 2 rows 이미 실재, PARALLEL_SAFE)
IMPLEMENTATION_STEPS: [1) 카탈로그 테이블 UI, 2) accrual halt 토글, 3) queued_pool 큐 UI, 4) 수동지급 경로 0 검증]
VERIFY: verify:mission-no-manual-grant
ACCEPTANCE: "유저에게 보너스 지급" per-user 버튼 0, halt 토글이 신규 accrual을 즉시 막음
EVIDENCE: apps/admin/app/admin/growth/missions
EXIT_GATE: 없음
```

### POST-014

```yaml
ID: POST-014
TITLE: Growth Partners Admin
STATUS: PENDING
SOURCE_PLAN: 04_admin(admin-growth-partners) -> Track D(d-admin-010)
SOURCE_TODO_IDS: [admin-growth-partners, d-admin-010]
ORIGINAL_INTENT: 공식 협력사 표기 순서/ON-OFF를 운영자가 통제하되, 로고는 Brand manifest 밖에서 임의 교체하지 못하게 한다.
CURRENT_SCOPE: /admin/growth?tab=partners Tier-A 순서 편집+ON/OFF+audit, 로고=Brand markets manifest only(유저표기 market-partner-trust-surfaces와 별도 구현, 중복 아님)
DEPENDENCIES: 없음(PARALLEL_SAFE)
IMPLEMENTATION_STEPS: [1) 순서 편집 UI, 2) ON/OFF 토글+audit, 3) manifest 외 로고 업로드 경로 0 검증]
VERIFY: verify:market-partner-trust(Admin면)+verify:admin-growth-tabs
ACCEPTANCE: 순서 변경이 유저 표기와 즉시 동기, 로고 임의 업로드 경로 0
EVIDENCE: apps/admin/app/admin/growth/partners
EXIT_GATE: 없음
```

### POST-015

```yaml
ID: POST-015
TITLE: Product Analytics (D1/D7 + 퍼널)
STATUS: PENDING
SOURCE_PLAN: 04_admin(product-analytics) -> Track D(d-admin-015)
SOURCE_TODO_IDS: [product-analytics, d-admin-015]
ORIGINAL_INTENT: 운영자가 리텐션/퍼널을 눈으로 확인할 수 있게 한다(광고 CAPI에 PII raw 전송과는 무관, 별개 목적).
CURRENT_SCOPE: D1/D7 retention(user.events 소스), first_deposit->2nd participate 퍼널 OTel, safe_stop rate, adapter match failure -> /admin 리텐션 위젯(TOP6 하위)
DEPENDENCIES: 없음(PARALLEL_SAFE)
IMPLEMENTATION_STEPS: [1) OTel 계측, 2) 리텐션 집계 쿼리, 3) Admin 위젯, 4) PII raw 전송 0 검증]
VERIFY: 신규(analytics 위젯 스냅샷 테스트)
ACCEPTANCE: D1/D7 숫자가 실제 user.events와 일치, analytics -> CAPI PII raw 전송 경로 0
EVIDENCE: apps/admin/app/admin(리텐션 위젯)
EXIT_GATE: 없음
```

### POST-016

```yaml
ID: POST-016
TITLE: Admin Isolated Deploy (Ops Worker 분리)
STATUS: PENDING
SOURCE_PLAN: 04_admin(admin-isolated-deploy) -> Track D(d-admin-017)
SOURCE_TODO_IDS: [admin-isolated-deploy, d-admin-017]
ORIGINAL_INTENT: 유저 PWA와 Admin Ops를 도메인·배포·인증·WAF까지 완전 분리한다(메이저 베팅사급 관행).
CURRENT_SCOPE: 별도 OpenNext Ops Worker(workers/ops-proxy 존재)+ops.{ROOT_DOMAIN}+Admin JWT(issuer 분리)+IP allowlist+robots noindex, origin=infra/domain.manifest.json openNext.ops(pages deploy 금지)
DEPENDENCIES: 없음(PARALLEL_SAFE, apps/admin 이미 별도 앱)
IMPLEMENTATION_STEPS: [1) infra/ops/ wrangler.toml+access-policy.json, 2) Admin JWT issuer 분리, 3) IP allowlist, 4) robots noindex]
VERIFY: verify:no-admin-in-web + verify:ops-robots-noindex
ACCEPTANCE: apps/web에 /admin route 0, 유저 JWT로 admin API 403, ops 배포에 noindex
EVIDENCE: infra/ops/**
EXIT_GATE: 없음
```

### POST-017

```yaml
ID: POST-017
TITLE: Store Bridge Scaffold (TWA/Play AAB/Uptodown APK, v2)
STATUS: PENDING
SOURCE_PLAN: 05_pwa(store-bridge-scaffold) -> Track E(e-pwa-005)
SOURCE_TODO_IDS: [store-bridge-scaffold, e-pwa-005]
ORIGINAL_INTENT: PWA Day-1(설치형 웹앱)이 확실히 끝난 뒤에만 네이티브 스토어 배포를 시작한다 - 순서를 뒤집으면 이중 구현 위험.
CURRENT_SCOPE: TWA+assetlinks(Play App signing SHA-256), Play `.aab` + Uptodown `.apk`/`.xapk` 동일 패키지·서명 공유(AAB를 Uptodown에 제출 금지), Capacitor iOS shell(TestFlight), native-bridge stub
DEPENDENCIES: REL-023(PWA certification) PASS 후에만 착수(Day-1 게이트)
IMPLEMENTATION_STEPS: [1) PWABuilder/Bubblewrap TWA 생성, 2) assetlinks.json 서빙, 3) AAB+APK 동시 산출, 4) Capacitor iOS shell scaffold]
VERIFY: verify:assetlinks
ACCEPTANCE: assetlinks.json 유효(package↔SHA-256 일치), TWA 주소창 미노출, Play/Uptodown 산출물 포맷 오차 0
EVIDENCE: apps/web/public/.well-known/assetlinks.json(실행 시)
EXIT_GATE: REL-023 미완료 상태에서 착수 금지
```

### POST-018

```yaml
ID: POST-018
TITLE: Uptodown Developers Console Listing (v2)
STATUS: PENDING
SOURCE_PLAN: 05_pwa(store-bridge-uptodown-listing) -> Track E(e-pwa-006)
SOURCE_TODO_IDS: [store-bridge-uptodown-listing, e-pwa-006]
ORIGINAL_INTENT: Uptodown 심사 거절(low-quality webview 등)을 피하려면 listing 기준을 사전에 전부 충족해야 한다.
CURRENT_SCOPE: Developers Console Organization(공개명·https Webpage·지원Email·Nationality)+listing(icon>=256x256·feature 1024x500·short<=70자·full>=50단어)+Country Restriction+publication criteria(VirusTotal 클린·webview 부가가치 증명·배포권)+Submit for review
DEPENDENCIES: POST-017 completed
IMPLEMENTATION_STEPS: [1) Console 가입, 2) listing 필드 작성(카피=UI SSOT), 3) VirusTotal 스캔, 4) Submit for review]
VERIFY: verify:store-uptodown-listing(신설)
ACCEPTANCE: 체크리스트 전항목 충족(§24.3b 8개 필드), 저품질 webview 방어 근거 명시
EVIDENCE: 없음(외부 Console 절차, 문서로만 기록)
EXIT_GATE: 없음(POST-017이 유일 선행)
```

### POST-019

```yaml
ID: POST-019
TITLE: Runtime P1 Adapter Ingest Host Binding
STATUS: PENDING
SOURCE_PLAN: 06_infra(phase1-adapter-ingest-host-binding) -> Track F(f-rel-004)
SOURCE_TODO_IDS: [phase1-adapter-ingest-host-binding, f-rel-004]
ORIGINAL_INTENT: Runtime P0(in-process)에서 Runtime P1(NATS+adapter host 분리)로 넘어갈 때 필요한 host binding을 미리 정의해 둔다 - 지금 활성화하지 않는다.
CURRENT_SCOPE: NEST_ADAPTER_INGEST_URL=API_HOST/api/v1/internal/adapters/ingest 고정, ADAPTER_INGEST_TOKEN wrangler+Nest SSOT, dev=cloudflared 임시 URL -> prod=API_HOST 전환, ebay-adapter tick->ingest E2E
DEPENDENCIES: `.cursor/rules/phase-activation.mdc`의 Runtime P1 활성화 승인(구조적 gate - REL 실행 순서가 아니라 phase 전환 결정)
IMPLEMENTATION_STEPS: [1) prod secret 재등록, 2) NEST_ADAPTER_INGEST_URL 전환, 3) E2E 재확인]
VERIFY: 기존 adapter ingest 회귀
ACCEPTANCE: prod URL로 ebay-adapter tick이 실제 ingest에 도달
EVIDENCE: workers/ebay-adapter, services/api-nest internal ingest 컨트롤러
EXIT_GATE: Runtime P1 활성화 결정 전에는 이 task 자체가 시작되지 않는다(REL 큐와 무관한 별도 gate)
```

---

## N. GLOBAL HOME PLAN DISCOVERY (Round7 · TEMP_ALLOWLIST)

### N.0 절차 결과

```text
ALLOWED_ROOTS_SCANNED = TRUE
HOME_TOP_LEVEL_PLAN_MD = 262
WORKSPACE_PLAN_MD = 21
DUPLICATE_MIRROR = 21/21 (name+SHA256)
PRIOR_HOME_ONLY_10_PRESENT = 10/10
ADDITIONAL_PUTDUK_HOME_ONLY = 36
PUTDUK_HOME_ONLY_TOTAL = 46 (draft 1 + prior 9 + name/header/pass2)
ARCHIVE_STALE = 10
ISOLATION_EXCLUSION = 20 (filename/header clime marker, content not ingested)
OTHER_PROJECT_EXCLUSION = 175 (no PUTDUK path/header marker)
INTAKE_COPY_COUNT = 56 (46 Home-only + 10 archive)
HOME_TO_INTAKE_HASH_MISMATCH = 0
EXECUTION_AUTHORITY = NO (sidecar + README)
CURRENT_MASTER_DRAFT_SOURCE = putduk_release_master_ff3a5134.plan.md (self-absorb 0)
```

Evidence SSOT (workspace only):

- `.cursor/plans/_external_intake/INTAKE_MANIFEST.json`
- `.cursor/plans/_external_intake/EXECUTION_AUTHORITY.json`
- `.cursor/plans/_external_intake/EXCLUSION_REGISTRY.json`
- `.cursor/plans/_external_intake/HOME_TODO_TRACEABILITY.json`
- `.cursor/plans/_external_intake/GLOBAL_DISCOVERY_SUMMARY.json`

### N.1 Prior Home-only 10

| 파일 | 판정 |
|---|---|
| `putduk_release_master_ff3a5134.plan.md` | CURRENT_MASTER_DRAFT_SOURCE · 자기 재흡수 0 |
| `homecleanv1_clean-room_a7760b61.plan.md` | pending HC6-09~HC9 = SUPERSEDED (greenfield + Home freeze) |
| `ai_profit_pivot_docs_a2f2ebb9.plan.md` | pending 8 docs = SUPERSEDED (Current Master + founder-intent SSOT) |
| `퍼뜩_03_ui_ux_master_plan_be3fa3cc.plan.md` | completed 14 = VD · pending part8 = CWR → REL-012+REL-019+REL-603 |
| `engine_final_re-verification_audit_15069cca.plan.md` | completed 7/7 = VD · cache snapshot canonical |
| `r0_흡수_반영_플랜_eaebafd6.plan.md` | cancelled 5 = INVALID |
| `퍼뜩_master_architecture_65b4f0e4.plan.md` | cancelled 5 = INVALID |
| `플랫폼_전체_재설계_로드맵_d903eef7.plan.md` | cancelled 18 = INVALID |
| `ui_live_wiring_part9_a6643cf7.plan.md` | cancelled 1 = INVALID |
| `peotteok_ai_coach_hardening_v1_2969f0aa.plan.md` | todos:[] = DUPLICATE of `plan_a645a0ad` (6 VD) |

### N.2 Home/archive atomic TODO 검산

```text
INTAKE_TRACE_ROWS = 381
VERIFIED_DONE = 261
SUPERSEDED = 71
INVALID = 37
CANONICAL_WORK_REQUIRED = 11
DUPLICATE = 1
검산: 261+71+37+11+1 = 381
UNMAPPED_VALID_OLD_TODO = 0
```

CWR 11 → 실행 정의:

| SOURCE | TODO | CANONICAL |
|---|---|---|
| account_hub_figma | figma-context, desktop-me, mobile-me, annotate-qa | **REL-131** (신규, 아래 13필드) |
| parallel_consumer_ui_figma | cux-003 | REL-107 |
| parallel_consumer_ui_figma | cux-004, cux-cert-profits-desktop | REL-106 |
| parallel_consumer_ui_figma | cux-005 | REL-109 |
| parallel_consumer_ui_figma | cux-006 | REL-110 + REL-112 |
| parallel_consumer_ui_figma | cux-007 | REL-113~REL-119 |
| 퍼뜩_03_ui_ux | part8-loop-proof-responsive-spotcheck | REL-012 + REL-019 + REL-603 |

archive 10 + Home `02.5_engine_acceptance` pending = STALE_SUPERSEDED_SNAPSHOT (workspace `02_5` qa0~qa9 completed, 최종 인증 = REL-502).
Home `ebay_observation_bridge` pending = VERIFIED_DONE (workspace slice completed + `IMPLEMENTED_PARSERS` includes `ebay`).

### N.3 REL-131 정의 (CWR, pointer-only 금지)

```yaml
ID: REL-131
TITLE: Account Hub Figma Desktop + Mobile frames
STATUS: PENDING
SOURCE_PLAN: account_hub_figma_23be13c4.plan.md
SOURCE_TODO_IDS: [figma-context, desktop-me, mobile-me, annotate-qa]
ORIGINAL_INTENT: Spark Dash DNA로 Account Hub(/me) Desktop 1440×1080과 Mobile 390×693 프레임을 새로 그리고, Backup Home(구 3탭)을 클론하지 않는다.
CURRENT_SCOPE: Figma fileKey w7Yg8j2x9evuheOSSLqFw5에서 Room/Execution 셸만 safe duplicate. sidebar 8 + Primary 8 IA(Desktop), bottom 5 + 더보기 active(Mobile). truth-safe copy. 어노테이션+self QA REPORT 후 STOP.
DEPENDENCIES: PRE-LOCK-001 완료(fileKey 접근). Home freeze 유지. REL-123은 이 프레임 Founder 검토 후 시각 정합만.
IMPLEMENTATION_STEPS:
  - 00_Readme 재확인, Backup Home 클론 금지
  - Desktop 1440 Account Hub 프레임
  - Mobile 390 Account Hub 프레임
  - annotate + QA REPORT
VERIFY: Figma MCP get_screenshot + node-id 기록, Home geometry regression 0
ACCEPTANCE: Desktop/Mobile 프레임 존재, none/더보기 active 규칙, IT jargon 0, FAKE MONEY 0
EVIDENCE: 실행 후 Figma node-id + intake source hash
EXIT_GATE: Founder 프레임 검토 전 REL-123을 시각 재구현으로 확장하지 않음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: FALSE
```

### N.4 Cache snapshot

```text
KNOWN_CACHE_SNAPSHOT_REFERENCE = 1
CACHE_SNAPSHOT_PATH = UNRESOLVED
CANONICAL_SOURCE = engine_final_re-verification_audit_15069cca.plan.md
CANONICAL_STATUS = COMPLETED_7_OF_7
CLASSIFICATION = STALE_CACHE_SNAPSHOT
EXECUTION_AUTHORITY = NO
KNOWN_CACHE_SNAPSHOT_EXECUTION_RISK = 0
```

재탐색하지 않음. 홈 canonical 7/7 completed를 이번 intake에서 재확인.

### N.5 Isolation / Other exclusion

최소 metadata만 `.cursor/plans/_external_intake/EXCLUSION_REGISTRY.json` (195건).
`clime_` 파일명 20건은 내용 미읽음. 나머지 175건은 헤더 60~120줄 마커 부재로 OTHER.

`ui_ux_백지화_엔진_보존_80d39f93.plan.md`는 헤더에 `CLIME_PRODUCT_OS` / `clime_rebuild_v2`가 있어 ISOLATION_EXCLUSION. PUTDUK 백지화 플랜이 아니다.

