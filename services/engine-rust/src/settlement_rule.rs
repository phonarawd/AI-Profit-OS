//! §48.13 MATCH_SUCCESS placeholder — implement in Engine domain todo.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchOutcome {
    Success,
    SafeStop,
    Requeue,
}

/// Skeleton: always SafeStop until real rule lands.
pub fn evaluate_match_success(_input: &str) -> MatchOutcome {
    MatchOutcome::SafeStop
}
