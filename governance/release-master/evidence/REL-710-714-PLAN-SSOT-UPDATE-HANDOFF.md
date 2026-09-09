# REL-710..714 - Plan SSOT update blocked, exact patch specified here

Date: 2026-09-05 (S1F session)

## Status

`.cursor/plans/PUTDUK_RELEASE_MASTER.plan.md` could not be edited this
session - 5 consecutive `StrReplace` attempts (ranging from a full 5-todo
block down to a single minimal 3-line todo) were all rejected by the editor
tooling with `Blocked: malformed hook input` before any diff was produced
(`git diff --stat` confirmed zero changes to this file after every attempt).
This is the same class of tool-level block seen elsewhere this session
(`apps/admin/app/admin/users/page.tsx`, `services/api-nest/src/auth/
auth.constants.ts`) - not a content or policy rejection, and not something
this session attempted to work around.

Per Section 12 of the S1F directive, the work actually done this session
needs new, non-duplicate successor task IDs added to this plan file,
without reopening or rewriting any historically-completed task. The exact
new content is specified below so it can be applied with a single edit
once this file is editable again.

## Patch: 5 new frontmatter todos entries

Insert after the existing `- id: rel-704` entry and before the existing
`- id: post-001` entry:

- rel-710 / status completed / CLASSIC_SIGNUP_AND_SESSION_SECURITY backend
  (username/password signup via pending_registrations, login, password
  reset, find-id, refresh-token rotation family + reuse detection, scrypt
  hashing, HIBP check, Turnstile, Upstash rate limiter) - commit f2812062.
- rel-711 / status completed / CLASSIC_SIGNUP_AND_SESSION_SECURITY frontend
  (signup/classic, verify-email, find-id, reset-password pages; Canon
  component + wire updates; magic-link consent cross-device fix completed
  end to end) - commit 440fc2ed. Korean copy for auth-classic.ts left in
  English (tool-blocked), follow-up translation only.
- rel-712 / status completed / ADMIN_WITHDRAW_REVIEW_VERIFICATION -
  re-verified the existing withdraw review controller/service/frontend
  against actual code (prior "no API" claim was false), corrected stale
  REL-206-ADMIN-WALLET.md line and a verify-script coverage gap, no
  reimplementation.
- rel-713 / status in_progress / ADMIN_MEMBERS_DIRECTORY - backend (GET
  /api/v1/admin/users list + detail, RBAC, audit) DONE in commit f2812062;
  frontend component UsersListPanel.tsx written and working (commit
  440fc2ed) but not wired into page.tsx (10 blocked edit attempts).
- rel-714 / status completed / CodeQL #80/81 structural fix per Founder's
  explicit override of a prior session's self-dismiss-adjacent judgment -
  commit 7f9baf0a.

## Patch: 5 new REL task body blocks

Insert after the closing fence of the existing REL-704 block and before
the existing POST-001 heading. Each block uses this plan's own established
YAML shape (ID/TITLE/STATUS/SOURCE_PLAN/SOURCE_TODO_IDS/ORIGINAL_INTENT/
CURRENT_SCOPE/DEPENDENCIES/IMPLEMENTATION_STEPS/VERIFY/ACCEPTANCE/EVIDENCE/
EXIT_GATE/AUTOMATION_LEVEL/PROTECTED_SCOPE_MUTATION):

1. REL-710 CLASSIC_SIGNUP_AND_SESSION_SECURITY_BACKEND - COMPLETED,
   PROTECTED_SCOPE_MUTATION true (touches services/api-nest + a new
   supabase/migrations file), evidence = commit f2812062 message, exit
   gate = the migration is Founder-approval-pending so live signup cannot
   be claimed proven until applied.
2. REL-711 CLASSIC_SIGNUP_AND_SESSION_SECURITY_FRONTEND - COMPLETED,
   PROTECTED_SCOPE_MUTATION false, evidence = commit 440fc2ed message,
   exit gate = do not claim Korean copy is done until auth-classic.ts is
   translated.
3. REL-712 ADMIN_WITHDRAW_REVIEW_VERIFICATION - COMPLETED,
   PROTECTED_SCOPE_MUTATION false, evidence = the REL-712 evidence file
   already committed this session, exit gate = a live DB-insert-based
   approve/reject rehearsal is still open (production data protection).
4. REL-713 ADMIN_MEMBERS_DIRECTORY - IN_PROGRESS, PROTECTED_SCOPE_MUTATION
   false, evidence = the REL-713 evidence file already committed this
   session (exact 3-line page.tsx diff + the updated verify script's full
   source), exit gate = do not claim the admin member list screen is done
   until page.tsx is actually wired.
5. REL-714 CODEQL_80_81_STRUCTURAL_FIX - COMPLETED,
   PROTECTED_SCOPE_MUTATION true (clock.core.cjs is inside services/
   api-nest), evidence = commit 7f9baf0a message + CODEQL_LEDGER.md, exit
   gate = remote CodeQL rescan confirmation is still pending an actual push.

The full verbatim YAML for all five blocks was drafted and is available in
this session's own transcript (the same content that failed to write to
this file directly) - re-derive it from the commit messages of f2812062,
440fc2ed, and 7f9baf0a plus the REL-712/REL-713 evidence files already
committed, all of which contain the same facts in prose form.

## Overview line and numbered index

The frontmatter overview line's task-count arithmetic (currently
"PRE-LOCK 1 + REL 117 + POST 19 = 137") becomes "PRE-LOCK 1 + REL 122 +
POST 19 = 142" once the five new REL blocks above are actually inserted
(117+5=122, 137+5=142). The Section 6 numbered index should gain entries
119-123 for REL-710..714 immediately after the existing 118 (REL-704) line,
with POST-001..019 renumbered from 119-137 to 124-142. This renumbering is
mechanical and was deliberately not attempted blind in this same blocked
session to avoid compounding one blocked edit with a second, unverified,
manually-renumbered one.

## Why this is safe to apply later

No historical STATUS: COMPLETED task is reopened, edited, or reordered by
this patch. `tooling/verify/legacy-plan-migration.cjs` and every other
verify script checked this session validate the 21-file legacy plan
registry and the workspace/home-mirror hash pair - neither parses this
plan file's own todo count, index list, or REL block count, so this
addition will not fail any automated gate by itself once applied. Run
`pnpm cursor:sync-plans` after landing the frontmatter change, per this
repo's own standing convention for any todo status change.
