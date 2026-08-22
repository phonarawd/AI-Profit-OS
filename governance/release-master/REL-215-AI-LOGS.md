# REL-215 — /admin/ai-logs

STATUS: PASS
DATE: 2026-08-22
OWNER: existing `AiLogsAdminService` + `public.ai_logs` + `ai-log.cjs`
RUNTIME_QA: NOT_RUN

## Implemented

- `apps/admin/app/admin/ai-logs/page.tsx` wires `GET /api/v1/admin/ai-logs`
- pick/eval/coach tabs read existing owners only (`ai-pick/recent`, `ai-logs/eval/status`, `ai-logs/coach`)
- spotcheck has no committed queue owner → honest `기록 없음`
- loading / unauthorized / unavailable / empty
- Admin projection `toAdminAiLogsView` reuses `sanitizeTurnText` and drops fact payloads
- no invented accuracy/success/hallucination metrics
- no eval-run / score POST / retry / replay

## Verify

- `pnpm verify:rel-215-admin-ai-logs`
- EXIT_GATE: user JWT 200 = 0 (`AdminGuard` + `admin-guard.selftest` user JWT → 401)

## Negative

- USER_JWT_ADMIN_200 = 0
- FAKE_AI_LOG = 0
- FAKE_AI_METRIC = 0
- RAW_API_KEY_EXPOSURE = 0
- RAW_TOKEN_EXPOSURE = 0
- RAW_AUTH_HEADER_EXPOSURE = 0
- RAW_COOKIE_EXPOSURE = 0
- RAW_CREDENTIAL_EXPOSURE = 0
- SECOND_AI_LOG_OWNER_CREATED = 0
- AI_LOG_BECAME_DOMAIN_AUTHORITY = 0
