/**
 * In-process PD allocator. process restart 안정성 주장 금지.
 * source-local ID embed 금지.
 */

const crypto = require("node:crypto");
const {
  PD_PREFIX,
  PD_DIGITS,
  CANONICAL_PRODUCT_ID_PREFIX,
  FORBIDDEN_SOURCE_ID_FRAGMENTS,
} = require("./contract.cjs");

function formatPutdukProductCode(sequence) {
  const n = Number(sequence);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("PD sequence must be a positive integer");
  }
  const code = `${PD_PREFIX}${String(n).padStart(PD_DIGITS, "0")}`;
  for (const fragment of FORBIDDEN_SOURCE_ID_FRAGMENTS) {
    if (code.includes(fragment)) {
      throw new Error("PD code must not embed source-local identifiers");
    }
  }
  return code;
}

function allocateCanonicalProductId() {
  return `${CANONICAL_PRODUCT_ID_PREFIX}${crypto.randomUUID()}`;
}

function createProductCodeAllocator(startAt) {
  let next = Number.isInteger(startAt) && startAt > 0 ? startAt : 1;
  return {
    nextCode() {
      const code = formatPutdukProductCode(next);
      next += 1;
      return code;
    },
    peek() {
      return next;
    },
  };
}

module.exports = {
  formatPutdukProductCode,
  allocateCanonicalProductId,
  createProductCodeAllocator,
};
