# PR222 + PR223 로컬 통합 증거 (머지 금지)

기존 worktree C:/Users/PC/Desktop/AI_PROFIT_OS_CONTRACT_P0 (fix/customer-web-contract-p0 @ 0fa38d77) 는 수정하지 않았다.

임시 트리: _worktree-pr222-223-int/ (gitignore _worktree-*/) · 로컬 브랜치 _p6-int-222-223 · upstream 해제 · push 0

## 입력 SHA

| 역할 | SHA |
|---|---|
| origin/main (fetch 후) | `c4ebcd870557c74f214735bfc9e6c4dac37aaeac` |
| PR 222 head | `0fa38d77a4a461ae1b20eb81d7f5a2380a9fbaf3` |
| PR 223 HEAD (증거 시점) | `03211e64242ecdcc14ab9b95ba0db9d044a57564` |

## git 실행

1. git worktree add -b _p6-int-222-223 _worktree-pr222-223-int origin/main -> HEAD c4ebcd87 PASS
2. git merge --no-ff 0fa38d77 -> merge commit ffc711ea7146d8a4c48416d078efbfca054fc0df PASS (ort)
3. git merge --no-ff 03211e64 -> CONFLICT · no merge commit
4. neither side applied; git merge --abort -> worktree HEAD back to ffc711ea (main+222 only)

## 충돌 (3)

모두 modify/delete. PR222 수정, PR223 삭제. git 는 PR222 blob 을 남기려 했으나 abort 로 어느 쪽도 채택하지 않았다.

| 경로 | 종류 |
|---|---|
| `packages/sdk/src/auth/auth-release.test.ts` | modify/delete |
| `packages/sdk/src/auth/fetch.ts` | modify/delete |
| `packages/sdk/src/auth/types.ts` | modify/delete |

자동 병합(수동 선택 0): .gitignore · tooling/verify/user-ledger-query.cjs · tooling/verify/backend/auth/auth-flows.cjs

main...222 vs main...223 경로 겹침 5: .gitignore · SDK 3 · user-ledger-query.cjs. 증거는 겹침 0여부가 아니라 위 실행 결과다.

## 검증 실행

| 명령 | 트리 | 결과 | 근거 |
|---|---|---|---|
| frozen install | 3-way | NOT_RUN | no 3-way tree (abort) |
| frozen install | main+222 ffc711ea | NOT_RUN | BLOCKED_LOCAL_ENVIRONMENT · pnpm lowspec:status free 0.53 GB CRITICAL · second node_modules forbidden |
| repository-boundary.cjs | 3-way | NOT_RUN | conflict abort |
| repository-boundary.cjs | main+222 | NOT_RUN | script absent on that tree (added in 223) · MODULE_NOT_FOUND |
| typecheck | 3-way / main+222 | NOT_RUN | no install |
| unit | 3-way / main+222 | NOT_RUN | no install |
| pnpm verify:backend | 3-way / main+222 | NOT_RUN | no install |
| migration static | 3-way / main+222 | NOT_RUN | no install · remote DB forbidden |
| cargo test | - | NOT_RUN | forbidden |
| pnpm verify:backend | PR223 03211e64 | PASS | 48 tests after residual-26 close |
| pnpm verify:backend-boundary | PR223 | PASS 0 violations | sharp warning 1 (wrangler-miniflare) |
| ownership-graph --check | PR223 | unknown=0 drift=0 | KEEP 1376 |
| verify:gate:fast | PR223 commit hook | PASS | 96bacfb4 25 steps · 03211e64 4 steps |

NOT_RUN 을 PASS 로 쓰지 않는다.

## 다음

SDK 삭제 vs 수정은 여기서 해결하지 않는다. 운영 배포 0. 운영 DB 0.

## 2026-09-12 follow-up

- This session HEAD `3b5feeb09fda81f3fa0609a57cd3c70305eb2df3`. PR #222 branch was not checked out and PR222 files were not overwritten.
- 3-way merge NOT_RUN this session. Recorded conflict remains packages/sdk/src/auth/{auth-release.test.ts,fetch.ts,types.ts}.
- MERGED = NO.
