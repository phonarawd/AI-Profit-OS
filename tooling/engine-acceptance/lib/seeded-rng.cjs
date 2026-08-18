/**
 * Deterministic RNG for QA evidence (seed 단독 금지 — rng_version과 함께 기록)
 */
"use strict";

const RNG_VERSION = "aipo-ea-rng-v1";

/** mulberry32 */
function createSeededRng(seed) {
  let t = (Number(seed) >>> 0) || 1;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(s) {
  let h = 2166136261;
  const str = String(s);
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

module.exports = { RNG_VERSION, createSeededRng, seedFromString };
