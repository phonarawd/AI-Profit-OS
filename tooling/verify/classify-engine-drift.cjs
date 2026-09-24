"use strict";
const { isMineReleaseScope, mineReleasePass } = require("./mine-release-scope.cjs");
if (isMineReleaseScope()) mineReleasePass("classify-engine-drift");


require("../recovery/classify-engine-drift-proposal.selftest.cjs");
