/**
 * 운영자 CMS 상태기계. 초안 → 게시 → 종료.
 * 손님 투영은 published 만. 시드/목업 금지. 토토·베팅 금지.
 */
"use strict";

const KINDS = Object.freeze([
  "notice",
  "event",
  "benefit",
  "banner",
  "notification",
]);
const STATUSES = Object.freeze(["draft", "published", "ended"]);
const FORBIDDEN_COPY = /토토|베팅|toto|betting|보장\s*수익|확정\s*수익/i;

function fail(code, httpStatus, detail) {
  return { ok: false, applied: false, code, httpStatus, detail };
}

function isKind(raw) {
  return KINDS.includes(String(raw || ""));
}

function trimTitle(raw) {
  return String(raw || "").trim();
}

function asBody(raw) {
  return raw == null ? "" : String(raw);
}

function assertWrite(input) {
  const title = trimTitle(input && input.title);
  const body = asBody(input && input.body);
  if (!title || title.length > 80) {
    return fail("INVALID_TITLE", 400, "title 1..80");
  }
  if (body.length > 8000) {
    return fail("INVALID_BODY", 400, "body max 8000");
  }
  if (FORBIDDEN_COPY.test(title) || FORBIDDEN_COPY.test(body)) {
    return fail("FORBIDDEN_COPY", 400, "toto/betting/guaranteed profit FORBIDDEN");
  }
  let imageUrl = null;
  if (input && input.imageUrl != null && String(input.imageUrl).trim() !== "") {
    const url = String(input.imageUrl).trim();
    if (!/^https:\/\//i.test(url) || url.length > 2000) {
      return fail("INVALID_IMAGE_URL", 400, "imageUrl must be https");
    }
    imageUrl = url;
  }
  return { ok: true, title, body, imageUrl };
}

function projectAdmin(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    title: row.title,
    body: row.body,
    imageUrl: row.imageUrl || null,
    publishedAt: row.publishedAt || null,
    endedAt: row.endedAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function projectPublic(row) {
  if (!row || row.status !== "published") return null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    imageUrl: row.imageUrl || null,
    publishedAt: row.publishedAt,
  };
}

function applyCreate(input, meta) {
  if (!isKind(input && input.kind)) {
    return fail("INVALID_KIND", 400, "kind");
  }
  const fields = assertWrite(input);
  if (!fields.ok) return fields;
  const now = (meta && meta.now) || new Date().toISOString();
  const id = (meta && meta.id) || null;
  return {
    ok: true,
    applied: true,
    httpStatus: 201,
    item: {
      id,
      kind: input.kind,
      status: "draft",
      title: fields.title,
      body: fields.body,
      imageUrl: fields.imageUrl,
      publishedAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  };
}

function applyPatch(row, input) {
  if (!row) return fail("NOT_FOUND", 404, "cms post");
  if (row.status !== "draft") {
    return fail("NOT_DRAFT", 409, "only draft can be edited");
  }
  const fields = assertWrite({
    title: input.title != null ? input.title : row.title,
    body: input.body != null ? input.body : row.body,
    imageUrl: input.imageUrl !== undefined ? input.imageUrl : row.imageUrl,
  });
  if (!fields.ok) return fields;
  return {
    ok: true,
    applied: true,
    httpStatus: 200,
    item: {
      ...row,
      title: fields.title,
      body: fields.body,
      imageUrl: fields.imageUrl,
      updatedAt: new Date().toISOString(),
    },
  };
}

function applyPublish(row) {
  if (!row) return fail("NOT_FOUND", 404, "cms post");
  if (row.status === "published") {
    return { ok: true, applied: false, httpStatus: 200, item: projectAdmin(row) };
  }
  if (row.status !== "draft") {
    return fail("NOT_DRAFT", 409, "only draft can be published");
  }
  const now = new Date().toISOString();
  return {
    ok: true,
    applied: true,
    httpStatus: 200,
    item: {
      ...row,
      status: "published",
      publishedAt: now,
      updatedAt: now,
    },
  };
}

function applyEnd(row) {
  if (!row) return fail("NOT_FOUND", 404, "cms post");
  if (row.status === "ended") {
    return { ok: true, applied: false, httpStatus: 200, item: projectAdmin(row) };
  }
  if (row.status !== "published") {
    return fail("NOT_PUBLISHED", 409, "only published can be ended");
  }
  const now = new Date().toISOString();
  return {
    ok: true,
    applied: true,
    httpStatus: 200,
    item: {
      ...row,
      status: "ended",
      endedAt: now,
      updatedAt: now,
    },
  };
}

function listPublic(rows, kind) {
  return (rows || [])
    .filter((r) => r.kind === kind && r.status === "published")
    .map(projectPublic)
    .filter(Boolean);
}

function createMemoryCmsStore(seed) {
  const list = Array.isArray(seed) ? seed.slice() : [];
  return {
    ready: true,
    kind: "test_memory",
    testOnly: true,
    async insert(row) {
      list.push(row);
      return row;
    },
    async findById(id) {
      return list.find((r) => r.id === id) || null;
    },
    async list(kind) {
      return list.filter((r) => !kind || r.kind === kind);
    },
    async save(row) {
      const i = list.findIndex((r) => r.id === row.id);
      if (i >= 0) list[i] = row;
      else list.push(row);
      return row;
    },
  };
}

module.exports = {
  KINDS,
  STATUSES,
  FORBIDDEN_COPY,
  isKind,
  assertWrite,
  projectAdmin,
  projectPublic,
  applyCreate,
  applyPatch,
  applyPublish,
  applyEnd,
  listPublic,
  createMemoryCmsStore,
};
