/**
 * QA7 — load frozen eval/*.jsonl rows (read-only)
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");
const { EVAL_FILES } = require("./qa7-constants.cjs");

/**
 * @param {string} rel
 */
function loadJsonl(rel) {
  const abs = path.join(ROOT, rel);
  const text = fs.readFileSync(abs, "utf8");
  const rows = [];
  let lineNo = 0;
  for (const line of text.split(/\r?\n/)) {
    lineNo += 1;
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch (e) {
      throw new Error(`${rel}:${lineNo} JSON parse failed`);
    }
    if (!row.id) throw new Error(`${rel}:${lineNo} missing id`);
    if (typeof row.input !== "string") {
      throw new Error(`${rel}:${lineNo} missing input string`);
    }
    rows.push({
      ...row,
      _dataset_file: rel,
      _line: lineNo,
    });
  }
  return rows;
}

/**
 * @param {{ files?: string[], ids?: string[], limit?: number }} [opts]
 */
function loadEvalDataset(opts = {}) {
  const files = Array.isArray(opts.files) && opts.files.length
    ? opts.files
    : [...EVAL_FILES];
  /** @type {any[]} */
  const all = [];
  for (const rel of files) {
    all.push(...loadJsonl(rel));
  }
  const seen = new Set();
  for (const row of all) {
    if (seen.has(row.id)) {
      throw new Error(`duplicate case id across datasets: ${row.id}`);
    }
    seen.add(row.id);
  }
  let rows = all;
  if (Array.isArray(opts.ids) && opts.ids.length) {
    const want = new Set(opts.ids);
    rows = rows.filter((r) => want.has(r.id));
  }
  if (opts.limit != null && Number(opts.limit) > 0) {
    rows = rows.slice(0, Number(opts.limit));
  }
  return { files, rows, count: rows.length };
}

/**
 * Smallest valid smoke subset spanning S / scope / P / G
 */
function smokeCaseIds() {
  return [
    "s_withdraw",
    "scope_coding",
    "p_balance",
    "g_weather",
  ];
}

module.exports = {
  loadJsonl,
  loadEvalDataset,
  smokeCaseIds,
};
