/**
 * 카탈로그 외부 쓰기 게이트 + 운영자 행 보호 — 순수 결정.
 * writer는 잠금 후 이 결정을 같은 트랜잭션에서 재평가한다 (검사→나중에 쓰기 금지).
 *
 * 배포 순서 (운영 반영은 별 승인):
 * 1) opportunities.supply_source 마이그레이션 적용
 * 2) 이 가드가 있는 Nest 배포
 * 컬럼이 없으면 상품 쓰기 전부 차단. 게이트 OFF여도 예외 없음.
 * 정상적인 게이트 OFF + 스키마 준비 + legacy_external 만 기존 ingest/재가격을 유지한다.
 */
"use strict";

const SUPPLY_OPERATOR = "operator";
const SUPPLY_LEGACY = "legacy_external";
const GATE_ENV = "CATALOG_EXTERNAL_WRITE_GATE";

/** 상품 writer 주체. S1 호출은 전부 LEGACY_EXTERNAL. OPERATOR_CANONICAL은 S2 예약. */
const WRITER_KIND = Object.freeze({
  LEGACY_EXTERNAL: "legacy_external",
  OPERATOR_CANONICAL: "operator_canonical",
});

const REASON = Object.freeze({
  ALLOW_LEGACY: "ALLOW_LEGACY",
  ALLOW_OPERATOR_CANONICAL: "ALLOW_OPERATOR_CANONICAL",
  GATE_ON: "GATE_ON",
  GATE_UNRESOLVED: "GATE_UNRESOLVED",
  SCHEMA_UNREADY: "SCHEMA_UNREADY",
  SCHEMA_QUERY_FAILED: "SCHEMA_QUERY_FAILED",
  OPERATOR_PROTECTED: "OPERATOR_PROTECTED",
  SUPPLY_SOURCE_INVALID: "SUPPLY_SOURCE_INVALID",
  SUPPLY_SOURCE_UNREADABLE: "SUPPLY_SOURCE_UNREADABLE",
  LOCK_FAILED: "LOCK_FAILED",
  WRITER_KIND_INVALID: "WRITER_KIND_INVALID",
  LEGACY_NOT_PROMOTABLE: "LEGACY_NOT_PROMOTABLE",
  PERSIST_EXCEPTION: "PERSIST_EXCEPTION",
});


/** 잠금 순서: assets → opportunities.id ASC. 이 순서를 모든 writer가 유지한다. */
const LOCK_ORDER = Object.freeze(["assets", "opportunities"]);

const SQL = Object.freeze({
  schemaReady: `
SELECT 1 AS ok
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'opportunities'
   AND column_name = 'supply_source'
 LIMIT 1`.trim(),
  lockAsset: `
SELECT asset_id
  FROM public.assets
 WHERE asset_id = $1
 FOR UPDATE`.trim(),
  lockOpportunities: `
SELECT id::text, supply_source
  FROM public.opportunities
 WHERE asset_id = $1
 ORDER BY id ASC
 FOR UPDATE`.trim(),
  updateAssetImage: `
UPDATE public.assets SET
  image_url = $2,
  image_source = 'ebay',
  updated_at = now()
 WHERE asset_id = $1`.trim(),
  updateOpportunityImage: `
UPDATE public.opportunities SET
  asset_image_url = $2,
  asset_image_source = 'ebay',
  updated_at = now()
 WHERE asset_id = $1
   AND supply_source = 'legacy_external'`.trim(),
  updateOpportunityPricingLegacyOnly: `AND supply_source = 'legacy_external'`,
  updateOpportunityAdminImage: `
UPDATE public.opportunities SET
  asset_label = $2,
  category = $3,
  asset_image_url = $4,
  asset_image_source = $5,
  asset_image_alt_ko = $6,
  image_missing = $7,
  updated_at = now()
 WHERE asset_id = $1
   AND supply_source = 'legacy_external'
 RETURNING id, status, pricing`.trim(),
});

/**
 * @param {unknown} raw
 * @returns {{ ok: true, engaged: boolean } | { ok: false, reason: string }}
 */
function parseGate(raw) {
  if (raw == null) return { ok: true, engaged: false };
  const t = String(raw).trim().toLowerCase();
  if (t === "" || t === "off" || t === "0" || t === "false" || t === "no") {
    return { ok: true, engaged: false };
  }
  if (t === "on" || t === "1" || t === "true" || t === "yes") {
    return { ok: true, engaged: true };
  }
  return { ok: false, reason: REASON.GATE_UNRESOLVED };
}

function readGateFromEnv(env) {
  const source = env && typeof env === "object" ? env : process.env;
  return parseGate(source[GATE_ENV]);
}

/**
 * 잠금 후 읽은 공급원 목록으로 상품 쓰기 허용 여부.
 * sources === null → 행을 읽지 못함 (차단).
 * 기회 0행 + 스키마 준비 + 게이트 OFF → 기존처럼 listing persist 허용.
 *
 * @param {{
 *   gate: { ok: boolean, engaged?: boolean, reason?: string },
 *   schemaReady: boolean | null,
 *   schemaError?: boolean,
 *   sources: Array<string | null | undefined> | null,
 *   writerKind?: string,
 * }} input
 */
function decideProductWrite(input) {
  if (input.schemaError === true || input.schemaReady == null) {
    return {
      allow: false,
      reason:
        input.schemaError === true
          ? REASON.SCHEMA_QUERY_FAILED
          : REASON.SCHEMA_UNREADY,
    };
  }
  if (input.schemaReady !== true) {
    return { allow: false, reason: REASON.SCHEMA_UNREADY };
  }
  if (!input.gate || input.gate.ok !== true) {
    return { allow: false, reason: REASON.GATE_UNRESOLVED };
  }

  const writerKind = input.writerKind || WRITER_KIND.LEGACY_EXTERNAL;
  if (
    writerKind !== WRITER_KIND.LEGACY_EXTERNAL &&
    writerKind !== WRITER_KIND.OPERATOR_CANONICAL
  ) {
    return { allow: false, reason: REASON.WRITER_KIND_INVALID };
  }

  if (writerKind === WRITER_KIND.OPERATOR_CANONICAL) {
    if (input.sources == null) {
      return { allow: false, reason: REASON.SUPPLY_SOURCE_UNREADABLE };
    }
    for (const src of input.sources) {
      if (src == null || String(src).trim() === "") {
        return { allow: false, reason: REASON.SUPPLY_SOURCE_UNREADABLE };
      }
      const v = String(src).trim();
      if (v === SUPPLY_LEGACY) {
        return { allow: false, reason: REASON.LEGACY_NOT_PROMOTABLE };
      }
      if (v !== SUPPLY_OPERATOR) {
        return { allow: false, reason: REASON.SUPPLY_SOURCE_INVALID };
      }
    }
    return { allow: true, reason: REASON.ALLOW_OPERATOR_CANONICAL };
  }

  if (input.gate.engaged === true) {
    return { allow: false, reason: REASON.GATE_ON };
  }
  if (input.sources == null) {
    return { allow: false, reason: REASON.SUPPLY_SOURCE_UNREADABLE };
  }
  for (const src of input.sources) {
    if (src == null || String(src).trim() === "") {
      return { allow: false, reason: REASON.SUPPLY_SOURCE_UNREADABLE };
    }
    const v = String(src).trim();
    if (v === SUPPLY_OPERATOR) {
      return { allow: false, reason: REASON.OPERATOR_PROTECTED };
    }
    if (v !== SUPPLY_LEGACY) {
      return { allow: false, reason: REASON.SUPPLY_SOURCE_INVALID };
    }
  }
  return { allow: true, reason: REASON.ALLOW_LEGACY };
}

/**
 * 부팅 시드: 게이트 ON·게이트 조회 실패·스키마 미준비면 no-op.
 * 게이트 OFF + 스키마 준비만 기존 ensureMinCatalog 진행.
 */
function decideBootSeed(input) {
  const d = decideProductWrite({
    gate: input.gate,
    schemaReady: input.schemaReady,
    schemaError: input.schemaError,
    sources: [],
  });
  if (!d.allow) return { allow: false, reason: d.reason };
  return { allow: true, reason: REASON.ALLOW_LEGACY };
}

function isUndefinedColumn(err) {
  return Boolean(
    err &&
      typeof err === "object" &&
      (err.code === "42703" ||
        /column .* does not exist/i.test(String(err.message || ""))),
  );
}

function isExpectedProductBlock(reason) {
  return (
    reason === REASON.OPERATOR_PROTECTED ||
    reason === REASON.GATE_ON ||
    reason === REASON.GATE_UNRESOLVED ||
    reason === REASON.SCHEMA_UNREADY ||
    reason === REASON.SCHEMA_QUERY_FAILED ||
    reason === REASON.SUPPLY_SOURCE_INVALID ||
    reason === REASON.SUPPLY_SOURCE_UNREADABLE ||
    reason === REASON.LOCK_FAILED ||
    reason === REASON.WRITER_KIND_INVALID ||
    reason === REASON.LEGACY_NOT_PROMOTABLE
  );
}

/**
 * @param {Pick<{ query: Function }, "query">} client
 */
async function inspectSchemaOnClient(client) {
  try {
    const { rows } = await client.query(SQL.schemaReady);
    return { ready: Boolean(rows[0]), error: false };
  } catch {
    return { ready: false, error: true };
  }
}

/**
 * 잠금 후 공통 평가. Nest 가드·CLI·격리 테스트가 같은 경로를 탄다.
 * @param {Pick<{ query: Function }, "query">} client
 * @param {string} assetId
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @param {{ writerKind?: string }} [opts]
 */
async function evaluateLockedAssetOnClient(client, assetId, env, opts) {
  const gate = readGateFromEnv(env);
  const writerKind = opts && opts.writerKind
    ? opts.writerKind
    : WRITER_KIND.LEGACY_EXTERNAL;

  const schema = await inspectSchemaOnClient(client);
  if (schema.error) {
    return {
      allow: false,
      reason: REASON.SCHEMA_QUERY_FAILED,
      schemaReady: false,
      assetLocked: false,
    };
  }
  if (!schema.ready) {
    return {
      allow: false,
      reason: REASON.SCHEMA_UNREADY,
      schemaReady: false,
      assetLocked: false,
    };
  }

  const asset = await client.query(SQL.lockAsset, [assetId]);
  const assetLocked = Boolean(asset.rows[0]);

  let sources = null;
  try {
    const opps = await client.query(SQL.lockOpportunities, [assetId]);
    sources = opps.rows.map((r) => r.supply_source);
  } catch (err) {
    if (isUndefinedColumn(err)) {
      return {
        allow: false,
        reason: REASON.SCHEMA_UNREADY,
        schemaReady: false,
        assetLocked,
      };
    }
    return {
      allow: false,
      reason: REASON.LOCK_FAILED,
      schemaReady: true,
      assetLocked,
    };
  }

  const decided = decideProductWrite({
    gate,
    schemaReady: true,
    sources,
    writerKind,
  });
  return {
    ...decided,
    schemaReady: true,
    assetLocked,
    writerKind,
  };
}

/**
 * opportunity id 기준 평가. writerKind는 받지 않는다 (호출자 우회 금지).
 * 잠금 순서는 evaluateLockedAssetOnClient와 같다 (assets → opportunities).
 * @param {Pick<{ query: Function }, "query">} client
 * @param {string} opportunityId
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 */
async function evaluateLockedOpportunityOnClient(client, opportunityId, env) {
  let assetId = null;
  try {
    const peek = await client.query(
      `SELECT asset_id FROM public.opportunities WHERE id = $1`,
      [opportunityId],
    );
    assetId = peek.rows[0] && peek.rows[0].asset_id;
  } catch (err) {
    if (isUndefinedColumn(err)) {
      return {
        allow: false,
        reason: REASON.SCHEMA_UNREADY,
        schemaReady: false,
        assetLocked: false,
        opportunityMissing: false,
      };
    }
    return {
      allow: false,
      reason: REASON.LOCK_FAILED,
      schemaReady: false,
      assetLocked: false,
      opportunityMissing: false,
    };
  }
  if (!assetId) {
    return {
      allow: false,
      reason: REASON.LOCK_FAILED,
      schemaReady: false,
      assetLocked: false,
      opportunityMissing: true,
    };
  }
  const decided = await evaluateLockedAssetOnClient(client, assetId, env);
  return { ...decided, opportunityMissing: false };
}

/**
 * 격리 테스트용 인메모리 카탈로그.
 * 운영 DB를 쓰지 않는다. asset 단위 mutex로 FOR UPDATE를 흉내 낸다.
 */
function createMemoryCatalog(initial) {
  const state = {
    schemaReady: initial.schemaReady !== false,
    schemaError: initial.schemaError === true,
    gateRaw: initial.gateRaw == null ? "" : initial.gateRaw,
    assets: new Map(Object.entries(initial.assets || {})),
    opportunities: new Map(
      Object.entries(initial.opportunities || {}).map(([k, rows]) => [
        k,
        rows.map((r) => ({ ...r })),
      ]),
    ),
    listings: new Map(
      Object.entries(initial.listings || {}).map(([k, rows]) => [
        k,
        rows.map((r) => ({ ...r })),
      ]),
    ),
  };
  /** @type {Map<string, Promise<void>>} */
  const tails = new Map();
  /** @type {Map<string, number>} */
  const depths = new Map();

  function snapshotAsset(assetId) {
    return {
      asset: state.assets.has(assetId)
        ? { ...state.assets.get(assetId) }
        : null,
      opportunities: (state.opportunities.get(assetId) || []).map((r) => ({
        ...r,
      })),
      listings: (state.listings.get(assetId) || []).map((r) => ({ ...r })),
    };
  }

  async function withAssetLock(assetId, fn) {
    if ((depths.get(assetId) || 0) > 0) {
      depths.set(assetId, (depths.get(assetId) || 0) + 1);
      try {
        return await fn();
      } finally {
        depths.set(assetId, (depths.get(assetId) || 1) - 1);
      }
    }
    const prev = tails.get(assetId) || Promise.resolve();
    let release;
    const mine = new Promise((resolve) => {
      release = resolve;
    });
    tails.set(
      assetId,
      prev.then(() => mine),
    );
    await prev;
    depths.set(assetId, 1);
    try {
      return await fn();
    } finally {
      depths.set(assetId, 0);
      release();
    }
  }

  function evaluateLocked(assetId, writerKind) {
    const gate = parseGate(state.gateRaw);
    if (state.schemaError) {
      return decideProductWrite({
        gate,
        schemaReady: null,
        schemaError: true,
        sources: null,
        writerKind,
      });
    }
    if (!state.schemaReady) {
      return decideProductWrite({
        gate,
        schemaReady: false,
        sources: null,
        writerKind,
      });
    }
    const rows = state.opportunities.get(assetId) || [];
    return decideProductWrite({
      gate,
      schemaReady: true,
      sources: rows.map((r) => r.supply_source),
      writerKind,
    });
  }

  async function persistListing(assetId, listing) {
    return withAssetLock(assetId, async () => {
      const decision = evaluateLocked(assetId);
      if (!decision.allow) {
        return { wrote: false, reason: decision.reason, ...snapshotAsset(assetId) };
      }
      const list = state.listings.get(assetId) || [];
      const idx = list.findIndex(
        (L) =>
          L.market_id === listing.market_id &&
          L.external_item_id === listing.external_item_id,
      );
      if (idx >= 0) list[idx] = { ...list[idx], ...listing };
      else list.push({ ...listing });
      state.listings.set(assetId, list);
      return { wrote: true, reason: decision.reason, ...snapshotAsset(assetId) };
    });
  }

  async function applyImage(assetId, imageUrl) {
    return withAssetLock(assetId, async () => {
      const decision = evaluateLocked(assetId);
      if (!decision.allow) {
        return { wrote: false, reason: decision.reason, ...snapshotAsset(assetId) };
      }
      const asset = state.assets.get(assetId);
      if (asset) {
        state.assets.set(assetId, {
          ...asset,
          image_url: imageUrl,
          image_source: "ebay",
        });
      }
      const opps = state.opportunities.get(assetId) || [];
      state.opportunities.set(
        assetId,
        opps.map((o) =>
          o.supply_source === SUPPLY_LEGACY
            ? { ...o, asset_image_url: imageUrl, asset_image_source: "ebay" }
            : o,
        ),
      );
      return { wrote: true, reason: decision.reason, ...snapshotAsset(assetId) };
    });
  }

  async function reprice(assetId, nextVersion, nextProfit) {
    return withAssetLock(assetId, async () => {
      const decision = evaluateLocked(assetId);
      if (!decision.allow) {
        return { wrote: false, reason: decision.reason, ...snapshotAsset(assetId) };
      }
      const opps = state.opportunities.get(assetId) || [];
      state.opportunities.set(
        assetId,
        opps.map((o) =>
          o.supply_source === SUPPLY_LEGACY
            ? {
                ...o,
                pricing_version: nextVersion,
                expected_profit_usdt: nextProfit,
              }
            : o,
        ),
      );
      return { wrote: true, reason: decision.reason, ...snapshotAsset(assetId) };
    });
  }

  function setGateRaw(raw) {
    state.gateRaw = raw;
  }

  function setSupplySource(assetId, opportunityId, supplySource) {
    return withAssetLock(assetId, async () => {
      const opps = state.opportunities.get(assetId) || [];
      state.opportunities.set(
        assetId,
        opps.map((o) =>
          o.id === opportunityId ? { ...o, supply_source: supplySource } : o,
        ),
      );
      return snapshotAsset(assetId);
    });
  }

  function setSchemaReady(ready) {
    state.schemaReady = ready === true;
  }

  async function upsertAsset(assetId, patch) {
    return withAssetLock(assetId, async () => {
      const decision = evaluateLocked(assetId);
      if (!decision.allow) {
        return { wrote: false, reason: decision.reason, ...snapshotAsset(assetId) };
      }
      const prev = state.assets.get(assetId) || {};
      state.assets.set(assetId, {
        ...prev,
        ...patch,
        asset_id: assetId,
      });
      const opps = state.opportunities.get(assetId) || [];
      state.opportunities.set(
        assetId,
        opps.map((o) =>
          o.supply_source === SUPPLY_LEGACY
            ? {
                ...o,
                asset_image_url: patch.image_url != null ? patch.image_url : o.asset_image_url,
                asset_image_source:
                  patch.image_source != null
                    ? patch.image_source
                    : o.asset_image_source,
                asset_label:
                  patch.asset_label != null ? patch.asset_label : o.asset_label,
              }
            : o,
        ),
      );
      return { wrote: true, reason: decision.reason, ...snapshotAsset(assetId) };
    });
  }

  async function applyAdminImage(assetId, imageUrl) {
    return upsertAsset(assetId, {
      image_url: imageUrl,
      image_source: "admin_r2",
    });
  }

  async function patchPricing(assetId, opportunityId, nextVersion, nextProfit) {
    return withAssetLock(assetId, async () => {
      const decision = evaluateLocked(assetId);
      if (!decision.allow) {
        return { wrote: false, reason: decision.reason, ...snapshotAsset(assetId) };
      }
      const opps = state.opportunities.get(assetId) || [];
      state.opportunities.set(
        assetId,
        opps.map((o) =>
          o.supply_source === SUPPLY_LEGACY &&
          (opportunityId == null || o.id === opportunityId)
            ? {
                ...o,
                pricing_version: nextVersion,
                expected_profit_usdt: nextProfit,
              }
            : o,
        ),
      );
      return { wrote: true, reason: decision.reason, ...snapshotAsset(assetId) };
    });
  }

  return {
    persistListing,
    applyImage,
    applyAdminImage,
    upsertAsset,
    patchPricing,
    reprice,
    setGateRaw,
    setSupplySource,
    setSchemaReady,
    snapshotAsset,
    evaluateLocked,
    withAssetLock,
    get gateRaw() {
      return state.gateRaw;
    },
  };
}

module.exports = {
  SUPPLY_OPERATOR,
  SUPPLY_LEGACY,
  GATE_ENV,
  WRITER_KIND,
  REASON,
  LOCK_ORDER,
  SQL,
  parseGate,
  readGateFromEnv,
  decideProductWrite,
  decideBootSeed,
  isUndefinedColumn,
  isExpectedProductBlock,
  inspectSchemaOnClient,
  evaluateLockedAssetOnClient,
  evaluateLockedOpportunityOnClient,
  createMemoryCatalog,
};
