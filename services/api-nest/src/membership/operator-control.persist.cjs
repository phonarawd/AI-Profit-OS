/**
 * 등급 일일 정책·추가 기회 영속 경로.
 * 스키마 preflight 실패·DB 부재에서는 쓰기를 허용하지 않는다.
 * 운영 DB 적용은 이 파일이 하지 않는다 (draft SQL 만).
 */

"use strict";

const path = require("path");
const membership = require(path.join(
  __dirname,
  "..",
  "..",
  "..",
  "market-intelligence",
  "src",
  "membership.cjs",
));
const grade = require("./grade-daily-policy.core.cjs");
const bonus = require("./bonus-match-grant.core.cjs");

const GRADE_COLS = [
  "revision",
  "caps",
  "reason",
  "updated_by_admin_id",
  "created_at",
];
const BONUS_COLS = [
  "grant_id",
  "user_id",
  "amount",
  "used",
  "reclaimed",
  "status",
  "reason",
  "updated_by_admin_id",
  "idempotency_key",
];
const AUDIT_COLS = [
  "action",
  "target_type",
  "target_id",
  "before_json",
  "after_json",
  "reason",
  "admin_id",
];
const PRESENTATION_COLS = [
  "revision",
  "profile",
  "reason",
  "updated_by_admin_id",
  "created_at",
];

const SQL = Object.freeze({
  schemaPreflight: `
SELECT
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'membership_grade_daily_policy') AS grade_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'membership_grade_daily_policy'
      AND column_name = ANY($1::text[])) AS grade_cols,
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'member_bonus_match_grants') AS bonus_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'member_bonus_match_grants'
      AND column_name = ANY($2::text[])) AS bonus_cols,
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'operator_control_audit') AS audit_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'operator_control_audit'
      AND column_name = ANY($3::text[])) AS audit_cols,
  (SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'journey_presentation_profile') AS presentation_table,
  (SELECT COUNT(*)::int FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'journey_presentation_profile'
      AND column_name = ANY($4::text[])) AS presentation_cols
`.trim(),
  latestGrade: `
SELECT revision, caps, reason, updated_by_admin_id::text, created_at
  FROM public.membership_grade_daily_policy
 ORDER BY revision DESC
 LIMIT 1`.trim(),
  insertGrade: `
INSERT INTO public.membership_grade_daily_policy
  (revision, caps, reason, updated_by_admin_id)
VALUES ($1, $2::jsonb, $3, $4::uuid)`.trim(),
  bonusByIdempotency: `
SELECT grant_id, user_id::text, amount, used, reclaimed, status, reason,
       updated_by_admin_id::text, idempotency_key, created_at
  FROM public.member_bonus_match_grants
 WHERE idempotency_key = $1`.trim(),
  listBonus: `
SELECT grant_id, user_id::text, amount, used, reclaimed, status, reason,
       updated_by_admin_id::text, idempotency_key, created_at
  FROM public.member_bonus_match_grants
 WHERE user_id = $1::uuid
 ORDER BY created_at ASC`.trim(),
  insertBonus: `
INSERT INTO public.member_bonus_match_grants
  (grant_id, user_id, amount, used, reclaimed, status, reason,
   updated_by_admin_id, idempotency_key)
VALUES ($1, $2::uuid, $3, 0, 0, 'active', $4, $5::uuid, $6)`.trim(),
  lockBonus: `
SELECT grant_id, user_id::text, amount, used, reclaimed, status
  FROM public.member_bonus_match_grants
 WHERE user_id = $1::uuid AND status = 'active'
 ORDER BY created_at ASC
 FOR UPDATE`.trim(),
  updateBonusUsed: `
UPDATE public.member_bonus_match_grants
   SET used = $2, status = $3
 WHERE grant_id = $1
   AND used = $4
   AND used + reclaimed + $5 <= amount`.trim(),
  updateBonusReclaim: `
UPDATE public.member_bonus_match_grants
   SET reclaimed = $2, status = $3
 WHERE grant_id = $1
   AND reclaimed = $4
   AND used + reclaimed + $5 <= amount`.trim(),
  latestPresentation: `
SELECT revision, profile, reason, updated_by_admin_id::text, created_at
  FROM public.journey_presentation_profile
 ORDER BY revision DESC
 LIMIT 1`.trim(),
  insertPresentation: `
INSERT INTO public.journey_presentation_profile
  (revision, profile, reason, updated_by_admin_id)
VALUES ($1, $2::jsonb, $3, $4::uuid)`.trim(),
  insertAudit: `
INSERT INTO public.operator_control_audit
  (action, target_type, target_id, before_json, after_json, reason, admin_id, request_id)
VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::uuid, $8)`.trim(),
});

function storeUnreadyError(detail) {
  const err = new Error("operator control store is not ready");
  err.code = "STORE_UNREADY";
  err.applied = false;
  err.storeStatus = "unready";
  err.detail = detail || "schema_unready";
  return err;
}

function evaluateSchemaPreflight(row) {
  const r = row || {};
  const gradeReady = Number(r.grade_table) >= 1 && Number(r.grade_cols) >= GRADE_COLS.length;
  const bonusReady = Number(r.bonus_table) >= 1 && Number(r.bonus_cols) >= BONUS_COLS.length;
  const auditReady = Number(r.audit_table) >= 1 && Number(r.audit_cols) >= AUDIT_COLS.length;
  const presentationReady =
    Number(r.presentation_table) >= 1 &&
    Number(r.presentation_cols) >= PRESENTATION_COLS.length;
  const ready = gradeReady && bonusReady && auditReady;
  return {
    ready,
    gradeReady,
    bonusReady,
    auditReady,
    presentationReady,
    code: ready ? "READY" : "STORE_UNREADY",
    persistence: ready ? "runtime_persist" : "schema_unready",
    applied: false,
  };
}

async function preflightOperatorControlSchema(db) {
  if (!db || typeof db.query !== "function") {
    return {
      ready: false,
      gradeReady: false,
      bonusReady: false,
      auditReady: false,
      presentationReady: false,
      code: "STORE_UNREADY",
      reason: "db_missing",
      persistence: "schema_unready",
    };
  }
  try {
    const r = await db.query(SQL.schemaPreflight, [
      GRADE_COLS,
      BONUS_COLS,
      AUDIT_COLS,
      PRESENTATION_COLS,
    ]);
    const row = r && r.rows && r.rows[0];
    if (!row) {
      return evaluateSchemaPreflight(null);
    }
    return evaluateSchemaPreflight(row);
  } catch {
    return {
      ready: false,
      gradeReady: false,
      bonusReady: false,
      auditReady: false,
      presentationReady: false,
      code: "STORE_UNREADY",
      reason: "preflight_failed",
      queryFailed: true,
      persistence: "schema_unready",
    };
  }
}

async function requireReady(db, feature, opts) {
  if (opts && opts.skipPreflight === true && opts.preflight) {
    return opts.preflight;
  }
  const pre = await preflightOperatorControlSchema(db);
  if (feature === "grade" && (pre.gradeReady !== true || pre.auditReady !== true)) {
    throw storeUnreadyError("grade");
  }
  if (feature === "bonus" && (pre.bonusReady !== true || pre.auditReady !== true)) {
    throw storeUnreadyError("bonus");
  }
  if (feature === "presentation" && (pre.presentationReady !== true || pre.auditReady !== true)) {
    throw storeUnreadyError("presentation");
  }
  if (!feature && pre.ready !== true) {
    throw storeUnreadyError("all");
  }
  return pre;
}

async function withTx(db, fn) {
  if (db && typeof db.withTransaction === "function") {
    return db.withTransaction(fn);
  }
  return fn(db);
}

function compiledCaps() {
  return grade.cloneDefaults();
}

async function listGradeDailyPolicy(db, opts) {
  const pre = await preflightOperatorControlSchema(db);
  if (pre.gradeReady !== true) {
    return {
      caps: compiledCaps(),
      compiledDefaults: compiledCaps(),
      newSignupDailyMatchCap: membership.NEW_SIGNUP_DAILY_MATCH_CAP,
      revision: 0,
      history: [],
      timezone: membership.QUOTA_DAY_TIMEZONE,
      existingMemberBackfill: false,
      persistence: "compiled_default_schema_unready",
      schemaReady: false,
      storeStatus: "unready",
    };
  }
  const r = await db.query(SQL.latestGrade);
  const row = r.rows[0];
  if (!row) {
    return {
      caps: compiledCaps(),
      compiledDefaults: compiledCaps(),
      newSignupDailyMatchCap: membership.NEW_SIGNUP_DAILY_MATCH_CAP,
      revision: 0,
      history: [],
      timezone: membership.QUOTA_DAY_TIMEZONE,
      existingMemberBackfill: false,
      persistence: "compiled_default",
      schemaReady: true,
      storeStatus: "ready",
    };
  }
  const caps =
    typeof row.caps === "string" ? JSON.parse(row.caps) : { ...compiledCaps(), ...row.caps };
  return {
    caps,
    compiledDefaults: compiledCaps(),
    newSignupDailyMatchCap: membership.NEW_SIGNUP_DAILY_MATCH_CAP,
    revision: Number(row.revision),
    history: [],
    timezone: membership.QUOTA_DAY_TIMEZONE,
    existingMemberBackfill: false,
    persistence: "runtime_persist",
    schemaReady: true,
    storeStatus: "ready",
  };
}

async function applyGradeDailyCapChange(db, input) {
  await requireReady(db, "grade");
  return withTx(db, async (client) => {
    const listed = await listGradeDailyPolicy(client, { skipPreflight: true });
    const store = grade.createGradeDailyPolicyStore({
      revision: listed.revision,
      caps: listed.caps,
    });
    const applied = grade.applyGradeDailyCapChange(store, input);
    await client.query(SQL.insertGrade, [
      applied.revision,
      JSON.stringify(store.caps),
      input.reason,
      input.updatedByAdminId,
    ]);
    await client.query(SQL.insertAudit, [
      "admin.membership.grade_daily_cap.updated",
      "grade_daily_policy",
      applied.grade,
      JSON.stringify({ caps: listed.caps, revision: listed.revision }),
      JSON.stringify({ caps: store.caps, revision: applied.revision }),
      String(input.reason),
      input.updatedByAdminId,
      input.idempotencyKey || null,
    ]);
    return {
      ...applied,
      persistence: "runtime_persist",
      schemaReady: true,
      storeStatus: "ready",
      applied: true,
      ledgerMutated: false,
    };
  });
}

async function restoreGradeDailyDefaults(db, input) {
  await requireReady(db, "grade");
  return withTx(db, async (client) => {
    const listed = await listGradeDailyPolicy(client, { skipPreflight: true });
    const store = grade.createGradeDailyPolicyStore({
      revision: listed.revision,
      caps: listed.caps,
    });
    const restored = grade.restoreGradeDailyDefaults(store, input);
    await client.query(SQL.insertGrade, [
      restored.revision,
      JSON.stringify(store.caps),
      input.reason,
      input.updatedByAdminId,
    ]);
    await client.query(SQL.insertAudit, [
      "admin.membership.grade_daily_cap.restored",
      "grade_daily_policy",
      "all",
      JSON.stringify({ caps: listed.caps, revision: listed.revision }),
      JSON.stringify({ caps: store.caps, revision: restored.revision }),
      String(input.reason),
      input.updatedByAdminId,
      null,
    ]);
    return {
      ...restored,
      persistence: "runtime_persist",
      schemaReady: true,
      storeStatus: "ready",
      applied: true,
      ledgerMutated: false,
    };
  });
}

function mapGrantRow(row) {
  return {
    grantId: row.grant_id,
    userId: row.user_id,
    amount: Number(row.amount),
    used: Number(row.used),
    reclaimed: Number(row.reclaimed),
    status: row.status,
    reason: row.reason,
    updatedByAdminId: row.updated_by_admin_id,
    idempotencyKey: row.idempotency_key,
    at: row.created_at,
    expiresAt: null,
    expiryPolicy: "unspecified_not_activated",
    carryOver: false,
  };
}

async function grantBonusMatches(db, input) {
  await requireReady(db, "bonus");
  const validated = bonus.grantBonusMatches(bonus.createBonusGrantStore(), input);
  return withTx(db, async (client) => {
    const existing = await client.query(SQL.bonusByIdempotency, [input.idempotencyKey]);
    if (existing.rows[0]) {
      return {
        grant: mapGrantRow(existing.rows[0]),
        replay: true,
        ledgerMutated: false,
        persistence: "runtime_persist",
        schemaReady: true,
        storeStatus: "ready",
        applied: true,
      };
    }
    const grant = {
      ...validated.grant,
      grantId: `bmg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    };
    await client.query(SQL.insertBonus, [
      grant.grantId,
      input.userId,
      grant.amount,
      input.reason,
      input.updatedByAdminId,
      input.idempotencyKey,
    ]);
    await client.query(SQL.insertAudit, [
      "admin.user.membership.bonus_grant",
      "bonus_grant",
      grant.grantId,
      null,
      JSON.stringify(grant),
      String(input.reason),
      input.updatedByAdminId,
      input.idempotencyKey,
    ]);
    return {
      grant,
      replay: false,
      ledgerMutated: false,
      persistence: "runtime_persist",
      schemaReady: true,
      storeStatus: "ready",
      applied: true,
    };
  });
}

async function listBonusGrants(db, userId, opts) {
  const pre = await preflightOperatorControlSchema(db);
  if (pre.bonusReady !== true) {
    return {
      userId,
      grants: [],
      remaining: { granted: 0, used: 0, reclaimed: 0, remaining: 0, grants: [] },
      persistence: "schema_unready",
      schemaReady: false,
      storeStatus: "unready",
    };
  }
  const r = await db.query(SQL.listBonus, [userId]);
  const grants = r.rows.map(mapGrantRow);
  const remaining = bonus.projectBonusRemaining(
    { grants, byIdempotency: Object.create(null) },
    userId,
  );
  return {
    userId,
    grants,
    remaining,
    persistence: "runtime_persist",
    schemaReady: true,
    storeStatus: "ready",
  };
}

async function projectBonusRemaining(db, userId, opts) {
  const listed = await listBonusGrants(db, userId, opts);
  return listed.remaining;
}

async function reclaimUnusedBonus(db, input) {
  await requireReady(db, "bonus");
  return withTx(db, async (client) => {
    const locked = await client.query(SQL.lockBonus, [input.userId]);
    const store = {
      grants: locked.rows.map((row) => ({
        grantId: row.grant_id,
        userId: row.user_id,
        amount: Number(row.amount),
        used: Number(row.used),
        reclaimed: Number(row.reclaimed),
        status: row.status,
      })),
      byIdempotency: Object.create(null),
      nextSeq: 1,
    };
    const result = bonus.reclaimUnusedBonus(store, input);
    for (const t of result.touched) {
      const g = store.grants.find((x) => x.grantId === t.grantId);
      if (!g) continue;
      const before = locked.rows.find((x) => x.grant_id === t.grantId);
      const upd = await client.query(SQL.updateBonusReclaim, [
        t.grantId,
        g.reclaimed,
        g.status,
        Number(before.reclaimed),
        t.take,
      ]);
      if (!upd.rowCount) {
        const err = new Error("bonus reclaim conflict");
        err.code = "REVISION_CONFLICT";
        throw err;
      }
    }
    await client.query(SQL.insertAudit, [
      "admin.user.membership.bonus_reclaim",
      "bonus_grant",
      input.userId,
      JSON.stringify({ remainingBefore: result.remaining + result.reclaimed }),
      JSON.stringify({ remaining: result.remaining, reclaimed: result.reclaimed }),
      String(input.reason),
      input.updatedByAdminId || input.userId,
      input.idempotencyKey || null,
    ]);
    return {
      ...result,
      persistence: "runtime_persist",
      schemaReady: true,
      storeStatus: "ready",
      applied: true,
    };
  });
}

/**
 * 같은 TX 안에서 추가 기회 1회 소비. 실 Postgres FOR UPDATE 동시성은 별도 BLOCKED.
 */
async function consumeBonusInTx(client, input) {
  const amount = membership.readExplicitNonNegativeInt(input.amount);
  if (amount === null || amount < 1) {
    return { consumed: 0, touched: [], durable: true };
  }
  const pre = await preflightOperatorControlSchema(client);
  if (pre.bonusReady !== true) {
    throw storeUnreadyError("bonus_consume");
  }
  const locked = await client.query(SQL.lockBonus, [input.userId]);
  let left = amount;
  const touched = [];
  for (const row of locked.rows) {
    const avail = Number(row.amount) - Number(row.used) - Number(row.reclaimed);
    if (avail <= 0) continue;
    const take = Math.min(avail, left);
    const nextUsed = Number(row.used) + take;
    const nextStatus =
      nextUsed + Number(row.reclaimed) >= Number(row.amount) ? "consumed" : "active";
    const upd = await client.query(SQL.updateBonusUsed, [
      row.grant_id,
      nextUsed,
      nextStatus,
      Number(row.used),
      take,
    ]);
    if (!upd.rowCount) {
      const err = new Error("bonus consume conflict");
      err.code = "DAILY_MATCH_CAP";
      throw err;
    }
    touched.push({ grantId: row.grant_id, take, remaining: avail - take });
    left -= take;
    if (left <= 0) break;
  }
  if (left > 0) {
    const err = new Error("bonus remaining exhausted under lock");
    err.code = "DAILY_MATCH_CAP";
    throw err;
  }
  return { consumed: amount, touched, durable: true, realDbLock: "CODE_ONLY_UNPROVEN" };
}

async function applyPresentationProfile(db, input) {
  await requireReady(db, "presentation");
  const present = require("./presentation-profile.core.cjs");
  const profile = present.validatePresentationProfile(input.profile);
  return withTx(db, async (client) => {
    const cur = await client.query(SQL.latestPresentation);
    const beforeRev = cur.rows[0] ? Number(cur.rows[0].revision) : 0;
    if (input.expectedRevision != null && Number(input.expectedRevision) !== beforeRev) {
      const err = new Error("presentation revision conflict");
      err.code = "REVISION_CONFLICT";
      throw err;
    }
    const nextRev = beforeRev + 1;
    await client.query(SQL.insertPresentation, [
      nextRev,
      JSON.stringify(profile),
      input.reason,
      input.updatedByAdminId,
    ]);
    await client.query(SQL.insertAudit, [
      "admin.membership.presentation_profile.updated",
      "presentation_profile",
      profile.profileId,
      cur.rows[0] ? JSON.stringify(cur.rows[0].profile) : null,
      JSON.stringify(profile),
      String(input.reason),
      input.updatedByAdminId,
      input.idempotencyKey || null,
    ]);
    return {
      profile,
      revision: nextRev,
      persistence: "runtime_persist",
      schemaReady: true,
      storeStatus: "ready",
      applied: true,
      schemaApplied: true,
      operatorSecondsApplied: true,
      operatorTimeSettingsComplete: true,
      compiledV19IsNotOperatorComplete: false,
      ledgerMutated: false,
      moneyUntouched: true,
      capUntouched: true,
      gradeUntouched: true,
      engineDeadlineUntouched: true,
      resultUntouched: true,
    };
  });
}

async function listPresentationProfile(db) {
  const present = require("./presentation-profile.core.cjs");
  const pre = await preflightOperatorControlSchema(db);
  const compiled = present.validatePresentationProfile(present.V19_DEFAULTS);
  const schemaApplied = pre.presentationReady === true;
  if (schemaApplied !== true) {
    return {
      profile: compiled,
      revision: 0,
      persistence: "compiled_v19_schema_unready",
      schemaReady: false,
      schemaApplied: false,
      storeStatus: "unready",
      operatorSecondsApplied: false,
      operatorTimeSettingsComplete: false,
      compiledV19IsNotOperatorComplete: true,
      applied: false,
    };
  }
  const r = await db.query(SQL.latestPresentation);
  if (!r.rows[0]) {
    return {
      profile: compiled,
      revision: 0,
      persistence: "compiled_v19",
      schemaReady: true,
      schemaApplied: true,
      storeStatus: "ready",
      operatorSecondsApplied: false,
      operatorTimeSettingsComplete: false,
      compiledV19IsNotOperatorComplete: true,
      applied: false,
    };
  }
  const raw =
    typeof r.rows[0].profile === "string"
      ? JSON.parse(r.rows[0].profile)
      : r.rows[0].profile;
  if (present.isFiveStepDraft(raw)) {
    return {
      profile: compiled,
      revision: Number(r.rows[0].revision),
      persistence: "compiled_v19_five_step_ignored",
      schemaReady: true,
      schemaApplied: true,
      storeStatus: "ready",
      operatorSecondsApplied: false,
      operatorTimeSettingsComplete: false,
      compiledV19IsNotOperatorComplete: true,
      fiveStepDraftIgnored: true,
      applied: false,
    };
  }
  return {
    profile: present.validatePresentationProfile(raw),
    revision: Number(r.rows[0].revision),
    persistence: "runtime_persist",
    schemaReady: true,
    schemaApplied: true,
    storeStatus: "ready",
    operatorSecondsApplied: true,
    operatorTimeSettingsComplete: true,
    compiledV19IsNotOperatorComplete: false,
    applied: true,
  };
}

/**
 * 격리 테스트용 fake querier. 런타임 AppModule 이 호출하지 않는다.
 */
function createFakePersistDb(opts) {
  const ready = opts && opts.schemaReady === true;
  const presentationReady = opts && opts.presentationReady === true;
  const state = {
    schemaReady: ready,
    presentationReady,
    gradeRows: Array.isArray(opts && opts.gradeRows) ? opts.gradeRows.slice() : [],
    grants: Array.isArray(opts && opts.grants) ? opts.grants.slice() : [],
    presentationRows: Array.isArray(opts && opts.presentationRows)
      ? opts.presentationRows.slice()
      : [],
    audits: [],
  };

  function readyRow() {
    return {
      grade_table: state.schemaReady ? 1 : 0,
      grade_cols: state.schemaReady ? GRADE_COLS.length : 0,
      bonus_table: state.schemaReady ? 1 : 0,
      bonus_cols: state.schemaReady ? BONUS_COLS.length : 0,
      audit_table: state.schemaReady ? 1 : 0,
      audit_cols: state.schemaReady ? AUDIT_COLS.length : 0,
      presentation_table: state.presentationReady ? 1 : 0,
      presentation_cols: state.presentationReady ? PRESENTATION_COLS.length : 0,
    };
  }

  const db = {
    state,
    async query(text, params) {
      const sql = String(text);
      if (sql.includes("information_schema")) {
        return { rows: [readyRow()], rowCount: 1 };
      }
      if (sql.includes("FROM public.membership_grade_daily_policy") && sql.includes("ORDER BY revision DESC")) {
        const last = state.gradeRows[state.gradeRows.length - 1];
        return { rows: last ? [last] : [], rowCount: last ? 1 : 0 };
      }
      if (sql.includes("INSERT INTO public.membership_grade_daily_policy")) {
        const row = {
          revision: params[0],
          caps: typeof params[1] === "string" ? JSON.parse(params[1]) : params[1],
          reason: params[2],
          updated_by_admin_id: params[3],
        };
        state.gradeRows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes("FROM public.member_bonus_match_grants") && sql.includes("FOR UPDATE")) {
        const rows = state.grants.filter(
          (g) => g.user_id === params[0] && g.status === "active",
        );
        return { rows, rowCount: rows.length };
      }
      if (sql.includes("WHERE idempotency_key")) {
        const hit = state.grants.find((g) => g.idempotency_key === params[0]);
        return { rows: hit ? [hit] : [], rowCount: hit ? 1 : 0 };
      }
      if (sql.includes("FROM public.member_bonus_match_grants") && sql.includes("WHERE user_id")) {
        const rows = state.grants.filter((g) => g.user_id === params[0]);
        return { rows, rowCount: rows.length };
      }
      if (sql.includes("INSERT INTO public.member_bonus_match_grants")) {
        const row = {
          grant_id: params[0],
          user_id: params[1],
          amount: params[2],
          used: 0,
          reclaimed: 0,
          status: "active",
          reason: params[3],
          updated_by_admin_id: params[4],
          idempotency_key: params[5],
          created_at: new Date().toISOString(),
        };
        state.grants.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes("UPDATE public.member_bonus_match_grants") && sql.includes("used =")) {
        const g = state.grants.find((x) => x.grant_id === params[0] && Number(x.used) === Number(params[3]));
        if (!g) return { rows: [], rowCount: 0 };
        g.used = params[1];
        g.status = params[2];
        return { rows: [g], rowCount: 1 };
      }
      if (sql.includes("UPDATE public.member_bonus_match_grants") && sql.includes("reclaimed =")) {
        const g = state.grants.find(
          (x) => x.grant_id === params[0] && Number(x.reclaimed) === Number(params[3]),
        );
        if (!g) return { rows: [], rowCount: 0 };
        g.reclaimed = params[1];
        g.status = params[2];
        return { rows: [g], rowCount: 1 };
      }
      if (sql.includes("FROM public.journey_presentation_profile")) {
        const last = state.presentationRows[state.presentationRows.length - 1];
        return { rows: last ? [last] : [], rowCount: last ? 1 : 0 };
      }
      if (sql.includes("INSERT INTO public.journey_presentation_profile")) {
        const row = {
          revision: params[0],
          profile: typeof params[1] === "string" ? JSON.parse(params[1]) : params[1],
          reason: params[2],
          updated_by_admin_id: params[3],
        };
        state.presentationRows.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (sql.includes("INSERT INTO public.operator_control_audit")) {
        state.audits.push({
          action: params[0],
          target_type: params[1],
          target_id: params[2],
          before_json: params[3],
          after_json: params[4],
          reason: params[5],
          admin_id: params[6],
          request_id: params[7],
        });
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    async withTransaction(fn) {
      return fn(db);
    },
  };
  return db;
}

module.exports = {
  SQL,
  GRADE_COLS,
  BONUS_COLS,
  AUDIT_COLS,
  PRESENTATION_COLS,
  evaluateSchemaPreflight,
  preflightOperatorControlSchema,
  listGradeDailyPolicy,
  applyGradeDailyCapChange,
  restoreGradeDailyDefaults,
  grantBonusMatches,
  listBonusGrants,
  projectBonusRemaining,
  reclaimUnusedBonus,
  consumeBonusInTx,
  applyPresentationProfile,
  listPresentationProfile,
  createFakePersistDb,
  storeUnreadyError,
};
