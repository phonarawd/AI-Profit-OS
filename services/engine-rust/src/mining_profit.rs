//! Deterministic mining profit accrual calculator for PUTDUK MINE OS.
//!
//! Financial rules:
//! - no floating-point arithmetic
//! - principal and daily rate accept PostgreSQL `numeric(36,18)` compatible decimals
//! - period math uses integer UTC microseconds
//! - output precision is explicit (0..=18)
//! - rounding mode is explicit
//! - identical input always produces identical output

use std::cmp::Ordering;
use std::fmt;

pub const MINING_CALC_VERSION: &str = "mine-profit-v1";
pub const DB_DECIMAL_SCALE: u32 = 18;
pub const MICROS_PER_SECOND: i64 = 1_000_000;
pub const MICROS_PER_DAY: i64 = 86_400 * MICROS_PER_SECOND;

const LIMB_BASE: u128 = 1_000_000_000;
const SCALE_18: u128 = 1_000_000_000_000_000_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RoundingMode {
    Truncate,
    HalfUp,
    HalfEven,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MiningProfitInput<'a> {
    pub principal: &'a str,
    pub daily_rate: &'a str,
    pub period_start_unix_micros: i64,
    pub period_end_unix_micros: i64,
    pub output_scale: u32,
    pub rounding_mode: RoundingMode,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MiningProfitOutput {
    pub accrued_profit: String,
    pub elapsed_micros: i64,
    pub output_scale: u32,
    pub rounding_mode: RoundingMode,
    pub calc_version: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MiningProfitError {
    EmptyDecimal(&'static str),
    InvalidDecimal(&'static str),
    NegativeNotAllowed(&'static str),
    FractionalScaleExceeded {
        field: &'static str,
        max_scale: u32,
    },
    IntegerDigitsExceeded {
        field: &'static str,
        max_digits: u32,
    },
    PrincipalMustBePositive,
    InvalidPeriod,
    UnsupportedOutputScale(u32),
    ResultExceedsNumeric36_18,
}

impl fmt::Display for MiningProfitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyDecimal(field) => write!(f, "{field} is empty"),
            Self::InvalidDecimal(field) => write!(f, "{field} is not a plain decimal string"),
            Self::NegativeNotAllowed(field) => write!(f, "{field} must be non-negative"),
            Self::FractionalScaleExceeded { field, max_scale } => {
                write!(f, "{field} exceeds {max_scale} fractional digits")
            }
            Self::IntegerDigitsExceeded { field, max_digits } => {
                write!(f, "{field} exceeds {max_digits} integer digits")
            }
            Self::PrincipalMustBePositive => write!(f, "principal must be greater than zero"),
            Self::InvalidPeriod => write!(f, "period_end must be greater than period_start"),
            Self::UnsupportedOutputScale(scale) => {
                write!(f, "output scale {scale} is outside 0..={DB_DECIMAL_SCALE}")
            }
            Self::ResultExceedsNumeric36_18 => {
                write!(f, "result exceeds numeric(36,18) integer capacity")
            }
        }
    }
}

impl std::error::Error for MiningProfitError {}

/// Calculate one immutable accrual segment.
///
/// Formula:
/// `principal * daily_rate * elapsed_micros / MICROS_PER_DAY`
///
/// Both monetary inputs are parsed as exact fixed-point decimal values with at most 18
/// fractional digits. No `f32`/`f64` is used anywhere in this module.
pub fn calculate_mining_profit(
    input: &MiningProfitInput<'_>,
) -> Result<MiningProfitOutput, MiningProfitError> {
    if input.output_scale > DB_DECIMAL_SCALE {
        return Err(MiningProfitError::UnsupportedOutputScale(input.output_scale));
    }

    let elapsed_micros = input
        .period_end_unix_micros
        .checked_sub(input.period_start_unix_micros)
        .filter(|elapsed| *elapsed > 0)
        .ok_or(MiningProfitError::InvalidPeriod)?;

    let principal = parse_numeric_36_18(input.principal, "principal")?;
    if principal.is_zero() {
        return Err(MiningProfitError::PrincipalMustBePositive);
    }
    let daily_rate = parse_numeric_36_18(input.daily_rate, "daily_rate")?;

    // principal_scaled * rate_scaled * elapsed_micros
    let mut numerator = principal.mul(&daily_rate);
    numerator.mul_assign_small(elapsed_micros as u128);

    // Desired target units are 10^output_scale. Inputs are each scaled by 10^18,
    // so total denominator is:
    //   10^(36-output_scale) * MICROS_PER_DAY
    // Split it into two u128-safe divisions while retaining enough remainder
    // information to make one exact final rounding decision.
    let (after_first_scale, first_remainder) = numerator.div_rem_u128(SCALE_18);
    let second_scale = pow10_u128(DB_DECIMAL_SCALE - input.output_scale);
    let second_divisor = second_scale * MICROS_PER_DAY as u128;
    let (mut units, second_remainder) = after_first_scale.div_rem_u128(second_divisor);

    let relation_to_half = compare_combined_remainder_to_half(
        first_remainder,
        second_remainder,
        second_divisor,
    );

    let increment = match input.rounding_mode {
        RoundingMode::Truncate => false,
        RoundingMode::HalfUp => matches!(relation_to_half, Ordering::Equal | Ordering::Greater),
        RoundingMode::HalfEven => match relation_to_half {
            Ordering::Greater => true,
            Ordering::Equal => units.is_odd(),
            Ordering::Less => false,
        },
    };

    if increment {
        units.add_one();
    }

    let accrued_profit = format_numeric_units(&units, input.output_scale)?;

    Ok(MiningProfitOutput {
        accrued_profit,
        elapsed_micros,
        output_scale: input.output_scale,
        rounding_mode: input.rounding_mode,
        calc_version: MINING_CALC_VERSION,
    })
}

fn compare_combined_remainder_to_half(
    first_remainder: u128,
    second_remainder: u128,
    second_divisor: u128,
) -> Ordering {
    // Combined remainder after two staged divisions is:
    //   second_remainder * SCALE_18 + first_remainder
    // over denominator:
    //   second_divisor * SCALE_18
    // Compare 2*remainder to denominator without constructing the potentially
    // >u128 combined values.
    let twice_second = second_remainder * 2;
    match twice_second.cmp(&second_divisor) {
        Ordering::Greater => Ordering::Greater,
        Ordering::Equal => {
            if first_remainder == 0 {
                Ordering::Equal
            } else {
                Ordering::Greater
            }
        }
        Ordering::Less => {
            let gap = second_divisor - twice_second;
            if gap > 1 {
                Ordering::Less
            } else {
                // Only relevant for an odd second_divisor. Current production divisor
                // is always even, but this keeps the comparison mathematically complete.
                (first_remainder * 2).cmp(&SCALE_18)
            }
        }
    }
}

fn parse_numeric_36_18(
    raw: &str,
    field: &'static str,
) -> Result<BigUInt, MiningProfitError> {
    let value = raw.trim();
    if value.is_empty() {
        return Err(MiningProfitError::EmptyDecimal(field));
    }
    if value.starts_with('-') {
        return Err(MiningProfitError::NegativeNotAllowed(field));
    }
    if value.starts_with('+') || value.contains('e') || value.contains('E') {
        return Err(MiningProfitError::InvalidDecimal(field));
    }

    let mut parts = value.split('.');
    let whole = parts.next().unwrap_or("");
    let fraction = parts.next().unwrap_or("");
    if parts.next().is_some()
        || (whole.is_empty() && fraction.is_empty())
        || !whole.bytes().all(|b| b.is_ascii_digit())
        || !fraction.bytes().all(|b| b.is_ascii_digit())
    {
        return Err(MiningProfitError::InvalidDecimal(field));
    }

    if fraction.len() > DB_DECIMAL_SCALE as usize {
        return Err(MiningProfitError::FractionalScaleExceeded {
            field,
            max_scale: DB_DECIMAL_SCALE,
        });
    }

    let significant_whole = whole.trim_start_matches('0');
    if significant_whole.len() > 18 {
        return Err(MiningProfitError::IntegerDigitsExceeded {
            field,
            max_digits: 18,
        });
    }

    let mut digits = String::with_capacity(36);
    if whole.is_empty() {
        digits.push('0');
    } else {
        digits.push_str(whole);
    }
    digits.push_str(fraction);
    for _ in fraction.len()..DB_DECIMAL_SCALE as usize {
        digits.push('0');
    }

    let normalized = digits.trim_start_matches('0');
    if normalized.is_empty() {
        Ok(BigUInt::zero())
    } else {
        Ok(BigUInt::from_decimal_digits(normalized))
    }
}

fn format_numeric_units(
    units: &BigUInt,
    scale: u32,
) -> Result<String, MiningProfitError> {
    let digits = units.to_decimal_string();
    let scale = scale as usize;
    let integer_digits = if scale == 0 {
        digits.len()
    } else if digits.len() > scale {
        digits.len() - scale
    } else {
        0
    };

    if integer_digits > 18 {
        return Err(MiningProfitError::ResultExceedsNumeric36_18);
    }

    if scale == 0 {
        return Ok(digits);
    }

    if digits.len() <= scale {
        let mut out = String::with_capacity(scale + 2);
        out.push_str("0.");
        for _ in 0..(scale - digits.len()) {
            out.push('0');
        }
        out.push_str(&digits);
        Ok(out)
    } else {
        let split = digits.len() - scale;
        Ok(format!("{}.{}", &digits[..split], &digits[split..]))
    }
}

fn pow10_u128(exp: u32) -> u128 {
    let mut value = 1u128;
    for _ in 0..exp {
        value *= 10;
    }
    value
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct BigUInt {
    // Little-endian base-1e9 limbs.
    limbs: Vec<u32>,
}

impl BigUInt {
    fn zero() -> Self {
        Self { limbs: vec![0] }
    }

    fn from_decimal_digits(digits: &str) -> Self {
        debug_assert!(!digits.is_empty());
        debug_assert!(digits.bytes().all(|b| b.is_ascii_digit()));

        let mut limbs = Vec::with_capacity((digits.len() + 8) / 9);
        let mut end = digits.len();
        while end > 0 {
            let start = end.saturating_sub(9);
            let limb = digits[start..end]
                .parse::<u32>()
                .expect("validated decimal limb");
            limbs.push(limb);
            end = start;
        }
        let mut out = Self { limbs };
        out.normalize();
        out
    }

    fn is_zero(&self) -> bool {
        self.limbs.len() == 1 && self.limbs[0] == 0
    }

    fn is_odd(&self) -> bool {
        self.limbs[0] % 2 == 1
    }

    fn add_one(&mut self) {
        let mut index = 0usize;
        loop {
            if index == self.limbs.len() {
                self.limbs.push(1);
                break;
            }
            if self.limbs[index] < (LIMB_BASE as u32 - 1) {
                self.limbs[index] += 1;
                break;
            }
            self.limbs[index] = 0;
            index += 1;
        }
    }

    fn mul(&self, other: &Self) -> Self {
        if self.is_zero() || other.is_zero() {
            return Self::zero();
        }

        let mut acc = vec![0u128; self.limbs.len() + other.limbs.len()];
        for (i, &left) in self.limbs.iter().enumerate() {
            for (j, &right) in other.limbs.iter().enumerate() {
                acc[i + j] += left as u128 * right as u128;
            }
        }

        let mut limbs = Vec::with_capacity(acc.len() + 1);
        let mut carry = 0u128;
        for value in acc {
            let total = value + carry;
            limbs.push((total % LIMB_BASE) as u32);
            carry = total / LIMB_BASE;
        }
        while carry > 0 {
            limbs.push((carry % LIMB_BASE) as u32);
            carry /= LIMB_BASE;
        }

        let mut out = Self { limbs };
        out.normalize();
        out
    }

    fn mul_assign_small(&mut self, factor: u128) {
        if factor == 0 || self.is_zero() {
            self.limbs.clear();
            self.limbs.push(0);
            return;
        }

        let mut carry = 0u128;
        for limb in &mut self.limbs {
            let total = *limb as u128 * factor + carry;
            *limb = (total % LIMB_BASE) as u32;
            carry = total / LIMB_BASE;
        }
        while carry > 0 {
            self.limbs.push((carry % LIMB_BASE) as u32);
            carry /= LIMB_BASE;
        }
        self.normalize();
    }

    fn div_rem_u128(&self, divisor: u128) -> (Self, u128) {
        debug_assert!(divisor > 0);
        let mut quotient_be = Vec::with_capacity(self.limbs.len());
        let mut remainder = 0u128;

        for &limb in self.limbs.iter().rev() {
            let current = remainder * LIMB_BASE + limb as u128;
            let q = current / divisor;
            remainder = current % divisor;
            debug_assert!(q < LIMB_BASE);
            quotient_be.push(q as u32);
        }

        quotient_be.reverse();
        let mut quotient = Self { limbs: quotient_be };
        quotient.normalize();
        (quotient, remainder)
    }

    fn to_decimal_string(&self) -> String {
        let mut iter = self.limbs.iter().rev();
        let first = iter.next().copied().unwrap_or(0);
        let mut out = first.to_string();
        for limb in iter {
            out.push_str(&format!("{limb:09}"));
        }
        out
    }

    fn normalize(&mut self) {
        while self.limbs.len() > 1 && self.limbs.last() == Some(&0) {
            self.limbs.pop();
        }
        if self.limbs.is_empty() {
            self.limbs.push(0);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn calc(
        principal: &str,
        rate: &str,
        start_micros: i64,
        end_micros: i64,
    ) -> String {
        calculate_mining_profit(&MiningProfitInput {
            principal,
            daily_rate: rate,
            period_start_unix_micros: start_micros,
            period_end_unix_micros: end_micros,
            output_scale: 18,
            rounding_mode: RoundingMode::HalfEven,
        })
        .unwrap()
        .accrued_profit
    }

    fn sec(value: i64) -> i64 {
        value * MICROS_PER_SECOND
    }

    #[test]
    fn duration_vectors_1s_1m_1h_235959_and_day() {
        let vectors = [
            (1, "0.115740740740740741"),
            (60, "6.944444444444444444"),
            (3_600, "416.666666666666666667"),
            (86_399, "9999.884259259259259259"),
            (86_400, "10000.000000000000000000"),
        ];

        for (seconds, expected) in vectors {
            assert_eq!(calc("1000000", "0.01", 0, sec(seconds)), expected);
        }
    }

    #[test]
    fn utc_calendar_boundaries_do_not_change_elapsed_math() {
        // Exact midnight: 2024-01-01T00:00:00Z -> 2024-01-02T00:00:00Z.
        assert_eq!(
            calc(
                "1000000",
                "0.01",
                1_704_067_200_000_000,
                1_704_153_600_000_000,
            ),
            "10000.000000000000000000"
        );

        // Month end: 2024-01-31T23:59:59Z -> 2024-02-01T00:00:00Z.
        assert_eq!(
            calc(
                "1000000",
                "0.01",
                1_706_745_599_000_000,
                1_706_745_600_000_000,
            ),
            "0.115740740740740741"
        );

        // Leap-year edge: 2024-02-28T23:59:59Z -> 2024-02-29T00:00:00Z.
        assert_eq!(
            calc(
                "1000000",
                "0.01",
                1_709_164_799_000_000,
                1_709_164_800_000_000,
            ),
            "0.115740740740740741"
        );

        // Year end: 2024-12-31T23:59:59Z -> 2025-01-01T00:00:00Z.
        assert_eq!(
            calc(
                "1000000",
                "0.01",
                1_735_689_599_000_000,
                1_735_689_600_000_000,
            ),
            "0.115740740740740741"
        );
    }

    #[test]
    fn rate_change_boundary_has_no_overlap_or_gap() {
        let boundary = sec(43_200);
        let before = calc("1000000", "0.01", 0, boundary);
        let after = calc("1000000", "0.02", boundary, sec(86_400));
        assert_eq!(before, "5000.000000000000000000");
        assert_eq!(after, "10000.000000000000000000");

        assert_eq!(
            calc("1000000", "0.01", boundary - 1, boundary),
            "0.000000115740740741"
        );
        assert_eq!(
            calc("1000000", "0.02", boundary, boundary + 1),
            "0.000000231481481481"
        );
    }

    #[test]
    fn increase_decrease_boundaries_are_segment_exact() {
        let eight_hours = sec(28_800);
        let first = calc("1000000", "0.01", 0, eight_hours);
        let increased = calc("2000000", "0.01", eight_hours, eight_hours * 2);
        let decreased = calc("500000", "0.01", eight_hours * 2, eight_hours * 3);

        assert_eq!(first, "3333.333333333333333333");
        assert_eq!(increased, "6666.666666666666666667");
        assert_eq!(decreased, "1666.666666666666666667");

        // Sum of stored 18dp immutable accrual segments.
        let total = decimal_18_sum(&[&first, &increased, &decreased]);
        assert_eq!(total, "11666.666666666666666667");
    }

    #[test]
    fn end_boundary_is_exclusive_by_period_contract() {
        let end = sec(86_400);
        assert_eq!(
            calc("1000000", "0.01", 0, end),
            "10000.000000000000000000"
        );
        let err = calculate_mining_profit(&MiningProfitInput {
            principal: "1000000",
            daily_rate: "0.01",
            period_start_unix_micros: end,
            period_end_unix_micros: end,
            output_scale: 18,
            rounding_mode: RoundingMode::HalfEven,
        })
        .unwrap_err();
        assert_eq!(err, MiningProfitError::InvalidPeriod);
    }

    #[test]
    fn tiny_and_large_numeric_36_18_values_are_exact() {
        assert_eq!(
            calc("0.000000000000000001", "0.000000000000000001", 0, sec(86_400)),
            "0.000000000000000000"
        );
        assert_eq!(
            calc(
                "999999999999999999.999999999999999999",
                "0.000000000000000001",
                0,
                sec(86_400),
            ),
            "1.000000000000000000"
        );
    }

    #[test]
    fn explicit_rounding_modes_are_deterministic() {
        // 1 * 0.5 day = 0.5 exactly, rounded to scale 0.
        let base = MiningProfitInput {
            principal: "1",
            daily_rate: "1",
            period_start_unix_micros: 0,
            period_end_unix_micros: sec(43_200),
            output_scale: 0,
            rounding_mode: RoundingMode::Truncate,
        };
        assert_eq!(calculate_mining_profit(&base).unwrap().accrued_profit, "0");

        let mut half_up = base.clone();
        half_up.rounding_mode = RoundingMode::HalfUp;
        assert_eq!(calculate_mining_profit(&half_up).unwrap().accrued_profit, "1");

        let mut half_even = base.clone();
        half_even.rounding_mode = RoundingMode::HalfEven;
        assert_eq!(calculate_mining_profit(&half_even).unwrap().accrued_profit, "0");

        let odd_tie = MiningProfitInput {
            principal: "3",
            ..half_even
        };
        assert_eq!(calculate_mining_profit(&odd_tie).unwrap().accrued_profit, "2");
    }

    #[test]
    fn rejects_non_numeric36_18_inputs() {
        let bad = [
            ("-1", MiningProfitError::NegativeNotAllowed("principal")),
            ("1e3", MiningProfitError::InvalidDecimal("principal")),
            (
                "1.0000000000000000001",
                MiningProfitError::FractionalScaleExceeded {
                    field: "principal",
                    max_scale: 18,
                },
            ),
            (
                "1000000000000000000",
                MiningProfitError::IntegerDigitsExceeded {
                    field: "principal",
                    max_digits: 18,
                },
            ),
        ];

        for (principal, expected) in bad {
            let err = calculate_mining_profit(&MiningProfitInput {
                principal,
                daily_rate: "0.01",
                period_start_unix_micros: 0,
                period_end_unix_micros: sec(1),
                output_scale: 18,
                rounding_mode: RoundingMode::HalfEven,
            })
            .unwrap_err();
            assert_eq!(err, expected);
        }
    }

    #[test]
    fn identical_input_is_identical_for_100_runs() {
        let input = MiningProfitInput {
            principal: "123456789.123456789123456789",
            daily_rate: "0.001234567890123456",
            period_start_unix_micros: 1_709_164_799_123_456,
            period_end_unix_micros: 1_709_251_234_654_321,
            output_scale: 18,
            rounding_mode: RoundingMode::HalfEven,
        };
        let first = calculate_mining_profit(&input).unwrap();
        for _ in 0..100 {
            assert_eq!(calculate_mining_profit(&input).unwrap(), first);
        }
    }

    fn decimal_18_sum(values: &[&str]) -> String {
        let mut total = BigUInt::zero();
        for value in values {
            let parsed = parse_numeric_36_18(value, "test").unwrap();
            total = add_big(&total, &parsed);
        }
        format_numeric_units(&total, 18).unwrap()
    }

    fn add_big(left: &BigUInt, right: &BigUInt) -> BigUInt {
        let len = left.limbs.len().max(right.limbs.len());
        let mut limbs = Vec::with_capacity(len + 1);
        let mut carry = 0u128;
        for index in 0..len {
            let a = left.limbs.get(index).copied().unwrap_or(0) as u128;
            let b = right.limbs.get(index).copied().unwrap_or(0) as u128;
            let total = a + b + carry;
            limbs.push((total % LIMB_BASE) as u32);
            carry = total / LIMB_BASE;
        }
        if carry > 0 {
            limbs.push(carry as u32);
        }
        let mut out = BigUInt { limbs };
        out.normalize();
        out
    }
}
