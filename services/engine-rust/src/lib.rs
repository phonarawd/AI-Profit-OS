//! engine-rust — Phase0 MATCH_SUCCESS / settlement rules (§48.13)

pub mod settlement_rule;

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
}
