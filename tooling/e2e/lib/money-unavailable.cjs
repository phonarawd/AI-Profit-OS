/**
 * missing money → UNAVAILABLE. 실제 "0"/"0.00"은 잔액 0으로 유지한다.
 */
function isUsdtDecimal(raw) {
  return typeof raw === "string" && /^-?[0-9]+(\.[0-9]+)?$/.test(raw);
}

function moneyDisplayState(raw) {
  if (raw == null || raw === "" || !isUsdtDecimal(raw)) {
    return { state: "UNAVAILABLE", display: null };
  }
  return { state: "ready", display: raw };
}

module.exports = { isUsdtDecimal, moneyDisplayState };
