"use strict";
const assert = require("node:assert/strict");
const { isPlaceholderRootDomain } = require("../deploy/lib/env.cjs");

assert.equal(isPlaceholderRootDomain("domain.com"), true);
assert.equal(isPlaceholderRootDomain("api.domain.com"), true);
assert.equal(isPlaceholderRootDomain("your-domain.com"), true);
assert.equal(isPlaceholderRootDomain("api.your-domain.com"), true);
assert.equal(isPlaceholderRootDomain("{ROOT_DOMAIN}"), true);
assert.equal(isPlaceholderRootDomain("productdomain.com"), false);
assert.equal(isPlaceholderRootDomain("mydomain.com"), false);
assert.equal(isPlaceholderRootDomain("example.com"), false);
assert.equal(isPlaceholderRootDomain("EXAMPLE.COM."), false);

console.log("[verify:deploy-root-domain-validation] PASS");
