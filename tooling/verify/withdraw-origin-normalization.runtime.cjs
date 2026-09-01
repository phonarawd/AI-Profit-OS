"use strict";

const assert = require("node:assert/strict");
const {
  normalizeAppHost,
  originAllowed,
} = require("../../services/api-nest/dist/wallet/withdraw-stepup.policy.js");

assert.equal(normalizeAppHost("APP.EXAMPLE.COM:3000/path"), "app.example.com:3000");
assert.equal(normalizeAppHost("https://APP.EXAMPLE.COM:443/a/b"), "app.example.com");
assert.equal(normalizeAppHost("not a host / with spaces"), "");
assert.equal(normalizeAppHost("https://["), "");

assert.equal(originAllowed("https://app.example.com", "app.example.com"), true);
assert.equal(originAllowed("https://app.example.com/path", "APP.EXAMPLE.COM"), true);
assert.equal(originAllowed("https://app.example.com.evil.test", "app.example.com"), false);
assert.equal(originAllowed("https://evil.test@app.example.com.evil.test", "app.example.com"), false);

console.log("[verify:withdraw-origin-normalization-runtime] PASS");
