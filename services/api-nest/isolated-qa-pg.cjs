/**
 * 격리 QA Postgres URL 해석. 운영 DATABASE_URL / 운영 Supabase 금지.
 * 연결 문자열·비밀번호를 로그하거나 반환 객체에 넣지 않는다.
 */
"use strict";

const PRODUCTION_SUPABASE_REF = "mgsytcetsiecllmhcyox";
const DENY_SUBSTRINGS = Object.freeze([
  PRODUCTION_SUPABASE_REF,
  "supabase.co",
  "supabase.com",
  "pooler.supabase",
]);

function readTrim(env, key) {
  const v = env && env[key];
  if (v == null) return "";
  const s = String(v).trim();
  return s;
}

function assembleAipoQaUrl(env) {
  const user = readTrim(env, "AIPO_QA_PGUSER") || readTrim(env, "aipoQaPguser");
  const password = readTrim(env, "AIPO_QA_PGPASSWORD") || readTrim(env, "aipoQaPgpassword");
  const host = readTrim(env, "AIPO_QA_PGHOST") || readTrim(env, "aipoQaPghost");
  const port = readTrim(env, "AIPO_QA_PGPORT") || readTrim(env, "aipoQaPgport") || "5432";
  const database = readTrim(env, "AIPO_QA_PGDATABASE") || readTrim(env, "aipoQaPgdatabase");
  if (!user || !password || !host || !database) return "";
  return ["postgresql://", user, ":", password, "@", host, ":", port, "/", database].join("");
}

function envBlob(env) {
  return [
    readTrim(env, "databaseUrl"),
    readTrim(env, "DATABASE_URL"),
    readTrim(env, "catalogTestDatabaseUrl"),
    readTrim(env, "CATALOG_TEST_DATABASE_URL"),
    readTrim(env, "QA_DATABASE_URL"),
    readTrim(env, "qaDatabaseUrl"),
    readTrim(env, "supabaseUrl"),
    readTrim(env, "SUPABASE_URL"),
    readTrim(env, "supabaseProjectRef"),
    readTrim(env, "SUPABASE_PROJECT_REF"),
    assembleAipoQaUrl(env),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function isOpsDbTarget(env) {
  return envBlob(env || {}).includes(PRODUCTION_SUPABASE_REF);
}

function urlDeniedReason(url) {
  const low = String(url || "").toLowerCase();
  if (!low) return "isolated_url_unset";
  for (const s of DENY_SUBSTRINGS) {
    if (low.includes(s)) return "production_or_supabase";
  }
  return "";
}

/**
 * @returns {{
 *   allowed: boolean,
 *   source: string,
 *   denied: string,
 *   url?: string,
 * }}
 * url 은 내부 연결용. 로그·계약·HTTP 에 넣지 말 것.
 */
function resolveIsolatedQaPgUrl(env) {
  const e = env || {};
  if (isOpsDbTarget(e)) {
    return { allowed: false, source: "denied", denied: "ops_ref" };
  }
  const catalog =
    readTrim(e, "catalogTestDatabaseUrl") || readTrim(e, "CATALOG_TEST_DATABASE_URL");
  const qa = readTrim(e, "QA_DATABASE_URL") || readTrim(e, "qaDatabaseUrl");
  const assembled = assembleAipoQaUrl(e);
  let url = "";
  let source = "unset";
  if (catalog) {
    url = catalog;
    source = "CATALOG_TEST_DATABASE_URL";
  } else if (qa) {
    url = qa;
    source = "QA_DATABASE_URL";
  } else if (assembled) {
    url = assembled;
    source = "AIPO_QA_PG";
  }
  if (!url) {
    return { allowed: false, source: "unset", denied: "isolated_url_unset" };
  }
  const denied = urlDeniedReason(url);
  if (denied) {
    return { allowed: false, source, denied };
  }
  return { allowed: true, source, denied: "", url };
}

function allowsIsolatedQaPg(env) {
  return resolveIsolatedQaPgUrl(env || {}).allowed === true;
}

function redactCredentials(text) {
  return String(text).replace(/\/\/[^\s/@]*:[^\s/@]*@/g, "//[redacted]@");
}

function createIsolatedQaPgDb(url) {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: url,
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on("error", () => {
    /* 유휴 오류로 프로세스 종료 금지. 질의는 자체 reject */
  });
  return {
    kind: "isolated_qa_pool",
    testOnly: true,
    notProductionPostgresService: true,
    async query(text, params) {
      return pool.query(text, params);
    },
    async withTransaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn({
          query: (t, p) => client.query(t, p),
        });
        await client.query("COMMIT");
        return out;
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw err;
      } finally {
        client.release();
      }
    },
    async end() {
      await pool.end();
    },
  };
}

function pinUnreadyIsolatedEnv(env) {
  const target = env || process.env;
  delete target.CATALOG_TEST_DATABASE_URL;
  delete target.QA_DATABASE_URL;
  delete target.AIPO_QA_PGHOST;
  delete target.AIPO_QA_PGUSER;
  delete target.AIPO_QA_PGPASSWORD;
  delete target.AIPO_QA_PGDATABASE;
  delete target.AIPO_QA_PGPORT;
  delete target.catalogTestDatabaseUrl;
  delete target.qaDatabaseUrl;
}

module.exports = {
  PRODUCTION_SUPABASE_REF,
  isOpsDbTarget,
  resolveIsolatedQaPgUrl,
  allowsIsolatedQaPg,
  createIsolatedQaPgDb,
  redactCredentials,
  pinUnreadyIsolatedEnv,
};
