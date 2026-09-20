//! engine-rust — deterministic financial rule engine

pub mod mining_profit;
pub mod settlement_rule;

pub use mining_profit::{
    calculate_mining_profit, MiningProfitError, MiningProfitInput, MiningProfitOutput,
    RoundingMode, DB_DECIMAL_SCALE, MICROS_PER_DAY, MICROS_PER_SECOND, MINING_CALC_VERSION,
};
pub use settlement_rule::{
    evaluate_execution, evaluate_match_success, guard_participate, hard_deadline_ms,
    soft_deadline_ms, ExecutionPolicy, ExecutionResultCode, ParticipateContext,
    ParticipateGuardCode, RuleContext, DEFAULT_PRICE_STALE_MAX_SEC, HARD_SEC, SOFT_SEC,
};

pub fn engine_name() -> &'static str {
    "engine-rust"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn name_locked() {
        assert_eq!(engine_name(), "engine-rust");
    }

    #[test]
    fn walls_reexported() {
        assert_eq!(SOFT_SEC, 60);
        assert_eq!(HARD_SEC, 90);
    }

    #[test]
    fn mining_contract_reexported() {
        assert_eq!(DB_DECIMAL_SCALE, 18);
        assert_eq!(MINING_CALC_VERSION, "mine-profit-v1");
    }
}
