# putduk-web SDK 인계 (4단계 커밋 2)

- 패키지명: `@aipo/sdk` (`private`, `version` `0.0.0`, `type` `module`)
- 복구: `git checkout 97b07908 -- packages/sdk`
- SHA 대조(putduk-web 트리 vs 이 SHA)는 6단계. 이 문서만으로 바이트 일치를 증명하지 않는다.

## exports (`packages/sdk/package.json`)

| export | 파일 |
|---|---|
| `.` | `src/index.ts` |
| `./device-tier` | `src/device-tier.ts` |
| `./execution-stream` | `src/execution-stream/index.ts` |
| `./execution-stream/useTradeExecution` | `src/execution-stream/useTradeExecution.ts` |
| `./peotteok` | `src/peotteok/index.ts` |
| `./peotteok/usePeotteokChat` | `src/peotteok/usePeotteokChat.ts` |
| `./user-feed` | `src/user-feed/index.ts` |
| `./participate` | `src/participate/index.ts` |
| `./trades` | `src/trades/index.ts` |
| `./ledger` | `src/ledger/index.ts` |
| `./wallet` | `src/wallet/index.ts` |
| `./auth` | `src/auth/index.ts` |
| `./home-money-read` | `src/home-money-read/index.ts` |
| `./home-read-model` | `src/home-read-model/index.ts` |
| `./growth` | `src/growth/index.ts` |
| `./current-fx` | `src/current-fx/index.ts` |
| `./push` | `src/push/index.ts` |

루트 `.` 재export: device-tier, execution-stream, peotteok, participate, user-feed, trades, ledger, wallet, growth. 서브패스 전용: auth, home-money-read, home-read-model, current-fx, push.

## 의존

- peer: `react` `^19.0.0`
- dev: `@types/react` `^19.1.9`, `react` `19.2.0`
- `services/**` · `workers/**` import 0 (4단계 실측). 소비자는 이미 삭제된 `apps/web` · `apps/admin` · `packages/ui`.

## 동반 삭제

- `@aipo/schemas` (`packages/schemas`) — 워크스페이스 포인터만. JSON SSOT는 루트 `schemas/`. 소비자 0. 복구: `git checkout 97b07908 -- packages/schemas`
- `tooling/verify/ledger-journal-reader.runtime.cjs` — SDK `readUserJournal` 클라 파서. 백엔드 decimal string · JWT 본인만은 `user-ledger-query.cjs`가 유지.

## 유지

- `packages/observability` — `observability.core.cjs`를 Nest `obs.exception-filter.ts` · `verify:observability` · `rel-506`이 읽는다.

Restore SHA: 97b07908
