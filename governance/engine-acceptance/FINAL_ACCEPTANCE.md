# REL-502 FINAL ENGINE ACCEPTANCE

이 문서는 REL-004 sanity 와 별도다. REL-004 로 대체 금지.

```text
REL = REL-502
TITLE = FINAL ENGINE ACCEPTANCE
STATUS = NOT_ISSUED
CERT_ISSUED = 0
REL-004_SUBSTITUTE = 0
QA9_PREDECESSOR_VERDICT_AS_CURRENT = 0
PSM_REL_PENDING = 0
POST_PSM_PENDING = 3
PROTECTED_SCOPE_DRIFT = 1
REBASE_REQUIRED = 1
REBASE_APPLIED = 0
ACK_RECEIVED = 0
LOCAL_QA0_QA9_RERUN = 0
EVAL_DATASET_STATUS = MATCH
QA1_QA8_STATUS = STALE_PENDING_REBASE
QA9_STATUS = STALE_PENDING_REBASE
QA9_VERDICT = NOT_CURRENT
DEFECTS_P0 = 0
DEFECTS_P1 = 0
CRITICAL_INVARIANT_BLOCKED = 0
NEXT = ENGINE_ACCEPTANCE_REBASE_V1
BASELINE_ID = ea-baseline-0d8825e8f333-5ac0f4291966
PREDECESSOR_BASELINE_ID = ea-baseline-74683b6e39a7-590263f0f273
REBASE_ID = pending
LIVE_AGGREGATE = bf784d90b71eeef6da11eac97c07a4a45be3baa3f1bea6f6b42e803b9677814a
BASELINE_AGGREGATE = 5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9
PATH_COUNT_LIVE = 513
PATH_COUNT_BASELINE = 491
CHANGED_PATHS = 43
ADDED_PATHS = 22
MUTATED_PATHS = 21
MISSING_PATHS = 0
EXIT_GATE = D1-S1F (2026-09-05) · S1F Founder 프로덕션 출시 지시서에 따른 classic-signup/session-rotation/turnstile/rate-limit/admin-users 신설(commit f2812062) + frontend(440fc2ed) + CodeQL clock.core.cjs 구조적 재작성(commit 7f9baf0a) + verify wiring(eb4737f8) + client refresh retry(d6023f16) + reuse-detection tests(0a9bf4ea) + PUTDUK continuation session(2026-09-06)의 settlement/safe-stop claim-before-post race 수정(commit f29a8e06) + participate lock/trade 단일 트랜잭션화(commit 876d93cd) + durable server-side reconcile-tick(commit c05cf24c)가 REBASE 없이 protected-scope 를 추가 변경(22 added · 21 mutated) · ENGINE_ACCEPTANCE_REBASE_V1 ACK 후 current-epoch QA0-QA9 재실행 전까지 ISSUED 금지
```

## 판정 (D1-S1E 정정, 2026-09-05, append 성격의 사실 정정)

**이전 기재(STATUS=ISSUED · PROTECTED_SCOPE_DRIFT=0)는 STALE이었다.** `ea-baseline-0d8825e8f333-5ac0f4291966`
rebase(2026-09-02) 이후, 같은 D1 감사 라인리지의 커밋 `a1d5c151`(CodeQL js/regex/missing-regexp-anchor
알림 51/52 수정 — `services/api-nest/clock.core.cjs`의 `DB_URL_DENY` 정규식에 `\b` 경계 추가)이
protected-scope root `services/api-nest`를 다시 변경했다. 이 사실은 D1-S1D 세션이 이미
`tooling/engine-acceptance/protected-scope-watch.cjs` 실행으로 발견해 기록했으나(`correctionEvent_D1S1D_02_codeqlProgressAndNewDefect`),
이 인증서 문서 자체는 정정되지 않은 채 `STATUS=ISSUED`로 남아 있었다. 이번 교정은 그 모순을
`git-safety.mdc`/본 태스크의 fail-closed 원칙에 따라 해소한다: hash를 몰래 맞추거나 rebase를
위조하지 않고, **문서가 스스로의 진짜 상태(NOT_ISSUED)를 다시 말하게** 만든다.

Human/PO 승인 ACK는 `product-rebases.v1.json`에 원문 그대로 보존되어 있으며,
그 마지막 승인된 product commit `ec3c9604d2ab7bb40338e45131a052f9b058b2c3`의 protected-scope 변경은
predecessor baseline `ea-baseline-74683b6e39a7-590263f0f273`에서
current baseline `ea-baseline-0d8825e8f333-5ac0f4291966`로 formal rebase되었다. **이 부분은 history로
보존되며 지우지 않는다.** 다만 그 baseline은 `a1d5c151` 이후 더 이상 live 상태와 일치하지 않는다.

live protected aggregate `7b46b6b27a89d0c36f3c9cf4acdcd545da93eae938602af83c3c86510773a4a1`는
baseline aggregate `5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9`와 다르다
(변경 경로 1개, 추가 0 · 변경 1 · 누락 0):

변경 경로 (1):
- services/api-nest/clock.core.cjs

이 변경은 `DB_URL_DENY` 정규식에 단어 경계(`\b`)를 추가한 CodeQL 보안 수정이며,
`tooling/verify/regression/clock-core-db-url-deny.regression.cjs`와 `verify:domain-clock`(35개 체크)으로
독립 검증되었다. 하지만 protected-scope 정책은 변경의 **크기**가 아니라 **root 자체 변경 여부**로
drift를 판정하므로, 이 1-line 수정도 formal `ENGINE_ACCEPTANCE_REBASE_V1` ACK + current-epoch
QA0-QA9 재실행 없이는 인증을 current-authoritative로 유지할 수 없다.

은폐 금지 · `STATUS = NOT_ISSUED` · `CERT_ISSUED = 0` · `PROTECTED_SCOPE_DRIFT = 1` · `REBASE_REQUIRED = 1`.

재발급 조건: Human/PO `ENGINE_ACCEPTANCE_REBASE_V1` ACK → rebase apply → current-epoch
QA1-QA8 COMPLETE(QA7은 실제 GitHub Actions run evidence 필요) → QA9 `ENGINE_ACCEPTED_FOR_UI` →
그때만 인증서 재발급(ISSUED). 이 세션은 그 ACK를 대리 작성하지 않았고, QA0-QA9를 로컬에서
가짜로 재실행하지 않았으며, baseline/aggregate 숫자를 발급 조건에 맞춰 역산하지 않았다 — 위
LIVE_AGGREGATE 값은 현재 HEAD에서 `governance/engine-acceptance/protected-scope.v1.json` 정의를
그대로 재계산한 실측값이다 (evidence: `_audit-d0-20260904/session-1e-correction/logs/d1s1e-rel502-diagnosis.log`).

Local fake QA0-QA9 PASS = 0. REL-004 대체 = 0.
Predecessor QA9 verdict current-authoritative 사용 = 0.
Product mutation을 green 추적에 사용하지 않았다.
이 인증은 Production migration apply, Production deploy, secret rotation 또는 Production 운영 변경 승인을 의미하지 않는다.

별도 사실: 이 세션은 `.cursor/plans/PUTDUK_RELEASE_MASTER.plan.md`의 REL-502 plan 항목 STATUS는
편집하지 않았다(현재도 `COMPLETED`로 기재되어 있다 — `tooling/verify/lib/rel-502-psm.cjs`의
`plan502Done=true`). 그 결과 `verify:rel-502-final-engine-acceptance`는 이 정정 이후에도
"REL-502 cannot be COMPLETED until current-epoch QA0-QA9 PASS" 사유로 계속 FAIL한다 — 이것은
이 정정이 만들어낸 새 결함이 아니라, 이미 있던 진짜 drift가 이제 정확히 하나의 원인으로 드러난
것이다. plan의 REL-502 STATUS를 되돌릴지는 release-phase 권한을 가진 Founder/PO의 결정이며,
이 세션은 그 결정을 대신하지 않는다.

## 판정 (S1F 정정, 2026-09-05, append 성격의 사실 정정)

D1-S1E 정정 이후, 같은 세션(S1F Founder 프로덕션 출시 지시서)이 `services/api-nest` protected-scope
root를 다시, 그리고 훨씬 크게 변경했다. 이 정정은 그 사실을 은폐하거나 STATUS를 조작하지 않고
LIVE_AGGREGATE/PATH_COUNT_LIVE/CHANGED_PATHS/ADDED_PATHS/MUTATED_PATHS만 현재 HEAD의 실측값으로
갱신한다. STATUS/CERT_ISSUED/PROTECTED_SCOPE_DRIFT/REBASE_REQUIRED는 이미 정확했으므로(모두
drift=진짜 상태를 가리킴) 변경하지 않는다 — D1-S1E가 이미 NOT_ISSUED로 정정해 두었기 때문에,
이번 추가 drift는 새 결함을 만든 것이 아니라 기존에 열려 있던 같은 GAP을 더 정확한 숫자로
다시 진술하는 것이다.

live protected aggregate `d6f82920868925538cb2ed471815050510e3d503dd4fb360e4ebcc496b4980b6`는
baseline aggregate `5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9`와 다르다
(추가 17 · 변경 16 · 누락 0, 총 33 경로). 재계산은 `tooling/verify/lib/rel-502-psm.cjs`의
`compareProtectedScope()`를 그대로 호출한 실측값이며 hash를 손으로 만들지 않았다. (이 값은 이
correction 작성 중 두 번 더 바뀌었다 - `users-admin.service.ts`의 CodeQL
incomplete-string-escaping 구조적 수정, 그리고 `auth.controller.ts`/`pwned-password.service.ts`에
governance/security/CODEQL_LEDGER.md §3.5를 가리키는 CodeQL 리뷰 주석 추가. 두 경우 모두
이미 33개 목록에 있던 파일의 content hash만 갱신됐을 뿐 경로 수·목록은 그대로다.)

추가된 경로 (17):
- services/api-nest/src/auth/classic-signup.policy.ts
- services/api-nest/src/auth/classic-signup.service.ts
- services/api-nest/src/auth/find-id.service.ts
- services/api-nest/src/auth/password-auth.service.ts
- services/api-nest/src/auth/password-hash.ts
- services/api-nest/src/auth/password-reset.service.ts
- services/api-nest/src/auth/pwned-password.local-blocklist.ts
- services/api-nest/src/auth/pwned-password.service.ts
- services/api-nest/src/auth/session-cookies.ts
- services/api-nest/src/auth/session-rotation.reuse.selftest.ts
- services/api-nest/src/auth/session-rotation.service.ts
- services/api-nest/src/common/turnstile.guard.ts
- services/api-nest/src/common/turnstile.service.ts
- services/api-nest/src/users/users-admin.module.ts
- services/api-nest/src/users/users-admin.service.ts
- services/api-nest/src/users/users.admin.controller.ts
- supabase/migrations/20260905110000_classic_signup_sessions_and_admin.sql

변경된 경로 (16):
- services/api-nest/auth-rate-limit.cjs
- services/api-nest/clock.core.cjs (CodeQL #80/81 구조적 재작성, commit 7f9baf0a — D1-S1E가 이미
  기록한 \b-anchor 수정과는 다른, 이후의 별도 변경)
- services/api-nest/src/app.module.ts
- services/api-nest/src/auth/auth-rate-limit.guard.ts
- services/api-nest/src/auth/auth.controller.ts
- services/api-nest/src/auth/auth.module.ts
- services/api-nest/src/auth/auth.routes.ts
- services/api-nest/src/auth/auth.service.ts
- services/api-nest/src/auth/identity-proof.selftest.ts
- services/api-nest/src/auth/identity-proof.store.ts
- services/api-nest/src/auth/jwt-auth.guard.ts
- services/api-nest/src/auth/magic-link.service.ts
- services/api-nest/src/common/admin-capabilities.ts
- services/api-nest/src/config/phase0.env.ts
- services/api-nest/src/main.ts
- services/api-nest/src/wallet/resend-email.provider.ts

이 변경들은 S1F 지시서 Section 3~11(일반 회원가입/세션 rotation/Turnstile/분산 rate limit/관리자
회원목록)의 실제 구현이며, 각각 domain verify(`identity-proof.selftest` 43/43 ·
`admin-guard.selftest` 25/25 · `auth-session-rotation-reuse` 7/7 · `domain-clock` 등)로 독립
검증됐다 — 하지만 REL-502 protected-scope 정책은 개별 변경의 검증 여부가 아니라 root 자체
변경 여부로 drift를 판정하므로, formal `ENGINE_ACCEPTANCE_REBASE_V1` ACK + current-epoch QA0-QA9
재실행 없이는 계속 NOT_ISSUED다.

은폐 금지 · STATUS = NOT_ISSUED (불변) · CERT_ISSUED = 0 (불변) · PROTECTED_SCOPE_DRIFT = 1 (불변).
이 세션은 ACK를 대리 작성하지 않았고, QA0-QA9를 로컬에서 가짜로 재실행하지 않았으며, 숫자를
발급 조건에 맞춰 역산하지 않았다. `ev.qa.ready`는 현재 `true`(current-epoch QA1-9 evidence
존재)이지만 `ev.scope.drift`가 `true`인 한 `canIssue`는 계속 `false`다 — QA 준비 상태와 무관하게
protected-scope drift 단독으로 발급을 막는다.

## 판정 (PUTDUK continuation session 정정, 2026-09-06, append 성격의 사실 정정)

S1F 정정 이후, 같은 D1 감사 branch의 후속 세션(Founder의 PUTDUK 실제 운영 출시 연속 실행 프롬프트,
Step 7.2)이 `services/api-nest` protected-scope root를 두 곳 더 변경했다:

- `services/api-nest/src/trades/trades.execution.service.ts` (MUTATED) — finalizeMatchSuccess/
  finalizeSafeStop가 journal을 status-guarded claim UPDATE 이전에 무조건 post하던 순서를
  뒤집었다. 두 동시 execute-tick 호출이 같은 running 거래에서 서로 다른 terminal 결과를 판단하면
  claim에 실패한 쪽도 journal(settlement 또는 participate_unlock)을 post해 원금이 이중으로
  움직일 수 있었던 real race를 닫는 구조적 수정이다.
- `services/api-nest/src/trades/trades.execution.race.selftest.ts` (ADDED) — 그 수정의 회귀
  스위트(FakeTradeDb/FakePostingService · 7 케이스). 수정 전 코드로 되돌려(git stash) 같은 스위트를
  재실행해 실제로 FAIL하는지, 수정 코드로는 ALL PASS하는지 둘 다 확인했다
  (`tooling/verify/trades-execution-race.runtime.cjs`).

이 정정은 그 사실을 은폐하거나 STATUS를 조작하지 않고 LIVE_AGGREGATE/PATH_COUNT_LIVE/
CHANGED_PATHS/ADDED_PATHS/MUTATED_PATHS만 현재 HEAD의 실측값으로 갱신한다. STATUS/CERT_ISSUED/
PROTECTED_SCOPE_DRIFT/REBASE_REQUIRED는 이미 정확했으므로(모두 drift=true 상태를 가리킴)
변경하지 않는다 — 이미 NOT_ISSUED로 정정되어 있었기 때문에, 이번 추가 drift도 새 결함을 만든
것이 아니라 기존에 열려 있던 같은 GAP을 더 정확한 숫자로 다시 진술하는 것이다.

live protected aggregate `cb6d0ebabf8a7a22bde1e316b86613fa3fd82e1ff3960096289a7e143d9ceacb`는
baseline aggregate `5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9`와 다르다
(추가 18 · 변경 17 · 누락 0, 총 35 경로 — S1F 정정 시점의 33개 경로에 위 두 경로가 더해진 값).
재계산은 `tooling/verify/lib/rel-502-psm.cjs`의 `compareProtectedScope()`를 그대로 호출한
실측값이며 hash를 손으로 만들지 않았다.

이 세션이 검토했지만 protected-scope 밖이라 이 목록에 없는 변경(참고용, 은폐 아님): 관리자
회원목록 배선(`apps/admin/**`), 세션 refresh 멀티탭 조정(`apps/web/lib/session-refresh-fetch.ts`),
classic-signup migration의 constraint 재실행 안전성 수정(`supabase/migrations/**`) —
`protected-scope.v1.json`이 정의하는 root가 `services/api-nest` 계열에 한정되어 있어 이 파일들의
변경은 REL-502 drift 판정에 들어가지 않는다.

은폐 금지 · STATUS = NOT_ISSUED (불변) · CERT_ISSUED = 0 (불변) · PROTECTED_SCOPE_DRIFT = 1 (불변).
이 세션은 ACK를 대리 작성하지 않았고, QA0-QA9를 로컬에서 가짜로 재실행하지 않았으며, 숫자를
발급 조건에 맞춰 역산하지 않았다.

## 판정 (PUTDUK continuation session 2차 정정, 2026-09-06, append 성격의 사실 정정)

같은 continuation 세션이 Step 7.1(원금 잠금 원자성)을 마무리하며 `services/api-nest`
protected-scope root를 세 곳 더 변경했다 (commit `876d93cd5081854e80fd8bfc7a5e5c47006eebc2`):

- `services/api-nest/src/ledger/ledger.posting.service.ts` (MUTATED) — `postJournal`의 트랜잭션
  본문을 `postJournalCore`로 추출(기존 호출자 10곳 동작 무변경)하고, 호출자가 이미 열어 둔
  트랜잭션에 참여하는 `postJournalInTransaction` + `drainOutboxAfterCommit`을 신설했다.
- `services/api-nest/src/opportunities/participate.service.ts` (MUTATED) — `insertAccepted()`가
  lock journal과 trade_executions/participate_requests 생성을 하나의 `withTransaction`으로 묶어,
  트랜잭션 중간 실패 시 lock journal도 함께 롤백되도록 했다(이전에는 lock journal이 별도로 먼저
  커밋되어 실패 시 원금이 locked에 고아로 남을 수 있었다).
- `services/api-nest/src/opportunities/participate.atomicity.selftest.ts` (ADDED) — 그 수정의
  회귀 스위트(FakePostgresService가 실제 커밋/롤백 semantics를 모델링 · 4 케이스).

이 정정은 그 사실을 은폐하거나 STATUS를 조작하지 않고 LIVE_AGGREGATE/PATH_COUNT_LIVE/
CHANGED_PATHS/ADDED_PATHS/MUTATED_PATHS만 현재 HEAD의 실측값으로 갱신한다. STATUS/CERT_ISSUED/
PROTECTED_SCOPE_DRIFT/REBASE_REQUIRED는 변경하지 않는다(계속 drift=true를 가리킴).

live protected aggregate `5345e74b37ddbd5aff0e294e556e9561554dd606fd2a95bda22db6fef7837e61`는
baseline aggregate `5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9`와 다르다
(추가 19 · 변경 19 · 누락 0, 총 38 경로 — 직전 정정의 35개 경로에 위 세 경로가 더해진 값).
재계산은 `tooling/verify/lib/rel-502-psm.cjs`의 `compareProtectedScope()`를 그대로 호출한
실측값이며 hash를 손으로 만들지 않았다.

은폐 금지 · STATUS = NOT_ISSUED (불변) · CERT_ISSUED = 0 (불변) · PROTECTED_SCOPE_DRIFT = 1 (불변).
이 세션은 ACK를 대리 작성하지 않았고, QA0-QA9를 로컬에서 가짜로 재실행하지 않았으며, 숫자를
발급 조건에 맞춰 역산하지 않았다.

## 판정 (PUTDUK continuation session 3차 정정, 2026-09-06, append 성격의 사실 정정)

같은 continuation 세션이 Step 7.3(서버측 durable 종결)을 마무리하며 `services/api-nest`
protected-scope root를 다섯 곳 더 변경했다 (commit `c05cf24c518bbd364d304a96c87d9141b5057e4c`):

- `services/api-nest/src/trades/trades.admin.controller.ts` (ADDED) — `POST /api/v1/admin/
  trades/reconcile-tick` (AdminGuard · capability `circuit:write` · audit-logged).
- `services/api-nest/src/trades/trades.admin.routes.ts` (ADDED) — 그 라우트 상수.
- `services/api-nest/src/trades/trades.reconcile.selftest.ts` (ADDED) — 회귀 스위트(5 케이스).
- `services/api-nest/src/trades/trades.module.ts` (MUTATED) — `TradesAdminController` +
  `AdminAuditModule` 등록.
- `services/api-nest/src/trades/index.ts` (MUTATED) — 새 export 2개.

(`services/api-nest/src/common/admin-capabilities.ts`도 이 커밋에서 함께 수정됐지만 이미
직전 목록의 MUTATED 경로였으므로 새 경로 수를 늘리지 않는다.)

이 정정은 그 사실을 은폐하거나 STATUS를 조작하지 않고 LIVE_AGGREGATE/PATH_COUNT_LIVE/
CHANGED_PATHS/ADDED_PATHS/MUTATED_PATHS만 현재 HEAD의 실측값으로 갱신한다. STATUS/CERT_ISSUED/
PROTECTED_SCOPE_DRIFT/REBASE_REQUIRED는 변경하지 않는다(계속 drift=true를 가리킴).

live protected aggregate `bf784d90b71eeef6da11eac97c07a4a45be3baa3f1bea6f6b42e803b9677814a`는
baseline aggregate `5ac0f4291966300b4e547c91aa1af172fb20b108f5d45f8612bd9b8f970c65a9`와 다르다
(추가 22 · 변경 21 · 누락 0, 총 43 경로 — 직전 정정의 38개 경로에 위 다섯 경로가 더해진 값).
재계산은 `tooling/verify/lib/rel-502-psm.cjs`의 `compareProtectedScope()`를 그대로 호출한
실측값이며 hash를 손으로 만들지 않았다.

은폐 금지 · STATUS = NOT_ISSUED (불변) · CERT_ISSUED = 0 (불변) · PROTECTED_SCOPE_DRIFT = 1 (불변).
이 세션은 ACK를 대리 작성하지 않았고, QA0-QA9를 로컬에서 가짜로 재실행하지 않았으며, 숫자를
발급 조건에 맞춰 역산하지 않았다.
