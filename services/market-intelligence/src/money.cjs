/**
 * Decimal-as-string money helpers — Engine §0.0.4 · no IEEE float.
 * Scale = 18 (matches ledger / opportunity pricing numeric(36,18)).
 */

const AMOUNT_MAX_LEN = 80;
const SCALE = 18n;
const TEN = 10n;

function isDecimalAmount(raw) {
  if (typeof raw !== "string") return false;
  const n = raw.length;
  if (n < 1 || n > AMOUNT_MAX_LEN) return false;
  let i = 0;
  if (raw.charCodeAt(0) === 45) {
    if (n === 1) return false;
    i = 1;
  }
  let digits = 0;
  let frac = 0;
  let dot = false;
  for (; i < n; i += 1) {
    const c = raw.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      if (dot) frac += 1;
      else digits += 1;
      continue;
    }
    if (c === 46 && !dot && digits > 0) {
      dot = true;
      continue;
    }
    return false;
  }
  if (digits < 1) return false;
  if (dot && frac < 1) return false;
  return true;
}

function pow10(n) {
  let r = 1n;
  for (let i = 0n; i < n; i++) r *= TEN;
  return r;
}

const SCALE_FACTOR = pow10(SCALE);

function assertAmount(raw, field = "amount") {
  if (typeof raw !== "string" || !isDecimalAmount(raw)) {
    throw new Error(`${field} must be decimal string`);
  }
  return raw;
}

function parseAmount(raw) {
  assertAmount(raw);
  const neg = raw.startsWith("-");
  const body = neg ? raw.slice(1) : raw;
  const [wholePart, fracPart = ""] = body.split(".");
  if (fracPart.length > Number(SCALE)) {
    throw new Error(`amount scale > ${SCALE}`);
  }
  const padded = (fracPart + "0".repeat(Number(SCALE))).slice(0, Number(SCALE));
  const scaled = BigInt(wholePart + padded);
  return neg ? -scaled : scaled;
}

function formatAmount(n) {
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const s = abs.toString().padStart(Number(SCALE) + 1, "0");
  const whole = s.slice(0, -Number(SCALE)) || "0";
  let frac = s.slice(-Number(SCALE));
  while (frac.endsWith("0")) frac = frac.slice(0, -1);
  const body = frac.length ? `${whole}.${frac}` : whole;
  return neg ? `-${body}` : body;
}

function addAmount(a, b) {
  return formatAmount(parseAmount(a) + parseAmount(b));
}

function subAmount(a, b) {
  return formatAmount(parseAmount(a) - parseAmount(b));
}

function cmpAmount(a, b) {
  const d = parseAmount(a) - parseAmount(b);
  if (d < 0n) return -1;
  if (d > 0n) return 1;
  return 0;
}

function maxAmount(a, b) {
  return cmpAmount(a, b) >= 0 ? assertAmount(a) : assertAmount(b);
}

/** a * rate where rate is a decimal string (e.g. "0.135") */
function mulAmount(a, rate) {
  const aN = parseAmount(a);
  const rN = parseAmount(rate);
  // both scaled by 1e18 → product scaled by 1e36 → divide by 1e18
  const prod = aN * rN;
  const half = SCALE_FACTOR / 2n;
  const rounded = prod >= 0n ? (prod + half) / SCALE_FACTOR : (prod - half) / SCALE_FACTOR;
  return formatAmount(rounded);
}

/**
 * a / b — decimal string division, round-half-up at SCALE (18dp), same
 * rounding convention as mulAmount. Required for FX rate inversion
 * (e.g. USDT/USD from USD/USDT) — never use JS float division for money.
 * @param {string} a
 * @param {string} b
 * @throws when b === 0
 */
function divAmount(a, b) {
  const aN = parseAmount(a);
  const bN = parseAmount(b);
  if (bN === 0n) throw new Error("divAmount: division by zero");
  // aN/1e18 ÷ bN/1e18 = (aN×1e18)/bN → already at target scale
  const numerator = aN * SCALE_FACTOR;
  const neg = (numerator < 0n) !== (bN < 0n);
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = bN < 0n ? -bN : bN;
  const half = absDen / 2n;
  const rounded = (absNum + half) / absDen;
  return formatAmount(neg ? -rounded : rounded);
}

function isNonNegAmount(raw) {
  return isDecimalAmount(raw) && parseAmount(raw) >= 0n;
}

function absDiff(a, b) {
  const d = subAmount(a, b);
  return cmpAmount(d, "0") < 0 ? subAmount("0", d) : d;
}

/** @param {string} [tolUsdt] default 0.000001 */
function withinTolerance(actual, expected, tolUsdt = "0.000001") {
  return cmpAmount(absDiff(actual, expected), tolUsdt) <= 0;
}

module.exports = {
  AMOUNT_RE: { test: isDecimalAmount },
  isDecimalAmount,
  SCALE: Number(SCALE),
  assertAmount,
  parseAmount,
  formatAmount,
  addAmount,
  subAmount,
  cmpAmount,
  maxAmount,
  mulAmount,
  divAmount,
  isNonNegAmount,
  absDiff,
  withinTolerance,
};
