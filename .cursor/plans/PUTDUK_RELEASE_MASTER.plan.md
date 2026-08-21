---
name: PUTDUK Release Master
overview: 단일 실행 SSOT. PRE-LOCK 1 + REL 116 + POST 19 = 136개 canonical task definition을 이 파일에 전부 수록. pointer-only 0. PLAN_LOCKED=TRUE. REL-125 COMPLETED. FIRST_EXECUTION_TODO=REL-126. HARD_STOP_AFTER=REL-130. BATCH_REL_120_130=ACCOUNT_HUB.
todos:
  - id: pre-lock-001
    content: "[PRE-LOCK, REL큐 밖] FIGMA_AUTHORITY_DISCOVERY: 실행 완료 - fileKey w7Yg8j2x9evuheOSSLqFw5 실제 MCP 접근 확인, 15개 frame 실사+분류 완료(전부 BACKUP 또는 FOUNDER_REVIEW_CANDIDATE, APPROVED_AUTHORITY 0건). Surface Matrix FIG 컬럼 갱신 완료. 본 파일 materialization 검산 PASS 후 PLAN_LOCKED=TRUE"
    status: completed
  - id: rel-000
    content: "[Foundation] 작업 트리 전수 분류(tracked/untracked/ignored/tmp/secret-risk) — DONE 341 paths, evidence=governance/release-master/REL-000-TREE-INVENTORY.md"
    status: completed
  - id: rel-001
    content: "[Foundation] secrets scan + 분류된 항목만 recoverable backup 브랜치(preserve/*, merge 대상 아님)로 대피 — DONE preserve/2026-08-20-worktree-rescue ae8d1e6, 151/151, evidence=governance/release-master/REL-001-PRESERVE-EVIDENCE.md"
    status: completed
  - id: rel-002
    content: "[Foundation] recovery/home-capture 브랜치에서 Home 구현+승인 baseline 복원 -> verify -> PR -> CI -> merge(main 직접 커밋 금지) — DONE PR #2 MERGED db6db87, evidence=governance/release-master/REL-002-HOME-CAPTURE-EVIDENCE.md"
    status: completed
  - id: rel-003
    content: "[Foundation] recovery/track-a-data-core 브랜치에서 migration 3건+opportunities 변경+opportunity-reprice.service.ts(레거시 reprice-freshness 플랜 산출물) 복원 -> verify -> PR -> CI -> merge — DONE PR #3 MERGED f53e182, evidence=governance/release-master/REL-003-TRACK-A-DATA-CORE-EVIDENCE.md"
    status: completed
  - id: rel-004
    content: "[Foundation] ENGINE_BASELINE_SANITY_CHECK(경량, 정식 인증 아님) — DONE 13/13 PASS on origin/main f53e182, evidence=governance/release-master/REL-004-ENGINE-SANITY.md"
    status: completed
  - id: rel-005
    content: "[Foundation][A1] cursor-autonomous-ops.mdc 개정: production 인간 게이트 보존 + non-production A3 개방 — DONE PR #4 MERGED 345b4d6, evidence=governance/release-master/REL-005-AUTONOMOUS-OPS-A3.md"
    status: completed
  - id: rel-006
    content: "[Foundation][P0-safety] QA_ENV_ISOLATION_GUARD 선행 확인 후 QA-LAB-BOOTSTRAP을 tooling/e2e에 committed spec으로 구축(MCP 단독 조작은 DONE 불인정) — DONE PR #5 MERGED 06d688a, evidence=governance/release-master/REL-006-QA-LAB-BOOTSTRAP.md"
    status: completed
  - id: rel-007
    content: "[Foundation][P0] money \"0\" fallback -> UNAVAILABLE 수정 + committed Bootstrap spec으로 검증 — DONE PR #6 MERGED a1e327d, evidence=governance/release-master/REL-007-MONEY-UNAVAILABLE.md"
    status: completed
  - id: rel-008
    content: "[Foundation] settlement_rule.rs/.cjs golden vector parity script를 T0/T1에 편입 — DONE PR #7 MERGED 32b5cfb, evidence=governance/release-master/REL-008-SETTLEMENT-RULE-PARITY.md"
    status: completed
  - id: rel-009
    content: "[Foundation][Lock 이후 실행] Figma Integration Infrastructure: PRE-LOCK-001 결과물을 design token/Code Connect로 실제 코드에 반영 — DONE PR #8 MERGED 374e807, evidence=governance/release-master/REL-009-FIGMA-REGISTRY.md"
    status: completed
  - id: rel-010
    content: "[Foundation] auth 라우트 rate limiting 실제 동작 테스트로 검증/구현 — DONE PR #9 MERGED 5232a0a, evidence=governance/release-master/REL-010-AUTH-RATE-LIMIT.md"
    status: completed
  - id: rel-011
    content: "[Foundation] apps/web 실제 lint 구현(현재 no-op 스크립트 교체) — DONE PR #10 MERGED 1701acf, evidence=governance/release-master/REL-011-WEB-LINT.md"
    status: completed
  - id: rel-012
    content: "[Foundation] axe-core를 committed Playwright 하네스에 배선 — DONE PR #11 MERGED 4abd51c, evidence=governance/release-master/REL-012-AXE-HARNESS.md"
    status: completed
  - id: rel-013
    content: "[Foundation] apps/web next.config.ts images.remotePatterns 확인/수정 — DONE PR #12 MERGED 2ab2b71, evidence=governance/release-master/REL-013-REMOTE-PATTERNS.md"
    status: completed
  - id: rel-014
    content: "[Foundation][scope 축소: E-PWA-001만] PWA native shell - manifest link+icons+service worker 실연결(Push/WebAuthn은 REL-020~022로 분리) — DONE PR #13 MERGED 739bbbe, evidence=governance/release-master/REL-014-PWA-NATIVE-SHELL.md"
    status: completed
  - id: rel-015
    content: "[Foundation] 유저용 generic ledger/journal 조회 API 신설(Transaction History 백엔드 갭) — DONE PR #14 MERGED 2d235d1, evidence=governance/release-master/REL-015-USER-LEDGER-QUERY.md"
    status: completed
  - id: rel-016
    content: "[Foundation] observability 도입(client/server error tracking, 구조화 로그, alerting) — DONE PR #15 MERGED 5ea55ae, evidence=governance/release-master/REL-016-OBSERVABILITY.md"
    status: completed
  - id: rel-017
    content: "[Foundation][Legacy] LEGACY_PLAN_MIGRATION_REGISTRY: .cursor/plans/** 21개 전량 실사, CONTENT_AUTHORITY/EXECUTION_AUTHORITY 이원 표기, 미해결 항목 전부 REL-XXX 또는 VERIFIED_DONE 매핑 — DONE PR #16 MERGED d7d418d, evidence=governance/release-master/REL-017-LEGACY-PLAN-STAMP.md"
    status: completed
  - id: rel-018
    content: "[Foundation][Asset] ASSET_PRODUCTION_PIPELINE 인프라화: 기존 capture/download 스크립트 패턴(apps/web/scripts/*)을 표준 생성-검수-최적화 파이프라인으로 통합 — DONE PR #17 MERGED 2e6dba1, evidence=governance/release-master/REL-018-ASSET-PIPELINE.md"
    status: completed
  - id: rel-019
    content: "[Foundation][Responsive] RESPONSIVE_DEVICE_TIER_SYSTEM 통합: 기존 detectDeviceTier/ux-design-system 재사용, 대형화면 안전망 CSS 정책 문서화(Home 소급 적용 제외) — DONE PR #18 MERGED e88a434, evidence=governance/release-master/REL-019-DEVICE-TIER.md"
    status: completed
  - id: rel-020
    content: "[Foundation][PWA] Push+Badge(VAPID, workers/push-dispatcher 재사용, Admin push kill) - Track E E-PWA-002 — DONE PR #19 MERGED d96f0db, evidence=governance/release-master/REL-020-PUSH-BADGE.md"
    status: completed
  - id: rel-021
    content: "[Foundation][PWA] 자동 Push 채널 필터(notice/campaign/opportunity prefs) - Track E E-PWA-003 — DONE PR #20 MERGED d057036, evidence=governance/release-master/REL-021-PUSH-CHANNEL-FILTER.md"
    status: completed
  - id: rel-022
    content: "[Foundation][PWA] WebAuthn UX/RP + haptics fallback - Track E E-PWA-004 — DONE PR #21 MERGED 21e25fc, evidence=governance/release-master/REL-022-WEBAUTHN-UX.md"
    status: completed
  - id: rel-023
    content: "[Foundation][PWA] PWA certification(manifest/install/offline/push dedup/WebAuthn/reduced-motion) - Track E E-PWA-007, deps REL-014,020,021,022 — DONE PR #22 MERGED 21eaddb, evidence=governance/pwa/DAY1_CERTIFICATION.md"
    status: completed
  - id: rel-100
    content: "[Consumer][Asset+Responsive 필드 포함] Landing(/ guest state) 클로저"
    status: completed
  - id: rel-101
    content: "[Consumer][Legacy:C-ACQ-001~003] Signup(/auth/signup) 클로저 - Track C(Current Master) completed 선언 + verify:acquisition-release.cjs 실재 확인(Round6). 잔여=재확인 게이트만(전면 재구현 아님)"
    status: completed
  - id: rel-102
    content: "[Consumer][Legacy:C-AUTH-001+C-ACQ-001~003] Login(/auth/login) 클로저 - Kakao OAuth backend는 C-AUTH-001 completed(CODE_RUNTIME_CLOSED) 이나 LIVE_KAKAO_HUMAN_E2E=NOT_RUN(Founder 계정 필요, HUMAN_ESCALATION 후보). 잔여=실제 Kakao 계정 E2E 1회 확인"
    status: completed
  - id: rel-103
    content: "[Consumer][Legacy:C-ACQ-001~003] CompleteProfile(/auth/complete-profile) 클로저 - Track C completed 선언 범위(재확인 게이트만)"
    status: completed
  - id: rel-104
    content: "[Consumer][Legacy:C-ACQ-001~003] Onboarding(/onboarding) 클로저 - Track C completed 선언 범위(재확인 게이트만)"
    status: completed
  - id: rel-105
    content: "[Consumer][Home Freeze 예외: 신규 반응형/asset 요구 소급 없음] Home 잔여 클로저(Playwright+A11y+Security만)"
    status: completed
  - id: rel-106
    content: "[Consumer][Legacy:B-LOOP-001] OpportunityList(/profits) 클로저 - Round6 재검증: Track B(Current Master) backend/data 배선 completed 자체 선언 + FIG=76:2/116:28/122:34 Founder Review Candidate 확보. 잔여=Figma candidate 적용+PASS 승격 여부 확인만(전면 재구현 아님)"
    status: completed
  - id: rel-107
    content: "[Consumer][Legacy:B-PARTICIPATION-001] OpportunityDetail(/profits/[id]) 클로저 - Round6 실측 재확인: OpportunityDetailClient.tsx가 issuePreflight+postParticipate 실제 호출(grep 직접 확인, git status=M 즉 아직 미커밋) · FIG=96:2/104:43+109:28 Founder Review Candidate. 잔여=REL-000~003 커밋 파이프라인으로 흡수+Figma 후 시각 정합"
    status: completed
  - id: rel-108
    content: "[Consumer][Legacy:B-LOOP-001] ParticipateConfirmation(modal) 클로저 - FIG=103:315(Desktop)/103:314 ParticipateConfirmSheet 11-state 컴포넌트 Founder Review Candidate. Track B가 참여 플로우 전체를 completed로 선언(모달 포함 여부는 REL-107 실행 시 재확인)"
    status: completed
  - id: rel-109
    content: "[Consumer][Legacy:B-EXECUTION-001] Matching/execute(/trades/[id]/execute) 클로저 - Round6 실측 재확인: TradeExecuteClient.tsx가 useTradeExecution 실제 호출+MatchingInProgress/Retrying/Settled/StoppedSafely/Failed 상태머신 실구현(committed, PendingFigma 아님) · FIG=155:222(Desktop)/140:34,142,250,358(Mobile) Founder Review Candidate. 잔여=Figma 후 시각/모션 정합만"
    status: completed
  - id: rel-110
    content: "[Consumer][Legacy:B-TRADES-001] MatchingResult(/trades) 클로저 - Round6 실측 재확인: TradesClient.tsx가 fetchTradeList+fetchWalletBuckets 실제 호출, loading/empty/unauthorized/ready 상태 실구현(committed). 잔여=시각 정합만(기능은 REAL)"
    status: completed
  - id: rel-111
    content: "[Consumer] Earnings(/trades embed) 클로저 — DONE PR #25 MERGED 0b32b47"
    status: completed
  - id: rel-112
    content: "[Consumer] SettlementDetail 클로저(REL-015 선행) — DONE PR #25 MERGED 0b32b47"
    status: completed
  - id: rel-113
    content: "[Consumer][Legacy:B-WALLET-001~003] Wallet(/wallet) 클로저 - Track B(Current Master) 선언: 기능 대부분 REAL(buckets/deposit/withdraw/KYC 8+ 테이블 실측 확인됨), 잔여=시각 정합(gap-only)만. 전면 재구현 아님 — DONE PR #25 MERGED 0b32b47"
    status: completed
  - id: rel-114
    content: "[Consumer] UsdtDeposit 클로저 — DONE PR #25 MERGED 0b32b47"
    status: completed
  - id: rel-115
    content: "[Consumer] KrwDeposit 클로저 — DONE PR #25 MERGED 0b32b47"
    status: completed
  - id: rel-116
    content: "[Consumer] UsdtWithdraw 클로저 — DONE PR #25 MERGED 0b32b47"
    status: completed
  - id: rel-117
    content: "[Consumer] KrwWithdraw 클로저 — DONE PR #25 MERGED 0b32b47"
    status: completed
  - id: rel-118
    content: "[Consumer] TransactionHistory 클로저(REL-015 선행) — DONE PR #25 MERGED 0b32b47"
    status: completed
  - id: rel-119
    content: "[Consumer] TransactionDetail 클로저(REL-015 선행) — DONE PR #25 MERGED 0b32b47"
    status: completed
  - id: rel-120
    content: "[Consumer][Legacy:C-ACC-001~003] Referral(/me/invite) 클로저 - Track C \"핵심 8영역\" completed 선언(verify:account-hub-release.cjs 실재 확인, Round6). 잔여=재확인 게이트만"
    status: completed
  - id: rel-121
    content: "[Consumer][Legacy:C-ACC-001~003] Notifications(/me/inbox) 클로저 - Track C \"핵심 8영역\" completed 선언 범위(재확인 게이트만) — DONE 401≠empty · leftover chrome 0"
    status: completed
  - id: rel-122
    content: "[Consumer][Asset 후보 기존재] AIInsight(/me/peotteok) 클로저 - public/spark-dash/ai-orb.svg 재사용 · fact-only · leftover chrome 0"
    status: completed
  - id: rel-123
    content: "[Consumer][Legacy:C-ACC-001~003] Profile(/me) 클로저 - session owner · leftover chrome 0 · REL-131 Figma 미대기"
    status: completed
  - id: rel-124
    content: "[Consumer][Legacy:C-ACC-001~003] Kyc(/me/kyc) 클로저 - status owner · fake approved 0"
    status: completed
  - id: rel-125
    content: "[Consumer][Legacy:C-ACC-001~003] Settings(/me/settings, Security 병합) 클로저 - prefs persist · logout/delete owners"
    status: completed
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
CURRENT_EXECUTION_SSOT = .cursor/plans/PUTDUK_RELEASE_MASTER.plan.md
CURRENT_EXECUTION_SSOT_VERIFIED = TRUE
PLAN_LOCKED = TRUE
BLOCKING_ON = []
FIRST_EXECUTION_TODO = REL-126
LAST_COMPLETED_TODO = REL-125
BATCH_REL_120_130 = ACCOUNT_HUB
HARD_STOP_AFTER = REL-130
PRE_LOCK_COUNT = 1
REL_COUNT = 116
POST_COUNT = 19
MASTER_TODO_COUNT = 136
REVISION = Round7 materialization (self-contained SSOT, pointer-only 0)

CURRENT_TEMP_ALLOWLIST_PRESENT = FALSE
TEMP_ALLOWLIST_PRESENT_AT_AUDIT = TRUE
TEMP_ALLOWLIST_WORK_COMPLETE = TRUE
PROJECT_ISOLATION_BOUNDARY_RESTORED = TRUE

FIGMA_URL_BLOCKER = 0
HOME_MIRROR_SYNC = DISABLED_UNDER_CURRENT_ISOLATION
CURSOR_SYNC_PLANS = DISABLED_UNDER_CURRENT_ISOLATION
PLAN_STAMP_SCOPE = WORKSPACE_ONLY
```

이 파일 하나만 읽어도 136개 실행 TODO를 수행할 수 있다.
다른 플랜의 실행 큐를 따르지 않는다. Track/레거시 파일은 SOURCE_PLAN(출처)일 뿐 실행 정의가 아니다.

## 1. HARD INVARIANTS

- Consumer presentation authority = APPROVED_FIGMA_ONLY. 현재 APPROVED_AUTHORITY = 0. Home은 screenshot freeze가 유일한 시각 권위.
- HOME_RETROACTIVE_VISUAL_REDESIGN = NO. HOME_LARGE_SCREEN_SAFETY_QA = YES.
- FAKE FOMO / FAKE MONEY / FAKE DURATION = 0. USDT primary · KRW secondary. missing → 0 금지.
- Money/Ledger/FX/Matching/Settlement owner 재발명 금지. 잔액 UPDATE 금지. PG사 0.
- git add -A 금지. main 직접 커밋 금지. 기본 경로 = branch → PR → CI → merge.
- production deploy = workflow_dispatch HUMAN. REL-701-DB = Founder 명시 승인.
- `pnpm cursor:sync-plans` 는 전역 `%USERPROFILE%\.cursor\plans\**` 에 쓰므로 현재 isolation 하에서 **실행하지 않는다**.
- project-isolation-boundary.mdc 를 이 작업으로 수정하지 않는다.
- QA money mutation 은 QA_ENV_ISOLATION_GUARD PASS 후에만.
- REL-502 의존 = 속성 `PROTECTED_SCOPE_MUTATION=TRUE` 인 모든 REL (고정 숫자 range 아님).

## 2. FIGMA_PROJECT_REGISTRY

```yaml
PUTDUK_FIGMA_AUTHORITY:
  fileKey: w7Yg8j2x9evuheOSSLqFw5
  fileName: "퍼뜩 · PUTDUK — Spark Dash Consumer UI"
  team: "퍼뜩의 팀"
  pages: ["00_Readme(0:1)", "03_Components(2:68)"]
  authorityStatus: FOUNDER_REVIEW_CANDIDATE
  homeAuthorityConflict: NONE
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
  lastVerifiedAt: "2026-08-20"
  discoveredVia: RECOVERED_PROJECT_CONTEXT
```

APPROVED_AUTHORITY = 0. 후보 frame을 승인으로 승격하지 않는다. REL-009는 이 레지스트리를 재사용한다.

## 3. PROTECTED_SCOPE_MUTATION INDEX

protected roots = `services/api-nest/**`, `services/engine-rust/**`, 관련 `schemas/**`, `eval/**`, `supabase/migrations/**`.

현재 TRUE: REL-003, REL-008, REL-010, REL-015, REL-016, REL-020, REL-021, REL-022, REL-222, REL-223, REL-224, REL-401, REL-405, REL-406, REL-407, REL-408.

REL-701-DB 는 이미 인증된 migration 의 production apply 이며 소스 트리 신규 mutation이 아니므로 FALSE. 실행 중 예상 밖 backend 변경이 필요하면 그 REL에 TRUE를 재부여하고 REL-502 집합에 편입한다.

## 4. PRODUCTION ORDER

migration 소스 → QA branch → REL-504 readiness → REL-600 staging → REL-601 회귀 → REL-602 rollback 연습 → REL-700 집계 → REL-701-DB apply(Founder) → REL-701 app deploy → REL-702 smoke.

STAGING_BEFORE_PRODUCTION_DB_MUTATION = TRUE.

## 5. CANONICAL TASK DEFINITIONS

각 실행 TODO는 15필드를 모두 가진다. 해당 없으면 N/A. 삭제 금지.

### PRE-LOCK-001

```yaml
ID: PRE-LOCK-001
TITLE: FIGMA_AUTHORITY_DISCOVERY
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - pre-lock-001
ORIGINAL_INTENT: Lock 전에 Figma fileKey를 MCP로 실측하고 frame을 APPROVED/BACKUP/FOUNDER_REVIEW_CANDIDATE로 분류해 FIGMA_PROJECT_REGISTRY에 영구 보존한다.
CURRENT_SCOPE: "완료. fileKey w7Yg8j2x9evuheOSSLqFw5 MCP 접근 OK. 15개 최상위 frame 전수 분류. APPROVED_AUTHORITY=0. Home 46:2는 self-declared BACKUP. Surface Matrix FIG 컬럼 갱신 완료."
DEPENDENCIES: N/A
IMPLEMENTATION_STEPS:
  - "완료: get_metadata/get_libraries 실호출"
  - "완료: 15 frame 분류표 작성"
  - "완료: FIGMA_PROJECT_REGISTRY 본 파일 §2에 수록"
  - 추가 실행 없음
VERIFY: N/A (이미 실측 완료, 본 파일 §2 레지스트리가 evidence)
ACCEPTANCE: fileKey 접근 OK, APPROVED_AUTHORITY를 조작하지 않음, Home freeze 침범 0
EVIDENCE: 본 파일 §2 FIGMA_PROJECT_REGISTRY + PRE-LOCK 실측 표
EXIT_GATE: 완료. REL-009 이후는 이 레지스트리를 재요청 없이 재사용
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-000

```yaml
ID: REL-000
TITLE: 작업 트리 전수 분류 (tracked/untracked/ignored/tmp/secret-risk)
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-000
ORIGINAL_INTENT: 미커밋 작업/시크릿/임시파일을 잃지 않고, 동시에 git add -A로 오염시키지 않도록 전수 분류부터 한다.
CURRENT_SCOPE: workspace git status 전량 분류. 제품 코드 수정 0. DB/runtime mutation 0. 분류 인벤토리만 생성.
DEPENDENCIES:
  - PRE-LOCK-001
IMPLEMENTATION_STEPS:
  - git status --short --untracked-files=all 와 git diff --stat 수집 (git add 금지)
  - 각 경로를 tracked / untracked / ignored / tmp / secret-risk 로 분류
  - secret-risk(.env, pem, service_role, JWT)는 커밋 후보에서 즉시 제외하고 경로만 기록
  - .cursor/tmp, _tmp*, capture png, 플랜 draft는 tmp 또는 plan-meta로 분리
  - Home freeze 파일, spark-dash, opportunities, opportunity-reprice.service.ts, migrations를 recoverable 후보로 표시
  - 분류 결과를 governance/release-master/REL-000-TREE-INVENTORY.md 로 기록
VERIFY: 인벤토리에 모든 untracked+modified 경로가 한 번씩 등장. git add -A 사용 0. secret-risk staged 0.
ACCEPTANCE: 분류표 존재. git add -A 금지 준수. 제품 파일 미수정. 다음 REL-001이 이 표를 입력으로 쓸 수 있음.
EVIDENCE: "governance/release-master/REL-000-TREE-INVENTORY.md + REL-000-TREE-INVENTORY.json (2026-08-20, 341 rows, staged=0, secret-risk-staged=0)"
EXIT_GATE: 인벤토리 없이 REL-001 착수 금지. git add -A 발견 시 즉시 중단. REL-000 PASS — REL-001 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-001

```yaml
ID: REL-001
TITLE: secrets scan + recoverable backup 브랜치 대피
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-001
ORIGINAL_INTENT: 복원 가능한 작업만 preserve/* 브랜치로 대피하고, 시크릿과 쓰레기 파일은 절대 백업에 넣지 않는다.
CURRENT_SCOPE: REL-000 인벤토리의 recoverable 항목만 새 브랜치 preserve/<date>-worktree-rescue 에 커밋. merge 대상 아님. main 직접 커밋 금지.
DEPENDENCIES:
  - REL-000
IMPLEMENTATION_STEPS:
  - REL-000 인벤토리에서 secret-risk / ignored / 순수 tmp를 제외
  - pnpm verify 계열 secrets scan 또는 tooling secrets fixture로 후보 재검사
  - git checkout -b preserve/<date>-worktree-rescue (main에서, merge-back 금지 주석을 커밋 메시지에 명시)
  - 분류된 recoverable 경로만 git add (경로 지정). git add -A 금지
  - "T0 verify:gate:fast 후 atomic commit. push는 이 REL의 필수가 아님(세션 stop/명시 전까지 보류)"
  - preserve 브랜치는 PR/merge 대상이 아님을 REL-000 인벤토리에 교차 기록
VERIFY: staged secrets 0. preserve 브랜치에 recoverable Home/profits/reprice/migration 후보 존재. merge-to-main 0. PASS 2026-08-20.
ACCEPTANCE: backup 브랜치 존재. 시크릿 미포함. main 트리 불변 또는 이 브랜치에만 커밋. PASS 2026-08-20.
EVIDENCE: "preserve/2026-08-20-worktree-rescue ae8d1e634cb07998982997bb520396b825a7a42e · 151/151 · governance/release-master/REL-001-PRESERVE-EVIDENCE.md + REL-000 §6.1 교차 기록"
EXIT_GATE: secret staged 또는 git add -A 사용 시 REL-002 금지. REL-001 PASS — REL-002 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-002

```yaml
ID: REL-002
TITLE: Home 구현+승인 baseline 복원 (branch-PR-CI-merge)
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-002
ORIGINAL_INTENT: Founder 승인 Home Desktop/Mobile을 잃지 않고 main에 안전하게 올린다. main 직접 커밋 금지.
CURRENT_SCOPE: recovery/home-capture 브랜치에서 HomeDesktop/HomeMobile, spark-dash-home, home-approval-freeze, 관련 assets만 복원. Home 시각 재설계 금지. PR→CI→merge.
DEPENDENCIES:
  - REL-001
IMPLEMENTATION_STEPS:
  - REL-000 인벤토리에서 Home 관련 경로만 추출 (HomeDesktop.tsx, HomeMobile.tsx, spark-dash-home/*, governance/consumer-home-approval/*, public/spark-dash Home assets)
  - git checkout -b recovery/home-capture
  - 해당 경로만 add. Home geometry/Hero/Header/Sidebar/Bottom Nav 변경 금지
  - home freeze JSON과 Desktop 1440 / Mobile 390 의미가 깨지지 않는지 확인
  - "domain verify + pnpm verify:gate:fast 후 PR. main 직접 커밋 금지"
  - CI gate green 후 merge. preserve 브랜치를 main에 통째 merge하지 않음
VERIFY: Home freeze 파일 존재. Home 시각 재설계 diff 0. PR+CI green. PASS 2026-08-21. ruleset context gate / verify-gate → verify-gate 후 비우회 merge.
ACCEPTANCE: 승인 Home baseline이 main 히스토리에 PR로 도착. HOME_RETROACTIVE_VISUAL_REDESIGN=NO 유지. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/2 MERGED · merge SHA db6db871a809c6748173d76430e2fe56c6b5484c · CI 32383942899 · governance/release-master/REL-002-HOME-CAPTURE-EVIDENCE.md + REL-002-RULESET-REPAIR.json"
EXIT_GATE: CI red 또는 Home geometry 변경 발견 시 merge 금지. REL-002 PASS — REL-003 착수 가능. 이 채팅에서 REL-003 실행 0.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-003

```yaml
ID: REL-003
TITLE: Track A data-core + reprice 산출물 복원 (branch-PR-CI-merge)
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_A_product_data_core.plan.md + ai_profit_os_opportunity_reprice_freshness.plan.md
SOURCE_TODO_IDS:
  - rel-003
  - a-data-001
  - a-product-001
  - a-match-003
  - a-data-002
ORIGINAL_INTENT: 로컬에만 있는 SourceObservation/CanonicalProduct/MatchResult migration과 opportunity reprice 구현을 잃지 않고 main에 올린다. 프로덕션 apply는 하지 않는다.
CURRENT_SCOPE: recovery/track-a-data-core 브랜치. supabase/migrations 관련 3건 + opportunities 변경 + services/api-nest/src/opportunities/opportunity-reprice.service.ts. 원격 apply_migration 금지.
DEPENDENCIES:
  - REL-001
IMPLEMENTATION_STEPS:
  - REL-000 인벤토리와 Track A evidence 경로를 대조해 실제 변경 파일 목록을 확정
  - opportunity-reprice.service.ts diff가 레거시 reprice-freshness 서술과 맞는지 먼저 확인
  - git checkout -b recovery/track-a-data-core
  - migration + opportunities + reprice 서비스만 add. production apply 스크립트 실행 금지
  - "관련 verify(canonical-product/match-result/reprice 존재 시) + verify:gate:fast"
  - PR → CI → merge. REL-701-DB 이전 원격 스키마 변경 0
VERIFY: 복원 파일이 PR에 포함. apply_migration 호출 0. T0/T1 해당 도메인 verify PASS. PASS 2026-08-21.
ACCEPTANCE: 로컬 proof 산출물이 main에 PR로 도착. PRODUCTION_MIGRATION_APPLY는 REL-701-DB에만 남음. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/3 MERGED · merge SHA f53e182f291f8c941e33671371075dec19142d36 · CI 32388878034 · governance/release-master/REL-003-TRACK-A-DATA-CORE-EVIDENCE.md"
EXIT_GATE: 원격 DB mutation 흔적 있으면 즉시 중단. REL-003 PASS — REL-004 착수 가능. 이 채팅에서 REL-004 실행 0.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-004

```yaml
ID: REL-004
TITLE: ENGINE_BASELINE_SANITY_CHECK (경량, 정식 인증 아님)
STATUS: COMPLETED
SOURCE_PLAN: ai_profit_os_02_5_engine_acceptance_c3d4e5f6.plan.md
SOURCE_TODO_IDS:
  - rel-004
ORIGINAL_INTENT: 복원 직후 엔진이 깨지지 않았는지 경량 확인한다. QA0-QA9 최종 인증을 이 단계로 대체하지 않는다.
CURRENT_SCOPE: 기존 engine/money verify 스크립트만 실행. settlement_rule 소스 수정은 REL-008. 최종 인증은 REL-502.
DEPENDENCIES:
  - REL-002
  - REL-003
IMPLEMENTATION_STEPS:
  - tooling/verify/CATALOG.md에서 engine/money/bucket-invariant 항목을 확인
  - 해당 verify 스크립트만 실행 (풀 test/E2E/release 빌드 로컬 금지)
  - 실패하면 원인 파일을 REL-003 범위로 되돌리거나 후속 REL-008로 넘길지 판정
  - 결과를 governance/release-master/REL-004-ENGINE-SANITY.md 에 기록
  - 이 문서를 FINAL ENGINE ACCEPTANCE로 쓰지 않음
VERIFY: "PASS 2026-08-21. 13/13 engine/money/bucket-invariant scripts PASS on origin/main f53e182. simulation-gate worktree MODULE_NOT_FOUND = BLOCKED_LOCAL_ENV (node_modules 부재), same sources PASS with workspace packages. REL-502 인증서 발급 0."
ACCEPTANCE: sanity 결과 문서 존재. 정식 인증 주장 0. PASS 2026-08-21.
EVIDENCE: "governance/release-master/REL-004-ENGINE-SANITY.md · origin/main f53e182 · product mutation 0"
EXIT_GATE: 이 결과를 REL-502 대체로 인용하면 무효. REL-004 PASS — REL-005 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-005

```yaml
ID: REL-005
TITLE: cursor-autonomous-ops.mdc 개정 (prod 인간 게이트 보존 + non-prod A3 개방)
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-005
ORIGINAL_INTENT: 개발/QA/PR/CI/staging은 A3로 실행 가능하게 하면서 production deploy 인간 게이트는 유지한다.
CURRENT_SCOPE: .cursor/rules/cursor-autonomous-ops.mdc 및 관련 standing-authorization 문구만. Skill/Cloud/Bugbot enable 0. production workflow_dispatch HUMAN 유지.
DEPENDENCIES:
  - REL-000
IMPLEMENTATION_STEPS:
  - 현재 cursor-autonomous-ops.mdc에서 production vs non-production 경계를 읽는다
  - non-production(dev/QA/PR/CI/staging) A3 허용 문장을 명시
  - production deploy token / workflow_dispatch HUMAN / ads live 연결 HUMAN을 보존
  - POST-011 enablement를 이 개정으로 선실행하지 않음
  - 규칙 파일만 PR
VERIFY: "PASS 2026-08-21. NON_PRODUCTION_A3 명시 · PRODUCTION_HUMAN_GATE 유지 · auto-deploy 허용 0. T0/T1 PASS. CI 32390907091 SUCCESS."
ACCEPTANCE: 에이전트가 staging까지 A3로 진행 가능. production auto-deploy 문장 0. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/4 MERGED · merge SHA 345b4d682cc1226939ed062005739e865b0abae7 · CI 32390907091 · governance/release-master/REL-005-AUTONOMOUS-OPS-A3.md"
EXIT_GATE: production 자동배포 허용 문구가 생기면 즉시 revert. REL-005 PASS — REL-006 착수 가능.
AUTOMATION_LEVEL: A1
PROTECTED_SCOPE_MUTATION: false
```

### REL-006

```yaml
ID: REL-006
TITLE: QA_ENV_ISOLATION_GUARD + QA-LAB-BOOTSTRAP (committed Playwright spec)
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-006
ORIGINAL_INTENT: 금융 mutation 테스트가 프로덕션/공유 DB를 치지 못하게 가드를 먼저 만들고, QA Lab 최소 하네스를 레포에 커밋한다.
CURRENT_SCOPE: tooling/e2e committed spec. QA_ENV_ISOLATION_GUARD (DB URL/project_ref allowlist, production deny). Playwright MCP 단독 조작은 DONE 불인정. persona/seed 최소 1세트.
DEPENDENCIES:
  - REL-005
IMPLEMENTATION_STEPS:
  - QA DB/project_ref allowlist와 production ref mgsytcetsiecllmhcyox 쓰기 금지를 코드 가드로 구현
  - 가드 실패 시 money mutation 테스트가 실행되지 않게 fail-closed
  - tooling/e2e 에 committed Playwright spec 최소셋 (auth session helper, 1 happy path placeholder 가능)
  - 결정론적 persona/seed 문서 1개 (나중에 REL-500이 확장)
  - MCP browser 클릭만으로 DONE 처리 금지 문구를 스펙 README에 명시
  - PR로 하네스 커밋
VERIFY: "PASS 2026-08-21. production URL throw · money fail-closed · committed spec. T0/T1 PASS. CI 32391748163 SUCCESS. MCP-only evidence 0."
ACCEPTANCE: Bootstrap Lab이 git에 있음. 금융 테스트는 가드 통과 전에 동작 불가. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/5 MERGED · merge SHA 06d688a2674ac9cf37f9be7cad5be64499121495 · CI 32391748163 · governance/release-master/REL-006-QA-LAB-BOOTSTRAP.md"
EXIT_GATE: 가드 없이 REL-007 money 테스트 착수 금지. REL-006 PASS — REL-007 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-007

```yaml
ID: REL-007
TITLE: money 0 fallback → UNAVAILABLE + Bootstrap spec 검증
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-007
ORIGINAL_INTENT: 금액/FX/기간이 없으면 0으로 위조하지 않고 UNAVAILABLE로 표시한다.
CURRENT_SCOPE: consumer money typography/format 경로. missing→0 금지. FX second truth 0. duration owner=estimatedDurationSec. Home freeze 파일은 포맷 계약만 준수하고 geometry 변경 금지.
DEPENDENCIES:
  - REL-006
IMPLEMENTATION_STEPS:
  - apps/web money format/map-runtime에서 0 fallback 검색
  - missing/null을 UNAVAILABLE 또는 비표시로 교체. 0 위조 금지
  - FX 보조표시는 owner가 있을 때만. 없으면 생략
  - REL-006 committed spec에 money-unavailable 케이스를 추가
  - Home geometry 변경 없이 계약만 확인
  - no-it-jargon + 해당 verify
VERIFY: "PASS 2026-08-21. missing money → UNAVAILABLE (확인할 수 없음). real 0/0.00 stays ready. Home geometry 0. T0/T1 PASS. CI 32392487318 SUCCESS."
ACCEPTANCE: UNAVAILABLE 경로 실증. Home freeze 시각 재설계 0. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/6 MERGED · merge SHA a1e327d7412ef6e30fa811e549796da69e8b3ff4 · CI 32392487318 · governance/release-master/REL-007-MONEY-UNAVAILABLE.md"
EXIT_GATE: missing→0 잔존 시 소비자 화면 REL 착수 금지. REL-007 PASS — REL-008 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-008

```yaml
ID: REL-008
TITLE: settlement_rule.rs/.cjs golden vector parity를 T0/T1에 편입
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-008
ORIGINAL_INTENT: Rust 엔진과 JS mirror의 정산 결과가 같은 golden vector를 통과하게 기계적으로 잠근다.
CURRENT_SCOPE: settlement_rule.rs 와 settlement_rule.cjs parity script. 불일치 시에만 최소 수정. 공식 최종 인증은 REL-502.
DEPENDENCIES:
  - REL-004
IMPLEMENTATION_STEPS:
  - 기존 golden vector/fixture 위치를 찾는다
  - rs와 cjs를 동일 입력으로 비교하는 스크립트를 tooling/verify에 고정
  - "CATALOG.md와 verify:gate:fast / verify:gate:push 경로에 편입"
  - 불일치가 있으면 원인 수정 후 재실행. 임의 공식 변경 금지
  - 로컬 cargo build --release 금지. cargo check 또는 CI에 위임
VERIFY: "PASS 2026-08-21. 9 vectors rust==cjs. T0 path + T1 always. cargo build --release 0. CI 32393666967 SUCCESS. REL-502 대체 0."
ACCEPTANCE: 동일 vector에서 rust/js 결과 일치. REL-502 대체 주장 0. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/7 MERGED · merge SHA 32b5cfb320efac794f0a4f8126f40ed820be39b3 · CI 32393666967 · governance/release-master/REL-008-SETTLEMENT-RULE-PARITY.md"
EXIT_GATE: parity FAIL를 문서만으로 통과 처리 금지. REL-008 PASS — REL-009 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-009

```yaml
ID: REL-009
TITLE: Figma Integration Infrastructure (token/Code Connect 반영)
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-009
ORIGINAL_INTENT: PRE-LOCK-001 레지스트리를 코드 쪽 토큰/연결 인프라로 고정한다. 미승인 frame을 승인된 것처럼 적용하지 않는다.
CURRENT_SCOPE: FIGMA_PROJECT_REGISTRY 재사용. design token 단일 경로 준비. Code Connect는 후보만. APPROVED_AUTHORITY=0이므로 화면 전면 교체 금지.
DEPENDENCIES:
  - PRE-LOCK-001
  - REL-005
IMPLEMENTATION_STEPS:
  - 본 파일 §2 레지스트리를 코드 상수/문서로 복제 (fileKey 재요청 금지)
  - packages/ui/tokens 와 spark-dash CSS의 충돌을 목록화하고 최소 안전 마이그레이션 계획만 작성
  - FOUNDER_REVIEW_CANDIDATE frame node-id를 화면 REL이 읽도록 매핑 테이블 작성
  - "Home 46:2를 authority로 쓰지 않음"
  - 인프라 PR. 개별 화면 적용은 REL-106~110/131
VERIFY: "PASS 2026-08-21. fileKey locked · APPROVED=0 · 46:2 BACKUP · Home freeze 0 · Code Connect applied 0. T0 PASS. CI 32394275396 SUCCESS."
ACCEPTANCE: 후속 UI REL이 node-id를 다시 추측하지 않음. 미승인 frame 자동 승격 0. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/8 MERGED · merge SHA 374e807c11f2d6d67db950ebced03b6add0c9d10 · CI 32394275396 · governance/release-master/REL-009-FIGMA-REGISTRY.md"
EXIT_GATE: APPROVED로 위조된 frame이 있으면 즉시 중단. REL-009 PASS — REL-010 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-010

```yaml
ID: REL-010
TITLE: auth 라우트 rate limiting 실제 동작 검증/구현
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-010
ORIGINAL_INTENT: 로그인/가입 등 auth 엔드포인트가 무제한 시도되지 않게 서버에서 막는다.
CURRENT_SCOPE: services/api-nest auth 라우트. generic HTTP rate limit. fail-closed. 클라이언트만의 쓰로틀은 불인정.
DEPENDENCIES:
  - REL-006
IMPLEMENTATION_STEPS:
  - 현재 auth 컨트롤러/가드에 rate limit 존재 여부를 실사
  - 없으면 서버 측 limiter 구현 (IP+account, 고정 윈도우 또는 동등)
  - 초과 시 429 + 한국어 안전 메시지. IT jargon 0
  - REL-006 하네스에 반복 요청 테스트를 committed spec으로 추가
  - 프로덕션 자격으로 무작위 폭격 금지. QA 가드 안에서만
VERIFY: "PASS 2026-08-21. committed spec 429 · unknown IP limited · QA guard · Nest HTTP selftest ALL PASS. T0 PASS. CI 32394969431 SUCCESS. production flood 0."
ACCEPTANCE: auth 라우트 서버 rate limit 실동작. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/9 MERGED · merge SHA 5232a0a7f22a442020cfe13d9b9f277e0ecb657f · CI 32394969431 · governance/release-master/REL-010-AUTH-RATE-LIMIT.md"
EXIT_GATE: 테스트 없이 구현만 있으면 DONE 아님. REL-010 PASS — REL-011 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-011

```yaml
ID: REL-011
TITLE: apps/web 실제 lint 구현 (no-op 교체)
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-011
ORIGINAL_INTENT: 웹 lint 스크립트가 통과만 찍는 no-op가 아니라 실제 진단을 하게 한다.
CURRENT_SCOPE: apps/web package lint 스크립트. eslint.config 존재 시에만 enable. 플랜 markdownlint 대량수정 금지.
DEPENDENCIES:
  - REL-000
IMPLEMENTATION_STEPS:
  - apps/web lint 스크립트가 no-op인지 확인
  - eslint.config 도입 또는 기존 설정 연결. config 없이 eslint.enable true 금지
  - 초기 실패는 차단 규칙을 최소로 켜고 점진 확대
  - plans/docs 스타일 빚을 lint로 지우지 않음
  - CI/T0에 실제 lint가 연결되는지 확인
VERIFY: "PASS 2026-08-21. node tooling/verify/web-lint.cjs · 의도적 구문 오류 FAIL · no-op 0. T0 8 steps PASS. CI 32397083503 SUCCESS."
ACCEPTANCE: lint가 실제 파일을 검사한다. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/10 MERGED · merge SHA 1701acff2b54f7a1ae5bb974425581f649e9e032 · CI 32397083503 · governance/release-master/REL-011-WEB-LINT.md"
EXIT_GATE: no-op 잔존 0. REL-011 PASS — REL-012 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-012

```yaml
ID: REL-012
TITLE: axe-core를 committed Playwright 하네스에 배선
STATUS: COMPLETED
SOURCE_PLAN: 퍼뜩_03_ui_ux_master_plan_be3fa3cc.plan.md (intake)
SOURCE_TODO_IDS:
  - rel-012
  - part8-loop-proof-responsive-spotcheck
ORIGINAL_INTENT: 접근성 위반을 사람 기억에 맡기지 않고 committed spec으로 잡는다.
CURRENT_SCOPE: REL-006 하네스에 axe-core. 최소 Home+1 consumer route. Home 시각 수정이 아니라 a11y 위반만 기록/수정.
DEPENDENCIES:
  - REL-006
IMPLEMENTATION_STEPS:
  - Playwright spec에 axe-core 주입
  - Home 390/1440과 로그인 또는 profits 1개를 스캔
  - critical/serious 위반을 이슈 목록화. Home geometry 변경으로 치장하지 않음
  - 자동 수정 가능한 라벨/대비만 최소 패치
  - committed spec이 CI에서 실행 가능하게 연결 (로컬 풀매트릭스 금지)
VERIFY: "PASS 2026-08-21. node tooling/verify/axe-harness.cjs · unlabeled button FAIL · Home 390/1440+login. T0 7 steps PASS. CI 32397944694 SUCCESS. MCP 0."
ACCEPTANCE: 하네스에 a11y 게이트가 존재. Home freeze 재설계 0. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/11 MERGED · merge SHA 4abd51cb2166ddbadb14fa8c43aba8f6576c45e1 · CI 32397944694 · governance/release-master/REL-012-AXE-HARNESS.md"
EXIT_GATE: axe 배선됨. REL-105 클로저 주장 0. REL-012 PASS — REL-013 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-013

```yaml
ID: REL-013
TITLE: apps/web next.config.ts images.remotePatterns 확인/수정
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-013
ORIGINAL_INTENT: 원격 상품 이미지가 Next Image에서 깨지거나 임의 호스트를 열지 않게 한다.
CURRENT_SCOPE: apps/web next.config.ts images.remotePatterns. 실제 사용 호스트만 allow. 와일드카드 남용 금지.
DEPENDENCIES:
  - REL-000
IMPLEMENTATION_STEPS:
  - 코드에서 실제 이미지 호스트를 수집
  - next.config.ts remotePatterns와 대조
  - 누락 호스트 추가, 불필요 와일드카드 제거
  - 기회 카드/룸 미디어가 설정 누락으로 깨지지 않는지 확인
VERIFY: "PASS 2026-08-21. node tooling/verify/web-remote-patterns.cjs · https allow-all 0 · T0 10 steps PASS. CI 32398523305 SUCCESS."
ACCEPTANCE: remotePatterns가 최소 allowlist. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/12 MERGED · merge SHA 2ab2b717f279c029b451fe7fa9009d98236ab729 · CI 32398523305 · governance/release-master/REL-013-REMOTE-PATTERNS.md"
EXIT_GATE: 없음. REL-013 PASS — REL-014 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-014

```yaml
ID: REL-014
TITLE: PWA native shell (E-PWA-001 only)
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_E_pwa.plan.md
SOURCE_TODO_IDS:
  - rel-014
  - e-pwa-001
  - pwa-native-shell
ORIGINAL_INTENT: 설치 가능한 웹앱의 최소 셸(manifest/아이콘/SW)을 실제로 연결한다. Push/WebAuthn/스토어는 이 작업이 아니다.
CURRENT_SCOPE: manifest link + icons + Serwist/service worker + install UX. E-PWA-002~004,007은 REL-020~023. store-bridge는 POST-017.
DEPENDENCIES:
  - REL-009
IMPLEMENTATION_STEPS:
  - apps/web에 webmanifest가 라우트/링크되는지 실사
  - 퍼뜩 이름 + ADR-017 색으로 manifest 실연결
  - 아이콘 세트 추가 (Figma 승인 아이콘이 없으면 최소 placeholder 아이콘, Home 에셋 재사용 우선)
  - Serwist 또는 동등 SW 등록 + update UX
  - Push/WebAuthn 코드를 이 REL에 섞지 않음
VERIFY: "PASS 2026-08-21. node tooling/verify/pwa-native-shell.cjs · T0 9 steps PASS. CI 32399814753 SUCCESS. store-bridge 0. Home freeze 0."
ACCEPTANCE: E-PWA-001 범위만 닫힘. Push를 완료로 주장하지 않음. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/13 MERGED · merge SHA 739bbbe0e375e1e4107d91b1bfdf814cf21f5936 · CI 32399814753 · governance/release-master/REL-014-PWA-NATIVE-SHELL.md"
EXIT_GATE: 범위 확장으로 store-bridge를 끌어오면 FAIL. REL-014 PASS — REL-015 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-015

```yaml
ID: REL-015
TITLE: 유저용 generic ledger/journal 조회 API
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-015
ORIGINAL_INTENT: 거래/정산 이력을 유저가 조회할 백엔드가 없으면 화면이 가짜 숫자를 만들게 되므로 API를 먼저 만든다.
CURRENT_SCOPE: services/api-nest 유저 JWT 스코프 ledger/journal 조회. 잔액 UPDATE 금지. 서버 진실만. Admin ledger와 권한 분리.
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - 기존 ledger 테이블/쿼리 오너를 실사
  - 유저용 목록/상세 엔드포인트 신설. 타인 전표 접근 403
  - decimal string, 페이지네이션, idempotent read
  - 잔액 재계산/UPDATE 경로 0
  - Bootstrap spec에 권한/빈목록/정상목록 케이스 추가
VERIFY: "PASS 2026-08-21. node tooling/verify/user-ledger-query.cjs · 401/빈목록/본인/403 · GET-only · T0 10 steps PASS. CI 32400738598 SUCCESS. production DB 0."
ACCEPTANCE: REL-112/118/119가 이 API를 소비할 수 있음. PASS 2026-08-21.
EVIDENCE: "https://github.com/phonarawd/AI-Profit-OS/pull/14 MERGED · merge SHA 2d235d1d7e894a73c576c7fa783c4b16819ecb86 · CI 32400738598 · governance/release-master/REL-015-USER-LEDGER-QUERY.md"
EXIT_GATE: API 없이 TransactionHistory 화면을 REAL로 닫지 않음. REL-015 PASS — REL-016 착수 가능.
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-016

```yaml
ID: REL-016
TITLE: observability 도입 (error tracking, 구조화 로그, alerting)
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-016
ORIGINAL_INTENT: 프로덕션 승격 전에 실패를 볼 수 있는 최소 관측을 연다.
CURRENT_SCOPE: client/server 구조화 로그 + error tracking + 최소 alert. PII/잔액 raw 로그 금지. production token을 에이전트가 보유하지 않음.
DEPENDENCIES:
  - REL-005
IMPLEMENTATION_STEPS:
  - api-nest와 apps/web에 구조화 로그 포맷 합의
  - error tracking sink 연결 (Cloudflare/Workers 친화, Vercel 금지)
  - money/KYC 필드 마스킹
  - "최소 alert: 5xx, ledger write 실패, auth spike"
  - staging에서 1건 테스트 이벤트가 보이는지 확인 (REL-600 이후 재확인)
VERIFY: 구조화 로그 샘플 + error sink 설정 파일. PII raw 0.
ACCEPTANCE: 관측 경로가 코드에 존재. REL-703이 이 경로를 재사용.
EVIDENCE: observability 모듈/설정
EXIT_GATE: 관측 없이 REL-700 준비도 완료 주장 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-017

```yaml
ID: REL-017
TITLE: LEGACY_PLAN_MIGRATION_REGISTRY workspace stamp
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-017
ORIGINAL_INTENT: 과거 플랜이 실행 큐로 오해되지 않게 workspace 파일에 권위 스탬프를 찍는다.
CURRENT_SCOPE: 워크스페이스 .cursor/plans/** 만 수정. CONTENT_AUTHORITY / EXECUTION_AUTHORITY 이원 표기. 파일 삭제 0. 전역 Home mirror 쓰기 0.
DEPENDENCIES:
  - REL-000
IMPLEMENTATION_STEPS:
  - workspace .cursor/plans 의 레거시/Track/Current Master 파일 목록을 워크스페이스 안에서만 수집
  - 각 파일 frontmatter 또는 파일 상단에 EXECUTION_AUTHORITY=NO 스탬프
  - Track A-G와 Current Master만 CONTENT_AUTHORITY=YES, SUPERSEDED_FOR_EXECUTION_BY=PUTDUK_RELEASE_MASTER.plan.md
  - 레거시 해시 9파일은 CONTENT_AUTHORITY=NO 또는 HISTORICAL_REFERENCE_ONLY, DO_NOT_EXECUTE=YES
  - "pnpm cursor:sync-plans 는 DISABLED_UNDER_CURRENT_ISOLATION — 실행하지 않음 (Home %USERPROFILE%\\.cursor\\plans 쓰기 DENY)"
  - "verify:plans-ssot Home hardlink 검사도 이번 REL에서 강제하지 않음. WORKSPACE_ONLY 스탬프 검증만"
VERIFY: "workspace plan 파일에 EXECUTION_AUTHORITY=NO 스탬프. cursor:sync-plans 실행 로그 0. isolation rule 미수정."
ACCEPTANCE: 과거 플랜이 실행 SSOT로 읽히지 않음. Home 미러 동기화 0.
EVIDENCE: workspace plan 스탬프 diff
EXIT_GATE: sync-plans 또는 Home 경로 접근이 있으면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-018

```yaml
ID: REL-018
TITLE: ASSET_PRODUCTION_PIPELINE 인프라화
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-018
ORIGINAL_INTENT: 화면마다 애드혹으로 받던 에셋을 생성-검수-최적화 파이프라인으로 표준화한다.
CURRENT_SCOPE: 기존 apps/web/scripts/download-spark-dash-assets.mjs, download-spark-dash-mobile-assets.mjs, process-product-sneaker.mjs 패턴 통합. 이모지로 아이콘을 대체하는 경로 금지. 파트너 로고 AI 생성 금지.
DEPENDENCIES:
  - REL-009
IMPLEMENTATION_STEPS:
  - 기존 스크립트 입출력/실패모드를 목록화
  - "표준 단계: source → optimize → hash → public/ → review checklist"
  - 파트너 로고는 official-only 분기. AI 생성 하드페일
  - 파이프라인 README와 verify 훅(해시/금지 패턴)
  - Home 승인 에셋을 재생성/교체하지 않음
VERIFY: 표준 엔트리 스크립트 존재. 파트너 로고 AI 경로 0.
ACCEPTANCE: 후속 화면 REL이 이 파이프라인으로 에셋을 넣을 수 있음.
EVIDENCE: apps/web/scripts 표준 파이프라인 + README
EXIT_GATE: Home committed 에셋 교체 발견 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-019

```yaml
ID: REL-019
TITLE: RESPONSIVE_DEVICE_TIER_SYSTEM 통합
STATUS: COMPLETED
SOURCE_PLAN: 퍼뜩_03_ui_ux_master_plan_be3fa3cc.plan.md (intake) + putduk_release_master
SOURCE_TODO_IDS:
  - rel-019
  - part8-loop-proof-responsive-spotcheck
ORIGINAL_INTENT: 기기 티어(S/A/B)와 대형화면 안전망을 재발명하지 않고 기존 판정기를 승격한다. Home 시각 소급 재설계는 하지 않는다.
CURRENT_SCOPE: detectDeviceTier / ux-design-system 재사용. 2560/3440/3840 구조 안전 정책 문서화. HOME_RETROACTIVE_VISUAL_REDESIGN=NO. HOME_LARGE_SCREEN_SAFETY_QA=YES는 REL-105/601에서 실행.
DEPENDENCIES:
  - REL-012
IMPLEMENTATION_STEPS:
  - 기존 detectDeviceTier 구현 위치를 찾는다
  - S/A/B + reduced-motion + saveData 계약을 문서/토큰으로 고정
  - "대형화면 안전: overflow/clip/absurd-stretch/interaction-break/성능저하 검사 항목을 문서화"
  - Home CSS를 이 작업에서 재작성하지 않음
  - "verify:ux-design-system이 있으면 재사용, 없으면 최소 verify 추가"
VERIFY: 티어 함수/문서 존재. Home visual redesign diff 0.
ACCEPTANCE: 후속 화면이 티어 정책을 공유. Home은 안전 QA만 별도 REL에서 수행.
EVIDENCE: device-tier 문서 + 기존 함수 경로
EXIT_GATE: Home geometry 변경 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-020

```yaml
ID: REL-020
TITLE: PWA Push+Badge (E-PWA-002)
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_E_pwa.plan.md
SOURCE_TODO_IDS:
  - rel-020
  - e-pwa-002
  - pwa-push-badge
ORIGINAL_INTENT: 매칭/공지 이벤트를 설치 앱에서 받을 수 있게 하되 Admin이 즉시 죽일 수 있어야 한다.
CURRENT_SCOPE: VAPID 자체 생성. workers/push-dispatcher 재사용. Admin push kill. 외부 푸시 벤더 계정 HUMAN 불필요하면 A3.
DEPENDENCIES:
  - REL-014
IMPLEMENTATION_STEPS:
  - VAPID 키 생성 경로를 repo/secret 정책에 맞게 정의 (.env 커밋 금지)
  - workers/push-dispatcher scaffold를 실연결
  - 구독 등록 API + SW push handler + badge
  - Admin kill switch가 발송을 멈추는지 확인 (UI는 REL-213과 계약만 맞춤)
  - QA 가드 안에서 1건 테스트
VERIFY: 구독/발송/kill 경로가 코드에 존재. secret 커밋 0.
ACCEPTANCE: E-PWA-002 범위 닫힘. 채널 필터는 REL-021.
EVIDENCE: workers/push-dispatcher + web push client
EXIT_GATE: kill 없이 무조건 발송이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-021

```yaml
ID: REL-021
TITLE: 자동 Push 채널 필터 (E-PWA-003)
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_E_pwa.plan.md
SOURCE_TODO_IDS:
  - rel-021
  - e-pwa-003
  - pwa-auto-fanout-prefs
ORIGINAL_INTENT: 사용자가 notice/campaign/opportunity 알림을 분리해서 끌 수 있어야 한다.
CURRENT_SCOPE: notification_prefs 재사용. 채널 3종 필터. 동의/프리퍼런스 false면 발송 0.
DEPENDENCIES:
  - REL-020
IMPLEMENTATION_STEPS:
  - notification_prefs 스키마/테이블 실사
  - 채널 키 notice/campaign/opportunity 계약 고정
  - dispatcher가 pref=false면 enqueue 0
  - 설정 UI는 최소 API+기존 settings 연결. 전면 재디자인 금지
  - committed spec으로 필터 케이스 추가
VERIFY: pref=false → 발송 0. 세 채널이 서로 섞이지 않음.
ACCEPTANCE: E-PWA-003 닫힘.
EVIDENCE: prefs + dispatcher 필터
EXIT_GATE: 필터 없이 전채널 강제 발송이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-022

```yaml
ID: REL-022
TITLE: WebAuthn UX/RP + haptics fallback (E-PWA-004)
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_E_pwa.plan.md
SOURCE_TODO_IDS:
  - rel-022
  - e-pwa-004
  - pwa-webauthn-haptics
ORIGINAL_INTENT: 지원 기기에서는 WebAuthn, 아니면 안전한 비밀번호/기존 세션 경로로 넘어간다. 햅틱은 없어도 실패하지 않는다.
CURRENT_SCOPE: RP 설정 + UX. Money §43 fallback 계약 재사용. reduced-motion 존중. money 회로 재설계 금지.
DEPENDENCIES:
  - REL-014
IMPLEMENTATION_STEPS:
  - 기존 auth와 WebAuthn 엔드포인트 실사
  - RP id/origin을 Cloudflare 도메인에 맞게 고정
  - 미지원 시 기존 로그인으로 fallback. 빈 화면 금지
  - haptics는 optional. 실패해도 흐름 계속
  - QA 가드 안 브라우저 테스트
VERIFY: 지원/미지원 경로 둘 다 동작. money owner 변경 0.
ACCEPTANCE: E-PWA-004 닫힘.
EVIDENCE: WebAuthn RP + client UX
EXIT_GATE: fallback 없는 hard depend면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-023

```yaml
ID: REL-023
TITLE: PWA certification (E-PWA-007)
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_E_pwa.plan.md
SOURCE_TODO_IDS:
  - rel-023
  - e-pwa-007
  - redesign-pwa-certification
ORIGINAL_INTENT: Day-1 PWA(설치/오프라인/push dedup/WebAuthn/reduced-motion)를 한 번에 인증한다. 스토어 브리지는 제외.
CURRENT_SCOPE: REL-014/020/021/022 통합 인증. Lighthouse PWA 카테고리. store-bridge는 POST-017.
DEPENDENCIES:
  - REL-014
  - REL-020
  - REL-021
  - REL-022
IMPLEMENTATION_STEPS:
  - "인증 체크리스트 작성: manifest, install, offline, push dedup, WebAuthn, reduced-motion, badge, kill"
  - committed spec + Lighthouse PWA (CI 위임 가능)
  - known defect 0이 될 때까지 회귀
  - POST-017을 이 인증에 포함하지 않음
VERIFY: 체크리스트 PASS. store-bridge 미포함.
ACCEPTANCE: Day-1 PWA 게이트 닫힘. POST-017 착수 가능.
EVIDENCE: governance/pwa/DAY1_CERTIFICATION.md
EXIT_GATE: "014/020/021/022 미완료면 인증서 발급 금지"
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-100

```yaml
ID: REL-100
TITLE: Landing (/ guest) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER.plan.md
SOURCE_TODO_IDS:
  - rel-100
ORIGINAL_INTENT: 비로그인 랜딩이 제품 입구로서 동작하고 가짜 수익/가짜 FOMO를 보여주지 않는다.
CURRENT_SCOPE: 게스트 랜딩 라우트. 반응형/에셋 필드 포함. FIG=NOT_FOUND_IN_THIS_FILE 이면 최소 placeholder + 진실 카피. 신규 마케팅 랜딩 발명 금지.
DEPENDENCIES:
  - REL-007
  - REL-009
  - REL-018
  - REL-019
IMPLEMENTATION_STEPS:
  - 게스트 랜딩 라우트와 현재 카피를 실사
  - FAKE MONEY / FAKE FOMO / FAKE DURATION 제거
  - FIG 없으면 최소 개발 placeholder. 레거시 Home/Canon 복구 금지
  - "390/1440 + 대형화면 overflow 안전만 확인"
  - "committed Playwright: 게스트 진입, IT jargon 0"
  - PR → CI → merge
VERIFY: no-it-jargon. fake money 0. 라우트 200.
ACCEPTANCE: 게스트가 가입/로그인으로 갈 수 있고 가짜 숫자가 없음.
EVIDENCE: landing 라우트 + e2e spec
EXIT_GATE: 가짜 수익 카피 잔존 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-101

```yaml
ID: REL-101
TITLE: Signup (/auth/signup) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-101
  - c-acq-001
  - c-acq-002
  - c-acq-003
ORIGINAL_INTENT: 가입이 실제 계정 생성으로 끝나야 한다. 이미 Track C가 구현을 닫았으면 재확인만 한다.
CURRENT_SCOPE: "/auth/signup. verify:acquisition-release.cjs 재실행. 전면 재구현 아님."
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /auth/signup 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: "pnpm exec 해당 verify:acquisition-release PASS + signup e2e Bootstrap"
ACCEPTANCE: 가입 성공/중복/검증실패가 서버 진실. 재구현 없음.
EVIDENCE: "verify:acquisition-release + signup spec"
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-102

```yaml
ID: REL-102
TITLE: Login (/auth/login) 클로저 + Kakao 잔여 판정
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-102
  - c-auth-001
  - c-acq-001
ORIGINAL_INTENT: 로그인과 Kakao OAuth 백엔드가 동작해야 한다. 라이브 Kakao 계정 E2E는 사람 계정 없이는 강제하지 않고 잔여를 정직히 남긴다.
CURRENT_SCOPE: /auth/login. Kakao backend CODE_RUNTIME_CLOSED 재확인. LIVE_KAKAO_HUMAN_E2E는 미실행이면 NOT_RUN으로 기록하고 REL-701-PRE로 넘긴다.
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /auth/login과 Kakao OAuth 콜백을 실사
  - 이메일/비밀번호 또는 기존 세션 로그인을 Bootstrap spec으로 확인
  - Kakao 코드 경로가 살아 있는지 확인. 시크릿을 채팅에 출력하지 않음
  - Founder Kakao 계정 E2E가 없으면 LIVE_KAKAO_HUMAN_E2E=NOT_RUN 기록
  - NOT_RUN을 PASS로 위조하지 않음. REL-701-PRE가 재평가
VERIFY: 로컬/QA 로그인 PASS. Kakao live E2E는 선택. NOT_RUN 위조 0.
ACCEPTANCE: 일반 로그인 클로저. Kakao live는 잔여로 정직 표기.
EVIDENCE: login spec + Kakao readiness note
EXIT_GATE: Kakao NOT_RUN을 production 완료로 쓰면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-103

```yaml
ID: REL-103
TITLE: CompleteProfile (/auth/complete-profile) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-103
  - c-acq-001
  - c-acq-002
  - c-acq-003
ORIGINAL_INTENT: 가입 후 프로필 완료가 서버에 저장되어야 한다.
CURRENT_SCOPE: /auth/complete-profile. Track C 재확인 게이트만. 성별 분기 카피 금지.
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /auth/complete-profile 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: /auth/complete-profile 실동작 + 재확인 체크리스트 PASS
ACCEPTANCE: 전면 재구현 없이 잔여 게이트만 닫힘
EVIDENCE: apps/web/app/auth/complete-profile
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-104

```yaml
ID: REL-104
TITLE: Onboarding (/onboarding) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-104
  - c-acq-001
  - c-acq-002
  - c-acq-003
ORIGINAL_INTENT: 온보딩이 실제 다음 단계(홈/기회)로 연결되어야 한다.
CURRENT_SCOPE: /onboarding. Track C 재확인. 가짜 튜토리얼 수익 금지.
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /onboarding 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: /onboarding 실동작 + 재확인 체크리스트 PASS
ACCEPTANCE: 전면 재구현 없이 잔여 게이트만 닫힘
EVIDENCE: apps/web/app/onboarding
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-105

```yaml
ID: REL-105
TITLE: Home 잔여 클로저 (Playwright+A11y+Security, 시각 재설계 없음)
STATUS: COMPLETED
SOURCE_PLAN: governance/consumer-home-approval/home-approval-freeze.v1.json
SOURCE_TODO_IDS:
  - rel-105
ORIGINAL_INTENT: 승인된 Home을 다시 그리지 않고, 동작/접근성/보안/대형화면 안전만 닫는다.
CURRENT_SCOPE: "FIG=46:2 BACKUP / 72:762 BACKUP. HOME_RETROACTIVE_VISUAL_REDESIGN=NO. HOME_LARGE_SCREEN_SAFETY_QA=YES (2560/3440/3840 overflow/clip/absurd-stretch/interaction-break). Home CSS/geometry 수정 금지."
DEPENDENCIES:
  - REL-002
  - REL-007
  - REL-012
  - REL-019
IMPLEMENTATION_STEPS:
  - HomeDesktop/HomeMobile을 freeze JSON과 대조. 시각 수정 금지
  - "Playwright: 1440x1080, 390x693 라우트 로드 + a11y"
  - "2560/3440/3840에서 overflow/clip/interaction-break만 기록. 깨지면 구조 안전 패치 최소(시각 재디자인 아님) — 패치가 Home geometry를 바꾸면 Founder OPEN 전에는 이슈로만 남기고 강제 수정하지 않음"
  - "보안: 게스트/유저 데이터 누출, fake money 0"
  - 의미 있는 visual regression만. pixel-diff 단독 실패 금지
VERIFY: Home freeze 유지. a11y/security spec PASS. 대형화면 이슈는 티켓으로 정직 기록.
ACCEPTANCE: Home은 LOCKED 시각 + 잔여 QA 닫힘. 재디자인 0.
EVIDENCE: Home QA report + freeze JSON
EXIT_GATE: Home 시각 재작업 PR은 거부
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-106

```yaml
ID: REL-106
TITLE: OpportunityList (/profits) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md + parallel_consumer_ui_figma (cux-004)
SOURCE_TODO_IDS:
  - rel-106
  - b-loop-001
  - cux-004
  - cux-cert-profits-desktop
ORIGINAL_INTENT: 기회 목록이 서버 기회만 보여주고, 후보 Figma와 시각을 맞추되 미승인을 승인으로 위조하지 않는다.
CURRENT_SCOPE: "/profits. backend 배선 재확인. FIG=76:2 / 116:28 / 122:34 FOUNDER_REVIEW_CANDIDATE. 전면 재구현 아님."
DEPENDENCIES:
  - REL-007
  - REL-009
  - REL-013
IMPLEMENTATION_STEPS:
  - ProfitsDesktop/ProfitsMobile/map-runtime 실사. 목록 API 실호출 확인
  - 후보 frame을 REFERENCE로만 사용. Founder 승인 전 PRESENTATION_TRUTH 선언 금지
  - empty/loading/unauthorized 상태 유지. fake 리스트 금지
  - money UNAVAILABLE 계약 적용
  - "committed spec: 목록/빈상태. Home geometry 종속 금지"
VERIFY: 실 API 목록. fake FOMO 0. candidate를 approved로 쓰지 않음.
ACCEPTANCE: 목록 기능 REAL. 시각은 candidate 정합 또는 명시적 잔여.
EVIDENCE: apps/web/app/profits + spark-dash-profits
EXIT_GATE: 미승인 Figma를 Approved로 표기하면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-107

```yaml
ID: REL-107
TITLE: OpportunityDetail (/profits/[id]) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md + parallel_consumer_ui_figma (cux-003)
SOURCE_TODO_IDS:
  - rel-107
  - b-participation-001
  - cux-003
ORIGINAL_INTENT: 상세에서 참여 프리플라이트가 서버 진실로 동작해야 한다.
CURRENT_SCOPE: "/profits/[id] OpportunityDetailClient. issuePreflight+postParticipate 실호출(미커밋이면 REL-000~003 파이프라인으로 흡수). FIG=96:2 / 104:43 / 109:28 FOUNDER_REVIEW_CANDIDATE."
DEPENDENCIES:
  - REL-002
  - REL-003
  - REL-007
  - REL-009
IMPLEMENTATION_STEPS:
  - OpportunityDetailClient 호출 경로 재확인
  - 미커밋이면 recovery 브랜치/후속 PR로 흡수 (이 파일에서 새 로직 발명 금지)
  - 후보 Figma 정합은 승인 전 visual-only. 상태 머신 서버 선행
  - 참여 버튼이 클라이언트에서 잔액을 조작하지 않음
  - "committed spec: 상세 로드/권한/프리플라이트 실패"
VERIFY: preflight/participate 실호출. money 클라이언트 조작 0.
ACCEPTANCE: 상세 기능 REAL. 시각 잔여는 명시.
EVIDENCE: apps/web/app/profits/[id]/OpportunityDetailClient.tsx
EXIT_GATE: 미커밋 상세를 없는 것처럼 재작성 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-108

```yaml
ID: REL-108
TITLE: ParticipateConfirmation (modal/sheet) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md
SOURCE_TODO_IDS:
  - rel-108
  - b-loop-001
ORIGINAL_INTENT: 참여 확인 시트가 11개 서버 상태를 거짓 없이 보여준다.
CURRENT_SCOPE: "ParticipateConfirmSheet. FIG=103:315 Desktop / 103:314 11-state FOUNDER_REVIEW_CANDIDATE. REL-107과 함께 재확인."
DEPENDENCIES:
  - REL-107
IMPLEMENTATION_STEPS:
  - 시트 상태 상수와 Figma 11-state 이름 대조
  - ready/issuing/submitting/accepted/reused/preflight_required/insufficient/stale/expired/blocked/auth 구현 확인
  - 성공 애니메이션이 서버 확정 전에 완료 화면을 보여주지 않음
  - committed spec으로 주요 실패 상태 2개 이상
VERIFY: "상태 이름 1:1. 서버 전 성공 위조 0."
ACCEPTANCE: 모달/시트가 서버 상태를 반영.
EVIDENCE: participate-sheet 컴포넌트
EXIT_GATE: 상태 누락을 닫힘으로 위조 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-109

```yaml
ID: REL-109
TITLE: Matching/execute (/trades/[id]/execute) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md + parallel_consumer_ui_figma (cux-005)
SOURCE_TODO_IDS:
  - rel-109
  - b-execution-001
  - cux-005
ORIGINAL_INTENT: 실행 화면은 서버 상태 머신을 따라가며, 모션은 tick보다 앞서 성공을 위조하지 않는다.
CURRENT_SCOPE: "TradeExecuteClient + useTradeExecution. MatchingInProgress/Retrying/Settled/StoppedSafely/Failed. FIG=155:222 / 140:34,142,250,358 FOUNDER_REVIEW_CANDIDATE. CUX-005 모션은 서버 tick 후."
DEPENDENCIES:
  - REL-007
  - REL-008
  - REL-009
IMPLEMENTATION_STEPS:
  - TradeExecuteClient 상태 머신 재확인
  - 모션이 Settled 전에 성공 카피를 띄우지 않게 가드
  - reduced-motion에서 핵심 상태가 텍스트로 남는지 확인
  - 후보 Figma 정합은 승인 후. 지금은 기능+모션 안전
  - "committed spec: running/fail/safe-stop"
VERIFY: 상태 머신 실구현. 모션 선행 성공 0.
ACCEPTANCE: 실행 기능 REAL. 시각 잔여 명시 가능.
EVIDENCE: TradeExecuteClient.tsx
EXIT_GATE: 클라이언트 난수 정산 발견 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-110

```yaml
ID: REL-110
TITLE: MatchingResult (/trades) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md + parallel_consumer_ui_figma (cux-006)
SOURCE_TODO_IDS:
  - rel-110
  - b-trades-001
  - cux-006
ORIGINAL_INTENT: 거래 목록이 실제 trade/wallet 조회를 쓴다.
CURRENT_SCOPE: TradesClient fetchTradeList+fetchWalletBuckets. loading/empty/unauthorized/ready. 기능 REAL. 시각 정합만 잔여 가능.
DEPENDENCIES:
  - REL-007
  - REL-109
IMPLEMENTATION_STEPS:
  - TradesClient 호출 재확인
  - wallet 숫자를 클라이언트에서 합산 위조하지 않음
  - empty/unauthorized 처리
  - cux-006 시각은 후보. 승인 전 전면 재디자인 금지
  - "committed spec: 목록/빈상태"
VERIFY: 실 fetch. fake 수익 0.
ACCEPTANCE: 목록 기능 REAL.
EVIDENCE: TradesClient.tsx
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-111

```yaml
ID: REL-111
TITLE: Earnings (/trades embed) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER.plan.md
SOURCE_TODO_IDS:
  - rel-111
ORIGINAL_INTENT: 수익 요약은 서버 earnings/ledger에서만 온다.
CURRENT_SCOPE: /trades에 임베드된 earnings. 별도 fake 집계 금지. KRW는 FX owner 있을 때만.
DEPENDENCIES:
  - REL-007
  - REL-110
IMPLEMENTATION_STEPS:
  - earnings 임베드 데이터 오너 확인
  - 클라이언트 합산/랜덤 제거
  - missing → UNAVAILABLE
  - committed spec 1케이스
VERIFY: 서버 숫자만 표시.
ACCEPTANCE: 임베드가 독립 fake 소스가 아님.
EVIDENCE: trades earnings embed
EXIT_GATE: 클라이언트 합산 발견 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-112

```yaml
ID: REL-112
TITLE: SettlementDetail 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md + parallel_consumer_ui_figma (cux-006)
SOURCE_TODO_IDS:
  - rel-112
  - cux-006
ORIGINAL_INTENT: 정산 상세는 유저 ledger API의 한 전표를 보여준다.
CURRENT_SCOPE: SettlementDetail 화면/라우트. REL-015 API 선행. 없으면 화면만 만들고 끝내지 않음.
DEPENDENCIES:
  - REL-015
  - REL-110
IMPLEMENTATION_STEPS:
  - 정산 상세 라우트 실사 또는 신설
  - REL-015 상세 엔드포인트 연결
  - 전표 필드 서버 매핑. 재계산 금지
  - "committed spec: 본인/타인/없음"
VERIFY: API 없이 mock 상세 0. 타인 403.
ACCEPTANCE: 상세가 ledger 진실.
EVIDENCE: governance/release-master/REL-112-SETTLEMENT.md + /trades/[id]/settlement
EXIT_GATE: REL-015 미완료면 이 REL DONE 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-113

```yaml
ID: REL-113
TITLE: Wallet (/wallet) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md + parallel_consumer_ui_figma (cux-007)
SOURCE_TODO_IDS:
  - rel-113
  - b-wallet-001
  - b-wallet-002
  - b-wallet-003
  - cux-007
ORIGINAL_INTENT: 지갑 버킷이 서버 잔액이다. 화면이 잔액을 UPDATE하지 않는다.
CURRENT_SCOPE: /wallet. Track B 기능 대부분 REAL. 시각 gap-only. USDT primary / KRW secondary. PG사 0.
DEPENDENCIES:
  - REL-007
IMPLEMENTATION_STEPS:
  - wallet page와 fetchWalletBuckets 재확인
  - 버킷 합을 클라이언트가 권위로 쓰지 않음
  - 시각 후보는 cux-007. 승인 전 전면 재구현 금지
  - 입출금 딥링크만 확인. 실제 원장 로직 재작성 금지
  - "committed spec: unauthorized/ready"
VERIFY: 버킷 서버 진실. 잔액 UPDATE 코드 0.
ACCEPTANCE: 지갑 기능 REAL. 시각 잔여 명시 가능.
EVIDENCE: governance/release-master/REL-113-WALLET.md + apps/web/app/wallet/WalletClient.tsx
EXIT_GATE: PG사 SDK 추가 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-114

```yaml
ID: REL-114
TITLE: UsdtDeposit 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md
SOURCE_TODO_IDS:
  - rel-114
  - cux-007
ORIGINAL_INTENT: USDT 입금 요청이 실제 입금 플로우로 연결되어야 한다.
CURRENT_SCOPE: /wallet/deposit. 서버 플로우만. 클라이언트 잔액 조작 0. PG사 0. 시각은 gap-only.
DEPENDENCIES:
  - REL-113
IMPLEMENTATION_STEPS:
  - apps/web/app/wallet/deposit/page.tsx 실사
  - 요청/응답이 api-nest wallet 엔드포인트를 쓰는지 확인
  - 성공 화면을 서버 확정 전에 보여주지 않음
  - KYC/한도 실패를 서버 코드로 표시
  - committed spec 1 happy + 1 deny
VERIFY: /wallet/deposit 실배선. 잔액 UPDATE 0.
ACCEPTANCE: 해당 입출금 경로가 서버 진실.
EVIDENCE: governance/release-master/REL-114-USDT-DEPOSIT.md
EXIT_GATE: 모의 성공 위조 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-115

```yaml
ID: REL-115
TITLE: KrwDeposit 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md
SOURCE_TODO_IDS:
  - rel-115
  - cux-007
ORIGINAL_INTENT: KRW 입금은 PG사 없이 운영 플로우만. 가짜 입금 완료 금지.
CURRENT_SCOPE: /wallet 원화 입금 경로. 서버 플로우만. 클라이언트 잔액 조작 0. PG사 0. 시각은 gap-only.
DEPENDENCIES:
  - REL-113
IMPLEMENTATION_STEPS:
  - wallet deposit KRW surface (실라우트 실사) 실사
  - 요청/응답이 api-nest wallet 엔드포인트를 쓰는지 확인
  - 성공 화면을 서버 확정 전에 보여주지 않음
  - KYC/한도 실패를 서버 코드로 표시
  - committed spec 1 happy + 1 deny
VERIFY: /wallet 원화 입금 경로 실배선. 잔액 UPDATE 0.
ACCEPTANCE: 해당 입출금 경로가 서버 진실.
EVIDENCE: governance/release-master/REL-115-KRW-DEPOSIT.md
EXIT_GATE: 모의 성공 위조 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-116

```yaml
ID: REL-116
TITLE: UsdtWithdraw 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md
SOURCE_TODO_IDS:
  - rel-116
  - cux-007
ORIGINAL_INTENT: USDT 출금이 서버 출금 요청으로만 완료된다.
CURRENT_SCOPE: /wallet/withdraw/usdt. 서버 플로우만. 클라이언트 잔액 조작 0. PG사 0. 시각은 gap-only.
DEPENDENCIES:
  - REL-113
IMPLEMENTATION_STEPS:
  - apps/web/app/wallet/withdraw/usdt/page.tsx 실사
  - 요청/응답이 api-nest wallet 엔드포인트를 쓰는지 확인
  - 성공 화면을 서버 확정 전에 보여주지 않음
  - KYC/한도 실패를 서버 코드로 표시
  - committed spec 1 happy + 1 deny
VERIFY: /wallet/withdraw/usdt 실배선. 잔액 UPDATE 0.
ACCEPTANCE: 해당 입출금 경로가 서버 진실.
EVIDENCE: governance/release-master/REL-116-USDT-WITHDRAW.md
EXIT_GATE: 모의 성공 위조 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-117

```yaml
ID: REL-117
TITLE: KrwWithdraw 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_B_user_profit_loop.plan.md
SOURCE_TODO_IDS:
  - rel-117
  - cux-007
ORIGINAL_INTENT: KRW 출금이 서버 출금 요청으로만 완료된다.
CURRENT_SCOPE: /wallet/withdraw/krw. 서버 플로우만. 클라이언트 잔액 조작 0. PG사 0. 시각은 gap-only.
DEPENDENCIES:
  - REL-113
IMPLEMENTATION_STEPS:
  - apps/web/app/wallet/withdraw/krw/page.tsx 실사
  - 요청/응답이 api-nest wallet 엔드포인트를 쓰는지 확인
  - 성공 화면을 서버 확정 전에 보여주지 않음
  - KYC/한도 실패를 서버 코드로 표시
  - committed spec 1 happy + 1 deny
VERIFY: /wallet/withdraw/krw 실배선. 잔액 UPDATE 0.
ACCEPTANCE: 해당 입출금 경로가 서버 진실.
EVIDENCE: governance/release-master/REL-117-KRW-WITHDRAW.md
EXIT_GATE: 모의 성공 위조 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-118

```yaml
ID: REL-118
TITLE: TransactionHistory 클로저
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-118
ORIGINAL_INTENT: 거래내역 목록은 REL-015 조회 API를 쓴다.
CURRENT_SCOPE: /wallet/history 또는 동등. REL-015 선행. 클라이언트 저널 위조 금지.
DEPENDENCIES:
  - REL-015
  - REL-113
IMPLEMENTATION_STEPS:
  - apps/web/app/wallet/history/page.tsx 실사
  - REL-015 목록 API 연결. mock 배열 제거
  - 페이지네이션/빈상태
  - committed spec
VERIFY: API 연결. mock history 0.
ACCEPTANCE: 내역 목록 REAL.
EVIDENCE: governance/release-master/REL-118-HISTORY.md
EXIT_GATE: REL-015 없이 DONE 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-119

```yaml
ID: REL-119
TITLE: TransactionDetail 클로저
STATUS: COMPLETED
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-119
ORIGINAL_INTENT: 한 건 상세는 서버 전표다.
CURRENT_SCOPE: 내역 상세. REL-015 상세. 타인 접근 403.
DEPENDENCIES:
  - REL-015
  - REL-118
IMPLEMENTATION_STEPS:
  - 상세 라우트 실사/신설
  - REL-015 상세 연결
  - 필드 재계산 금지
  - "committed spec: 본인/타인"
VERIFY: 서버 전표만. 403 실증.
ACCEPTANCE: 상세 REAL.
EVIDENCE: governance/release-master/REL-119-HISTORY-DETAIL.md
EXIT_GATE: REL-015 없이 DONE 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-120

```yaml
ID: REL-120
TITLE: Referral (/me/invite) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-120
  - c-acc-001
  - c-acc-002
  - c-acc-003
ORIGINAL_INTENT: /me/invite가 Track C 핵심 영역으로 이미 닫혔다면 재확인만 하고 재구현하지 않는다.
CURRENT_SCOPE: "/me/invite. verify:account-hub-release.cjs 범위면 재실행. FIG=NOT_FOUND_IN_THIS_FILE. 성별 분기 금지."
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /me/invite 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: "verify:account-hub-release 해당 면 + 라우트 200/권한"
ACCEPTANCE: 재확인 게이트 PASS. 전면 재구현 0.
EVIDENCE: apps/web invite/referral
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-121

```yaml
ID: REL-121
TITLE: Notifications (/me/inbox) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-121
  - c-acc-001
  - c-acc-002
  - c-acc-003
ORIGINAL_INTENT: /me/inbox가 Track C 핵심 영역으로 이미 닫혔다면 재확인만 하고 재구현하지 않는다.
CURRENT_SCOPE: "/me/inbox. verify:account-hub-release.cjs 범위면 재실행. FIG=NOT_FOUND_IN_THIS_FILE. 성별 분기 금지."
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /me/inbox 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: "verify:account-hub-release 해당 면 + 라우트 200/권한"
ACCEPTANCE: 재확인 게이트 PASS. 전면 재구현 0.
EVIDENCE: apps/web inbox
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-122

```yaml
ID: REL-122
TITLE: AIInsight (/me/peotteok) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER.plan.md
SOURCE_TODO_IDS:
  - rel-122
ORIGINAL_INTENT: 퍼뜩 인사이트는 fact-only이고 가짜 수익을 만들지 않는다.
CURRENT_SCOPE: /me/peotteok. public/spark-dash/ai-*.svg 재사용 우선. 신규 AI 아바타 생성 금지부터 확인. Coach 런타임 변경은 REL-300대.
DEPENDENCIES:
  - REL-007
  - REL-018
IMPLEMENTATION_STEPS:
  - 라우트와 카피 실사
  - 기존 ai-orb/ai-ring 등 재사용 가능 여부 확인 후 신규 생성 금지
  - 숫자 인사이트는 서버 fact. 없으면 UNAVAILABLE
  - G-lane/S-lane 위반 카피 제거
  - committed spec 1
VERIFY: fake money 0. 기존 에셋 우선.
ACCEPTANCE: 인사이트 화면이 fact-only.
EVIDENCE: /me/peotteok + spark-dash ai assets
EXIT_GATE: Coach 런타임 미확인 숫자를 확정처럼 쓰면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-123

```yaml
ID: REL-123
TITLE: Profile (/me) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-123
  - c-acc-001
  - c-acc-002
  - c-acc-003
ORIGINAL_INTENT: 내 정보 허브가 동작해야 한다. 새 Account Hub Figma를 기다리지 않는다.
CURRENT_SCOPE: /me. Track C 재확인만. REL-131 신규 프레임 적용은 REL-131 산출. 이 REL은 기능/a11y/보안만.
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /me 실사 및 account-hub-release 재확인
  - REL-131 프레임이 없어도 기능 클로저 가능
  - 시각 전면 재구현 금지
  - IT jargon 0
  - "committed spec: 로그인 필수"
VERIFY: /me 실동작 + 재확인 체크리스트 PASS
ACCEPTANCE: 전면 재구현 없이 잔여 게이트만 닫힘
EVIDENCE: apps/web/app/me
EXIT_GATE: REL-131 미완료를 이 REL 차단 이유로 쓰지 않음 (독립)
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-124

```yaml
ID: REL-124
TITLE: Kyc (/me/kyc) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-124
  - c-acc-001
  - c-acc-002
  - c-acc-003
ORIGINAL_INTENT: /me/kyc가 Track C 핵심 영역으로 이미 닫혔다면 재확인만 하고 재구현하지 않는다.
CURRENT_SCOPE: "/me/kyc. verify:account-hub-release.cjs 범위면 재실행. FIG=NOT_FOUND_IN_THIS_FILE. 성별 분기 금지."
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /me/kyc 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: "verify:account-hub-release 해당 면 + 라우트 200/권한"
ACCEPTANCE: 재확인 게이트 PASS. 전면 재구현 0.
EVIDENCE: apps/web kyc
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-125

```yaml
ID: REL-125
TITLE: Settings (/me/settings) 클로저
STATUS: COMPLETED
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-125
  - c-acc-001
  - c-acc-002
  - c-acc-003
ORIGINAL_INTENT: /me/settings가 Track C 핵심 영역으로 이미 닫혔다면 재확인만 하고 재구현하지 않는다.
CURRENT_SCOPE: "/me/settings. verify:account-hub-release.cjs 범위면 재실행. FIG=NOT_FOUND_IN_THIS_FILE. 성별 분기 금지."
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /me/settings 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: "verify:account-hub-release 해당 면 + 라우트 200/권한"
ACCEPTANCE: 재확인 게이트 PASS. 전면 재구현 0.
EVIDENCE: apps/web settings
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-126

```yaml
ID: REL-126
TITLE: Support (/me/support) 클로저
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-126
  - c-acc-001
  - c-acc-002
  - c-acc-003
ORIGINAL_INTENT: /me/support가 Track C 핵심 영역으로 이미 닫혔다면 재확인만 하고 재구현하지 않는다.
CURRENT_SCOPE: "/me/support. verify:account-hub-release.cjs 범위면 재실행. FIG=NOT_FOUND_IN_THIS_FILE. 성별 분기 금지."
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /me/support 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: "verify:account-hub-release 해당 면 + 라우트 200/권한"
ACCEPTANCE: 재확인 게이트 PASS. 전면 재구현 0.
EVIDENCE: apps/web support
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-127

```yaml
ID: REL-127
TITLE: Guides (/me/guide/*) 클로저
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-127
  - c-acc-001
  - c-acc-002
  - c-acc-003
ORIGINAL_INTENT: /me/guide/* 7라우트가 Track C 핵심 영역으로 이미 닫혔다면 재확인만 하고 재구현하지 않는다.
CURRENT_SCOPE: "/me/guide/* 7라우트. verify:account-hub-release.cjs 범위면 재실행. FIG=NOT_FOUND_IN_THIS_FILE. 성별 분기 금지."
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /me/guide/* 7라우트 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: "verify:account-hub-release 해당 면 + 라우트 200/권한"
ACCEPTANCE: 재확인 게이트 PASS. 전면 재구현 0.
EVIDENCE: apps/web guide routes
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-128

```yaml
ID: REL-128
TITLE: Legal (/me/legal/*) 클로저
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_C_acquisition_account_trust.plan.md
SOURCE_TODO_IDS:
  - rel-128
  - c-acc-001
  - c-acc-002
  - c-acc-003
ORIGINAL_INTENT: /me/legal/* 5라우트가 Track C 핵심 영역으로 이미 닫혔다면 재확인만 하고 재구현하지 않는다.
CURRENT_SCOPE: "/me/legal/* 5라우트. verify:account-hub-release.cjs 범위면 재실행. FIG=NOT_FOUND_IN_THIS_FILE. 성별 분기 금지."
DEPENDENCIES:
  - REL-006
  - REL-007
IMPLEMENTATION_STEPS:
  - /me/legal/* 5라우트 실라우트와 클라이언트 파일을 연다
  - 백엔드 호출/세션/에러 상태를 재확인 (전면 재구현 금지)
  - FIG가 NOT_FOUND이면 시각 재발명 없이 a11y/security/money 진실만 닫는다
  - IT jargon 0, missing money → UNAVAILABLE
  - committed spec으로 재확인 게이트 통과
  - PR → CI → merge
VERIFY: "verify:account-hub-release 해당 면 + 라우트 200/권한"
ACCEPTANCE: 재확인 게이트 PASS. 전면 재구현 0.
EVIDENCE: apps/web legal routes
EXIT_GATE: 미배선/가짜 숫자를 REAL로 선언 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-129

```yaml
ID: REL-129
TITLE: PartnerTrust (embed) 클로저
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER.plan.md
SOURCE_TODO_IDS:
  - rel-129
ORIGINAL_INTENT: 파트너 로고는 실제 공식 로고만 쓴다. AI가 로고를 그리지 않는다.
CURRENT_SCOPE: 파트너 트러스트 임베드. ASSET_SOURCE=official logos only. AI 생성 절대 금지.
DEPENDENCIES:
  - REL-018
IMPLEMENTATION_STEPS:
  - 임베드 위치와 manifest를 실사
  - 공식 로고만 연결. 없는 파트너는 로고 없이 이름만 또는 숨김
  - AI 이미지 생성 호출 0
  - "verify:market-partner-trust가 있으면 실행"
VERIFY: AI 로고 0. manifest only.
ACCEPTANCE: 트러스트 표기가 공식 자산만 사용.
EVIDENCE: partner trust embed + manifest
EXIT_GATE: AI 로고 발견 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-130

```yaml
ID: REL-130
TITLE: Grouped compatibility 검증 (6개 실제 경로)
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER.plan.md
SOURCE_TODO_IDS:
  - rel-130
ORIGINAL_INTENT: 부가 경로가 404/빈 껍데기로 출시되지 않게 경량으로 확인한다.
CURRENT_SCOPE: "/ads, /l/[variant], /me/events, /me/strategies, /me/membership, /me/benefits. 경량 DoD: 200 또는 의도된 가드, IT jargon 0, fake money 0. 전면 재디자인 아님."
DEPENDENCIES:
  - REL-007
IMPLEMENTATION_STEPS:
  - "6개 경로를 실제 라우트 파일과 대조"
  - 각 경로 committed spec 또는 verify로 상태코드/가드 확인
  - 마케팅 /ads /l/* 는 noindex 계약이 있으면 기록 (구현은 POST-007)
  - events/strategies/membership/benefits 카피에서 개발 용어 제거
  - PR → CI → merge
VERIFY: "6경로 모두 의도된 응답. 404 방치 0."
ACCEPTANCE: 부가 경로 경량 클로저.
EVIDENCE: "6 route files + spec"
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-131

```yaml
ID: REL-131
TITLE: Account Hub Figma Desktop + Mobile frames
STATUS: PENDING
SOURCE_PLAN: account_hub_figma_23be13c4.plan.md
SOURCE_TODO_IDS:
  - figma-context
  - desktop-me
  - mobile-me
  - annotate-qa
ORIGINAL_INTENT: Spark Dash DNA로 Account Hub(/me) Desktop 1440×1080과 Mobile 390×693 프레임을 새로 그리고, Backup Home(구 3탭)을 클론하지 않는다.
CURRENT_SCOPE: Figma fileKey w7Yg8j2x9evuheOSSLqFw5에서 Room/Execution 셸만 safe duplicate. sidebar 8 + Primary 8 IA(Desktop), bottom 5 + 더보기 active(Mobile). truth-safe copy. 어노테이션+self QA REPORT 후 STOP.
DEPENDENCIES:
  - PRE-LOCK-001
IMPLEMENTATION_STEPS:
  - "00_Readme 재확인, Backup Home 클론 금지"
  - Desktop 1440 Account Hub 프레임 신설
  - Mobile 390 Account Hub 프레임 신설
  - annotate + QA REPORT
  - REL-123을 이 프레임 때문에 재구현으로 확장하지 않음
VERIFY: Figma MCP get_screenshot + node-id 기록, Home geometry regression 0
ACCEPTANCE: Desktop/Mobile 프레임 존재, none/더보기 active 규칙, IT jargon 0, FAKE MONEY 0
EVIDENCE: 실행 후 Figma node-id + intake source hash
EXIT_GATE: Founder 프레임 검토 전 REL-123을 시각 재구현으로 확장하지 않음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-200

```yaml
ID: REL-200
TITLE: apps/admin/app/page.tsx(root) 실사
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-200
ORIGINAL_INTENT: Admin 루트가 빈 페이지/유저앱 혼입이 아니라 의도된 진입(리다이렉트 또는 대시보드)이어야 한다.
CURRENT_SCOPE: apps/admin/app/page.tsx 실사. 순수 리다이렉트면 /admin으로 고정. apps/web에 /admin 라우트 0 유지.
DEPENDENCIES:
  - REL-006
IMPLEMENTATION_STEPS:
  - apps/admin/app/page.tsx 와 apps/web /admin 존재 여부 실사
  - 루트가 stub이면 /admin 리다이렉트 또는 대시보드로 정리
  - "verify:no-admin-in-web이 있으면 실행"
  - PR → CI → merge
VERIFY: web에 /admin 0. admin root가 의도된 진입.
ACCEPTANCE: 루트 진입이 모호하지 않음.
EVIDENCE: apps/admin/app/page.tsx
EXIT_GATE: 유저 앱과 Admin 셸 혼입 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-201

```yaml
ID: REL-201
TITLE: /admin 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-201
ORIGINAL_INTENT: 운영 대시보드가 2줄 stub가 아니라 실지표/실상태를 보여야 한다.
CURRENT_SCOPE: apps/admin/app/admin/page.tsx. 실측된 운영 지표만. 없는 지표는 UNAVAILABLE. 가짜 ROAS/수익 금지.
DEPENDENCIES:
  - REL-200
  - REL-016
IMPLEMENTATION_STEPS:
  - 현재 대시보드 stub 여부 실사
  - 이미 있는 API(유저수/킬스위치 상태/큐)만 연결
  - 없는 지표를 0으로 채우지 않음
  - 이후 growth/ROAS 위젯은 POST-006
  - PR → CI → merge
VERIFY: /admin 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-202

```yaml
ID: REL-202
TITLE: /admin/users 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-202
ORIGINAL_INTENT: 운영자가 /admin/users에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/users/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/users"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/users 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/users가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/users
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-203

```yaml
ID: REL-203
TITLE: /admin/users/[id] 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-203
ORIGINAL_INTENT: 운영자가 /admin/users/[id]에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/users/[id]/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/users/[id]"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/users/[id] 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/users/[id]가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/users/[id]
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-204

```yaml
ID: REL-204
TITLE: /admin/users/[id]/finance 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-204
ORIGINAL_INTENT: 유저 재무 상세는 서버 ledger/wallet을 읽기만 한다. Admin이 잔액을 직접 UPDATE하지 않는다.
CURRENT_SCOPE: apps/admin/app/admin/users/[id]/finance/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/users/[id]/finance"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/users/[id]/finance 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/users/[id]/finance가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/users/[id]/finance
EXIT_GATE: 잔액 UPDATE UI 발견 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-205

```yaml
ID: REL-205
TITLE: /admin/ledger 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-205
ORIGINAL_INTENT: 전표 조회는 더블엔트리 원장을 보여준다. 화면에서 분개를 고치지 않는다.
CURRENT_SCOPE: apps/admin/app/admin/ledger/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/ledger"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/ledger 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/ledger가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/ledger
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-206

```yaml
ID: REL-206
TITLE: /admin/wallet 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-206
ORIGINAL_INTENT: 운영자가 /admin/wallet에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/wallet/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/wallet"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/wallet 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/wallet가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/wallet
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-207

```yaml
ID: REL-207
TITLE: /admin/compliance 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-207
ORIGINAL_INTENT: KYC 심사가 서버 상태 전이로만 이뤄져야 한다.
CURRENT_SCOPE: apps/admin/app/admin/compliance/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/compliance"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/compliance 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/compliance가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/compliance
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-208

```yaml
ID: REL-208
TITLE: /admin/risk 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-208
ORIGINAL_INTENT: 운영자가 /admin/risk에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/risk/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/risk"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/risk 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/risk가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/risk
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-209

```yaml
ID: REL-209
TITLE: /admin/execution-policy 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-209
ORIGINAL_INTENT: 운영자가 /admin/execution-policy에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/execution-policy/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/execution-policy"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/execution-policy 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/execution-policy가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/execution-policy
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-210

```yaml
ID: REL-210
TITLE: /admin/opportunities 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-210
ORIGINAL_INTENT: 운영자가 /admin/opportunities에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/opportunities/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/opportunities"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/opportunities 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/opportunities가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/opportunities
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-211

```yaml
ID: REL-211
TITLE: /admin/adapters 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-211
ORIGINAL_INTENT: 운영자가 /admin/adapters에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/adapters/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/adapters"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/adapters 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/adapters가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/adapters
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-212

```yaml
ID: REL-212
TITLE: /admin/support 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-212
ORIGINAL_INTENT: 운영자가 /admin/support에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/support/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/support"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/support 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/support가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/support
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-216

```yaml
ID: REL-216
TITLE: /admin/reports/financial 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-216
ORIGINAL_INTENT: 재무 리포트는 원장 집계 오너에서만 온다. 화면 합산 위조 금지.
CURRENT_SCOPE: apps/admin/app/admin/reports/financial/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/reports/financial"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/reports/financial 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/reports/financial가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/reports/financial
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-217

```yaml
ID: REL-217
TITLE: /admin/growth 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-217
ORIGINAL_INTENT: 운영자가 /admin/growth에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/growth/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/growth"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/growth 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/growth가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/growth
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-218

```yaml
ID: REL-218
TITLE: /admin/growth/deposit 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-218
ORIGINAL_INTENT: 운영자가 /admin/growth/deposit에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/growth/deposit/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/growth/deposit"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/growth/deposit 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/growth/deposit가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/growth/deposit
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-219

```yaml
ID: REL-219
TITLE: /admin/growth/ticker 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-219
ORIGINAL_INTENT: 운영자가 /admin/growth/ticker에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/growth/ticker/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/growth/ticker"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/growth/ticker 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/growth/ticker가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/growth/ticker
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-220

```yaml
ID: REL-220
TITLE: /admin/growth/whale 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-220
ORIGINAL_INTENT: 운영자가 /admin/growth/whale에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/growth/whale/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/growth/whale"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/growth/whale 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/growth/whale가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/growth/whale
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-221

```yaml
ID: REL-221
TITLE: /admin/growth/content 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-221
ORIGINAL_INTENT: 운영자가 /admin/growth/content에서 실제 데이터를 보고 허용된 조치만 실행할 수 있어야 한다. stub/가짜 숫자는 출시 불가.
CURRENT_SCOPE: apps/admin/app/admin/growth/content/page.tsx 실사. stub이면 실데이터 연결. 유저 money 재계산 금지. Admin JWT+RBAC. IT jargon은 Admin keep-set만.
DEPENDENCIES:
  - REL-006
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/growth/content"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/growth/content 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/growth/content가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/growth/content
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-300

```yaml
ID: REL-300
TITLE: Coach P-lane (Fact-only) 런타임 재확인
STATUS: PENDING
SOURCE_PLAN: peotteok_ai_coach_hardening_v1 (workspace/intake) + putduk_release_master
SOURCE_TODO_IDS:
  - rel-300
ORIGINAL_INTENT: 퍼뜩 P-lane은 사실만 말하고 수익을 창작하지 않는다.
CURRENT_SCOPE: P-lane 런타임/프롬프트/툴 게이트 재확인. 숫자 근거 없는 수익 주장 0.
DEPENDENCIES:
  - REL-007
IMPLEMENTATION_STEPS:
  - P-lane 엔트리와 fact 소스를 실사
  - "fixture: 사실 없는 수익 질문 → 창작 없이 거절 또는 UNAVAILABLE"
  - 회귀 verify가 있으면 실행, 없으면 최소 fixture 추가
VERIFY: fact-only fixture PASS
ACCEPTANCE: P-lane이 수익을 창작하지 않음
EVIDENCE: coach P-lane 모듈 + fixture
EXIT_GATE: 창작 수익 발견 시 REL-122 DONE 무효
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-301

```yaml
ID: REL-301
TITLE: Coach G-lane (scope-guard, tools=[]) 런타임 재확인
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-301
ORIGINAL_INTENT: G-lane은 도구를 호출하지 않고 범위를 벗어나지 않는다.
CURRENT_SCOPE: G-lane tools=[]. 원장/출금/매칭 툴 호출 0.
DEPENDENCIES:
  - REL-300
IMPLEMENTATION_STEPS:
  - G-lane 설정 tools=[] 확인
  - scope-escape fixture 실행
  - 실패 시 가드 강화. 새 툴 추가 금지
VERIFY: G-lane tool call 0 fixture
ACCEPTANCE: scope-guard 유지
EVIDENCE: G-lane config + fixture
EXIT_GATE: 툴 호출 가능하면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-302

```yaml
ID: REL-302
TITLE: Coach S-lane (safe-refuse) 런타임 재확인
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-302
ORIGINAL_INTENT: 위험한 요청은 안전하게 거절한다.
CURRENT_SCOPE: S-lane safe-refuse. 탈취/우회/불법 자금 조언 거절.
DEPENDENCIES:
  - REL-300
IMPLEMENTATION_STEPS:
  - S-lane refuse fixture 목록 확인/보강
  - 거절 카피에 IT/내부용어 0
  - verify 실행
VERIFY: safe-refuse fixture PASS
ACCEPTANCE: 위험 요청이 실행 조언으로 바뀌지 않음
EVIDENCE: S-lane fixture
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-303

```yaml
ID: REL-303
TITLE: prompt-injection / scope-escape red-team pass
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-303
ORIGINAL_INTENT: 프롬프트 주입으로 P/G/S 경계를 넘지 못하게 한다.
CURRENT_SCOPE: red-team fixture. 시스템 프롬프트 유출/툴 강제/정책 무시 시도.
DEPENDENCIES:
  - REL-301
  - REL-302
IMPLEMENTATION_STEPS:
  - 주입/탈출 케이스 committed fixture
  - 실패 시 가드 수정 후 재실행
  - 통과를 채팅 한 줄로 대체 금지
VERIFY: red-team fixture PASS
ACCEPTANCE: 경계 탈출 0
EVIDENCE: coach red-team fixture
EXIT_GATE: 미실행을 PASS로 위조 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-304

```yaml
ID: REL-304
TITLE: numeric-grounding + fact-freshness 런타임 재확인
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-304
ORIGINAL_INTENT: 숫자가 있으면 출처와 신선도가 있어야 한다.
CURRENT_SCOPE: numeric-grounding + fact-freshness. stale fact를 현재인 것처럼 금지.
DEPENDENCIES:
  - REL-300
IMPLEMENTATION_STEPS:
  - 숫자 응답이 source/asOf를 갖는지 확인
  - stale fixture
  - REL-007 UNAVAILABLE과 계약 일치
VERIFY: grounding/freshness fixture PASS
ACCEPTANCE: 근거 없는 숫자 0
EVIDENCE: grounding fixture
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-305

```yaml
ID: REL-305
TITLE: conversation-state bounded-memory 런타임 재확인
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-305
ORIGINAL_INTENT: 대화 기억이 무한 증가하거나 타인 맥락을 섞지 않는다.
CURRENT_SCOPE: bounded-memory. 사용자 격리. PII 장기 보관 남용 금지.
DEPENDENCIES:
  - REL-300
IMPLEMENTATION_STEPS:
  - 메모리 한도와 세션 키 실사
  - 타 유저 컨텍스트 혼입 fixture
  - 한도 초과 시 안전 축소
VERIFY: bounded-memory fixture PASS
ACCEPTANCE: 메모리 경계 유지
EVIDENCE: conversation-state 모듈
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-215

```yaml
ID: REL-215
TITLE: /admin/ai-logs 실사+구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-215
ORIGINAL_INTENT: 운영자가 퍼뜩 대화/거절 로그를 감사할 수 있어야 한다. 프롬프트 전체를 외부로 유출하지 않는다.
CURRENT_SCOPE: /admin/ai-logs. REL-300~305 완료 후. PII 마스킹.
DEPENDENCIES:
  - REL-305
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/ai-logs"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/ai-logs 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/ai-logs가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/ai-logs
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-400

```yaml
ID: REL-400
TITLE: Admin Control Plane superset 클로저 스펙
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-400
  - d-admin-001
ORIGINAL_INTENT: kill-switch UI / audit UI / RBAC 관리 UI의 계약을 먼저 고정한다. 화면 구현은 후속 REL.
CURRENT_SCOPE: 스펙/스키마/권한 매트릭스만. REL-213/214/405/406이 구현. 유저앱에 Admin IA 이식 금지.
DEPENDENCIES:
  - REL-201
IMPLEMENTATION_STEPS:
  - kill-switch / audit / RBAC 관리 화면 계약 문서화
  - "3-mode(LIVE/DRY_RUN/SIMULATION) 용어를 스펙에 고정"
  - 구현 PR을 이 REL에 섞지 않음
VERIFY: 스펙 문서 존재. 구현 혼입 0.
ACCEPTANCE: REL-213/214/405가 이 스펙을 구현할 수 있음
EVIDENCE: governance/admin/control-plane-superset.md (신설 또는 갱신)
EXIT_GATE: 스펙 없이 킬스위치 UI 착수 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-213

```yaml
ID: REL-213
TITLE: /admin/system-control (kill-switch) 실구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-213
ORIGINAL_INTENT: 운영자가 치명 스위치를 사람 확인 후 켤 수 있어야 한다.
CURRENT_SCOPE: /admin/system-control. REL-406 9종 스위치의 UI. preview→confirm. 유저 money 회로 직접 편집 금지.
DEPENDENCIES:
  - REL-400
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/system-control"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/system-control 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/system-control가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/system-control
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-214

```yaml
ID: REL-214
TITLE: /admin/audit 실구현
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-214
ORIGINAL_INTENT: 누가 무엇을 바꿨는지 감사 로그가 남아야 한다.
CURRENT_SCOPE: /admin/audit. REL-405 audit schema 소비. 로그 삭제 UI 0.
DEPENDENCIES:
  - REL-400
  - REL-201
IMPLEMENTATION_STEPS:
  - "현재 페이지/API 실사: /admin/audit"
  - 백엔드 엔드포인트·권한·빈상태 확인
  - stub이면 최소 운영 UI + 실데이터. 클라이언트 잔액 조작 0
  - secret/토큰 화면 노출 0
  - committed spec 또는 verify 1케이스
  - PR → CI → merge (main 직접 커밋 금지)
VERIFY: /admin/audit 실데이터 또는 정직한 empty. stub-only 0.
ACCEPTANCE: /admin/audit가 운영 가능. 가짜 ledger 0.
EVIDENCE: apps/admin/app/admin/audit
EXIT_GATE: 유저 JWT로 200이면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-401

```yaml
ID: REL-401
TITLE: 보안 헤더 미들웨어 (CSP/HSTS/X-Frame-Options)
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-401
ORIGINAL_INTENT: 클릭재킹/혼합콘텐츠/느슨한 프레임 삽입을 헤더로 막는다.
CURRENT_SCOPE: api-nest 및/또는 web 미들웨어 보안 헤더. CSP는 실사용 호스트만.
DEPENDENCIES:
  - REL-010
IMPLEMENTATION_STEPS:
  - 현재 헤더 실사
  - CSP/HSTS/X-Frame-Options/X-Content-Type-Options 적용
  - SW/PWA와 CSP 충돌 확인
  - verify 또는 헤더 스모크
VERIFY: 필수 헤더 존재. 와일드카드 CSP 남용 0.
ACCEPTANCE: 보안 헤더 실적용
EVIDENCE: middleware/headers
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-402

```yaml
ID: REL-402
TITLE: 의존성 취약점 스캔을 CI에 편입
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-402
ORIGINAL_INTENT: 알려진 취약 의존성이 조용히 main에 쌓이지 않게 한다.
CURRENT_SCOPE: pnpm audit를 CI에 편입. 로컬 풀 스캔 강행 아님. 허용 예외는 문서화.
DEPENDENCIES:
  - REL-005
IMPLEMENTATION_STEPS:
  - gate.yml 또는 verify 경로에 audit 추가
  - 심각도 임계와 예외 파일
  - 예외를 숨기지 않고 기록
VERIFY: CI 또는 verify에 audit 단계 존재
ACCEPTANCE: 취약점 스캔이 게이트에 있음
EVIDENCE: .github/workflows/gate.yml 또는 tooling/verify
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-403

```yaml
ID: REL-403
TITLE: 버전/릴리스 태깅 체계 도입
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-403
ORIGINAL_INTENT: 배포된 바이너리/워커가 어떤 커밋인지 알 수 있어야 롤백이 된다.
CURRENT_SCOPE: semver 또는 calver + git tag 규칙. production 자동 태그 강제가 HUMAN deploy와 충돌하면 수동 태그.
DEPENDENCIES:
  - REL-005
IMPLEMENTATION_STEPS:
  - 버전 파일 또는 태그 규칙 문서화
  - 앱/워커에 release id 노출(비밀 아님)
  - REL-602 롤백이 이 id를 쓰도록 연결 메모
VERIFY: 버전 규칙 문서 + 빌드에 id
ACCEPTANCE: 릴리스를 식별 가능
EVIDENCE: governance/release-master/VERSIONING.md
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-404

```yaml
ID: REL-404
TITLE: Lighthouse CI + 성능예산 배선
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-404
ORIGINAL_INTENT: 번들/이미지/lazy-load 예산을 성능 후순위로 미루지 않는다.
CURRENT_SCOPE: Lighthouse CI + 이미지 포맷/lazy-load/번들 예산. Home 시각 다운그레이드 금지. 로컬 풀 LH는 CI 위임.
DEPENDENCIES:
  - REL-019
IMPLEMENTATION_STEPS:
  - 예산 파일 작성 (bundle/image/lazy)
  - CI Lighthouse 또는 동등 (저사양 로컬 풀런 금지)
  - Home 성능을 이유로 geometry 다운그레이드 금지
VERIFY: 예산 파일이 레포에 있음
ACCEPTANCE: 성능 게이트 경로 존재
EVIDENCE: lighthouse/budget config
EXIT_GATE: Home 시각 후퇴 PR 거부
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-405

```yaml
ID: REL-405
TITLE: RBAC + Audit Foundation
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-405
  - d-admin-001
ORIGINAL_INTENT: Admin 역할과 감사 스키마가 서버에 있어야 UI가 의미가 있다.
CURRENT_SCOPE: "8 role capability mapping + mandatory audit schema. OWASP ASVS V8/V16. supabase/api-nest."
DEPENDENCIES:
  - REL-400
IMPLEMENTATION_STEPS:
  - role-capability 매트릭스 코드화
  - audit 테이블/쓰기 미들웨어
  - 권한 없는 조치 403 + audit
  - verify fixture
VERIFY: RBAC deny fixture + audit write fixture
ACCEPTANCE: 서버 RBAC/audit 존재
EVIDENCE: api-nest rbac/audit + migration
EXIT_GATE: UI만 있고 서버 가드 없으면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-406

```yaml
ID: REL-406
TITLE: Kill Switch 9종
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-406
  - d-admin-002
ORIGINAL_INTENT: 치명 상황에서 기회/매칭/출금 등을 서버가 멈출 수 있어야 한다.
CURRENT_SCOPE: GLOBAL_OPPORTUNITY_PAUSE 등 9종. money_circuit 선례 재사용. UI는 REL-213.
DEPENDENCIES:
  - REL-405
IMPLEMENTATION_STEPS:
  - "9종 스위치 목록을 코드 상수로 고정"
  - 서버 enforce (UI 우회 불가)
  - audit 필수
  - "verify: 스위치 ON이면 해당 경로 block"
VERIFY: 스위치 enforce fixture
ACCEPTANCE: "9종 서버 강제"
EVIDENCE: kill-switch service
EXIT_GATE: UI 토글만 있고 서버 무시되면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-407

```yaml
ID: REL-407
TITLE: Price Override Engine (4레이어)
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-407
  - d-admin-005
ORIGINAL_INTENT: 관측가와 노출가를 섞지 않는다.
CURRENT_SCOPE: SOURCE_OBSERVED → OVERRIDE → EFFECTIVE → USER_VISIBLE. 유저 화면이 SOURCE를 직접 꾸미지 않음.
DEPENDENCIES:
  - REL-405
  - REL-003
IMPLEMENTATION_STEPS:
  - "4레이어 타입/테이블 실사 또는 구현"
  - override는 audit+이유 코드
  - USER_VISIBLE이 EFFECTIVE만 읽는지 확인
  - verify fixture
VERIFY: 레이어 혼용 0 fixture
ACCEPTANCE: 가격 오너 4단 유지
EVIDENCE: price override module
EXIT_GATE: 유저 화면이 observed를 임의 표시하면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-408

```yaml
ID: REL-408
TITLE: Security/secrets/RLS-role 실증 + backup/rollback runbook baseline
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md
SOURCE_TODO_IDS:
  - rel-408
  - f-rel-006
ORIGINAL_INTENT: RLS/롤/시크릿과 롤백 런북이 없이 스테이징에 가면 안 된다.
CURRENT_SCOPE: RLS-role 실증, secrets 스캔, backup/rollback runbook 문서. 실제 production apply는 REL-701-DB.
DEPENDENCIES:
  - REL-405
  - REL-001
IMPLEMENTATION_STEPS:
  - supabase RLS/role 실측 쿼리 (읽기, 스키마 변경 금지)
  - secrets scan 재실행
  - rollback runbook 초안 (REL-602가 연습)
  - 결과를 readiness 입력으로 저장
VERIFY: runbook + RLS evidence 문서
ACCEPTANCE: 보안 baseline 문서화. prod apply 0.
EVIDENCE: governance/release-master/SECURITY_BASELINE.md
EXIT_GATE: 이 REL에서 apply_migration 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-222

```yaml
ID: REL-222
TITLE: "3-mode Admin Ops + Preview-As-User + Impact Simulation"
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-222
  - d-admin-016
ORIGINAL_INTENT: 위험한 운영 조치는 preview→confirm→apply→result→rollback 없이는 LIVE가 되면 안 된다.
CURRENT_SCOPE: LIVE/DRY_RUN/SIMULATION + Preview-As-User + Impact Simulation. REL-405 이후.
DEPENDENCIES:
  - REL-405
  - REL-400
IMPLEMENTATION_STEPS:
  - "3-mode를 서버 플래그로 강제"
  - LIVE는 confirm 없이 불가
  - Preview-As-User가 유저 JWT를 발급하지 않고 서버 impersonation 범위만
  - audit 전 단계
  - verify fixture
VERIFY: DRY_RUN이 원장을 바꾸지 않음. LIVE는 confirm 필수.
ACCEPTANCE: "3-mode 운영 경로 존재"
EVIDENCE: admin ops 3-mode module
EXIT_GATE: SIMULATION이 실원장을 바꾸면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-223

```yaml
ID: REL-223
TITLE: Allocation/Manual Match Control + Bulk/Schedule/Campaign Ops
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-223
  - d-admin-018
ORIGINAL_INTENT: 수동 매칭/대량은 허용 동사만, 항상 preview+confirm+audit.
CURRENT_SCOPE: ALLOW/BLOCK/PAUSE/CANCEL/REASSIGN + Bulk/Schedule/Campaign. REL-407 이후.
DEPENDENCIES:
  - REL-407
  - REL-222
IMPLEMENTATION_STEPS:
  - 허용 동사 화이트리스트
  - bulk는 preview 카운트/영향 범위 필수
  - 원장 직접 편집 동사 0
  - verify fixture
VERIFY: 미허용 동사 거부. preview 없는 LIVE 0.
ACCEPTANCE: 수동 매칭/대량 운영이 감사 가능
EVIDENCE: allocation/match control module
EXIT_GATE: 숨은 잔액 수정 API 발견 시 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-224

```yaml
ID: REL-224
TITLE: Source/Parser Health + Founder Override + Policy Versioning
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-224
  - d-admin-019
ORIGINAL_INTENT: 소스/파서 건강과 정책 버전을 운영자가 보고, Founder만 최상위 override를 한다.
CURRENT_SCOPE: health 대시보드 + Founder override + V1/V2/V3 history+rollback. REL-405 이후.
DEPENDENCIES:
  - REL-405
  - REL-211
IMPLEMENTATION_STEPS:
  - parser/source health 지표 API
  - 정책 버전 테이블 + rollback
  - Founder override는 HIGH+audit
  - verify fixture
VERIFY: 버전 이력 존재. override audit 존재.
ACCEPTANCE: 소스 건강/정책 버전 운영 가능
EVIDENCE: source health + policy versioning
EXIT_GATE: 이력 없는 덮어쓰기면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### REL-409

```yaml
ID: REL-409
TITLE: Admin R6 Certification
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_D_admin_control_plane.plan.md
SOURCE_TODO_IDS:
  - rel-409
  - d-admin-020
ORIGINAL_INTENT: Admin 모듈이 빠진 채 출시되지 않게 한 번에 인증한다.
CURRENT_SCOPE: "12모듈+2b 전수. deps: REL-200~224 해당분 + REL-400 + REL-405~408."
DEPENDENCIES:
  - REL-200
  - REL-201
  - REL-202
  - REL-203
  - REL-204
  - REL-205
  - REL-206
  - REL-207
  - REL-208
  - REL-209
  - REL-210
  - REL-211
  - REL-212
  - REL-213
  - REL-214
  - REL-215
  - REL-216
  - REL-217
  - REL-218
  - REL-219
  - REL-220
  - REL-221
  - REL-222
  - REL-223
  - REL-224
  - REL-400
  - REL-405
  - REL-406
  - REL-407
  - REL-408
IMPLEMENTATION_STEPS:
  - 모듈 체크리스트 12+2b 작성
  - 각 라우트 stub/권한/audit 재실행
  - known P0-P3 0
  - 인증서 문서
VERIFY: 체크리스트 전항 PASS
ACCEPTANCE: Admin R6 인증서 발급
EVIDENCE: governance/admin/R6_CERTIFICATION.md
EXIT_GATE: 의존 REL 미완료면 인증 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-500

```yaml
ID: REL-500
TITLE: QA-LAB-EXPANSION (persona × device × browser × network × a11y)
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-500
ORIGINAL_INTENT: Bootstrap을 전체 위험 기반 매트릭스로 확장한다. 나이브 카르테시안 풀폭주 금지.
CURRENT_SCOPE: committed spec 확장. 위험 기반 device/browser matrix. QA_ENV_ISOLATION_GUARD 필수.
DEPENDENCIES:
  - REL-006
  - REL-012
  - REL-019
IMPLEMENTATION_STEPS:
  - Bootstrap 하네스를 확장 매트릭스 문서로 설계
  - 고위험 조합만 필수, 저위험은 샘플
  - 모든 케이스는 committed spec
  - 로컬 풀매트릭스 금지, CI 위임
VERIFY: 확장 spec이 git에 있음. 가드 유지.
ACCEPTANCE: Expansion Lab 사용 가능
EVIDENCE: tooling/e2e expansion specs
EXIT_GATE: MCP-only 확장은 DONE 아님
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-501

```yaml
ID: REL-501
TITLE: 금융/red-team 풀매트릭스
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-501
ORIGINAL_INTENT: 돈 경로의 실패 모드를 가드 안에서 전부 친다.
CURRENT_SCOPE: idempotency, double submit, insufficient, stale, expired, blocked, replay. QA_ENV_ISOLATION_GUARD 필수. production DB 0.
DEPENDENCIES:
  - REL-006
  - REL-007
  - REL-008
  - REL-015
  - REL-500
IMPLEMENTATION_STEPS:
  - 금융 실패 모드 목록화
  - 가드 없이 실행되면 즉시 중단
  - committed spec으로 실행
  - 실패는 숨기지 않고 가산 REL 또는 수정
VERIFY: 가드 PASS + 금융 매트릭스 결과 문서
ACCEPTANCE: 핵심 금융 실패 모드 커버
EVIDENCE: tooling/e2e money/red-team report
EXIT_GATE: 가드 실패 시 전면 중단
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-502

```yaml
ID: REL-502
TITLE: FINAL ENGINE ACCEPTANCE
STATUS: PENDING
SOURCE_PLAN: ai_profit_os_02_5_engine_acceptance_c3d4e5f6.plan.md
SOURCE_TODO_IDS:
  - rel-502
  - qa0
  - qa1
  - qa2
  - qa3
  - qa4
  - qa5
  - qa6
  - qa7
  - qa8
  - qa9
ORIGINAL_INTENT: protected scope를 만진 모든 작업이 끝난 뒤에만 엔진을 최종 인증한다.
CURRENT_SCOPE: QA0-QA9 재베이스+재인증. 의존은 고정 range가 아니라 PROTECTED_SCOPE_MUTATION=TRUE 인 모든 REL.
DEPENDENCIES:
  - REL-003
  - REL-008
  - REL-010
  - REL-015
  - REL-016
  - REL-020
  - REL-021
  - REL-022
  - REL-222
  - REL-223
  - REL-224
  - REL-401
  - REL-405
  - REL-406
  - REL-407
  - REL-408
  - REL-004
  - REL-501
IMPLEMENTATION_STEPS:
  - 현재 PSM=TRUE REL이 전부 completed인지 기계 확인
  - 실행 중 새로 TRUE가 된 REL이 있으면 이 목록에 편입하고 기다림
  - QA0-QA9 재실행 (CI 위임 가능)
  - 인증서를 REL-004 sanity와 별도 문서로 발급
VERIFY: QA0-QA9 PASS. PSM=TRUE 미완료 0.
ACCEPTANCE: FINAL ENGINE ACCEPTANCE 문서. REL-004로 대체 금지.
EVIDENCE: governance/engine-acceptance/FINAL_ACCEPTANCE.md
EXIT_GATE: 이후 PSM=TRUE 작업이 생기면 인증 무효 → 재실행
AUTOMATION_LEVEL: A2
PROTECTED_SCOPE_MUTATION: false
```

### REL-503

```yaml
ID: REL-503
TITLE: protected-scope STALE 감시 상시화
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-503
ORIGINAL_INTENT: 인증 이후 protected 파일이 바뀌면 인증이 자동으로 stale이 되어야 한다.
CURRENT_SCOPE: 해시/CI 감시. STALE이면 REL-502 재실행 트리거. 은폐 금지.
DEPENDENCIES:
  - REL-502
IMPLEMENTATION_STEPS:
  - protected-scope.v1.json 해시 스냅샷
  - CI에서 drift 시 fail 또는 stale 플래그
  - 문서에 재인증 절차
VERIFY: 의도적 1파일 변경이 stale을 만든다 (테스트 브랜치)
ACCEPTANCE: 감시 동작
EVIDENCE: protected-scope watch script
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-504

```yaml
ID: REL-504
TITLE: PRODUCTION_MIGRATION_READINESS_CHECK
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md
SOURCE_TODO_IDS:
  - rel-504
  - f-rel-001
ORIGINAL_INTENT: 프로덕션에 적용할 준비가 됐는지 검증만 한다. 실제 apply는 하지 않는다.
CURRENT_SCOPE: Track A local proof + REL-408 baseline + migration 파일 리뷰. apply_migration 0. apply는 REL-701-DB.
DEPENDENCIES:
  - REL-003
  - REL-408
  - REL-502
IMPLEMENTATION_STEPS:
  - migration 파일 리뷰 체크리스트
  - Track A evidence JSON 재확인
  - READY 신호 문서만 생성
  - 원격 스키마 변경 명령 실행 금지
VERIFY: READY 문서 존재. apply 로그 0.
ACCEPTANCE: readiness만 PASS. production DB 불변.
EVIDENCE: governance/release-master/MIGRATION_READINESS.md
EXIT_GATE: apply 흔적 있으면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-505

```yaml
ID: REL-505
TITLE: BACKEND_DATA_ALIGNMENT_CERTIFICATION (R7)
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md
SOURCE_TODO_IDS:
  - rel-505
  - f-rel-002
ORIGINAL_INTENT: "API/SDK/Nest/Engine/migration head가 서로 다른 진실을 말하지 않게 1:1 대조한다."
CURRENT_SCOPE: API·SDK·Nest AppModule·Engine FSM·local/remote migration head·indexes/RLS/idempotency·auth permission·money units·source/asOf/reasonCode. 충돌 은폐 금지.
DEPENDENCIES:
  - REL-504
  - REL-502
IMPLEMENTATION_STEPS:
  - 대조표 작성
  - semantic conflict면 가산 REL + version bump
  - R7 인증서
VERIFY: 대조표 공란 0. 은폐 0.
ACCEPTANCE: R7 인증
EVIDENCE: governance/release-master/R7_BACKEND_ALIGNMENT.md
EXIT_GATE: 충돌을 각주로 숨기면 FAIL
AUTOMATION_LEVEL: A2
PROTECTED_SCOPE_MUTATION: false
```

### REL-506

```yaml
ID: REL-506
TITLE: INFRA_RELEASE_CERTIFICATION_CORE (R8, Ads 제외)
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md
SOURCE_TODO_IDS:
  - rel-506
  - f-rel-003
ORIGINAL_INTENT: Workers origin/cache/R2/Web Vitals/에러추적/세션/rollback known-good을 인증한다. Ads 자동운영 인증으로 대체 금지.
CURRENT_SCOPE: infra/domain.manifest openNext Workers. Ads 자동화는 POST-012. Vercel 0.
DEPENDENCIES:
  - REL-016
  - REL-403
  - REL-505
IMPLEMENTATION_STEPS:
  - domain.manifest openNext 실사
  - rollback known-good 기록
  - R8 체크리스트. Ads 항목 제외
  - known P0-P3 0
VERIFY: R8 체크리스트 PASS. pages deploy 경로 0.
ACCEPTANCE: R8 Core 인증. 자동운영 완료 문구 0.
EVIDENCE: governance/release-master/R8_INFRA_CORE.md
EXIT_GATE: R8을 자동운영 완료로 쓰면 FAIL
AUTOMATION_LEVEL: A2
PROTECTED_SCOPE_MUTATION: false
```

### REL-507

```yaml
ID: REL-507
TITLE: PRODUCTION_E2E (로그인→참여→정산→지갑)
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md
SOURCE_TODO_IDS:
  - rel-507
  - f-rel-007
ORIGINAL_INTENT: 핵심 수익 루프가 실 브라우저에서 한 줄로 이어지는지 증명한다.
CURRENT_SCOPE: 인증 세션 Playwright. 로그인→참여→정산→지갑. QA 가드. Track B 핵심 완료 후.
DEPENDENCIES:
  - REL-102
  - REL-107
  - REL-109
  - REL-113
  - REL-501
IMPLEMENTATION_STEPS:
  - QA 격리 환경에서 committed E2E
  - 성공 숫자를 픽스처로 위조하지 않음
  - 실패 시 해당 REL 재오픈
VERIFY: E2E PASS. 가드 PASS.
ACCEPTANCE: 핵심 루프 실브라우저 증명
EVIDENCE: tooling/e2e production-loop spec
EXIT_GATE: 가드 없이 실서비스 폭격 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-600

```yaml
ID: REL-600
TITLE: Staging 배포
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md
SOURCE_TODO_IDS:
  - rel-600
ORIGINAL_INTENT: 프로덕션과 같은 경로로 스테이징에 올려 회귀할 자리를 만든다.
CURRENT_SCOPE: staging 경로/자격 확정 후 배포. production workflow_dispatch를 스테이징에 오용하지 않음. 자격은 HUMAN이 주입.
DEPENDENCIES:
  - REL-506
  - REL-016
  - REL-502
IMPLEMENTATION_STEPS:
  - staging origin을 manifest에서 확정
  - 배포. production 도메인 금지
  - 배포 결과 URL 기록
VERIFY: staging URL 응답. production 도메인 불변.
ACCEPTANCE: staging 존재
EVIDENCE: staging deploy log
EXIT_GATE: 자격 추측/하드코딩 secret 금지
AUTOMATION_LEVEL: A2
PROTECTED_SCOPE_MUTATION: false
```

### REL-601

```yaml
ID: REL-601
TITLE: Staging 전체 회귀 (Surface Matrix)
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-601
ORIGINAL_INTENT: 스테이징에서 소비자/어드민 표면과 반응형/에셋 QA를 다시 돌린다.
CURRENT_SCOPE: Surface Matrix 전량. Home LARGE_SCREEN_SAFETY_QA 포함. Home 시각 재설계 아님.
DEPENDENCIES:
  - REL-600
  - REL-500
  - REL-105
IMPLEMENTATION_STEPS:
  - Surface Matrix 목록으로 staging 회귀
  - Home 1440/390 + 대형화면 안전
  - 실패는 티켓/가산 수정. pixel-diff 단독 실패 금지
VERIFY: 회귀 리포트. Home redesign 0.
ACCEPTANCE: staging 회귀 PASS
EVIDENCE: staging regression report
EXIT_GATE: 회귀 FAIL인데 production 진행 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-602

```yaml
ID: REL-602
TITLE: Rollback 연습 (staging 실실행)
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-602
ORIGINAL_INTENT: 롤백을 문서만으로 끝내지 않고 스테이징에서 실제로 되돌린다.
CURRENT_SCOPE: REL-408 runbook을 staging에서 실행+검증. production 롤백 연습 아님.
DEPENDENCIES:
  - REL-600
  - REL-403
  - REL-408
IMPLEMENTATION_STEPS:
  - known-good으로 staging rollback 실행
  - 앱이 이전 버전으로 사는지 확인
  - 다시 forward deploy
  - 결과 기록
VERIFY: rollback 전후 버전 id 증거
ACCEPTANCE: 롤백이 실동작
EVIDENCE: staging rollback report
EXIT_GATE: 미연습 상태로 auto-deploy 금지 (우리는 auto-deploy 없음)
AUTOMATION_LEVEL: A2
PROTECTED_SCOPE_MUTATION: false
```

### REL-603

```yaml
ID: REL-603
TITLE: 연령대별 수동 사용성 실사
STATUS: PENDING
SOURCE_PLAN: 퍼뜩_03_ui_ux_master_plan_be3fa3cc.plan.md (intake)
SOURCE_TODO_IDS:
  - rel-603
  - part8-loop-proof-responsive-spotcheck
ORIGINAL_INTENT: "20/40/60-70대가 실제로 길을 잃지 않는지 사람이 본다. 자동화로 대체 금지."
CURRENT_SCOPE: 각 연령대 3명. 사람 실행 필수. AUTOMATION_LEVEL=A0. 결과를 문서화.
DEPENDENCIES:
  - REL-601
IMPLEMENTATION_STEPS:
  - 시나리오 시트 작성 (가입/기회/참여/지갑)
  - Founder가 사람을 섭외/실행 (에이전트 대체 0)
  - 이슈를 심각도별로 기록
  - P0면 해당 REL 재오픈
VERIFY: "9명 결과표 또는 명시적 HUMAN_BLOCK (사람 미섭외)"
ACCEPTANCE: 실사 완료 또는 정직한 HUMAN_BLOCK. 자동 PASS 위조 0.
EVIDENCE: governance/release-master/AGE_SPOTCHECK.md
EXIT_GATE: 자동화 스크립트로 이 REL을 닫지 않음
AUTOMATION_LEVEL: A0
PROTECTED_SCOPE_MUTATION: false
```

### REL-700

```yaml
ID: REL-700
TITLE: Production 준비도 게이트 집계 리뷰
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-700
ORIGINAL_INTENT: 모든 선행 게이트를 한 장으로 모아 Founder가 배포를 결정할 수 있게 한다.
CURRENT_SCOPE: REL-502/505/506/601/602/016/504 결과 집계. 배포 실행 아님.
DEPENDENCIES:
  - REL-502
  - REL-505
  - REL-506
  - REL-601
  - REL-602
  - REL-504
IMPLEMENTATION_STEPS:
  - 게이트 표 집계
  - 빨간 항목이 있으면 배포 REL 진입 금지
  - Founder 리뷰 문서
VERIFY: 집계표 공란 0
ACCEPTANCE: 준비도 문서. 배포 미실행.
EVIDENCE: governance/release-master/PROD_READINESS.md
EXIT_GATE: 빨간 항목 무시하고 701 진입 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-701-PRE

```yaml
ID: REL-701-PRE
TITLE: KAKAO_PRODUCTION_READINESS_VERIFICATION
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-701-pre
ORIGINAL_INTENT: 카카오 라이브가 필요한지 코드/설정으로 먼저 판정하고, 필요할 때만 사람 E2E 자식 작업을 연다.
CURRENT_SCOPE: A3 검증 우선. VERIFIED일 때만 child A0 BLK 생성. 추측으로 A0를 기본값 삼지 않음.
DEPENDENCIES:
  - REL-102
  - REL-700
IMPLEMENTATION_STEPS:
  - Kakao env/코드 경로 재확인 (시크릿 출력 금지)
  - LIVE_KAKAO_HUMAN_E2E 상태 기록
  - 필요 시 A0 자식 작업만 생성. 불필요하면 NOT_REQUIRED
VERIFY: 판정 문서. 추측 A0 0.
ACCEPTANCE: 카카오 잔여가 정직히 닫히거나 에스컬레이션됨
EVIDENCE: governance/release-master/KAKAO_READINESS.md
EXIT_GATE: NOT_RUN을 production 완료로 쓰면 FAIL
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-701-DB

```yaml
ID: REL-701-DB
TITLE: PRODUCTION_MIGRATION_APPLY
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md
SOURCE_TODO_IDS:
  - rel-701-db
  - f-rel-001
ORIGINAL_INTENT: 이미 리뷰된 migration을 원격 프로덕션 DB에 적용한다. 이 전에는 적용하지 않는다.
CURRENT_SCOPE: source_observations/canonical_products/match_results 등 원격 Supabase 반영. 실제 production DB mutation. Founder 명시 승인 필수.
DEPENDENCIES:
  - REL-504
  - REL-601
  - REL-602
  - REL-700
IMPLEMENTATION_STEPS:
  - Founder 명시 승인 텍스트를 evidence에 첨부
  - 승인 없이 apply_migration 호출 금지
  - 적용 후 스키마 head 확인
  - 실패 시 runbook 롤백 (연습된 절차)
VERIFY: 승인 evidence + 적용 후 head. 무단 apply 0.
ACCEPTANCE: 프로덕션 스키마가 리뷰된 head와 일치
EVIDENCE: migration apply log (비밀 마스킹)
EXIT_GATE: staging FAIL 또는 승인 없으면 실행 금지
AUTOMATION_LEVEL: A1
PROTECTED_SCOPE_MUTATION: false
```

### REL-701

```yaml
ID: REL-701
TITLE: Production 앱 배포 실행
STATUS: PENDING
SOURCE_PLAN: PUTDUK_CURRENT_MASTER_TRACK_F_production_infra.plan.md
SOURCE_TODO_IDS:
  - rel-701
ORIGINAL_INTENT: 사람이 workflow_dispatch로 프로덕션 앱을 올린다.
CURRENT_SCOPE: deploy-cloudflare.yml workflow_dispatch. deps REL-701-DB. 에이전트가 production token 보유 0.
DEPENDENCIES:
  - REL-701-DB
  - REL-701-PRE
IMPLEMENTATION_STEPS:
  - Founder/HUMAN이 workflow_dispatch
  - Workers only. pages deploy 금지
  - 배포 SHA/버전 기록
VERIFY: 배포 run 성공. 도메인 origin=openNext.
ACCEPTANCE: 프로덕션 앱이 새 SHA
EVIDENCE: GitHub Actions deploy run
EXIT_GATE: 에이전트 단독 토큰 배포 금지
AUTOMATION_LEVEL: A1
PROTECTED_SCOPE_MUTATION: false
```

### REL-702

```yaml
ID: REL-702
TITLE: 자동 production smoke
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-702
ORIGINAL_INTENT: 배포 직후 핵심 경로가 사는지 자동으로 본다.
CURRENT_SCOPE: 읽기 위주 smoke. 금융 mutation smoke는 가드/프로덕션 정책에 따라 deny. 파괴 테스트 금지.
DEPENDENCIES:
  - REL-701
IMPLEMENTATION_STEPS:
  - health/login page/profits list smoke
  - 원장 write smoke는 production에서 기본 금지
  - 실패 시 롤백 후보
VERIFY: smoke 리포트
ACCEPTANCE: 핵심 읽기 경로 생존
EVIDENCE: production smoke report
EXIT_GATE: production에 임의 출금 테스트 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-703

```yaml
ID: REL-703
TITLE: production observability 확인
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-703
ORIGINAL_INTENT: 실제 트래픽/에러가 관측 파이프로 들어오는지 확인한다.
CURRENT_SCOPE: REL-016 sink가 production에서 수신. PII raw 0. 알림 1건 시험은 HUMAN.
DEPENDENCIES:
  - REL-702
  - REL-016
IMPLEMENTATION_STEPS:
  - 에러/로그 스트림 확인
  - 마스킹 확인
  - alert route 생존
VERIFY: 관측 이벤트 증거 (마스킹)
ACCEPTANCE: 관측이 살아 있음
EVIDENCE: obs confirmation note
EXIT_GATE: 없음
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### REL-704

```yaml
ID: REL-704
TITLE: RELEASE CLOSURE
STATUS: PENDING
SOURCE_PLAN: putduk_release_master_ff3a5134.plan.md
SOURCE_TODO_IDS:
  - rel-704
ORIGINAL_INTENT: 출시 큐를 닫고 상태를 CLOSED로 남긴다. 자동운영 완료 문구는 POST-012만.
CURRENT_SCOPE: PLATFORM_RELEASE_STATUS=CLOSED. POST 19는 큐 밖 잔여로 유지. R8로 자동운영 완료 대체 금지.
DEPENDENCIES:
  - REL-702
  - REL-703
IMPLEMENTATION_STEPS:
  - 게이트 최종 표
  - PLATFORM_RELEASE_STATUS=CLOSED 기록
  - POST-001 이후가 남아 있음을 명시
  - 자동운영 완료 문장 금지
VERIFY: CLOSED 문서. POST 미삭.
ACCEPTANCE: REL 큐 종료. POST는 별도 실행.
EVIDENCE: governance/release-master/RELEASE_CLOSURE.md
EXIT_GATE: POST를 삭제하거나 완료로 위조 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-001

```yaml
ID: POST-001
TITLE: Attribution Chain Fixture (D1~D3 TDD)
STATUS: PENDING
SOURCE_PLAN: "06_infra(marketing-attribution-chain-fixture) -> Track G(g-growth-001)"
SOURCE_TODO_IDS:
  - marketing-attribution-chain-fixture
  - g-growth-001
ORIGINAL_INTENT: 첫 실트래픽 전에 dedup/idempotency 계약을 fixture로 먼저 증명한다. 중복 CAPI/중복 credit를 코드보다 먼저 막는다.
CURRENT_SCOPE: D1 동일 deposit_event_id 웹훅 2회→first_deposit 1회+CAPI 1회. D2 동일 idempotency 재시도 no-op. D3 동시 first_deposit 경쟁→승 1건, DB txn+partial unique index 또는 SELECT FOR UPDATE.
DEPENDENCIES: N/A
IMPLEMENTATION_STEPS:
  - fixture 시나리오 D1~D3 작성
  - DB 계약(partial unique index 후보) 설계
  - fixture-only 실행(실 트래픽 0)
  - verify 스크립트 작성
VERIFY: "verify:attribution-chain (신설) D1~D3 PASS"
ACCEPTANCE: 세 시나리오 명세대로. consent=false 시 CAPI enqueue 0
EVIDENCE: tooling/verify/attribution-chain.cjs + fixture
EXIT_GATE: 이 fixture PASS 전까지 POST-002/003 착수 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### POST-002

```yaml
ID: POST-002
TITLE: Marketing SDK Attribution (utm/consent/cookies)
STATUS: PENDING
SOURCE_PLAN: "06_infra(marketing-sdk-attribution) -> Track G(g-growth-002)"
SOURCE_TODO_IDS:
  - marketing-sdk-attribution
  - g-growth-002
ORIGINAL_INTENT: UTM/클릭ID/동의 상태를 서버로 안전하게 전달한다. OAuth state에 attribution을 태우지 않는다.
CURRENT_SCOPE: packages/sdk/marketing + apps/web middleware(/l,/ads) + POST /api/v1/marketing/touch + attr_id httpOnly cookie. OAuth state=CSRF nonce only.
DEPENDENCIES:
  - POST-001
IMPLEMENTATION_STEPS:
  - SDK 패키지 scaffold
  - middleware 라우팅
  - touch API
  - consent gate(=== true만 emit)
  - GuestChrome 통합
VERIFY: "verify:marketing-compliance (auto pixel import 0 포함)"
ACCEPTANCE: consent!==true → vendor call 0. landingVariant cookie가 onboarding까지 유지
EVIDENCE: packages/sdk/marketing/**
EXIT_GATE: consent FAIL_CLOSED 미증명 시 POST-005 착수 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### POST-003

```yaml
ID: POST-003
TITLE: Signup/Deposit Attribution Hooks
STATUS: PENDING
SOURCE_PLAN: "06_infra(marketing-signup-deposit-hooks) -> Track G(g-growth-003)"
SOURCE_TODO_IDS:
  - marketing-signup-deposit-hooks
  - g-growth-003
ORIGINAL_INTENT: 가입/첫입금 순간 attribution을 1회만 확정 반영한다.
CURRENT_SCOPE: signupStageA → user_attributions merge. first USDT deposit → first_deposit_at 1회 + Purchase enqueue 1회. DB txn+unique index 또는 SELECT FOR UPDATE.
DEPENDENCIES:
  - POST-001
IMPLEMENTATION_STEPS:
  - signup hook
  - first-deposit hook
  - dedup 계약 실제 DB 적용
  - POST-001 fixture 재실행
VERIFY: "verify:attribution-chain 회귀"
ACCEPTANCE: 실 이벤트가 fixture와 동일 dedup
EVIDENCE: services/api-nest attribution hooks
EXIT_GATE: hooks가 fixture와 다르면 POST-004/005 착수 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: true
```

### POST-004

```yaml
ID: POST-004
TITLE: CAPI Metrics Spec (METRICS.md SSOT)
STATUS: PENDING
SOURCE_PLAN: "06_infra(marketing-capi-metrics-spec) -> Track G(g-growth-004)"
SOURCE_TODO_IDS:
  - marketing-capi-metrics-spec
  - g-growth-004
ORIGINAL_INTENT: 플랫폼별 지표를 단일 %로 뭉개지 않고 필드 단위 SSOT를 만든다.
CURRENT_SCOPE: "services/marketing-attribution/METRICS.md + verify:capi-config. placeholder secret 패턴 금지."
DEPENDENCIES: N/A
IMPLEMENTATION_STEPS:
  - "3사 공식 API 필드명 확정"
  - METRICS.md 작성
  - .env.example 동기
  - "verify:capi-config"
VERIFY: "verify:capi-config (PR CI always)"
ACCEPTANCE: "필드명 1:1. placeholder 0"
EVIDENCE: services/marketing-attribution/METRICS.md
EXIT_GATE: METRICS.md 없이 POST-005 착수 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-005

```yaml
ID: POST-005
TITLE: CAPI Dispatcher Wire (Meta/TikTok/Google)
STATUS: PENDING
SOURCE_PLAN: "06_infra(marketing-capi-dispatcher-wire) -> Track G(g-growth-005)"
SOURCE_TODO_IDS:
  - marketing-capi-dispatcher-wire
  - g-growth-005
ORIGINAL_INTENT: 서버사이드 전송을 구현하되 DEFAULT_DENY egress로 돈/PII가 새지 않게 한다.
CURRENT_SCOPE: workers/marketing-capi-dispatcher adapter 3종 + event_id dedup + PII SHA256 + custom_data allowlist + delivery state 머신.
DEPENDENCIES:
  - POST-003
  - POST-004
IMPLEMENTATION_STEPS:
  - adapter 3종
  - egress allowlist 필터
  - delivery state 머신
  - retry/backoff
  - staging capi-smoke
VERIFY: "verify:capi-consent + verify:capi-smoke (staging only)"
ACCEPTANCE: allowlist 외 전송 0. consent 후에만 전송. staging 1건 성공
EVIDENCE: workers/marketing-capi-dispatcher/**
EXIT_GATE: DEFAULT_DENY 위반 시 POST-006 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-006

```yaml
ID: POST-006
TITLE: Admin ROAS Health Display
STATUS: PENDING
SOURCE_PLAN: "06_infra(marketing-admin-roas-health) -> Track G(g-growth-006)"
SOURCE_TODO_IDS:
  - marketing-admin-roas-health
  - g-growth-006
ORIGINAL_INTENT: Worker 실시간 지표와 48h 리포트를 동급으로 나란히 두지 않는다.
CURRENT_SCOPE: /admin 돈줄 하단 Worker 실시간 default + 48h 리포트는 접힌 섹션. token 노출 0.
DEPENDENCIES:
  - POST-005
IMPLEMENTATION_STEPS:
  - Admin 위젯
  - Worker read API
  - "48h 대조 탭 분리"
  - secret 표시 0 검증
VERIFY: "verify:admin-growth-tabs 확장"
ACCEPTANCE: 두 시계열이 한 카드 동급 배치 0. token 0
EVIDENCE: apps/admin/app/admin/growth/**
EXIT_GATE: N/A
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-007

```yaml
ID: POST-007
TITLE: SEO Foundation (sitemap/robots/JSON-LD)
STATUS: PENDING
SOURCE_PLAN: "06_infra(marketing-seo-sitemap-jsonld) -> Track G(g-growth-007)"
SOURCE_TODO_IDS:
  - marketing-seo-sitemap-jsonld
  - g-growth-007
ORIGINAL_INTENT: 정직한 metadata. 가짜 aggregateRating 금지. /ads /l/* 는 crawlable+noindex.
CURRENT_SCOPE: sitemap.ts+robots.ts+JSON-LD(Organization+WebSite, 퍼뜩)+LandingOperatorFooter. programmatic SEO는 배제.
DEPENDENCIES: N/A
IMPLEMENTATION_STEPS:
  - sitemap/robots
  - JSON-LD
  - operator footer
  - noindex 메타 검증
VERIFY: "verify:seo-schema + verify:operator-footer"
ACCEPTANCE: 가짜 rating 0. /ads·/l/* crawlable+noindex
EVIDENCE: apps/web/app/sitemap.ts, robots.ts
EXIT_GATE: N/A
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-008

```yaml
ID: POST-008
TITLE: Ads Provider Onboarding (Meta/TikTok/Google)
STATUS: PENDING
SOURCE_PLAN: "06_infra(ads-provider-onboarding) -> Track G(g-growth-008)"
SOURCE_TODO_IDS:
  - ads-provider-onboarding
  - g-growth-008
ORIGINAL_INTENT: 공식 Ads API write SoT를 확정하고 계정 연결은 사람이 한다.
CURRENT_SCOPE: "3사 onboarding. OAuth/계정연결=HIGH+HUMAN. production live=HUMAN. Kakao user OAuth·CAPI와 혼동 금지."
DEPENDENCIES:
  - POST-005
  - POST-007
IMPLEMENTATION_STEPS:
  - 각 사 공식 API 문서 재확인
  - provider capability matrix
  - HUMAN 계정 연결
  - adapter 정규화(raw status 미노출)
VERIFY: "verify:ads-provider-capability (신설)"
ACCEPTANCE: "3사 READY. Agent가 production secret 보유 0"
EVIDENCE: workers/ads-provider-adapters/** (실행 시)
EXIT_GATE: 계정 연결은 항상 HUMAN
AUTOMATION_LEVEL: A1
PROTECTED_SCOPE_MUTATION: false
```

### POST-009

```yaml
ID: POST-009
TITLE: Ads Budget Standing Authorization
STATUS: PENDING
SOURCE_PLAN: "06_infra(ads-budget-standing-authorization) -> Track G(g-growth-009)"
SOURCE_TODO_IDS:
  - ads-budget-standing-authorization
  - g-growth-009
ORIGINAL_INTENT: Founder가 승인한 deterministic 범위 안에서만 반복 운영한다. Agent가 한도를 올리지 못한다.
CURRENT_SCOPE: daily/monthly cap, allowed channels, Budget Guardrail deterministic DENY.
DEPENDENCIES:
  - POST-008
IMPLEMENTATION_STEPS:
  - schemas/ads-standing-authorization.v1.json
  - services/ads-budget-guardrail
  - versioned 계약+audit
  - Admin PUT API (HIGH+HUMAN+3-mode)
VERIFY: "verify:ads-standing-authorization + verify:ads-budget-guardrail"
ACCEPTANCE: 한도초과 deterministic DENY. Agent cap UPDATE 불가
EVIDENCE: services/ads-budget-guardrail/**
EXIT_GATE: Standing Authorization 변경은 HIGH+HUMAN+3-mode
AUTOMATION_LEVEL: A1
PROTECTED_SCOPE_MUTATION: false
```

### POST-010

```yaml
ID: POST-010
TITLE: Ads Campaign Orchestrator
STATUS: PENDING
SOURCE_PLAN: "06_infra(ads-campaign-orchestrator) -> Track G(g-growth-010)"
SOURCE_TODO_IDS:
  - ads-campaign-orchestrator
  - g-growth-010
ORIGINAL_INTENT: 광고 집행과 CAPI 측정을 소유권 분리한다.
CURRENT_SCOPE: Candidate→…→ACTIVE AND-gate. Emergency Stop은 3사 pause. CAPI 중단 0. 새 message axis 금지.
DEPENDENCIES:
  - POST-009
IMPLEMENTATION_STEPS:
  - lifecycle state machine
  - AND-gate
  - recommend/mutate API 분리
  - Emergency Stop
VERIFY: "verify:ads-orchestrator-boundary"
ACCEPTANCE: AND-gate 1 FAIL → ACTIVE 0. Emergency stop이 CAPI를 멈추지 않음
EVIDENCE: services/ads-orchestrator/**
EXIT_GATE: 새 message axis는 HIGH+HUMAN
AUTOMATION_LEVEL: A1
PROTECTED_SCOPE_MUTATION: false
```

### POST-011

```yaml
ID: POST-011
TITLE: Cursor Autonomous Ops Enablement
STATUS: PENDING
SOURCE_PLAN: "06_infra(cursor-autonomous-ops-enablement) -> Track G(g-growth-011)"
SOURCE_TODO_IDS:
  - cursor-autonomous-ops-enablement
  - g-growth-011
ORIGINAL_INTENT: 운영 이슈를 자율 감시하되 production deploy 자동화는 확대하지 않는다.
CURRENT_SCOPE: OpsEvent→Automation→Cloud Agent→Parent→readonly Subagent. production deploy token 0. 지금 이 Master 실행 중에 enable 하지 않음.
DEPENDENCIES:
  - REL-016
  - REL-506
  - POST-010
IMPLEMENTATION_STEPS:
  - OpsEvent 소비 Automation
  - Cloud Agent+Parent+readonly Subagent
  - Skill scaffold 5종
  - Founder-normalization 표시
VERIFY: N/A (enablement는 운영 정책, Skill별 개별 검증)
ACCEPTANCE: production deploy 여전히 HUMAN. Subagent가 File-Serial status 변경 불가
EVIDENCE: .cursor/skills/**, .cursor/agents/** (실행 시, 지금 생성 0)
EXIT_GATE: 본 task 착수 전 live token enable 0
AUTOMATION_LEVEL: A1
PROTECTED_SCOPE_MUTATION: false
```

### POST-012

```yaml
ID: POST-012
TITLE: Ads Autonomous Ops Release Certification
STATUS: PENDING
SOURCE_PLAN: "06_infra(ads-autonomous-ops-release-certification) -> Track G(g-growth-012)"
SOURCE_TODO_IDS:
  - ads-autonomous-ops-release-certification
  - g-growth-012
ORIGINAL_INTENT: 퍼뜩의 최종 자동운영 출시 준비 완료는 이 인증만 발급한다. REL-506으로 대체 금지.
CURRENT_SCOPE: Provider READY, Standing Auth, Guardrail, Emergency Stop, ownership 분리, audit, secret 0, HUMAN deploy 유지.
DEPENDENCIES:
  - POST-008
  - POST-009
  - POST-010
  - POST-011
IMPLEMENTATION_STEPS:
  - "19개 검증항목 fixture"
  - "verify:ads-autonomous-ops-release"
  - known P0-P3 0
  - 인증서 발급
VERIFY: "verify:ads-autonomous-ops-release"
ACCEPTANCE: "19개 항목 PASS"
EVIDENCE: governance/ads-autonomous-ops/RELEASE_CERTIFICATION.md
EXIT_GATE: 본 인증 전 자동운영 완료 문구 금지
AUTOMATION_LEVEL: A1
PROTECTED_SCOPE_MUTATION: false
```

### POST-013

```yaml
ID: POST-013
TITLE: Growth Missions Admin
STATUS: PENDING
SOURCE_PLAN: "04_admin(admin-growth-missions) -> Track D(d-admin-009)"
SOURCE_TODO_IDS:
  - admin-growth-missions
  - d-admin-009
ORIGINAL_INTENT: 미션 카탈로그를 관리하되 유저별 수동 지급 경로를 만들지 않는다.
CURRENT_SCOPE: /admin/growth?tab=missions D/M/W/S catalog+budget+releaseHold+accrualHalt+queued_pool. 수동지급 UI 0.
DEPENDENCIES: N/A
IMPLEMENTATION_STEPS:
  - 카탈로그 UI
  - accrual halt 토글
  - queued_pool 큐 UI
  - 수동지급 경로 0 검증
VERIFY: "verify:mission-no-manual-grant"
ACCEPTANCE: per-user 지급 버튼 0. halt가 신규 accrual을 막음
EVIDENCE: apps/admin/app/admin/growth/missions
EXIT_GATE: N/A
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-014

```yaml
ID: POST-014
TITLE: Growth Partners Admin
STATUS: PENDING
SOURCE_PLAN: "04_admin(admin-growth-partners) -> Track D(d-admin-010)"
SOURCE_TODO_IDS:
  - admin-growth-partners
  - d-admin-010
ORIGINAL_INTENT: 협력사 순서/ON-OFF를 통제하되 로고는 manifest 밖 교체 불가.
CURRENT_SCOPE: /admin/growth?tab=partners Tier-A 순서+ON/OFF+audit. 로고=manifest only.
DEPENDENCIES: N/A
IMPLEMENTATION_STEPS:
  - 순서 편집 UI
  - ON/OFF+audit
  - manifest 외 업로드 경로 0
VERIFY: "verify:market-partner-trust + verify:admin-growth-tabs"
ACCEPTANCE: 순서 동기. 임의 업로드 0
EVIDENCE: apps/admin/app/admin/growth/partners
EXIT_GATE: N/A
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-015

```yaml
ID: POST-015
TITLE: Product Analytics (D1/D7 + 퍼널)
STATUS: PENDING
SOURCE_PLAN: "04_admin(product-analytics) -> Track D(d-admin-015)"
SOURCE_TODO_IDS:
  - product-analytics
  - d-admin-015
ORIGINAL_INTENT: 리텐션/퍼널을 운영자가 본다. CAPI로 PII raw를 보내지 않는다.
CURRENT_SCOPE: D1/D7 retention, first_deposit→2nd participate 퍼널, safe_stop, adapter match failure → Admin 위젯.
DEPENDENCIES: N/A
IMPLEMENTATION_STEPS:
  - OTel 계측
  - 리텐션 집계
  - Admin 위젯
  - PII raw 전송 0 검증
VERIFY: analytics 위젯 스냅샷 테스트
ACCEPTANCE: D1/D7이 user.events와 일치. CAPI PII raw 0
EVIDENCE: admin 리텐션 위젯
EXIT_GATE: N/A
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-016

```yaml
ID: POST-016
TITLE: Admin Isolated Deploy (Ops Worker 분리)
STATUS: PENDING
SOURCE_PLAN: "04_admin(admin-isolated-deploy) -> Track D(d-admin-017)"
SOURCE_TODO_IDS:
  - admin-isolated-deploy
  - d-admin-017
ORIGINAL_INTENT: 유저 PWA와 Admin Ops를 도메인·배포·인증·WAF까지 분리한다.
CURRENT_SCOPE: 별도 OpenNext Ops Worker + ops domain + Admin JWT issuer 분리 + IP allowlist + noindex. origin=infra/domain.manifest.json openNext.ops.
DEPENDENCIES: N/A
IMPLEMENTATION_STEPS:
  - infra/ops wrangler + access-policy
  - Admin JWT issuer 분리
  - IP allowlist
  - robots noindex
VERIFY: "verify:no-admin-in-web + verify:ops-robots-noindex"
ACCEPTANCE: web에 /admin 0. 유저 JWT로 admin API 403
EVIDENCE: infra/ops/**
EXIT_GATE: N/A
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-017

```yaml
ID: POST-017
TITLE: Store Bridge Scaffold (TWA/Play AAB/Uptodown APK, v2)
STATUS: PENDING
SOURCE_PLAN: "05_pwa(store-bridge-scaffold) -> Track E(e-pwa-005)"
SOURCE_TODO_IDS:
  - store-bridge-scaffold
  - e-pwa-005
ORIGINAL_INTENT: Day-1 PWA가 끝난 뒤에만 네이티브 스토어 배포를 시작한다.
CURRENT_SCOPE: TWA+assetlinks, Play AAB + Uptodown APK/XAPK 동일 패키지·서명, Capacitor iOS shell.
DEPENDENCIES:
  - REL-023
IMPLEMENTATION_STEPS:
  - TWA 생성
  - assetlinks.json 서빙
  - AAB+APK 동시 산출
  - Capacitor iOS shell scaffold
VERIFY: "verify:assetlinks"
ACCEPTANCE: package↔SHA-256 일치. TWA 주소창 미노출
EVIDENCE: apps/web/public/.well-known/assetlinks.json
EXIT_GATE: REL-023 미완료 착수 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-018

```yaml
ID: POST-018
TITLE: Uptodown Developers Console Listing (v2)
STATUS: PENDING
SOURCE_PLAN: "05_pwa(store-bridge-uptodown-listing) -> Track E(e-pwa-006)"
SOURCE_TODO_IDS:
  - store-bridge-uptodown-listing
  - e-pwa-006
ORIGINAL_INTENT: Uptodown 심사 거절을 피하려면 listing 기준을 사전에 충족한다.
CURRENT_SCOPE: Organization+listing 필드+Country Restriction+VirusTotal+Submit for review.
DEPENDENCIES:
  - POST-017
IMPLEMENTATION_STEPS:
  - Console 가입
  - listing 필드 작성(카피=UI SSOT)
  - VirusTotal 스캔
  - Submit for review
VERIFY: "verify:store-uptodown-listing"
ACCEPTANCE: 체크리스트 전항목 충족
EVIDENCE: N/A (외부 Console, 문서로만 기록)
EXIT_GATE: N/A
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

### POST-019

```yaml
ID: POST-019
TITLE: Runtime P1 Adapter Ingest Host Binding
STATUS: PENDING
SOURCE_PLAN: "06_infra(phase1-adapter-ingest-host-binding) -> Track F(f-rel-004)"
SOURCE_TODO_IDS:
  - phase1-adapter-ingest-host-binding
  - f-rel-004
ORIGINAL_INTENT: Runtime P1 전환 때 쓸 host binding을 미리 정의한다. 지금 활성화하지 않는다.
CURRENT_SCOPE: NEST_ADAPTER_INGEST_URL=API_HOST/api/v1/internal/adapters/ingest 고정. phase-activation.mdc Runtime P1 승인 전 시작 0.
DEPENDENCIES: N/A
IMPLEMENTATION_STEPS:
  - Runtime P1 활성화 승인 확인 (없으면 STOP)
  - prod secret 재등록
  - NEST_ADAPTER_INGEST_URL 전환
  - ebay-adapter tick→ingest E2E
VERIFY: 기존 adapter ingest 회귀
ACCEPTANCE: prod URL로 tick이 ingest에 도달
EVIDENCE: workers/ebay-adapter, api-nest internal ingest
EXIT_GATE: Runtime P1 승인 전 이 task 시작 금지
AUTOMATION_LEVEL: A3
PROTECTED_SCOPE_MUTATION: false
```

## 6. EXECUTION ORDER (TOP → BOTTOM, immutable)

001. PRE-LOCK-001
002. REL-000
003. REL-001
004. REL-002
005. REL-003
006. REL-004
007. REL-005
008. REL-006
009. REL-007
010. REL-008
011. REL-009
012. REL-010
013. REL-011
014. REL-012
015. REL-013
016. REL-014
017. REL-015
018. REL-016
019. REL-017
020. REL-018
021. REL-019
022. REL-020
023. REL-021
024. REL-022
025. REL-023
026. REL-100
027. REL-101
028. REL-102
029. REL-103
030. REL-104
031. REL-105
032. REL-106
033. REL-107
034. REL-108
035. REL-109
036. REL-110
037. REL-111
038. REL-112
039. REL-113
040. REL-114
041. REL-115
042. REL-116
043. REL-117
044. REL-118
045. REL-119
046. REL-120
047. REL-121
048. REL-122
049. REL-123
050. REL-124
051. REL-125
052. REL-126
053. REL-127
054. REL-128
055. REL-129
056. REL-130
057. REL-131
058. REL-200
059. REL-201
060. REL-202
061. REL-203
062. REL-204
063. REL-205
064. REL-206
065. REL-207
066. REL-208
067. REL-209
068. REL-210
069. REL-211
070. REL-212
071. REL-216
072. REL-217
073. REL-218
074. REL-219
075. REL-220
076. REL-221
077. REL-300
078. REL-301
079. REL-302
080. REL-303
081. REL-304
082. REL-305
083. REL-215
084. REL-400
085. REL-213
086. REL-214
087. REL-401
088. REL-402
089. REL-403
090. REL-404
091. REL-405
092. REL-406
093. REL-407
094. REL-408
095. REL-222
096. REL-223
097. REL-224
098. REL-409
099. REL-500
100. REL-501
101. REL-502
102. REL-503
103. REL-504
104. REL-505
105. REL-506
106. REL-507
107. REL-600
108. REL-601
109. REL-602
110. REL-603
111. REL-700
112. REL-701-PRE
113. REL-701-DB
114. REL-701
115. REL-702
116. REL-703
117. REL-704
118. POST-001
119. POST-002
120. POST-003
121. POST-004
122. POST-005
123. POST-006
124. POST-007
125. POST-008
126. POST-009
127. POST-010
128. POST-011
129. POST-012
130. POST-013
131. POST-014
132. POST-015
133. POST-016
134. POST-017
135. POST-018
136. POST-019

## 7. SELF-VALIDATOR (materialization)

실제 파일 재파싱 결과 (`.cursor/tmp/_validate_release_master.mjs`):

```text
MASTER_FILE_EXISTS = TRUE
PLAN_LOCKED = TRUE
BLOCKING_ON = []
PRE_LOCK_COUNT = 1
REL_COUNT = 116
POST_COUNT = 19
MASTER_TODO_COUNT = 136
FRONTMATTER_TODO_COUNT = 136
REL_000_EXISTS = TRUE
REL_131_EXISTS = TRUE
POST_019_EXISTS = TRUE

MISSING_TASK_DEFINITION = 0
POINTER_ONLY_EXECUTION_TASK = 0
DUPLICATE_TODO_ID = 0
DEPENDENCY_CYCLE = 0
DEPENDENCY_ORDER_ERROR = 0
STALE_CURRENT_STATE_STATEMENT = 0
ISOLATION_POLICY_CONFLICT = 0

CURRENT_EXECUTION_SSOT = .cursor/plans/PUTDUK_RELEASE_MASTER.plan.md
CURRENT_EXECUTION_SSOT_VERIFIED = TRUE
FIRST_EXECUTION_TODO_AT_MATERIALIZATION = REL-000
```

REL-000은 2026-08-20에 PASS/COMPLETED.
REL-001은 2026-08-20에 PASS/COMPLETED (`preserve/2026-08-20-worktree-rescue` · `ae8d1e6` · merge 금지).
REL-002는 2026-08-21에 PASS/COMPLETED (PR #2 MERGED · `db6db87` · ruleset `verify-gate` 계약 수정 후 비우회 merge).
현재 실행 포인터는 헤더의 `FIRST_EXECUTION_TODO = REL-003`. 이 채팅에서 REL-003 실행 0.

