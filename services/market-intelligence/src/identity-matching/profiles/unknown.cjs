/**
 * UNKNOWN profile — typed strong identifier path만 MATCH 허용.
 * title/source 이름/brand-only로 MATCH 금지.
 */

function corroboratingMatch() {
  return {
    ok: false,
    matched: [],
    missing: [
      {
        field: "identityProfile",
        leftValue: "unknown",
        rightValue: "unknown",
        evidenceStrength: "WEAK",
        leftProvenance: "profile.resolver",
        rightProvenance: "profile.resolver",
        comparison: "missing",
      },
    ],
  };
}

module.exports = { PROFILE: "unknown", corroboratingMatch };
