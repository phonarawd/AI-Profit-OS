"use strict";
const assert=require("node:assert/strict");
const {TRON_HD_DERIVATION_UNAVAILABLE,TronHdDerivationUnavailableError,allocateCanonicalTrc20Address,deriveTrc20Address,requireCanonicalTrc20Deriver}=require("../../services/api-nest/dist/wallet/tron-address.js");
assert.equal(TRON_HD_DERIVATION_UNAVAILABLE,"TRON_HD_DERIVATION_UNAVAILABLE");
assert.throws(()=>requireCanonicalTrc20Deriver(),err=>err instanceof TronHdDerivationUnavailableError&&err.code===TRON_HD_DERIVATION_UNAVAILABLE&&err.status===503);
assert.throws(()=>deriveTrc20Address({secretRef:"ops:vault:hot-wallet-xpub",derivationIndex:0}),err=>err instanceof TronHdDerivationUnavailableError&&err.code===TRON_HD_DERIVATION_UNAVAILABLE);
let persistCalls=0;assert.throws(()=>allocateCanonicalTrc20Address({derivationIndex:7,persist:()=>{persistCalls+=1;return"must-not-run";}}),err=>err instanceof TronHdDerivationUnavailableError&&err.code===TRON_HD_DERIVATION_UNAVAILABLE);assert.equal(persistCalls,0);
assert.throws(()=>deriveTrc20Address({secretRef:"",derivationIndex:0}),/hotWalletXpubRef required/);assert.throws(()=>deriveTrc20Address({secretRef:"ops:vault:hot-wallet-xpub",derivationIndex:-1}),/derivationIndex/);
console.log("[verify:tron-address-runtime] PASS");
