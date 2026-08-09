/**
 * none adapter — degrade / missing key · Engine §47.13
 */

"use strict";

/** @param {object} [_config] */
function createNoneAdapter(_config = {}) {
  return Object.freeze({
    provider_id: "none",
    async chat(_input = {}) {
      return Object.freeze({
        degraded: true,
        provider_id: "none",
        provider_effective: "none",
        text: "",
        finish_reason: "degraded",
      });
    },
  });
}

module.exports = { createNoneAdapter };
